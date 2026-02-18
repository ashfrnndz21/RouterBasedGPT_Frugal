'use client';

import { useState, useEffect } from 'react';
import { FileText, File } from 'lucide-react';

interface WorkspaceDocument {
  id: string;
  workspaceId: string;
  filename: string;
  fileType: string;
  uploadedBy: string;
  uploadedAt: Date;
  fileSize: number;
}

interface DocumentsListProps {
  workspaceId: string;
}

export default function DocumentsList({ workspaceId }: DocumentsListProps) {
  const [documents, setDocuments] = useState<WorkspaceDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDocuments();
  }, [workspaceId]);

  const loadDocuments = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/workspaces/${workspaceId}/documents`);
      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents || []);
      }
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case 'pdf':
        return '📄';
      case 'txt':
        return '📝';
      case 'docx':
        return '📘';
      case 'csv':
        return '📊';
      case 'xlsx':
        return '📗';
      default:
        return '📄';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#24A0ED]"></div>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-6 px-4">
        <FileText className="w-8 h-8 text-black/30 dark:text-white/30 mx-auto mb-2" />
        <p className="text-xs text-black/60 dark:text-white/60 mb-3">
          No documents uploaded yet
        </p>
        <p className="text-xs text-black/50 dark:text-white/50">
          Upload documents in workspace settings to enable document search
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-xs text-black/60 dark:text-white/60 mb-3">
        {documents.length} {documents.length === 1 ? 'document' : 'documents'}
      </div>
      {documents.map((doc) => (
        <div
          key={doc.id}
          className="bg-light-primary dark:bg-dark-primary rounded-lg p-3 border border-light-200 dark:border-dark-200 hover:border-[#24A0ED]/30 transition-colors"
        >
          <div className="flex items-start gap-2">
            <span className="text-lg flex-shrink-0">{getFileIcon(doc.fileType)}</span>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-medium text-black dark:text-white truncate mb-1">
                {doc.filename}
              </h4>
              <div className="flex items-center gap-2 text-xs text-black/50 dark:text-white/50">
                <span className="uppercase">{doc.fileType}</span>
                <span>•</span>
                <span>{formatFileSize(doc.fileSize)}</span>
              </div>
              <div className="text-xs text-black/50 dark:text-white/50 mt-1">
                {formatDate(doc.uploadedAt)}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
