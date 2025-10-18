import { RoutingPath } from '../routing/frugalRouter';

export interface QueryMetrics {
  timestamp: number;
  query: string;
  routingPath: RoutingPath;
  cacheHit: boolean;
  modelTier?: 'tier1' | 'tier2';
  latencyMs: number;
}

export interface AggregatedMetrics {
  totalQueries: number;
  cacheHits: number;
  cacheHitRate: number;
  tier1Queries: number;
  tier2Queries: number;
  cannedResponses: number;
  avgLatencyMs: number;
  estimatedCostSavings: {
    withTiering: number;
    withoutTiering: number;
    savings: number;
    savingsPercent: number;
  };
}

/**
 * MetricsTracker - Track query metrics for cost analysis
 * 
 * For demo purposes, this uses in-memory storage.
 * In production, this would persist to a database.
 */
export class MetricsTracker {
  private metrics: QueryMetrics[] = [];
  private maxMetrics: number = 1000;
  
  /**
   * Log a query with its routing and performance metrics
   */
  logQuery(metrics: QueryMetrics): void {
    this.metrics.push(metrics);
    
    // Keep only the most recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }
    
    console.log(`[Metrics] Query logged: ${metrics.routingPath} (${metrics.latencyMs}ms)`);
  }
  
  /**
   * Get aggregated metrics for analysis
   */
  getAggregatedMetrics(): AggregatedMetrics {
    const totalQueries = this.metrics.length;
    
    if (totalQueries === 0) {
      return {
        totalQueries: 0,
        cacheHits: 0,
        cacheHitRate: 0,
        tier1Queries: 0,
        tier2Queries: 0,
        cannedResponses: 0,
        avgLatencyMs: 0,
        estimatedCostSavings: {
          withTiering: 0,
          withoutTiering: 0,
          savings: 0,
          savingsPercent: 0,
        },
      };
    }
    
    const cacheHits = this.metrics.filter(m => m.cacheHit).length;
    const tier1Queries = this.metrics.filter(m => m.routingPath === 'rag-tier1').length;
    const tier2Queries = this.metrics.filter(m => m.routingPath === 'rag-tier2').length;
    const cannedResponses = this.metrics.filter(m => m.routingPath === 'canned').length;
    
    const totalLatency = this.metrics.reduce((sum, m) => sum + m.latencyMs, 0);
    const avgLatencyMs = totalLatency / totalQueries;
    
    // Calculate cost savings
    const tier1Cost = 1.0; // Base cost
    const tier2Cost = 2.5; // 2.5x more expensive (qwen3:1.7b)
    
    // Cost with our frugal system
    const withTiering = (tier1Queries * tier1Cost) + (tier2Queries * tier2Cost);
    
    // Cost if everything used tier2 and no caching
    const withoutTiering = totalQueries * tier2Cost;
    
    const savings = withoutTiering - withTiering;
    const savingsPercent = withoutTiering > 0 ? (savings / withoutTiering) * 100 : 0;
    
    return {
      totalQueries,
      cacheHits,
      cacheHitRate: cacheHits / totalQueries,
      tier1Queries,
      tier2Queries,
      cannedResponses,
      avgLatencyMs,
      estimatedCostSavings: {
        withTiering,
        withoutTiering,
        savings,
        savingsPercent,
      },
    };
  }
  
  /**
   * Get recent query history
   */
  getRecentQueries(limit: number = 10): QueryMetrics[] {
    return this.metrics.slice(-limit).reverse();
  }
  
  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
    console.log('[Metrics] Metrics cleared');
  }
}

// Singleton instance for demo
export const globalMetricsTracker = new MetricsTracker();
