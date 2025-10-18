/**
 * AnalyticsTracker - Track user activity and generate usage insights
 * 
 * This service tracks user interactions, search patterns, and feature usage
 * to provide personalized analytics and insights. All data is stored in
 * browser localStorage for privacy and simplicity.
 */

const STORAGE_KEY = 'truegpt_analytics';
const STORAGE_VERSION = '1.0';
const MAX_DATA_AGE_DAYS = 90;

export interface AnalyticsData {
  version: string;
  searches: {
    total: number;
    byCategory: Record<string, number>;
    byDate: Record<string, number>; // ISO date string -> count
  };
  features: {
    imagesUsed: number;
    videosUsed: number;
    academicUsed: number;
    redditUsed: number;
    wolframUsed: number;
  };
  modelUsage: {
    tier1: number; // granite-3.1-2b
    tier2: number; // granite-3.1-8b
    tier3: number; // llama-3.3-70b
  };
  tokenUsage: {
    totalTokens: number;
    inputTokens: number;
    outputTokens: number;
    byModel: Record<string, number>;
  };
  sessions: {
    totalSessions: number;
    totalQueries: number;
    averageQueriesPerSession: number;
  };
  lastUpdated: number;
}

export interface UsageInsights {
  topCategories: Array<{ category: string; count: number }>;
  mostUsedFeatures: Array<{ feature: string; count: number }>;
  weeklySearches: number;
  monthlySearches: number;
  totalTokens: number;
  averageTokensPerQuery: number;
  estimatedCostSavings: number; // based on frugal routing
  activityTrend: 'increasing' | 'stable' | 'decreasing';
}

