'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { Workspace, WorkspaceConversation } from '@/lib/types/workspace';
import { WorkspaceManager } from '@/lib/workspace/workspaceManager';
import { ChatProvider } from '@/lib/hooks/useChat';
import WorkspaceChatWindow from '@/components/Workspace/WorkspaceChatWindow';
import WorkspaceSettings from '@/components/Workspace/WorkspaceSettings';
import WorkspaceSidebar from '@/components/Workspace/WorkspaceSidebar';
import WorkspaceChat from '@/components/Workspace/WorkspaceChat';
import { cn } from '@/lib/utils';

export default function WorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.id as string;

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [conversations, setConversations] = useState<WorkspaceConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  
  // Track the current chat session ID separately - this is used for the ChatProvider key
  // and should only change when explicitly switching conversations
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  // Use a counter to force new chat sessions
  const [chatSessionKey, setChatSessionKey] = useState(0);

  useEffect(() => {
    const loaded = WorkspaceManager.getWorkspace(workspaceId);
    if (!loaded) {
      router.push('/workspaces');
      return;
    }
    setWorkspace(loaded);
  }, [workspaceId, router]);

  useEffect(() => {
    if (!workspaceId || !workspace) return;

    const syncAndLoadConversations = async () => {
      try {
        setIsLoadingConversations(true);
        
        const response = await fetch(`/api/workspaces/${workspaceId}/conversations`);
        
        if (response.ok) {
          const data = await response.json();
          setConversations(data.conversations || []);
          // Don't auto-select a conversation - let user start fresh or pick one
          setIsLoadingConversations(false);
        } else if (response.status === 404) {
          await fetch('/api/workspaces', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: workspace.id,
              name: workspace.name,
              description: workspace.description,
              icon: workspace.icon,
              ownerId: workspace.ownerId || 'user',
              context: workspace.context,
              settings: workspace.settings,
            }),
          });
          
          setConversations([]);
          setIsLoadingConversations(false);
        } else {
          setConversations([]);
          setIsLoadingConversations(false);
        }
      } catch (error) {
        console.error('Failed to load conversations:', error);
        setConversations([]);
        setIsLoadingConversations(false);
      }
    };

    syncAndLoadConversations();
  }, [workspaceId, workspace]);

  const handleNewConversation = async () => {
    // Clear the active conversation and start a new chat session
    setActiveConversationId(null);
    setCurrentChatId(null);
    setChatSessionKey(prev => prev + 1); // Force new ChatProvider instance
    setShowSidebar(false);
  };

  const handleSelectConversation = (id: string) => {
    // Switch to an existing conversation
    setActiveConversationId(id);
    setCurrentChatId(id);
    setChatSessionKey(prev => prev + 1); // Force ChatProvider to load this conversation
    setShowSidebar(false);
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  if (!workspace) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#24A0ED] mx-auto mb-4"></div>
          <p className="text-black/60 dark:text-white/60">Loading workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <ChatProvider id={currentChatId || undefined} key={`chat-${chatSessionKey}`}>
      <div className="relative">
        <WorkspaceChat 
          workspace={workspace} 
          conversationId={activeConversationId}
        />

        {/* Mobile Sidebar Toggle */}
        <button
          onClick={() => setShowSidebar(!showSidebar)}
          className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-light-secondary dark:bg-dark-secondary rounded-lg border border-light-200 dark:border-dark-200"
        >
          {showSidebar ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        {/* Workspace Sidebar */}
        <WorkspaceSidebar
          workspace={workspace}
          conversations={conversations}
          activeConversationId={activeConversationId}
          isLoadingConversations={isLoadingConversations}
          showSidebar={showSidebar}
          onClose={() => setShowSidebar(false)}
          onSelectConversation={handleSelectConversation}
          onNewConversation={handleNewConversation}
          onBack={() => router.push('/workspaces')}
          onSettings={() => setShowSettings(true)}
          formatTimestamp={formatTimestamp}
        />

        {/* Main Chat Area */}
        <div className={cn(
          'transition-all duration-300',
          showSidebar ? 'lg:ml-80' : 'lg:ml-80'
        )}>
          <WorkspaceChatWindow 
            workspace={workspace}
            conversationId={activeConversationId}
            onConversationCreated={(conversationId, title, chatId) => {
              // Add the new conversation to the list
              // DON'T remount ChatProvider - just update the sidebar list and highlight
              const newConversation = {
                id: conversationId,
                workspaceId: workspace.id,
                title,
                createdBy: 'user',
                createdAt: new Date(),
                updatedAt: new Date(),
                messageCount: 1,
              };
              setConversations(prev => [newConversation, ...prev]);
              // Update the active conversation ID for sidebar highlight only
              // Don't change currentChatId or chatSessionKey - that would remount
              setActiveConversationId(conversationId);
            }}
          />
        </div>

        {/* Workspace Settings Modal */}
        <WorkspaceSettings
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          workspace={workspace}
          onWorkspaceUpdate={(updatedWorkspace) => {
            setWorkspace(updatedWorkspace);
            WorkspaceManager.updateWorkspace(updatedWorkspace.id, updatedWorkspace);
          }}
          onWorkspaceDelete={() => {
            WorkspaceManager.deleteWorkspace(workspace.id);
            router.push('/workspaces');
          }}
        />
      </div>
    </ChatProvider>
  );
}
