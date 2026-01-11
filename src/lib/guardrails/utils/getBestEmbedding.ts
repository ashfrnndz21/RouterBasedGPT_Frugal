/**
 * Get Best Embedding Model - Selects the best available embedding model for guardrails
 * Prioritizes models with better semantic similarity accuracy
 */

import { Embeddings } from '@langchain/core/embeddings';
import { getAvailableEmbeddingModelProviders } from '@/lib/providers';

/**
 * Priority order for embedding models (best to worst for semantic similarity):
 * 1. OpenAI text-embedding-3-large (best quality, but requires API)
 * 2. OpenAI text-embedding-3-small (good quality, requires API)
 * 3. bge-large (best local, 1.34GB, 1024 dims)
 * 4. mxbai-embed-large (good local, 670MB, 1024 dims, multilingual)
 * 5. snowflake-arctic-embed (good local, 560MB, 1024 dims)
 * 6. qwen3-embedding (local, recommended by Ollama)
 * 7. nomic-embed-text (default local, 274MB, 768 dims)
 */
const EMBEDDING_PRIORITY = {

  
  // Local models (best to worst)
  'ollama:qwen3-embedding:4b': 1,
  'ollama:bge-large': 3,
  'ollama:mxbai-embed-large': 4,
  'ollama:snowflake-arctic-embed': 5,
  'ollama:all-minilm': 7,
  'ollama:nomic-embed-text': 8,
  'ollama:nomic-embed-text:latest': 8,

};

interface EmbeddingOption {
  provider: string;
  modelName: string;
  displayName: string;
  embeddings: Embeddings;
  priority: number;
}

/**
 * Get the best available embedding model for guardrails
 */
export async function getBestEmbeddingForGuardrails(
  preferredModel?: { provider?: string; model?: string }
): Promise<Embeddings | null> {
  try {
    const embeddingProviders = await getAvailableEmbeddingModelProviders();
    const options: EmbeddingOption[] = [];

    // Collect all available embedding models
    // getAvailableEmbeddingModelProviders() returns Record<string, Record<string, EmbeddingModel>>
    for (const [providerName, providerModels] of Object.entries(embeddingProviders)) {
      try {
        // providerModels is already Record<string, EmbeddingModel>, not a function
        if (providerModels && typeof providerModels === 'object') {
          for (const [modelName, modelData] of Object.entries(providerModels)) {
            if (modelData && typeof modelData === 'object' && 'model' in modelData && 'displayName' in modelData) {
              // Normalize model name (remove :latest suffix for priority lookup)
              const normalizedName = modelName.replace(/:latest$/, '');
              const key = `${providerName}:${normalizedName}`;
              const priority = EMBEDDING_PRIORITY[key as keyof typeof EMBEDDING_PRIORITY] || 100;
              
              console.log(`[Guardrails] Found embedding: ${providerName}/${modelName} (normalized: ${normalizedName}, priority: ${priority})`);
              
              options.push({
                provider: providerName,
                modelName,
                displayName: modelData.displayName,
                embeddings: modelData.model,
                priority,
              });
            }
          }
        }
      } catch (error) {
        console.warn(`[Guardrails] Failed to process ${providerName} embeddings:`, error);
      }
    }

    if (options.length === 0) {
      console.warn('[Guardrails] No embedding models available');
      return null;
    }

    // If preferred model is specified, try to use it first
    if (preferredModel?.provider && preferredModel?.model) {
      const preferred = options.find(
        opt => opt.provider === preferredModel.provider && opt.modelName === preferredModel.model
      );
      if (preferred) {
        console.log(`[Guardrails] Using preferred embedding model: ${preferred.provider}/${preferred.modelName}`);
        return preferred.embeddings;
      } else {
        console.warn(`[Guardrails] Preferred model ${preferredModel.provider}/${preferredModel.model} not available, using best available`);
      }
    }

    // Sort by priority (lower number = better)
    options.sort((a, b) => a.priority - b.priority);

    const best = options[0];
    console.log(`[Guardrails] Using best available embedding model: ${best.provider}/${best.modelName} (${best.displayName}, priority: ${best.priority})`);
    
    return best.embeddings;
  } catch (error) {
    console.error('[Guardrails] Error getting best embedding:', error);
    return null;
  }
}
