import { BaseMessage } from '@langchain/core/messages';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { Embeddings } from '@langchain/core/embeddings';
import EventEmitter from 'events';
import { FrugalRouter, RoutingPath } from '../routing/frugalRouter';
import { SemanticCache, getSemanticCache } from '../cache/semanticCache';
import { MetaSearchAgentType } from '../search/metaSearchAgent';
import { Document } from 'langchain/document';
import { globalMetricsTracker } from '../metrics/metricsTracker';
import { getAnalyticsTracker } from '../analytics/analyticsTracker';
import { getTierConfig } from '../models/tierConfig';
import { getAvailableChatModelProviders, ChatModel } from '../providers';
import { calculateCost } from '../context/contextPayload';

export interface OrchestrationMetrics {
  routingPath: RoutingPath;
  cacheHit: boolean;
  modelTier?: 'tier1' | 'tier2';
  latencyMs: number;
}

/**
 * OrchestrationService - Coordinates the frugal RAG pipeline
 * 
 * This service wraps the existing MetaSearchAgent with intelligent
 * routing and caching to minimize costs while maintaining quality.
 * 
 * Flow:
 * 1. Route query (canned/cache/rag-tier1/rag-tier2)
 * 2. Check cache for similar queries
 * 3. Fall back to RAG pipeline if needed
 * 4. Cache successful responses
 */
export class OrchestrationService {
  private frugalRouter: FrugalRouter;
  private semanticCache: SemanticCache;
  private ragAgent: MetaSearchAgentType;
  
  constructor(
    ragAgent: MetaSearchAgentType,
    embeddings: Embeddings
  ) {
    this.frugalRouter = new FrugalRouter(embeddings);
    this.semanticCache = getSemanticCache(embeddings);
    this.ragAgent = ragAgent;
  }
  
  /**
   * Handle a user query with intelligent routing
   */
  async handleQuery(
    query: string,
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
    
    let intendedTier: 'tier1' | 'tier2' | null = null;
    let routingPath: string | null = null;
    
    try {
      // 1. Route the query
      const routingDecision = await this.frugalRouter.route(query, history);
      routingPath = routingDecision.path;
      
      console.log(`[Orchestration] Routing decision: ${routingDecision.path} (confidence: ${routingDecision.confidence})`);
      
      // 2. Handle based on routing path
      switch (routingDecision.path) {
        case 'canned':
          await this.handleCannedResponse(query, emitter, startTime);
          // Canned responses don't use models
          break;
          
        case 'cache':
          // Medium queries: check cache first, then tier1 if miss
          intendedTier = 'tier1';
          await this.handleCacheQuery(
            query,
            history,
            llm,
            embeddings,
            optimizationMode,
            fileIds,
            systemInstructions,
            'tier1',
            emitter,
            startTime,
            maxHistoryTurns
          );
          break;
          
        case 'rag-tier1':
        case 'rag-tier2':
          // Simple/complex queries: go directly to LLM (skip cache)
          intendedTier = routingDecision.path === 'rag-tier2' ? 'tier2' : 'tier1';
          await this.handleRAGQuery(
            query,
            history,
            llm,
            embeddings,
            optimizationMode,
            fileIds,
            systemInstructions,
            intendedTier,
            emitter,
            startTime,
            true, // skipCache = true for direct routing
            maxHistoryTurns
          );
          break;
      }
    } catch (error) {
      console.error('[Orchestration] Error:', error);
      
      // Track model usage even on errors (if we were trying to use a model)
      // This ensures analytics are complete even when queries fail
      if (intendedTier && routingPath && routingPath !== 'canned') {
        try {
          const analytics = getAnalyticsTracker();
          analytics.trackModelUse(intendedTier === 'tier2' ? 2 : 1);
          console.log(`[Orchestration] Tracked model usage for failed query (${intendedTier})`);
        } catch (analyticsError) {
          console.error('[Orchestration] Failed to track analytics on error:', analyticsError);
        }
      } else if (routingPath && routingPath !== 'canned') {
        // Fallback: if we don't know the tier, use tier1 as conservative estimate
        try {
          const analytics = getAnalyticsTracker();
          analytics.trackModelUse(1);
          console.log('[Orchestration] Tracked model usage for failed query (fallback to tier1)');
        } catch (analyticsError) {
          console.error('[Orchestration] Failed to track analytics on error:', analyticsError);
        }
      }
      
      emitter.emit('error', error);
    }
    
    return emitter;
  }
  
