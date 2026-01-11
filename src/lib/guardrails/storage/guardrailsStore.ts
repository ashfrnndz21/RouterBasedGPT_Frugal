/**
 * Guardrails Store - Persists guardrails configuration to file system
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { GuardrailsConfig, getDefaultGuardrailsConfig } from '../types';

const CONFIG_DIR = join(process.cwd(), 'data');
const CONFIG_PATH = join(CONFIG_DIR, 'guardrails.json');

/**
 * Load guardrails configuration from file
 */
export function loadGuardrailsConfig(): GuardrailsConfig {
  try {
    const content = readFileSync(CONFIG_PATH, 'utf-8');
    const config = JSON.parse(content);
    
    // Merge with defaults to handle new fields
    const defaults = getDefaultGuardrailsConfig();
    return {
      ...defaults,
      ...config,
      static: {
        ...defaults.static,
        ...config.static,
      },
      dynamic: {
        ...defaults.dynamic,
        ...config.dynamic,
        topicBanning: {
          ...defaults.dynamic.topicBanning,
          ...config.dynamic?.topicBanning,
        },
        keywordBanning: {
          ...defaults.dynamic.keywordBanning,
          ...config.dynamic?.keywordBanning,
        },
        customPrompts: {
          ...defaults.dynamic.customPrompts,
          ...config.dynamic?.customPrompts,
        },
        contentModeration: {
          ...defaults.dynamic.contentModeration,
          ...config.dynamic?.contentModeration,
        },
        organizationRelevance: {
          ...defaults.dynamic.organizationRelevance,
          ...config.dynamic?.organizationRelevance,
        },
      },
      output: defaults.output ? {
        ...defaults.output,
        ...(config.output || {}),
        keywordBlocking: {
          ...defaults.output.keywordBlocking,
          ...(config.output?.keywordBlocking || {}),
        },
        piiDetection: {
          ...defaults.output.piiDetection,
          ...(config.output?.piiDetection || {}),
        },
        patternBlocking: {
          ...defaults.output.patternBlocking,
          ...(config.output?.patternBlocking || {}),
        },
      } : (config.output || getDefaultGuardrailsConfig().output),
    };
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // File doesn't exist, return defaults and create file
      const defaults = getDefaultGuardrailsConfig();
      saveGuardrailsConfig(defaults);
      return defaults;
    }
    console.error('[GuardrailsStore] Error loading config:', error);
    return getDefaultGuardrailsConfig();
  }
}

/**
 * Save guardrails configuration to file
 */
export function saveGuardrailsConfig(config: GuardrailsConfig): void {
  try {
    // Ensure data directory exists
    mkdirSync(CONFIG_DIR, { recursive: true });
    
    // Update metadata
    const updatedConfig: GuardrailsConfig = {
      ...config,
      lastUpdated: Date.now(),
    };
    
    writeFileSync(CONFIG_PATH, JSON.stringify(updatedConfig, null, 2), 'utf-8');
    console.log('[GuardrailsStore] Configuration saved');
  } catch (error) {
    console.error('[GuardrailsStore] Error saving config:', error);
    throw error;
  }
}

/**
 * Update guardrails configuration (partial update)
 */
export function updateGuardrailsConfig(updates: Partial<GuardrailsConfig>): GuardrailsConfig {
  const current = loadGuardrailsConfig();
  const updated = deepMerge(current, updates);
  saveGuardrailsConfig(updated);
  return updated;
}

/**
 * Deep merge two objects
 */
function deepMerge(target: any, source: any): any {
  const output = { ...target };
  
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }
  
  return output;
}

function isObject(item: any): boolean {
  return item && typeof item === 'object' && !Array.isArray(item);
}
