/**
 * Stateful Orchestrator - Advanced orchestration with context management
 * 
 * Implements the full stateful context flow:
 * User Query → Load Context → Route → Extract Entities → 
 * Targeted RAG → Summarize History → Minimal Context to LLM → 
 * Update Payload → Save → Response
 */

import { BaseMessage, HumanMessage, AIMessage } from '@langchain/core/messages';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { Embeddings } from '@langchain/core/embeddings';
import EventEmitter from 'events';
import { FrugalRouter, RoutingPath } from '../routing/frugalRouter';
import { SemanticCache, getGlobalSemanticCache } from '../cache/semanticCache';
import { MetaSearchAgentType } from '../search/metaSearchAgent';
import { getContextStore } from '../context/contextStore';
import {
  ContextPayload,
  createContextPayload,
  getCompactContext,
  needsSummarization,
  estimateTokenCount,
  calculateCost,
  ConversationTurn,
} from '../context/contextPayload';
import {
  extractEntities,
  mergeEntities,
  getRelevantEntities,
  enhanceQueryWithEntities,
  formatEntitiesForPrompt,
} from '../context/entityExtractor';
import { summarizeConversation } from '../context/conversationSummarizer';
import { globalMetricsTracker } from '../metrics/metricsTracker';
import { getAnalyticsTracker } from '../analytics/analyticsTracker';
import { getTierConfig } from '../models/tierConfig';
import { getAvailableChatModelProviders } from '../providers';

export interface StatefulOrchestrationMetrics {
  routingPath: RoutingPath;
  cacheHit: boolean;
  modelTier?: 'tier1' | 'tier2';
  latencyMs: number;
  entitiesExtracted: number;
  summarizationTriggered: boolean;
  tokensSaved: number;
  estimatedCost: number;
}

/**
 * Stateful Orchestrator - Manages conversation context across turns
 */
export class StatefulOrchestrator {
  private frugalRouter: FrugalRouter;
  private semanticCache: SemanticCache;
  private ragAgent: MetaSearchAgentType;
  private contextStore = getContextStore();
  
  constructor(
    ragAgent: MetaSearchAgentType,
    embeddings: Embeddings
  ) {
    this.frugalRouter = new FrugalRouter();
    // Use global cache instance so cache persists across requests
    this.semanticCache = getGlobalSemanticCache(embeddings);
    this.ragAgent = ragAgent;
  }
  
