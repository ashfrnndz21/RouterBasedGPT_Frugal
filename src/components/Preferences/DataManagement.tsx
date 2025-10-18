'use client';

import { useState, useEffect } from 'react';
import { preferenceManager } from '@/lib/preferences/preferenceManager';
import {
  Download,
  Upload,
  Trash2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Database,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DataManagementProps {
  className?: string;
}

const DataManagement = ({ className }: DataManagementProps) => {
  const [mounted, setMounted] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [storageInfo, setStorageInfo] = useState({ used: 0, total: 0, percentage: 0 });

  useEffect(() => {
    setMounted(true);
    setStorageInfo(preferenceManager.getStorageInfo());
  }, []);

  if (!mounted) {
    return <div className="text-sm text-black/60 dark:text-white/60">Loading data management...</div>;
  }

  // Show notification temporarily
  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // Export preferences
  const handleExport = () => {
    try {
      const data = preferenceManager.exportPreferences();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `truegpt-preferences-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showNotification('success', 'Preferences exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      showNotification('error', 'Failed to export preferences');
    }
  };

  // Import preferences
  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result as string;
        const success = preferenceManager.importPreferences(data);
        
        if (success) {
          showNotification('success', 'Preferences imported successfully. Refresh the page to see changes.');
          setStorageInfo(preferenceManager.getStorageInfo());
        } else {
          showNotification('error', 'Invalid preferences file format');
        }
      } catch (error) {
        console.error('Import error:', error);
        showNotification('error', 'Failed to import preferences');
      }
    };
    reader.readAsText(file);
    
    // Reset input
    event.target.value = '';
  };

  // Clear all data
  const handleClearData = () => {
    try {
      preferenceManager.clearAllData();
      setStorageInfo(preferenceManager.getStorageInfo());
      setShowClearConfirm(false);
      showNotification('success', 'All data cleared successfully. Refresh the page to see changes.');
    } catch (error) {
      console.error('Clear data error:', error);
      showNotification('error', 'Failed to clear data');
    }
  };

  // Format bytes to readable size
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const isStorageWarning = storageInfo.percentage > 80;

  return (
    <div className={cn('flex flex-col space-y-6', className)}>
      {/* Notification */}
      {notification && (
        <div
          className={cn(
            'flex items-center space-x-3 p-4 rounded-lg border',
            notification.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
          )}
        >
          {notification.type === 'success' ? (
            <CheckCircle className="text-green-600 dark:text-green-400" size={20} />
          ) : (
            <XCircle className="text-red-600 dark:text-red-400" size={20} />
          )}
          <p
            className={cn(
              'text-sm',
              notification.type === 'success'
                ? 'text-green-800 dark:text-green-200'
                : 'text-red-800 dark:text-red-200'
            )}
          >
            {notification.message}
          </p>
        </div>
      )}

      {/* Storage Usage */}
      <div className="flex flex-col space-y-4 p-4 bg-light-secondary/50 dark:bg-dark-secondary/50 rounded-xl border border-light-200 dark:border-dark-200">
        <div className="flex items-center space-x-2">
          <Database size={18} className="text-black/70 dark:text-white/70" />
          <h3 className="text-black/90 dark:text-white/90 font-medium">
            Storage Usage
          </h3>
        </div>
        
        <div className="flex flex-col space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-black/70 dark:text-white/70">
              Used: {formatBytes(storageInfo.used)} / {formatBytes(storageInfo.total)}
            </span>
            <span
              className={cn(
                'font-medium',
                isStorageWarning
                  ? 'text-orange-600 dark:text-orange-400'
                  : 'text-black/90 dark:text-white/90'
              )}
            >
              {storageInfo.percentage.toFixed(1)}%
            </span>
          </div>
          
          {/* Progress bar */}
          <div className="w-full h-2 bg-light-200 dark:bg-dark-200 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full transition-all duration-300',
                isStorageWarning
                  ? 'bg-orange-500'
                  : 'bg-[#24A0ED]'
              )}
              style={{ width: `${Math.min(storageInfo.percentage, 100)}%` }}
            />
          </div>
          
          {isStorageWarning && (
            <div className="flex items-start space-x-2 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
              <AlertTriangle className="text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" size={16} />
              <div className="flex flex-col space-y-1">
                <p className="text-sm text-orange-800 dark:text-orange-200 font-medium">
                  Storage Almost Full
                </p>
                <p className="text-xs text-orange-700 dark:text-orange-300">
                  Consider exporting your data and clearing old search history to free up space.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Export/Import */}
      <div className="flex flex-col space-y-4 p-4 bg-light-secondary/50 dark:bg-dark-secondary/50 rounded-xl border border-light-200 dark:border-dark-200">
        <h3 className="text-black/90 dark:text-white/90 font-medium">
          Data Management
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Export Button */}
          <button
            onClick={handleExport}
            className="flex items-center justify-center space-x-2 p-3 bg-light-secondary dark:bg-dark-secondary rounded-lg hover:bg-light-200 dark:hover:bg-dark-200 transition-colors border border-light-200 dark:border-dark-200"
          >
            <Download size={18} className="text-black/70 dark:text-white/70" />
            <span className="text-sm text-black/90 dark:text-white/90 font-medium">
              Export Data
            </span>
          </button>

          {/* Import Button */}
          <label className="flex items-center justify-center space-x-2 p-3 bg-light-secondary dark:bg-dark-secondary rounded-lg hover:bg-light-200 dark:hover:bg-dark-200 transition-colors border border-light-200 dark:border-dark-200 cursor-pointer">
            <Upload size={18} className="text-black/70 dark:text-white/70" />
            <span className="text-sm text-black/90 dark:text-white/90 font-medium">
              Import Data
            </span>
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
          </label>
        </div>
        
        <p className="text-xs text-black/60 dark:text-white/60">
          Export your preferences, search history, and analytics data as a JSON file. 
          You can import it later to restore your settings.
        </p>
      </div>

      {/* Clear Data */}
      <div className="flex flex-col space-y-4 p-4 bg-light-secondary/50 dark:bg-dark-secondary/50 rounded-xl border border-light-200 dark:border-dark-200">
        <h3 className="text-black/90 dark:text-white/90 font-medium">
          Clear All Data
        </h3>
        
        {!showClearConfirm ? (
          <>
            <button
              onClick={() => setShowClearConfirm(true)}
              className="flex items-center justify-center space-x-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors border border-red-200 dark:border-red-800"
            >
              <Trash2 size={18} className="text-red-600 dark:text-red-400" />
              <span className="text-sm text-red-700 dark:text-red-300 font-medium">
                Clear All Data
              </span>
            </button>
            <p className="text-xs text-black/60 dark:text-white/60">
              This will permanently delete all your preferences, search history, and analytics data.
            </p>
          </>
        ) : (
          <div className="flex flex-col space-y-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" size={20} />
              <div className="flex flex-col space-y-1">
                <p className="text-sm text-red-800 dark:text-red-200 font-medium">
                  Are you sure?
                </p>
                <p className="text-xs text-red-700 dark:text-red-300">
                  This action cannot be undone. All your data will be permanently deleted.
                </p>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={handleClearData}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Yes, Clear All Data
              </button>
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 px-4 py-2 bg-light-secondary dark:bg-dark-secondary hover:bg-light-200 dark:hover:bg-dark-200 text-black/90 dark:text-white/90 rounded-lg text-sm font-medium transition-colors border border-light-200 dark:border-dark-200"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataManagement;
