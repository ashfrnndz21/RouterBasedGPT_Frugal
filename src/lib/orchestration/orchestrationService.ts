import { BaseMessage } from '@langchain/core/messages';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { Embeddings } from '@langchain/core/embeddings';
import EventEmitter from 'events';
import { FrugalRouter, RoutingPath } from '../routing/frugalRouter';
import { SemanticCache } from '../cache/semanticCache';
import { MetaSearchAgentType } from '../search/metaSearchAgent';
import { Document } from 'langchain/document';
import { globalMetricsTracker } from '../metrics/metricsTracker';
import { getAnalyticsTracker } from '../analytics/analyticsTracker';

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
    this.frugalRouter = new FrugalRouter();
    this.semanticCache = new SemanticCache(embeddings);
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
    systemInstructions: string
  ): Promise<EventEmitter> {
    const emitter = new EventEmitter();
    const startTime = Date.now();
    
    try {
      // 1. Route the query
      const routingDecision = await this.frugalRouter.route(query, history);
      
      console.log(`[Orchestration] Routing decision: ${routingDecision.path} (confidence: ${routingDecision.confidence})`);
      
      // 2. Handle based on routing path
      switch (routingDecision.path) {
        case 'canned':
          await this.handleCannedResponse(query, emitter, startTime);
          break;
          
        case 'cache':
          await this.handleCacheQuery(
            query,
            history,
            llm,
            embeddings,
            optimizationMode,
            fileIds,
            systemInstructions,
            emitter,
            startTime
          );
          break;
          
        case 'rag-tier1':
        case 'rag-tier2':
          await this.handleRAGQuery(
            query,
            history,
            llm,
            embeddings,
            optimizationMode,
            fileIds,
            systemInstructions,
            routingDecision.path === 'rag-tier2' ? 'tier2' : 'tier1',
            emitter,
            startTime
          );
          break;
      }
    } catch (error) {
      console.error('[Orchestration] Error:', error);
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
        },
      }));
      
      // Log metrics
      globalMetricsTracker.logQuery({
        timestamp: Date.now(),
        query,
        routingPath: 'canned',
        cacheHit: false,
        latencyMs,
      });
      
      // Track analytics - canned responses use tier1 (minimal cost)
      const analytics = getAnalyticsTracker();
      analytics.trackModelUse(1);
      
      emitter.emit('end');
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
    emitter: EventEmitter,
    startTime: number
  ): Promise<void> {
    // Check cache
    const cached = await this.semanticCache.get(query);
    
    if (cached) {
      const latencyMs = Date.now() - startTime;
      
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
        },
      }));
      
      // Log metrics
      globalMetricsTracker.logQuery({
        timestamp: Date.now(),
        query,
        routingPath: 'cache',
        cacheHit: true,
        latencyMs,
      });
      
      // Track analytics - cache hits don't use any model
      // We'll count them as tier1 for cost savings calculation
      const analytics = getAnalyticsTracker();
      analytics.trackModelUse(1);
      
      emitter.emit('end');
    } else {
      // Cache miss - fall through to RAG with tier1
      await this.handleRAGQuery(
        query,
        history,
        llm,
        embeddings,
        optimizationMode,
        fileIds,
        systemInstructions,
        'tier1',
        emitter,
        startTime
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
    startTime: number
  ): Promise<void> {
    // Note: In a full implementation, we would select different LLM instances
    // based on modelTier. For now, we use the provided LLM and track the tier
    // for metrics and cost calculation.
    
    // Use existing RAG agent
    const ragEmitter = await this.ragAgent.searchAndAnswer(
      query,
      history,
      llm,
      embeddings,
      optimizationMode,
      fileIds,
      systemInstructions
    );
    
    let fullResponse = '';
    let sources: Document[] = [];
    
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
      console.log(`[Orchestration] Query completed in ${latencyMs}ms (${modelTier})`);
      
      // Log metrics
      globalMetricsTracker.logQuery({
        timestamp: Date.now(),
        query,
        routingPath: modelTier === 'tier2' ? 'rag-tier2' : 'rag-tier1',
        cacheHit: false,
        modelTier,
        latencyMs,
      });
      
      // Track analytics
      const analytics = getAnalyticsTracker();
      analytics.trackModelUse(modelTier === 'tier2' ? 2 : 1);
      
      emitter.emit('end');
    });
    
    ragEmitter.on('error', (error: any) => {
      console.error('[Orchestration] RAG error:', error);
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
