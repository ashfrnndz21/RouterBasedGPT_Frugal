'use client';

import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Switch } from '@headlessui/react';
import { GuardrailsConfig } from '@/lib/guardrails/types';
import { cn } from '@/lib/utils';

interface StaticGuardrailsPanelProps {
  config: GuardrailsConfig;
  onUpdate: () => void;
}

export default function StaticGuardrailsPanel({ config, onUpdate }: StaticGuardrailsPanelProps) {
  const [tokenLimits, setTokenLimits] = useState({
    enabled: config.static.tokenLimits?.enabled ?? false,
    maxInputTokens: config.static.tokenLimits?.maxInputTokens ?? 2000,
    maxContextTokens: {
      tier1: config.static.tokenLimits?.maxContextTokens?.tier1 ?? 8000,
      tier2: config.static.tokenLimits?.maxContextTokens?.tier2 ?? 16000,
    },
  });
  const [rateLimiting, setRateLimiting] = useState({
    enabled: config.static.rateLimiting?.enabled ?? false,
    requestsPerMinute: config.static.rateLimiting?.requestsPerMinute ?? 60,
    requestsPerHour: config.static.rateLimiting?.requestsPerHour ?? 1000,
    burstLimit: config.static.rateLimiting?.burstLimit ?? 5,
    burstWindowSeconds: config.static.rateLimiting?.burstWindowSeconds ?? 10,
  });
  const [saving, setSaving] = useState(false);

  const saveConfig = async (updates: Partial<typeof config.static>) => {
    setSaving(true);
    try {
      await fetch('/api/guardrails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          static: {
            ...config.static,
            ...updates,
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

  return (
    <div className="space-y-6">
      {/* Token Limits */}
      <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white">Token Limits</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Enforce maximum token limits for queries and context
            </p>
          </div>
          <Switch
            checked={tokenLimits.enabled}
            onChange={(val) => {
              setTokenLimits({ ...tokenLimits, enabled: val });
              saveConfig({ tokenLimits: { ...tokenLimits, enabled: val } });
            }}
            className={cn(
              tokenLimits.enabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600',
              'relative inline-flex h-6 w-11 items-center rounded-full transition-colors'
            )}
          >
            <span
              className={cn(
                tokenLimits.enabled ? 'translate-x-6' : 'translate-x-1',
                'inline-block h-4 w-4 transform rounded-full bg-white transition-transform'
              )}
            />
          </Switch>
        </div>

        {tokenLimits.enabled && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Max Input Tokens: {tokenLimits.maxInputTokens ?? 2000}
              </label>
              <input
                type="range"
                min="500"
                max="10000"
                step="100"
                value={tokenLimits.maxInputTokens ?? 2000}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 2000;
                  const updated = { ...tokenLimits, maxInputTokens: val };
                  setTokenLimits(updated);
                  saveConfig({ tokenLimits: updated });
                }}
                className="w-full"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Maximum tokens allowed per query (~{Math.ceil((tokenLimits.maxInputTokens ?? 2000) * 4)} characters)
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tier 1 Context: {tokenLimits.maxContextTokens?.tier1 ?? 8000}
                </label>
                <input
                  type="number"
                  min="1000"
                  max="50000"
                  step="1000"
                  value={tokenLimits.maxContextTokens?.tier1 ?? 8000}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 8000;
                    const updated = {
                      ...tokenLimits,
                      maxContextTokens: { ...tokenLimits.maxContextTokens, tier1: val },
                    };
                    setTokenLimits(updated);
                    saveConfig({ tokenLimits: updated });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tier 2 Context: {tokenLimits.maxContextTokens?.tier2 ?? 16000}
                </label>
                <input
                  type="number"
                  min="1000"
                  max="100000"
                  step="1000"
                  value={tokenLimits.maxContextTokens?.tier2 ?? 16000}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 16000;
                    const updated = {
                      ...tokenLimits,
                      maxContextTokens: { ...tokenLimits.maxContextTokens, tier2: val },
                    };
                    setTokenLimits(updated);
                    saveConfig({ tokenLimits: updated });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Rate Limiting */}
      <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white">Rate Limiting</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Limit requests per time period to prevent abuse
            </p>
          </div>
          <Switch
            checked={rateLimiting.enabled}
            onChange={(val) => {
              setRateLimiting({ ...rateLimiting, enabled: val });
              saveConfig({ rateLimiting: { ...rateLimiting, enabled: val } });
            }}
            className={cn(
              rateLimiting.enabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600',
              'relative inline-flex h-6 w-11 items-center rounded-full transition-colors'
            )}
          >
            <span
              className={cn(
                rateLimiting.enabled ? 'translate-x-6' : 'translate-x-1',
                'inline-block h-4 w-4 transform rounded-full bg-white transition-transform'
              )}
            />
          </Switch>
        </div>

        {rateLimiting.enabled && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Requests Per Minute: {rateLimiting.requestsPerMinute ?? 60}
              </label>
              <input
                type="range"
                min="10"
                max="300"
                step="10"
                value={rateLimiting.requestsPerMinute ?? 60}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 60;
                  const updated = { ...rateLimiting, requestsPerMinute: val };
                  setRateLimiting(updated);
                  saveConfig({ rateLimiting: updated });
                }}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Requests Per Hour: {rateLimiting.requestsPerHour ?? 1000}
              </label>
              <input
                type="range"
                min="100"
                max="5000"
                step="100"
                value={rateLimiting.requestsPerHour ?? 1000}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 1000;
                  const updated = { ...rateLimiting, requestsPerHour: val };
                  setRateLimiting(updated);
                  saveConfig({ rateLimiting: updated });
                }}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Burst Limit: {rateLimiting.burstLimit ?? 5} requests per {rateLimiting.burstWindowSeconds ?? 10}s
              </label>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={rateLimiting.burstLimit ?? 5}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 5;
                    const updated = { ...rateLimiting, burstLimit: val };
                    setRateLimiting(updated);
                    saveConfig({ rateLimiting: updated });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
                <input
                  type="number"
                  min="5"
                  max="60"
                  value={rateLimiting.burstWindowSeconds ?? 10}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 10;
                    const updated = { ...rateLimiting, burstWindowSeconds: val };
                    setRateLimiting(updated);
                    saveConfig({ rateLimiting: updated });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex items-start gap-2 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <AlertCircle className="text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" size={16} />
        <div className="text-sm text-blue-800 dark:text-blue-200">
          <p className="font-medium mb-1">Static Guardrails:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Token limits prevent excessively long queries and context windows</li>
            <li>Rate limiting protects against abuse and excessive API usage</li>
            <li>These checks are fast (~0.06ms) and have no cost impact</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
