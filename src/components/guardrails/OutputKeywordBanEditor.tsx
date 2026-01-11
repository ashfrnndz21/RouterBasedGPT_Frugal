'use client';

import { useState } from 'react';
import { Plus, X, Hash } from 'lucide-react';
import { Switch } from '@headlessui/react';
import { GuardrailsConfig } from '@/lib/guardrails/types';
import { cn } from '@/lib/utils';

interface OutputKeywordBanEditorProps {
  config: GuardrailsConfig;
  onUpdate: () => void;
}

export default function OutputKeywordBanEditor({ config, onUpdate }: OutputKeywordBanEditorProps) {
  const outputConfig = config.output || {
    enabled: false,
    keywordBlocking: { enabled: false, keywords: [], matchMode: 'contains', caseSensitive: false },
    piiDetection: { enabled: false, types: [], action: 'block' },
    patternBlocking: { enabled: false, patterns: [] },
    safeMessage: '',
  };

  const [keywords, setKeywords] = useState<string[]>(outputConfig.keywordBlocking.keywords || []);
  const [newKeyword, setNewKeyword] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(outputConfig.keywordBlocking.caseSensitive || false);
  const [matchMode, setMatchMode] = useState<'exact' | 'contains' | 'regex'>(
    outputConfig.keywordBlocking.matchMode || 'contains'
  );
  const [enabled, setEnabled] = useState(outputConfig.keywordBlocking.enabled);
  const [saving, setSaving] = useState(false);

  const saveConfig = async (updates: Partial<typeof outputConfig.keywordBlocking>) => {
    setSaving(true);
    try {
      await fetch('/api/guardrails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          output: {
            ...outputConfig,
            keywordBlocking: {
              ...outputConfig.keywordBlocking,
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

  const addKeyword = async () => {
    if (!newKeyword.trim() || keywords.includes(newKeyword.trim())) return;
    
    const updated = [...keywords, newKeyword.trim()];
    setKeywords(updated);
    setNewKeyword('');
    
    await saveConfig({ keywords: updated });
  };

  const removeKeyword = async (index: number) => {
    const updated = keywords.filter((_, i) => i !== index);
    setKeywords(updated);
    await saveConfig({ keywords: updated });
  };

  return (
    <div className="space-y-6">
      {/* Enable/Disable */}
      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
        <div>
          <h3 className="font-medium text-gray-900 dark:text-white">Output Keyword Blocking</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Block responses containing specific keywords
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
          {/* Match Mode */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Match Mode
            </label>
            <select
              value={matchMode}
              onChange={(e) => {
                const val = e.target.value as 'exact' | 'contains' | 'regex';
                setMatchMode(val);
                saveConfig({ matchMode: val });
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="contains">Contains (substring match)</option>
              <option value="exact">Exact (word boundaries)</option>
              <option value="regex">Regex (pattern match)</option>
            </select>
          </div>

          {/* Case Sensitive */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">Case Sensitive</h4>
              <p className="text-xs text-gray-600 dark:text-gray-400">Match keywords with exact case</p>
            </div>
            <Switch
              checked={caseSensitive}
              onChange={(val) => {
                setCaseSensitive(val);
                saveConfig({ caseSensitive: val });
              }}
              className={cn(
                caseSensitive ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600',
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors'
              )}
            >
              <span
                className={cn(
                  caseSensitive ? 'translate-x-6' : 'translate-x-1',
                  'inline-block h-4 w-4 transform rounded-full bg-white transition-transform'
                )}
              />
            </Switch>
          </div>

          {/* Keyword List */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Banned Keywords
            </label>
            <div className="space-y-2 mb-4">
              {keywords.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic">No keywords configured</p>
              ) : (
                keywords.map((keyword, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800"
                  >
                    <Hash className="text-red-600 dark:text-red-400 flex-shrink-0" size={16} />
                    <span className="flex-1 text-gray-900 dark:text-white font-mono text-sm">{keyword}</span>
                    <button
                      onClick={() => removeKeyword(index)}
                      className="p-1 hover:bg-red-100 dark:hover:bg-red-900/40 rounded transition-colors"
                      title="Remove keyword"
                    >
                      <X size={16} className="text-red-600 dark:text-red-400" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Add Keyword */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                placeholder="Enter keyword or regex pattern"
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500"
                onKeyPress={(e) => e.key === 'Enter' && addKeyword()}
              />
              <button
                onClick={addKeyword}
                disabled={!newKeyword.trim() || saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                <Plus size={16} />
                <span>Add</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
