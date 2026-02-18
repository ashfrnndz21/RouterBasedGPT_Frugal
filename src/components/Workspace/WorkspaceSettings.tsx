'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Settings,
  FileText,
  Database,
  Upload,
  Loader2,
  CheckCircle,
  XCircle,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Workspace, WorkspaceDocument, DataSourceConnection } from '@/lib/types/workspace';
import { toast } from 'sonner';
import AgentsList from './AgentsList';

interface WorkspaceSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  workspace: Workspace;
  onWorkspaceUpdate: (workspace: Workspace) => void;
  onWorkspaceDelete?: () => void;
}

type TabType = 'general' | 'context' | 'documents' | 'data-sources' | 'agents';

export default function WorkspaceSettings({
  isOpen,
  onClose,
  workspace,
  onWorkspaceUpdate,
  onWorkspaceDelete,
}: WorkspaceSettingsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [name, setName] = useState(workspace.name);
  const [description, setDescription] = useState(workspace.description || '');
  const [context, setContext] = useState(workspace.context || '');
  const [documents, setDocuments] = useState<WorkspaceDocument[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [dataSources, setDataSources] = useState<DataSourceConnection[]>([]);
  const [isLoadingDataSources, setIsLoadingDataSources] = useState(false);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tabs = [
    { id: 'general' as TabType, label: 'General', icon: Settings },
    { id: 'agents' as TabType, label: 'Agents', icon: Sparkles },
    { id: 'context' as TabType, label: 'Context', icon: FileText },
    { id: 'documents' as TabType, label: 'Documents', icon: FileText },
    { id: 'data-sources' as TabType, label: 'Data Sources', icon: Database },
  ];

  // Load functions defined as callbacks to avoid stale closures
  const loadDocuments = useCallback(async () => {
    setIsLoadingDocuments(true);
    try {
      const response = await fetch(`/api/workspaces/${workspace.id}/documents`);
      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents || []);
      }
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setIsLoadingDocuments(false);
    }
  }, [workspace.id]);

  const loadDataSources = useCallback(async () => {
    setIsLoadingDataSources(true);
    try {
      const response = await fetch(`/api/workspaces/${workspace.id}/data-sources`);
      if (response.ok) {
        const data = await response.json();
        setDataSources(data.dataSources || []);
      }
    } catch (error) {
      console.error('Failed to load data sources:', error);
    } finally {
      setIsLoadingDataSources(false);
    }
  }, [workspace.id]);

  useEffect(() => {
    if (activeTab === 'documents' && isOpen) loadDocuments();
    if (activeTab === 'data-sources' && isOpen) loadDataSources();
  }, [activeTab, isOpen, loadDocuments, loadDataSources]);

  // Upload document function
  const uploadDocument = useCallback(async (file: File) => {
    setIsUploadingDocument(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(`/api/workspaces/${workspace.id}/documents`, {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }
      
      toast.success('Document uploaded successfully');
      loadDocuments();
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload document');
    } finally {
      setIsUploadingDocument(false);
    }
  }, [workspace.id, loadDocuments]);

  // Drag and drop handlers - must be before early return
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (!extension || !['pdf', 'txt'].includes(extension)) {
        toast.error('Please select a PDF or TXT file');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size exceeds 10MB limit');
        return;
      }
      uploadDocument(file);
    }
  }, [uploadDocument]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  if (!isOpen) return null;

  const showSaveMessage = (type: 'success' | 'error', text: string) => {
    setSaveMessage({ type, text });
    setTimeout(() => setSaveMessage(null), 3000);
  };

  // Document upload handlers
  const handleFileSelect = (file: File) => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !['pdf', 'txt'].includes(extension)) {
      toast.error('Please select a PDF or TXT file');
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size exceeds 10MB limit');
      return;
    }
    
    uploadDocument(file);
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    
    setDeletingDocId(documentId);
    try {
      const response = await fetch(
        `/api/workspaces/${workspace.id}/documents?documentId=${documentId}`,
        { method: 'DELETE' }
      );
      
      if (response.ok) {
        setDocuments(documents.filter(d => d.id !== documentId));
        toast.success('Document deleted');
      } else {
        throw new Error('Failed to delete');
      }
    } catch (error) {
      toast.error('Failed to delete document');
    } finally {
      setDeletingDocId(null);
    }
  };

  const handleSaveGeneral = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/workspaces/${workspace.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      });

      if (response.ok) {
        const data = await response.json();
        onWorkspaceUpdate({ ...workspace, name, description });
        showSaveMessage('success', 'Workspace updated successfully');
      } else {
        showSaveMessage('error', 'Failed to update workspace');
      }
    } catch (error) {
      showSaveMessage('error', 'Failed to update workspace');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveContext = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/workspaces/${workspace.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context }),
      });

      if (response.ok) {
        onWorkspaceUpdate({ ...workspace, context });
        showSaveMessage('success', 'Context saved successfully');
      } else {
        showSaveMessage('error', 'Failed to save context');
      }
    } catch (error) {
      showSaveMessage('error', 'Failed to save context');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!confirm('Are you sure you want to delete this workspace? This action cannot be undone.')) return;
    
    setIsSaving(true);
    try {
      const response = await fetch(`/api/workspaces/${workspace.id}`, { method: 'DELETE' });
      if (response.ok) {
        showSaveMessage('success', 'Workspace deleted successfully');
        setTimeout(() => onWorkspaceDelete?.(), 1000);
      } else {
        showSaveMessage('error', 'Failed to delete workspace');
      }
    } catch (error) {
      showSaveMessage('error', 'Failed to delete workspace');
    } finally {
      setIsSaving(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl h-[80vh] bg-light-primary dark:bg-dark-primary rounded-2xl shadow-2xl m-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-light-200 dark:border-dark-200">
          <div className="flex items-center gap-3">
            <div className="text-2xl">{workspace.icon}</div>
            <div>
              <h2 className="text-xl font-bold text-black dark:text-white">Workspace Settings</h2>
              <p className="text-sm text-black/60 dark:text-white/60">{workspace.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-light-200 dark:hover:bg-dark-200 rounded-lg transition-colors">
            <X className="w-5 h-5 text-black dark:text-white" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-light-200 dark:border-dark-200 px-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 border-b-2 transition-colors text-sm font-medium',
                  activeTab === tab.id
                    ? 'border-[#24A0ED] text-[#24A0ED]'
                    : 'border-transparent text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-black dark:text-white mb-2">Workspace Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 bg-light-secondary dark:bg-dark-secondary border border-light-200 dark:border-dark-200 rounded-lg text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#24A0ED]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black dark:text-white mb-2">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 bg-light-secondary dark:bg-dark-secondary border border-light-200 dark:border-dark-200 rounded-lg text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#24A0ED] resize-none"
                />
              </div>
              <div className="flex items-center justify-between pt-6 border-t border-light-200 dark:border-dark-200">
                <button
                  onClick={handleSaveGeneral}
                  disabled={isSaving}
                  className="px-6 py-2 bg-[#24A0ED] hover:bg-[#1d8bd1] text-white rounded-lg transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
                >
                  {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Changes
                </button>
                <button
                  onClick={handleDeleteWorkspace}
                  className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Workspace
                </button>
              </div>
            </div>
          )}

          {activeTab === 'agents' && (
            <AgentsList workspaceId={workspace.id} />
          )}

          {activeTab === 'context' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-black dark:text-white mb-2">Workspace Context</label>
                <p className="text-sm text-black/60 dark:text-white/60 mb-3">
                  Provide context about this workspace to help AI provide more relevant responses.
                </p>
                <textarea
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  rows={12}
                  className="w-full px-4 py-3 bg-light-secondary dark:bg-dark-secondary border border-light-200 dark:border-dark-200 rounded-lg text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#24A0ED] resize-none font-mono text-sm"
                  placeholder="Example: This workspace is for analyzing customer feedback data..."
                />
              </div>
              <button
                onClick={handleSaveContext}
                disabled={isSaving}
                className="px-6 py-2 bg-[#24A0ED] hover:bg-[#1d8bd1] text-white rounded-lg transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Context
              </button>
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-black dark:text-white">Knowledge Base</h3>
                <p className="text-sm text-black/60 dark:text-white/60">
                  Upload PDF or TXT files to add them to the workspace knowledge base. The AI will use these documents to answer questions.
                </p>
              </div>
              
              {/* Upload Zone */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
                  isUploadingDocument
                    ? 'border-[#24A0ED] bg-[#24A0ED]/5'
                    : 'border-light-200 dark:border-dark-200 hover:border-[#24A0ED] hover:bg-[#24A0ED]/5'
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.txt"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                  className="hidden"
                />
                
                {isUploadingDocument ? (
                  <div className="space-y-2">
                    <Loader2 className="w-10 h-10 text-[#24A0ED] mx-auto animate-spin" />
                    <p className="text-sm text-black/60 dark:text-white/60">
                      Uploading and processing document...
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-10 h-10 text-black/30 dark:text-white/30 mx-auto" />
                    <p className="text-sm text-black/60 dark:text-white/60">
                      Drag & drop a file here, or click to browse
                    </p>
                    <p className="text-xs text-black/40 dark:text-white/40">
                      Supported: PDF, TXT (max 10MB)
                    </p>
                  </div>
                )}
              </div>
              
              {/* Documents List */}
              {isLoadingDocuments ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-[#24A0ED]" />
                </div>
              ) : documents.length === 0 ? (
                <div className="text-center py-6 text-sm text-black/50 dark:text-white/50">
                  No documents uploaded yet
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-black dark:text-white mb-3">
                    {documents.length} {documents.length === 1 ? 'document' : 'documents'}
                  </div>
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-4 bg-light-secondary dark:bg-dark-secondary rounded-lg group">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FileText className="w-5 h-5 text-[#24A0ED] flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-black dark:text-white truncate">{doc.filename}</p>
                          <p className="text-xs text-black/60 dark:text-white/60">
                            {doc.fileType?.toUpperCase()} • {doc.fileSize && formatFileSize(doc.fileSize)}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteDocument(doc.id)}
                        disabled={deletingDocId === doc.id}
                        className="p-2 text-black/40 dark:text-white/40 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      >
                        {deletingDocId === doc.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'data-sources' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-black dark:text-white">Connected Data Sources</h3>
                <p className="text-sm text-black/60 dark:text-white/60">Connect databases to query live data</p>
              </div>
              {isLoadingDataSources ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-[#24A0ED]" />
                </div>
              ) : dataSources.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-light-200 dark:border-dark-200 rounded-lg">
                  <Database className="w-12 h-12 text-black/30 dark:text-white/30 mx-auto mb-3" />
                  <p className="text-sm text-black/60 dark:text-white/60">No data sources connected yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {dataSources.map((ds) => (
                    <div key={ds.id} className="flex items-center justify-between p-4 bg-light-secondary dark:bg-dark-secondary rounded-lg">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Database className="w-5 h-5 text-[#24A0ED] flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-black dark:text-white">{ds.name}</p>
                          <p className="text-xs text-black/60 dark:text-white/60">{ds.type}</p>
                        </div>
                      </div>
                      <div className={cn(
                        'px-2 py-1 rounded text-xs font-medium',
                        ds.status === 'active' ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300'
                      )}>
                        {ds.status}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Save Message */}
        {saveMessage && (
          <div className="absolute bottom-6 right-6 z-10">
            <div className={cn(
              'flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium',
              saveMessage.type === 'success' ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300'
            )}>
              {saveMessage.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              {saveMessage.text}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
