import crypto from 'crypto';
import { AIMessage, BaseMessage, HumanMessage } from '@langchain/core/messages';
import { EventEmitter } from 'stream';
import {
  getAvailableChatModelProviders,
  getAvailableEmbeddingModelProviders,
} from '@/lib/providers';
import db from '@/lib/db';
import { chats, messages as messagesSchema, workspaceAgents } from '@/lib/db/schema';
import { and, eq, gt } from 'drizzle-orm';
import { getFileDetails } from '@/lib/utils/files';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ChatOpenAI } from '@langchain/openai';
import {
  getCustomOpenaiApiKey,
  getCustomOpenaiApiUrl,
  getCustomOpenaiModelName,
} from '@/lib/config';
import { searchHandlers } from '@/lib/search';
import { prependLanguageInstruction } from '@/lib/prompts';
import { StatefulOrchestrator } from '@/lib/orchestration/statefulOrchestrator';
import { OrchestrationService } from '@/lib/orchestration/orchestrationService';
import { z } from 'zod';
import { loadGuardrailsConfig } from '@/lib/guardrails/storage/guardrailsStore';
import { Guardrails } from '@/lib/guardrails';
import { getBestEmbeddingForGuardrails } from '@/lib/guardrails/utils/getBestEmbedding';
import { OutputGuardrails } from '@/lib/guardrails/output';
import { FrugalRouter } from '@/lib/routing/frugalRouter';
import agentConfigLoader, { AgentNotFoundError, AgentWorkspaceMismatchError } from '@/lib/workspace/agentConfigLoader';
import type { AgentConfig } from '@/lib/workspace/agentConfigLoader';
import dataAgentService, { NoDataSourceError } from '@/lib/workspace/dataAgentService';
import type { InlineResultCard } from '@/lib/workspace/dataAgentService';
import mentionParser from '@/lib/workspace/mentionParser';
import handoffHandler from '@/lib/workspace/handoffHandler';
import brainService from '@/lib/workspace/workspaceBrainService';
import activityLogger from '@/lib/workspace/agentActivityLogger';
import { conversationService } from '@/lib/workspace/conversationService';
import { getSoulLoader } from '@/lib/soul/soulLoader';
import presenceTracker from '@/lib/workspace/presenceTracker';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const messageSchema = z.object({
  messageId: z.string().min(1, 'Message ID is required'),
  chatId: z.string().min(1, 'Chat ID is required'),
  content: z.string().min(1, 'Message content is required'),
});

const chatModelSchema = z.object({
  provider: z.string().optional(),
  name: z.string().optional(),
});

const embeddingModelSchema = z.object({
  provider: z.string().optional(),
  name: z.string().optional(),
});

const bodySchema = z.object({
  message: messageSchema,
  optimizationMode: z.enum(['speed', 'balanced', 'quality'], {
    errorMap: () => ({
      message: 'Optimization mode must be one of: speed, balanced, quality',
    }),
  }),
  focusMode: z.string().min(1, 'Focus mode is required'),
  history: z
    .array(
      z.tuple([z.string(), z.string()], {
        errorMap: () => ({
          message: 'History items must be tuples of two strings',
        }),
      }),
    )
    .optional()
    .default([]),
  files: z.array(z.string()).optional().default([]),
  chatModel: chatModelSchema.optional().default({}),
  embeddingModel: embeddingModelSchema.optional().default({}),
  systemInstructions: z.string().nullable().optional().default(''),
  language: z.string().optional().default('en'),
  maxHistoryTurns: z.number().int().min(1).max(50).optional().default(2),
  agentId: z.string().optional(),
  workspaceId: z.string().optional(),
});

type Message = z.infer<typeof messageSchema>;
type Body = z.infer<typeof bodySchema>;

const safeValidateBody = (data: unknown) => {
  const result = bodySchema.safeParse(data);

  if (!result.success) {
    return {
      success: false,
      error: result.error.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      })),
    };
  }

  return {
    success: true,
    data: result.data,
  };
};

