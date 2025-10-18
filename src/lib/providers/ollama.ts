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

  // FRUGAL RAG: Only load embedding models we need
  const ALLOWED_EMBEDDING_MODELS = ['nomic-embed-text:latest', 'nomic-embed-text'];

  try {
    const res = await axios.get(`${ollamaApiEndpoint}/api/tags`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const { models } = res.data;

    const embeddingModels: Record<string, EmbeddingModel> = {};

    // Only load embedding models that are in our allowed list
    models.forEach((model: any) => {
      if (ALLOWED_EMBEDDING_MODELS.includes(model.model)) {
        embeddingModels[model.model] = {
          displayName: model.name,
          model: new OllamaEmbeddings({
            baseUrl: ollamaApiEndpoint,
            model: model.model,
            ...(ollamaApiKey
              ? { headers: { Authorization: `Bearer ${ollamaApiKey}` } }
              : {}),
          }),
        };
      }
    });

    return embeddingModels;
  } catch (err) {
    console.error(`Error loading Ollama embeddings models: ${err}`);
    return {};
  }
};
