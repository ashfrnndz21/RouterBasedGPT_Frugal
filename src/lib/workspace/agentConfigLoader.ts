import { eq } from 'drizzle-orm';
import defaultDb from '@/lib/db';
import { workspaceAgents } from '@/lib/db/schema';

type DbInstance = typeof defaultDb;

// ============================================================
// Types
// ============================================================

export interface AgentConfig {
  id: string;
  workspaceId: string;
  name: string;
  avatar: string;
  role: string;
  specialty: string;
  systemPrompt: string;
  chatModel: string | null;
  chatModelProvider: string | null;
  embeddingModel: string | null;
  embeddingModelProvider: string | null;
  toolsAllowed: string[];
  memoryScope: 'workspace' | 'agent' | 'user';
}

// ============================================================
// Custom Errors
// ============================================================

export class AgentNotFoundError extends Error {
  readonly statusCode = 404;
  constructor(agentId: string) {
    super(`Agent not found: ${agentId}`);
    this.name = 'AgentNotFoundError';
  }
}

export class AgentWorkspaceMismatchError extends Error {
  readonly statusCode = 403;
  constructor(agentId: string, workspaceId: string) {
    super(`Agent ${agentId} does not belong to workspace ${workspaceId}`);
    this.name = 'AgentWorkspaceMismatchError';
  }
}

// ============================================================
// AgentConfigLoader
// ============================================================

export class AgentConfigLoader {
  private readonly db: DbInstance;

  constructor(db: DbInstance = defaultDb) {
    this.db = db;
  }

  /**
   * Load an agent's configuration from the database.
   *
   * @throws AgentNotFoundError (404) when the agent row is missing
   * @throws AgentWorkspaceMismatchError (403) when the agent belongs to a different workspace
   */
  async loadAgent(agentId: string, workspaceId: string): Promise<AgentConfig> {
    const rows = await this.db
      .select()
      .from(workspaceAgents)
      .where(eq(workspaceAgents.id, agentId))
      .limit(1);

    if (rows.length === 0) {
      throw new AgentNotFoundError(agentId);
    }

    const agent = rows[0];

    if (agent.workspaceId !== workspaceId) {
      throw new AgentWorkspaceMismatchError(agentId, workspaceId);
    }

    return {
      id: agent.id,
      workspaceId: agent.workspaceId,
      name: agent.name,
      avatar: agent.avatar ?? '🤖',
      role: agent.role ?? '',
      specialty: agent.specialty ?? '',
      systemPrompt: agent.systemPrompt ?? '',
      chatModel: agent.chatModel ?? null,
      chatModelProvider: agent.chatModelProvider ?? null,
      embeddingModel: agent.embeddingModel ?? null,
      embeddingModelProvider: agent.embeddingModelProvider ?? null,
      toolsAllowed: (agent.toolsAllowed as string[]) ?? [],
      memoryScope: (agent.memoryScope as 'workspace' | 'agent' | 'user') ?? 'workspace',
    };
  }
}

export default new AgentConfigLoader();
