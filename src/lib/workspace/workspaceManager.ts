import { Workspace, WorkspaceSettings } from '../types/workspace';

const STORAGE_KEY = 'truegpt_workspaces';

export class WorkspaceManager {
  static getWorkspaces(): Workspace[] {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  }

  static saveWorkspaces(workspaces: Workspace[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workspaces));
  }

  static createWorkspace(
    name: string,
    description: string = '',
    icon: string = '📁'
  ): Workspace {
    const workspace: Workspace = {
      id: `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      icon,
      ownerId: 'current_user', // TODO: Replace with actual user ID
      context: '',
      settings: {
        webSearchEnabled: true,
        citationRequired: true,
        responseStyle: 'professional',
        autoPin: false,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      memberCount: 1,
      documentCount: 0,
    };

    const workspaces = this.getWorkspaces();
    workspaces.push(workspace);
    this.saveWorkspaces(workspaces);
    return workspace;
  }

  static getWorkspace(id: string): Workspace | null {
    const workspaces = this.getWorkspaces();
    return workspaces.find((w) => w.id === id) || null;
  }

  static updateWorkspace(id: string, updates: Partial<Workspace>): Workspace | null {
    const workspaces = this.getWorkspaces();
    const index = workspaces.findIndex((w) => w.id === id);
    if (index === -1) return null;

    workspaces[index] = {
      ...workspaces[index],
      ...updates,
      updatedAt: new Date(),
    };
    this.saveWorkspaces(workspaces);
    return workspaces[index];
  }

  static deleteWorkspace(id: string): boolean {
    const workspaces = this.getWorkspaces();
    const filtered = workspaces.filter((w) => w.id !== id);
    if (filtered.length === workspaces.length) return false;
    this.saveWorkspaces(filtered);
    return true;
  }
}
