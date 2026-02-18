'use client';

import { Workspace, WorkspaceConversation } from '@/lib/types/workspace';
import {
  ArrowLeft,
  MessageSquarePlus,
  Clock,
  Settings,
  Pin,
  FileText,
  Database,
  ChevronDown,
  ChevronRight,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PinnedInsights from './PinnedInsights';
import DocumentsList from './DocumentsList';
import DataSourcesList from './DataSourcesList';

interface WorkspaceSidebarProps {
  workspace: Workspace | null;
  conversations: WorkspaceConversation[];
  activeConversationId: string | null;
  isLoadingConversations: boolean;
  showSidebar: boolean;
  onClose: () => void;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onBack: () => void;
  onSettings: () => void;
  formatTimestamp: (date: Date) => string;
}

export default function WorkspaceSidebar({
  workspace,
  conversations,
  activeConversationId,
  isLoadingConversations,
  showSidebar,
  onClose,
  onSelectConversation,
  onNewConversation,
  onBack,
  onSettings,
  formatTimestamp,
}: WorkspaceSidebarProps) {
  const router = useRouter();
  const [showPins, setShowPins] = useState(true);
  const [showKnowledge, setShowKnowledge] = useState(false);

  if (!workspace) return null;

  return (
    <>
      {/* Overlay for mobile */}
      {showSidebar && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          'fixed top-0 left-0 h-screen w-80 bg-light-secondary dark:bg-dark-secondary border-r border-light-200 dark:border-dark-200 z-50 flex flex-col transition-transform duration-300',
          showSidebar ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Header */}
        <div className="p-4 border-b border-light-200 dark:border-dark-200">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white mb-3 transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to PTT Spaces</span>
          </button>
          
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="text-2xl">{workspace.icon}</div>
              <h2 className="text-sm font-semibold text-black dark:text-white truncate">
                {workspace.name}
              </h2>
            </div>
            <button
              onClick={onSettings}
              className="p-1.5 hover:bg-light-200 dark:hover:bg-dark-200 rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4 text-black/60 dark:text-white/60" />
            </button>
          </div>

          <button
            onClick={onNewConversation}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-[#24A0ED] hover:bg-[#1d8bd1] text-white rounded-lg transition-colors text-sm font-medium"
          >
            <MessageSquarePlus className="w-4 h-4" />
            New Conversation
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Conversations */}
          <div className="p-2">
            <h3 className="text-xs font-semibold text-black/50 dark:text-white/50 uppercase tracking-wide px-2 mb-2">
              Conversations
            </h3>
            {isLoadingConversations ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#24A0ED]"></div>
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-6 px-4">
                <MessageSquarePlus className="w-6 h-6 text-black/30 dark:text-white/30 mx-auto mb-2" />
                <p className="text-xs text-black/60 dark:text-white/60">
                  No conversations yet
                </p>
              </div>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => onSelectConversation(conv.id)}
                  className={cn(
                    'w-full p-2.5 rounded-lg mb-1 text-left transition-all hover:bg-light-200 dark:hover:bg-dark-200',
                    activeConversationId === conv.id &&
                      'bg-light-200 dark:bg-dark-200'
                  )}
                >
                  <h4 className="text-sm font-medium text-black dark:text-white truncate mb-1">
                    {conv.title}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-black/60 dark:text-white/60">
                    <Clock className="w-3 h-3" />
                    <span>{formatTimestamp(conv.updatedAt)}</span>
                    <span>•</span>
                    <span>{conv.messageCount}</span>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Pinned Insights */}
          <div className="border-t border-light-200 dark:border-dark-200 mt-2">
            <button
              onClick={() => setShowPins(!showPins)}
              className="w-full flex items-center justify-between p-3 hover:bg-light-200 dark:hover:bg-dark-200 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Pin className="w-4 h-4 text-[#24A0ED]" />
                <span className="text-sm font-medium text-black dark:text-white">
                  Pinned Insights
                </span>
              </div>
              {showPins ? (
                <ChevronDown className="w-4 h-4 text-black/60 dark:text-white/60" />
              ) : (
                <ChevronRight className="w-4 h-4 text-black/60 dark:text-white/60" />
              )}
            </button>
            {showPins && (
              <div className="p-3 pt-0 max-h-64 overflow-y-auto">
                <PinnedInsights
                  workspaceId={workspace.id}
                  onNavigateToConversation={onSelectConversation}
                />
              </div>
            )}
          </div>

          {/* GenBI - Business Intelligence */}
          <div className="border-t border-light-200 dark:border-dark-200">
            <button
              onClick={() => {
                router.push(`/workspaces/${workspace.id}/genbi`);
                onClose();
              }}
              className="w-full flex items-center gap-2 p-3 hover:bg-light-200 dark:hover:bg-dark-200 transition-colors"
            >
              <BarChart3 className="w-4 h-4 text-[#24A0ED]" />
              <span className="text-sm font-medium text-black dark:text-white">
                GenBI - Query Data
              </span>
            </button>
          </div>

          {/* Knowledge Base */}
          <div className="border-t border-light-200 dark:border-dark-200">
            <button
              onClick={() => setShowKnowledge(!showKnowledge)}
              className="w-full flex items-center justify-between p-3 hover:bg-light-200 dark:hover:bg-dark-200 transition-colors"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#24A0ED]" />
                <span className="text-sm font-medium text-black dark:text-white">
                  Knowledge Base
                </span>
              </div>
              {showKnowledge ? (
                <ChevronDown className="w-4 h-4 text-black/60 dark:text-white/60" />
              ) : (
                <ChevronRight className="w-4 h-4 text-black/60 dark:text-white/60" />
              )}
            </button>
            {showKnowledge && (
              <div className="max-h-80 overflow-y-auto">
                <div className="p-3 pt-0 border-b border-light-200 dark:border-dark-200">
                  <h4 className="text-xs font-semibold text-black/50 dark:text-white/50 uppercase tracking-wide mb-2">
                    Documents
                  </h4>
                  <DocumentsList workspaceId={workspace.id} />
                </div>
                <div className="p-3">
                  <h4 className="text-xs font-semibold text-black/50 dark:text-white/50 uppercase tracking-wide mb-2">
                    Data Sources
                  </h4>
                  <DataSourcesList workspaceId={workspace.id} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
