/**
 * Unit tests for HandoffHandler
 * Requirements: 2.6
 */
import { describe, it, expect } from 'vitest';
import { HandoffHandler } from './handoffHandler';
import type { AgentConfig } from './agentConfigLoader';

// ----------------------------------------------------------------
// Fixtures
// ----------------------------------------------------------------

function makeAgent(overrides: Partial<AgentConfig> = {}): AgentConfig {
  return {
    id: 'agent-1',
    workspaceId: 'ws-1',
    name: 'Alice',
    avatar: '🤖',
    role: 'Analyst',
    specialty: 'Data',
    systemPrompt: 'You are Alice.',
    chatModel: null,
    chatModelProvider: null,
    embeddingModel: null,
    embeddingModelProvider: null,
    toolsAllowed: [],
    memoryScope: 'workspace',
    ...overrides,
  };
}

const alice = makeAgent({ id: 'agent-alice', name: 'Alice' });
const bob = makeAgent({ id: 'agent-bob', name: 'Bob' });
const dataAgent = makeAgent({ id: 'agent-data', name: 'DataAgent' });

const roster: AgentConfig[] = [alice, bob, dataAgent];

// ----------------------------------------------------------------
// Tests
// ----------------------------------------------------------------

describe('HandoffHandler', () => {
  let handler: HandoffHandler;

  beforeEach(() => {
    handler = new HandoffHandler();
  });

  // ----------------------------------------------------------------
  // detectHandoff — no marker
  // ----------------------------------------------------------------

  it('returns null when response contains no handoff marker', () => {
    expect(handler.detectHandoff('This is a normal response.')).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(handler.detectHandoff('')).toBeNull();
  });

  it('returns null when marker is malformed (missing pipe separator)', () => {
    expect(handler.detectHandoff('[HANDOFF: Alice reason without pipe]')).toBeNull();
  });

  it('returns null when marker is malformed (missing closing bracket)', () => {
    expect(handler.detectHandoff('[HANDOFF: Alice | reason without close')).toBeNull();
  });

  // ----------------------------------------------------------------
  // detectHandoff — correct extraction
  // ----------------------------------------------------------------

  it('extracts targetAgentName and reason from a valid marker', () => {
    const signal = handler.detectHandoff(
      'I cannot help with this. [HANDOFF: Bob | User needs billing support]'
    );
    expect(signal).not.toBeNull();
    expect(signal!.targetAgentName).toBe('Bob');
    expect(signal!.reason).toBe('User needs billing support');
  });

  it('trims whitespace from targetAgentName and reason', () => {
    const signal = handler.detectHandoff('[HANDOFF:  Alice  |  some reason  ]');
    expect(signal!.targetAgentName).toBe('Alice');
    expect(signal!.reason).toBe('some reason');
  });

  it('handles multi-word reason text', () => {
    const signal = handler.detectHandoff(
      '[HANDOFF: DataAgent | The user wants to run a SQL query against the sales table]'
    );
    expect(signal!.targetAgentName).toBe('DataAgent');
    expect(signal!.reason).toBe('The user wants to run a SQL query against the sales table');
  });

  it('detects marker embedded in a longer response', () => {
    const response =
      'I have analysed the request. [HANDOFF: Alice | Needs domain expertise] Please wait.';
    const signal = handler.detectHandoff(response);
    expect(signal).not.toBeNull();
    expect(signal!.targetAgentName).toBe('Alice');
  });

  it('is case-sensitive for the HANDOFF keyword', () => {
    // lowercase "handoff" should not match
    expect(handler.detectHandoff('[handoff: Alice | reason]')).toBeNull();
  });

  // ----------------------------------------------------------------
  // executeHandoff — resolves target agent ID
  // ----------------------------------------------------------------

  it('resolves the target agent ID when agent exists in roster', async () => {
    const signal = { targetAgentName: 'Bob', reason: 'Billing question' };
    const result = await handler.executeHandoff(signal, 'What is my bill?', 'conv-1', 'ws-1', roster);

    expect(result).not.toBeNull();
    expect(result!.targetAgentId).toBe('agent-bob');
  });

  it('includes the original query and reason in continuationContext', async () => {
    const signal = { targetAgentName: 'Alice', reason: 'Needs analysis' };
    const result = await handler.executeHandoff(
      signal,
      'Analyse the Q3 data',
      'conv-42',
      'ws-1',
      roster
    );

    expect(result!.continuationContext).toContain('Needs analysis');
    expect(result!.continuationContext).toContain('Analyse the Q3 data');
    expect(result!.continuationContext).toContain('conv-42');
  });

  it('resolves target agent case-insensitively', async () => {
    const signal = { targetAgentName: 'dataagent', reason: 'SQL query needed' };
    const result = await handler.executeHandoff(signal, 'Show me sales', 'conv-1', 'ws-1', roster);

    expect(result).not.toBeNull();
    expect(result!.targetAgentId).toBe('agent-data');
  });

  // ----------------------------------------------------------------
  // executeHandoff — graceful fallback when target not found
  // ----------------------------------------------------------------

  it('returns null when target agent is not in the roster', async () => {
    const signal = { targetAgentName: 'Ghost', reason: 'Unknown agent' };
    const result = await handler.executeHandoff(signal, 'Help me', 'conv-1', 'ws-1', roster);

    expect(result).toBeNull();
  });

  it('returns null when roster is empty', async () => {
    const signal = { targetAgentName: 'Alice', reason: 'Some reason' };
    const result = await handler.executeHandoff(signal, 'Help me', 'conv-1', 'ws-1', []);

    expect(result).toBeNull();
  });
});