  /**
   * Handle canned responses (greetings, meta queries)
   */
  private async handleCannedResponse(
    query: string,
    emitter: EventEmitter,
    startTime: number
  ): Promise<void> {
    const response = this.frugalRouter.getCannedResponse(query);
    
    if (response) {
      const latencyMs = Date.now() - startTime;
      const estimatedCost = 0; // Canned responses are free
      
      // Use setImmediate to ensure listeners are attached first
      setImmediate(() => {
        // Emit as a complete response
        emitter.emit('data', JSON.stringify({
          type: 'sources',
          data: [],
        }));
        
        emitter.emit('data', JSON.stringify({
          type: 'response',
          data: response,
          metadata: {
            cacheHit: false,
            routingPath: 'canned',
            latencyMs,
            estimatedCost,
          },
        }));
        
        // Emit metadata separately for consistency (canned responses don't use models)
        emitter.emit('data', JSON.stringify({
          type: 'metadata',
          data: {
            cacheHit: false,
            routingPath: 'canned',
            latencyMs,
            estimatedCost,
            // No modelTier - canned responses don't use models
          },
        }));
        
        // Log metrics
        globalMetricsTracker.logQuery({
          timestamp: Date.now(),
          query,
          routingPath: 'canned',
          cacheHit: false,
          latencyMs,
          estimatedCost,
        });
        
        // Note: Canned responses don't use models, so we don't track model usage
        // This ensures analytics accurately reflect actual model usage
        
        emitter.emit('end');
      });
    } else {
      // Fallback to cache if no canned response found
      await this.handleCacheQuery(
        query,
        [],
        null as any,
        null as any,
        'balanced',
        [],
        '',
        'tier1', // Default to tier1 for fallback
        emitter,
        startTime
      );
    }
  }
  
