/**
 * Topic Banner - Blocks queries related to banned topics using embeddings or LLM
 */

import { Embeddings } from '@langchain/core/embeddings';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage } from '@langchain/core/messages';
import { GuardrailResult, GuardrailViolationCode, TopicBanningConfig } from '../types';
import computeSimilarity from '../../utils/computeSimilarity';

export class TopicBanner {
  private embeddings: Embeddings;
  private config: TopicBanningConfig;
  private bannedTopicEmbeddings: Map<string, number[]> = new Map();
  private llm?: BaseChatModel;

  private initializationPromise: Promise<void> | null = null;

  constructor(
    embeddings: Embeddings,
    config: TopicBanningConfig,
    llm?: BaseChatModel
  ) {
    this.embeddings = embeddings;
    this.config = config;
    this.llm = llm;
    // Only initialize embeddings if using embedding method
    // LLM method doesn't need pre-computed embeddings
    if (config.method === 'embedding') {
      this.initializationPromise = this.initializeEmbeddings();
    } else {
      this.initializationPromise = null;
      console.log('[TopicBanner] Using LLM method - skipping embedding initialization');
    }
  }

  /**
   * Pre-compute embeddings for banned topics
   */
  private async initializeEmbeddings(): Promise<void> {
    if (this.config.topics.length === 0) {
      console.log('[TopicBanner] No topics to initialize');
      return;
    }

    // Check if embeddings are already initialized for these exact topics
    const currentTopics = Array.from(this.bannedTopicEmbeddings.keys()).sort().join(',');
    const newTopics = [...this.config.topics].sort().join(',');
    if (currentTopics === newTopics && this.bannedTopicEmbeddings.size === this.config.topics.length) {
      console.log(`[TopicBanner] Embeddings already initialized for ${this.config.topics.length} topics (skipping re-initialization)`);
      return;
    }

    try {
      const initStartTime = Date.now();
      console.log(`[TopicBanner] Initializing embeddings for ${this.config.topics.length} topics:`, this.config.topics);
      const embeddings = await this.embeddings.embedDocuments(this.config.topics);
      
      // Clear existing embeddings
      this.bannedTopicEmbeddings.clear();
      
      this.config.topics.forEach((topic, i) => {
        if (embeddings[i]) {
          this.bannedTopicEmbeddings.set(topic, embeddings[i]);
          console.log(`[TopicBanner] Initialized embedding for topic: "${topic}"`);
        } else {
          console.warn(`[TopicBanner] No embedding returned for topic: "${topic}"`);
        }
      });
      const initLatency = Date.now() - initStartTime;
      console.log(`[TopicBanner] Successfully initialized ${this.bannedTopicEmbeddings.size} topic embeddings in ${initLatency}ms`);
    } catch (error) {
      console.error('[TopicBanner] Error initializing embeddings:', error);
      throw error; // Re-throw to help with debugging
    }
  }

  /**
   * Update configuration and re-initialize embeddings (only if using embedding method)
   */
  async updateConfig(config: TopicBanningConfig): Promise<void> {
    this.config = config;
    this.bannedTopicEmbeddings.clear();
    // Only initialize embeddings if using embedding method
    if (config.method === 'embedding') {
      await this.initializeEmbeddings();
    } else {
      console.log('[TopicBanner] Method changed to LLM - clearing embeddings');
      this.initializationPromise = null;
    }
  }

  /**
   * Add a banned topic dynamically
   */
  async addTopic(topic: string): Promise<void> {
    if (this.config.topics.includes(topic)) return;

    this.config.topics.push(topic);
    const embedding = await this.embeddings.embedQuery(topic);
    this.bannedTopicEmbeddings.set(topic, embedding);
  }

  /**
   * Remove a banned topic
   */
  removeTopic(topic: string): void {
    const index = this.config.topics.indexOf(topic);
    if (index > -1) {
      this.config.topics.splice(index, 1);
      this.bannedTopicEmbeddings.delete(topic);
    }
  }

