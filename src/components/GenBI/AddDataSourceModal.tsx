'use client';

import { useState, useRef, useCallback } from 'react';
import {
  X,
  Upload,
  Database,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface AddDataSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  onDataSourceAdded: () => void;
}

type TabType = 'upload' | 'database';
type DatabaseType = 'postgresql' | 'mysql' | 'sqlite';

interface ConnectionTestResult {
  success: boolean;
  message?: string;
  error?: string;
}

export default function AddDataSourceModal({
  isOpen,
  onClose,
  workspaceId,
  onDataSourceAdded,
}: AddDataSourceModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('upload');
  
  // Upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<any[] | null>(null);
  const [uploadColumns, setUploadColumns] = useState<Array<{ name: string; type: string }> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Database connection state
  const [dbType, setDbType] = useState<DatabaseType>('postgresql');
  const [dbName, setDbName] = useState('');
  const [dbHost, setDbHost] = useState('localhost');
  const [dbPort, setDbPort] = useState('5432');
  const [dbDatabase, setDbDatabase] = useState('');
  const [dbUsername, setDbUsername] = useState('');
  const [dbPassword, setDbPassword] = useState('');
  const [dbFilePath, setDbFilePath] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);

  const resetState = () => {
    setSelectedFile(null);
    setUploadName('');
    setUploadPreview(null);
    setUploadColumns(null);
    setDbName('');
    setDbHost('localhost');
    setDbPort('5432');
    setDbDatabase('');
    setDbUsername('');
    setDbPassword('');
    setDbFilePath('');
    setTestResult(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  // File upload handlers
  const handleFileSelect = (file: File) => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !['csv', 'xlsx', 'xls', 'tsv'].includes(extension)) {
      toast.error('Please select a CSV, XLSX, XLS, or TSV file');
      return;
    }
    
    setSelectedFile(file);
    setUploadName(file.name.replace(/\.[^/.]+$/, ''));
    setUploadPreview(null);
    setUploadColumns(null);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleUpload = async () => {
    if (!selectedFile) return;
    
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('name', uploadName || selectedFile.name.replace(/\.[^/.]+$/, ''));
      
      const response = await fetch(`/api/workspaces/${workspaceId}/data-sources/upload`, {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }
      
      toast.success('Data source added successfully');
      onDataSourceAdded();
      handleClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  };

  // Database connection handlers
  const getDefaultPort = (type: DatabaseType) => {
    switch (type) {
      case 'postgresql': return '5432';
      case 'mysql': return '3306';
      default: return '';
    }
  };

  const handleDbTypeChange = (type: DatabaseType) => {
    setDbType(type);
    setDbPort(getDefaultPort(type));
    setTestResult(null);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    
    try {
      const config = dbType === 'sqlite'
        ? { database: dbFilePath }
        : {
            host: dbHost,
            port: parseInt(dbPort) || undefined,
            database: dbDatabase,
            username: dbUsername,
            password: dbPassword,
          };
      
      const response = await fetch(`/api/workspaces/${workspaceId}/data-sources/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: dbType, config }),
      });
      
      const data = await response.json();
      setTestResult(data);
    } catch (error: any) {
      setTestResult({ success: false, error: error.message || 'Connection test failed' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleConnect = async () => {
    if (!testResult?.success) {
      toast.error('Please test the connection first');
      return;
    }
    
    setIsConnecting(true);
    try {
      const config = dbType === 'sqlite'
        ? { database: dbFilePath }
        : {
            host: dbHost,
            port: parseInt(dbPort) || undefined,
            database: dbDatabase,
            username: dbUsername,
            password: dbPassword,
          };
      
      const response = await fetch(`/api/workspaces/${workspaceId}/data-sources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: dbName || dbDatabase || 'Database',
          type: dbType,
          config,
          createdBy: 'user',
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to connect');
      }
      
      toast.success('Database connected successfully');
      onDataSourceAdded();
      handleClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to connect database');
    } finally {
      setIsConnecting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white dark:bg-dark-secondary rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-dark-200">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Add Data Source
          </h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-dark-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-dark-200">
          <button
            onClick={() => setActiveTab('upload')}
            className={cn(
              'flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors border-b-2',
              activeTab === 'upload'
                ? 'text-pink-500 border-pink-500'
                : 'text-gray-600 dark:text-gray-400 border-transparent hover:text-gray-900 dark:hover:text-white'
            )}
          >
            <Upload className="w-4 h-4" />
            Upload File
          </button>
          <button
            onClick={() => setActiveTab('database')}
            className={cn(
              'flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors border-b-2',
              activeTab === 'database'
                ? 'text-pink-500 border-pink-500'
                : 'text-gray-600 dark:text-gray-400 border-transparent hover:text-gray-900 dark:hover:text-white'
            )}
          >
            <Database className="w-4 h-4" />
            Connect Database
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'upload' && (
            <div className="space-y-6">
              {/* Drop zone */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
                  selectedFile
                    ? 'border-pink-300 bg-pink-50 dark:bg-pink-900/10'
                    : 'border-gray-300 dark:border-dark-200 hover:border-pink-300 hover:bg-pink-50/50 dark:hover:bg-pink-900/5'
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls,.tsv"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                  className="hidden"
                />
                
                {selectedFile ? (
                  <div className="space-y-2">
                    <FileSpreadsheet className="w-12 h-12 text-pink-500 mx-auto" />
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                        setUploadName('');
                      }}
                      className="text-xs text-pink-500 hover:text-pink-600"
                    >
                      Remove file
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Drag & drop a file here, or click to browse
                    </p>
                    <p className="text-xs text-gray-500">
                      Supported: CSV, XLSX, XLS, TSV (max 50MB)
                    </p>
                  </div>
                )}
              </div>
              
              {/* Name input */}
              {selectedFile && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Data Source Name
                  </label>
                  <input
                    type="text"
                    value={uploadName}
                    onChange={(e) => setUploadName(e.target.value)}
                    placeholder="Enter a name for this data source"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-dark-200 rounded-lg bg-white dark:bg-dark-primary text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'database' && (
            <div className="space-y-6">
              {/* Database type selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Database Type
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { type: 'postgresql' as DatabaseType, label: 'PostgreSQL', icon: '🐘' },
                    { type: 'mysql' as DatabaseType, label: 'MySQL', icon: '🐬' },
                    { type: 'sqlite' as DatabaseType, label: 'SQLite', icon: '💾' },
                  ].map((db) => (
                    <button
                      key={db.type}
                      onClick={() => handleDbTypeChange(db.type)}
                      className={cn(
                        'flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-colors',
                        dbType === db.type
                          ? 'border-pink-500 bg-pink-50 dark:bg-pink-900/20'
                          : 'border-gray-200 dark:border-dark-200 hover:border-pink-300'
                      )}
                    >
                      <span className="text-xl">{db.icon}</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {db.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Connection name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Connection Name
                </label>
                <input
                  type="text"
                  value={dbName}
                  onChange={(e) => setDbName(e.target.value)}
                  placeholder="e.g., Production Database"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-dark-200 rounded-lg bg-white dark:bg-dark-primary text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>
              
              {dbType === 'sqlite' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Database File Path
                  </label>
                  <input
                    type="text"
                    value={dbFilePath}
                    onChange={(e) => setDbFilePath(e.target.value)}
                    placeholder="/path/to/database.db"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-dark-200 rounded-lg bg-white dark:bg-dark-primary text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Host
                      </label>
                      <input
                        type="text"
                        value={dbHost}
                        onChange={(e) => setDbHost(e.target.value)}
                        placeholder="localhost"
                        className="w-full px-4 py-2 border border-gray-300 dark:border-dark-200 rounded-lg bg-white dark:bg-dark-primary text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Port
                      </label>
                      <input
                        type="text"
                        value={dbPort}
                        onChange={(e) => setDbPort(e.target.value)}
                        placeholder={getDefaultPort(dbType)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-dark-200 rounded-lg bg-white dark:bg-dark-primary text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Database Name
                    </label>
                    <input
                      type="text"
                      value={dbDatabase}
                      onChange={(e) => setDbDatabase(e.target.value)}
                      placeholder="myapp"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-dark-200 rounded-lg bg-white dark:bg-dark-primary text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Username
                      </label>
                      <input
                        type="text"
                        value={dbUsername}
                        onChange={(e) => setDbUsername(e.target.value)}
                        placeholder="postgres"
                        className="w-full px-4 py-2 border border-gray-300 dark:border-dark-200 rounded-lg bg-white dark:bg-dark-primary text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Password
                      </label>
                      <input
                        type="password"
                        value={dbPassword}
                        onChange={(e) => setDbPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-4 py-2 border border-gray-300 dark:border-dark-200 rounded-lg bg-white dark:bg-dark-primary text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                      />
                    </div>
                  </div>
                </>
              )}
              
              {/* Test connection button and result */}
              <div className="flex items-center gap-4">
                <button
                  onClick={handleTestConnection}
                  disabled={isTesting || (dbType === 'sqlite' ? !dbFilePath : !dbHost || !dbDatabase)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-dark-200 hover:bg-gray-200 dark:hover:bg-dark-300 text-gray-900 dark:text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {isTesting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Database className="w-4 h-4" />
                  )}
                  Test Connection
                </button>
                
                {testResult && (
                  <div className={cn(
                    'flex items-center gap-2 text-sm',
                    testResult.success ? 'text-green-600' : 'text-red-600'
                  )}>
                    {testResult.success ? (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Connection successful
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4" />
                        {testResult.error || 'Connection failed'}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-dark-200 bg-gray-50 dark:bg-dark-primary">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          
          {activeTab === 'upload' ? (
            <button
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
              className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Add Data Source
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleConnect}
              disabled={!testResult?.success || isConnecting}
              className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Database className="w-4 h-4" />
                  Connect
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
