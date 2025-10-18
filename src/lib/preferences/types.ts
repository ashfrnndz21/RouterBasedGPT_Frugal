// Type definitions for user preferences and search sessions

export interface UserPreferences {
  interests: {
    categories: string[];
    allTopicsMode: boolean;
  };
  searchHistory: SearchSession[];
  favorites: string[];
  searchPreferences: {
    defaultMode: 'all' | 'academic' | 'writing' | 'youtube' | 'reddit' | 'wolfram';
    enabledSources: {
      images: boolean;
      videos: boolean;
      academic: boolean;
      reddit: boolean;
      wolframAlpha: boolean;
    };
    resultsDensity: 'compact' | 'standard' | 'detailed';
  };
}

export interface SearchSession {
  id: string;
  title: string;
  timestamp: number;
  messages: any[]; // Message type from chat
  category?: string;
  isFavorite: boolean;
}

export interface SearchHistoryData {
  version: string;
  sessions: SearchSession[];
  favorites: string[];
}

export interface PreferencesData {
  version: string;
  interests: {
    categories: string[];
    allTopicsMode: boolean;
  };
  searchPreferences: {
    defaultMode: 'all' | 'academic' | 'writing' | 'youtube' | 'reddit' | 'wolfram';
    enabledSources: {
      images: boolean;
      videos: boolean;
      academic: boolean;
      reddit: boolean;
      wolframAlpha: boolean;
    };
    resultsDensity: 'compact' | 'standard' | 'detailed';
  };
}

// Storage keys
export const STORAGE_KEYS = {
  PREFERENCES: 'truegpt_preferences',
  SEARCH_HISTORY: 'truegpt_search_history',
  ANALYTICS: 'truegpt_analytics',
} as const;

// Constants
export const MAX_SEARCH_SESSIONS = 100;
export const STORAGE_VERSION = '1.0';
