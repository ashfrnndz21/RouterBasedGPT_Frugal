'use client';

import { useState } from 'react';
import { Shield, AlertCircle } from 'lucide-react';
import { Switch } from '@headlessui/react';
import { GuardrailsConfig } from '@/lib/guardrails/types';
import { cn } from '@/lib/utils';

type PIIType = 'email' | 'phone' | 'ssn' | 'credit-card' | 'ip-address';

interface PIIDetectionPanelProps {
  config: GuardrailsConfig;
  onUpdate: () => void;
}

export default function PIIDetectionPanel({ config, onUpdate }: PIIDetectionPanelProps) {
  const outputConfig = config.output || {
    enabled: false,
    keywordBlocking: { enabled: false, keywords: [], matchMode: 'contains', caseSensitive: false },
    piiDetection: { enabled: false, types: [], action: 'block', redactionChar: '***' },
    patternBlocking: { enabled: false, patterns: [] },
    safeMessage: '',
  };

  const [enabled, setEnabled] = useState(outputConfig.piiDetection.enabled);
  const [types, setTypes] = useState<PIIType[]>(outputConfig.piiDetection.types || []);
  const [action, setAction] = useState<'block' | 'redact'>(outputConfig.piiDetection.action || 'block');
  const [redactionChar, setRedactionChar] = useState(outputConfig.piiDetection.redactionChar || '***');
  const [saving, setSaving] = useState(false);

  const piiTypes: Array<{ id: PIIType; label: string; example: string }> = [
    { id: 'email', label: 'Email Address', example: 'user@example.com' },
    { id: 'phone', label: 'Phone Number', example: '(555) 123-4567' },
    { id: 'ssn', label: 'Social Security Number', example: '123-45-6789' },
    { id: 'credit-card', label: 'Credit Card Number', example: '1234 5678 9012 3456' },
    { id: 'ip-address', label: 'IP Address', example: '192.168.1.1' },
  ];

  const saveConfig = async (updates: Partial<typeof outputConfig.piiDetection>) => {
    setSaving(true);
    try {
      await fetch('/api/guardrails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          output: {
            ...outputConfig,
            piiDetection: {
              ...outputConfig.piiDetection,
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

  const toggleType = async (typeId: PIIType) => {
    const updated = types.includes(typeId)
      ? types.filter(t => t !== typeId)
      : [...types, typeId];
    setTypes(updated);
    await saveConfig({ types: updated });
  };

  return (
    <div className="space-y-6">
      {/* Enable/Disable */}
      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
        <div>
          <h3 className="font-medium text-gray-900 dark:text-white">PII Detection</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Detect and handle Personal Identifiable Information in responses
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
          {/* PII Types */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              PII Types to Detect
            </label>
            <div className="space-y-2">
              {piiTypes.map((type) => (
                <label
                  key={type.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={types.includes(type.id)}
                    onChange={() => toggleType(type.id)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-white">{type.label}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">{type.example}</div>
                  </div>
                  <Shield className="text-gray-400" size={16} />
                </label>
              ))}
            </div>
          </div>

          {/* Action */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Action When PII Detected
            </label>
            <select
              value={action}
              onChange={(e) => {
                const val = e.target.value as 'block' | 'redact';
                setAction(val);
                saveConfig({ action: val });
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="block">Block Response (replace with safe message)</option>
              <option value="redact">Redact PII (replace with redaction character)</option>
            </select>
          </div>

          {/* Redaction Character */}
          {action === 'redact' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Redaction Character
              </label>
              <input
                type="text"
                value={redactionChar}
                onChange={(e) => {
                  setRedactionChar(e.target.value);
                  saveConfig({ redactionChar: e.target.value });
                }}
                placeholder="***"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Character(s) used to replace detected PII
              </p>
            </div>
          )}

          {/* Info */}
          <div className="flex items-start gap-2 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <AlertCircle className="text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" size={16} />
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium mb-1">How it works:</p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Block:</strong> Entire response is replaced with safe message if PII is detected</li>
                <li><strong>Redact:</strong> PII is replaced with redaction character, response is still sent</li>
                <li>Detection uses regex patterns to identify common PII formats</li>
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