  /**
   * Handle cache lookup with fallback to RAG
   */
  private async handleCacheQuery(
    query: string,
    history: BaseMessage[],
    llm: BaseChatModel,
    embeddings: Embeddings,
    optimizationMode: 'speed' | 'balanced' | 'quality',
    fileIds: string[],
    systemInstructions: string,
    intendedTier: 'tier1' | 'tier2',
    emitter: EventEmitter,
    startTime: number,
    maxHistoryTurns: number = 2
  ): Promise<void> {
    // Check cache first
    const cached = await this.semanticCache.get(query);
    
    if (cached) {
      const latencyMs = Date.now() - startTime;
      const estimatedCost = 0; // Cache hits are free
      
      // Use setImmediate to ensure listeners are attached first
      setImmediate(() => {
        // Cache hit - return cached response
        emitter.emit('data', JSON.stringify({
          type: 'sources',
          data: cached.sources,
        }));
        
        emitter.emit('data', JSON.stringify({
          type: 'response',
          data: cached.response,
          metadata: {
            cacheHit: true,
            routingPath: 'cache',
            latencyMs,
            estimatedCost,
            modelTier: intendedTier, // Include intended tier for analytics
          },
        }));
        
        // Emit metadata separately for consistency
        emitter.emit('data', JSON.stringify({
          type: 'metadata',
          data: {
            cacheHit: true,
            routingPath: 'cache',
            latencyMs,
            estimatedCost,
            modelTier: intendedTier,
          },
        }));
        
        // Log metrics
        globalMetricsTracker.logQuery({
          timestamp: Date.now(),
          query,
          routingPath: 'cache',
          cacheHit: true,
          latencyMs,
          estimatedCost,
        });
        
        // Note: Cache hits don't use models, so we don't track model usage
        // This ensures analytics accurately reflect actual model usage
        
        emitter.emit('end');
      });
    } else {
      // Cache miss - fall through to RAG with intended tier
      await this.handleRAGQuery(
        query,
        history,
        llm,
        embeddings,
        optimizationMode,
        fileIds,
        systemInstructions,
        intendedTier,
        emitter,
        startTime,
        false, // skipCache = false for cache query path
        maxHistoryTurns
      );
    }
  }

  
  /**
   * Handle RAG pipeline execution with specified model tier
   */
  private async handleRAGQuery(
    query: string,
    history: BaseMessage[],
    llm: BaseChatModel,
    embeddings: Embeddings,
    optimizationMode: 'speed' | 'balanced' | 'quality',
    fileIds: string[],
    systemInstructions: string,
    modelTier: 'tier1' | 'tier2',
    emitter: EventEmitter,
    startTime: number,
    skipCache: boolean = false,
    maxHistoryTurns: number = 2
  ): Promise<void> {
    // Only check cache if not skipping (for medium queries via handleCacheQuery)
    if (!skipCache) {
      const cached = await this.semanticCache.get(query);
      
      if (cached) {
        const latencyMs = Date.now() - startTime;
        
        setImmediate(() => {
          const estimatedCost = 0; // Cache hits are free
          emitter.emit('data', JSON.stringify({
            type: 'sources',
            data: cached.sources,
          }));
          
          emitter.emit('data', JSON.stringify({
            type: 'response',
            data: cached.response,
            metadata: {
              cacheHit: true,
              routingPath: modelTier === 'tier2' ? 'rag-tier2' : 'rag-tier1',
              modelTier,
              latencyMs,
              estimatedCost,
            },
          }));
          
          globalMetricsTracker.logQuery({
            timestamp: Date.now(),
            query,
            routingPath: modelTier === 'tier2' ? 'rag-tier2' : 'rag-tier1',
            cacheHit: true,
            modelTier,
            latencyMs,
            estimatedCost,
          });
          
          const analytics = getAnalyticsTracker();
          analytics.trackModelUse(modelTier === 'tier2' ? 2 : 1);
          
          emitter.emit('end');
        });
        return; // Early return on cache hit
      }
    }
    
    // Proceed with RAG (cache skipped or miss)
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
        console.warn(`[Orchestration] Tier ${modelTier} model (${tierConfig.modelName}) not available, using default`);
      }
    } catch (error) {
      console.error(`[Orchestration] Error selecting tier model:`, error);
      // Fall back to provided LLM
    }
    
    // Limit history to last N turns (each turn = user + assistant = 2 messages)
    const limitedHistory = maxHistoryTurns > 0 
      ? history.slice(-maxHistoryTurns * 2)
      : history;
    
    // Use existing RAG agent with tier-specific model
    const ragEmitter = await this.ragAgent.searchAndAnswer(
      query,
      limitedHistory,
      tierLLM,
      embeddings,
      optimizationMode,
      fileIds,
      systemInstructions
    );
    
    let fullResponse = '';
    let sources: Document[] = [];
    let tokenUsage: { inputTokens: number; outputTokens: number } | null = null;
    
    // Forward events from RAG agent to our emitter
    ragEmitter.on('data', (data: string) => {
      try {
        const parsedData = JSON.parse(data);
        
        if (parsedData.type === 'response') {
          fullResponse += parsedData.data;
          
          // Add metadata to response chunks
          emitter.emit('data', JSON.stringify({
            type: 'response',
            data: parsedData.data,
            metadata: {
              cacheHit: false,
              modelTier,
              routingPath: modelTier === 'tier2' ? 'rag-tier2' : 'rag-tier1',
            },
          }));
        } else if (parsedData.type === 'sources') {
          sources = parsedData.data;
          emitter.emit('data', JSON.stringify({
            type: 'sources',
            data: parsedData.data,
          }));
        } else if (parsedData.type === 'tokenUsage' && parsedData.data) {
          // Capture token usage from Ollama
          const usage = parsedData.data as { inputTokens: number; outputTokens: number };
          tokenUsage = usage;
          console.log(`[Orchestration] Captured token usage: ${usage.inputTokens} input, ${usage.outputTokens} output`);
        }
      } catch (error) {
        console.error('[Orchestration] Error parsing RAG data:', error);
      }
    });
    
    ragEmitter.on('end', async () => {
      // Cache the response for future queries
      if (fullResponse && sources) {
        await this.semanticCache.set(query, fullResponse, sources);
      }
      
      const latencyMs = Date.now() - startTime;
      
      // Calculate cost from actual token usage if available
      let estimatedCost: number | undefined;
      if (tokenUsage) {
        estimatedCost = calculateCost(tokenUsage.inputTokens, tokenUsage.outputTokens, modelTier);
        console.log(`[Orchestration] Calculated cost: $${estimatedCost.toFixed(6)} from ${tokenUsage.inputTokens} input + ${tokenUsage.outputTokens} output tokens`);
      }
      
      console.log(`[Orchestration] Query completed in ${latencyMs}ms (${modelTier})`);
      
      // Always emit metadata (even without cost) so client can track analytics
      // Analytics tracking happens on client side because server-side has no localStorage
      emitter.emit('data', JSON.stringify({
        type: 'metadata',
        data: {
          estimatedCost: estimatedCost || 0,
          modelTier,
          routingPath: modelTier === 'tier2' ? 'rag-tier2' : 'rag-tier1',
          cacheHit: false,
          latencyMs,
          tokenUsage: tokenUsage ? {
            inputTokens: tokenUsage.inputTokens,
            outputTokens: tokenUsage.outputTokens,
            totalTokens: tokenUsage.inputTokens + tokenUsage.outputTokens,
          } : undefined,
        },
      }));
      
      // Log metrics with actual cost
      globalMetricsTracker.logQuery({
        timestamp: Date.now(),
        query,
        routingPath: modelTier === 'tier2' ? 'rag-tier2' : 'rag-tier1',
        cacheHit: false,
        modelTier,
        latencyMs,
        estimatedCost,
      });
      
      // Track analytics with actual token usage if available
      const analytics = getAnalyticsTracker();
      analytics.trackModelUse(modelTier === 'tier2' ? 2 : 1);
      
      if (tokenUsage) {
        analytics.trackTokens(
          tokenUsage.inputTokens, 
          tokenUsage.outputTokens, 
          modelTier === 'tier2' ? 'tier2' : 'tier1'
        );
        console.log(`[Orchestration] Tracked ${tokenUsage.inputTokens + tokenUsage.outputTokens} tokens for analytics`);
      }
      
      emitter.emit('end');
    });
    
    ragEmitter.on('error', (error: any) => {
      console.error('[Orchestration] RAG error:', error);
      
      // Track model usage even on RAG errors (we attempted to use a model)
      // This ensures analytics are complete even when RAG fails
      try {
        const analytics = getAnalyticsTracker();
        analytics.trackModelUse(modelTier === 'tier2' ? 2 : 1);
        console.log(`[Orchestration] Tracked model usage for failed RAG query (${modelTier})`);
      } catch (analyticsError) {
        console.error('[Orchestration] Failed to track analytics on RAG error:', analyticsError);
      }
      
      emitter.emit('error', error);
    });
  }
  
  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.semanticCache.getStats();
  }
  
  /**
   * Clear the cache
   */
  clearCache() {
    this.semanticCache.clear();
  }
}

export default OrchestrationService;
