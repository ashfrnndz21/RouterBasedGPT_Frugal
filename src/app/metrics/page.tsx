'use client';

import { useEffect, useState, useCallback } from 'react';

interface AggregatedMetrics {
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

interface QueryMetrics {
  timestamp: number;
  query: string;
  routingPath: string;
  cacheHit: boolean;
  modelTier?: string;
  latencyMs: number;
  estimatedCost?: number;
}

export default function MetricsPage() {
  const [metrics, setMetrics] = useState<AggregatedMetrics | null>(null);
  const [recentQueries, setRecentQueries] = useState<QueryMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchMetrics = useCallback(async () => {
    try {
      setIsRefreshing(true);
      setError(null);
      const response = await fetch('/api/metrics', {
        cache: 'no-store', // Ensure fresh data
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch metrics: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.aggregated && data.recent) {
        setMetrics(data.aggregated);
        setRecentQueries(data.recent);
        setLastUpdated(new Date());
        console.log('[Metrics] Updated:', {
          totalQueries: data.aggregated.totalQueries,
          recentCount: data.recent.length,
        });
      } else {
        throw new Error('Invalid metrics data structure');
      }
    } catch (error) {
      console.error('Error fetching metrics:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch metrics');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics(); // Only fetch once on mount
  }, [fetchMetrics]);

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-lg text-gray-900 dark:text-white">Loading metrics...</div>
      </div>
    );
  }

  // Show default empty metrics if none available
  const displayMetrics = metrics || {
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            Frugal RAG Metrics Dashboard
          </h1>
          <div className="flex items-center gap-4">
            <button
              onClick={fetchMetrics}
              disabled={isRefreshing}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm flex items-center gap-2"
            >
              {isRefreshing ? (
                <>
                  <span className="animate-spin">⟳</span>
                  <span>Refreshing...</span>
                </>
              ) : (
                <span>Refresh</span>
              )}
            </button>
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
              {isRefreshing ? (
                <span className="text-blue-500 animate-spin">⟳</span>
              ) : (
                <span className="text-green-500">●</span>
              )}
            </div>
          </div>
        </div>
        
        {error && (
          <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg">
            <p className="text-red-800 dark:text-red-200">Error: {error}</p>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Total Queries"
            value={displayMetrics.totalQueries}
            subtitle="All queries processed"
          />
          <MetricCard
            title="Cache Hit Rate"
            value={`${(displayMetrics.cacheHitRate * 100).toFixed(1)}%`}
            subtitle={`${displayMetrics.cacheHits} cache hits`}
            highlight={displayMetrics.cacheHitRate > 0.2}
          />
          <MetricCard
            title="Avg Latency"
            value={`${displayMetrics.avgLatencyMs.toFixed(0)}ms`}
            subtitle="Response time"
          />
          <MetricCard
            title="Cost Savings"
            value={`${displayMetrics.estimatedCostSavings.savingsPercent.toFixed(1)}%`}
            subtitle="vs. no optimization"
            highlight={true}
          />
        </div>

        {/* Cost Savings Detail */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
            Cost Analysis
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                With Frugal System
              </div>
              <div className="text-3xl font-bold text-green-600">
                {displayMetrics.estimatedCostSavings.withTiering.toFixed(2)}x
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Without Optimization
              </div>
              <div className="text-3xl font-bold text-red-600">
                {displayMetrics.estimatedCostSavings.withoutTiering.toFixed(2)}x
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Savings
              </div>
              <div className="text-3xl font-bold text-blue-600">
                {displayMetrics.estimatedCostSavings.savings.toFixed(2)}x
              </div>
            </div>
          </div>
        </div>

        {/* Query Distribution */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
            Query Distribution
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <RouteCard
              title="Canned"
              count={displayMetrics.cannedResponses}
              color="bg-gray-500"
              description="Instant responses"
            />
            <RouteCard
              title="Cache Hits"
              count={displayMetrics.cacheHits}
              color="bg-green-500"
              description="Cached responses"
            />
            <RouteCard
              title="Tier 1 (Fast)"
              count={displayMetrics.tier1Queries}
              color="bg-blue-500"
              description="Cheap model"
            />
            <RouteCard
              title="Tier 2 (Smart)"
              count={displayMetrics.tier2Queries}
              color="bg-purple-500"
              description="Expensive model"
            />
          </div>
        </div>

        {/* Recent Queries */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
            Recent Queries
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Query
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Route
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Cache
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Latency
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Cost (×$0.0001)
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentQueries.map((q, i) => (
                  <tr
                    key={i}
                    className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100">
                      {q.query.substring(0, 60)}
                      {q.query.length > 60 ? '...' : ''}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-1 text-xs rounded ${
                          q.routingPath === 'canned'
                            ? 'bg-gray-200 text-gray-800'
                            : q.routingPath === 'cache'
                            ? 'bg-green-200 text-green-800'
                            : q.routingPath === 'rag-tier1'
                            ? 'bg-blue-200 text-blue-800'
                            : 'bg-purple-200 text-purple-800'
                        }`}
                      >
                        {q.routingPath}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {q.cacheHit ? (
                        <span className="text-green-600">✓ Hit</span>
                      ) : (
                        <span className="text-gray-400">Miss</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                      {q.latencyMs}ms
                    </td>
                    <td className="py-3 px-4 text-sm text-right">
                      {q.estimatedCost !== undefined ? (
                        <span
                          className={`inline-block px-2 py-1 text-xs rounded font-medium ${
                            q.cacheHit
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                              : q.modelTier === 'tier2'
                              ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                          }`}
                          title={q.cacheHit ? 'Free' : `$${q.estimatedCost.toFixed(6)}`}
                        >
                          {q.cacheHit 
                            ? '0' 
                            : (() => {
                                const COST_MULTIPLIER = 10000; // ×$0.0001
                                const scaledCost = q.estimatedCost * COST_MULTIPLIER;
                                // Format: remove trailing zeros, show at least 1 decimal if < 1, otherwise show 1 decimal
                                if (scaledCost < 0.01) {
                                  return scaledCost.toFixed(3).replace(/\.?0+$/, '');
                                } else if (scaledCost < 0.1) {
                                  return scaledCost.toFixed(2).replace(/\.?0+$/, '');
                                } else if (scaledCost < 1) {
                                  return scaledCost.toFixed(2).replace(/\.?0+$/, '');
                                } else {
                                  return scaledCost.toFixed(1).replace(/\.?0+$/, '');
                                }
                              })()}
                        </span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  highlight = false,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 ${
        highlight ? 'ring-2 ring-blue-500' : ''
      }`}
    >
      <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
        {title}
      </div>
      <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
        {value}
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-500">{subtitle}</div>
    </div>
  );
}

function RouteCard({
  title,
  count,
  color,
  description,
}: {
  title: string;
  count: number;
  color: string;
  description: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <div className={`w-12 h-12 ${color} rounded-lg mb-3`}></div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
        {count}
      </div>
      <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
        {title}
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-500">
        {description}
      </div>
    </div>
  );
}
