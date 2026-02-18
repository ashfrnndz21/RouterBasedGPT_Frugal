'use client';

import { useState, useEffect } from 'react';
import {
  Database,
  BarChart3,
  Save,
  ArrowLeft,
  Plus,
  Trash2,
  Play,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  ChevronDown,
  ChevronUp,
  Table,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import AddDataSourceModal from './AddDataSourceModal';

interface GenBIDashboardProps {
  workspaceId: string;
}

interface DataSource {
  id: string;
  name: string;
  type: 'postgresql' | 'mysql' | 'sqlite' | 'csv';
  status: 'active' | 'error' | 'testing';
  rowCount?: number;
  columns?: Array<{ name: string; type: string }>;
  lastTested?: string;
  createdAt: string;
}

interface QueryResult {
  columns: string[];
  rows: any[];
  rowCount: number;
}

type TabType = 'query' | 'data-sources' | 'saved-queries';
type QueryMode = 'natural' | 'sql';

export default function GenBIDashboard({ workspaceId }: GenBIDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabType>('data-sources');
  const router = useRouter();
  
  // Data sources state
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [isLoadingDataSources, setIsLoadingDataSources] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // Query state
  const [selectedDataSource, setSelectedDataSource] = useState<string>('');
  const [queryMode, setQueryMode] = useState<QueryMode>('natural');
  const [naturalQuery, setNaturalQuery] = useState('');
  const [sqlQuery, setSqlQuery] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [generatedSql, setGeneratedSql] = useState<string | null>(null);
  const [resultSummary, setResultSummary] = useState<string | null>(null);
  const [suggestedQueries, setSuggestedQueries] = useState<string[]>([]);
  const [showTableView, setShowTableView] = useState(false);
  const [autoExecute, setAutoExecute] = useState(true); // Agent mode - auto execute by default

  const tabs = [
    { id: 'query' as TabType, label: 'Query', icon: BarChart3 },
    { id: 'data-sources' as TabType, label: 'Data Sources', icon: Database },
    { id: 'saved-queries' as TabType, label: 'Saved Queries', icon: Save },
  ];

  // Load data sources
  useEffect(() => {
    loadDataSources();
  }, [workspaceId]);

  const loadDataSources = async () => {
    try {
      setIsLoadingDataSources(true);
      const response = await fetch(`/api/workspaces/${workspaceId}/data-sources`);
      if (response.ok) {
        const data = await response.json();
        setDataSources(data.dataSources || []);
        
        // Auto-select first data source if none selected
        if (data.dataSources?.length > 0 && !selectedDataSource) {
          setSelectedDataSource(data.dataSources[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to load data sources:', error);
    } finally {
      setIsLoadingDataSources(false);
    }
  };

  const handleDeleteDataSource = async (id: string) => {
    if (!confirm('Are you sure you want to delete this data source?')) return;
    
    setDeletingId(id);
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/data-sources/${id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setDataSources(dataSources.filter(ds => ds.id !== id));
        if (selectedDataSource === id) {
          setSelectedDataSource(dataSources[0]?.id || '');
        }
        toast.success('Data source deleted');
      } else {
        throw new Error('Failed to delete');
      }
    } catch (error) {
      toast.error('Failed to delete data source');
    } finally {
      setDeletingId(null);
    }
  };

  // Get selected data source details for schema
  const getSelectedDataSourceSchema = () => {
    const ds = dataSources.find(d => d.id === selectedDataSource);
    if (!ds) return null;
    return ds;
  };

  // Generate SQL from natural language
  const handleGenerateSQL = async () => {
    if (!selectedDataSource || !naturalQuery.trim()) {
      toast.error('Please select a data source and enter a question');
      return;
    }
    
    const ds = getSelectedDataSourceSchema();
    if (!ds) {
      toast.error('Data source not found');
      return;
    }
    
    setIsGenerating(true);
    setQueryError(null);
    setGeneratedSql(null);
    setQueryResult(null);
    setResultSummary(null);
    
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/data-sources/${selectedDataSource}/generate-sql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: naturalQuery,
          schema: ds.columns,
          tableName: ds.name,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate SQL');
      }
      
      setGeneratedSql(data.sql);
      setSqlQuery(data.sql);
      
      // Auto-execute if agent mode is enabled
      if (autoExecute && data.sql) {
        setIsGenerating(false);
        await executeQuery(data.sql, naturalQuery);
        return;
      }
    } catch (error: any) {
      setQueryError(error.message || 'Failed to generate SQL');
    } finally {
      setIsGenerating(false);
    }
  };

  // Execute query with given SQL or from state
  const executeQuery = async (sql?: string, originalQuestion?: string) => {
    const queryToExecute = sql || sqlQuery;
    
    if (!selectedDataSource || !queryToExecute.trim()) {
      toast.error('Please select a data source and enter a query');
      return;
    }
    
    setIsExecuting(true);
    setQueryError(null);
    setQueryResult(null);
    setResultSummary(null);
    setShowTableView(false);
    
    try {
      const response = await fetch(
        `/api/workspaces/${workspaceId}/data-sources/${selectedDataSource}/query`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql: queryToExecute }),
        }
      );
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Query failed');
      }
      
      const result = {
        columns: data.columns || [],
        rows: data.rows || [],
        rowCount: data.rowCount || 0,
      };
      
      setQueryResult(result);
      
      // Auto-summarize results - use original question for better context
      if (result.rows.length > 0) {
        const questionForSummary = originalQuestion || naturalQuery || queryToExecute;
        await summarizeResults(result, questionForSummary, queryToExecute);
      }
    } catch (error: any) {
      setQueryError(error.message || 'Query execution failed');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleExecuteQuery = async () => {
    await executeQuery();
  };

  // Summarize query results using LLM
  const summarizeResults = async (result: QueryResult, question: string, sql?: string) => {
    setIsSummarizing(true);
    setSuggestedQueries([]);
    try {
      // For small results (<=20 rows), summarize all
      // For larger results, take first 20 and note there are more
      const rowsToSummarize = result.rows.slice(0, 20);
      const hasMore = result.rows.length > 20;
      
      const response = await fetch(`/api/workspaces/${workspaceId}/data-sources/${selectedDataSource}/summarize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          sqlQuery: sql || sqlQuery,
          columns: result.columns,
          rows: rowsToSummarize,
          totalRows: result.rowCount,
          hasMore,
        }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.summary) {
        setResultSummary(data.summary);
        if (data.suggestedQueries && data.suggestedQueries.length > 0) {
          setSuggestedQueries(data.suggestedQueries);
        }
      }
    } catch (error) {
      console.error('Failed to summarize results:', error);
      // Generate a basic summary if LLM fails
      setResultSummary(generateBasicSummary(result, question));
    } finally {
      setIsSummarizing(false);
    }
  };

  // Basic summary fallback
  const generateBasicSummary = (result: QueryResult, question: string): string => {
    if (result.rows.length === 0) {
      return 'No results found for your query.';
    }
    
    if (result.rows.length === 1 && result.columns.length <= 3) {
      // Single row result - likely an aggregation
      const values = result.columns.map(col => `${col}: ${result.rows[0][col]}`).join(', ');
      return `Result: ${values}`;
    }
    
    return `Found ${result.rowCount} result${result.rowCount !== 1 ? 's' : ''}.`;
  };

  const handleExportCSV = () => {
    if (!queryResult || queryResult.rows.length === 0) return;
    
    const headers = queryResult.columns.join(',');
    const rows = queryResult.rows.map(row => 
      queryResult.columns.map(col => {
        const value = row[col];
        // Escape quotes and wrap in quotes if contains comma
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value ?? '';
      }).join(',')
    ).join('\n');
    
    const csv = `${headers}\n${rows}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'query_results.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'postgresql': return '🐘';
      case 'mysql': return '🐬';
      case 'sqlite': return '💾';
      case 'csv': return '📊';
      default: return '💾';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    }
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-pink-50 via-purple-50 to-pink-100 dark:from-gray-900 dark:via-pink-900/20 dark:to-purple-900/20">
      {/* Header */}
      <div className="border-b border-pink-100 dark:border-pink-900/30 bg-gradient-to-r from-pink-500 to-purple-500">
        <div className="px-6 py-4">
          <button
            onClick={() => router.push(`/workspaces/${workspaceId}`)}
            className="flex items-center gap-2 text-white/80 hover:text-white mb-3 transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Workspace</span>
          </button>
          <h1 className="text-2xl font-bold text-white mb-1">
            GenBI - Business Intelligence
          </h1>
          <p className="text-sm text-white/90">
            Query your data sources using SQL
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 overflow-x-auto bg-white/80 dark:bg-black/20 backdrop-blur-sm">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all duration-200 whitespace-nowrap border-b-2',
                  activeTab === tab.id
                    ? 'text-pink-500 border-pink-500 bg-pink-50/50 dark:bg-pink-900/20'
                    : 'text-gray-600 dark:text-gray-300 border-transparent hover:text-pink-500 hover:bg-pink-50/30 dark:hover:bg-pink-900/10'
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {tab.id === 'data-sources' && dataSources.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-300 rounded-full">
                    {dataSources.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Query Tab */}
        {activeTab === 'query' && (
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Query Input */}
            <div className="bg-white/90 dark:bg-dark-secondary backdrop-blur-sm rounded-2xl shadow-lg border border-pink-100 dark:border-pink-900/30 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                  Query Your Data
                </h2>
                
                {/* Data source selector */}
                <select
                  value={selectedDataSource}
                  onChange={(e) => setSelectedDataSource(e.target.value)}
                  className="px-4 py-2 bg-gray-50 dark:bg-dark-primary border border-gray-200 dark:border-dark-200 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                >
                  <option value="">Select data source...</option>
                  {dataSources.map((ds) => (
                    <option key={ds.id} value={ds.id}>
                      {getTypeIcon(ds.type)} {ds.name}
                    </option>
                  ))}
                </select>
              </div>
              
              {dataSources.length === 0 ? (
                <div className="text-center py-8">
                  <Database className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    No data sources connected yet
                  </p>
                  <button
                    onClick={() => {
                      setActiveTab('data-sources');
                      setShowAddModal(true);
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white rounded-lg transition-colors"
                  >
                    Add Data Source
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Query Mode Toggle and Agent Mode */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 p-1 bg-gray-100 dark:bg-dark-200 rounded-lg w-fit">
                      <button
                        onClick={() => setQueryMode('natural')}
                        className={cn(
                          'px-4 py-1.5 text-sm font-medium rounded-md transition-colors',
                          queryMode === 'natural'
                            ? 'bg-white dark:bg-dark-primary text-pink-500 shadow-sm'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                        )}
                      >
                        Natural Language
                      </button>
                      <button
                        onClick={() => setQueryMode('sql')}
                        className={cn(
                          'px-4 py-1.5 text-sm font-medium rounded-md transition-colors',
                          queryMode === 'sql'
                            ? 'bg-white dark:bg-dark-primary text-pink-500 shadow-sm'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                        )}
                      >
                        SQL
                      </button>
                    </div>
                    
                    {/* Agent Mode Toggle - only show in natural language mode */}
                    {queryMode === 'natural' && (
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Agent Mode</span>
                        <button
                          onClick={() => setAutoExecute(!autoExecute)}
                          className={cn(
                            'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2',
                            autoExecute 
                              ? 'bg-pink-500' 
                              : 'bg-gray-300 dark:bg-gray-600'
                          )}
                        >
                          <span
                            className={cn(
                              'inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform',
                              autoExecute ? 'translate-x-6' : 'translate-x-1'
                            )}
                          />
                        </button>
                        <span className={cn(
                          'text-xs font-medium',
                          autoExecute ? 'text-pink-500' : 'text-gray-500 dark:text-gray-400'
                        )}>
                          {autoExecute ? 'Auto' : 'Manual'}
                        </span>
                      </div>
                    )}
                  </div>

                  {queryMode === 'natural' ? (
                    <>
                      {/* Natural Language Input */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Ask a question about your data
                        </label>
                        <textarea
                          value={naturalQuery}
                          onChange={(e) => setNaturalQuery(e.target.value)}
                          placeholder="e.g., Show me the top 10 customers by total sales, What is the average order value by month?"
                          className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-primary border border-gray-200 dark:border-dark-200 rounded-xl text-black dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
                          rows={3}
                        />
                      </div>
                      
                      <button
                        onClick={handleGenerateSQL}
                        disabled={isGenerating || isExecuting || !selectedDataSource || !naturalQuery.trim()}
                        className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white rounded-lg transition-colors disabled:opacity-50"
                      >
                        {isGenerating ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Generating SQL...
                          </>
                        ) : isExecuting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Executing...
                          </>
                        ) : (
                          <>
                            <BarChart3 className="w-4 h-4" />
                            {autoExecute ? 'Ask' : 'Generate SQL'}
                          </>
                        )}
                      </button>
                      
                      {/* Generated SQL Display */}
                      {generatedSql && (
                        <div className="mt-4 p-4 bg-gray-50 dark:bg-dark-primary rounded-xl border border-gray-200 dark:border-dark-200">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Generated SQL
                            </span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(generatedSql);
                                toast.success('SQL copied to clipboard');
                              }}
                              className="text-xs text-pink-500 hover:text-pink-600"
                            >
                              Copy
                            </button>
                          </div>
                          <pre className="text-sm text-gray-800 dark:text-gray-200 font-mono whitespace-pre-wrap bg-white dark:bg-dark-secondary p-3 rounded-lg border border-gray-200 dark:border-dark-200">
                            {generatedSql}
                          </pre>
                          <div className="flex items-center gap-3 mt-4">
                            {/* Only show Execute button in manual mode */}
                            {!autoExecute && (
                              <button
                                onClick={handleExecuteQuery}
                                disabled={isExecuting}
                                className="flex items-center gap-2 px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors disabled:opacity-50"
                              >
                                {isExecuting ? (
                                  <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Executing...
                                  </>
                                ) : (
                                  <>
                                    <Play className="w-4 h-4" />
                                    Execute Query
                                  </>
                                )}
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setQueryMode('sql');
                              }}
                              className="text-sm text-gray-600 dark:text-gray-400 hover:text-pink-500"
                            >
                              Edit SQL
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {/* SQL Input */}
                      <textarea
                        value={sqlQuery}
                        onChange={(e) => setSqlQuery(e.target.value)}
                        placeholder="SELECT * FROM your_table LIMIT 10"
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-primary border border-gray-200 dark:border-dark-200 rounded-xl text-black dark:text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
                        rows={4}
                      />
                      <div className="flex items-center gap-3">
                        <button
                          onClick={handleExecuteQuery}
                          disabled={isExecuting || !selectedDataSource || !sqlQuery.trim()}
                          className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white rounded-lg transition-colors disabled:opacity-50"
                        >
                          {isExecuting ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Executing...
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4" />
                              Run Query
                            </>
                          )}
                        </button>
                        
                        {queryResult && queryResult.rows.length > 0 && (
                          <button
                            onClick={handleExportCSV}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-dark-200 hover:bg-gray-200 dark:hover:bg-dark-300 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                          >
                            <Download className="w-4 h-4" />
                            Export CSV
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
            
            {/* Query Error */}
            {queryError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-red-800 dark:text-red-200">Query Error</h3>
                    <p className="text-sm text-red-600 dark:text-red-300 mt-1">{queryError}</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Query Results */}
            {queryResult && (
              <div className="bg-white/90 dark:bg-dark-secondary backdrop-blur-sm rounded-2xl shadow-lg border border-pink-100 dark:border-pink-900/30 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-dark-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Table className="w-5 h-5 text-pink-500" />
                    <h3 className="font-semibold text-gray-800 dark:text-white">
                      Results
                    </h3>
                    <span className="text-sm text-gray-500">
                      {queryResult.rowCount} rows
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {queryResult.rows.length > 0 && (
                      <>
                        <button
                          onClick={() => setShowTableView(!showTableView)}
                          className={cn(
                            'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors',
                            showTableView
                              ? 'bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-300'
                              : 'bg-gray-100 dark:bg-dark-200 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-dark-300'
                          )}
                        >
                          <Table className="w-4 h-4" />
                          {showTableView ? 'Hide Table' : 'View Table'}
                        </button>
                        <button
                          onClick={handleExportCSV}
                          className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-dark-200 hover:bg-gray-200 dark:hover:bg-dark-300 text-gray-700 dark:text-gray-300 rounded-lg transition-colors text-sm"
                        >
                          <Download className="w-4 h-4" />
                          Export
                        </button>
                      </>
                    )}
                  </div>
                </div>
                
                {queryResult.rows.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    No results returned
                  </div>
                ) : (
                  <div className="p-6">
                    {/* Summary Section */}
                    <div className="mb-4">
                      {isSummarizing ? (
                        <div className="flex items-center gap-2 text-gray-500">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm">Analyzing results...</span>
                        </div>
                      ) : resultSummary ? (
                        <div className="bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-900/20 dark:to-purple-900/20 rounded-xl p-4 border border-pink-100 dark:border-pink-800/30">
                          <div className="flex items-start gap-3">
                            <BarChart3 className="w-5 h-5 text-pink-500 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-800 dark:text-white mb-1">Summary</h4>
                              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{resultSummary}</p>
                              
                              {/* Suggested Queries */}
                              {suggestedQueries.length > 0 && (
                                <div className="mt-4 pt-3 border-t border-pink-200 dark:border-pink-800/30">
                                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                    💡 Try these queries for better results:
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {suggestedQueries.map((query, idx) => (
                                      <button
                                        key={idx}
                                        onClick={() => {
                                          setNaturalQuery(query);
                                          setQueryMode('natural');
                                        }}
                                        className="text-sm px-3 py-1.5 bg-white dark:bg-dark-secondary border border-pink-200 dark:border-pink-800/50 rounded-lg text-pink-600 dark:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-900/20 transition-colors"
                                      >
                                        {query}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : null}
                      
                      {/* Note about more rows */}
                      {queryResult.rows.length > 20 && (
                        <div className="mt-3 flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                          <AlertCircle className="w-4 h-4" />
                          <span>
                            Showing summary based on first 20 rows. Total: {queryResult.rowCount} rows.
                            {!showTableView && ' Click "View Table" to see all data.'}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Table View (toggleable) */}
                    {showTableView && (
                      <div className="overflow-x-auto border border-gray-200 dark:border-dark-200 rounded-xl">
                        <table className="w-full">
                          <thead className="bg-gray-50 dark:bg-dark-primary">
                            <tr>
                              {queryResult.columns.map((col, i) => (
                                <th
                                  key={i}
                                  className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider"
                                >
                                  {col}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 dark:divide-dark-200">
                            {queryResult.rows.slice(0, 100).map((row, rowIdx) => (
                              <tr key={rowIdx} className="hover:bg-gray-50 dark:hover:bg-dark-200/50">
                                {queryResult.columns.map((col, colIdx) => (
                                  <td
                                    key={colIdx}
                                    className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 whitespace-nowrap"
                                  >
                                    {row[col] === null ? (
                                      <span className="text-gray-400 italic">null</span>
                                    ) : (
                                      String(row[col])
                                    )}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {queryResult.rows.length > 100 && (
                          <div className="px-4 py-3 bg-gray-50 dark:bg-dark-primary text-sm text-gray-500 text-center">
                            Showing first 100 of {queryResult.rowCount} rows
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        
        {/* Data Sources Tab */}
        {activeTab === 'data-sources' && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white/90 dark:bg-dark-secondary backdrop-blur-sm rounded-2xl shadow-lg border border-pink-100 dark:border-pink-900/30 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                    Data Sources
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Connect databases or upload CSV files to query
                  </p>
                </div>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Data Source
                </button>
              </div>
              
              {isLoadingDataSources ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
                </div>
              ) : dataSources.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-200 dark:border-dark-200 rounded-xl">
                  <Database className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    No data sources connected yet
                  </p>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white rounded-lg transition-colors font-medium"
                  >
                    Add Data Source
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {dataSources.map((ds) => (
                    <div
                      key={ds.id}
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-primary rounded-xl border border-gray-200 dark:border-dark-200 hover:border-pink-300 dark:hover:border-pink-800 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-2xl">{getTypeIcon(ds.type)}</span>
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {ds.name}
                          </h3>
                          <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                            <span className="capitalize">{ds.type}</span>
                            {ds.rowCount !== undefined && (
                              <>
                                <span>•</span>
                                <span>{ds.rowCount.toLocaleString()} rows</span>
                              </>
                            )}
                            {ds.columns && (
                              <>
                                <span>•</span>
                                <span>{ds.columns.length} columns</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {getStatusIcon(ds.status)}
                        <button
                          onClick={() => handleDeleteDataSource(ds.id)}
                          disabled={deletingId === ds.id}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          {deletingId === ds.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Saved Queries Tab */}
        {activeTab === 'saved-queries' && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white/90 dark:bg-dark-secondary backdrop-blur-sm rounded-2xl shadow-lg border border-pink-100 dark:border-pink-900/30 p-6">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
                Saved Queries
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
                Reuse and share your frequently used queries
              </p>
              
              <div className="text-center py-12 border-2 border-dashed border-gray-200 dark:border-dark-200 rounded-xl">
                <Save className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No saved queries yet. Run a query and save it for later.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Add Data Source Modal */}
      <AddDataSourceModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        workspaceId={workspaceId}
        onDataSourceAdded={() => {
          loadDataSources();
          setShowAddModal(false);
        }}
      />
    </div>
  );
}
