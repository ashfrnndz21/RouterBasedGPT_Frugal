'use client';

/* eslint-disable @next/next/no-img-element */
import React, { MutableRefObject } from 'react';
import { cn } from '@/lib/utils';
import {
  BookCopy,
  Disc3,
  Volume2,
  StopCircle,
  Layers3,
  Plus,
} from 'lucide-react';
import Markdown, { MarkdownToJSX } from 'markdown-to-jsx';
import Copy from './MessageActions/Copy';
import Rewrite from './MessageActions/Rewrite';
import MessageSources from './MessageSources';
import SearchImages from './SearchImages';
import SearchVideos from './SearchVideos';
import { useSpeech } from 'react-text-to-speech';
import ThinkBox from './ThinkBox';
import { useChat, Section } from '@/lib/hooks/useChat';
import Citation from './Citation';
import { preferenceManager } from '@/lib/preferences/preferenceManager';
import ResponseBadges from './ResponseBadges';
import CitationReferences from './CitationReferences';

const ThinkTagProcessor = ({
  children,
  thinkingEnded,
}: {
  children: React.ReactNode;
  thinkingEnded: boolean;
}) => {
  return (
    <ThinkBox content={children as string} thinkingEnded={thinkingEnded} />
  );
};

const MessageBox = ({
  section,
  sectionIndex,
  dividerRef,
  isLast,
}: {
  section: Section;
  sectionIndex: number;
  dividerRef?: MutableRefObject<HTMLDivElement | null>;
  isLast: boolean;
}) => {
  const { loading, chatTurns, sendMessage, rewrite } = useChat();

  // Get user preferences for enabled sources
  const searchPrefs = preferenceManager.getSearchPreferences();
  const { enabledSources } = searchPrefs;

  const parsedMessage = section.parsedAssistantMessage || '';
  const speechMessage = section.speechMessage || '';
  const thinkingEnded = section.thinkingEnded;

  const { speechStatus, start, stop } = useSpeech({ text: speechMessage });

  const markdownOverrides: MarkdownToJSX.Options = {
    overrides: {
      think: {
        component: ThinkTagProcessor,
        props: {
          thinkingEnded: thinkingEnded,
        },
      },
      citation: {
        component: Citation,
      },
      // Handle <references> tag - render as a hidden div to prevent React errors
      references: {
        component: ({ children, ...props }: any) => {
          // Just ignore the references tag content
          return null;
        },
      },
    },
    // Force markdown-to-jsx to skip unknown tags or render them safely
    forceInline: false,
  };

  return (
    <div className="space-y-6">
      <div className={'w-full pt-8 break-words'}>
        <h2 className="text-black dark:text-white font-medium text-3xl lg:w-9/12">
          {section.userMessage.content}
        </h2>
      </div>

      <div className="flex flex-col space-y-9 lg:space-y-0 lg:flex-row lg:justify-between lg:space-x-9">
        <div
          ref={dividerRef}
          className="flex flex-col space-y-6 w-full lg:w-9/12"
        >
          {section.sourceMessage &&
            section.sourceMessage.sources.length > 0 && (
              <div className="flex flex-col space-y-2">
                <div className="flex flex-row items-center space-x-2">
                  <BookCopy className="text-black dark:text-white" size={20} />
                  <h3 className="text-black dark:text-white font-medium text-xl">
                    Sources
                  </h3>
                </div>
                <MessageSources sources={section.sourceMessage.sources} />
              </div>
            )}

          <div className="flex flex-col space-y-2">
            {section.sourceMessage && (
              <div className="flex flex-row items-center space-x-2">
                <Disc3
                  className={cn(
                    'text-black dark:text-white',
                    isLast && loading ? 'animate-spin' : 'animate-none',
                  )}
                  size={20}
                />
                <h3 className="text-black dark:text-white font-medium text-xl">
                  Answer
                </h3>
              </div>
            )}

            {section.assistantMessage && (
              <>
                {/* Check if this is an error message from guardrails */}
                {section.assistantMessage.metadata?.error ? (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-red-900 dark:text-red-100 font-medium mb-1">Request Blocked</h4>
                        <p className="text-sm text-red-800 dark:text-red-200">{parsedMessage}</p>
                        {section.assistantMessage.metadata.violations && section.assistantMessage.metadata.violations.length > 0 && (
                          <div className="mt-2 text-xs text-red-700 dark:text-red-300">
                            <p className="font-medium mb-1">Reason:</p>
                            <ul className="list-disc list-inside space-y-0.5">
                              {section.assistantMessage.metadata.violations.map((v: any, i: number) => (
                                <li key={i}>{v.reason}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <Markdown
                    className={cn(
                      'prose prose-h1:mb-3 prose-h2:mb-2 prose-h2:mt-6 prose-h2:font-[800] prose-h3:mt-4 prose-h3:mb-1.5 prose-h3:font-[600] dark:prose-invert prose-p:leading-relaxed prose-pre:p-0 font-[400]',
                      'max-w-none break-words text-black dark:text-white',
                    )}
                    options={markdownOverrides}
                  >
                    {parsedMessage}
                  </Markdown>
                )}

                {/* Response Badges */}
                <ResponseBadges metadata={section.metadata} />

                {loading && isLast ? null : (
                  <div className="flex flex-row items-center justify-between w-full text-black dark:text-white py-4 -mx-2">
                    <div className="flex flex-row items-center space-x-1">
                      <Rewrite
                        rewrite={rewrite}
                        messageId={section.assistantMessage.messageId}
                      />
                    </div>
                    <div className="flex flex-row items-center space-x-1">
                      <Copy
                        initialMessage={section.assistantMessage.content}
                        section={section}
                      />
                      <button
                        onClick={() => {
                          if (speechStatus === 'started') {
                            stop();
                          } else {
                            start();
                          }
                        }}
                        className="p-2 text-black/70 dark:text-white/70 rounded-xl hover:bg-light-secondary dark:hover:bg-dark-secondary transition duration-200 hover:text-black dark:hover:text-white"
                      >
                        {speechStatus === 'started' ? (
                          <StopCircle size={18} />
                        ) : (
                          <Volume2 size={18} />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Citation References */}
                {section.sourceMessage &&
                  section.sourceMessage.sources &&
                  section.sourceMessage.sources.length > 0 && (
                    <CitationReferences
                      sources={section.sourceMessage.sources}
                    />
                  )}

                {isLast &&
                  section.suggestions &&
                  section.suggestions.length > 0 &&
                  section.assistantMessage &&
                  !loading && (
                    <div className="mt-8 pt-6 border-t border-light-200/50 dark:border-dark-200/50">
                      <div className="flex flex-row items-center space-x-2 mb-4">
                        <Layers3
                          className="text-black dark:text-white"
                          size={20}
                        />
                        <h3 className="text-black dark:text-white font-medium text-xl">
                          Related
                        </h3>
                      </div>
                      <div className="space-y-0">
                        {section.suggestions.map(
                          (suggestion: string, i: number) => (
                            <div key={i}>
                              {i > 0 && (
                                <div className="h-px bg-light-200/40 dark:bg-dark-200/40 mx-3" />
                              )}
                              <button
                                onClick={() => sendMessage(suggestion)}
                                className="group w-full px-3 py-4 text-left transition-colors duration-200"
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <p className="text-sm text-black/70 dark:text-white/70 group-hover:text-[#24A0ED] transition-colors duration-200 leading-relaxed">
                                    {suggestion}
                                  </p>
                                  <Plus
                                    size={16}
                                    className="text-black/40 dark:text-white/40 group-hover:text-[#24A0ED] transition-colors duration-200 flex-shrink-0"
                                  />
                                </div>
                              </button>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  )}
              </>
            )}
          </div>
        </div>

        {section.assistantMessage && (enabledSources.images || enabledSources.videos) && (
          <div className="lg:sticky lg:top-20 flex flex-col items-center space-y-3 w-full lg:w-3/12 z-30 h-full pb-4">
            {enabledSources.images && (
              <SearchImages
                query={section.userMessage.content}
                chatHistory={chatTurns.slice(0, sectionIndex * 2)}
                messageId={section.assistantMessage.messageId}
              />
            )}
            {enabledSources.videos && (
              <SearchVideos
                chatHistory={chatTurns.slice(0, sectionIndex * 2)}
                query={section.userMessage.content}
                messageId={section.assistantMessage.messageId}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBox;
