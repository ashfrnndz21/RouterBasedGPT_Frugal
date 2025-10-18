# Implementation Plan

- [x] 1. Create core preference management infrastructure
  - Create PreferenceManager service with localStorage integration
  - Implement data models and TypeScript interfaces for UserPreferences, SearchSession
  - Add data validation and error handling for localStorage operations
  - Implement storage size management and automatic pruning
  - _Requirements: 1.3, 2.1, 3.7_

- [x] 2. Implement interest categories system
  - [x] 2.1 Create interest categories configuration
    - Define INTEREST_CATEGORIES constant with all 8 categories
    - Include category metadata (id, name, icon, keywords, color)
    - Export utility functions for category lookups
    - _Requirements: 1.2_

  - [x] 2.2 Build InterestSelector modal component
    - Create modal UI with category grid layout
    - Implement multi-select functionality with visual feedback
    - Add "All Topics" toggle option
    - Wire up save/cancel actions to PreferenceManager
    - Add onboarding detection (show modal if no interests set)
    - _Requirements: 1.1, 1.3, 1.5_

  - [x] 2.3 Integrate interests into Discovery page
    - Modify Discovery page to check user interests on load
    - Show InterestSelector modal for first-time users
    - Display active interest filter chips
    - Add "All Topics" mode toggle
    - Update API calls to include category filters
    - _Requirements: 1.4, 1.6, 1.7_

  - [x] 2.4 Update Discovery API for category filtering
    - Modify `/api/discover` route to accept categories parameter
    - Build search queries using category keywords
    - Filter and return category-specific results
    - Handle "All Topics" mode
    - _Requirements: 1.4_

- [x] 3. Implement search history and favorites
  - [x] 3.1 Add automatic session saving to chat
    - Hook into chat message flow to detect new sessions
    - Generate session IDs and titles automatically
    - Save complete conversation threads to PreferenceManager
    - Implement session update on new messages
    - Limit storage to 100 most recent sessions
    - _Requirements: 2.1, 2.8_

  - [x] 3.2 Build HistorySidebar component
    - Create collapsible sidebar UI
    - Display recent search sessions in chronological order
    - Implement session click to restore conversation
    - Add search/filter functionality for sessions
    - Show session metadata (timestamp, category, favorite status)
    - _Requirements: 2.2, 2.3, 2.6_

  - [x] 3.3 Implement favorites functionality
    - Add bookmark toggle button to each session
    - Implement toggleFavorite in PreferenceManager
    - Create dedicated favorites view/filter
    - Persist favorite status to localStorage
    - _Requirements: 2.4, 2.5_

  - [x] 3.4 Add history management actions
    - Implement delete individual session
    - Add clear all history action with confirmation
    - Show storage usage indicator
    - Handle edge cases (empty history, storage full)
    - _Requirements: 2.7_

- [x] 4. Implement search preferences
  - [x] 4.1 Create PreferencesPanel component
    - Build settings page UI at `/settings`
    - Create tabbed interface for different preference sections
    - Add navigation to settings from main menu
    - _Requirements: 3.1_

  - [x] 4.2 Implement default search mode preference
    - Add dropdown for selecting default mode (all, academic, writing, etc.)
    - Save selection to PreferenceManager
    - Apply default mode when starting new chats
    - _Requirements: 3.2_

  - [x] 4.3 Implement search source toggles
    - Create toggle switches for each source (images, videos, academic, reddit, wolfram)
    - Save enabled/disabled state to PreferenceManager
    - Hide disabled source buttons in chat interface
    - _Requirements: 3.3, 3.4_

  - [x] 4.4 Implement results density preference
    - Add radio buttons or dropdown for density (compact, standard, detailed)
    - Map density to result count (compact: 5, standard: 10, detailed: 15)
    - Apply density setting to all search API calls
    - _Requirements: 3.5, 3.6_

- [x] 5. Implement analytics tracking system
  - [x] 5.1 Create AnalyticsTracker service
    - Implement event tracking methods (trackSearch, trackFeatureUse, trackModelUse)
    - Build data aggregation logic for metrics
    - Implement localStorage persistence for analytics data
    - Add automatic data pruning for entries older than 90 days
    - _Requirements: 4.2, 4.9_

  - [x] 5.2 Integrate analytics tracking into application
    - Add trackSearch calls to chat search flow
    - Track feature usage (images, videos, academic, etc.) on button clicks
    - Track model tier usage in orchestration service
    - Track session start/end events
    - _Requirements: 4.2, 4.10_

  - [x] 5.3 Implement analytics insights calculations
    - Calculate top categories from search data
    - Calculate most used features
    - Compute weekly and monthly search counts
    - Calculate estimated cost savings based on model tier usage
    - Determine activity trends (increasing, stable, decreasing)
    - _Requirements: 4.3, 4.4, 4.5, 4.6, 4.7_

