'use client';

import { useState } from 'react';
import { TestTube, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { GuardrailsConfig } from '@/lib/guardrails/types';

interface GuardrailTestPanelProps {
  config: GuardrailsConfig;
}

export default function GuardrailTestPanel({ config }: GuardrailTestPanelProps) {
  const [testQuery, setTestQuery] = useState('');
  const [result, setResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  const testGuardrails = async () => {
    if (!testQuery.trim()) return;

    setTesting(true);
    setResult(null);

    try {
      const response = await fetch('/api/guardrails/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: testQuery,
          history: [],
          tier: 'tier1',
          identifier: 'test',
        }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Error testing guardrails:', error);
      setResult({
        allowed: false,
        reason: 'Failed to test guardrails',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-medium text-gray-900 dark:text-white mb-2">Test Guardrails</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Test how a query would be handled by the current guardrails configuration
        </p>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={testQuery}
            onChange={(e) => setTestQuery(e.target.value)}
            placeholder="Enter a query to test..."
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500"
            onKeyPress={(e) => e.key === 'Enter' && !testing && testGuardrails()}
          />
          <button
            onClick={testGuardrails}
            disabled={!testQuery.trim() || testing}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {testing ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Testing...</span>
              </>
            ) : (
              <>
                <TestTube size={16} />
                <span>Test</span>
              </>
            )}
          </button>
        </div>

        {result && (
          <div
            className={`p-4 rounded-lg border ${
              result.allowed
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            }`}
          >
            <div className="flex items-start gap-3">
              {result.allowed ? (
                <CheckCircle className="text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" size={20} />
              ) : (
                <XCircle className="text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" size={20} />
              )}
              <div className="flex-1">
                <p
                  className={`font-medium mb-1 ${
                    result.allowed
                      ? 'text-green-900 dark:text-green-100'
                      : 'text-red-900 dark:text-red-100'
                  }`}
                >
                  {result.allowed ? 'Query Allowed' : 'Query Blocked'}
                </p>
                <p
                  className={`text-sm ${
                    result.allowed
                      ? 'text-green-800 dark:text-green-200'
                      : 'text-red-800 dark:text-red-200'
                  }`}
                >
                  {result.reason}
                </p>
                {result.violations && result.violations.length > 0 && (
                  <div className="mt-3 space-y-1">
                    <p className="text-xs font-medium text-red-900 dark:text-red-100">Violations:</p>
                    {result.violations.map((violation: any, index: number) => (
                      <div key={index} className="text-xs text-red-800 dark:text-red-200 pl-4">
                        • {violation.reason}
                      </div>
                    ))}
                  </div>
                )}
                {result.metadata && Object.keys(result.metadata).length > 0 && (
                  <details className="mt-3" open>
                    <summary className="text-xs font-medium cursor-pointer text-gray-700 dark:text-gray-300 mb-2">
                      View Details (Click to expand/collapse)
                    </summary>
                    <pre className="mt-2 text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-auto max-h-60">
                      {JSON.stringify(result.metadata, null, 2)}
                    </pre>
                  </details>
                )}
                {result.error && (
                  <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded text-xs text-yellow-800 dark:text-yellow-200">
                    Error: {result.error}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Configuration Status */}
        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">Current Configuration:</p>
          <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            <p>Topic Banning: {config.dynamic.topicBanning.enabled ? '✅ Enabled' : '❌ Disabled'}</p>
            {config.dynamic.topicBanning.enabled && (
              <>
                <p>Banned Topics: {config.dynamic.topicBanning.topics.length > 0 ? config.dynamic.topicBanning.topics.join(', ') : 'None'}</p>
                <p>Method: {config.dynamic.topicBanning.method}</p>
                <p>Threshold: {config.dynamic.topicBanning.threshold}</p>
              </>
            )}
            <p>Keyword Banning: {config.dynamic.keywordBanning.enabled ? '✅ Enabled' : '❌ Disabled'}</p>
            {config.dynamic.keywordBanning.enabled && (
              <>
                <p>Banned Keywords: {config.dynamic.keywordBanning.keywords.length > 0 ? config.dynamic.keywordBanning.keywords.join(', ') : 'None'}</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Example Queries */}
      <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
        <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">Example Queries:</p>
        <div className="space-y-2">
          {[
            'What is machine learning?',
            'How do I gamble online?',
            'Tell me about cryptocurrency trading',
            'What is the capital of France?',
          ].map((example, index) => (
            <button
              key={index}
              onClick={() => {
                setTestQuery(example);
                setResult(null);
              }}
              className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
            >
              &quot;{example}&quot;
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
