/**
 * Model Tier Configuration for Frugal RAG
 * 
 * Tier 1: Fast, cheap models for 90% of queries
 * Tier 2: Smarter, more expensive models for complex reasoning
 */

export interface ModelTierConfig {
  tier: 'tier1' | 'tier2';
  provider: string;
  modelName: string;
  displayName: string;
  description: string;
  costMultiplier: number; // Relative cost (tier1 = 1x, tier2 = 3-5x)
}

/**
 * Recommended model configurations for each tier
 * 
 * These can be overridden via environment variables or config
 */
export const DEFAULT_TIER_CONFIGS: Record<string, ModelTierConfig> = {
  tier1: {
    tier: 'tier1',
    provider: 'ollama',
    modelName: 'granite4:micro',
    displayName: 'Granite 4 Micro (Tier 1)',
    description: 'Ultra-fast, ultra-efficient IBM model for most queries',
    costMultiplier: 1.0,
  },
  tier2: {
    tier: 'tier2',
    provider: 'ollama',
    modelName: 'qwen3:1.7b',
    displayName: 'Qwen 3 1.7B (Tier 2)',
    description: 'Compact but capable Alibaba model for complex reasoning',
    costMultiplier: 2.5,
  },
};

/**
 * Alternative tier configurations for different providers
 */
export const TIER_ALTERNATIVES: Record<string, ModelTierConfig[]> = {
  tier1: [
    {
      tier: 'tier1',
      provider: 'ollama',
      modelName: 'granite4:micro',
      displayName: 'Granite 4 Micro',
      description: 'IBM Granite 4 - Ultra-lightweight, extremely fast',
      costMultiplier: 1.0,
    },
    {
      tier: 'tier1',
      provider: 'ollama',
      modelName: 'phi3:mini',
      displayName: 'Phi-3 Mini',
      description: 'Microsoft Phi-3 - 3.8B parameters, 4-bit quantized',
      costMultiplier: 1.1,
    },
    {
      tier: 'tier1',
      provider: 'ollama',
      modelName: 'llama3:8b',
      displayName: 'Llama 3 8B',
      description: 'Meta Llama 3 - 8B parameters, 4-bit quantized',
      costMultiplier: 1.2,
    },
    {
      tier: 'tier1',
      provider: 'groq',
      modelName: 'llama-3.1-8b-instant',
      displayName: 'Llama 3.1 8B (Groq)',
      description: 'Ultra-fast inference via Groq',
      costMultiplier: 1.5,
    },
  ],
  tier2: [
    {
      tier: 'tier2',
      provider: 'ollama',
      modelName: 'qwen3:1.7b',
      displayName: 'Qwen 3 1.7B',
      description: 'Alibaba Qwen 3 - 1.7B parameters, compact but capable',
      costMultiplier: 2.5,
    },
    {
      tier: 'tier2',
      provider: 'ollama',
      modelName: 'mistral:7b',
      displayName: 'Mistral 7B',
      description: 'Mistral AI - 7B parameters, excellent reasoning',
      costMultiplier: 3.5,
    },
    {
      tier: 'tier2',
      provider: 'ollama',
      modelName: 'llama3:70b',
      displayName: 'Llama 3 70B',
      description: 'Meta Llama 3 - 70B parameters, top-tier performance',
      costMultiplier: 8.0,
    },
    {
      tier: 'tier2',
      provider: 'anthropic',
      modelName: 'claude-3-haiku-20240307',
      displayName: 'Claude 3 Haiku',
      description: 'Anthropic Claude - Fast and capable',
      costMultiplier: 5.0,
    },
  ],
};

/**
 * Get the configured model for a specific tier
 */
export function getTierConfig(tier: 'tier1' | 'tier2'): ModelTierConfig {
  // In a real implementation, this would check environment variables
  // or user configuration to allow customization
  return DEFAULT_TIER_CONFIGS[tier];
}

/**
 * Get all available models for a tier
 */
export function getTierAlternatives(tier: 'tier1' | 'tier2'): ModelTierConfig[] {
  return TIER_ALTERNATIVES[tier] || [];
}

/**
 * Calculate estimated cost savings from using tiered models
 */
export function calculateCostSavings(
  tier1Queries: number,
  tier2Queries: number,
  cacheHits: number
): {
  withTiering: number;
  withoutTiering: number;
  savings: number;
  savingsPercent: number;
} {
  const tier1Cost = DEFAULT_TIER_CONFIGS.tier1.costMultiplier;
  const tier2Cost = DEFAULT_TIER_CONFIGS.tier2.costMultiplier;
  
  // Cost with tiering (cache hits are free)
  const withTiering = (tier1Queries * tier1Cost) + (tier2Queries * tier2Cost);
  
  // Cost without tiering (all queries use tier2, no cache)
  const totalQueries = tier1Queries + tier2Queries + cacheHits;
  const withoutTiering = totalQueries * tier2Cost;
  
  const savings = withoutTiering - withTiering;
  const savingsPercent = (savings / withoutTiering) * 100;
  
  return {
    withTiering,
    withoutTiering,
    savings,
    savingsPercent,
  };
}
