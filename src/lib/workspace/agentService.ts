import { eq, and, desc } from 'drizzle-orm';
import db from '@/lib/db';
import { workspaceAgents } from '@/lib/db/schema';
import { WorkspaceAgent } from '@/lib/types/workspace';
import { randomUUID } from 'crypto';

export interface CreateAgentDTO {
  workspaceId: string;
  name: string;
  description?: string;
  systemPrompt?: string;
  chatModel?: string;
  chatModelProvider?: string;
  embeddingModel?: string;
  embeddingModelProvider?: string;
  isDefault?: boolean;
  avatar?: string;
  role?: string;
  specialty?: string;
  toolsAllowed?: string[];
  memoryScope?: 'workspace' | 'agent' | 'user';
}

export interface UpdateAgentDTO {
  name?: string;
  description?: string;
  systemPrompt?: string;
  chatModel?: string;
  chatModelProvider?: string;
  embeddingModel?: string;
  embeddingModelProvider?: string;
  avatar?: string;
  role?: string;
  specialty?: string;
  toolsAllowed?: string[];
  memoryScope?: 'workspace' | 'agent' | 'user';
}

export class AgentService {
  /**
   * Create a new agent in a workspace
   */
  async createAgent(dto: CreateAgentDTO): Promise<WorkspaceAgent> {
    // Validate agent name
    if (!dto.name || dto.name.trim().length === 0) {
      throw new Error('Agent name is required');
    }
    if (dto.name.length > 100) {
      throw new Error('Agent name must be 100 characters or less');
    }

    // Validate system prompt length
    if (dto.systemPrompt && dto.systemPrompt.length > 10000) {
      throw new Error('System prompt must be 10,000 characters or less');
    }

    const agentId = randomUUID();
    const now = new Date().toISOString();

    // If this agent is set as default, unset any existing defaults
    if (dto.isDefault) {
      await db
        .update(workspaceAgents)
        .set({ isDefault: false })
        .where(eq(workspaceAgents.workspaceId, dto.workspaceId));
    }

    const agent = {
      id: agentId,
      workspaceId: dto.workspaceId,
      name: dto.name.trim(),
      description: dto.description?.trim() || null,
      systemPrompt: dto.systemPrompt?.trim() || null,
      chatModel: dto.chatModel || null,
      chatModelProvider: dto.chatModelProvider || null,
      embeddingModel: dto.embeddingModel || null,
      embeddingModelProvider: dto.embeddingModelProvider || null,
      isDefault: dto.isDefault || false,
      avatar: dto.avatar || '🤖',
      role: dto.role?.trim() || null,
      specialty: dto.specialty?.trim() || null,
      toolsAllowed: dto.toolsAllowed || [],
      memoryScope: dto.memoryScope || 'workspace',
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(workspaceAgents).values(agent);

    return {
      ...agent,
      isDefault: agent.isDefault,
      description: agent.description || undefined,
      systemPrompt: agent.systemPrompt || undefined,
      chatModel: agent.chatModel || undefined,
      chatModelProvider: agent.chatModelProvider || undefined,
      embeddingModel: agent.embeddingModel || undefined,
      embeddingModelProvider: agent.embeddingModelProvider || undefined,
      role: agent.role || undefined,
      specialty: agent.specialty || undefined,
      toolsAllowed: agent.toolsAllowed as string[],
      memoryScope: agent.memoryScope as 'workspace' | 'agent' | 'user',
    };
  }

  /**
   * Update an existing agent
   */
  async updateAgent(
    agentId: string,
    dto: UpdateAgentDTO
  ): Promise<WorkspaceAgent | null> {
    // Validate name if provided
    if (dto.name !== undefined) {
      if (!dto.name || dto.name.trim().length === 0) {
        throw new Error('Agent name cannot be empty');
      }
      if (dto.name.length > 100) {
        throw new Error('Agent name must be 100 characters or less');
      }
    }

    // Validate system prompt length if provided
    if (dto.systemPrompt !== undefined && dto.systemPrompt.length > 10000) {
      throw new Error('System prompt must be 10,000 characters or less');
    }

    const updateData: any = {
      updatedAt: new Date().toISOString(),
    };

    if (dto.name !== undefined) updateData.name = dto.name.trim();
    if (dto.description !== undefined)
      updateData.description = dto.description.trim() || null;
    if (dto.systemPrompt !== undefined)
      updateData.systemPrompt = dto.systemPrompt.trim() || null;
    if (dto.chatModel !== undefined) updateData.chatModel = dto.chatModel || null;
    if (dto.chatModelProvider !== undefined)
      updateData.chatModelProvider = dto.chatModelProvider || null;
    if (dto.embeddingModel !== undefined)
      updateData.embeddingModel = dto.embeddingModel || null;
    if (dto.embeddingModelProvider !== undefined)
      updateData.embeddingModelProvider = dto.embeddingModelProvider || null;
    if (dto.avatar !== undefined) updateData.avatar = dto.avatar || '🤖';
    if (dto.role !== undefined) updateData.role = dto.role.trim() || null;
    if (dto.specialty !== undefined) updateData.specialty = dto.specialty.trim() || null;
    if (dto.toolsAllowed !== undefined) updateData.toolsAllowed = dto.toolsAllowed;
    if (dto.memoryScope !== undefined) updateData.memoryScope = dto.memoryScope;

    await db.update(workspaceAgents).set(updateData).where(eq(workspaceAgents.id, agentId));

    return this.getAgentById(agentId);
  }

  /**
   * Delete an agent
   * Prevents deletion if it's the last agent in the workspace
   */
  async deleteAgent(agentId: string): Promise<void> {
    // Get the agent to find its workspace
    const agent = await this.getAgentById(agentId);
    if (!agent) {
      throw new Error('Agent not found');
    }

    // Check if this is the last agent in the workspace
    const agentsInWorkspace = await this.getAgentsByWorkspace(agent.workspaceId);
    if (agentsInWorkspace.length <= 1) {
      throw new Error('Cannot delete the last agent in a workspace');
    }

    // If deleting the default agent, set another agent as default
    if (agent.isDefault && agentsInWorkspace.length > 1) {
      const otherAgent = agentsInWorkspace.find((a) => a.id !== agentId);
      if (otherAgent) {
        await this.setDefaultAgent(otherAgent.id, agent.workspaceId);
      }
    }

    await db.delete(workspaceAgents).where(eq(workspaceAgents.id, agentId));
  }

  /**
   * Get all agents for a workspace
   */
  async getAgentsByWorkspace(workspaceId: string): Promise<WorkspaceAgent[]> {
    const agents = await db
      .select()
      .from(workspaceAgents)
      .where(eq(workspaceAgents.workspaceId, workspaceId))
      .orderBy(desc(workspaceAgents.isDefault), workspaceAgents.createdAt);

    return agents.map((agent) => ({
      ...agent,
      isDefault: !!agent.isDefault,
      description: agent.description || undefined,
      systemPrompt: agent.systemPrompt || undefined,
      chatModel: agent.chatModel || undefined,
      chatModelProvider: agent.chatModelProvider || undefined,
      embeddingModel: agent.embeddingModel || undefined,
      embeddingModelProvider: agent.embeddingModelProvider || undefined,
      avatar: agent.avatar || '🤖',
      role: agent.role || undefined,
      specialty: agent.specialty || undefined,
      toolsAllowed: (agent.toolsAllowed as string[]) || [],
      memoryScope: (agent.memoryScope as 'workspace' | 'agent' | 'user') || 'workspace',
    }));
  }

  /**
   * Get a single agent by ID
   */
  async getAgentById(agentId: string): Promise<WorkspaceAgent | null> {
    const agents = await db
      .select()
      .from(workspaceAgents)
      .where(eq(workspaceAgents.id, agentId))
      .limit(1);

    if (agents.length === 0) {
      return null;
    }

    const agent = agents[0];
    return {
      ...agent,
      isDefault: !!agent.isDefault,
      description: agent.description || undefined,
      systemPrompt: agent.systemPrompt || undefined,
      chatModel: agent.chatModel || undefined,
      chatModelProvider: agent.chatModelProvider || undefined,
      embeddingModel: agent.embeddingModel || undefined,
      embeddingModelProvider: agent.embeddingModelProvider || undefined,
      avatar: agent.avatar || '🤖',
      role: agent.role || undefined,
      specialty: agent.specialty || undefined,
      toolsAllowed: (agent.toolsAllowed as string[]) || [],
      memoryScope: (agent.memoryScope as 'workspace' | 'agent' | 'user') || 'workspace',
    };
  }

  /**
   * Set an agent as the default for a workspace
   */
  async setDefaultAgent(agentId: string, workspaceId: string): Promise<void> {
    // Unset all defaults in the workspace
    await db
      .update(workspaceAgents)
      .set({ isDefault: false, updatedAt: new Date().toISOString() })
      .where(eq(workspaceAgents.workspaceId, workspaceId));

    // Set the specified agent as default
    await db
      .update(workspaceAgents)
      .set({ isDefault: true, updatedAt: new Date().toISOString() })
      .where(and(eq(workspaceAgents.id, agentId), eq(workspaceAgents.workspaceId, workspaceId)));
  }

  /**
   * Get the default agent for a workspace
   */
  async getDefaultAgent(workspaceId: string): Promise<WorkspaceAgent | null> {
    const agents = await db
      .select()
      .from(workspaceAgents)
      .where(
        and(eq(workspaceAgents.workspaceId, workspaceId), eq(workspaceAgents.isDefault, true))
      )
      .limit(1);

    if (agents.length === 0) {
      return null;
    }

    const agent = agents[0];
    return {
      ...agent,
      isDefault: !!agent.isDefault,
      description: agent.description || undefined,
      systemPrompt: agent.systemPrompt || undefined,
      chatModel: agent.chatModel || undefined,
      chatModelProvider: agent.chatModelProvider || undefined,
      embeddingModel: agent.embeddingModel || undefined,
      embeddingModelProvider: agent.embeddingModelProvider || undefined,
      avatar: agent.avatar || '🤖',
      role: agent.role || undefined,
      specialty: agent.specialty || undefined,
      toolsAllowed: (agent.toolsAllowed as string[]) || [],
      memoryScope: (agent.memoryScope as 'workspace' | 'agent' | 'user') || 'workspace',
    };
  }

  /**
   * Create a default agent for a new workspace
   */
  async createDefaultAgent(workspaceId: string, userId: string): Promise<WorkspaceAgent> {
    return this.createAgent({
      workspaceId,
      name: 'Default Assistant',
      description: 'General-purpose AI assistant',
      isDefault: true,
    });
  }
}

export default new AgentService();
