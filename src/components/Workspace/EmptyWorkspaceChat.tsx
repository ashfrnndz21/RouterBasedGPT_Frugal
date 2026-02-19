'use client';

import { Workspace, WorkspaceAgent } from '@/lib/types/workspace';
import { FileText, Users, Sparkles, ArrowRight } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import Focus from '@/components/MessageInputActions/Focus';
import Optimization from '@/components/MessageInputActions/Optimization';
import Attach from '@/components/MessageInputActions/Attach';
import { useChat } from '@/lib/hooks/useChat';

interface EmptyWorkspaceChatProps {
  workspace: Workspace;
  conversationId: string | null;
  onConversationCreated?: (conversationId: string, title: string, chatId: string) => void;
}

export default function EmptyWorkspaceChat({ workspace, conversationId, onConversationCreated }: EmptyWorkspaceChatProps) {
  const { sendMessage, chatId } = useChat();
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  
  const [agents, setAgents] = useState<WorkspaceAgent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<WorkspaceAgent | null>(null);
  const [isLoadingAgents, setIsLoadingAgents] = useState(true);

  const suggestions = [
    `What should I know about ${workspace.name}?`,
    'Summarize the key points from our documents',
    'What are the main goals of this workspace?',
    'Help me analyze the uploaded data',
  ];

  useEffect(() => {
    inputRef.current?.focus();
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      setIsLoadingAgents(true);
      const response = await fetch(`/api/workspaces/${workspace.id}/agents`);
      if (response.ok) {
        const data = await response.json();
        setAgents(data);
        // Select default agent
        const defaultAgent = data.find((a: WorkspaceAgent) => a.isDefault);
        const agentToSelect = defaultAgent || data[0] || null;
        setSelectedAgent(agentToSelect);
        
        // Immediately set system instructions with agent prompt
        if (agentToSelect) {
          updateSystemInstructions(agentToSelect);
        }
      }
    } catch (error) {
      console.error('Failed to load agents:', error);
    } finally {
      setIsLoadingAgents(false);
    }
  };

  // Helper to update system instructions with agent
  const updateSystemInstructions = (agent: WorkspaceAgent | null) => {
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
    
    // If agent has specific models configured, override the global settings
    if (agent?.chatModel && agent?.chatModelProvider) {
      localStorage.setItem('chatModel', agent.chatModel);
      localStorage.setItem('chatModelProvider', agent.chatModelProvider);
    }
    if (agent?.embeddingModel && agent?.embeddingModelProvider) {
      localStorage.setItem('embeddingModel', agent.embeddingModel);
      localStorage.setItem('embeddingModelProvider', agent.embeddingModelProvider);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (message.trim().length === 0 || isSending || !chatId) return;
    
    setIsSending(true);
    const messageText = message.trim();
    
    try {
      // Create a workspace conversation to track this chat
      const title = messageText.substring(0, 50) + (messageText.length > 50 ? '...' : '');
      
      // Use the chatId as the conversation ID so we can link them
      const response = await fetch(`/api/workspaces/${workspace.id}/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: chatId, // Use chatId as the conversation ID for easy linking
          agentId: selectedAgent?.id,
          title,
          createdBy: 'user',
        }),
      });

      if (response.ok) {
        const conversation = await response.json();
        // Notify parent about the new conversation with chatId
        onConversationCreated?.(conversation.id, title, chatId);
      }
      
      // Send the message through the chat system
      sendMessage(messageText);
      setMessage('');
    } catch (error) {
      console.error('Error creating conversation:', error);
      // Still send the message even if conversation creation fails
      sendMessage(messageText);
      setMessage('');
    } finally {
      setIsSending(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setMessage(suggestion);
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-screen-sm mx-auto p-4 space-y-6">
      <div className="flex flex-col items-center space-y-4">
        <div className="text-7xl">{workspace.icon}</div>
        <h1 className="text-4xl font-bold text-black dark:text-white text-center">
          {workspace.name}
        </h1>
        {workspace.description && (
          <p className="text-black/60 dark:text-white/60 text-center max-w-md">
            {workspace.description}
          </p>
        )}
      </div>

      {/* Workspace Context Indicator */}
      {workspace.context && (
        <div className="bg-[#24A0ED]/10 border border-[#24A0ED]/30 rounded-xl p-4 max-w-md">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-[#24A0ED]" />
            <span className="text-sm font-semibold text-black dark:text-white">
              Workspace Context Active
            </span>
          </div>
          <p className="text-xs text-black/60 dark:text-white/60">
            AI responses will be tailored to this workspace&apos;s context and uploaded documents.
          </p>
        </div>
      )}



      {/* Message Input */}
      <form onSubmit={handleSubmit} className="w-full">
        <div className="flex flex-col bg-light-secondary dark:bg-dark-secondary px-5 pt-5 pb-2 rounded-2xl w-full border border-light-200 dark:border-dark-200 shadow-sm shadow-light-200/10 dark:shadow-black/20 transition-all duration-200 focus-within:border-light-300 dark:focus-within:border-dark-300">
          <TextareaAutosize
            ref={inputRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            minRows={2}
            className="bg-transparent placeholder:text-black/50 dark:placeholder:text-white/50 text-sm text-black dark:text-white resize-none focus:outline-none w-full max-h-24 lg:max-h-36 xl:max-h-48"
            placeholder="Ask anything..."
          />
          <div className="flex flex-row items-center justify-between mt-4">
            <div className="flex flex-row items-center space-x-2 lg:space-x-4">
              <Focus />
              <Attach showText />
            </div>
            <div className="flex flex-row items-center space-x-1 sm:space-x-4">
              <Optimization />
              <button
                type="submit"
                disabled={message.trim().length === 0 || isSending}
                className="bg-[#24A0ED] text-white disabled:text-black/50 dark:disabled:text-white/50 disabled:bg-[#e0e0dc] dark:disabled:bg-[#ececec21] hover:bg-opacity-85 transition duration-100 rounded-full p-2"
              >
                <ArrowRight className="bg-background" size={17} />
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Agent Roster — quick-start @mention suggestions (Req 2.1, 2.5) */}
      {!isLoadingAgents && agents.length > 0 && (
        <div className="w-full space-y-2">
          <p className="text-xs font-medium text-black/50 dark:text-white/50 uppercase tracking-wide">
            Available agents — click to @mention
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {agents.map((agent) => (
              <button
                key={agent.id}
                type="button"
                onClick={() => {
                  const mention = `@${agent.name} `;
                  setMessage((prev) => (prev.startsWith('@') ? mention : mention + prev));
                  inputRef.current?.focus();
                }}
                className="flex items-start gap-3 p-3 bg-light-secondary dark:bg-dark-secondary hover:bg-light-200 dark:hover:bg-dark-200 rounded-xl text-left transition-colors border border-light-200 dark:border-dark-200"
              >
                <span className="text-2xl leading-none mt-0.5 flex-shrink-0">
                  {(agent as any).avatar || '🤖'}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-semibold text-black dark:text-white">
                      {agent.name}
                    </span>
                    <span className="text-xs text-[#24A0ED] font-mono">@{agent.name}</span>
                  </div>
                  {((agent as any).role || agent.description) && (
                    <p className="text-xs text-black/50 dark:text-white/50 mt-0.5 line-clamp-1">
                      {(agent as any).role || agent.description}
                    </p>
                  )}
                  {(agent as any).specialty && (
                    <p className="text-xs text-black/40 dark:text-white/40 line-clamp-1">
                      {(agent as any).specialty}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Suggestions */}
      <div className="w-full space-y-3">
        <p className="text-sm text-black/50 dark:text-white/50 text-center">
          Try asking:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSuggestionClick(suggestion)}
              className="text-left p-3 bg-light-secondary dark:bg-dark-secondary hover:bg-light-200 dark:hover:bg-dark-200 rounded-lg text-sm text-black dark:text-white transition-colors border border-light-200 dark:border-dark-200"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      {/* Workspace Stats */}
      <div className="flex items-center gap-6 text-sm text-black/50 dark:text-white/50">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4" />
          <span>{workspace.memberCount || 1} members</span>
        </div>
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4" />
          <span>{workspace.documentCount || 0} documents</span>
        </div>
      </div>
    </div>
  );
}
