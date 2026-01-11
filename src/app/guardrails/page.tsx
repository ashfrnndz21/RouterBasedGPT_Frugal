'use client';

import { Shield, Ban, Hash, FileText, Settings, TestTube, ArrowLeft, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import TopicBanEditor from '@/components/guardrails/TopicBanEditor';
import KeywordBanEditor from '@/components/guardrails/KeywordBanEditor';
import StaticGuardrailsPanel from '@/components/guardrails/StaticGuardrailsPanel';
import GuardrailTestPanel from '@/components/guardrails/GuardrailTestPanel';
import { GuardrailsConfig } from '@/lib/guardrails/types';

export default function GuardrailsPage() {
  const [activeTab, setActiveTab] = useState<'topics' | 'keywords' | 'static' | 'test'>('topics');
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
        {activeTab === 'test' && (
          <GuardrailTestPanel config={config} />
        )}
      </div>
    </div>
  );
}
