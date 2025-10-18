'use client';

import { useState, useEffect } from 'react';
import { Switch } from '@headlessui/react';
import { cn } from '@/lib/utils';
import { preferenceManager } from '@/lib/preferences/preferenceManager';
import {
  Search,
  Image as ImageIcon,
  Video,
  BookOpen,
  MessageSquare,
  Calculator,
  Layers,
} from 'lucide-react';
import { toast } from 'sonner';

interface PreferencesPanelProps {
  className?: string;
}

const Select = ({
  className,
  options,
  ...restProps
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  options: { value: string; label: string; disabled?: boolean }[];
}) => {
  return (
    <select
      {...restProps}
      className={cn(
        'bg-light-secondary dark:bg-dark-secondary px-3 py-2 flex items-center overflow-hidden border border-light-200 dark:border-dark-200 dark:text-white rounded-lg text-sm',
        className,
      )}
    >
      {options.map(({ label, value, disabled }) => (
        <option key={value} value={value} disabled={disabled}>
          {label}
        </option>
      ))}
    </select>
  );
};

const PreferencesPanel = ({ className }: PreferencesPanelProps) => {
  const [mounted, setMounted] = useState(false);
  const [defaultMode, setDefaultMode] = useState<string>('all');
  const [enabledSources, setEnabledSources] = useState({
    images: true,
    videos: true,
    academic: true,
    reddit: true,
    wolframAlpha: true,
  });
  const [resultsDensity, setResultsDensity] = useState<string>('standard');

  // Load preferences on mount
  useEffect(() => {
    setMounted(true);
    const prefs = preferenceManager.getSearchPreferences();
    setDefaultMode(prefs.defaultMode);
    setEnabledSources({
      images: prefs.enabledSources.images,
      videos: prefs.enabledSources.videos,
      academic: prefs.enabledSources.academic,
      reddit: prefs.enabledSources.reddit,
      wolframAlpha: prefs.enabledSources.wolframAlpha,
    });
    setResultsDensity(prefs.resultsDensity);
  }, []);

  if (!mounted) {
    return <div className="text-sm text-black/60 dark:text-white/60">Loading preferences...</div>;
  }

  const handleDefaultModeChange = (mode: string) => {
    try {
      setDefaultMode(mode);
      preferenceManager.setDefaultSearchMode(
        mode as 'all' | 'academic' | 'writing' | 'youtube' | 'reddit' | 'wolfram'
      );
      // No toast for simple preference changes - they're instant feedback via UI
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update search mode';
      toast.error(message);
    }
  };

  const handleSourceToggle = (
    source: keyof typeof enabledSources,
    enabled: boolean
  ) => {
    try {
      setEnabledSources((prev) => ({ ...prev, [source]: enabled }));
      preferenceManager.toggleSearchSource(source, enabled);
      // No toast for toggles - the switch animation provides instant feedback
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to toggle source';
      toast.error(message);
    }
  };

  const handleDensityChange = (density: string) => {
    try {
      setResultsDensity(density);
      preferenceManager.setResultsDensity(
        density as 'compact' | 'standard' | 'detailed'
      );
      // No toast for simple preference changes
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update density';
      toast.error(message);
    }
  };

  const searchSources = [
    {
      key: 'images' as const,
      label: 'Image Search',
      description: 'Show image search button in chat',
      icon: ImageIcon,
    },
    {
      key: 'videos' as const,
      label: 'Video Search',
      description: 'Show video search button in chat',
      icon: Video,
    },
    {
      key: 'academic' as const,
      label: 'Academic Search',
      description: 'Show academic search button in chat',
      icon: BookOpen,
    },
    {
      key: 'reddit' as const,
      label: 'Reddit Search',
      description: 'Show Reddit search button in chat',
      icon: MessageSquare,
    },
    {
      key: 'wolframAlpha' as const,
      label: 'Wolfram Alpha',
      description: 'Show Wolfram Alpha button in chat',
      icon: Calculator,
    },
  ];

  return (
    <div className={cn('flex flex-col space-y-6', className)}>
      {/* Default Search Mode */}
      <div className="flex flex-col space-y-4 p-4 bg-light-secondary/50 dark:bg-dark-secondary/50 rounded-xl border border-light-200 dark:border-dark-200">
        <div className="flex items-center space-x-2">
          <Search size={18} className="text-black/70 dark:text-white/70" />
          <h3 className="text-black/90 dark:text-white/90 font-medium">
            Default Search Mode
          </h3>
        </div>
        <div className="flex flex-col space-y-1">
          <p className="text-black/60 dark:text-white/60 text-sm">
            Choose the default search mode for new chats
          </p>
          <Select
            value={defaultMode}
            onChange={(e) => handleDefaultModeChange(e.target.value)}
            options={[
              { value: 'all', label: 'All (Web Search)' },
              { value: 'academic', label: 'Academic' },
              { value: 'writing', label: 'Writing Assistant' },
              { value: 'youtube', label: 'YouTube' },
              { value: 'reddit', label: 'Reddit' },
              { value: 'wolfram', label: 'Wolfram Alpha' },
            ]}
          />
        </div>
      </div>

      {/* Search Sources */}
      <div className="flex flex-col space-y-4 p-4 bg-light-secondary/50 dark:bg-dark-secondary/50 rounded-xl border border-light-200 dark:border-dark-200">
        <div className="flex items-center space-x-2">
          <Layers size={18} className="text-black/70 dark:text-white/70" />
          <h3 className="text-black/90 dark:text-white/90 font-medium">
            Search Sources
          </h3>
        </div>
        <p className="text-black/60 dark:text-white/60 text-sm">
          Enable or disable specific search sources in the chat interface
        </p>
        <div className="flex flex-col space-y-2">
          {searchSources.map((source) => (
            <div
              key={source.key}
              className="flex items-center justify-between p-3 bg-light-secondary dark:bg-dark-secondary rounded-lg hover:bg-light-200 dark:hover:bg-dark-200 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-light-200 dark:bg-dark-200 rounded-lg">
                  <source.icon
                    size={18}
                    className="text-black/70 dark:text-white/70"
                  />
                </div>
                <div>
                  <p className="text-sm text-black/90 dark:text-white/90 font-medium">
                    {source.label}
                  </p>
                  <p className="text-xs text-black/60 dark:text-white/60 mt-0.5">
                    {source.description}
                  </p>
                </div>
              </div>
              <Switch
                checked={enabledSources[source.key]}
                onChange={(checked: boolean) => handleSourceToggle(source.key, checked)}
                className={cn(
                  enabledSources[source.key]
                    ? 'bg-[#24A0ED]'
                    : 'bg-light-200 dark:bg-dark-200',
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none'
                )}
              >
                <span
                  className={cn(
                    enabledSources[source.key]
                      ? 'translate-x-6'
                      : 'translate-x-1',
                    'inline-block h-4 w-4 transform rounded-full bg-white transition-transform'
                  )}
                />
              </Switch>
            </div>
          ))}
        </div>
      </div>

      {/* Results Density */}
      <div className="flex flex-col space-y-4 p-4 bg-light-secondary/50 dark:bg-dark-secondary/50 rounded-xl border border-light-200 dark:border-dark-200">
        <div className="flex items-center space-x-2">
          <Layers size={18} className="text-black/70 dark:text-white/70" />
          <h3 className="text-black/90 dark:text-white/90 font-medium">
            Results Density
          </h3>
        </div>
        <div className="flex flex-col space-y-1">
          <p className="text-black/60 dark:text-white/60 text-sm">
            Control how many results are fetched per search
          </p>
          <Select
            value={resultsDensity}
            onChange={(e) => handleDensityChange(e.target.value)}
            options={[
              { value: 'compact', label: 'Compact (5 results)' },
              { value: 'standard', label: 'Standard (10 results)' },
              { value: 'detailed', label: 'Detailed (15 results)' },
            ]}
          />
        </div>
      </div>
    </div>
  );
};

export default PreferencesPanel;
