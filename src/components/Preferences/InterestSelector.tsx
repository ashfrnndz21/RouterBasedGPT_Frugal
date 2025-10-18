'use client';

import { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import {
  INTEREST_CATEGORIES,
  getCategoryColorClasses,
  type InterestCategory,
} from '@/lib/preferences/interestCategories';
import { preferenceManager } from '@/lib/preferences';
import { toast } from 'sonner';

interface InterestSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (categories: string[]) => void;
  isOnboarding?: boolean;
}

export default function InterestSelector({
  isOpen,
  onClose,
  onSave,
  isOnboarding = false,
}: InterestSelectorProps) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [allTopicsMode, setAllTopicsMode] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Load current preferences
      const interests = preferenceManager.getInterests();
      const allTopics = preferenceManager.isAllTopicsMode();
      setSelectedCategories(interests);
      setAllTopicsMode(allTopics);
    }
  }, [isOpen]);

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev => {
      if (prev.includes(categoryId)) {
        return prev.filter(id => id !== categoryId);
      } else {
        return [...prev, categoryId];
      }
    });
    // Disable all topics mode when selecting specific categories
    if (allTopicsMode) {
      setAllTopicsMode(false);
    }
  };

  const handleAllTopicsToggle = () => {
    setAllTopicsMode(!allTopicsMode);
    if (!allTopicsMode) {
      // When enabling all topics, clear specific selections
      setSelectedCategories([]);
    }
  };

  const handleSave = () => {
    try {
      preferenceManager.setInterests(selectedCategories);
      preferenceManager.setAllTopicsMode(allTopicsMode);
      
      toast.success(
        allTopicsMode 
          ? 'All topics mode enabled' 
          : `${selectedCategories.length} interest${selectedCategories.length !== 1 ? 's' : ''} saved`
      );
      
      if (onSave) {
        onSave(selectedCategories);
      }
      
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save interests';
      toast.error(message);
    }
  };

  const handleCancel = () => {
    if (isOnboarding && selectedCategories.length === 0 && !allTopicsMode) {
      // Don't allow closing without selection during onboarding
      return;
    }
    onClose();
  };

  const canSave = selectedCategories.length > 0 || allTopicsMode;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-light-primary dark:bg-dark-primary rounded-2xl shadow-2xl m-4">
        {/* Header */}
        <div className="sticky top-0 bg-light-primary dark:bg-dark-primary border-b border-light-200 dark:border-dark-200 p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-black dark:text-white">
                {isOnboarding ? 'Welcome to FrugalAIGpt!' : 'Select Your Interests'}
              </h2>
              <p className="text-sm text-black/70 dark:text-white/70 mt-1">
                {isOnboarding
                  ? 'Choose topics you\'re interested in to personalize your Discovery feed'
                  : 'Update your interests to customize your content'}
              </p>
            </div>
            {!isOnboarding && (
              <button
                onClick={handleCancel}
                className="p-2 hover:bg-light-200 dark:hover:bg-dark-200 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-black dark:text-white" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* All Topics Toggle */}
          <div className="mb-6">
            <button
              onClick={handleAllTopicsToggle}
              className={`w-full p-4 rounded-xl border-2 transition-all ${
                allTopicsMode
                  ? 'border-[#24A0ED] bg-[#24A0ED]/10'
                  : 'border-light-200 dark:border-dark-200 hover:border-[#24A0ED]/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${
                      allTopicsMode
                        ? 'bg-[#24A0ED] border-[#24A0ED]'
                        : 'border-light-300 dark:border-dark-300'
                    }`}
                  >
                    {allTopicsMode && <Check className="w-4 h-4 text-white" />}
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-black dark:text-white">
                      All Topics
                    </p>
                    <p className="text-sm text-black/70 dark:text-white/70">
                      Show content from all categories
                    </p>
                  </div>
                </div>
              </div>
            </button>
          </div>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-light-200 dark:border-dark-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-light-primary dark:bg-dark-primary text-black/70 dark:text-white/70">
                or select specific topics
              </span>
            </div>
          </div>

          {/* Category Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {INTEREST_CATEGORIES.map((category) => {
              const isSelected = selectedCategories.includes(category.id);
              const colors = getCategoryColorClasses(category.color);
              const IconComponent = (LucideIcons as any)[category.icon] || LucideIcons.Circle;

              return (
                <button
                  key={category.id}
                  onClick={() => toggleCategory(category.id)}
                  disabled={allTopicsMode}
                  className={`relative p-4 rounded-xl border-2 transition-all ${
                    allTopicsMode
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:scale-105 active:scale-95'
                  } ${
                    isSelected
                      ? `${colors.border} ${colors.bg}`
                      : 'border-light-200 dark:border-dark-200 hover:border-light-300 dark:hover:border-dark-300'
                  }`}
                >
                  {/* Checkmark */}
                  {isSelected && (
                    <div className="absolute top-2 right-2">
                      <div className="w-6 h-6 rounded-full bg-[#24A0ED] flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  )}

                  {/* Icon */}
                  <div
                    className={`w-12 h-12 rounded-lg flex items-center justify-center mb-3 ${
                      isSelected ? colors.bg : 'bg-light-100 dark:bg-dark-100'
                    }`}
                  >
                    <IconComponent
                      className={`w-6 h-6 ${
                        isSelected ? colors.text : 'text-black/70 dark:text-white/70'
                      }`}
                    />
                  </div>

                  {/* Text */}
                  <div className="text-left">
                    <p className="font-semibold text-sm text-black dark:text-white mb-1">
                      {category.name}
                    </p>
                    <p className="text-xs text-black/60 dark:text-white/60">
                      {category.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selection Count */}
          {!allTopicsMode && selectedCategories.length > 0 && (
            <div className="mt-6 text-center">
              <p className="text-sm text-black/70 dark:text-white/70">
                {selectedCategories.length} {selectedCategories.length === 1 ? 'topic' : 'topics'}{' '}
                selected
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-light-primary dark:bg-dark-primary border-t border-light-200 dark:border-dark-200 p-6 rounded-b-2xl">
          <div className="flex items-center justify-end space-x-3">
            {!isOnboarding && (
              <button
                onClick={handleCancel}
                className="px-6 py-2.5 rounded-lg border border-light-200 dark:border-dark-200 text-black dark:text-white hover:bg-light-200 dark:hover:bg-dark-200 transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={!canSave}
              className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
                canSave
                  ? 'bg-[#24A0ED] text-white hover:bg-[#1d8bd1] active:scale-95'
                  : 'bg-light-200 dark:bg-dark-200 text-black/40 dark:text-white/40 cursor-not-allowed'
              }`}
            >
              {isOnboarding ? 'Get Started' : 'Save Preferences'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
