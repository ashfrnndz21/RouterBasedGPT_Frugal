'use client';

import { useState } from 'react';
import { Plus, X, AlertCircle, Ban } from 'lucide-react';
import { Switch } from '@headlessui/react';
import { GuardrailsConfig } from '@/lib/guardrails/types';
import { cn } from '@/lib/utils';

interface TopicBanEditorProps {
  config: GuardrailsConfig;
  onUpdate: () => void;
}

export default function TopicBanEditor({ config, onUpdate }: TopicBanEditorProps) {
  const [topics, setTopics] = useState<string[]>(config.dynamic.topicBanning.topics || []);
  const [newTopic, setNewTopic] = useState('');
  const [method, setMethod] = useState<'embedding' | 'llm'>(config.dynamic.topicBanning.method || 'embedding');
  const [threshold, setThreshold] = useState(config.dynamic.topicBanning.threshold || 0.75);
  const [enabled, setEnabled] = useState(config.dynamic.topicBanning.enabled);
  const [saving, setSaving] = useState(false);

  const saveConfig = async (updates: Partial<typeof config.dynamic.topicBanning>) => {
    setSaving(true);
    try {
      await fetch('/api/guardrails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dynamic: {
            topicBanning: {
              ...config.dynamic.topicBanning,
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

  const addTopic = async () => {
    if (!newTopic.trim() || topics.includes(newTopic.trim())) return;
    
    const updated = [...topics, newTopic.trim()];
    setTopics(updated);
    setNewTopic('');
    
    await saveConfig({ topics: updated });
  };

  const removeTopic = async (index: number) => {
    const updated = topics.filter((_, i) => i !== index);
    setTopics(updated);
    await saveConfig({ topics: updated });
  };

  return (
    <div className="space-y-6">
      {/* Enable/Disable */}
      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
        <div>
          <h3 className="font-medium text-gray-900 dark:text-white">Topic Banning</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Block queries related to specific topics or categories
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
          {/* Method Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Detection Method
            </label>
            <select
              value={method}
              onChange={(e) => {
                const val = e.target.value as 'embedding' | 'llm';
                setMethod(val);
                saveConfig({ method: val });
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="embedding">Embedding-based (Fast, ~20ms)</option>
              <option value="llm">LLM-based (Accurate, ~300ms)</option>
            </select>
          </div>

          {/* Threshold */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Similarity Threshold: {threshold.toFixed(2)}
            </label>
            <input
              type="range"
              min="0.5"
              max="1.0"
              step="0.05"
              value={threshold}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setThreshold(val);
                saveConfig({ threshold: val });
              }}
              className="w-full"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Higher = stricter (only very similar queries blocked)
            </p>
          </div>

          {/* Topic List */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Banned Topics
            </label>
            <div className="space-y-2 mb-4">
              {topics.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic">No banned topics configured</p>
              ) : (
                topics.map((topic, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800"
                  >
                    <Ban className="text-red-600 dark:text-red-400 flex-shrink-0" size={16} />
                    <span className="flex-1 text-gray-900 dark:text-white">{topic}</span>
                    <button
                      onClick={() => removeTopic(index)}
                      className="p-1 hover:bg-red-100 dark:hover:bg-red-900/40 rounded transition-colors"
                      title="Remove topic"
                    >
                      <X size={16} className="text-red-600 dark:text-red-400" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Add Topic */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                placeholder="e.g., gambling, cryptocurrency trading, political discussions"
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500"
                onKeyPress={(e) => e.key === 'Enter' && addTopic()}
              />
              <button
                onClick={addTopic}
                disabled={!newTopic.trim() || saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                <Plus size={16} />
                <span>Add</span>
              </button>
            </div>
          </div>

          {/* Info */}
          <div className="flex items-start gap-2 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <AlertCircle className="text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" size={16} />
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium mb-1">How it works:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Queries are checked against banned topics using {method === 'embedding' ? 'semantic similarity' : 'LLM classification'}</li>
                <li>If similarity ≥ {threshold.toFixed(2)}, the query is blocked</li>
                <li>System automatically uses the best available embedding model (bge-large, mxbai-embed-large, or nomic-embed-text)</li>
                <li>Use &quot;Test Guardrails&quot; tab to verify your configuration</li>
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