const handleEmitterEvents = async (
  stream: EventEmitter,
  writer: WritableStreamDefaultWriter,
  encoder: TextEncoder,
  chatId: string,
  onResponseComplete?: (responseText: string) => void,
) => {
  let recievedMessage = '';
  const aiMessageId = crypto.randomBytes(7).toString('hex');

  const startTime = Date.now();
  let sourcesReceived = false;
  let responseMetadata: any = null; // Store metadata from orchestrator
  let outputGuardrails: OutputGuardrails | null = null;
  let streamBlocked = false; // Flag to stop streaming if blocked
  
  // Check if output guardrails are enabled (to enable incremental checking)
  try {
    const guardrailsConfig = loadGuardrailsConfig();
    if (guardrailsConfig.output?.enabled) {
      outputGuardrails = new OutputGuardrails(guardrailsConfig.output);
    }
  } catch (error) {
    console.warn('[Chat] Could not initialize output guardrails for incremental checking:', error);
  }

  stream.on('data', (data) => {
    try {
      const parsedData = JSON.parse(data);
      
      if (parsedData.type === 'response') {
        // If already blocked, don't send more chunks
        if (streamBlocked) {
          return;
        }

        recievedMessage += parsedData.data;
        
        // Incremental check with sliding window (last ~100 chars = ~5-6 words)
        if (outputGuardrails && recievedMessage.length > 10) {
          const partialCheck = outputGuardrails.checkPartialResponse(recievedMessage, 100);
          
          if (!partialCheck.allowed) {
            // Violation detected - stop streaming immediately
            streamBlocked = true;
            const guardrailsConfig = loadGuardrailsConfig();
            const safeMessage = guardrailsConfig.output?.safeMessage || 'Response blocked by guardrails';
            
            console.warn('[Output Guardrails] Early violation detected, stopping stream:', partialCheck.reason);
            
            // Send outputBlocked event immediately
            writer.write(
              encoder.encode(
                JSON.stringify({
                  type: 'outputBlocked',
                  messageId: aiMessageId,
                  safeMessage: safeMessage,
                  reason: partialCheck.reason,
                  violations: partialCheck.violations || [],
                  metadata: partialCheck.metadata,
                }) + '\n',
              ),
            ).catch((err) => {
              if (err?.name !== 'ResponseAborted') {
                console.error('[Chat] Error writing outputBlocked event:', err);
              }
            });
            
            // Update received message for database
            recievedMessage = safeMessage;
            return; // Don't send this chunk
          }
        }
        
        // Chunk passed check - send it
        writer.write(
          encoder.encode(
            JSON.stringify({
              type: 'message',
              data: parsedData.data,
              messageId: aiMessageId,
            }) + '\n',
          ),
        ).catch((err) => {
          // Ignore ResponseAborted errors - client disconnected
          if (err?.name !== 'ResponseAborted') {
            console.error('[Chat] Error writing response:', err);
          }
        });
        
        // Capture metadata from orchestrator if available
        if (parsedData.metadata) {
          responseMetadata = { ...responseMetadata, ...parsedData.metadata };
        }
      } else if (parsedData.type === 'metadata') {
        // Capture final metadata with cost and token usage
        if (parsedData.data) {
          responseMetadata = { ...responseMetadata, ...parsedData.data };
        }
      } else if (parsedData.type === 'sources') {
        sourcesReceived = true;
        writer.write(
          encoder.encode(
            JSON.stringify({
              type: 'sources',
              data: parsedData.data,
              messageId: aiMessageId,
            }) + '\n',
          ),
        ).catch((err) => {
          // Ignore ResponseAborted errors - client disconnected
          if (err?.name !== 'ResponseAborted') {
            console.error('[Chat] Error writing sources:', err);
          }
        });

        const sourceMessageId = crypto.randomBytes(7).toString('hex');

        db.insert(messagesSchema)
          .values({
            chatId: chatId,
            messageId: sourceMessageId,
            role: 'source',
            sources: parsedData.data,
            createdAt: new Date().toString(),
          })
          .execute();
      }
    } catch (error) {
      console.error('[Chat] Error handling stream data:', error, 'Data:', data);
    }
  });
  stream.on('end', async () => {
    const endTime = Date.now();
    const latencyMs = endTime - startTime;
    
    // Use metadata from orchestrator if available, otherwise use defaults
    const metadata = responseMetadata || {
      modelTier: 'tier1' as const,
      routingPath: sourcesReceived ? 'rag-tier1' as const : 'canned' as const,
      estimatedCost: sourcesReceived ? 0.0008 : 0.0003,
      latencyMs: latencyMs,
      cacheHit: false,
    };
    
    // Ensure latencyMs is set
    if (!metadata.latencyMs) {
      metadata.latencyMs = latencyMs;
    }

    // Final output guardrails check (for PII detection and full context checks)
    // Note: If streamBlocked is true, we already handled it incrementally
    if (!streamBlocked) {
      try {
        const guardrailsConfig = loadGuardrailsConfig();
        if (guardrailsConfig.output?.enabled && outputGuardrails) {
          const outputCheck = await outputGuardrails.checkResponse(recievedMessage);
          
          if (!outputCheck.allowed) {
            // Response was blocked - send special event to frontend
            const blockedMessage = outputCheck.filtered || guardrailsConfig.output.safeMessage;
            const violations = outputCheck.violations || [];
            recievedMessage = blockedMessage;
            console.warn('[Output Guardrails] Response blocked (final check):', outputCheck.reason, violations);
            
            // Send outputBlocked event to frontend so it can replace the displayed message
            writer.write(
              encoder.encode(
                JSON.stringify({
                  type: 'outputBlocked',
                  messageId: aiMessageId,
                  safeMessage: blockedMessage,
                  reason: outputCheck.reason,
                  violations: violations,
                  metadata: outputCheck.metadata,
                }) + '\n',
              ),
            ).catch((err) => {
              if (err?.name !== 'ResponseAborted') {
                console.error('[Chat] Error writing outputBlocked event:', err);
              }
            });
          } else if (outputCheck.filtered && outputCheck.filtered !== recievedMessage) {
            // Response was sanitized (PII redacted) but allowed
            recievedMessage = outputCheck.filtered;
            console.log('[Output Guardrails] Response sanitized (PII redacted)');
          }
        }
      } catch (error) {
        console.error('[Output Guardrails] Final check failed:', error);
        // Fail-open: allow response through if check fails
      }
    }

    // ── Handoff detection (PTT Spaces V2 — Req 2.6) ──────────────────────────
    // Notify caller with the final response text so it can detect handoff signals.
    if (onResponseComplete) {
      onResponseComplete(recievedMessage);
    }
    // ─────────────────────────────────────────────────────────────────────────

    // Check if writer is still open before writing
    writer.write(
      encoder.encode(
        JSON.stringify({
          type: 'messageEnd',
          metadata: metadata,
        }) + '\n',
      ),
    ).then(() => {
      // Only close if not already closed
      try {
        writer.close();
      } catch (err: any) {
        // Ignore if already closed
        if (err?.code !== 'ERR_INVALID_STATE') {
          console.error('[Chat] Error closing writer:', err);
        }
      }
    }).catch((err) => {
      // Ignore ResponseAborted errors - client disconnected
      if (err?.name !== 'ResponseAborted') {
        console.error('[Chat] Error writing messageEnd:', err);
      }
      // Only try to close if not already closed
      try {
        writer.close();
      } catch (closeErr: any) {
        // Ignore if already closed
        if (closeErr?.code !== 'ERR_INVALID_STATE') {
          console.error('[Chat] Error closing writer:', closeErr);
        }
      }
    });

    db.insert(messagesSchema)
      .values({
        content: recievedMessage,
        chatId: chatId,
        messageId: aiMessageId,
        role: 'assistant',
        createdAt: new Date().toString(),
      })
      .execute();
  });
  stream.on('error', (error) => {
    console.error('[Chat] Stream error:', error);
    try {
      const errorData = typeof error === 'string' ? JSON.parse(error) : { data: String(error) };
      writer.write(
        encoder.encode(
          JSON.stringify({
            type: 'error',
            data: errorData.data || String(error),
          }) + '\n',
        ),
      ).catch((err) => {
        // Ignore ResponseAborted errors
        if (err?.name !== 'ResponseAborted') {
          console.error('[Chat] Error writing error message:', err);
        }
      }).finally(() => {
        // Only close if not already closed
        try {
          writer.close();
        } catch (closeErr: any) {
          if (closeErr?.code !== 'ERR_INVALID_STATE') {
            console.error('[Chat] Error closing writer on error:', closeErr);
          }
        }
      });
    } catch (err) {
      console.error('[Chat] Error parsing error data:', err);
      writer.write(
        encoder.encode(
          JSON.stringify({
            type: 'error',
            data: String(error),
          }) + '\n',
        ),
      ).catch((writeErr) => {
        // Ignore ResponseAborted errors
        if (writeErr?.name !== 'ResponseAborted') {
          console.error('[Chat] Error writing error message:', writeErr);
        }
      }).finally(() => {
        // Only close if not already closed
        try {
          writer.close();
        } catch (closeErr: any) {
          if (closeErr?.code !== 'ERR_INVALID_STATE') {
            console.error('[Chat] Error closing writer on error:', closeErr);
          }
        }
      });
    }
  });
};