export class AnalyticsTracker {
  private data: AnalyticsData;
  private pendingWrites: boolean = false;
  private writeTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.data = this.loadData();
  }

  /**
   * Load analytics data from localStorage
   */
  private loadData(): AnalyticsData {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        
        // Validate version and structure
        if (parsed.version === STORAGE_VERSION) {
          // Merge with defaults to handle new fields
          const defaults = this.getDefaultData();
          return {
            ...defaults,
            ...parsed,
            tokenUsage: parsed.tokenUsage || defaults.tokenUsage,
            modelUsage: parsed.modelUsage || defaults.modelUsage,
            features: parsed.features || defaults.features,
            searches: parsed.searches || defaults.searches,
            sessions: parsed.sessions || defaults.sessions,
          };
        }
      }
    } catch (error) {
      console.error('[Analytics] Failed to load data:', error);
    }

    // Return default structure
    return this.getDefaultData();
  }

  /**
   * Get default analytics data structure
   */
  private getDefaultData(): AnalyticsData {
    return {
      version: STORAGE_VERSION,
      searches: {
        total: 0,
        byCategory: {},
        byDate: {},
      },
      features: {
        imagesUsed: 0,
        videosUsed: 0,
        academicUsed: 0,
        redditUsed: 0,
        wolframUsed: 0,
      },
      modelUsage: {
        tier1: 0,
        tier2: 0,
        tier3: 0,
      },
      tokenUsage: {
        totalTokens: 0,
        inputTokens: 0,
        outputTokens: 0,
        byModel: {},
      },
      sessions: {
        totalSessions: 0,
        totalQueries: 0,
        averageQueriesPerSession: 0,
      },
      lastUpdated: Date.now(),
    };
  }

  /**
   * Save analytics data to localStorage (debounced)
   */
  private saveData(): void {
    // Debounce writes to avoid excessive localStorage operations
    if (this.writeTimeout) {
      clearTimeout(this.writeTimeout);
    }

    this.writeTimeout = setTimeout(() => {
      try {
        this.data.lastUpdated = Date.now();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
        this.pendingWrites = false;
      } catch (error) {
        console.error('[Analytics] Failed to save data:', error);
        
        // Handle quota exceeded
        if (error instanceof DOMException && error.name === 'QuotaExceededError') {
          console.warn('[Analytics] Storage quota exceeded, pruning old data');
          this.pruneOldData(30); // Prune to 30 days
          
          // Try again
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
          } catch (retryError) {
            console.error('[Analytics] Failed to save even after pruning:', retryError);
          }
        }
      }
    }, 1000); // 1 second debounce
  }

  /**
   * Track a search query
   */
  trackSearch(query: string, category?: string): void {
    this.data.searches.total++;
    
    // Track by category
    if (category) {
      this.data.searches.byCategory[category] = 
        (this.data.searches.byCategory[category] || 0) + 1;
    }
    
    // Track by date
    const dateKey = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    this.data.searches.byDate[dateKey] = 
      (this.data.searches.byDate[dateKey] || 0) + 1;
    
    this.saveData();
  }

  /**
   * Track feature usage
   */
  trackFeatureUse(feature: 'images' | 'videos' | 'academic' | 'reddit' | 'wolfram'): void {
    const featureKey = `${feature}Used` as keyof typeof this.data.features;
    this.data.features[featureKey]++;
    this.saveData();
  }

  /**
   * Track model tier usage
   */
  trackModelUse(tier: 1 | 2 | 3): void {
    const tierKey = `tier${tier}` as keyof typeof this.data.modelUsage;
    this.data.modelUsage[tierKey]++;
    console.log('[Analytics] Tracked model use:', tier, 'Total:', this.data.modelUsage[tierKey]);
    this.saveData();
  }

  /**
   * Track token usage
   */
  trackTokens(inputTokens: number, outputTokens: number, modelName?: string): void {
    this.data.tokenUsage.inputTokens += inputTokens;
    this.data.tokenUsage.outputTokens += outputTokens;
    this.data.tokenUsage.totalTokens += (inputTokens + outputTokens);
    
    if (modelName) {
      this.data.tokenUsage.byModel[modelName] = 
        (this.data.tokenUsage.byModel[modelName] || 0) + (inputTokens + outputTokens);
    }
    
    this.saveData();
  }

  /**
   * Track session start
   */
  trackSessionStart(): void {
    this.data.sessions.totalSessions++;
    this.saveData();
  }

  /**
   * Track session end and update query count
   */
  trackSessionEnd(queryCount: number): void {
    this.data.sessions.totalQueries += queryCount;
    
    // Recalculate average
    if (this.data.sessions.totalSessions > 0) {
      this.data.sessions.averageQueriesPerSession = 
        this.data.sessions.totalQueries / this.data.sessions.totalSessions;
    }
    
    this.saveData();
  }

  /**
   * Get raw analytics data
   */
  getAnalyticsData(): AnalyticsData {
    return { ...this.data };
  }

  /**
   * Get searches within a date range
   */
  getSearchesByDateRange(startDate: Date, endDate: Date): number {
    let count = 0;
    const start = startDate.toISOString().split('T')[0];
    const end = endDate.toISOString().split('T')[0];
    
    for (const [dateKey, searchCount] of Object.entries(this.data.searches.byDate)) {
      if (dateKey >= start && dateKey <= end) {
        count += searchCount;
      }
    }
    
    return count;
  }

  /**
   * Generate usage insights from analytics data
   */
  getInsights(): UsageInsights {
    // Calculate top categories
    const topCategories = Object.entries(this.data.searches.byCategory)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Calculate most used features
    const featureEntries: Array<{ feature: string; count: number }> = [
      { feature: 'Images', count: this.data.features.imagesUsed },
      { feature: 'Videos', count: this.data.features.videosUsed },
      { feature: 'Academic', count: this.data.features.academicUsed },
      { feature: 'Reddit', count: this.data.features.redditUsed },
      { feature: 'Wolfram Alpha', count: this.data.features.wolframUsed },
    ];
    
    const mostUsedFeatures = featureEntries
      .filter(f => f.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Calculate weekly searches
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weeklySearches = this.getSearchesByDateRange(weekAgo, now);

    // Calculate monthly searches
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const monthlySearches = this.getSearchesByDateRange(monthAgo, now);

    // Calculate estimated cost savings
    // Tier 1 (granite-3.1-2b): $0.001 per query
    // Tier 2 (granite-3.1-8b): $0.005 per query
    // Tier 3 (llama-3.3-70b): $0.02 per query
    // Without frugal routing, everything would use Tier 3
    const tier1Cost = this.data.modelUsage.tier1 * 0.001;
    const tier2Cost = this.data.modelUsage.tier2 * 0.005;
    const tier3Cost = this.data.modelUsage.tier3 * 0.02;
    const actualCost = tier1Cost + tier2Cost + tier3Cost;
    
    const totalQueries = this.data.modelUsage.tier1 + 
                        this.data.modelUsage.tier2 + 
                        this.data.modelUsage.tier3;
    const withoutFrugalCost = totalQueries * 0.02; // All Tier 3
    const estimatedCostSavings = withoutFrugalCost - actualCost;

    // Calculate activity trend
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const lastWeekSearches = this.getSearchesByDateRange(twoWeeksAgo, weekAgo);
    
    let activityTrend: 'increasing' | 'stable' | 'decreasing' = 'stable';
    if (weeklySearches > lastWeekSearches * 1.2) {
      activityTrend = 'increasing';
    } else if (weeklySearches < lastWeekSearches * 0.8) {
      activityTrend = 'decreasing';
    }

    // Calculate token usage
    const totalTokens = this.data.tokenUsage.totalTokens;
    const averageTokensPerQuery = totalQueries > 0 
      ? Math.round(totalTokens / totalQueries) 
      : 0;

    return {
      topCategories,
      mostUsedFeatures,
      weeklySearches,
      monthlySearches,
      totalTokens,
      averageTokensPerQuery,
      estimatedCostSavings,
      activityTrend,
    };
  }

  /**
   * Export analytics data as JSON string
   */
  exportAnalytics(): string {
    return JSON.stringify(this.data, null, 2);
  }

  /**
   * Prune old data entries
   */
  pruneOldData(daysToKeep: number = MAX_DATA_AGE_DAYS): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const cutoffKey = cutoffDate.toISOString().split('T')[0];

    // Remove old date entries
    const newByDate: Record<string, number> = {};
    for (const [dateKey, count] of Object.entries(this.data.searches.byDate)) {
      if (dateKey >= cutoffKey) {
        newByDate[dateKey] = count;
      }
    }
    
    this.data.searches.byDate = newByDate;
    this.saveData();
    
    console.log(`[Analytics] Pruned data older than ${daysToKeep} days`);
  }

  /**
   * Clear all analytics data
   */
  clearAllData(): void {
    this.data = this.getDefaultData();
    localStorage.removeItem(STORAGE_KEY);
    console.log('[Analytics] All analytics data cleared');
  }
}

// Singleton instance
let analyticsTrackerInstance: AnalyticsTracker | null = null;

export function getAnalyticsTracker(): AnalyticsTracker {
  if (typeof window === 'undefined') {
    // Server-side: return a no-op tracker
    return {
      trackSearch: () => {},
      trackFeatureUse: () => {},
      trackModelUse: () => {},
      trackSessionStart: () => {},
      trackSessionEnd: () => {},
      getAnalyticsData: () => ({} as AnalyticsData),
      getSearchesByDateRange: () => 0,
      getInsights: () => ({} as UsageInsights),
      exportAnalytics: () => '{}',
      pruneOldData: () => {},
      clearAllData: () => {},
    } as AnalyticsTracker;
  }

  if (!analyticsTrackerInstance) {
    analyticsTrackerInstance = new AnalyticsTracker();
  }
  
  return analyticsTrackerInstance;
}
