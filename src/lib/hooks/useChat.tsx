'use client';

import {
  AssistantMessage,
  ChatTurn,
  Message,
  SourceMessage,
  SuggestionMessage,
  UserMessage,
} from '@/components/ChatWindow';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import crypto from 'crypto';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { getSuggestions } from '../actions';
import { preferenceManager } from '@/lib/preferences';
import type { SearchSession } from '@/lib/preferences/types';
import { getAnalyticsTracker } from '@/lib/analytics/analyticsTracker';
import { useLanguage } from '@/lib/contexts/LanguageContext';

export type Section = {
  userMessage: UserMessage;
  assistantMessage: AssistantMessage | undefined;
  parsedAssistantMessage: string | undefined;
  speechMessage: string | undefined;
  sourceMessage: SourceMessage | undefined;
  thinkingEnded: boolean;
  suggestions?: string[];
  metadata?: import('@/components/ChatWindow').ResponseMetadata;
};

type ChatContext = {
  messages: Message[];
  chatTurns: ChatTurn[];
  sections: Section[];
  chatHistory: [string, string][];
  files: File[];
  fileIds: string[];
  focusMode: string;
  chatId: string | undefined;
  optimizationMode: string;
  isMessagesLoaded: boolean;
  loading: boolean;
  notFound: boolean;
  messageAppeared: boolean;
  isReady: boolean;
  hasError: boolean;
  setOptimizationMode: (mode: string) => void;
  setFocusMode: (mode: string) => void;
  setFiles: (files: File[]) => void;
  setFileIds: (fileIds: string[]) => void;
  sendMessage: (
    message: string,
    messageId?: string,
    rewrite?: boolean,
  ) => Promise<void>;
  rewrite: (messageId: string) => void;
};

export interface File {
  fileName: string;
  fileExtension: string;
  fileId: string;
}

interface ChatModelProvider {
  name: string;
  provider: string;
}

interface EmbeddingModelProvider {
  name: string;
  provider: string;
}

