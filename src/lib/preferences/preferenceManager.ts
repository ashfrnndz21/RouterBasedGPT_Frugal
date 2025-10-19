import {
  UserPreferences,
  SearchSession,
  SearchHistoryData,
  PreferencesData,
  STORAGE_KEYS,
  MAX_SEARCH_SESSIONS,
  STORAGE_VERSION,
} from './types';

/**
 * PreferenceManager - Centralized service for managing user preferences and search history
 * Uses browser localStorage for data persistence
 */
class PreferenceManager {
  private static instance: PreferenceManager;

  constructor() {
    this.initializeStorage();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): PreferenceManager {
    if (!PreferenceManager.instance) {
      PreferenceManager.instance = new PreferenceManager();
    }
    return PreferenceManager.instance;
  }

  /**
   * Initialize storage with default values if not exists
   */
  private initializeStorage(): void {
    try {
      if (!this.isLocalStorageAvailable()) {
        console.warn('[PreferenceManager] localStorage not available');
        return;
      }

      // Initialize preferences if not exists
      if (!localStorage.getItem(STORAGE_KEYS.PREFERENCES)) {
        const defaultPreferences: PreferencesData = {
          version: STORAGE_VERSION,
          interests: {
            categories: [],
            allTopicsMode: false,
          },
          searchPreferences: {
            defaultMode: 'all',
            enabledSources: {
              images: true,
              videos: true,
              academic: true,
              reddit: true,
              wolframAlpha: true,
            },
            resultsDensity: 'standard',
          },
        };
        localStorage.setItem(
          STORAGE_KEYS.PREFERENCES,
          JSON.stringify(defaultPreferences)
        );
      }

      // Initialize search history if not exists
      if (!localStorage.getItem(STORAGE_KEYS.SEARCH_HISTORY)) {
        const defaultHistory: SearchHistoryData = {
          version: STORAGE_VERSION,
          sessions: [],
          favorites: [],
        };
        localStorage.setItem(
          STORAGE_KEYS.SEARCH_HISTORY,
          JSON.stringify(defaultHistory)
        );
      }
    } catch (error) {
      console.error('[PreferenceManager] Initialization error:', error);
    }
  }

  /**
   * Check if localStorage is available
   */
  private isLocalStorageAvailable(): boolean {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Safely read from localStorage with validation
   */
  private readFromStorage<T>(key: string, defaultValue: T): T {
    try {
      if (!this.isLocalStorageAvailable()) {
        return defaultValue;
      }

      const item = localStorage.getItem(key);
      if (!item) {
        return defaultValue;
      }

      const parsed = JSON.parse(item);
      
      // Validate version
      if (parsed.version !== STORAGE_VERSION) {
        console.warn(`[PreferenceManager] Version mismatch for ${key}, using defaults`);
        return defaultValue;
      }

      return parsed as T;
    } catch (error) {
      console.error(`[PreferenceManager] Error reading ${key}:`, error);
      return defaultValue;
    }
  }

  /**
   * Safely write to localStorage with error handling
   */
  private writeToStorage<T>(key: string, data: T): boolean {
    try {
      if (!this.isLocalStorageAvailable()) {
        console.warn('[PreferenceManager] localStorage not available');
        throw new Error('localStorage is not available. Please enable cookies and site data.');
      }

      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        console.error('[PreferenceManager] Storage quota exceeded');
        this.handleStorageFull();
        throw new Error('Storage is full. Please clear some data to continue.');
      } else {
        console.error(`[PreferenceManager] Error writing ${key}:`, error);
        throw error;
      }
    }
  }

  /**
   * Handle storage full scenario
   */
  private handleStorageFull(): void {
    console.warn('[PreferenceManager] Storage full, pruning old sessions');
    // Remove oldest 20 sessions
    const history = this.readFromStorage<SearchHistoryData>(
      STORAGE_KEYS.SEARCH_HISTORY,
      { version: STORAGE_VERSION, sessions: [], favorites: [] }
    );
    
    history.sessions = history.sessions
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, MAX_SEARCH_SESSIONS - 20);
    
