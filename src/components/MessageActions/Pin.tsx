'use client';

import { useState } from 'react';
import { Pin as PinIcon, Check } from 'lucide-react';
import { toast } from 'sonner';

interface PinProps {
  messageId: string;
  content: string;
  conversationId: string;
}

const Pin = ({ messageId, content, conversationId }: PinProps) => {
  const [isPinned, setIsPinned] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handlePin = async () => {
    // Get the workspace ID from localStorage (set by WorkspaceChat component)
    const workspaceId = localStorage.getItem('currentWorkspaceId');
    
    if (!workspaceId) {
      toast.error('Pin is only available within a workspace');
      return;
    }

    setIsLoading(true);
    try {
      const title = content.substring(0, 100) + (content.length > 100 ? '...' : '');
      
      const response = await fetch(`/api/workspaces/${workspaceId}/pins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId,
          content,
          conversationId,
          title,
          pinnedBy: 'user',
        }),
      });

      if (response.ok) {
        const pin = await response.json();
        setIsPinned(true);
        toast.success('Message pinned to workspace');
        
        // Dispatch custom event to notify PinnedInsights component
        window.dispatchEvent(new CustomEvent('pinAdded', {
          detail: {
            ...pin,
            workspaceId,
            message: {
              content,
              conversationId,
            },
          },
        }));
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to pin message');
      }
    } catch (error) {
      console.error('Failed to pin message:', error);
      toast.error('Failed to pin message');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handlePin}
      disabled={isPinned || isLoading}
      className="p-2 text-black/70 dark:text-white/70 rounded-xl hover:bg-light-secondary dark:hover:bg-dark-secondary transition duration-200 hover:text-black dark:hover:text-white disabled:opacity-50"
      title={isPinned ? 'Pinned' : 'Pin to workspace'}
    >
      {isPinned ? (
        <Check size={18} className="text-green-500" />
      ) : (
        <PinIcon size={18} className={isLoading ? 'animate-pulse' : ''} />
      )}
    </button>
  );
};

export default Pin;
