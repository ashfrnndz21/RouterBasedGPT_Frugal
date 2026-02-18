import { eq } from 'drizzle-orm';
import db from '@/lib/db';
import { workspaces } from '@/lib/db/schema';
import { Workspace, WorkspaceSettings } from '@/lib/types/workspace';
import { randomUUID } from 'crypto';
import agentService from './agentService';

export interface CreateWorkspaceDTO {
  id?: string; // Optional - for syncing from localStorage
  name: string;
  description?: string;
  icon?: string;
  ownerId: string;
  context?: string;
  settings?: Partial<WorkspaceSettings>;
}

export interface UpdateWorkspaceDTO {
  name?: string;
  description?: string;
  icon?: string;
  context?: string;
  settings?: Partial<WorkspaceSettings>;
}

export class WorkspaceService {
  /**
   * Create a new workspace
   */
  async createWorkspace(data: CreateWorkspaceDTO): Promise<Workspace> {
    const id = data.id || randomUUID(); // Use provided ID or generate new one
    const now = new Date().toISOString();

    const defaultSettings: WorkspaceSettings = {
      webSearchEnabled: true,
      citationRequired: true,
      conversationRetention: 90,
    };

    const settings = {
      ...defaultSettings,
      ...data.settings,
    };

    const workspaceData = {
      id,
      name: data.name,
      description: data.description || null,
      icon: data.icon || '📁',
      ownerId: data.ownerId,
      context: data.context || null,
      settings: settings as any,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(workspaces).values(workspaceData);

    // Create default agent for the workspace
    try {
      await agentService.createDefaultAgent(id, data.ownerId);
    } catch (error) {
      console.error('Failed to create default agent:', error);
      // Don't fail workspace creation if agent creation fails
    }

    return {
      id,
      name: data.name,
      description: data.description,
      icon: data.icon || '📁',
      ownerId: data.ownerId,
      context: data.context,
      settings,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    };
  }

  /**
   * Get a workspace by ID
   */
  async getWorkspace(id: string): Promise<Workspace | null> {
    const result = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, id))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const workspace = result[0];
    const settings =
      typeof workspace.settings === 'string'
        ? JSON.parse(workspace.settings)
        : workspace.settings;

    return {
      id: workspace.id,
      name: workspace.name,
      description: workspace.description || undefined,
      icon: workspace.icon || '📁',
      ownerId: workspace.ownerId,
      context: workspace.context || undefined,
      settings,
      createdAt: new Date(workspace.createdAt),
      updatedAt: new Date(workspace.updatedAt),
    };
  }

  /**
   * Update a workspace
   */
  async updateWorkspace(
    id: string,
    updates: UpdateWorkspaceDTO
  ): Promise<Workspace | null> {
    const existing = await this.getWorkspace(id);
    if (!existing) {
      return null;
    }

    const now = new Date().toISOString();
    const updateData: any = {
      updatedAt: now,
    };

    if (updates.name !== undefined) {
      updateData.name = updates.name;
    }
    if (updates.description !== undefined) {
      updateData.description = updates.description;
    }
    if (updates.icon !== undefined) {
      updateData.icon = updates.icon;
    }
    if (updates.context !== undefined) {
      updateData.context = updates.context;
    }
    if (updates.settings !== undefined) {
      const mergedSettings = {
        ...existing.settings,
        ...updates.settings,
      };
      updateData.settings = mergedSettings as any;
    }

    await db.update(workspaces).set(updateData).where(eq(workspaces.id, id));

    return this.getWorkspace(id);
  }

  /**
   * Delete a workspace
   */
  async deleteWorkspace(id: string): Promise<boolean> {
    try {
      // Check if workspace exists first
      const existing = await this.getWorkspace(id);
      if (!existing) {
        return false;
      }

      // Delete the workspace
      await db.delete(workspaces).where(eq(workspaces.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting workspace:', error);
      return false;
    }
  }

  /**
   * List all workspaces for a user
   */
  async listUserWorkspaces(userId: string): Promise<Workspace[]> {
    const results = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.ownerId, userId))
      .orderBy(workspaces.updatedAt);

    return results.map((workspace) => {
      const settings =
        typeof workspace.settings === 'string'
          ? JSON.parse(workspace.settings)
          : workspace.settings;

      return {
        id: workspace.id,
        name: workspace.name,
        description: workspace.description || undefined,
        icon: workspace.icon || '📁',
        ownerId: workspace.ownerId,
        context: workspace.context || undefined,
        settings,
        createdAt: new Date(workspace.createdAt),
        updatedAt: new Date(workspace.updatedAt),
      };
    });
  }
}

// Export singleton instance
export const workspaceService = new WorkspaceService();
