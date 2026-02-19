/**
 * HandoffHandler — detects handoff signals in agent responses and routes to the target agent.
 * Requirements: 2.6
 */
import type { AgentConfig } from './agentConfigLoader';

// ============================================================
// Types
// ============================================================

export interface HandoffSignal {
  targetAgentName: string;
  reason: string;
}

export interface HandoffResult {
  targetAgentId: string;
  continuationContext: string;
}

// Matches: [HANDOFF: AgentName | reason text]
// AgentName: letters, digits, hyphens, underscores
// reason: any text up to the closing bracket
const HANDOFF_REGEX = /\[HANDOFF:\s*([A-Za-z][A-Za-z0-9_-]*)\s*\|\s*([^\]]+)\]/;

// ============================================================
// HandoffHandler
// ============================================================

export class HandoffHandler {
  /**
   * Scans `response` for a structured handoff marker of the form:
   *   [HANDOFF: AgentName | reason]
   *
   * Returns a HandoffSignal when found, or null when no marker is present.
   */
  detectHandoff(response: string): HandoffSignal | null {
    const match = HANDOFF_REGEX.exec(response);
    if (!match) return null;

    return {
      targetAgentName: match[1].trim(),
      reason: match[2].trim(),
    };
  }

  /**
   * Resolves the target agent from `workspaceAgents` and builds a continuation context.
   *
   * Falls back gracefully when the target agent is not found — returns null so the
   * caller can continue with the original agent.
   *
   * @returns HandoffResult when the target agent is found, or null on fallback.
   */
  async executeHandoff(
    signal: HandoffSignal,
    originalQuery: string,
    conversationId: string,
    workspaceId: string,
    workspaceAgents: AgentConfig[]
  ): Promise<HandoffResult | null> {
    const target = workspaceAgents.find(
      (a) => a.name.toLowerCase() === signal.targetAgentName.toLowerCase()
    );

    if (!target) {
      console.warn(
        `[HandoffHandler] Target agent "${signal.targetAgentName}" not found in workspace "${workspaceId}". ` +
          `Falling back to original agent.`
      );
      return null;
    }

    const continuationContext =
      `Handoff from another agent. Reason: ${signal.reason}\n` +
      `Original query: ${originalQuery}\n` +
      `Conversation ID: ${conversationId}`;

    return {
      targetAgentId: target.id,
      continuationContext,
    };
  }
}

export default new HandoffHandler();
