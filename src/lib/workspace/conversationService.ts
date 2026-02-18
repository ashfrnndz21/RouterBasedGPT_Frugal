import { eq, desc, and } from 'drizzle-orm';
import db from '@/lib/db';
import {
  workspaceConversations,
  workspaceMessages,
  workspacePins,
} from '@/lib/db/schema';
import {
  WorkspaceConversation,
  WorkspaceMessage,
  PinnedInsight,
} from '@/lib/types/workspace';
import { randomUUID } from 'crypto';

export interface CreateConversationDTO {
  id?: string; // Optional: use provided ID or generate new one
  workspaceId: string;
  agentId?: string; // Optional: agent to use for this conversation
  title: string;
  createdBy: string;
}

export interface AddMessageDTO {
  conversationId: string;
  workspaceId: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: any[];
  metadata?: {
    documentsSearched?: string[];
    databasesQueried?: string[];
    tokensUsed?: number;
  };
  createdBy: string;
}

export interface PinMessageDTO {
  workspaceId: string;
  messageId: string;
  conversationId?: string;
  content?: string;
  pinnedBy: string;
  title?: string;
  category?: string;
}

export class ConversationService {
  /**
   * Create a new conversation in a workspace
   */
  async createConversation(
    data: CreateConversationDTO
  ): Promise<WorkspaceConversation> {
    const id = data.id || randomUUID(); // Use provided ID or generate new one
    const now = new Date().toISOString();

    const conversationData = {
      id,
      workspaceId: data.workspaceId,
      agentId: data.agentId || null,
      title: data.title,
      createdBy: data.createdBy,
      createdAt: now,
      updatedAt: now,
      messageCount: 0,
    };

    await db.insert(workspaceConversations).values(conversationData);

    return {
      id,
      workspaceId: data.workspaceId,
      agentId: data.agentId,
      title: data.title,
      createdBy: data.createdBy,
      createdAt: new Date(now),
      updatedAt: new Date(now),
      messageCount: 0,
    };
  }

  /**
   * List all conversations in a workspace
   */
  async listConversations(
    workspaceId: string
  ): Promise<WorkspaceConversation[]> {
    const results = await db
      .select()
      .from(workspaceConversations)
      .where(eq(workspaceConversations.workspaceId, workspaceId))
      .orderBy(desc(workspaceConversations.updatedAt));

    return results.map((conv) => ({
      id: conv.id,
      workspaceId: conv.workspaceId,
      agentId: conv.agentId || undefined,
      title: conv.title,
      createdBy: conv.createdBy,
      createdAt: new Date(conv.createdAt),
      updatedAt: new Date(conv.updatedAt),
      messageCount: conv.messageCount || 0,
    }));
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(conversationId: string): Promise<boolean> {
    const result = await db
      .delete(workspaceConversations)
      .where(eq(workspaceConversations.id, conversationId));
    return result.changes > 0;
  }

  /**
   * Add a message to a conversation
   */
  async addMessage(data: AddMessageDTO): Promise<WorkspaceMessage> {
    const id = randomUUID();
    const now = new Date().toISOString();

    const messageData = {
      id,
      conversationId: data.conversationId,
      workspaceId: data.workspaceId,
      role: data.role,
      content: data.content,
      sources: data.sources || [],
      metadata: data.metadata || {},
      createdBy: data.createdBy,
      createdAt: now,
    };

    await db.insert(workspaceMessages).values(messageData);

    // Update message count and updatedAt for conversation
    const conversation = await db
      .select()
      .from(workspaceConversations)
      .where(eq(workspaceConversations.id, data.conversationId))
      .limit(1);

    if (conversation.length > 0) {
      await db
        .update(workspaceConversations)
        .set({
          messageCount: (conversation[0].messageCount || 0) + 1,
          updatedAt: now,
        })
        .where(eq(workspaceConversations.id, data.conversationId));
    }

    return {
      id,
      conversationId: data.conversationId,
      workspaceId: data.workspaceId,
      role: data.role,
      content: data.content,
      sources: data.sources,
      metadata: data.metadata,
      createdBy: data.createdBy,
      createdAt: new Date(now),
    };
  }

  /**
   * Get all messages in a conversation
   */
  async getMessages(conversationId: string): Promise<WorkspaceMessage[]> {
    const results = await db
      .select()
      .from(workspaceMessages)
      .where(eq(workspaceMessages.conversationId, conversationId))
      .orderBy(workspaceMessages.createdAt);

    return results.map((msg) => ({
      id: msg.id,
      conversationId: msg.conversationId,
      workspaceId: msg.workspaceId,
      role: msg.role,
      content: msg.content,
      sources: msg.sources || undefined,
      metadata: msg.metadata || undefined,
      createdBy: msg.createdBy,
      createdAt: new Date(msg.createdAt),
    }));
  }

  /**
   * Pin a message as an insight
   */
  async pinMessage(data: PinMessageDTO): Promise<PinnedInsight> {
    const id = randomUUID();
    const now = new Date().toISOString();

    const pinData = {
      id,
      workspaceId: data.workspaceId,
      messageId: data.messageId,
      conversationId: data.conversationId || null,
      content: data.content || null,
      title: data.title || null,
      category: data.category || null,
      pinnedBy: data.pinnedBy,
      pinnedAt: now,
    };

    await db.insert(workspacePins).values(pinData);

    return {
      id,
      workspaceId: data.workspaceId,
      messageId: data.messageId,
      title: data.title,
      category: data.category,
      pinnedBy: data.pinnedBy,
      pinnedAt: new Date(now),
      message: data.content ? {
        content: data.content,
        conversationId: data.conversationId || '',
      } : undefined,
    };
  }

  /**
   * Unpin a message
   */
  async unpinMessage(pinId: string): Promise<boolean> {
    const result = await db
      .delete(workspacePins)
      .where(eq(workspacePins.id, pinId));
    return result.changes > 0;
  }

  /**
   * List all pinned insights in a workspace
   */
  async listPinnedInsights(workspaceId: string): Promise<PinnedInsight[]> {
    const results = await db
      .select()
      .from(workspacePins)
      .where(eq(workspacePins.workspaceId, workspaceId))
      .orderBy(desc(workspacePins.pinnedAt));

    return results.map((pin) => ({
      id: pin.id,
      workspaceId: pin.workspaceId,
      messageId: pin.messageId,
      title: pin.title || undefined,
      category: pin.category || undefined,
      pinnedBy: pin.pinnedBy,
      pinnedAt: new Date(pin.pinnedAt),
      message: pin.content
        ? {
            content: pin.content,
            conversationId: pin.conversationId || '',
          }
        : undefined,
    }));
  }
}

// Export singleton instance
export const conversationService = new ConversationService();