  /**
   * Handle a user query with full stateful context management
   */
  async handleQuery(
    query: string,
    chatId: string,
    history: BaseMessage[],
    llm: BaseChatModel,
    embeddings: Embeddings,
    optimizationMode: 'speed' | 'balanced' | 'quality',
    fileIds: string[],
    systemInstructions: string,
    maxHistoryTurns: number = 2
  ): Promise<EventEmitter> {
    const emitter = new EventEmitter();
    const startTime = Date.now();
    const sessionId = chatId; // Use chatId as sessionId
    
    try {
      // STEP 1: Load or create context payload
      let contextPayload = await this.contextStore.get(sessionId);
      
      if (!contextPayload) {
        contextPayload = createContextPayload(sessionId, chatId, query);
      }
      
      // STEP 2: Route the query
      const routingDecision = await this.frugalRouter.route(query, history);
      
      // STEP 3: Extract entities from the query
      const newEntities = extractEntities(query, contextPayload.turnCount + 1);
      contextPayload.extractedEntities = mergeEntities(
        contextPayload.extractedEntities,
        newEntities
      );
      
      // STEP 4: Handle based on routing path
      let response: string;
      let sources: any[] = [];
      let modelTier: 'tier1' | 'tier2' | undefined;
      let cacheHit = false;
      
      switch (routingDecision.path) {
        case 'canned':
          ({ response, sources } = await this.handleCannedResponse(query));
          break;
          
        case 'cache':
          ({ response, sources, cacheHit } = await this.handleCacheQuery(
            query,
            contextPayload,
            history,
            llm,
            embeddings,
            optimizationMode,
            fileIds,
            systemInstructions,
            maxHistoryTurns
          ));
          break;
          
        case 'rag-tier1':
        case 'rag-tier2':
          modelTier = routingDecision.path === 'rag-tier2' ? 'tier2' : 'tier1';
          ({ response, sources } = await this.handleRAGQuery(
            query,
            contextPayload,
            history,
            llm,
            embeddings,
            optimizationMode,
            fileIds,
            systemInstructions,
            modelTier,
            maxHistoryTurns
          ));
          break;
      }
      
      // STEP 5: Update context payload
      const userTurn: ConversationTurn = {
        role: 'user',
        content: query,
        timestamp: Date.now(),
        turnNumber: contextPayload.turnCount + 1,
        tokenCount: estimateTokenCount(query),
      };
      
      const assistantTurn: ConversationTurn = {
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
        turnNumber: contextPayload.turnCount + 2,
        tokenCount: estimateTokenCount(response),
      };
      
      contextPayload.conversationHistory.push(userTurn, assistantTurn);
      contextPayload.turnCount += 2;
      contextPayload.classifiedIntent = routingDecision.path;
      
      // STEP 6: Check if summarization is needed
      let summarizationTriggered = false;
      if (needsSummarization(contextPayload, 5)) {
        const turnsToSummarize = contextPayload.conversationHistory.slice(
          contextPayload.lastSummarizedTurn
        );
        
        contextPayload.conversationSummary = await summarizeConversation(
          turnsToSummarize,
          contextPayload.conversationSummary,
          llm
        );
        
        contextPayload.lastSummarizedTurn = contextPayload.turnCount;
        summarizationTriggered = true;
      }
      
      // STEP 7: Calculate costs and savings
      const inputTokens = estimateTokenCount(query);
      const outputTokens = estimateTokenCount(response);
      const cost = calculateCost(inputTokens, outputTokens, modelTier || 'tier1');
      
      contextPayload.totalTokensUsed += inputTokens + outputTokens;
      contextPayload.estimatedCost += cost;
      
      // Calculate token savings from summarization
      const fullHistoryLength = contextPayload.conversationHistory
        .map(t => t.content.length)
        .reduce((a, b) => a + b, 0);
      const summaryLength = contextPayload.conversationSummary.length;
      const tokensSaved = Math.max(0, Math.ceil((fullHistoryLength - summaryLength) / 4));
      
      // STEP 8: Save updated context
      await this.contextStore.set(sessionId, contextPayload);
      
      // STEP 9: Emit response
      const latencyMs = Date.now() - startTime;
      
      emitter.emit('data', JSON.stringify({
        type: 'sources',
        data: sources,
      }));
      
      emitter.emit('data', JSON.stringify({
        type: 'response',
        data: response,
        metadata: {
          cacheHit,
          modelTier,
          routingPath: routingDecision.path,
          entitiesTracked: contextPayload.extractedEntities.size,
          summarizationTriggered,
          tokensSaved,
          estimatedCost: cost,
          latencyMs,
        },
      }));
      
      // Log metrics
      globalMetricsTracker.logQuery({
        timestamp: Date.now(),
        query,
        routingPath: routingDecision.path,
        cacheHit,
        modelTier,
        latencyMs,
      });
      
      // Track analytics
      const analytics = getAnalyticsTracker();
      analytics.trackModelUse(modelTier === 'tier2' ? 2 : 1);
      analytics.trackTokens(inputTokens, outputTokens, modelTier);
      
      emitter.emit('end');
      
    } catch (error) {
      console.error('[StatefulOrchestrator] Error:', error);
      emitter.emit('error', error);
    }
    
    return emitter;
  }
  
  /**
   * Handle canned responses
   */
  private async handleCannedResponse(query: string): Promise<{
    response: string;
    sources: any[];
  }> {
    const response = this.frugalRouter.getCannedResponse(query) || 
      "I'm here to help! Please ask me a question.";
    
    return { response, sources: [] };
  }
  
  /**
   * Handle cache lookup with fallback
   */
  private async handleCacheQuery(
    query: string,
    contextPayload: ContextPayload,
    history: BaseMessage[],
    llm: BaseChatModel,
    embeddings: Embeddings,
    optimizationMode: 'speed' | 'balanced' | 'quality',
    fileIds: string[],
    systemInstructions: string,
    maxHistoryTurns: number = 2
  ): Promise<{
    response: string;
    sources: any[];
    cacheHit: boolean;
  }> {
    // Check cache
    const cached = await this.semanticCache.get(query);
    
    if (cached) {
      return {
        response: cached.response,
        sources: cached.sources,
        cacheHit: true,
      };
    }
    
    // Cache miss - fall through to RAG
    const result = await this.handleRAGQuery(
      query,
      contextPayload,
      history,
      llm,
      embeddings,
      optimizationMode,
      fileIds,
      systemInstructions,
      'tier1',
      maxHistoryTurns
    );
    
    return { ...result, cacheHit: false };
  }
  
