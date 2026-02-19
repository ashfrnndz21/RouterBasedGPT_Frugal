/**
 * MentionParser — parses @AgentName tokens from user messages and resolves them to agent IDs.
 * Requirements: 2.5, 2.10
 */
import type { AgentConfig } from './agentConfigLoader';

// ============================================================
// Types
// ============================================================

export interface ParsedMention {
  agentName: string;
  agentId: string;
  startIndex: number;
  endIndex: number;
}

export interface MentionParseResult {
  mentions: ParsedMention[];
  /** The first mention is the primary routing target. Null when no valid mentions found. */
  primaryAgentId: string | null;
  /** Agent names referenced in the message that could not be resolved to a known agent. */
  unknownAgentNames: string[];
}

// Matches @Word or @Multi-Word-Name (letters, digits, hyphens, underscores)
const MENTION_REGEX = /@([A-Za-z][A-Za-z0-9_-]*)/g;

// ============================================================
// MentionParser
// ============================================================

export class MentionParser {
  /**
   * Extracts @AgentName tokens from `message` and resolves them against `workspaceAgents`.
   *
   * - Returns resolved mentions in order of appearance.
   * - The first resolved mention is the primary routing target.
   * - Unresolvable names are collected in `unknownAgentNames`.
   */
  parse(message: string, workspaceAgents: AgentConfig[]): MentionParseResult {
    const mentions: ParsedMention[] = [];
    const unknownAgentNames: string[] = [];

    // Build a case-insensitive name → agent map
    const agentByName = new Map<string, AgentConfig>();
    for (const agent of workspaceAgents) {
      agentByName.set(agent.name.toLowerCase(), agent);
    }

    // Reset lastIndex before iterating
    MENTION_REGEX.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = MENTION_REGEX.exec(message)) !== null) {
      const rawName = match[1];
      const agent = agentByName.get(rawName.toLowerCase());

      if (agent) {
        mentions.push({
          agentName: agent.name,
          agentId: agent.id,
          startIndex: match.index,
          endIndex: match.index + match[0].length,
        });
      } else {
        if (!unknownAgentNames.includes(rawName)) {
          unknownAgentNames.push(rawName);
        }
      }
    }

    return {
      mentions,
      primaryAgentId: mentions.length > 0 ? mentions[0].agentId : null,
      unknownAgentNames,
    };
  }

  /**
   * Removes all @AgentName tokens from `message` before sending to the LLM.
   * Collapses any resulting double-spaces into single spaces and trims.
   */
  stripMentions(message: string): string {
    return message.replace(MENTION_REGEX, '').replace(/\s{2,}/g, ' ').trim();
  }
}

export default new MentionParser();
