'use client';

import { useEffect, useState, useCallback } from 'react';
import { getAnalyticsTracker, UsageInsights, AnalyticsData } from '@/lib/analytics/analyticsTracker';
import { getCategoryById } from '@/lib/preferences/interestCategories';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
  Sparkles,
  DollarSign,
  Download,
  BarChart3,
  Activity,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export default function AnalyticsPage() {
  const [insights, setInsights] = useState<UsageInsights | null>(null);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dataWarnings, setDataWarnings] = useState<string[]>([]);

  const loadAnalyticsData = useCallback(() => {
    try {
      const tracker = getAnalyticsTracker();
      const data = tracker.getAnalyticsData();
      const insightsData = tracker.getInsights();

      setAnalyticsData(data);
      setInsights(insightsData);
      setLastUpdated(new Date());
      
      // Validate data completeness
      const warnings: string[] = [];
      
      const totalQueries = data.modelUsage.tier1 + data.modelUsage.tier2 + data.modelUsage.tier3;
      
      // Check if token tracking seems incomplete (only warn if we have model usage but no tokens)
      // Note: Some queries (canned responses, cache hits) don't use tokens, so this is expected
      if (totalQueries > 10 && data.tokenUsage.totalTokens === 0) {
        warnings.push('Token usage data may be incomplete. Some queries may not have tracked tokens.');
      }
      
      // Check if model usage doesn't match search count
      // Note: Canned responses and cache hits are tracked as searches but don't use models (this is correct)
      // So we expect searches to be >= model usage, not equal
      // Only warn if there's a significant mismatch (more than 50% of searches have no model usage)
      const expectedModelUsage = Math.floor(data.searches.total * 0.3); // Expect at least 30% to use models (accounting for canned/cache)
      if (data.searches.total > 5 && totalQueries < expectedModelUsage) {
        warnings.push('Model usage data may be incomplete. Many searches were tracked but model usage appears low.');
      }
      
      // Check if tier3 is defined but never used (expected, but worth noting)
      if (data.modelUsage.tier3 > 0) {
        // Tier 3 is tracked, which is good
      } else if (totalQueries > 10) {
        // After many queries, if tier3 is still 0, it's expected (system doesn't use tier3)
      }
      
      setDataWarnings(warnings);
    } catch (error) {
      console.error('[Analytics] Failed to load data:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAnalyticsData();
  }, [loadAnalyticsData]);

  // Auto-refresh on window focus
  useEffect(() => {
    const handleFocus = () => {
      if (!isRefreshing) {
        loadAnalyticsData();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [loadAnalyticsData, isRefreshing]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadAnalyticsData();
  };

  const handleExport = () => {
    const tracker = getAnalyticsTracker();
    const exportData = tracker.exportAnalytics();

    // Create download
    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `truegpt-analytics-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-black/70 dark:text-white/70">Loading analytics...</div>
      </div>
    );
  }

  if (!insights || !analyticsData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <BarChart3 size={48} className="mx-auto mb-4 text-black/30 dark:text-white/30" />
          <div className="text-lg text-black/70 dark:text-white/70">No analytics data available yet</div>
          <div className="text-sm text-black/50 dark:text-white/50 mt-2">
            Start using FrugalAIGpt to see your usage insights
          </div>
        </div>
      </div>
    );
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return <TrendingUp size={20} className="text-green-600 dark:text-green-400" />;
      case 'decreasing':
        return <TrendingDown size={20} className="text-red-600 dark:text-red-400" />;
      default:
        return <Minus size={20} className="text-gray-600 dark:text-gray-400" />;
    }
  };

  const getTrendText = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return 'Increasing';
      case 'decreasing':
        return 'Decreasing';
      default:
        return 'Stable';
    }
  };

  return (
    <div className="min-h-screen bg-light-primary dark:bg-dark-primary pb-20 lg:pb-8">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-black dark:text-white mb-2">
              Analytics Dashboard
            </h1>
            <p className="text-sm text-black/60 dark:text-white/60">
              Track your usage patterns and insights
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-black/50 dark:text-white/50">
              <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
              {isRefreshing ? (
                <RefreshCw size={14} className="text-blue-500 animate-spin" />
              ) : (
                <span className="text-green-500">●</span>
              )}
            </div>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-light-secondary dark:bg-dark-secondary hover:bg-light-200 dark:hover:bg-dark-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors duration-200 whitespace-nowrap"
            >
              <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
              <span className="text-sm font-medium">
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
              </span>
            </button>
            <button
              onClick={handleExport}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-light-secondary dark:bg-dark-secondary hover:bg-light-200 dark:hover:bg-dark-200 rounded-lg transition-colors duration-200 whitespace-nowrap"
            >
              <Download size={16} />
              <span className="text-sm font-medium">Export Data</span>
            </button>
          </div>
        </div>

        {/* Data Validation Warnings */}
        {dataWarnings.length > 0 && (
          <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle size={20} className="text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-1">
                  Data Completeness Notice
                </h3>
                <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                  {dataWarnings.map((warning, index) => (
                    <li key={index}>• {warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
          <MetricCard
            icon={<Search size={20} />}
            title="Weekly Searches"
            value={insights.weeklySearches}
            subtitle="Last 7 days"
            color="blue"
          />
          <MetricCard
            icon={<Search size={20} />}
            title="Monthly Searches"
            value={insights.monthlySearches}
            subtitle="Last 30 days"
            color="purple"
          />
          <MetricCard
            icon={<Sparkles size={20} />}
            title="Total Tokens"
            value={insights.totalTokens.toLocaleString()}
            subtitle={`~${insights.averageTokensPerQuery} per query`}
            color="blue"
          />
          <MetricCard
            icon={<DollarSign size={20} />}
            title="Cost Savings"
            value={`$${insights.estimatedCostSavings.toFixed(2)}`}
            subtitle="From frugal routing"
            color="green"
            highlight
          />
          <MetricCard
            icon={getTrendIcon(insights.activityTrend)}
            title="Activity Trend"
            value={getTrendText(insights.activityTrend)}
            subtitle="Compared to last week"
            color="orange"
          />
        </div>

        {/* Top Categories */}
        {insights.topCategories.length > 0 && (
          <div className="bg-light-secondary dark:bg-dark-secondary rounded-2xl p-6 mb-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Activity size={20} className="text-black/70 dark:text-white/70" />
              <h2 className="text-xl font-semibold text-black dark:text-white">
                Top Categories
              </h2>
            </div>
            <div className="space-y-3">
              {insights.topCategories.map((cat, index) => {
                const category = getCategoryById(cat.category);
                const maxCount = insights.topCategories[0]?.count || 1;
                const percentage = (cat.count / maxCount) * 100;

                return (
                  <div key={cat.category} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-black dark:text-white">
                        {index + 1}. {category?.name || cat.category}
                      </span>
                      <span className="text-black/60 dark:text-white/60">
                        {cat.count} searches
                      </span>
                    </div>
                    <div className="w-full bg-light-200 dark:bg-dark-200 rounded-full h-2">
                      <div
                        className="bg-[#24A0ED] h-2 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Most Used Features */}
        {insights.mostUsedFeatures.length > 0 && (
          <div className="bg-light-secondary dark:bg-dark-secondary rounded-2xl p-6 mb-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={20} className="text-black/70 dark:text-white/70" />
              <h2 className="text-xl font-semibold text-black dark:text-white">
                Most Used Features
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {insights.mostUsedFeatures.map((feature) => (
                <div
                  key={feature.feature}
                  className="bg-light-primary dark:bg-dark-primary rounded-xl p-4"
                >
                  <div className="text-2xl font-bold text-black dark:text-white mb-1">
                    {feature.count}
                  </div>
                  <div className="text-sm text-black/70 dark:text-white/70">
                    {feature.feature}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search Activity Over Time */}
        <SearchActivityChart analyticsData={analyticsData} />

        {/* Category Distribution Chart */}
        {insights.topCategories.length > 0 && (
          <CategoryDistributionChart topCategories={insights.topCategories} />
        )}

        {/* Feature Usage Chart */}
        {insights.mostUsedFeatures.length > 0 && (
          <FeatureUsageChart mostUsedFeatures={insights.mostUsedFeatures} />
        )}

        {/* Model Usage Distribution */}
        <div className="bg-light-secondary dark:bg-dark-secondary rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={20} className="text-black/70 dark:text-white/70" />
            <h2 className="text-xl font-semibold text-black dark:text-white">
              Model Usage Distribution
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <ModelCard
              title="Tier 1 (Fast)"
              model="granite4:micro"
              count={analyticsData.modelUsage.tier1}
              color="bg-blue-500"
              cost="1.0x cost"
            />
            <ModelCard
              title="Tier 2 (Smart)"
              model="qwen3:1.7b"
              count={analyticsData.modelUsage.tier2}
              color="bg-purple-500"
              cost="2.5x cost"
            />
            <ModelCard
              title="Tier 3 (Not Used)"
              model="llama-3.3-70b"
              count={analyticsData.modelUsage.tier3}
              color="bg-orange-500"
              cost="Not configured"
              note={analyticsData.modelUsage.tier3 === 0 ? "System currently uses Tier 1 & 2 only" : undefined}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  title,
  value,
  subtitle,
  color,
  highlight = false,
}: {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  subtitle: string;
  color: string;
  highlight?: boolean;
}) {
  const colorClasses: Record<string, string> = {
    blue: 'text-blue-600 dark:text-blue-400',
    purple: 'text-purple-600 dark:text-purple-400',
    green: 'text-green-600 dark:text-green-400',
    orange: 'text-orange-600 dark:text-orange-400',
  };

  return (
    <div
      className={`bg-light-secondary dark:bg-dark-secondary rounded-2xl p-6 shadow-sm ${highlight ? 'ring-2 ring-[#24A0ED]' : ''
        }`}
    >
      <div className={`mb-3 ${colorClasses[color] || colorClasses.blue}`}>
        {icon}
      </div>
      <div className="text-sm text-black/60 dark:text-white/60 mb-1">
        {title}
      </div>
      <div className="text-2xl font-bold text-black dark:text-white mb-1">
        {value}
      </div>
      <div className="text-xs text-black/50 dark:text-white/50">{subtitle}</div>
    </div>
  );
}

function ModelCard({
  title,
  model,
  count,
  color,
  cost,
  note,
}: {
  title: string;
  model: string;
  count: number;
  color: string;
  cost: string;
  note?: string;
}) {
  return (
    <div className="bg-light-primary dark:bg-dark-primary rounded-xl p-4">
      <div className={`w-10 h-10 ${color} rounded-lg mb-3`}></div>
      <div className="text-2xl font-bold text-black dark:text-white mb-1">
        {count}
      </div>
      <div className="text-sm font-semibold text-black/80 dark:text-white/80 mb-1">
        {title}
      </div>
      <div className="text-xs text-black/60 dark:text-white/60 mb-1">
        {model}
      </div>
      <div className="text-xs text-black/50 dark:text-white/50 mb-1">{cost}</div>
      {note && (
        <div className="text-xs text-black/40 dark:text-white/40 italic mt-2 pt-2 border-t border-light-200 dark:border-dark-200">
          {note}
        </div>
      )}
    </div>
  );
}

function SearchActivityChart({ analyticsData }: { analyticsData: AnalyticsData }) {
  // Prepare data for line chart - last 30 days
  const chartData = Object.entries(analyticsData.searches.byDate)
    .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
    .slice(-30)
    .map(([date, count]) => ({
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      searches: count,
    }));

  if (chartData.length === 0) {
    return null;
  }

  return (
    <div className="bg-light-secondary dark:bg-dark-secondary rounded-2xl p-6 mb-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Activity size={20} className="text-black/70 dark:text-white/70" />
        <h2 className="text-xl font-semibold text-black dark:text-white">
          Search Activity Over Time
        </h2>
      </div>
      <div className="overflow-x-auto">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
            <XAxis
              dataKey="date"
              stroke="#9CA3AF"
              style={{ fontSize: '10px' }}
              interval="preserveStartEnd"
            />
            <YAxis
              stroke="#9CA3AF"
              style={{ fontSize: '10px' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: 'none',
                borderRadius: '8px',
                color: '#F9FAFB',
              }}
            />
            <Line
              type="monotone"
              dataKey="searches"
              stroke="#24A0ED"
              strokeWidth={2}
              dot={{ fill: '#24A0ED', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function CategoryDistributionChart({
  topCategories
}: {
  topCategories: Array<{ category: string; count: number }>
}) {
  const chartData = topCategories.map((cat) => {
    const category = getCategoryById(cat.category);
    return {
      name: category?.name || cat.category,
      count: cat.count,
    };
  });

  return (
    <div className="bg-light-secondary dark:bg-dark-secondary rounded-2xl p-6 mb-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 size={20} className="text-black/70 dark:text-white/70" />
        <h2 className="text-xl font-semibold text-black dark:text-white">
          Category Distribution
        </h2>
      </div>
      <div className="overflow-x-auto">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
            <XAxis
              dataKey="name"
              stroke="#9CA3AF"
              style={{ fontSize: '10px' }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              stroke="#9CA3AF"
              style={{ fontSize: '10px' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: 'none',
                borderRadius: '8px',
                color: '#F9FAFB',
              }}
            />
            <Bar dataKey="count" fill="#24A0ED" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function FeatureUsageChart({
  mostUsedFeatures
}: {
  mostUsedFeatures: Array<{ feature: string; count: number }>
}) {
  const COLORS = ['#24A0ED', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'];

  const chartData = mostUsedFeatures.map((feature) => ({
    name: feature.feature,
    value: feature.count,
  }));

  return (
    <div className="bg-light-secondary dark:bg-dark-secondary rounded-2xl p-6 mb-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles size={20} className="text-black/70 dark:text-white/70" />
        <h2 className="text-xl font-semibold text-black dark:text-white">
          Feature Usage Distribution
        </h2>
      </div>
      <div className="overflow-x-auto">
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={(entry: any) => {
                // Hide labels on small screens
                if (typeof window !== 'undefined' && window.innerWidth < 640) {
                  return '';
                }
                return `${entry.name}: ${(entry.percent * 100).toFixed(0)}%`;
              }}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: 'none',
                borderRadius: '8px',
                color: '#F9FAFB',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
