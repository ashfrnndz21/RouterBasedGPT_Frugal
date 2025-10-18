import { AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ErrorMessageProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export default function ErrorMessage({ 
  title = 'Something went wrong',
  message,
  onRetry,
  className 
}: ErrorMessageProps) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center gap-4 p-6 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800',
      className
    )}>
      <AlertCircle className="w-12 h-12 text-red-600 dark:text-red-400" />
      <div className="text-center">
        <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-1">
          {title}
        </h3>
        <p className="text-sm text-red-700 dark:text-red-300">
          {message}
        </p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span className="text-sm font-medium">Try Again</span>
        </button>
      )}
    </div>
  );
}
