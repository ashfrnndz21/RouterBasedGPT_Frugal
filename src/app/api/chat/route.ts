import crypto from 'crypto';
import { AIMessage, BaseMessage, HumanMessage } from '@langchain/core/messages';
import { EventEmitter } from 'stream';
import {
  getAvailableChatModelProviders,
  getAvailableEmbeddingModelProviders,
} from '@/lib/providers';
import db from '@/lib/db';
import { chats, messages as messagesSchema } from '@/lib/db/schema';
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
) => {
  let recievedMessage = '';
  const aiMessageId = crypto.randomBytes(7).toString('hex');

  const startTime = Date.now();
  let sourcesReceived = false;
  let responseMetadata: any = null; // Store metadata from orchestrator

  stream.on('data', (data) => {
    try {
      const parsedData = JSON.parse(data);
      
      if (parsedData.type === 'response') {
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

        recievedMessage += parsedData.data;
        
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
  stream.on('end', () => {
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

    const chatModelProvider =
      chatModelProviders[
        body.chatModel?.provider || Object.keys(chatModelProviders)[0]
      ];
    const chatModel =
      chatModelProvider[
        body.chatModel?.name || Object.keys(chatModelProvider)[0]
      ];

    const embeddingProvider =
      embeddingModelProviders[
        body.embeddingModel?.provider || Object.keys(embeddingModelProviders)[0]
      ];
    const embeddingModel =
      embeddingProvider[
        body.embeddingModel?.name || Object.keys(embeddingProvider)[0]
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

    // Use OrchestrationService for intelligent routing and tiering
    const orchestrator = new OrchestrationService(handler, embedding);
    
    const responseStream = new TransformStream();
    const writer = responseStream.writable.getWriter();
    const encoder = new TextEncoder();

    // Set up event handlers BEFORE starting the query
    const maxHistoryTurns = body.maxHistoryTurns ?? 2;
    const stream = await orchestrator.handleQuery(
      message.content,
      history,
      llm,
      embedding,
      body.optimizationMode,
      body.files,
      systemInstructionsWithLanguage,
      maxHistoryTurns
    );

    // Attach event listeners immediately
    handleEmitterEvents(stream, writer, encoder, message.chatId);
    handleHistorySave(message, humanMessageId, body.focusMode, body.files);

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