const handleHistorySave = async (
  message: Message,
  humanMessageId: string,
  focusMode: string,
  files: string[],
) => {
  const chat = await db.query.chats.findFirst({
    where: eq(chats.id, message.chatId),
  });

  const fileData = files.map(getFileDetails);

  if (!chat) {
    await db
      .insert(chats)
      .values({
        id: message.chatId,
        title: message.content,
        createdAt: new Date().toString(),
        focusMode: focusMode,
        files: fileData,
      })
      .execute();
  } else if (JSON.stringify(chat.files ?? []) != JSON.stringify(fileData)) {
    db.update(chats)
      .set({
        files: files.map(getFileDetails),
      })
      .where(eq(chats.id, message.chatId));
  }

  const messageExists = await db.query.messages.findFirst({
    where: eq(messagesSchema.messageId, humanMessageId),
  });

  if (!messageExists) {
    await db
      .insert(messagesSchema)
      .values({
        content: message.content,
        chatId: message.chatId,
        messageId: humanMessageId,
        role: 'user',
        createdAt: new Date().toString(),
      })
      .execute();
  } else {
    await db
      .delete(messagesSchema)
      .where(
        and(
          gt(messagesSchema.id, messageExists.id),
          eq(messagesSchema.chatId, message.chatId),
        ),
      )
      .execute();
  }
};