  /**
   * Check if query matches any banned topic
   */
  async check(query: string): Promise<GuardrailResult> {
    const startTime = Date.now();
    
    if (!this.config.enabled) {
      console.log('[TopicBanner] Topic banning is disabled');
      return { allowed: true, reason: 'Topic banning disabled' };
    }
    
    if (this.config.topics.length === 0) {
      console.log('[TopicBanner] No banned topics configured');
      return { allowed: true, reason: 'No topics configured' };
    }
    
    console.log(`[TopicBanner] Checking query: "${query}" against ${this.config.topics.length} banned topics:`, this.config.topics);
    console.log(`[TopicBanner] Method: ${this.config.method.toUpperCase()}`);

    let result: GuardrailResult;
    if (this.config.method === 'embedding') {
      result = await this.checkWithEmbeddings(query);
    } else {
      result = await this.checkWithLLM(query);
    }
    
    const latency = Date.now() - startTime;
    console.log(`[TopicBanner] ${this.config.method.toUpperCase()} method completed in ${latency}ms - ${result.allowed ? 'ALLOWED' : 'BLOCKED'}`);
    
    return result;
  }

  /**
   * Check using embedding similarity
   */
  private async checkWithEmbeddings(query: string): Promise<GuardrailResult> {
    const methodStartTime = Date.now();
    
    // Ensure embeddings are initialized before checking
    if (this.initializationPromise) {
      await this.initializationPromise;
    }

    // Check if we have any topic embeddings
    if (this.bannedTopicEmbeddings.size === 0) {
      console.warn(`[TopicBanner] No topic embeddings initialized (expected ${this.config.topics.length} topics), attempting to initialize now...`);
      // Try to initialize now if not done
      try {
        await this.initializeEmbeddings();
        if (this.bannedTopicEmbeddings.size === 0) {
          return {
            allowed: true,
            reason: 'No topic embeddings available - initialization failed',
            metadata: { topics: this.config.topics.length, topicsList: this.config.topics },
          };
        }
      } catch (error) {
        console.error('[TopicBanner] Failed to initialize embeddings:', error);
        return {
          allowed: true,
          reason: 'Failed to initialize topic embeddings',
          metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
        };
      }
    }

    console.log(`[TopicBanner] [EMBEDDING] Checking query: "${query}" against ${this.bannedTopicEmbeddings.size} banned topics:`, Array.from(this.bannedTopicEmbeddings.keys()));
    
    const embedStartTime = Date.now();
    let queryEmbedding: number[];
    try {
      queryEmbedding = await this.embeddings.embedQuery(query);
      const embedLatency = Date.now() - embedStartTime;
      console.log(`[TopicBanner] [EMBEDDING] Generated query embedding (${queryEmbedding.length} dimensions) in ${embedLatency}ms`);
    } catch (error) {
      console.error('[TopicBanner] Failed to generate query embedding:', error);
      return {
        allowed: true,
        reason: 'Failed to generate query embedding',
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
      };
    }

    const similarityStartTime = Date.now();
    let maxSimilarity = 0;
    let matchedTopic = '';
    const similarities: Array<{ topic: string; similarity: number }> = [];

    for (const [topic, topicEmbedding] of this.bannedTopicEmbeddings.entries()) {
      try {
        const similarity = computeSimilarity(queryEmbedding, topicEmbedding);
        similarities.push({ topic, similarity });
        if (similarity > maxSimilarity) {
          maxSimilarity = similarity;
          matchedTopic = topic;
        }
      } catch (error) {
        console.error(`[TopicBanner] Error computing similarity for topic "${topic}":`, error);
      }
    }
    const similarityLatency = Date.now() - similarityStartTime;

    console.log(`[TopicBanner] [EMBEDDING] Query: "${query}"`);
    console.log(`[TopicBanner] [EMBEDDING] Max similarity: ${(maxSimilarity * 100).toFixed(1)}% with "${matchedTopic}" (threshold: ${(this.config.threshold * 100).toFixed(1)}%)`);
    console.log(`[TopicBanner] [EMBEDDING] All similarities:`, similarities.map(s => `${s.topic}: ${(s.similarity * 100).toFixed(1)}%`).join(', '));
    console.log(`[TopicBanner] [EMBEDDING] Similarity computation took ${similarityLatency}ms`);

    if (maxSimilarity >= this.config.threshold) {
      return {
        allowed: false,
        code: GuardrailViolationCode.BANNED_TOPIC,
        reason: `Query is too similar to banned topic: "${matchedTopic}" (${(maxSimilarity * 100).toFixed(1)}% similarity, threshold: ${(this.config.threshold * 100).toFixed(1)}%)`,
        metadata: {
          bannedTopic: matchedTopic,
          similarity: maxSimilarity,
          threshold: this.config.threshold,
          allSimilarities: similarities,
        },
      };
    }

    return {
      allowed: true,
      reason: `No banned topics detected (max similarity: ${(maxSimilarity * 100).toFixed(1)}%, threshold: ${(this.config.threshold * 100).toFixed(1)}%)`,
      metadata: { maxSimilarity, threshold: this.config.threshold, allSimilarities: similarities },
    };
  }

