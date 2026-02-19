'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, Sparkles } from 'lucide-react';
import { WorkspaceAgent } from '@/lib/types/workspace';
import { toast } from 'sonner';

interface AgentEditorProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  agent?: WorkspaceAgent; // If provided, we're editing; otherwise creating
  onSave: (agent: WorkspaceAgent) => void;
}

export default function AgentEditor({
  isOpen,
  onClose,
  workspaceId,
  agent,
  onSave,
}: AgentEditorProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [chatModel, setChatModel] = useState('');
  const [chatModelProvider, setChatModelProvider] = useState('');
  const [embeddingModel, setEmbeddingModel] = useState('');
  const [embeddingModelProvider, setEmbeddingModelProvider] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [avatar, setAvatar] = useState('🤖');
  const [role, setRole] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [toolsAllowed, setToolsAllowed] = useState('');
  const [memoryScope, setMemoryScope] = useState<'workspace' | 'agent' | 'user'>('workspace');
  const [isSaving, setIsSaving] = useState(false);

  const [availableModels, setAvailableModels] = useState<any>(null);
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  // Load form data when agent prop changes
  useEffect(() => {
    if (agent) {
      setName(agent.name);
      setDescription(agent.description || '');
      setSystemPrompt(agent.systemPrompt || '');
      setChatModel(agent.chatModel || '');
      setChatModelProvider(agent.chatModelProvider || '');
      setEmbeddingModel(agent.embeddingModel || '');
      setEmbeddingModelProvider(agent.embeddingModelProvider || '');
      setIsDefault(agent.isDefault);
      setAvatar(agent.avatar || '🤖');
      setRole(agent.role || '');
      setSpecialty(agent.specialty || '');
      setToolsAllowed(agent.toolsAllowed?.join(', ') || '');
      setMemoryScope(agent.memoryScope || 'workspace');
    } else {
      // Reset form for new agent
      setName('');
      setDescription('');
      setSystemPrompt('');
      setChatModel('');
      setChatModelProvider('');
      setEmbeddingModel('');
      setEmbeddingModelProvider('');
      setIsDefault(false);
      setAvatar('🤖');
      setRole('');
      setSpecialty('');
      setToolsAllowed('');
      setMemoryScope('workspace');
    }
  }, [agent]);

  // Load available models
  useEffect(() => {
    if (isOpen && !availableModels) {
      loadModels();
    }
  }, [isOpen]);

  const loadModels = async () => {
    setIsLoadingModels(true);
    try {
      const response = await fetch('/api/models');
      if (response.ok) {
        const data = await response.json();
        setAvailableModels(data);
      }
    } catch (error) {
      console.error('Failed to load models:', error);
      toast.error('Failed to load available models');
    } finally {
      setIsLoadingModels(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!name.trim()) {
      toast.error('Agent name is required');
      return;
    }

    if (name.length > 100) {
      toast.error('Agent name must be 100 characters or less');
      return;
    }

    if (systemPrompt.length > 10000) {
      toast.error('System prompt must be 10,000 characters or less');
      return;
    }

    setIsSaving(true);

    try {
      const endpoint = agent
        ? `/api/workspaces/${workspaceId}/agents/${agent.id}`
        : `/api/workspaces/${workspaceId}/agents`;
      
      const method = agent ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          systemPrompt: systemPrompt.trim() || undefined,
          chatModel: chatModel || undefined,
          chatModelProvider: chatModelProvider || undefined,
          embeddingModel: embeddingModel || undefined,
          embeddingModelProvider: embeddingModelProvider || undefined,
          isDefault,
          avatar: avatar || '🤖',
          role: role.trim() || undefined,
          specialty: specialty.trim() || undefined,
          toolsAllowed: toolsAllowed.trim()
            ? toolsAllowed.split(',').map((t) => t.trim()).filter(Boolean)
            : [],
          memoryScope,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save agent');
      }

      const savedAgent = await response.json();
      toast.success(agent ? 'Agent updated successfully' : 'Agent created successfully');
      onSave(savedAgent);
      onClose();
    } catch (error: any) {
      console.error('Error saving agent:', error);
      toast.error(error.message || 'Failed to save agent');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-light-secondary dark:bg-dark-secondary rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-light-200 dark:border-dark-200">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#24A0ED]" />
            <h2 className="text-lg font-semibold text-black dark:text-white">
              {agent ? 'Edit Agent' : 'Create New Agent'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-black dark:text-white mb-1">
              Agent Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Research Assistant"
              maxLength={100}
              className="w-full px-3 py-2 bg-light-primary dark:bg-dark-primary border border-light-200 dark:border-dark-200 rounded-lg text-sm text-black dark:text-white placeholder:text-black/50 dark:placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-[#24A0ED]/50"
              required
            />
            <p className="text-xs text-black/50 dark:text-white/50 mt-1">
              {name.length}/100 characters
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-black dark:text-white mb-1">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Specialized in academic research and citations"
              className="w-full px-3 py-2 bg-light-primary dark:bg-dark-primary border border-light-200 dark:border-dark-200 rounded-lg text-sm text-black dark:text-white placeholder:text-black/50 dark:placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-[#24A0ED]/50"
            />
          </div>

          {/* Avatar */}
          <div>
            <label className="block text-sm font-medium text-black dark:text-white mb-1">
              Avatar
            </label>
            <input
              type="text"
              value={avatar}
              onChange={(e) => setAvatar(e.target.value)}
              placeholder="🤖"
              className="w-full px-3 py-2 bg-light-primary dark:bg-dark-primary border border-light-200 dark:border-dark-200 rounded-lg text-sm text-black dark:text-white placeholder:text-black/50 dark:placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-[#24A0ED]/50"
            />
            <p className="text-xs text-black/50 dark:text-white/50 mt-1">
              Enter an emoji to represent this agent
            </p>
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-black dark:text-white mb-1">
              Role
            </label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g., Data Analyst"
              className="w-full px-3 py-2 bg-light-primary dark:bg-dark-primary border border-light-200 dark:border-dark-200 rounded-lg text-sm text-black dark:text-white placeholder:text-black/50 dark:placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-[#24A0ED]/50"
            />
          </div>

          {/* Specialty */}
          <div>
            <label className="block text-sm font-medium text-black dark:text-white mb-1">
              Specialty
            </label>
            <input
              type="text"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              placeholder="e.g., SQL and data analysis"
              className="w-full px-3 py-2 bg-light-primary dark:bg-dark-primary border border-light-200 dark:border-dark-200 rounded-lg text-sm text-black dark:text-white placeholder:text-black/50 dark:placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-[#24A0ED]/50"
            />
          </div>

          {/* System Prompt */}
          <div>
            <label className="block text-sm font-medium text-black dark:text-white mb-1">
              System Prompt
            </label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="You are a helpful assistant specialized in..."
              rows={6}
              maxLength={10000}
              className="w-full px-3 py-2 bg-light-primary dark:bg-dark-primary border border-light-200 dark:border-dark-200 rounded-lg text-sm text-black dark:text-white placeholder:text-black/50 dark:placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-[#24A0ED]/50 resize-none"
            />
            <p className="text-xs text-black/50 dark:text-white/50 mt-1">
              {systemPrompt.length}/10,000 characters
            </p>
          </div>

          {/* Chat Model */}
          <div>
            <label className="block text-sm font-medium text-black dark:text-white mb-1">
              Chat Model
            </label>
            {isLoadingModels ? (
              <div className="flex items-center gap-2 text-sm text-black/50 dark:text-white/50">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading models...
              </div>
            ) : (
              <div className="space-y-2">
                <select
                  value={chatModelProvider}
                  onChange={(e) => {
                    setChatModelProvider(e.target.value);
                    setChatModel('');
                  }}
                  className="w-full px-3 py-2 bg-light-primary dark:bg-dark-primary border border-light-200 dark:border-dark-200 rounded-lg text-sm text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#24A0ED]/50"
                >
                  <option value="">Select provider (optional)</option>
                  {availableModels?.chatModelProviders &&
                    Object.keys(availableModels.chatModelProviders).map((provider) => (
                      <option key={provider} value={provider}>
                        {provider}
                      </option>
                    ))}
                </select>
                {chatModelProvider && (
                  <select
                    value={chatModel}
                    onChange={(e) => setChatModel(e.target.value)}
                    className="w-full px-3 py-2 bg-light-primary dark:bg-dark-primary border border-light-200 dark:border-dark-200 rounded-lg text-sm text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#24A0ED]/50"
                  >
                    <option value="">Select model</option>
                    {availableModels?.chatModelProviders[chatModelProvider] &&
                      Object.keys(availableModels.chatModelProviders[chatModelProvider]).map(
                        (model) => (
                          <option key={model} value={model}>
                            {model}
                          </option>
                        )
                      )}
                  </select>
                )}
              </div>
            )}
            <p className="text-xs text-black/50 dark:text-white/50 mt-1">
              Leave empty to use workspace defaults
            </p>
          </div>

          {/* Embedding Model */}
          <div>
            <label className="block text-sm font-medium text-black dark:text-white mb-1">
              Embedding Model
            </label>
            {isLoadingModels ? (
              <div className="flex items-center gap-2 text-sm text-black/50 dark:text-white/50">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading models...
              </div>
            ) : (
              <div className="space-y-2">
                <select
                  value={embeddingModelProvider}
                  onChange={(e) => {
                    setEmbeddingModelProvider(e.target.value);
                    setEmbeddingModel('');
                  }}
                  className="w-full px-3 py-2 bg-light-primary dark:bg-dark-primary border border-light-200 dark:border-dark-200 rounded-lg text-sm text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#24A0ED]/50"
                >
                  <option value="">Select provider (optional)</option>
                  {availableModels?.embeddingModelProviders &&
                    Object.keys(availableModels.embeddingModelProviders).map((provider) => (
                      <option key={provider} value={provider}>
                        {provider}
                      </option>
                    ))}
                </select>
                {embeddingModelProvider && (
                  <select
                    value={embeddingModel}
                    onChange={(e) => setEmbeddingModel(e.target.value)}
                    className="w-full px-3 py-2 bg-light-primary dark:bg-dark-primary border border-light-200 dark:border-dark-200 rounded-lg text-sm text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#24A0ED]/50"
                  >
                    <option value="">Select model</option>
                    {availableModels?.embeddingModelProviders[embeddingModelProvider] &&
                      Object.keys(
                        availableModels.embeddingModelProviders[embeddingModelProvider]
                      ).map((model) => (
                        <option key={model} value={model}>
                          {model}
                        </option>
                      ))}
                  </select>
                )}
              </div>
            )}
            <p className="text-xs text-black/50 dark:text-white/50 mt-1">
              Leave empty to use workspace defaults
            </p>
          </div>

          {/* Tools Allowed */}
          <div>
            <label className="block text-sm font-medium text-black dark:text-white mb-1">
              Tools Allowed
            </label>
            <input
              type="text"
              value={toolsAllowed}
              onChange={(e) => setToolsAllowed(e.target.value)}
              placeholder="e.g., web_search, code_interpreter"
              className="w-full px-3 py-2 bg-light-primary dark:bg-dark-primary border border-light-200 dark:border-dark-200 rounded-lg text-sm text-black dark:text-white placeholder:text-black/50 dark:placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-[#24A0ED]/50"
            />
            <p className="text-xs text-black/50 dark:text-white/50 mt-1">
              Comma-separated list of allowed tools (optional)
            </p>
          </div>

          {/* Memory Scope */}
          <div>
            <label className="block text-sm font-medium text-black dark:text-white mb-1">
              Memory Scope
            </label>
            <select
              value={memoryScope}
              onChange={(e) => setMemoryScope(e.target.value as 'workspace' | 'agent' | 'user')}
              className="w-full px-3 py-2 bg-light-primary dark:bg-dark-primary border border-light-200 dark:border-dark-200 rounded-lg text-sm text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#24A0ED]/50"
            >
              <option value="workspace">Workspace — shared with all members</option>
              <option value="agent">Agent — private to this agent</option>
              <option value="user">User — private to each user</option>
            </select>
          </div>

          {/* Set as Default */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isDefault"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="w-4 h-4 text-[#24A0ED] bg-light-primary dark:bg-dark-primary border-light-200 dark:border-dark-200 rounded focus:ring-2 focus:ring-[#24A0ED]/50"
            />
            <label
              htmlFor="isDefault"
              className="text-sm text-black dark:text-white cursor-pointer"
            >
              Set as default agent for this workspace
            </label>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-light-200 dark:border-dark-200">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-black dark:text-white hover:bg-light-200 dark:hover:bg-dark-200 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving || !name.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-[#24A0ED] hover:bg-[#1b7dbb] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            {agent ? 'Update Agent' : 'Create Agent'}
          </button>
        </div>
      </div>
    </div>
  );
}
