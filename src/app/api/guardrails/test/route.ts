import { NextRequest, NextResponse } from 'next/server';
import { loadGuardrailsConfig } from '@/lib/guardrails/storage/guardrailsStore';
import { Guardrails } from '@/lib/guardrails';
import { getBestEmbeddingForGuardrails } from '@/lib/guardrails/utils/getBestEmbedding';
import { BaseMessage, HumanMessage, AIMessage } from '@langchain/core/messages';
import { getAvailableChatModelProviders } from '@/lib/providers';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';

/**
 * POST /api/guardrails/test
 * Test a query against guardrails without processing it
 */
export async function POST(req: NextRequest) {
  try {
    const { query, history = [], tier = 'tier1', identifier = 'test' } = await req.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required and must be a string' },
        { status: 400 }
      );
    }

    // Load configuration
    const config = loadGuardrailsConfig();

    // Get best available embedding model for guardrails
    const embeddings = await getBestEmbeddingForGuardrails(
      config.dynamic.topicBanning.embeddingModel
    );

    if (!embeddings) {
      return NextResponse.json(
        { error: 'No embedding model available for testing. Please ensure you have an embedding model installed (e.g., bge-large, mxbai-embed-large, or nomic-embed-text in Ollama).' },
        { status: 500 }
      );
    }

    // Get LLM for LLM-based topic banning (if method is 'llm')
    let llm: BaseChatModel | undefined;
    if (config.dynamic.topicBanning.enabled && config.dynamic.topicBanning.method === 'llm') {
      try {
        const chatModelProviders = await getAvailableChatModelProviders();
        // Get the first available LLM from any provider
        for (const providerName in chatModelProviders) {
          const provider = chatModelProviders[providerName];
          const firstModel = Object.values(provider)[0];
          if (firstModel?.model) {
            llm = firstModel.model;
            console.log(`[Guardrails Test] Using LLM: ${providerName}/${firstModel.displayName} for topic banning`);
            break;
          }
        }
        
        if (!llm) {
          console.warn('[Guardrails Test] LLM method selected but no LLM available, falling back to embeddings');
        }
      } catch (error) {
        console.warn('[Guardrails Test] Failed to load LLM:', error);
      }
    }

    // Initialize guardrails
    const guardrails = new Guardrails(config, embeddings, llm);

    // Convert history to BaseMessage format
    const baseHistory: BaseMessage[] = history.map((msg: any) => {
      const content = msg.content || msg[1] || '';
      if (msg.role === 'user' || msg.role === 'human') {
        return new HumanMessage({ content });
      } else {
        return new AIMessage({ content });
      }
    });

    // Check guardrails
    const result = await guardrails.check(query, baseHistory, tier, identifier);

    return NextResponse.json({
      allowed: result.allowed,
      reason: result.reason,
      violations: result.violations || [],
      metadata: result.metadata,
      code: result.code,
    });
  } catch (error: any) {
    console.error('[Guardrails Test API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to test guardrails', details: error.message },
      { status: 500 }
    );
  }
}
