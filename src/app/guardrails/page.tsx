'use client';

import { Shield, Ban, Hash, FileText, Settings, TestTube, ArrowLeft, Loader2, LogOut } from 'lucide-react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import TopicBanEditor from '@/components/guardrails/TopicBanEditor';
import KeywordBanEditor from '@/components/guardrails/KeywordBanEditor';
import StaticGuardrailsPanel from '@/components/guardrails/StaticGuardrailsPanel';
import GuardrailTestPanel from '@/components/guardrails/GuardrailTestPanel';
import OutputKeywordBanEditor from '@/components/guardrails/OutputKeywordBanEditor';
import PIIDetectionPanel from '@/components/guardrails/PIIDetectionPanel';
import PatternBlockingPanel from '@/components/guardrails/PatternBlockingPanel';
import { GuardrailsConfig } from '@/lib/guardrails/types';

export default function GuardrailsPage() {
  const [activeTab, setActiveTab] = useState<'topics' | 'keywords' | 'static' | 'output' | 'test'>('topics');
  const [outputSubTab, setOutputSubTab] = useState<'keywords' | 'pii' | 'patterns'>('keywords');
  const [config, setConfig] = useState<GuardrailsConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchGuardrailsConfig();
  }, []);

  const fetchGuardrailsConfig = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/guardrails');
      if (!res.ok) throw new Error('Failed to fetch config');
      const data = await res.json();
      setConfig(data);
    } catch (error) {
      console.error('Error fetching guardrails config:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'topics' as const, label: 'Banned Topics', icon: Ban },
    { id: 'keywords' as const, label: 'Banned Keywords', icon: Hash },
    { id: 'static' as const, label: 'Static Rules', icon: Settings },
    { id: 'output' as const, label: 'Output Guardrails', icon: LogOut },
    { id: 'test' as const, label: 'Test Guardrails', icon: TestTube },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-gray-600 dark:text-gray-400" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center py-12">
          <p className="text-red-600 dark:text-red-400">Failed to load guardrails configuration</p>
          <button
            onClick={fetchGuardrailsConfig}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200">
          <ArrowLeft size={20} />
        </Link>
        <Shield className="w-8 h-8 text-blue-600 dark:text-blue-400" />
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Guardrails Configuration</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600 dark:text-blue-400 font-medium'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <tab.icon size={18} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        {activeTab === 'topics' && (
          <TopicBanEditor config={config} onUpdate={fetchGuardrailsConfig} />
        )}
        {activeTab === 'keywords' && (
          <KeywordBanEditor config={config} onUpdate={fetchGuardrailsConfig} />
        )}
        {activeTab === 'static' && (
          <StaticGuardrailsPanel config={config} onUpdate={fetchGuardrailsConfig} />
        )}
        {activeTab === 'output' && (
          <div className="space-y-6">
            {/* Output Guardrails Master Toggle */}
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">Output Guardrails</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Check AI responses before sending to users
                </p>
              </div>
              <button
                onClick={async () => {
                  const outputConfig = config.output || {
                    enabled: false,
                    keywordBlocking: { enabled: false, keywords: [], matchMode: 'contains', caseSensitive: false },
                    piiDetection: { enabled: false, types: [], action: 'block' },
                    patternBlocking: { enabled: false, patterns: [] },
                    safeMessage: "I apologize, but I cannot provide this response due to content policy restrictions.",
                  };
                  await fetch('/api/guardrails', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      output: {
                        ...outputConfig,
                        enabled: !outputConfig.enabled,
                      },
                    }),
                  });
                  fetchGuardrailsConfig();
                }}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  config.output?.enabled
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-400 dark:hover:bg-gray-500'
                }`}
              >
                {config.output?.enabled ? 'Enabled' : 'Disabled'}
              </button>
            </div>

            {config.output?.enabled && (
              <>
                {/* Safe Message Configuration */}
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Safe Message (shown when response is blocked)
                  </label>
                  <textarea
                    value={config.output?.safeMessage || ''}
                    onChange={async (e) => {
                      await fetch('/api/guardrails', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          output: {
                            ...config.output,
                            safeMessage: e.target.value,
                          },
                        }),
                      });
                      fetchGuardrailsConfig();
                    }}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="I apologize, but I cannot provide this response due to content policy restrictions."
                  />
                </div>

                {/* Output Sub-tabs */}
                <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => setOutputSubTab('keywords')}
                    className={`px-4 py-2 border-b-2 transition-colors ${
                      outputSubTab === 'keywords'
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400 font-medium'
                        : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                  >
                    Output Keywords
                  </button>
                  <button
                    onClick={() => setOutputSubTab('pii')}
                    className={`px-4 py-2 border-b-2 transition-colors ${
                      outputSubTab === 'pii'
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400 font-medium'
                        : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                  >
                    PII Detection
                  </button>
                  <button
                    onClick={() => setOutputSubTab('patterns')}
                    className={`px-4 py-2 border-b-2 transition-colors ${
                      outputSubTab === 'patterns'
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400 font-medium'
                        : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                  >
                    Pattern Blocking
                  </button>
                </div>

                {/* Output Sub-content */}
                {outputSubTab === 'keywords' && (
                  <OutputKeywordBanEditor config={config} onUpdate={fetchGuardrailsConfig} />
                )}
                {outputSubTab === 'pii' && (
                  <PIIDetectionPanel config={config} onUpdate={fetchGuardrailsConfig} />
                )}
                {outputSubTab === 'patterns' && (
                  <PatternBlockingPanel config={config} onUpdate={fetchGuardrailsConfig} />
                )}
              </>
            )}
          </div>
        )}
        {activeTab === 'test' && (
          <GuardrailTestPanel config={config} />
        )}
      </div>
    </div>
  );
}
