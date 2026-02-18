'use client';

import { Workspace, WorkspaceAgent } from '@/lib/types/workspace';
import { useEffect, useState } from 'react';

interface WorkspaceChatProps {
  workspace: Workspace;
  conversationId: string | null;
}

/**
 * WorkspaceChat component - Injects workspace context and agent configuration into system instructions
 * Uses the SAME /api/chat endpoint as homepage, no special workspace API needed
 */
export default function WorkspaceChat({ workspace, conversationId }: WorkspaceChatProps) {
  const [agent, setAgent] = useState<WorkspaceAgent | null>(null);

  // Load agent for the conversation
  useEffect(() => {
    const loadAgentForConversation = async () => {
      if (!conversationId) return;

      try {
        // Get the conversation to find its agent
        const convResponse = await fetch(`/api/workspaces/${workspace.id}/conversations`);
        if (convResponse.ok) {
          const conversations = await convResponse.json();
          const conversation = conversations.find((c: any) => c.id === conversationId);
          
          if (conversation?.agentId) {
            // Load the agent
            const agentResponse = await fetch(`/api/workspaces/${workspace.id}/agents/${conversation.agentId}`);
            if (agentResponse.ok) {
              const agentData = await agentResponse.json();
              setAgent(agentData);
            }
          }
        }
      } catch (error) {
        console.error('Failed to load agent for conversation:', error);
      }
    };

    loadAgentForConversation();
  }, [workspace.id, conversationId]);

  // Inject workspace context and agent configuration into system instructions
  useEffect(() => {
    if (workspace) {
      let systemPrompt = '';
      
      // If agent has a system prompt, add it at the start with emphasis
      if (agent?.systemPrompt) {
        systemPrompt = `${agent.systemPrompt}\n\n`;
      }
      
      // Add workspace context
      systemPrompt += `You are assisting in the workspace: "${workspace.name}"

${workspace.description ? `Description: ${workspace.description}` : ''}

${workspace.context ? `Context:\n${workspace.context}` : ''}

This workspace has access to uploaded documents and connected databases. When the user asks about documents, PDFs, or uploaded files, you MUST search and use the workspace documents to answer. Always prioritize workspace documents over general web knowledge.
`;

      // IMPORTANT: Repeat agent identity at the end to reinforce it (prompt engineering technique)
      if (agent?.systemPrompt) {
        systemPrompt += `\n\n---CRITICAL REMINDER---\n${agent.systemPrompt}`;
        
        // Also add name/description as extra reinforcement
        if (agent.description) {
          systemPrompt += `\n\nYour role: ${agent.description}`;
        }
        systemPrompt += `\n\nRemember: Follow your core identity and role instructions above when responding to all queries.`;
      }

      // Store in systemInstructions - same key that /api/chat reads
      localStorage.setItem('systemInstructions', systemPrompt);
      localStorage.setItem('currentWorkspaceId', workspace.id);
      
      // If agent has specific models configured, override the global settings
      if (agent?.chatModel && agent?.chatModelProvider) {
        localStorage.setItem('chatModel', agent.chatModel);
        localStorage.setItem('chatModelProvider', agent.chatModelProvider);
      }
      if (agent?.embeddingModel && agent?.embeddingModelProvider) {
        localStorage.setItem('embeddingModel', agent.embeddingModel);
        localStorage.setItem('embeddingModelProvider', agent.embeddingModelProvider);
      }
      
      // Set a workspace-specific chat ID prefix so /api/chat can detect it
      localStorage.setItem('workspaceChatIdPrefix', `workspace_${workspace.id}_`);
      
      if (conversationId) {
        localStorage.setItem('currentConversationId', conversationId);
      }
    }

    return () => {
      // Clean up workspace-specific metadata
      // DON'T remove systemInstructions - EmptyWorkspaceChat sets it and it should persist
      localStorage.removeItem('currentWorkspaceId');
      localStorage.removeItem('currentConversationId');
      localStorage.removeItem('workspaceChatIdPrefix');
      // Note: We don't remove chatModel/embeddingModel as they may be user preferences
      // Note: We don't remove systemInstructions as EmptyWorkspaceChat sets it for new conversations
    };
  }, [workspace, conversationId, agent]);

  // The ChatWindow component handles all the UI
  return null;
}