    this.writeToStorage(STORAGE_KEYS.SEARCH_HISTORY, history);
  }

  // ==================== Interest Management ====================

  /**
   * Get user's selected interest categories
   */
  public getInterests(): string[] {
    const prefs = this.readFromStorage<PreferencesData>(
      STORAGE_KEYS.PREFERENCES,
      {
        version: STORAGE_VERSION,
        interests: { categories: [], allTopicsMode: false },
        searchPreferences: {
          defaultMode: 'all',
          enabledSources: {
            images: true,
            videos: true,
            academic: true,
            reddit: true,
            wolframAlpha: true,
          },
          resultsDensity: 'standard',
        },
      }
    );
    return prefs.interests.categories;
  }

  /**
   * Get custom topics (user-defined news themes)
   */
  public getCustomTopics(): Array<{ id: string; name: string; keywords: string[] }> {
    const prefs = this.readFromStorage<PreferencesData>(
      STORAGE_KEYS.PREFERENCES,
      {
        version: STORAGE_VERSION,
        interests: { categories: [], allTopicsMode: false },
        searchPreferences: {
          defaultMode: 'all',
          enabledSources: {
            images: true,
            videos: true,
            academic: true,
            reddit: true,
            wolframAlpha: true,
          },
          resultsDensity: 'standard',
        },
      }
    );
    return (prefs.interests as any).customTopics || [];
  }

  /**
   * Add a custom topic (max 2 allowed)
   */
  public addCustomTopic(name: string, keywords: string[]): boolean {
    const prefs = this.readFromStorage<PreferencesData>(
      STORAGE_KEYS.PREFERENCES,
      {
        version: STORAGE_VERSION,
        interests: { categories: [], allTopicsMode: false },
        searchPreferences: {
          defaultMode: 'all',
          enabledSources: {
            images: true,
            videos: true,
            academic: true,
            reddit: true,
            wolframAlpha: true,
          },
          resultsDensity: 'standard',
        },
      }
    );
    
    const customTopics = (prefs.interests as any).customTopics || [];
    
    // Limit to 2 custom topics
    if (customTopics.length >= 2) {
      return false;
    }
    
    const id = `custom_${Date.now()}`;
    customTopics.push({ id, name, keywords });
    (prefs.interests as any).customTopics = customTopics;
    
    this.writeToStorage(STORAGE_KEYS.PREFERENCES, prefs);
    return true;
  }

  /**
   * Remove a custom topic
   */
  public removeCustomTopic(id: string): void {
    const prefs = this.readFromStorage<PreferencesData>(
      STORAGE_KEYS.PREFERENCES,
      {
        version: STORAGE_VERSION,
        interests: { categories: [], allTopicsMode: false },
        searchPreferences: {
          defaultMode: 'all',
          enabledSources: {
            images: true,
            videos: true,
            academic: true,
            reddit: true,
            wolframAlpha: true,
          },
          resultsDensity: 'standard',
        },
      }
    );
    
    const customTopics = (prefs.interests as any).customTopics || [];
    (prefs.interests as any).customTopics = customTopics.filter((t: any) => t.id !== id);
    
    this.writeToStorage(STORAGE_KEYS.PREFERENCES, prefs);
  }

  /**
   * Set user's interest categories
   */
  public setInterests(categories: string[]): void {
    const prefs = this.readFromStorage<PreferencesData>(
      STORAGE_KEYS.PREFERENCES,
      {
        version: STORAGE_VERSION,
        interests: { categories: [], allTopicsMode: false },
        searchPreferences: {
          defaultMode: 'all',
          enabledSources: {
            images: true,
            videos: true,
            academic: true,
            reddit: true,
            wolframAlpha: true,
          },
          resultsDensity: 'standard',
        },
      }
    );
    prefs.interests.categories = categories;
    this.writeToStorage(STORAGE_KEYS.PREFERENCES, prefs);
  }

  /**
   * Check if "All Topics" mode is enabled
   */
  public isAllTopicsMode(): boolean {
    const prefs = this.readFromStorage<PreferencesData>(
      STORAGE_KEYS.PREFERENCES,
      {
        version: STORAGE_VERSION,
        interests: { categories: [], allTopicsMode: false },
        searchPreferences: {
          defaultMode: 'all',
          enabledSources: {
            images: true,
            videos: true,
            academic: true,
            reddit: true,
            wolframAlpha: true,
          },
          resultsDensity: 'standard',
        },
      }
    );
    return prefs.interests.allTopicsMode;
  }

  /**
   * Set "All Topics" mode
   */
  public setAllTopicsMode(enabled: boolean): void {
    const prefs = this.readFromStorage<PreferencesData>(
      STORAGE_KEYS.PREFERENCES,
      {
        version: STORAGE_VERSION,
        interests: { categories: [], allTopicsMode: false },
        searchPreferences: {
          defaultMode: 'all',
          enabledSources: {
            images: true,
            videos: true,
            academic: true,
            reddit: true,
            wolframAlpha: true,
          },
          resultsDensity: 'standard',
        },
      }
    );
    prefs.interests.allTopicsMode = enabled;
    this.writeToStorage(STORAGE_KEYS.PREFERENCES, prefs);
  }

  // ==================== Search History ====================

  /**
   * Get search history with optional limit
   */
  public getSearchHistory(limit?: number): SearchSession[] {
    const history = this.readFromStorage<SearchHistoryData>(
      STORAGE_KEYS.SEARCH_HISTORY,
      { version: STORAGE_VERSION, sessions: [], favorites: [] }
    );
    
    const sorted = history.sessions.sort((a, b) => b.timestamp - a.timestamp);
    return limit ? sorted.slice(0, limit) : sorted;
  }

  /**
   * Save a search session
   */
  public saveSearchSession(session: SearchSession): void {
    const history = this.readFromStorage<SearchHistoryData>(
      STORAGE_KEYS.SEARCH_HISTORY,
      { version: STORAGE_VERSION, sessions: [], favorites: [] }
    );

    // Check if session already exists (update)
    const existingIndex = history.sessions.findIndex(s => s.id === session.id);
    if (existingIndex >= 0) {
      history.sessions[existingIndex] = session;
    } else {
      // Add new session
      history.sessions.push(session);
      
      // Enforce max sessions limit
      if (history.sessions.length > MAX_SEARCH_SESSIONS) {
        // Remove oldest non-favorite sessions
        history.sessions = history.sessions
          .sort((a, b) => {
            // Keep favorites
            if (a.isFavorite && !b.isFavorite) return -1;
            if (!a.isFavorite && b.isFavorite) return 1;
            // Sort by timestamp
            return b.timestamp - a.timestamp;
          })
          .slice(0, MAX_SEARCH_SESSIONS);
      }
    }

    this.writeToStorage(STORAGE_KEYS.SEARCH_HISTORY, history);
  }

  /**
   * Get a specific search session by ID
   */
  public getSearchSession(id: string): SearchSession | null {
    const history = this.readFromStorage<SearchHistoryData>(
      STORAGE_KEYS.SEARCH_HISTORY,
      { version: STORAGE_VERSION, sessions: [], favorites: [] }
    );
    return history.sessions.find(s => s.id === id) || null;
  }

  /**
   * Delete a search session
   */
  public deleteSearchSession(id: string): void {
    const history = this.readFromStorage<SearchHistoryData>(
      STORAGE_KEYS.SEARCH_HISTORY,
      { version: STORAGE_VERSION, sessions: [], favorites: [] }
    );
    
    history.sessions = history.sessions.filter(s => s.id !== id);
    history.favorites = history.favorites.filter(fid => fid !== id);
    
    this.writeToStorage(STORAGE_KEYS.SEARCH_HISTORY, history);
  }

  /**
   * Clear all search history
   */
  public clearSearchHistory(): void {
    const history: SearchHistoryData = {
      version: STORAGE_VERSION,
      sessions: [],
      favorites: [],
    };
    this.writeToStorage(STORAGE_KEYS.SEARCH_HISTORY, history);
  }

  /**
   * Search history by query string
   */
  public searchHistory(query: string): SearchSession[] {
    const history = this.readFromStorage<SearchHistoryData>(
      STORAGE_KEYS.SEARCH_HISTORY,
      { version: STORAGE_VERSION, sessions: [], favorites: [] }
    );
    
    const lowerQuery = query.toLowerCase();
    return history.sessions.filter(session => 
      session.title.toLowerCase().includes(lowerQuery) ||
      session.messages.some(msg => 
        msg.content?.toLowerCase().includes(lowerQuery)
      )
    );
  }

  // ==================== Favorites ====================

  /**
   * Get favorite sessions
   */
  public getFavorites(): SearchSession[] {
    const history = this.readFromStorage<SearchHistoryData>(
      STORAGE_KEYS.SEARCH_HISTORY,
      { version: STORAGE_VERSION, sessions: [], favorites: [] }
    );
    
    return history.sessions
      .filter(s => s.isFavorite)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Toggle favorite status of a session
   */
  public toggleFavorite(sessionId: string): void {
    const history = this.readFromStorage<SearchHistoryData>(
      STORAGE_KEYS.SEARCH_HISTORY,
      { version: STORAGE_VERSION, sessions: [], favorites: [] }
    );
    
    const session = history.sessions.find(s => s.id === sessionId);
    if (session) {
      session.isFavorite = !session.isFavorite;
      
      // Update favorites list
      if (session.isFavorite) {
        if (!history.favorites.includes(sessionId)) {
          history.favorites.push(sessionId);
        }
      } else {
        history.favorites = history.favorites.filter(id => id !== sessionId);
      }
      
      this.writeToStorage(STORAGE_KEYS.SEARCH_HISTORY, history);
    }
  }

  /**
   * Check if a session is favorited
   */
  public isFavorite(sessionId: string): boolean {
    const history = this.readFromStorage<SearchHistoryData>(
      STORAGE_KEYS.SEARCH_HISTORY,
      { version: STORAGE_VERSION, sessions: [], favorites: [] }
    );
    return history.favorites.includes(sessionId);
  }

  // ==================== Search Preferences ====================

  /**
   * Get search preferences
   */
  public getSearchPreferences() {
    const prefs = this.readFromStorage<PreferencesData>(
      STORAGE_KEYS.PREFERENCES,
      {
        version: STORAGE_VERSION,
        interests: { categories: [], allTopicsMode: false },
        searchPreferences: {
          defaultMode: 'all',
          enabledSources: {
            images: true,
            videos: true,
            academic: true,
            reddit: true,
            wolframAlpha: true,
          },
          resultsDensity: 'standard',
        },
      }
    );
    return prefs.searchPreferences;
  }

  /**
   * Set default search mode
   */
  public setDefaultSearchMode(mode: 'all' | 'academic' | 'writing' | 'youtube' | 'reddit' | 'wolfram'): void {
    const prefs = this.readFromStorage<PreferencesData>(
      STORAGE_KEYS.PREFERENCES,
      {
        version: STORAGE_VERSION,
        interests: { categories: [], allTopicsMode: false },
        searchPreferences: {
          defaultMode: 'all',
          enabledSources: {
            images: true,
            videos: true,
            academic: true,
            reddit: true,
            wolframAlpha: true,
          },
          resultsDensity: 'standard',
        },
      }
    );
    prefs.searchPreferences.defaultMode = mode;
    this.writeToStorage(STORAGE_KEYS.PREFERENCES, prefs);
  }

  /**
   * Toggle a search source on/off
   */
  public toggleSearchSource(source: keyof UserPreferences['searchPreferences']['enabledSources'], enabled: boolean): void {
    const prefs = this.readFromStorage<PreferencesData>(
      STORAGE_KEYS.PREFERENCES,
      {
        version: STORAGE_VERSION,
        interests: { categories: [], allTopicsMode: false },
        searchPreferences: {
          defaultMode: 'all',
          enabledSources: {
            images: true,
            videos: true,
            academic: true,
            reddit: true,
            wolframAlpha: true,
          },
          resultsDensity: 'standard',
        },
      }
    );
    prefs.searchPreferences.enabledSources[source] = enabled;
    this.writeToStorage(STORAGE_KEYS.PREFERENCES, prefs);
  }

  /**
   * Set results density
   */
  public setResultsDensity(density: 'compact' | 'standard' | 'detailed'): void {
    const prefs = this.readFromStorage<PreferencesData>(
      STORAGE_KEYS.PREFERENCES,
      {
        version: STORAGE_VERSION,
        interests: { categories: [], allTopicsMode: false },
        searchPreferences: {
          defaultMode: 'all',
          enabledSources: {
            images: true,
            videos: true,
            academic: true,
            reddit: true,
            wolframAlpha: true,
          },
          resultsDensity: 'standard',
        },
      }
    );
    prefs.searchPreferences.resultsDensity = density;
    this.writeToStorage(STORAGE_KEYS.PREFERENCES, prefs);
  }

  /**
   * Get result count based on density setting
   */
  public getResultCount(): number {
    const density = this.getSearchPreferences().resultsDensity;
    switch (density) {
      case 'compact':
        return 5;
      case 'detailed':
        return 15;
      case 'standard':
      default:
        return 10;
    }
  }

  // ==================== Utility ====================

  /**
   * Get all preferences as a single object
   */
  public getAllPreferences(): UserPreferences {
    const prefs = this.readFromStorage<PreferencesData>(
      STORAGE_KEYS.PREFERENCES,
      {
        version: STORAGE_VERSION,
        interests: { categories: [], allTopicsMode: false },
        searchPreferences: {
          defaultMode: 'all',
          enabledSources: {
            images: true,
            videos: true,
            academic: true,
            reddit: true,
            wolframAlpha: true,
          },
          resultsDensity: 'standard',
        },
      }
    );
    const history = this.readFromStorage<SearchHistoryData>(
      STORAGE_KEYS.SEARCH_HISTORY,
      { version: STORAGE_VERSION, sessions: [], favorites: [] }
    );

    return {
      interests: prefs.interests,
      searchHistory: history.sessions,
      favorites: history.favorites,
      searchPreferences: prefs.searchPreferences,
    };
  }

  /**
   * Export all preferences as JSON string
   */
  public exportPreferences(): string {
    const prefs = this.readFromStorage<PreferencesData>(
      STORAGE_KEYS.PREFERENCES,
      {
        version: STORAGE_VERSION,
        interests: { categories: [], allTopicsMode: false },
        searchPreferences: {
          defaultMode: 'all',
          enabledSources: {
            images: true,
            videos: true,
            academic: true,
            reddit: true,
            wolframAlpha: true,
          },
          resultsDensity: 'standard',
        },
      }
    );
    const history = this.readFromStorage<SearchHistoryData>(
      STORAGE_KEYS.SEARCH_HISTORY,
      { version: STORAGE_VERSION, sessions: [], favorites: [] }
    );

    return JSON.stringify({
      preferences: prefs,
      history: history,
      exportedAt: new Date().toISOString(),
    }, null, 2);
  }

  /**
   * Import preferences from JSON string
   */
  public importPreferences(data: string): boolean {
    try {
      const parsed = JSON.parse(data);
      
      // Validate structure
      if (!parsed.preferences || !parsed.history) {
        throw new Error('Invalid data structure');
      }

      // Import preferences
      if (parsed.preferences.version === STORAGE_VERSION) {
        this.writeToStorage(STORAGE_KEYS.PREFERENCES, parsed.preferences);
      }

      // Import history
      if (parsed.history.version === STORAGE_VERSION) {
        this.writeToStorage(STORAGE_KEYS.SEARCH_HISTORY, parsed.history);
      }

      return true;
    } catch (error) {
      console.error('[PreferenceManager] Import error:', error);
      return false;
    }
  }

  /**
   * Clear all stored data
   */
  public clearAllData(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.PREFERENCES);
      localStorage.removeItem(STORAGE_KEYS.SEARCH_HISTORY);
      localStorage.removeItem(STORAGE_KEYS.ANALYTICS);
      
      // Reinitialize with defaults
      this.initializeStorage();
    } catch (error) {
      console.error('[PreferenceManager] Clear data error:', error);
    }
  }

  /**
   * Get storage usage information
   */
  public getStorageInfo(): { used: number; total: number; percentage: number } {
    try {
      let used = 0;
      for (const key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          used += localStorage[key].length + key.length;
        }
      }

      // Most browsers have 5-10MB limit, we'll use 5MB as conservative estimate
      const total = 5 * 1024 * 1024; // 5MB in bytes
      const percentage = (used / total) * 100;

      return { used, total, percentage };
    } catch (error) {
      console.error('[PreferenceManager] Storage info error:', error);
      return { used: 0, total: 0, percentage: 0 };
    }
  }
}

// Export singleton instance
export const preferenceManager = PreferenceManager.getInstance();
export { PreferenceManager };
export default preferenceManager;