  /**
   * Handle RAG pipeline with context-aware enhancements
   */
  private async handleRAGQuery(
    query: string,
    contextPayload: ContextPayload,
    history: BaseMessage[],
    llm: BaseChatModel,
    embeddings: Embeddings,
    optimizationMode: 'speed' | 'balanced' | 'quality',
    fileIds: string[],
    systemInstructions: string,
    modelTier: 'tier1' | 'tier2',
    maxHistoryTurns: number = 2
  ): Promise<{
    response: string;
    sources: any[];
  }> {
    // Check cache first
    const cached = await this.semanticCache.get(query);
    
    if (cached) {
      return {
        response: cached.response,
        sources: cached.sources,
      };
    }
    
    // Select the appropriate model based on tier
    let tierLLM = llm; // Default to provided LLM
    
    try {
      const tierConfig = getTierConfig(modelTier);
      
      // Get available model providers
      const modelProviders = await getAvailableChatModelProviders();
      
      // Try to get the tier-specific model
      if (modelProviders[tierConfig.provider] && 
          modelProviders[tierConfig.provider][tierConfig.modelName]) {
        tierLLM = modelProviders[tierConfig.provider][tierConfig.modelName].model as BaseChatModel;
      } else {
        console.warn(`[StatefulOrchestrator] Tier ${modelTier} model (${tierConfig.modelName}) not available, using default`);
      }
    } catch (error) {
      console.error(`[StatefulOrchestrator] Error selecting tier model:`, error);
      // Fall back to provided LLM
    }
    
    // Get compact context for LLM
    const compactContext = getCompactContext(contextPayload, maxHistoryTurns);
    const relevantEntities = getRelevantEntities(
      contextPayload.extractedEntities,
      contextPayload.turnCount
    );
    
    // Enhance query with entities for better RAG retrieval
    const enhancedQuery = enhanceQueryWithEntities(query, relevantEntities);
    
    // Build minimal context history (summary + last N turns, where N = maxHistoryTurns)
    const minimalHistory: BaseMessage[] = [];
    
    if (compactContext.summary) {
      minimalHistory.push(new AIMessage({
        content: `[Conversation Summary: ${compactContext.summary}]`,
      }));
    }
    
    // Add recent turns
    for (const turn of compactContext.recentHistory) {
      if (turn.role === 'user') {
        minimalHistory.push(new HumanMessage({ content: turn.content }));
      } else {
        minimalHistory.push(new AIMessage({ content: turn.content }));
      }
    }
    
    // Enhance system instructions with entity context
    const enhancedSystemInstructions = systemInstructions + 
      (relevantEntities.length > 0 
        ? `\n\nContext entities being tracked:\n${formatEntitiesForPrompt(relevantEntities)}`
        : '');
    
    // Execute RAG with minimal context and tier-specific model
    const ragEmitter = await this.ragAgent.searchAndAnswer(
      enhancedQuery,
      minimalHistory,
      tierLLM,
      embeddings,
      optimizationMode,
      fileIds,
      enhancedSystemInstructions
    );
    
    // Collect response
    return new Promise((resolve, reject) => {
      let fullResponse = '';
      let sources: any[] = [];
      
      ragEmitter.on('data', (data: string) => {
        try {
          const parsedData = JSON.parse(data);
          
          if (parsedData.type === 'response') {
            fullResponse += parsedData.data;
          } else if (parsedData.type === 'sources') {
            sources = parsedData.data;
          }
        } catch (error) {
          console.error('[StatefulOrchestrator] Error parsing RAG data:', error);
        }
      });
      
      ragEmitter.on('end', async () => {
        // Cache the response
        if (fullResponse && sources) {
          await this.semanticCache.set(query, fullResponse, sources);
        }
        
        resolve({ response: fullResponse, sources });
      });
      
      ragEmitter.on('error', (error: any) => {
        reject(error);
      });
    });
  }
  
  /**
   * Get context for a session (for debugging/UI)
   */
  async getSessionContext(sessionId: string): Promise<ContextPayload | null> {
    return this.contextStore.get(sessionId);
  }
  
  /**
   * Clear context for a session
   */
  async clearSessionContext(sessionId: string): Promise<void> {
    await this.contextStore.delete(sessionId);
  }
  
  /**
   * Get store statistics
   */
  getStoreStats() {
    return this.contextStore.getStats();
  }
}

export default StatefulOrchestrator;
