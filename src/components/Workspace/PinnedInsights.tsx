'use client';

import { useState, useEffect, useCallback } from 'react';
import { Pin, X, MessageSquare } from 'lucide-react';

interface PinnedInsight {
  id: string;
  workspaceId: string;
  messageId: string;
  title: string | null;
  category: string | null;
  pinnedBy: string;
  pinnedAt: Date;
  message?: {
    content: string;
    conversationId: string;
  };
}

interface PinnedInsightsProps {
  workspaceId: string;
  onNavigateToConversation?: (conversationId: string) => void;
}

export default function PinnedInsights({
  workspaceId,
  onNavigateToConversation,
}: PinnedInsightsProps) {
  const [pins, setPins] = useState<PinnedInsight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedPinId, setExpandedPinId] = useState<string | null>(null);

  const loadPins = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/workspaces/${workspaceId}/pins`);
      if (response.ok) {
        const data = await response.json();
        setPins(data.pins || []);
      }
    } catch (error) {
      console.error('Failed to load pinned insights:', error);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    loadPins();
  }, [loadPins]);

  // Listen for pin events to refresh the list
  useEffect(() => {
    const handlePinAdded = (event: CustomEvent) => {
      // Check if the pin is for this workspace
      if (event.detail?.workspaceId === workspaceId) {
        // Add the new pin to the list immediately
        setPins(prev => [event.detail, ...prev]);
      }
    };

    window.addEventListener('pinAdded', handlePinAdded as EventListener);
    return () => {
      window.removeEventListener('pinAdded', handlePinAdded as EventListener);
    };
  }, [workspaceId]);

  const handleUnpin = async (pinId: string) => {
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/pins?pinId=${pinId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setPins(pins.filter((p) => p.id !== pinId));
      }
    } catch (error) {
      console.error('Failed to unpin insight:', error);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const truncateText = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#24A0ED]"></div>
      </div>
    );
  }

  if (pins.length === 0) {
    return (
      <div className="text-center py-6 px-4">
        <Pin className="w-8 h-8 text-black/30 dark:text-white/30 mx-auto mb-2" />
        <p className="text-xs text-black/60 dark:text-white/60">
          No pinned insights yet. Pin important responses to save them here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {pins.map((pin) => (
        <div
          key={pin.id}
          className="bg-light-primary dark:bg-dark-primary rounded-lg p-3 border border-light-200 dark:border-dark-200"
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-start gap-2 flex-1 min-w-0">
              <Pin className="w-3.5 h-3.5 text-[#24A0ED] mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                {pin.title && (
                  <h4 className="text-xs font-semibold text-black dark:text-white mb-1 truncate">
                    {pin.title}
                  </h4>
                )}
                {pin.message && (
                  <p className="text-xs text-black/70 dark:text-white/70 break-words">
                    {expandedPinId === pin.id
                      ? pin.message.content
                      : truncateText(pin.message.content)}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => handleUnpin(pin.id)}
              className="p-1 hover:bg-light-200 dark:hover:bg-dark-200 rounded transition-colors flex-shrink-0"
              title="Unpin"
            >
              <X className="w-3.5 h-3.5 text-black/60 dark:text-white/60" />
            </button>
          </div>

          <div className="flex items-center justify-between gap-2 mt-2">
            <span className="text-xs text-black/50 dark:text-white/50">
              {formatDate(pin.pinnedAt)}
            </span>
            <div className="flex items-center gap-2">
              {pin.message && expandedPinId !== pin.id && (
                <button
                  onClick={() => setExpandedPinId(pin.id)}
                  className="text-xs text-[#24A0ED] hover:text-[#1d8bd1] transition-colors"
                >
                  Show more
                </button>
              )}
              {expandedPinId === pin.id && (
                <button
                  onClick={() => setExpandedPinId(null)}
                  className="text-xs text-[#24A0ED] hover:text-[#1d8bd1] transition-colors"
                >
                  Show less
                </button>
              )}
              {pin.message?.conversationId && onNavigateToConversation && (
                <button
                  onClick={() => onNavigateToConversation(pin.message!.conversationId)}
                  className="flex items-center gap-1 text-xs text-[#24A0ED] hover:text-[#1d8bd1] transition-colors"
                  title="Go to conversation"
                >
                  <MessageSquare className="w-3 h-3" />
                  <span>View</span>
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
