'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { PreferenceManager } from '@/lib/preferences/preferenceManager';
import { AnalyticsTracker } from '@/lib/analytics/analyticsTracker';
import type { UserPreferences, SearchSession } from '@/lib/preferences/types';
import type { AnalyticsData, UsageInsights } from '@/lib/analytics/analyticsTracker';

interface PreferencesContextValue {
  preferences: UserPreferences;
  analytics: AnalyticsData;
  insights: UsageInsights;
  error: string | null;
  
  // Preference actions
  updateInterests: (categories: string[]) => void;
  setAllTopicsMode: (enabled: boolean) => void;
  updateSearchPreferences: (prefs: Partial<UserPreferences['searchPreferences']>) => void;
  
  // History actions
  saveSearchSession: (session: SearchSession) => void;
  getSearchHistory: (limit?: number) => SearchSession[];
  deleteSearchSession: (id: string) => void;
  clearSearchHistory: () => void;
  toggleFavorite: (sessionId: string) => void;
  
  // Data management
  exportPreferences: () => string;
  importPreferences: (data: string) => void;
  clearAllData: () => void;
  
  // Analytics
  trackSearch: (query: string, category?: string) => void;
  trackFeatureUse: (feature: 'images' | 'videos' | 'academic' | 'reddit' | 'wolfram') => void;
  trackModelUse: (tier: 1 | 2 | 3) => void;
  exportAnalytics: () => string;
  
  // Utility
  refresh: () => void;
}