  /**
   * Check using LLM classification
   */
  private async checkWithLLM(query: string): Promise<GuardrailResult> {
    const methodStartTime = Date.now();
    
    if (!this.llm) {
      console.warn('[TopicBanner] [LLM] LLM not provided, falling back to embeddings');
      return this.checkWithEmbeddings(query);
    }

    try {
      const prompt = `You are a content moderation system. Analyze if the user query relates to ANY of the banned topics below.

BANNED TOPICS:
${this.config.topics.map((t, i) => `${i + 1}. "${t}"`).join('\n')}

USER QUERY: "${query}"

IMPORTANT RULES:
1. Match by INTENT and MEANING, not just exact words
2. "why X is bad/terrible/worst" = negative sentiment about X = matches "hate X" or criticism of X
3. Questions asking for negative information about a topic should match that topic's ban
4. Consider synonyms, rephrasing, and indirect references
5. If the query expresses negativity, criticism, or seeks to disparage something in the banned list, it's a match

Examples:
- "why thailand is bad?" matches "hate Thailand" (seeking negative info = hate speech intent)
- "gambling tips" matches "gambling" 
- "is thai government corrupt?" matches "Thai society corrupt"
- "best restaurants in bangkok" does NOT match any Thailand-related bans (positive/neutral)

Respond with JSON only:
{
  "category": "exact_banned_topic_text or 'other'",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation of why it matches or doesn't"
}`;

      console.log(`[TopicBanner] [LLM] Classifying query: "${query}" against categories: ${this.config.topics.join(', ')}`);
      const llmStartTime = Date.now();
      const response = await this.llm.invoke([new HumanMessage(prompt)]);
      const llmLatency = Date.now() - llmStartTime;
      console.log(`[TopicBanner] [LLM] LLM response received in ${llmLatency}ms`);
      
      const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
      
      // Try to extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn('[TopicBanner] [LLM] Could not parse LLM response:', content);
        return { allowed: true, reason: 'LLM response parsing failed' };
      }

      const result = JSON.parse(jsonMatch[0]);
      const confidence = result.confidence || 0;
      const threshold = this.config.confidenceThreshold || 0.7;

      console.log(`[TopicBanner] [LLM] Classification result: category="${result.category}", confidence=${(confidence * 100).toFixed(1)}%, threshold=${(threshold * 100).toFixed(1)}%`);

      if (result.category !== 'other' && confidence >= threshold) {
        return {
          allowed: false,
          code: GuardrailViolationCode.BANNED_TOPIC,
          reason: `Query matches banned topic: "${result.category}" (confidence: ${(confidence * 100).toFixed(1)}%, threshold: ${(threshold * 100).toFixed(1)}%)`,
          metadata: {
            bannedTopic: result.category,
            confidence,
            threshold,
            reasoning: result.reasoning,
          },
        };
      }

      return {
        allowed: true,
        reason: 'No banned topics detected',
        metadata: { category: result.category, confidence },
      };
    } catch (error) {
      console.error('[TopicBanner] [LLM] Error checking with LLM:', error);
      // Fallback to embeddings on error
      return this.checkWithEmbeddings(query);
    }
  }
}