export const POST = async (req: Request) => {
  try {
    const reqBody = (await req.json()) as Body;

    const parseBody = safeValidateBody(reqBody);
    if (!parseBody.success) {
      return Response.json(
        { message: 'Invalid request body', error: parseBody.error },
        { status: 400 },
      );
    }

    const body = parseBody.data as Body;
    const { message } = body;

    if (message.content === '') {
      return Response.json(
        {
          message: 'Please provide a message to process',
        },
        { status: 400 },
      );
    }

    const [chatModelProviders, embeddingModelProviders] = await Promise.all([
      getAvailableChatModelProviders(),
      getAvailableEmbeddingModelProviders(),
    ]);

    // ── Agent config loading (PTT Spaces V2 — Req 8.1, 8.2, 8.5, 8.6) ──────
    // When agentId is provided, load config from DB and use it as the authority
    // for systemPrompt, chatModel, and embeddingModel.
    let agentSystemPrompt: string | null = null;
    let agentChatModelOverride: { provider: string; name: string } | null = null;
    let agentEmbeddingModelOverride: { provider: string; name: string } | null = null;
    // resolvedAgentId is preserved for downstream use (activity logging, etc.)
    let resolvedAgentId: string | undefined = body.agentId;
    // memoryScope from agent config; defaults to 'workspace' when no agent loaded
    let resolvedMemoryScope: 'workspace' | 'agent' | 'user' = 'workspace';

    // ── Step 1: Fetch workspace agent roster (needed for mention parsing) ────
    let workspaceAgentRoster: AgentConfig[] = [];
    if (body.workspaceId) {
      try {
        const agentRows = await db
          .select()
          .from(workspaceAgents)
          .where(eq(workspaceAgents.workspaceId, body.workspaceId));
        workspaceAgentRoster = agentRows.map((a) => ({
          id: a.id,
          workspaceId: a.workspaceId,
          name: a.name,
          avatar: a.avatar ?? '🤖',
          role: a.role ?? '',
          specialty: a.specialty ?? '',
          systemPrompt: a.systemPrompt ?? '',
          chatModel: a.chatModel ?? null,
          chatModelProvider: a.chatModelProvider ?? null,
          embeddingModel: a.embeddingModel ?? null,
          embeddingModelProvider: a.embeddingModelProvider ?? null,
          toolsAllowed: (a.toolsAllowed as string[]) ?? [],
          memoryScope: (a.memoryScope as 'workspace' | 'agent' | 'user') ?? 'workspace',
        }));
      } catch (err) {
        console.error('[Chat] Failed to fetch workspace agent roster:', err);
      }
    }

    // ── Step 2: Parse @mentions (PTT Spaces V2 — Req 2.5, 2.10) ─────────────
    // When workspaceId is provided, check the message for @AgentName mentions.
    // A valid mention overrides the explicit agentId from the request.
    // An unknown mention returns an error to the user.
    if (body.workspaceId && workspaceAgentRoster.length > 0) {
      const mentionResult = mentionParser.parse(message.content, workspaceAgentRoster);

      if (mentionResult.unknownAgentNames.length > 0) {
        // Req 2.10: unknown @mention → return error, do not invoke LLM
        return Response.json(
          {
            message: `Unknown agent(s) mentioned: ${mentionResult.unknownAgentNames.map((n) => `@${n}`).join(', ')}. ` +
              `Available agents: ${workspaceAgentRoster.map((a) => `@${a.name}`).join(', ')}`,
          },
          { status: 400 },
        );
      }

      if (mentionResult.primaryAgentId !== null) {
        // Req 2.5: mention overrides explicit agentId
        resolvedAgentId = mentionResult.primaryAgentId;
        console.log(`[Chat] @mention routing to agent: ${resolvedAgentId}`);
      }
    }

    if (resolvedAgentId && body.workspaceId) {
      try {
        const agentConfig = await agentConfigLoader.loadAgent(resolvedAgentId, body.workspaceId);
        agentSystemPrompt = agentConfig.systemPrompt;
        resolvedMemoryScope = agentConfig.memoryScope;
        if (agentConfig.chatModel && agentConfig.chatModelProvider) {
          agentChatModelOverride = {
            provider: agentConfig.chatModelProvider,
            name: agentConfig.chatModel,
          };
        }
        if (agentConfig.embeddingModel && agentConfig.embeddingModelProvider) {
          agentEmbeddingModelOverride = {
            provider: agentConfig.embeddingModelProvider,
            name: agentConfig.embeddingModel,
          };
        }
      } catch (err) {
        if (err instanceof AgentNotFoundError) {
          return Response.json({ message: err.message }, { status: 404 });
        }
        if (err instanceof AgentWorkspaceMismatchError) {
          return Response.json({ message: err.message }, { status: 403 });
        }
        throw err;
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    // ── DataAgent short-circuit (PTT Spaces V2 — Req 5.2, 5.3) ──────────────
    // When the resolved agent is DataAgent and a workspaceId is present,
    // delegate to DataAgentService and return an InlineResultCard directly.
    // This bypasses the normal LLM/orchestrator flow entirely.
    if (body.workspaceId && resolvedAgentId) {
      const resolvedAgent = workspaceAgentRoster.find((a) => a.id === resolvedAgentId);
      if (resolvedAgent && resolvedAgent.name.toLowerCase() === 'dataagent') {
        try {
          const result: InlineResultCard = await dataAgentService.handleQuery(
            message.content,
            body.workspaceId,
            message.chatId,
            'system',
          );
          return Response.json(result);
        } catch (err) {
          if (err instanceof NoDataSourceError) {
            return Response.json({ message: err.message }, { status: 400 });
          }
          throw err;
        }
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    // Resolve chat model: agent DB override > client-supplied > first available
    const effectiveChatModelSpec = agentChatModelOverride ?? body.chatModel;
    const chatModelProvider =
      chatModelProviders[
        effectiveChatModelSpec?.provider || Object.keys(chatModelProviders)[0]
      ];
    const chatModel =
      chatModelProvider[
        effectiveChatModelSpec?.name || Object.keys(chatModelProvider)[0]
      ];

    // Resolve embedding model: agent DB override > client-supplied > first available
    const effectiveEmbeddingModelSpec = agentEmbeddingModelOverride ?? body.embeddingModel;
    const embeddingProvider =
      embeddingModelProviders[
        effectiveEmbeddingModelSpec?.provider || Object.keys(embeddingModelProviders)[0]
      ];
    const embeddingModel =
      embeddingProvider[
        effectiveEmbeddingModelSpec?.name || Object.keys(embeddingProvider)[0]
      ];

    let llm: BaseChatModel | undefined;
    let embedding = embeddingModel.model;

    if (body.chatModel?.provider === 'custom_openai') {
      llm = new ChatOpenAI({
        apiKey: getCustomOpenaiApiKey(),
        modelName: getCustomOpenaiModelName(),
        temperature: 0.7,
        configuration: {
          baseURL: getCustomOpenaiApiUrl(),
        },
      }) as unknown as BaseChatModel;
    } else if (chatModelProvider && chatModel) {
      llm = chatModel.model;
    }

    if (!llm) {
      return Response.json({ error: 'Invalid chat model' }, { status: 400 });
    }

    if (!embedding) {
      return Response.json(
        { error: 'Invalid embedding model' },
        { status: 400 },
      );
    }

    const humanMessageId =
      message.messageId ?? crypto.randomBytes(7).toString('hex');

    const history: BaseMessage[] = body.history.map((msg) => {
      if (msg[0] === 'human') {
        return new HumanMessage({
          content: msg[1],
        });
      } else {
        return new AIMessage({
          content: msg[1],
        });
      }
    });

    // Check if this is a canned response - skip guardrails for pre-approved static responses
    const frugalRouter = new FrugalRouter(embedding);
    const isCannedResponse = frugalRouter.getCannedResponse(message.content) !== null;
    
    // Apply guardrails (after history is created) - skip for canned responses
    if (!isCannedResponse) {
      try {
        const guardrailsConfig = loadGuardrailsConfig();
        
        // Use best embedding model for guardrails if topic banning is enabled
        // This ensures better semantic similarity accuracy
        let guardrailsEmbedding = embedding;
        if (guardrailsConfig.dynamic.topicBanning.enabled) {
          const bestEmbedding = await getBestEmbeddingForGuardrails(
            guardrailsConfig.dynamic.topicBanning.embeddingModel
          );
          if (bestEmbedding) {
            guardrailsEmbedding = bestEmbedding;
            console.log('[Chat API] Using optimized embedding model for guardrails');
          }
        }
        
        const guardrails = new Guardrails(guardrailsConfig, guardrailsEmbedding, llm);
        
        // Get client identifier for rate limiting
        const clientId = req.headers.get('x-forwarded-for') || 
                        req.headers.get('x-real-ip') || 
                        message.chatId || 
                        'unknown';
        
        // Determine tier (will be determined by router, but use tier1 as default for guardrails check)
        const tier: 'tier1' | 'tier2' = 'tier1';
        
        // Check guardrails
        const guardrailResult = await guardrails.check(
          message.content,
          history,
          tier,
          clientId
        );
        
        if (!guardrailResult.allowed) {
          const statusCode = guardrailResult.code === 'RATE_LIMIT_EXCEEDED' ? 429 : 403;
          return Response.json({
            error: guardrailResult.reason,
            code: guardrailResult.code,
            violations: guardrailResult.violations,
            metadata: guardrailResult.metadata,
          }, { status: statusCode });
        }
      } catch (error: any) {
        // Log error but don't block request if guardrails fail
        console.error('[Chat API] Guardrails check failed:', error);
        // Continue with request if guardrails fail (fail-open for now)
      }
    } else {
      console.log('[Chat API] Skipping guardrails for canned response:', message.content);
    }

    const handler = searchHandlers[body.focusMode];

    if (!handler) {
      return Response.json(
        {
          message: 'Invalid focus mode',
        },
        { status: 400 },
      );
    }

    // Prepend language-specific system prompt to existing instructions
    const systemInstructionsWithLanguage = prependLanguageInstruction(
      body.language,
      body.systemInstructions as string,
    );

    // ── Merge agent system prompt with SOUL (Req 8.5) ────────────────────────
    // When agentId is provided, the agent's DB system prompt is authoritative.
    // SOUL personality is prepended; agent prompt is appended after SOUL.
    // When no agentId, fall back to the client-supplied systemInstructions.
    let effectiveSystemInstructions: string;
    if (agentSystemPrompt !== null) {
      const soul = getSoulLoader().getPersonality();
      // SOUL first, then agent-specific prompt (agent prompt appended after SOUL)
      effectiveSystemInstructions = soul
        ? `${soul}\n\n${agentSystemPrompt}`
        : agentSystemPrompt;
    } else {
      effectiveSystemInstructions = systemInstructionsWithLanguage;
    }
    // ─────────────────────────────────────────────────────────────────────────

    const orchestrator = new StatefulOrchestrator(handler, embedding);
    
    const responseStream = new TransformStream();
    const writer = responseStream.writable.getWriter();
    const encoder = new TextEncoder();

    // Set up event handlers BEFORE starting the query
    const maxHistoryTurns = body.maxHistoryTurns ?? 2;
    const stream = await orchestrator.handleQuery(
      message.content,
      message.chatId,
      history,
      llm,
      embedding,
      body.optimizationMode,
      body.files,
      effectiveSystemInstructions,
      maxHistoryTurns
    );

    // Attach event listeners immediately
    handleEmitterEvents(stream, writer, encoder, message.chatId, (responseText) => {
      // ── Handoff detection (PTT Spaces V2 — Req 2.6) ────────────────────────
      // Detect [HANDOFF: AgentName | reason] markers in the response.
      // Full re-invocation is a future enhancement; for now we detect and log.
      if (body.workspaceId) {
        const handoffSignal = handoffHandler.detectHandoff(responseText);
        if (handoffSignal) {
          console.log(
            `[Chat] Handoff signal detected → target: "${handoffSignal.targetAgentName}", ` +
              `reason: "${handoffSignal.reason}", workspaceId: ${body.workspaceId}, ` +
              `conversationId: ${message.chatId}`,
          );
          // TODO: Full handoff re-invocation (future enhancement)

          // ── Activity log: handoff_sent (Req 2.7) ─────────────────────────
          if (resolvedAgentId) {
            activityLogger.record({
              agentId: resolvedAgentId,
              workspaceId: body.workspaceId,
              conversationId: message.chatId,
              messageId: '',
              actionType: 'handoff_sent',
              metadata: {
                targetAgentName: handoffSignal.targetAgentName,
                reason: handoffSignal.reason,
              },
            }).catch((err) => {
              console.error('[Chat] AgentActivityLogger.record(handoff_sent) failed:', err);
            });
          }
        }
      }

      // ── Workspace Brain indexing (PTT Spaces V2 — Req 1.2, 1.7) ───────────
      // Fire-and-forget: index the assistant response as a memory fact.
      // Errors are logged but never propagate to the response stream.
      if (body.workspaceId) {
        brainService.indexFact({
          workspaceId: body.workspaceId,
          agentId: resolvedAgentId ?? null,
          userId: 'system',
          scope: resolvedMemoryScope,
          content: responseText,
          embedding: null,
          sourceConversationId: message.chatId,
          sourceMessageId: null,
          pinned: false,
        }).catch((err) => {
          console.error('[Chat] WorkspaceBrainService.indexFact failed:', err);
        });
      }

      // ── Activity log: query_answered (PTT Spaces V2 — Req 2.7) ──────────
      // Fire-and-forget: record the completed turn in the activity log.
      // Errors are logged but never propagate to the response stream.
      if (resolvedAgentId && body.workspaceId) {
        activityLogger.record({
          agentId: resolvedAgentId,
          workspaceId: body.workspaceId,
          conversationId: message.chatId,
          messageId: '',
          actionType: 'query_answered',
          metadata: {},
        }).catch((err) => {
          console.error('[Chat] AgentActivityLogger.record(query_answered) failed:', err);
        });
      }

      // ── Participant agent tracking (PTT Spaces V2 — Req 3.4) ─────────────
      // Fire-and-forget: append resolvedAgentId to participant_agent_ids on
      // the workspace conversation if not already present.
      if (resolvedAgentId && body.workspaceId) {
        conversationService.appendParticipantAgent(message.chatId, resolvedAgentId).catch((err) => {
          console.error('[Chat] conversationService.appendParticipantAgent failed:', err);
        });
      }
      // ─────────────────────────────────────────────────────────────────────────
    });
    handleHistorySave(message, humanMessageId, body.focusMode, body.files);

    // ── Presence tracking (PTT Spaces V2 — Req 7.2) ──────────────────────────
    // Fire-and-forget: update the workspace presence timestamp on every chat action.
    if (body.workspaceId) {
      presenceTracker.touch(body.workspaceId, 'system').catch((err) => {
        console.error('[Chat] PresenceTracker.touch failed:', err);
      });
    }
    // ─────────────────────────────────────────────────────────────────────────

    return new Response(responseStream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        Connection: 'keep-alive',
        'Cache-Control': 'no-cache, no-transform',
      },
    });
  } catch (err) {
    console.error('An error occurred while processing chat request:', err);
    return Response.json(
      { message: 'An error occurred while processing chat request' },
      { status: 500 },
    );
  }
};
