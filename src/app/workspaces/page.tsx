'use client';

import { useState, useEffect } from 'react';
import { Plus, FolderKanban, Trash2 } from 'lucide-react';
import { Workspace } from '@/lib/types/workspace';
import { WorkspaceManager } from '@/lib/workspace/workspaceManager';
import { useRouter } from 'next/navigation';

export default function WorkspacesPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    loadWorkspaces();
    syncWorkspacesToDatabase();
  }, []);

  const syncWorkspacesToDatabase = async () => {
    const localWorkspaces = WorkspaceManager.getWorkspaces();
    
    for (const workspace of localWorkspaces) {
      try {
        const checkResponse = await fetch(`/api/workspaces/${workspace.id}`);
        
        if (checkResponse.status === 404) {
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
        }
      } catch (error) {
        console.error(`Failed to sync workspace ${workspace.id}:`, error);
      }
    }
  };

  const loadWorkspaces = () => {
    const loaded = WorkspaceManager.getWorkspaces();
    setWorkspaces(loaded);
  };

  const handleDelete = async (workspaceId: string, workspaceName: string) => {
    if (!confirm(`Are you sure you want to delete "${workspaceName}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingId(workspaceId);
    try {
      const success = WorkspaceManager.deleteWorkspace(workspaceId);
      
      if (!success) {
        throw new Error('Workspace not found');
      }

      try {
        await fetch(`/api/workspaces/${workspaceId}`, { method: 'DELETE' });
      } catch (dbError) {
        console.log('Database delete skipped or failed:', dbError);
      }

      setWorkspaces(workspaces.filter(w => w.id !== workspaceId));
    } catch (error) {
      console.error('Error deleting workspace:', error);
      alert('Failed to delete workspace. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl shadow-lg bg-gradient-to-r from-pink-500 to-purple-500 flex items-center justify-center">
              <FolderKanban className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-black bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent tracking-tight">
                PTT Spaces
              </h1>
              <p className="text-black/60 dark:text-white/60 mt-1">
                Collaborative AI-powered workspaces for your team
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl transition-all duration-200 hover:shadow-lg hover:scale-105 font-semibold"
          >
            <Plus className="w-5 h-5" />
            <span>Create Space</span>
          </button>
        </div>
      </div>

      {/* Workspaces Grid */}
      {workspaces.length === 0 ? (
        <div className="text-center py-16">
          <div className="mb-6">
            <div className="w-20 h-20 mx-auto rounded-2xl shadow-lg bg-gradient-to-r from-pink-500 to-purple-500 flex items-center justify-center mb-4">
              <FolderKanban className="w-10 h-10 text-white" />
            </div>
            <FolderKanban className="w-16 h-16 mx-auto text-black/20 dark:text-white/20 mb-4" />
          </div>
          <h3 className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent mb-2">
            No spaces yet
          </h3>
          <p className="text-black/60 dark:text-white/60 mb-6">
            Create your first True Space to get started
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-8 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl transition-all duration-200 hover:shadow-lg hover:scale-105 font-semibold"
          >
            Create Your First Space
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workspaces.map((workspace) => (
            <WorkspaceCard
              key={workspace.id}
              workspace={workspace}
              onClick={() => router.push(`/workspaces/${workspace.id}`)}
              onDelete={() => handleDelete(workspace.id, workspace.name)}
              isDeleting={deletingId === workspace.id}
            />
          ))}
        </div>
      )}

      {/* Create Workspace Modal */}
      {showCreateModal && (
        <CreateWorkspaceModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(workspace) => {
            setWorkspaces([...workspaces, workspace]);
            setShowCreateModal(false);
            router.push(`/workspaces/${workspace.id}`);
          }}
        />
      )}
    </div>
  );
}

function WorkspaceCard({
  workspace,
  onClick,
  onDelete,
  isDeleting,
}: {
  workspace: Workspace;
  onClick: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  return (
    <div className="bg-light-secondary dark:bg-dark-secondary border border-light-200 dark:border-dark-200 rounded-xl p-6 hover:shadow-xl hover:border-transparent hover:ring-2 hover:ring-offset-2 hover:ring-pink-500/50 dark:hover:ring-purple-500/50 transition-all duration-200 group relative">
      <div onClick={onClick} className="cursor-pointer">
        <div className="flex items-start justify-between mb-4">
          <div className="text-5xl">{workspace.icon}</div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            disabled={isDeleting}
            className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-500/10 rounded-lg transition-all duration-200 disabled:opacity-50"
            title="Delete space"
          >
            <Trash2 className="w-4 h-4 text-red-500" />
          </button>
        </div>

        <h3 className="text-lg font-bold text-black dark:text-white mb-2 group-hover:bg-gradient-to-r group-hover:from-pink-500 group-hover:to-purple-500 group-hover:bg-clip-text group-hover:text-transparent transition-all">
          {workspace.name}
        </h3>

        {workspace.description && (
          <p className="text-sm text-black/60 dark:text-white/60 line-clamp-2">
            {workspace.description}
          </p>
        )}
      </div>

      {isDeleting && (
        <div className="absolute inset-0 bg-light-secondary/80 dark:bg-dark-secondary/80 rounded-xl flex items-center justify-center">
          <div className="text-sm text-black/60 dark:text-white/60">Deleting...</div>
        </div>
      )}
    </div>
  );
}

function CreateWorkspaceModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (workspace: Workspace) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('📁');

  const icons = ['📁', '💼', '🚀', '🎯', '💡', '🔬', '📊', '🎨', '🏢', '🌟', '🔥', '⚡'];

  const handleCreate = async () => {
    if (!name.trim()) return;
    
    const workspace = WorkspaceManager.createWorkspace(name, description, icon);
    
    try {
      await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: workspace.id,
          name: workspace.name,
          description: workspace.description,
          icon: workspace.icon,
          ownerId: 'user',
          context: workspace.context,
          settings: workspace.settings,
        }),
      });
    } catch (error) {
      console.error('Failed to sync workspace to database:', error);
    }
    
    onCreated(workspace);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-light-primary dark:bg-dark-primary rounded-2xl max-w-md w-full p-6 shadow-2xl border border-light-200 dark:border-dark-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-pink-500 to-purple-500 flex items-center justify-center">
            <FolderKanban className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-2xl font-black bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
            Create New Space
          </h2>
        </div>

        <div className="space-y-4">
          {/* Icon Selector */}
          <div>
            <label className="block text-sm font-medium text-black dark:text-white mb-2">Icon</label>
            <div className="grid grid-cols-6 gap-2">
              {icons.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => setIcon(emoji)}
                  className={`text-2xl p-2 rounded-lg transition-all ${
                    icon === emoji
                      ? 'bg-gradient-to-r from-pink-500/20 to-purple-500/20 ring-2 ring-pink-500 dark:ring-purple-500'
                      : 'bg-light-secondary dark:bg-dark-secondary hover:bg-light-200 dark:hover:bg-dark-200'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Name Input */}
          <div>
            <label className="block text-sm font-medium text-black dark:text-white mb-2">Workspace Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Q4 Strategy, Research Project"
              className="w-full px-4 py-2 bg-light-secondary dark:bg-dark-secondary border border-light-200 dark:border-dark-200 rounded-lg text-black dark:text-white placeholder-black/40 dark:placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-pink-500 dark:focus:ring-purple-500"
              autoFocus
            />
          </div>

          {/* Description Input */}
          <div>
            <label className="block text-sm font-medium text-black dark:text-white mb-2">Description (Optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this space for?"
              rows={3}
              className="w-full px-4 py-2 bg-light-secondary dark:bg-dark-secondary border border-light-200 dark:border-dark-200 rounded-lg text-black dark:text-white placeholder-black/40 dark:placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-pink-500 dark:focus:ring-purple-500 resize-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-light-secondary dark:bg-dark-secondary text-black dark:text-white rounded-lg hover:bg-light-200 dark:hover:bg-dark-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim()}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg transition-all hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 font-semibold"
          >
            Create Space
          </button>
        </div>
      </div>
    </div>
  );
}