const checkConfig = async (
  setChatModelProvider: (provider: ChatModelProvider) => void,
  setEmbeddingModelProvider: (provider: EmbeddingModelProvider) => void,
  setIsConfigReady: (ready: boolean) => void,
  setHasError: (hasError: boolean) => void,
) => {
  try {
    let chatModel = localStorage.getItem('chatModel');
    let chatModelProvider = localStorage.getItem('chatModelProvider');
    let embeddingModel = localStorage.getItem('embeddingModel');
    let embeddingModelProvider = localStorage.getItem('embeddingModelProvider');

    const autoImageSearch = localStorage.getItem('autoImageSearch');
    const autoVideoSearch = localStorage.getItem('autoVideoSearch');

    if (!autoImageSearch) {
      localStorage.setItem('autoImageSearch', 'true');
    }

    if (!autoVideoSearch) {
      localStorage.setItem('autoVideoSearch', 'false');
    }

    const providers = await fetch(`/api/models`, {
      headers: {
        'Content-Type': 'application/json',
      },
    }).then(async (res) => {
      if (!res.ok)
        throw new Error(
          `Failed to fetch models: ${res.status} ${res.statusText}`,
        );
      return res.json();
    });

    console.log('[useChat] Fetched providers:', {
      chatProviders: Object.keys(providers.chatModelProviders || {}),
      embeddingProviders: Object.keys(providers.embeddingModelProviders || {}),
      embeddingModels: providers.embeddingModelProviders ? 
        Object.keys(providers.embeddingModelProviders).flatMap(provider => 
          Object.keys(providers.embeddingModelProviders[provider] || {})
        ) : [],
    });

    if (
      !chatModel ||
      !chatModelProvider ||
      !embeddingModel ||
      !embeddingModelProvider
    ) {
      if (!chatModel || !chatModelProvider) {
        const chatModelProviders = providers.chatModelProviders;
        const chatModelProvidersKeys = Object.keys(chatModelProviders);

        if (!chatModelProviders || chatModelProvidersKeys.length === 0) {
          toast.error('No chat models available');
          setHasError(true);
          setIsConfigReady(false);
          return;
        } else {
          chatModelProvider =
            chatModelProvidersKeys.find(
              (provider) =>
                Object.keys(chatModelProviders[provider]).length > 0,
            ) || chatModelProvidersKeys[0];
        }

        if (
          chatModelProvider === 'custom_openai' &&
          Object.keys(chatModelProviders[chatModelProvider]).length === 0
        ) {
          toast.error(
            "Looks like you haven't configured any chat model providers. Please configure them from the settings page or the config file.",
          );
          setHasError(true);
          setIsConfigReady(false);
          return;
        }

        if (!chatModelProviders[chatModelProvider] || Object.keys(chatModelProviders[chatModelProvider]).length === 0) {
          toast.error(`No models available for provider: ${chatModelProvider}`);
          setHasError(true);
          setIsConfigReady(false);
          return;
        }

        chatModel = Object.keys(chatModelProviders[chatModelProvider])[0];
      }

      if (!embeddingModel || !embeddingModelProvider) {
        const embeddingModelProviders = providers.embeddingModelProviders;

        if (
          !embeddingModelProviders ||
          Object.keys(embeddingModelProviders).length === 0
        ) {
          toast.error('No embedding models available');
          setHasError(true);
          setIsConfigReady(false);
          return;
        }

        embeddingModelProvider = Object.keys(embeddingModelProviders)[0];
        if (!embeddingModelProvider || !embeddingModelProviders[embeddingModelProvider] || Object.keys(embeddingModelProviders[embeddingModelProvider]).length === 0) {
          toast.error('No embedding models available');
          setHasError(true);
          setIsConfigReady(false);
          return;
        }
        embeddingModel = Object.keys(
          embeddingModelProviders[embeddingModelProvider],
        )[0];
      }

      localStorage.setItem('chatModel', chatModel!);
      localStorage.setItem('chatModelProvider', chatModelProvider);
      localStorage.setItem('embeddingModel', embeddingModel!);
      localStorage.setItem('embeddingModelProvider', embeddingModelProvider);
    } else {
      const chatModelProviders = providers.chatModelProviders;
      const embeddingModelProviders = providers.embeddingModelProviders;

      if (
        Object.keys(chatModelProviders).length > 0 &&
        (!chatModelProviders[chatModelProvider] ||
          Object.keys(chatModelProviders[chatModelProvider]).length === 0)
      ) {
        const chatModelProvidersKeys = Object.keys(chatModelProviders);
        chatModelProvider =
          chatModelProvidersKeys.find(
            (key) => Object.keys(chatModelProviders[key]).length > 0,
          ) || chatModelProvidersKeys[0];

        localStorage.setItem('chatModelProvider', chatModelProvider);
      }

      if (
        chatModelProvider &&
        !chatModelProviders[chatModelProvider][chatModel]
      ) {
        if (
          chatModelProvider === 'custom_openai' &&
          Object.keys(chatModelProviders[chatModelProvider]).length === 0
        ) {
          toast.error(
            "Looks like you haven't configured any chat model providers. Please configure them from the settings page or the config file.",
          );
          setHasError(true);
          setIsConfigReady(false);
          return;
        }

        const fallbackProvider = Object.keys(chatModelProviders[chatModelProvider]).length > 0
          ? chatModelProvider
          : Object.keys(chatModelProviders)[0];

        if (!fallbackProvider || !chatModelProviders[fallbackProvider] || Object.keys(chatModelProviders[fallbackProvider]).length === 0) {
          toast.error('No chat models available');
          setHasError(true);
          setIsConfigReady(false);
          return;
        }

        chatModel = Object.keys(chatModelProviders[fallbackProvider])[0];

        localStorage.setItem('chatModel', chatModel);
      }

      if (
        Object.keys(embeddingModelProviders).length > 0 &&
        !embeddingModelProviders[embeddingModelProvider]
      ) {
        embeddingModelProvider = Object.keys(embeddingModelProviders)[0];
        localStorage.setItem('embeddingModelProvider', embeddingModelProvider);
      }

      if (
        embeddingModelProvider &&
        embeddingModelProviders[embeddingModelProvider] &&
        !embeddingModelProviders[embeddingModelProvider][embeddingModel]
      ) {
        const availableModels = Object.keys(embeddingModelProviders[embeddingModelProvider]);
        if (availableModels.length === 0) {
          toast.error(`No embedding models available for provider: ${embeddingModelProvider}`);
          setHasError(true);
          setIsConfigReady(false);
          return;
        }
        embeddingModel = availableModels[0];
        localStorage.setItem('embeddingModel', embeddingModel);
      }
    }

    if (!chatModel || !chatModelProvider || !embeddingModel || !embeddingModelProvider) {
      console.error('[useChat] Missing required model configuration:', {
        chatModel,
        chatModelProvider,
        embeddingModel,
        embeddingModelProvider,
      });
      toast.error('Failed to configure models. Please check your settings.');
      setHasError(true);
      setIsConfigReady(false);
      return;
    }

    console.log('[useChat] Configuration ready:', {
      chatModel,
      chatModelProvider,
      embeddingModel,
      embeddingModelProvider,
    });

    setChatModelProvider({
      name: chatModel!,
      provider: chatModelProvider,
    });

    setEmbeddingModelProvider({
      name: embeddingModel!,
      provider: embeddingModelProvider,
    });

    setIsConfigReady(true);
  } catch (err) {
    console.error('An error occurred while checking the configuration:', err);
    setIsConfigReady(false);
    setHasError(true);
  }
};

