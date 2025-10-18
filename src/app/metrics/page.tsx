'use client';

import { useEffect, useState } from 'react';

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
}

export default function MetricsPage() {
  const [metrics, setMetrics] = useState<AggregatedMetrics | null>(null);
  const [recentQueries, setRecentQueries] = useState<QueryMetrics[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/metrics');
      const data = await response.json();
      setMetrics(data.aggregated);
      setRecentQueries(data.recent);
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading metrics...</div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">No metrics available</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-gray-900 dark:text-white">
          Frugal RAG Metrics Dashboard
        </h1>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Total Queries"
            value={metrics.totalQueries}
            subtitle="All queries processed"
          />
          <MetricCard
            title="Cache Hit Rate"
            value={`${(metrics.cacheHitRate * 100).toFixed(1)}%`}
            subtitle={`${metrics.cacheHits} cache hits`}
            highlight={metrics.cacheHitRate > 0.2}
          />
          <MetricCard
            title="Avg Latency"
            value={`${metrics.avgLatencyMs.toFixed(0)}ms`}
            subtitle="Response time"
          />
          <MetricCard
            title="Cost Savings"
            value={`${metrics.estimatedCostSavings.savingsPercent.toFixed(1)}%`}
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
                {metrics.estimatedCostSavings.withTiering.toFixed(2)}x
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Without Optimization
              </div>
              <div className="text-3xl font-bold text-red-600">
                {metrics.estimatedCostSavings.withoutTiering.toFixed(2)}x
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Savings
              </div>
              <div className="text-3xl font-bold text-blue-600">
                {metrics.estimatedCostSavings.savings.toFixed(2)}x
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
              count={metrics.cannedResponses}
              color="bg-gray-500"
              description="Instant responses"
            />
            <RouteCard
              title="Cache Hits"
              count={metrics.cacheHits}
              color="bg-green-500"
              description="Cached responses"
            />
            <RouteCard
              title="Tier 1 (Fast)"
              count={metrics.tier1Queries}
              color="bg-blue-500"
              description="Cheap model"
            />
            <RouteCard
              title="Tier 2 (Smart)"
              count={metrics.tier2Queries}
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