- [x] 6. Build analytics dashboard
  - [x] 6.1 Create AnalyticsDashboard page component
    - Create new route at `/analytics`
    - Build dashboard layout with summary cards
    - Add navigation link to analytics from main menu
    - _Requirements: 4.1_

  - [x] 6.2 Implement metrics display cards
    - Display total searches (week and month)
    - Show top categories with counts
    - Display most used features
    - Show estimated cost savings
    - Display activity trend indicator
    - _Requirements: 4.3, 4.4, 4.5, 4.6, 4.7_

  - [x] 6.3 Add analytics visualizations
    - Install and configure recharts library
    - Create line chart for search activity over time
    - Create bar chart for category distribution
    - Create pie chart for feature usage
    - Make charts responsive and themed
    - _Requirements: 4.7_

  - [x] 6.4 Implement analytics export
    - Add export button to dashboard
    - Generate JSON export of analytics data
    - Trigger browser download of export file
    - Include timestamp in export filename
    - _Requirements: 4.8_

- [x] 7. Add data management features
  - [x] 7.1 Implement export/import preferences
    - Add export button in settings to download all preferences as JSON
    - Add import button to upload and restore preferences
    - Validate imported data structure
    - Show success/error notifications
    - _Requirements: 2.7, 3.7_

  - [x] 7.2 Implement clear data functionality
    - Add "Clear All Data" button in settings
    - Show confirmation dialog before clearing
    - Clear all localStorage keys (preferences, history, analytics)
    - Reset to default state after clearing
    - Show success notification
    - _Requirements: 2.7_

  - [x] 7.3 Add storage usage indicator
    - Calculate current localStorage usage
    - Display storage usage in settings
    - Show warning when approaching limits (>80% full)
    - Suggest data cleanup actions when near limit
    - _Requirements: 2.8_

- [ ] 8. Polish and integration
  - [x] 8.1 Add React Context for preferences
    - Create PreferencesContext for global state
    - Wrap app with PreferencesProvider
    - Provide hooks for accessing preferences (usePreferences, useAnalytics)
    - Implement automatic re-renders on preference changes
    - _Requirements: All_

  - [x] 8.2 Implement responsive design
    - Ensure all new components work on mobile
    - Make history sidebar collapsible on small screens
    - Optimize analytics dashboard for mobile viewing
    - Test on various screen sizes
    - _Requirements: All_

  - [x] 8.3 Add loading states and error handling
    - Show loading spinners during data operations
    - Display error messages for localStorage failures
    - Handle storage quota exceeded gracefully
    - Add retry logic for failed operations
    - _Requirements: All_

  - [x] 8.4 Implement notifications and feedback
    - Add toast notifications for user actions (saved, deleted, exported)
    - Show confirmation dialogs for destructive actions
    - Display success messages for completed operations
    - Add helpful tooltips and hints
    - _Requirements: All_

- [ ] 9. Testing and validation
  - [ ] 9.1 Test first-time user experience
    - Verify interest selector shows on first visit
    - Test onboarding flow completion
    - Verify preferences persist after reload
    - Test default state behavior
    - _Requirements: 1.1_

  - [ ] 9.2 Test search history functionality
    - Create multiple search sessions
    - Verify sessions are saved automatically
    - Test session restoration
    - Test favorites toggle
    - Test search/filter functionality
    - Test delete and clear actions
    - _Requirements: 2.1-2.8_

  - [ ] 9.3 Test preferences application
    - Set various preferences and verify they apply
    - Test default search mode selection
    - Test source toggles hide/show buttons
    - Test results density affects result counts
    - _Requirements: 3.1-3.6_

  - [ ] 9.4 Test analytics tracking and display
    - Perform various searches and feature uses
    - Verify analytics data updates in real-time
    - Check dashboard displays accurate metrics
    - Test export functionality
    - Verify data pruning after 90 days
    - _Requirements: 4.1-4.10_

  - [ ] 9.5 Test edge cases and error scenarios
    - Test with localStorage disabled
    - Test storage quota exceeded
    - Test with corrupted data
    - Test concurrent tab behavior
    - Test data migration scenarios
    - _Requirements: All_