const loadMessages = async (
  chatId: string,
  setMessages: (messages: Message[]) => void,
  setIsMessagesLoaded: (loaded: boolean) => void,
  setChatHistory: (history: [string, string][]) => void,
  setFocusMode: (mode: string) => void,
  setNotFound: (notFound: boolean) => void,
  setFiles: (files: File[]) => void,
  setFileIds: (fileIds: string[]) => void,
) => {
  const res = await fetch(`/api/chats/${chatId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (res.status === 404) {
    setNotFound(true);
    setIsMessagesLoaded(true);
    return;
  }

  const data = await res.json();

  const messages = data.messages as Message[];

  setMessages(messages);

  const chatTurns = messages.filter(
    (msg): msg is ChatTurn => msg.role === 'user' || msg.role === 'assistant',
  );

  const history = chatTurns.map((msg) => {
    return [msg.role, msg.content];
  }) as [string, string][];

  console.debug(new Date(), 'app:messages_loaded');

  if (chatTurns.length > 0) {
    document.title = chatTurns[0].content;
  }

  const files = data.chat.files.map((file: any) => {
    return {
      fileName: file.name,
      fileExtension: file.name.split('.').pop(),
      fileId: file.fileId,
    };
  });

  setFiles(files);
  setFileIds(files.map((file: File) => file.fileId));

  setChatHistory(history);
  setFocusMode(data.chat.focusMode);
  setIsMessagesLoaded(true);
};

export const chatContext = createContext<ChatContext>({
  chatHistory: [],
  chatId: '',
  fileIds: [],
  files: [],
  focusMode: '',
  hasError: false,
  isMessagesLoaded: false,
  isReady: false,
  loading: false,
  messageAppeared: false,
  messages: [],
  chatTurns: [],
  sections: [],
  notFound: false,
  optimizationMode: '',
  rewrite: () => {},
  sendMessage: async () => {},
  setFileIds: () => {},
  setFiles: () => {},
  setFocusMode: () => {},
  setOptimizationMode: () => {},
});

export const ChatProvider = ({
  children,
  id,
}: {
  children: React.ReactNode;
  id?: string;
}) => {
  const searchParams = useSearchParams();
  const initialMessage = searchParams.get('q');
  const { language } = useLanguage();

  const [chatId, setChatId] = useState<string | undefined>(id);
  const [newChatCreated, setNewChatCreated] = useState(false);

  const [loading, setLoading] = useState(false);
  const [messageAppeared, setMessageAppeared] = useState(false);

  const [chatHistory, setChatHistory] = useState<[string, string][]>([]);
  const [messages, setMessages] = useState<Message[]>([]);

  const [files, setFiles] = useState<File[]>([]);
  const [fileIds, setFileIds] = useState<string[]>([]);

  // Initialize focusMode from user preferences
  const getInitialFocusMode = () => {
    const prefs = preferenceManager.getSearchPreferences();
    const modeMap: Record<string, string> = {
      'all': 'webSearch',
      'academic': 'academicSearch',
      'writing': 'writingAssistant',
      'youtube': 'youtubeSearch',
      'reddit': 'redditSearch',
      'wolfram': 'wolframAlphaSearch',
    };
    return modeMap[prefs.defaultMode] || 'webSearch';
  };

  const [focusMode, setFocusMode] = useState(getInitialFocusMode());
  const [optimizationMode, setOptimizationMode] = useState('speed');

  const [isMessagesLoaded, setIsMessagesLoaded] = useState(false);

  const [notFound, setNotFound] = useState(false);

  const [chatModelProvider, setChatModelProvider] = useState<ChatModelProvider>(
    {
      name: '',
      provider: '',
    },
  );

  const [embeddingModelProvider, setEmbeddingModelProvider] =
    useState<EmbeddingModelProvider>({
      name: '',
      provider: '',
    });

  const [isConfigReady, setIsConfigReady] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const messagesRef = useRef<Message[]>([]);
  const sessionSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sessionStartedRef = useRef<boolean>(false);
  const sessionQueryCountRef = useRef<number>(0);

  const chatTurns = useMemo((): ChatTurn[] => {
    return messages.filter(
      (msg): msg is ChatTurn => msg.role === 'user' || msg.role === 'assistant',
    );
  }, [messages]);

  /**
   * Save the current chat session to localStorage
   * Debounced to avoid excessive writes
   */
  const saveSession = () => {
    if (!chatId || chatTurns.length === 0) return;

    // Clear any pending save
    if (sessionSaveTimeoutRef.current) {
      clearTimeout(sessionSaveTimeoutRef.current);
    }

    // Debounce the save operation
    sessionSaveTimeoutRef.current = setTimeout(() => {
      try {
        // Generate a title from the first user message (max 50 chars)
        const firstUserMessage = chatTurns.find(msg => msg.role === 'user');
        const title = firstUserMessage 
          ? firstUserMessage.content.substring(0, 50) + (firstUserMessage.content.length > 50 ? '...' : '')
          : 'Untitled Chat';

        // Determine category based on focus mode
        let category: string | undefined;
        if (focusMode === 'academicSearch') {
          category = 'academic';
        } else if (focusMode === 'youtubeSearch') {
          category = 'entertainment';
        } else if (focusMode === 'redditSearch') {
          category = 'social';
        }

        const session: SearchSession = {
          id: chatId,
          title,
          timestamp: Date.now(),
          messages: chatTurns.map(msg => ({
            role: msg.role,
            content: msg.content,
            messageId: msg.messageId,
            chatId: msg.chatId,
            createdAt: msg.createdAt,
          })),
          category,
          isFavorite: preferenceManager.isFavorite(chatId),
        };

        preferenceManager.saveSearchSession(session);
        console.debug('[Session] Saved session:', chatId, 'with', chatTurns.length, 'messages');
      } catch (error) {
        console.error('[Session] Failed to save session:', error);
      }
    }, 1000); // Debounce for 1 second
  };

  const sections = useMemo<Section[]>(() => {
    console.log('[useChat] Creating sections from messages:', messages.length);
    const sections: Section[] = [];

    messages.forEach((msg, i) => {
      if (msg.role === 'user') {
        const nextUserMessageIndex = messages.findIndex(
          (m, j) => j > i && m.role === 'user',
        );

        const aiMessage = messages.find(
          (m, j) =>
            j > i &&
            m.role === 'assistant' &&
            (nextUserMessageIndex === -1 || j < nextUserMessageIndex),
        ) as AssistantMessage | undefined;

        const sourceMessage = messages.find(
          (m, j) =>
            j > i &&
            m.role === 'source' &&
            m.sources &&
            (nextUserMessageIndex === -1 || j < nextUserMessageIndex),
        ) as SourceMessage | undefined;

        let thinkingEnded = false;
        let processedMessage = aiMessage?.content ?? '';
        let speechMessage = aiMessage?.content ?? '';
        let suggestions: string[] = [];

        if (aiMessage) {
          const citationRegex = /\[([^\]]+)\]/g;
          const regex = /\[(\d+)\]/g;

          if (processedMessage.includes('<think>')) {
            const openThinkTag =
              processedMessage.match(/<think>/g)?.length || 0;
            const closeThinkTag =
              processedMessage.match(/<\/think>/g)?.length || 0;

            if (openThinkTag && !closeThinkTag) {
              processedMessage += '</think> <a> </a>';
            }
          }

          if (aiMessage.content.includes('</think>')) {
            thinkingEnded = true;
          }

          if (
            sourceMessage &&
            sourceMessage.sources &&
            sourceMessage.sources.length > 0
          ) {
            console.log('[useChat] Processing citations, sources:', sourceMessage.sources.length);
            console.log('[useChat] Original message:', processedMessage.substring(0, 200));
            processedMessage = processedMessage.replace(
              citationRegex,
              (_, capturedContent: string) => {
                const numbers = capturedContent
                  .split(',')
                  .map((numStr) => numStr.trim());

                const linksHtml = numbers
                  .map((numStr) => {
                    const number = parseInt(numStr);

                    if (isNaN(number) || number <= 0) {
                      return `[${numStr}]`;
                    }

                    const source = sourceMessage.sources?.[number - 1];
                    const url = source?.metadata?.url;

                    if (url) {
                      console.log('[useChat] Converting citation', numStr, 'to link:', url);
                      return `<citation href="${url}">${numStr}</citation>`;
                    } else {
                      return ``;
                    }
                  })
                  .join('');

                return linksHtml;
              },
            );
            console.log('[useChat] Processed message:', processedMessage.substring(0, 200));
            speechMessage = aiMessage.content.replace(regex, '');
          } else {
            processedMessage = processedMessage.replace(regex, '');
            speechMessage = aiMessage.content.replace(regex, '');
          }

          const suggestionMessage = messages.find(
            (m, j) =>
              j > i &&
              m.role === 'suggestion' &&
              (nextUserMessageIndex === -1 || j < nextUserMessageIndex),
          ) as SuggestionMessage | undefined;

          if (suggestionMessage && suggestionMessage.suggestions.length > 0) {
            suggestions = suggestionMessage.suggestions;
          }
        }

        const section = {
          userMessage: msg,
          assistantMessage: aiMessage,
          sourceMessage: sourceMessage,
          parsedAssistantMessage: processedMessage,
          speechMessage,
          thinkingEnded,
          suggestions: suggestions,
          metadata: aiMessage?.metadata,
        };
        console.log('[useChat] Created section:', {
          hasUser: !!section.userMessage,
          hasAssistant: !!section.assistantMessage,
          contentLength: section.parsedAssistantMessage?.length || 0,
        });
        sections.push(section);
      }
    });

    console.log('[useChat] Total sections created:', sections.length);
    return sections;
  }, [messages]);

  useEffect(() => {
    checkConfig(
      setChatModelProvider,
      setEmbeddingModelProvider,
      setIsConfigReady,
      setHasError,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (
      chatId &&
      !newChatCreated &&
      !isMessagesLoaded &&
      messages.length === 0
    ) {
      loadMessages(
        chatId,
        setMessages,
        setIsMessagesLoaded,
        setChatHistory,
        setFocusMode,
        setNotFound,
        setFiles,
        setFileIds,
      );
    } else if (!chatId) {
      setNewChatCreated(true);
      setIsMessagesLoaded(true);
      setChatId(crypto.randomBytes(20).toString('hex'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (isMessagesLoaded && isConfigReady) {
      setIsReady(true);
      console.debug(new Date(), 'app:ready');
    } else {
      setIsReady(false);
    }
  }, [isMessagesLoaded, isConfigReady]);

  // Auto-save session when chat turns change
  useEffect(() => {
    if (chatTurns.length > 0 && chatId && isMessagesLoaded) {
      saveSession();
    }
    // Cleanup timeout on unmount
    return () => {
      if (sessionSaveTimeoutRef.current) {
        clearTimeout(sessionSaveTimeoutRef.current);
      }
      
      // Track session end on unmount
      if (sessionStartedRef.current && sessionQueryCountRef.current > 0) {
        const analytics = getAnalyticsTracker();
        analytics.trackSessionEnd(sessionQueryCountRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatTurns, chatId, isMessagesLoaded]);

  const rewrite = (messageId: string) => {
    const index = messages.findIndex((msg) => msg.messageId === messageId);
    const chatTurnsIndex = chatTurns.findIndex(
      (msg) => msg.messageId === messageId,
    );

    if (index === -1) return;

    const message = chatTurns[chatTurnsIndex - 1];

    setMessages((prev) => {
      return [
        ...prev.slice(0, messages.length > 2 ? messages.indexOf(message) : 0),
      ];
    });
    setChatHistory((prev) => {
      return [...prev.slice(0, chatTurns.length > 2 ? chatTurnsIndex - 1 : 0)];
    });

    sendMessage(message.content, message.messageId, true);
  };

  useEffect(() => {
    if (isReady && initialMessage && isConfigReady) {
      if (!isConfigReady) {
        toast.error('Cannot send message before the configuration is ready');
        return;
      }
      sendMessage(initialMessage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConfigReady, isReady, initialMessage]);

  const sendMessage: ChatContext['sendMessage'] = async (
    message,
    messageId,
    rewrite = false,
  ) => {
    if (loading) return;
    setLoading(true);
    setMessageAppeared(false);

    if (messages.length <= 1) {
      window.history.replaceState(null, '', `/c/${chatId}`);
    }

    // Track session start on first message
    const analytics = getAnalyticsTracker();
    if (!sessionStartedRef.current && messages.length === 0) {
      analytics.trackSessionStart();
      sessionStartedRef.current = true;
    }

    // Track search with category
    let category: string | undefined;
    if (focusMode === 'academicSearch') {
      category = 'academic';
    } else if (focusMode === 'youtubeSearch') {
      category = 'entertainment';
    } else if (focusMode === 'redditSearch') {
      category = 'social';
    } else if (focusMode === 'wolframAlphaSearch') {
      category = 'science';
    }
    
    analytics.trackSearch(message, category);
    sessionQueryCountRef.current++;

    let recievedMessage = '';
    let added = false;

    messageId = messageId ?? crypto.randomBytes(7).toString('hex');

    setMessages((prevMessages) => [
      ...prevMessages,
      {
        content: message,
        messageId: messageId,
        chatId: chatId!,
        role: 'user',
        createdAt: new Date(),
      },
    ]);

    const messageHandler = async (data: any) => {
      if (data.type === 'error') {
        toast.error(data.data);
        setLoading(false);
        return;
      }

      if (data.type === 'sources') {
        console.log('[useChat] Received sources:', data.data.length, 'sources');
        setMessages((prevMessages) => [
          ...prevMessages,
          {
            messageId: data.messageId,
            chatId: chatId!,
            role: 'source',
            sources: data.data,
            createdAt: new Date(),
          },
        ]);
        if (data.data.length > 0) {
          setMessageAppeared(true);
        }
      }

      if (data.type === 'message') {
        console.log('[useChat] Received message chunk:', data.data);
        if (!added) {
          console.log('[useChat] Adding first message chunk');
          setMessages((prevMessages) => [
            ...prevMessages,
            {
              content: data.data,
              messageId: data.messageId,
              chatId: chatId!,
              role: 'assistant',
              createdAt: new Date(),
              metadata: data.metadata, // Capture metadata
            },
          ]);
          added = true;
          setMessageAppeared(true);
        } else {
          console.log('[useChat] Appending message chunk');
          setMessages((prev) =>
            prev.map((message) => {
              if (
                message.messageId === data.messageId &&
                message.role === 'assistant'
              ) {
                return { 
                  ...message, 
                  content: message.content + data.data,
                  metadata: data.metadata || message.metadata, // Update metadata
                };
              }

              return message;
            }),
          );
        }
        recievedMessage += data.data;
      }

      if (data.type === 'outputBlocked') {
        // Output guardrails blocked the response - replace the displayed message immediately
        console.log('[useChat] Output guardrails blocked response:', data.reason);
        toast.error('Response blocked by guardrails');
        
        setMessages((prev) =>
          prev.map((message) => {
            if (
              message.messageId === data.messageId &&
              message.role === 'assistant'
            ) {
              return {
                ...message,
                content: data.safeMessage,
                metadata: {
                  ...(message.metadata || {}),
                  error: true,
                  violations: data.violations,
                  reason: data.reason,
                  code: 'OUTPUT_BLOCKED',
                },
              };
            }
            return message;
          }),
        );
        
        // Update received message for chat history
        recievedMessage = data.safeMessage;
        setLoading(false);
        return;
      }

      if (data.type === 'messageEnd') {
        console.log('[useChat] Message end, metadata:', data.metadata);
        
        // Update the last assistant message with final metadata
        if (data.metadata) {
          setMessages((prev) =>
            prev.map((message, index) => {
              if (
                index === prev.length - 1 &&
                message.role === 'assistant'
              ) {
                return { 
                  ...message, 
                  metadata: data.metadata,
                };
              }
              return message;
            }),
          );
        }

        setChatHistory((prevHistory) => [
          ...prevHistory,
          ['human', message],
          ['assistant', recievedMessage],
        ]);

        setLoading(false);

        const lastMsg = messagesRef.current[messagesRef.current.length - 1];

        const autoImageSearch = localStorage.getItem('autoImageSearch');
        const autoVideoSearch = localStorage.getItem('autoVideoSearch');

        if (autoImageSearch === 'true') {
          document
            .getElementById(`search-images-${lastMsg.messageId}`)
            ?.click();
        }

        if (autoVideoSearch === 'true') {
          document
            .getElementById(`search-videos-${lastMsg.messageId}`)
            ?.click();
        }

        /* Check if there are sources after message id's index and no suggestions */

        const userMessageIndex = messagesRef.current.findIndex(
          (msg) => msg.messageId === messageId && msg.role === 'user',
        );

        const sourceMessage = messagesRef.current.find(
          (msg, i) => i > userMessageIndex && msg.role === 'source',
        ) as SourceMessage | undefined;

        const suggestionMessageIndex = messagesRef.current.findIndex(
          (msg, i) => i > userMessageIndex && msg.role === 'suggestion',
        );

        if (
          sourceMessage &&
          sourceMessage.sources.length > 0 &&
          suggestionMessageIndex == -1
        ) {
          console.log('[useChat] Fetching suggestions...');
          const suggestions = await getSuggestions(messagesRef.current);
          console.log('[useChat] Received suggestions:', suggestions);
          setMessages((prev) => {
            return [
              ...prev,
              {
                role: 'suggestion',
                suggestions: suggestions,
                chatId: chatId!,
                createdAt: new Date(),
                messageId: crypto.randomBytes(7).toString('hex'),
              },
            ];
          });
        }
      }
    };

    const messageIndex = messages.findIndex((m) => m.messageId === messageId);

    console.log('[Multilingual] Sending message with language:', language);

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: message,
        message: {
          messageId: messageId,
          chatId: chatId!,
          content: message,
        },
        chatId: chatId!,
        files: fileIds,
        focusMode: focusMode,
        optimizationMode: optimizationMode,
        history: rewrite
          ? chatHistory.slice(0, messageIndex === -1 ? undefined : messageIndex)
          : chatHistory,
        chatModel: {
          name: chatModelProvider.name,
          provider: chatModelProvider.provider,
        },
        embeddingModel: {
          name: embeddingModelProvider.name,
          provider: embeddingModelProvider.provider,
        },
        systemInstructions: localStorage.getItem('systemInstructions'),
        language: language,
        maxHistoryTurns: (() => {
          const stored = localStorage.getItem('maxHistoryTurns');
          const value = stored ? parseInt(stored, 10) : 2;
          // Ensure value is within valid range
          return isNaN(value) || value < 1 || value > 50 ? 2 : value;
        })(),
      }),
    });

    // Handle non-OK responses (guardrails blocks, rate limits, etc.)
    if (!res.ok) {
      setLoading(false);
      try {
        const errorData = await res.json();
        const errorMessage = errorData.error || errorData.message || 'Request was blocked';
        
        // Show user-friendly error message
        toast.error(errorMessage);
        
        // Add error message to chat for visibility
        setMessages((prevMessages) => [
          ...prevMessages,
          {
            content: errorMessage,
            messageId: crypto.randomBytes(7).toString('hex'),
            chatId: chatId!,
            role: 'assistant',
            createdAt: new Date(),
            metadata: {
              error: true,
              code: errorData.code,
              violations: errorData.violations,
              metadata: errorData.metadata,
            },
          },
        ]);
        return;
      } catch (parseError) {
        // If JSON parsing fails, show generic error
        const statusText = res.status === 403 
          ? 'Request blocked by guardrails' 
          : res.status === 429 
          ? 'Rate limit exceeded. Please try again later.'
          : `Request failed (${res.status})`;
        toast.error(statusText);
        setMessages((prevMessages) => [
          ...prevMessages,
          {
            content: statusText,
            messageId: crypto.randomBytes(7).toString('hex'),
            chatId: chatId!,
            role: 'assistant',
            createdAt: new Date(),
            metadata: { error: true },
          },
        ]);
        return;
      }
    }

    if (!res.body) throw new Error('No response body');

    const reader = res.body?.getReader();
    const decoder = new TextDecoder('utf-8');

    let partialChunk = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        console.log('[useChat] Stream ended');
        break;
      }

      partialChunk += decoder.decode(value, { stream: true });
      console.log('[useChat] Received chunk, partialChunk length:', partialChunk.length);

      try {
        const messages = partialChunk.split('\n');
        for (const msg of messages) {
          if (!msg.trim()) continue;
          console.log('[useChat] Parsing message:', msg.substring(0, 100));
          const json = JSON.parse(msg);
          messageHandler(json);
        }
        partialChunk = '';
      } catch (error) {
        console.warn('Incomplete JSON, waiting for next chunk...', error);
      }
    }
  };

  return (
    <chatContext.Provider
      value={{
        messages,
        chatTurns,
        sections,
        chatHistory,
        files,
        fileIds,
        focusMode,
        chatId,
        hasError,
        isMessagesLoaded,
        isReady,
        loading,
        messageAppeared,
        notFound,
        optimizationMode,
        setFileIds,
        setFiles,
        setFocusMode,
        setOptimizationMode,
        rewrite,
        sendMessage,
      }}
    >
      {children}
    </chatContext.Provider>
  );
};

export const useChat = () => {
  const ctx = useContext(chatContext);
  return ctx;
};
