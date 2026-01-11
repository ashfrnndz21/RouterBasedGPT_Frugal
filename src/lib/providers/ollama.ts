import axios from 'axios';
import { getKeepAlive, getOllamaApiEndpoint, getOllamaApiKey } from '../config';
import { ChatModel, EmbeddingModel } from '.';

export const PROVIDER_INFO = {
  key: 'ollama',
  displayName: 'Ollama',
};
import { ChatOllama } from '@langchain/ollama';
import { OllamaEmbeddings } from '@langchain/ollama';

export const loadOllamaChatModels = async () => {
  const ollamaApiEndpoint = getOllamaApiEndpoint();
  const ollamaApiKey = getOllamaApiKey();

  if (!ollamaApiEndpoint) return {};

  // FRUGAL RAG: Only load specified models for tiered inference
  const ALLOWED_MODELS = ['granite4:micro', 'qwen3:1.7b'];

  try {
    const res = await axios.get(`${ollamaApiEndpoint}/api/tags`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const { models } = res.data;

    const chatModels: Record<string, ChatModel> = {};

    // Only load models that are in our allowed list
    models.forEach((model: any) => {
      if (ALLOWED_MODELS.includes(model.model)) {
        const displayName = model.model === 'granite4:micro' 
          ? 'Granite 4 Micro (Tier 1 - Fast)'
          : model.model === 'qwen3:1.7b'
          ? 'Qwen 3 1.7B (Tier 2 - Smart)'
          : model.name;

        chatModels[model.model] = {
          displayName,
          model: new ChatOllama({
            baseUrl: ollamaApiEndpoint,
            model: model.model,
            temperature: 0.7,
            keepAlive: getKeepAlive(),
            ...(ollamaApiKey
              ? { headers: { Authorization: `Bearer ${ollamaApiKey}` } }
              : {}),
          }),
        };
      }
    });

    return chatModels;
  } catch (err) {
    console.error(`Error loading Ollama models: ${err}`);
    return {};
  }
};

export const loadOllamaEmbeddingModels = async () => {
  const ollamaApiEndpoint = getOllamaApiEndpoint();
  const ollamaApiKey = getOllamaApiKey();

  if (!ollamaApiEndpoint) return {};

  // FRUGAL RAG: Load embedding models - prefer better quality models for semantic similarity
  // Priority order: bge-large > mxbai-embed-large > snowflake-arctic-embed > qwen3-embedding > nomic-embed-text
  const ALLOWED_EMBEDDING_MODELS = [
    'bge-large',
    'mxbai-embed-large',
    'snowflake-arctic-embed',
    'qwen3-embedding',
    'nomic-embed-text:latest',
    'nomic-embed-text',
  ];

  try {
    const res = await axios.get(`${ollamaApiEndpoint}/api/tags`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const { models } = res.data;

    console.log(`[Ollama] Found ${models.length} total models, checking for embedding models...`);
    const embeddingModels: Record<string, EmbeddingModel> = {};

    // Only load embedding models that are in our allowed list
    models.forEach((model: any) => {
      const modelName = model.model || model.name;
      // Check if model name matches (with or without :latest tag)
      const baseModelName = modelName.replace(/:latest$/, '');
      const matches = ALLOWED_EMBEDDING_MODELS.some(allowed => {
        const allowedBase = allowed.replace(/:latest$/, '');
        return baseModelName === allowedBase || modelName === allowed;
      });
      
      if (matches) {
        // Use the base name without :latest for consistency
        const key = baseModelName;
        embeddingModels[key] = {
          displayName: model.name || modelName,
          model: new OllamaEmbeddings({
            baseUrl: ollamaApiEndpoint,
            model: modelName, // Use the actual model name from Ollama (may include :latest)
            ...(ollamaApiKey
              ? { headers: { Authorization: `Bearer ${ollamaApiKey}` } }
              : {}),
          }),
        };
        console.log(`[Ollama] ✅ Loaded embedding model: ${key} (Ollama name: ${modelName})`);
      } else {
        // Debug: log models that don't match
        if (modelName && (modelName.includes('embed') || modelName.includes('bge') || modelName.includes('mxbai'))) {
          console.log(`[Ollama] ⚠️  Found embedding-like model but not in allowed list: ${modelName}`);
        }
      }
    });
    
    console.log(`[Ollama] Loaded ${Object.keys(embeddingModels).length} embedding models: ${Object.keys(embeddingModels).join(', ')}`);

    return embeddingModels;
  } catch (err) {
    console.error(`Error loading Ollama embeddings models: ${err}`);
    return {};
  }
};
