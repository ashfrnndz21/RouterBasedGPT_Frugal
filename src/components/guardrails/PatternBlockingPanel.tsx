'use client';

import { useState } from 'react';
import { Plus, X, Code, AlertCircle } from 'lucide-react';
import { Switch } from '@headlessui/react';
import { GuardrailsConfig } from '@/lib/guardrails/types';
import { cn } from '@/lib/utils';

interface PatternBlockingPanelProps {
  config: GuardrailsConfig;
  onUpdate: () => void;
}

export default function PatternBlockingPanel({ config, onUpdate }: PatternBlockingPanelProps) {
  const outputConfig = config.output || {
    enabled: false,
    keywordBlocking: { enabled: false, keywords: [], matchMode: 'contains', caseSensitive: false },
    piiDetection: { enabled: false, types: [], action: 'block' },
    patternBlocking: { enabled: false, patterns: [] },
    safeMessage: '',
  };

  const [patterns, setPatterns] = useState(outputConfig.patternBlocking.patterns || []);
  const [enabled, setEnabled] = useState(outputConfig.patternBlocking.enabled);
  const [newPattern, setNewPattern] = useState({ name: '', pattern: '', description: '' });
  const [saving, setSaving] = useState(false);

  const saveConfig = async (updates: Partial<typeof outputConfig.patternBlocking>) => {
    setSaving(true);
    try {
      await fetch('/api/guardrails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          output: {
            ...outputConfig,
            patternBlocking: {
              ...outputConfig.patternBlocking,
              ...updates,
            },
          },
        }),
      });
      onUpdate();
    } catch (error) {
      console.error('Error saving config:', error);
      alert('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const addPattern = async () => {
    if (!newPattern.name.trim() || !newPattern.pattern.trim()) return;
    
    // Validate regex pattern
    try {
      new RegExp(newPattern.pattern);
    } catch (error) {
      alert('Invalid regex pattern. Please check your syntax.');
      return;
    }

    const pattern = {
      id: Date.now().toString(),
      name: newPattern.name.trim(),
      pattern: newPattern.pattern.trim(),
      description: newPattern.description.trim() || undefined,
    };
    
    const updated = [...patterns, pattern];
    setPatterns(updated);
    setNewPattern({ name: '', pattern: '', description: '' });
    
    await saveConfig({ patterns: updated });
  };

  const removePattern = async (id: string) => {
    const updated = patterns.filter(p => p.id !== id);
    setPatterns(updated);
    await saveConfig({ patterns: updated });
  };

  const testPattern = (patternStr: string) => {
    try {
      const regex = new RegExp(patternStr, 'gi');
      const testText = 'This is a test response with some content.';
      const matches = testText.match(regex);
      return { valid: true, matches: matches?.length || 0 };
    } catch (error) {
      return { valid: false, error: (error as Error).message };
    }
  };

  return (
    <div className="space-y-6">
      {/* Enable/Disable */}
      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
        <div>
          <h3 className="font-medium text-gray-900 dark:text-white">Pattern Blocking</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Block responses matching custom regex patterns
          </p>
        </div>
        <Switch
          checked={enabled}
          onChange={(val) => {
            setEnabled(val);
            saveConfig({ enabled: val });
          }}
          className={cn(
            enabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600',
            'relative inline-flex h-6 w-11 items-center rounded-full transition-colors'
          )}
        >
          <span
            className={cn(
              enabled ? 'translate-x-6' : 'translate-x-1',
              'inline-block h-4 w-4 transform rounded-full bg-white transition-transform'
            )}
          />
        </Switch>
      </div>

      {enabled && (
        <>
          {/* Pattern List */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Blocked Patterns
            </label>
            <div className="space-y-2 mb-4">
              {patterns.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic">No patterns configured</p>
              ) : (
                patterns.map((pattern) => {
                  const test = testPattern(pattern.pattern);
                  return (
                    <div
                      key={pattern.id}
                      className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800"
                    >
                      <div className="flex items-start gap-2">
                        <Code className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" size={16} />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 dark:text-white">{pattern.name}</div>
                          {pattern.description && (
                            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">{pattern.description}</div>
                          )}
                          <code className="text-xs text-gray-700 dark:text-gray-300 font-mono mt-1 block bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                            {pattern.pattern}
                          </code>
                          {!test.valid && (
                            <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                              Invalid pattern: {test.error}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => removePattern(pattern.id)}
                          className="p-1 hover:bg-red-100 dark:hover:bg-red-900/40 rounded transition-colors"
                          title="Remove pattern"
                        >
                          <X size={16} className="text-red-600 dark:text-red-400" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Add Pattern */}
            <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
              <input
                type="text"
                value={newPattern.name}
                onChange={(e) => setNewPattern({ ...newPattern, name: e.target.value })}
                placeholder="Pattern name (e.g., URL Pattern)"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500"
              />
              <input
                type="text"
                value={newPattern.pattern}
                onChange={(e) => setNewPattern({ ...newPattern, pattern: e.target.value })}
                placeholder="Regex pattern (e.g., https?://[^\\s]+)"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 font-mono text-sm"
              />
              <input
                type="text"
                value={newPattern.description}
                onChange={(e) => setNewPattern({ ...newPattern, description: e.target.value })}
                placeholder="Description (optional)"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 text-sm"
              />
              <button
                onClick={addPattern}
                disabled={!newPattern.name.trim() || !newPattern.pattern.trim() || saving}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                <Plus size={16} />
                <span>Add Pattern</span>
              </button>
            </div>
          </div>

          {/* Info */}
          <div className="flex items-start gap-2 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <AlertCircle className="text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" size={16} />
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium mb-1">Regex Patterns:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Use standard JavaScript regex syntax</li>
                <li>Patterns are case-insensitive by default</li>
                <li>Example: <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">https?://[^\\s]+</code> matches URLs</li>
                <li>Test your pattern before adding to ensure it works correctly</li>
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
