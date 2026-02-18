'use client';

import { useState, useEffect } from 'react';
import { Sparkles, Edit2, Trash2, Star, Plus, Loader2 } from 'lucide-react';
import { WorkspaceAgent } from '@/lib/types/workspace';
import { toast } from 'sonner';
import AgentEditor from './AgentEditor';

interface AgentsListProps {
  workspaceId: string;
}

export default function AgentsList({ workspaceId }: AgentsListProps) {
  const [agents, setAgents] = useState<WorkspaceAgent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<WorkspaceAgent | undefined>();
  const [deletingAgentId, setDeletingAgentId] = useState<string | null>(null);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);

  useEffect(() => {
    loadAgents();
  }, [workspaceId]);

  const loadAgents = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/workspaces/${workspaceId}/agents`);
      if (response.ok) {
        const data = await response.json();
        setAgents(data);
      }
    } catch (error) {
      console.error('Failed to load agents:', error);
      toast.error('Failed to load agents');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAgent = () => {
    setEditingAgent(undefined);
    setIsEditorOpen(true);
  };

  const handleEditAgent = (agent: WorkspaceAgent) => {
    setEditingAgent(agent);
    setIsEditorOpen(true);
  };

  const handleSaveAgent = (agent: WorkspaceAgent) => {
    loadAgents();
  };

  const handleDeleteAgent = async (agentId: string) => {
    if (!confirm('Are you sure you want to delete this agent?')) {
      return;
    }

    setDeletingAgentId(agentId);
    try {
      const response = await fetch(
        `/api/workspaces/${workspaceId}/agents/${agentId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete agent');
      }

      toast.success('Agent deleted successfully');
      loadAgents();
    } catch (error: any) {
      console.error('Error deleting agent:', error);
      toast.error(error.message || 'Failed to delete agent');
    } finally {
      setDeletingAgentId(null);
    }
  };

  const handleSetDefault = async (agentId: string) => {
    setSettingDefaultId(agentId);
    try {
      const response = await fetch(
        `/api/workspaces/${workspaceId}/agents/${agentId}/set-default`,
        { method: 'POST' }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to set default agent');
      }

      toast.success('Default agent updated');
      loadAgents();
    } catch (error: any) {
      console.error('Error setting default agent:', error);
      toast.error(error.message || 'Failed to set default agent');
    } finally {
      setSettingDefaultId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-[#24A0ED]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-black dark:text-white">Agents</h3>
          <p className="text-xs text-black/60 dark:text-white/60 mt-1">
            Create and manage AI agents with different personas
          </p>
        </div>
        <button
          onClick={handleCreateAgent}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-[#24A0ED] hover:bg-[#1b7dbb] rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Agent
        </button>
      </div>

      {/* Agents Grid */}
      {agents.length === 0 ? (
        <div className="text-center py-8 px-4 bg-light-primary dark:bg-dark-primary rounded-lg border border-light-200 dark:border-dark-200">
          <Sparkles className="w-8 h-8 text-black/30 dark:text-white/30 mx-auto mb-2" />
          <p className="text-sm text-black/60 dark:text-white/60 mb-3">No agents yet</p>
          <p className="text-xs text-black/50 dark:text-white/50">
            Create your first agent to get started
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="bg-light-primary dark:bg-dark-primary rounded-lg p-4 border border-light-200 dark:border-dark-200 hover:border-[#24A0ED]/30 transition-colors"
            >
              {/* Agent Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <Sparkles className="w-5 h-5 text-[#24A0ED] flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-black dark:text-white truncate">
                        {agent.name}
                      </h4>
                      {agent.isDefault && (
                        <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-[#24A0ED] bg-[#24A0ED]/10 rounded-full">
                          <Star className="w-3 h-3 fill-current" />
                          Default
                        </span>
                      )}
                    </div>
                    {agent.description && (
                      <p className="text-xs text-black/60 dark:text-white/60 mt-1 line-clamp-2">
                        {agent.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Agent Details */}
              <div className="space-y-2 mb-3">
                {agent.systemPrompt && (
                  <div className="text-xs text-black/50 dark:text-white/50">
                    <span className="font-medium">System Prompt: </span>
                    <span className="line-clamp-2">{agent.systemPrompt}</span>
                  </div>
                )}
                {agent.chatModel && (
                  <div className="flex items-center gap-1 text-xs text-black/50 dark:text-white/50">
                    <span className="font-medium">Chat:</span>
                    <span className="truncate">
                      {agent.chatModelProvider}/{agent.chatModel}
                    </span>
                  </div>
                )}
                {agent.embeddingModel && (
                  <div className="flex items-center gap-1 text-xs text-black/50 dark:text-white/50">
                    <span className="font-medium">Embedding:</span>
                    <span className="truncate">
                      {agent.embeddingModelProvider}/{agent.embeddingModel}
                    </span>
                  </div>
                )}
                {!agent.chatModel && !agent.embeddingModel && !agent.systemPrompt && (
                  <p className="text-xs text-black/40 dark:text-white/40 italic">
                    Using workspace defaults
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-3 border-t border-light-200 dark:border-dark-200">
                {!agent.isDefault && (
                  <button
                    onClick={() => handleSetDefault(agent.id)}
                    disabled={settingDefaultId === agent.id}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-black/60 dark:text-white/60 hover:text-[#24A0ED] hover:bg-[#24A0ED]/10 rounded transition-colors disabled:opacity-50"
                  >
                    {settingDefaultId === agent.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Star className="w-3 h-3" />
                    )}
                    Set Default
                  </button>
                )}
                <button
                  onClick={() => handleEditAgent(agent)}
                  className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-black/60 dark:text-white/60 hover:text-[#24A0ED] hover:bg-[#24A0ED]/10 rounded transition-colors"
                >
                  <Edit2 className="w-3 h-3" />
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteAgent(agent.id)}
                  disabled={deletingAgentId === agent.id}
                  className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-black/60 dark:text-white/60 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors disabled:opacity-50 ml-auto"
                >
                  {deletingAgentId === agent.id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Trash2 className="w-3 h-3" />
                  )}
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Agent Editor Modal */}
      <AgentEditor
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        workspaceId={workspaceId}
        agent={editingAgent}
        onSave={handleSaveAgent}
      />
    </div>
  );
}
