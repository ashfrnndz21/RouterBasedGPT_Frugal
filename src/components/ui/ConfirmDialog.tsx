'use client';

import { AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'warning',
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      icon: 'text-red-600 dark:text-red-400',
      button: 'bg-red-600 hover:bg-red-700 text-white',
    },
    warning: {
      icon: 'text-yellow-600 dark:text-yellow-400',
      button: 'bg-yellow-600 hover:bg-yellow-700 text-white',
    },
    info: {
      icon: 'text-blue-600 dark:text-blue-400',
      button: 'bg-blue-600 hover:bg-blue-700 text-white',
    },
  };

  const styles = variantStyles[variant];

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-light-primary dark:bg-dark-primary rounded-2xl shadow-2xl m-4 p-6">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-light-200 dark:hover:bg-dark-200 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-black dark:text-white" />
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className={cn('w-12 h-12 rounded-full bg-light-200 dark:bg-dark-200 flex items-center justify-center', styles.icon)}>
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        {/* Content */}
        <div className="text-center mb-6">
          <h3 className="text-xl font-semibold text-black dark:text-white mb-2">
            {title}
          </h3>
          <p className="text-sm text-black/70 dark:text-white/70">
            {message}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-light-200 dark:bg-dark-200 hover:bg-light-300 dark:hover:bg-dark-300 text-black dark:text-white rounded-lg transition-colors font-medium"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            className={cn('flex-1 px-4 py-2 rounded-lg transition-colors font-medium', styles.button)}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
