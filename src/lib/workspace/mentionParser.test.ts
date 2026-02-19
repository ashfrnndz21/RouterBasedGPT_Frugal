/**
 * Unit tests for MentionParser
 * Requirements: 2.5, 2.10
 */
import { describe, it, expect } from 'vitest';
import { MentionParser } from './mentionParser';
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

const roster = [alice, bob, dataAgent];

// ----------------------------------------------------------------
// Tests
// ----------------------------------------------------------------

describe('MentionParser', () => {
  let parser: MentionParser;

  beforeEach(() => {
    parser = new MentionParser();
  });

  // ----------------------------------------------------------------
  // parse() — no mentions
  // ----------------------------------------------------------------

  it('returns empty mentions array when message has no @tokens', () => {
    const result = parser.parse('Hello, how are you?', roster);
    expect(result.mentions).toHaveLength(0);
    expect(result.primaryAgentId).toBeNull();
    expect(result.unknownAgentNames).toHaveLength(0);
  });

  it('returns empty mentions for empty string', () => {
    const result = parser.parse('', roster);
    expect(result.mentions).toHaveLength(0);
    expect(result.primaryAgentId).toBeNull();
  });

  it('returns empty mentions when roster is empty', () => {
    const result = parser.parse('@Alice help me', []);
    expect(result.mentions).toHaveLength(0);
    expect(result.unknownAgentNames).toContain('Alice');
  });

  // ----------------------------------------------------------------
  // parse() — single mention resolved correctly
  // ----------------------------------------------------------------

  it('resolves a single @mention to the correct agent ID', () => {
    const result = parser.parse('@Alice what is the status?', roster);
    expect(result.mentions).toHaveLength(1);
    expect(result.mentions[0].agentId).toBe('agent-alice');
    expect(result.mentions[0].agentName).toBe('Alice');
    expect(result.primaryAgentId).toBe('agent-alice');
  });

  it('records correct startIndex and endIndex for the mention', () => {
    const message = 'Hey @Bob can you help?';
    const result = parser.parse(message, roster);
    expect(result.mentions).toHaveLength(1);
    expect(result.mentions[0].startIndex).toBe(4);   // index of '@'
    expect(result.mentions[0].endIndex).toBe(8);     // index after 'Bob'
    expect(message.slice(result.mentions[0].startIndex, result.mentions[0].endIndex)).toBe('@Bob');
  });

  it('resolves @DataAgent correctly', () => {
    const result = parser.parse('@DataAgent show me sales', roster);
    expect(result.primaryAgentId).toBe('agent-data');
  });

  // ----------------------------------------------------------------
  // parse() — multiple mentions, first is primary routing target
  // ----------------------------------------------------------------

  it('returns multiple mentions in order of appearance', () => {
    const result = parser.parse('@Alice and @Bob please collaborate', roster);
    expect(result.mentions).toHaveLength(2);
    expect(result.mentions[0].agentId).toBe('agent-alice');
    expect(result.mentions[1].agentId).toBe('agent-bob');
  });

  it('sets primaryAgentId to the first mention', () => {
    const result = parser.parse('@Bob first, then @Alice', roster);
    expect(result.primaryAgentId).toBe('agent-bob');
  });

  it('handles the same agent mentioned twice — both entries present', () => {
    const result = parser.parse('@Alice do this, @Alice do that', roster);
    expect(result.mentions).toHaveLength(2);
    expect(result.mentions[0].agentId).toBe('agent-alice');
    expect(result.mentions[1].agentId).toBe('agent-alice');
  });

  // ----------------------------------------------------------------
  // parse() — unknown agent name returns error info
  // ----------------------------------------------------------------

  it('collects unknown agent names when @token does not match any agent', () => {
    const result = parser.parse('@Unknown please help', roster);
    expect(result.mentions).toHaveLength(0);
    expect(result.unknownAgentNames).toContain('Unknown');
    expect(result.primaryAgentId).toBeNull();
  });

  it('separates known and unknown mentions in the same message', () => {
    const result = parser.parse('@Alice and @Ghost do this', roster);
    expect(result.mentions).toHaveLength(1);
    expect(result.mentions[0].agentId).toBe('agent-alice');
    expect(result.unknownAgentNames).toContain('Ghost');
    expect(result.primaryAgentId).toBe('agent-alice');
  });

  it('deduplicates unknown agent names', () => {
    const result = parser.parse('@Ghost and @Ghost again', roster);
    expect(result.unknownAgentNames).toHaveLength(1);
    expect(result.unknownAgentNames[0]).toBe('Ghost');
  });

  // ----------------------------------------------------------------
  // parse() — case-insensitive matching
  // ----------------------------------------------------------------

  it('resolves @mention case-insensitively', () => {
    const result = parser.parse('@alice help', roster);
    expect(result.mentions).toHaveLength(1);
    expect(result.mentions[0].agentId).toBe('agent-alice');
  });

  // ----------------------------------------------------------------
  // stripMentions()
  // ----------------------------------------------------------------

  it('removes a single @token from the message', () => {
    expect(parser.stripMentions('@Alice what is the status?')).toBe('what is the status?');
  });

  it('removes multiple @tokens from the message', () => {
    expect(parser.stripMentions('@Alice and @Bob please help')).toBe('and please help');
  });

  it('returns the original message unchanged when no @tokens present', () => {
    expect(parser.stripMentions('Hello world')).toBe('Hello world');
  });

  it('returns empty string when message is only @tokens', () => {
    expect(parser.stripMentions('@Alice @Bob')).toBe('');
  });

  it('collapses extra whitespace after stripping', () => {
    const stripped = parser.stripMentions('Please @Alice   help me');
    expect(stripped).toBe('Please help me');
  });

  it('trims leading/trailing whitespace after stripping', () => {
    expect(parser.stripMentions('@Alice help')).toBe('help');
  });
});
