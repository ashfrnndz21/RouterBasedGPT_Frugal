'use client';

import { useState, useEffect } from 'react';
import { X, Search, Clock, Star, Trash2, History as HistoryIcon, AlertCircle, Database } from 'lucide-react';
import { cn } from '@/lib/utils';
import { preferenceManager } from '@/lib/preferences';
import type { SearchSession } from '@/lib/preferences/types';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface HistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentChatId?: string;
}

export default function HistorySidebar({
  isOpen,
  onClose,
  currentChatId,
}: HistorySidebarProps) {
  const router = useRouter();
  const [sessions, setSessions] = useState<SearchSession[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<SearchSession[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'favorites'>('all');
  const [storageInfo, setStorageInfo] = useState({ used: 0, total: 0, percentage: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; title: string } | null>(null);
  const [clearConfirm, setClearConfirm] = useState(false);

  // Load sessions and storage info
  useEffect(() => {
    if (isOpen) {
      loadSessions();
      updateStorageInfo();
    }
  }, [isOpen]);

  // Filter sessions based on search query and filter mode
  useEffect(() => {
    let filtered = sessions;

    // Apply favorites filter
    if (filterMode === 'favorites') {
      filtered = filtered.filter(s => s.isFavorite);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = preferenceManager.searchHistory(searchQuery);
      if (filterMode === 'favorites') {
        filtered = filtered.filter(s => s.isFavorite);
      }
    }

    setFilteredSessions(filtered);
  }, [sessions, searchQuery, filterMode]);

  const loadSessions = () => {
    try {
      setIsLoading(true);
      setError(null);
      const allSessions = preferenceManager.getSearchHistory();
      setSessions(allSessions);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load sessions';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const updateStorageInfo = () => {
    try {
      const info = preferenceManager.getStorageInfo();
      setStorageInfo(info);
    } catch (err) {
      console.error('Failed to get storage info:', err);
    }
  };

  const handleSessionClick = (sessionId: string) => {
    if (sessionId === currentChatId) {
      onClose();
      return;
    }
    router.push(`/c/${sessionId}`);
    onClose();
  };

  const handleToggleFavorite = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    preferenceManager.toggleFavorite(sessionId);
    loadSessions();
    toast.success(
      preferenceManager.isFavorite(sessionId) 
        ? 'Added to favorites' 
        : 'Removed from favorites'
    );
  };

  const handleDeleteSession = (sessionId: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirm({ id: sessionId, title });
  };

  const confirmDeleteSession = () => {
    if (!deleteConfirm) return;
    
    try {
      preferenceManager.deleteSearchSession(deleteConfirm.id);
      loadSessions();
      updateStorageInfo();
      toast.success('Conversation deleted');
      
      // If deleting current chat, redirect to home
      if (deleteConfirm.id === currentChatId) {
        router.push('/');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete conversation';
      toast.error(message);
    } finally {
      setDeleteConfirm(null);
    }
  };

  const handleClearAllHistory = () => {
    setClearConfirm(true);
  };

  const confirmClearAllHistory = () => {
    try {
      preferenceManager.clearSearchHistory();
      loadSessions();
      updateStorageInfo();
      toast.success('All conversation history cleared');
      
      // If current chat was in history, redirect to home
      if (currentChatId) {
        router.push('/');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to clear history';
      toast.error(message);
    } finally {
      setClearConfirm(false);
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const getCategoryBadge = (category?: string) => {
    if (!category) return null;
    
    const categoryColors: Record<string, string> = {
      academic: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      entertainment: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
      social: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    };

    return (
      <span className={cn(
        'text-xs px-2 py-0.5 rounded-full',
        categoryColors[category] || 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300'
      )}>
        {category}
      </span>
    );
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className={cn(
        'fixed top-0 right-0 h-full w-full sm:w-96 bg-light-primary dark:bg-dark-primary shadow-2xl z-50 flex flex-col',
        'transform transition-transform duration-300 ease-in-out',
        isOpen ? 'translate-x-0' : 'translate-x-full'
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-light-200 dark:border-dark-200">
          <div className="flex items-center gap-2">
            <HistoryIcon className="w-5 h-5 text-black dark:text-white" />
            <h2 className="text-lg font-semibold text-black dark:text-white">
              Chat History
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-light-200 dark:hover:bg-dark-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-black dark:text-white" />
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 p-4 border-b border-light-200 dark:border-dark-200">
          <button
            onClick={() => setFilterMode('all')}
            className={cn(
              'flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              filterMode === 'all'
                ? 'bg-[#24A0ED] text-white'
                : 'bg-light-200 dark:bg-dark-200 text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white'
            )}
          >
            All
          </button>
          <button
            onClick={() => setFilterMode('favorites')}
            className={cn(
              'flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2',
              filterMode === 'favorites'
                ? 'bg-[#24A0ED] text-white'
                : 'bg-light-200 dark:bg-dark-200 text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white'
            )}
          >
            <Star className="w-4 h-4" />
            Favorites
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-light-200 dark:border-dark-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/50 dark:text-white/50" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-light-200 dark:bg-dark-200 border border-light-300 dark:border-dark-300 rounded-lg text-sm text-black dark:text-white placeholder:text-black/50 dark:placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-[#24A0ED]"
            />
          </div>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#24A0ED] mb-4"></div>
              <p className="text-black/60 dark:text-white/60 text-sm">Loading conversations...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <AlertCircle className="w-12 h-12 text-red-600 dark:text-red-400 mb-4" />
              <p className="text-red-600 dark:text-red-400 text-sm mb-2">
                {error}
              </p>
              <button
                onClick={loadSessions}
                className="text-sm text-[#24A0ED] hover:underline"
              >
                Try again
              </button>
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <Clock className="w-12 h-12 text-black/30 dark:text-white/30 mb-4" />
              <p className="text-black/60 dark:text-white/60 text-sm">
                {searchQuery 
                  ? 'No conversations found' 
                  : filterMode === 'favorites'
                    ? 'No favorite conversations yet'
                    : 'No conversations yet'}
              </p>
              <p className="text-black/40 dark:text-white/40 text-xs mt-2">
                {filterMode === 'favorites'
                  ? 'Star conversations to add them to favorites'
                  : 'Start a new chat to see it here'}
              </p>
            </div>
          ) : (
            <div className="p-2">
              {filteredSessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => handleSessionClick(session.id)}
                  className={cn(
                    'w-full p-3 rounded-lg mb-2 text-left transition-all hover:bg-light-200 dark:hover:bg-dark-200 group',
                    session.id === currentChatId && 'bg-light-200 dark:bg-dark-200'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-black dark:text-white truncate mb-1">
                        {session.title}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-black/60 dark:text-white/60">
                        <Clock className="w-3 h-3" />
                        <span>{formatTimestamp(session.timestamp)}</span>
                        {session.category && getCategoryBadge(session.category)}
                      </div>
                      <p className="text-xs text-black/50 dark:text-white/50 mt-1">
                        {session.messages.length} {session.messages.length === 1 ? 'message' : 'messages'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => handleToggleFavorite(session.id, e)}
                        className="p-1.5 hover:bg-light-300 dark:hover:bg-dark-300 rounded transition-colors"
                        title={session.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        <Star 
                          className={cn(
                            'w-4 h-4',
                            session.isFavorite 
                              ? 'fill-yellow-400 text-yellow-400' 
                              : 'text-black/50 dark:text-white/50'
                          )} 
                        />
                      </button>
                      <button
                        onClick={(e) => handleDeleteSession(session.id, session.title, e)}
                        className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                        title="Delete conversation"
                      >
                        <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                      </button>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-light-200 dark:border-dark-200 space-y-3">
          {/* Storage Usage Indicator */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-black/60 dark:text-white/60">
                <Database className="w-3.5 h-3.5" />
                <span>Storage Used</span>
              </div>
              <span className={cn(
                'font-medium',
                storageInfo.percentage > 80 
                  ? 'text-red-600 dark:text-red-400' 
                  : 'text-black/60 dark:text-white/60'
              )}>
                {storageInfo.percentage.toFixed(1)}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-light-200 dark:bg-dark-200 rounded-full overflow-hidden">
              <div 
                className={cn(
                  'h-full transition-all duration-300 rounded-full',
                  storageInfo.percentage > 80 
                    ? 'bg-red-500' 
                    : storageInfo.percentage > 60
                      ? 'bg-yellow-500'
                      : 'bg-[#24A0ED]'
                )}
                style={{ width: `${Math.min(storageInfo.percentage, 100)}%` }}
              />
            </div>
            {storageInfo.percentage > 80 && (
              <div className="flex items-start gap-1.5 text-xs text-red-600 dark:text-red-400">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span>Storage is almost full. Consider clearing old conversations.</span>
              </div>
            )}
          </div>

          {/* Stats and Actions */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-black/50 dark:text-white/50">
              {sessions.length} {sessions.length === 1 ? 'conversation' : 'conversations'}
            </p>
            {sessions.length > 0 && (
              <button
                onClick={handleClearAllHistory}
                className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium transition-colors"
              >
                Clear All
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-light-primary dark:bg-dark-primary rounded-2xl shadow-2xl m-4 p-6">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-black dark:text-white mb-2">
                Delete Conversation?
              </h3>
              <p className="text-sm text-black/70 dark:text-white/70 mb-2">
                Are you sure you want to delete "{deleteConfirm.title}"?
              </p>
              <p className="text-xs text-black/50 dark:text-white/50">
                This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 bg-light-200 dark:bg-dark-200 hover:bg-light-300 dark:hover:bg-dark-300 text-black dark:text-white rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteSession}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Confirmation Dialog */}
      {clearConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-light-primary dark:bg-dark-primary rounded-2xl shadow-2xl m-4 p-6">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-black dark:text-white mb-2">
                Clear All History?
              </h3>
              <p className="text-sm text-black/70 dark:text-white/70 mb-2">
                Are you sure you want to clear all conversation history?
              </p>
              <p className="text-xs text-black/50 dark:text-white/50">
                This will permanently delete all {sessions.length} conversation{sessions.length !== 1 ? 's' : ''}. This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setClearConfirm(false)}
                className="flex-1 px-4 py-2 bg-light-200 dark:bg-dark-200 hover:bg-light-300 dark:hover:bg-dark-300 text-black dark:text-white rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmClearAllHistory}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
