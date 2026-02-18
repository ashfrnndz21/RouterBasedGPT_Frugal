'use client';

import { useState, useEffect } from 'react';
import { Database, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface DataSourceConnection {
  id: string;
  workspaceId: string;
  name: string;
  type: 'postgresql' | 'mysql' | 'sqlite' | 'csv';
  status: 'active' | 'error' | 'testing';
  rowCount?: number;
  columns?: Array<{ name: string; type: string }>;
  lastTested: Date | null;
  createdAt: Date;
}

interface DataSourcesListProps {
  workspaceId: string;
}

export default function DataSourcesList({ workspaceId }: DataSourcesListProps) {
  const [dataSources, setDataSources] = useState<DataSourceConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDataSources();
  }, [workspaceId]);

  const loadDataSources = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/workspaces/${workspaceId}/data-sources`);
      if (response.ok) {
        const data = await response.json();
        setDataSources(data.dataSources || []);
      }
    } catch (error) {
      console.error('Failed to load data sources:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-3.5 h-3.5 text-green-500" />;
      case 'error':
        return <XCircle className="w-3.5 h-3.5 text-red-500" />;
      case 'testing':
        return <AlertCircle className="w-3.5 h-3.5 text-yellow-500" />;
      default:
        return <AlertCircle className="w-3.5 h-3.5 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Connected';
      case 'error':
        return 'Error';
      case 'testing':
        return 'Testing';
      default:
        return 'Unknown';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'postgresql':
        return 'PostgreSQL';
      case 'mysql':
        return 'MySQL';
      case 'sqlite':
        return 'SQLite';
      case 'csv':
        return 'CSV';
      default:
        return type;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'postgresql':
        return '🐘';
      case 'mysql':
        return '🐬';
      case 'sqlite':
        return '💾';
      case 'csv':
        return '📊';
      default:
        return '💾';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#24A0ED]"></div>
      </div>
    );
  }

  if (dataSources.length === 0) {
    return (
      <div className="text-center py-6 px-4">
        <Database className="w-8 h-8 text-black/30 dark:text-white/30 mx-auto mb-2" />
        <p className="text-xs text-black/60 dark:text-white/60 mb-3">
          No data sources connected
        </p>
        <p className="text-xs text-black/50 dark:text-white/50">
          Connect databases in workspace settings to enable data queries
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-xs text-black/60 dark:text-white/60 mb-3">
        {dataSources.length} {dataSources.length === 1 ? 'source' : 'sources'} connected
      </div>
      {dataSources.map((source) => (
        <div
          key={source.id}
          className="bg-light-primary dark:bg-dark-primary rounded-lg p-3 border border-light-200 dark:border-dark-200 hover:border-[#24A0ED]/30 transition-colors"
        >
          <div className="flex items-start gap-2">
            <span className="text-lg flex-shrink-0">{getTypeIcon(source.type)}</span>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-medium text-black dark:text-white truncate mb-1">
                {source.name}
              </h4>
              <div className="flex items-center gap-2 text-xs text-black/50 dark:text-white/50 mb-2">
                <span>{getTypeLabel(source.type)}</span>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(source.status)}
                <span className="text-xs text-black/60 dark:text-white/60">
                  {getStatusText(source.status)}
                </span>
              </div>
              {source.lastTested && (
                <div className="text-xs text-black/50 dark:text-white/50 mt-1">
                  Last tested: {formatDate(source.lastTested)}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