const PreferencesContext = createContext<PreferencesContextValue | undefined>(undefined);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [preferenceManager] = useState(() => new PreferenceManager());
  const [analyticsTracker] = useState(() => new AnalyticsTracker());
  const [preferences, setPreferences] = useState<UserPreferences>(() => 
    preferenceManager.getAllPreferences()
  );
  const [analytics, setAnalytics] = useState<AnalyticsData>(() => 
    analyticsTracker.getAnalyticsData()
  );
  const [insights, setInsights] = useState<UsageInsights>(() => 
    analyticsTracker.getInsights()
  );
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    try {
      setPreferences(preferenceManager.getAllPreferences());
      setAnalytics(analyticsTracker.getAnalyticsData());
      setInsights(analyticsTracker.getInsights());
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load preferences';
      setError(message);
      console.error('[PreferencesContext] Refresh error:', err);
    }
  }, [preferenceManager, analyticsTracker]);

  // Interest management
  const updateInterests = useCallback((categories: string[]) => {
    try {
      preferenceManager.setInterests(categories);
      refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update interests';
      setError(message);
      throw err;
    }
  }, [preferenceManager, refresh]);

  const setAllTopicsMode = useCallback((enabled: boolean) => {
    try {
      preferenceManager.setAllTopicsMode(enabled);
      refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update all topics mode';
      setError(message);
      throw err;
    }
  }, [preferenceManager, refresh]);

  // Search preferences
  const updateSearchPreferences = useCallback((prefs: Partial<UserPreferences['searchPreferences']>) => {
    if (prefs.defaultMode !== undefined) {
      preferenceManager.setDefaultSearchMode(prefs.defaultMode);
    }
    if (prefs.enabledSources !== undefined) {
      // Update each source individually
      if (prefs.enabledSources.images !== undefined) {
        preferenceManager.toggleSearchSource('images', prefs.enabledSources.images);
      }
      if (prefs.enabledSources.videos !== undefined) {
        preferenceManager.toggleSearchSource('videos', prefs.enabledSources.videos);
      }
      if (prefs.enabledSources.academic !== undefined) {
        preferenceManager.toggleSearchSource('academic', prefs.enabledSources.academic);
      }
      if (prefs.enabledSources.reddit !== undefined) {
        preferenceManager.toggleSearchSource('reddit', prefs.enabledSources.reddit);
      }
      if (prefs.enabledSources.wolframAlpha !== undefined) {
        preferenceManager.toggleSearchSource('wolframAlpha', prefs.enabledSources.wolframAlpha);
      }
    }
    if (prefs.resultsDensity !== undefined) {
      preferenceManager.setResultsDensity(prefs.resultsDensity);
    }
    refresh();
  }, [preferenceManager, refresh]);

  // History management
  const saveSearchSession = useCallback((session: SearchSession) => {
    try {
      preferenceManager.saveSearchSession(session);
      refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save search session';
      setError(message);
      throw err;
    }
  }, [preferenceManager, refresh]);

  const getSearchHistory = useCallback((limit?: number) => {
    try {
      return preferenceManager.getSearchHistory(limit);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get search history';
      setError(message);
      return [];
    }
  }, [preferenceManager]);

  const deleteSearchSession = useCallback((id: string) => {
    try {
      preferenceManager.deleteSearchSession(id);
      refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete search session';
      setError(message);
      throw err;
    }
  }, [preferenceManager, refresh]);

  const clearSearchHistory = useCallback(() => {
    try {
      preferenceManager.clearSearchHistory();
      refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to clear search history';
      setError(message);
      throw err;
    }
  }, [preferenceManager, refresh]);

  const toggleFavorite = useCallback((sessionId: string) => {
    try {
      preferenceManager.toggleFavorite(sessionId);
      refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to toggle favorite';
      setError(message);
      throw err;
    }
  }, [preferenceManager, refresh]);

  // Data management
  const exportPreferences = useCallback(() => {
    return preferenceManager.exportPreferences();
  }, [preferenceManager]);

  const importPreferences = useCallback((data: string) => {
    preferenceManager.importPreferences(data);
    refresh();
  }, [preferenceManager, refresh]);

  const clearAllData = useCallback(() => {
    preferenceManager.clearAllData();
    analyticsTracker.pruneOldData(0); // Clear all analytics
    refresh();
  }, [preferenceManager, analyticsTracker, refresh]);

  // Analytics tracking
  const trackSearch = useCallback((query: string, category?: string) => {
    try {
      analyticsTracker.trackSearch(query, category);
      refresh();
    } catch (err) {
      // Don't throw for analytics errors, just log
      console.error('[PreferencesContext] Failed to track search:', err);
    }
  }, [analyticsTracker, refresh]);

  const trackFeatureUse = useCallback((feature: 'images' | 'videos' | 'academic' | 'reddit' | 'wolfram') => {
    try {
      analyticsTracker.trackFeatureUse(feature);
      refresh();
    } catch (err) {
      // Don't throw for analytics errors, just log
      console.error('[PreferencesContext] Failed to track feature use:', err);
    }
  }, [analyticsTracker, refresh]);

  const trackModelUse = useCallback((tier: 1 | 2 | 3) => {
    try {
      analyticsTracker.trackModelUse(tier);
      refresh();
    } catch (err) {
      // Don't throw for analytics errors, just log
      console.error('[PreferencesContext] Failed to track model use:', err);
    }
  }, [analyticsTracker, refresh]);

  const exportAnalytics = useCallback(() => {
    return analyticsTracker.exportAnalytics();
  }, [analyticsTracker]);

  const value: PreferencesContextValue = {
    preferences,
    analytics,
    insights,
    error,
    updateInterests,
    setAllTopicsMode,
    updateSearchPreferences,
    saveSearchSession,
    getSearchHistory,
    deleteSearchSession,
    clearSearchHistory,
    toggleFavorite,
    exportPreferences,
    importPreferences,
    clearAllData,
    trackSearch,
    trackFeatureUse,
    trackModelUse,
    exportAnalytics,
    refresh,
  };

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (context === undefined) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
}

export function useAnalytics() {
  const context = useContext(PreferencesContext);
  if (context === undefined) {
    throw new Error('useAnalytics must be used within a PreferencesProvider');
  }
  return {
    analytics: context.analytics,
    insights: context.insights,
    trackSearch: context.trackSearch,
    trackFeatureUse: context.trackFeatureUse,
    trackModelUse: context.trackModelUse,
    exportAnalytics: context.exportAnalytics,
  };
}
