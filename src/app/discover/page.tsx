'use client';

import { Globe2Icon, Settings2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import SmallNewsCard from '@/components/Discover/SmallNewsCard';
import MajorNewsCard from '@/components/Discover/MajorNewsCard';
import InterestSelector from '@/components/Preferences/InterestSelector';
import { preferenceManager } from '@/lib/preferences';
import { INTEREST_CATEGORIES, getCategoriesByIds, getCategoryColorClasses } from '@/lib/preferences/interestCategories';

export interface Discover {
  title: string;
  content: string;
  url: string;
  thumbnail: string;
}

const Page = () => {
  const [discover, setDiscover] = useState<Discover[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTopic, setActiveTopic] = useState<string>('');
  const [showInterestSelector, setShowInterestSelector] = useState(false);
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [userInterests, setUserInterests] = useState<string[]>([]);
  const [allTopicsMode, setAllTopicsMode] = useState(false);

  // Load user interests on mount
  useEffect(() => {
    const interests = preferenceManager.getInterests();
    const allTopics = preferenceManager.isAllTopicsMode();
    
    setUserInterests(interests);
    setAllTopicsMode(allTopics);

    // Check if this is first-time user (no interests set and not in all topics mode)
    if (interests.length === 0 && !allTopics) {
      setIsOnboarding(true);
      setShowInterestSelector(true);
    } else {
      // Set active topic to first interest or default
      let initialTopic = 'tech';
      if (allTopics) {
        initialTopic = 'all';
        setActiveTopic('all');
      } else if (interests.length > 0) {
        initialTopic = interests[0];
        setActiveTopic(interests[0]);
      } else {
        setActiveTopic('tech');
      }
      
      // Fetch articles on initial load
      if (allTopics) {
        fetchArticles('all');
      } else if (interests.length > 0) {
        fetchArticles(initialTopic, interests);
      } else {
        fetchArticles(initialTopic);
      }
    }
  }, []);

  const fetchArticles = async (topic: string, categories?: string[]) => {
    setLoading(true);
    try {
      // Build query params
      const params = new URLSearchParams();
      
      if (allTopicsMode || topic === 'all') {
        // Fetch from all categories
        params.append('topic', 'tech'); // Use tech as base, but we'll enhance this
        params.append('allTopics', 'true');
      } else if (categories && categories.length > 0) {
        // Use multiple categories
        params.append('categories', categories.join(','));
      } else {
        // Single topic
        params.append('topic', topic);
      }

      const res = await fetch(`/api/discover?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message);
      }

      // Show message if Serper not configured
      if (data.message) {
        toast.error(data.message);
      }

      // Keep all articles - thumbnails are now guaranteed by backend
      console.log('[Discover Page] Received', data.blogs?.length || 0, 'articles');
      setDiscover(data.blogs || []);
      toast.success(`Loaded ${data.blogs?.length || 0} articles`);
    } catch (err: any) {
      console.error('[Discover Page] Error fetching data:', err.message);
      toast.error('Error fetching data');
      setDiscover([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    if (allTopicsMode) {
      fetchArticles('all');
    } else if (userInterests.length > 0) {
      fetchArticles(activeTopic, userInterests);
    } else {
      fetchArticles(activeTopic);
    }
  };

  const handleInterestsSaved = (categories: string[]) => {
    setUserInterests(categories);
    const allTopics = preferenceManager.isAllTopicsMode();
    setAllTopicsMode(allTopics);
    
    // Update active topic
    if (allTopics) {
      setActiveTopic('all');
    } else if (categories.length > 0) {
      setActiveTopic(categories[0]);
    }
    
    setIsOnboarding(false);
    
    // Fetch articles with new preferences
    if (allTopics) {
      fetchArticles('all');
    } else if (categories.length > 0) {
      fetchArticles(categories[0], categories);
    }
  };

  const handleAllTopicsToggle = () => {
    const newAllTopicsMode = !allTopicsMode;
    setAllTopicsMode(newAllTopicsMode);
    preferenceManager.setAllTopicsMode(newAllTopicsMode);
    
    if (newAllTopicsMode) {
      setActiveTopic('all');
      fetchArticles('all');
    } else if (userInterests.length > 0) {
      setActiveTopic(userInterests[0]);
      fetchArticles(userInterests[0], userInterests);
    }
  };

  const handleTopicClick = (topicId: string) => {
    setActiveTopic(topicId);
    fetchArticles(topicId, userInterests);
  };

  // Get display topics based on user interests or all categories
  const displayTopics = allTopicsMode 
    ? INTEREST_CATEGORIES 
    : getCategoriesByIds(userInterests);

  return (
    <>
      <InterestSelector
        isOpen={showInterestSelector}
        onClose={() => setShowInterestSelector(false)}
        onSave={handleInterestsSaved}
        isOnboarding={isOnboarding}
      />
      
      <div>
        <div className="flex flex-col pt-10 border-b border-light-200/20 dark:border-dark-200/20 pb-6 px-2">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center justify-center gap-3">
              <Globe2Icon size={48} className="truegpt-gradient-text" />
              <h1 className="text-5xl font-black truegpt-gradient-text tracking-tight">
                TrueDiscovery
              </h1>
            </div>
            <div className="flex flex-row items-center space-x-2 overflow-x-auto">
              {/* All Topics Toggle */}
              <button
                onClick={handleAllTopicsToggle}
                className={cn(
                  'border-[0.1px] rounded-full text-sm px-3 py-1 text-nowrap transition duration-200 cursor-pointer flex items-center gap-1.5',
                  allTopicsMode
                    ? 'truegpt-gradient text-white shadow-md'
                    : 'border-black/30 dark:border-white/30 text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white hover:border-black/40 dark:hover:border-white/40 hover:bg-black/5 dark:hover:bg-white/5',
                )}
              >
                <Globe2Icon size={14} />
                <span>All Topics</span>
              </button>

              {/* Interest Category Chips */}
              {displayTopics.length > 0 && displayTopics.map((category) => {
                const colors = getCategoryColorClasses(category.color);
                return (
                  <button
                    key={category.id}
                    className={cn(
                      'border-[0.1px] rounded-full text-sm px-3 py-1 text-nowrap transition duration-200 cursor-pointer',
                      activeTopic === category.id && !allTopicsMode
                        ? 'truegpt-gradient text-white shadow-md'
                        : allTopicsMode
                        ? 'border-black/20 dark:border-white/20 text-black/50 dark:text-white/50'
                        : 'border-black/30 dark:border-white/30 text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white hover:border-black/40 dark:hover:border-white/40 hover:bg-black/5 dark:hover:bg-white/5',
                    )}
                    onClick={() => !allTopicsMode && handleTopicClick(category.id)}
                    disabled={allTopicsMode}
                  >
                    <span>{category.name}</span>
                  </button>
                );
              })}

              {/* Settings Button */}
              <button
                onClick={() => setShowInterestSelector(true)}
                className="border-[0.1px] rounded-full text-sm px-3 py-1 text-nowrap transition duration-200 cursor-pointer border-black/30 dark:border-white/30 text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white hover:border-black/40 dark:hover:border-white/40 hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-1.5"
                title="Manage interests"
              >
                <Settings2 size={14} />
              </button>

              {/* Refresh Button */}
              <button
                onClick={handleRefresh}
                disabled={loading}
                className={cn(
                  'border-[0.1px] rounded-full text-sm px-4 py-1 text-nowrap transition duration-200 flex items-center gap-2',
                  loading
                    ? 'border-black/20 dark:border-white/20 text-black/40 dark:text-white/40 cursor-not-allowed'
                    : 'truegpt-gradient text-white hover:opacity-90 cursor-pointer shadow-lg'
                )}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={cn(loading && 'animate-spin')}
                >
                  <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                  <path d="M21 3v5h-5" />
                </svg>
                <span>{loading ? 'Loading...' : 'Refresh'}</span>
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-row items-center justify-center min-h-screen">
            <svg
              aria-hidden="true"
              className="w-8 h-8 text-light-200 fill-light-secondary dark:text-[#202020] animate-spin dark:fill-[#ffffff3b]"
              viewBox="0 0 100 101"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M100 50.5908C100.003 78.2051 78.1951 100.003 50.5908 100C22.9765 99.9972 0.997224 78.018 1 50.4037C1.00281 22.7993 22.8108 0.997224 50.4251 1C78.0395 1.00281 100.018 22.8108 100 50.4251ZM9.08164 50.594C9.06312 73.3997 27.7909 92.1272 50.5966 92.1457C73.4023 92.1642 92.1298 73.4365 92.1483 50.6308C92.1669 27.8251 73.4392 9.0973 50.6335 9.07878C27.8278 9.06026 9.10003 27.787 9.08164 50.594Z"
                fill="currentColor"
              />
              <path
                d="M93.9676 39.0409C96.393 38.4037 97.8624 35.9116 96.9801 33.5533C95.1945 28.8227 92.871 24.3692 90.0681 20.348C85.6237 14.1775 79.4473 9.36872 72.0454 6.45794C64.6435 3.54717 56.3134 2.65431 48.3133 3.89319C45.869 4.27179 44.3768 6.77534 45.014 9.20079C45.6512 11.6262 48.1343 13.0956 50.5786 12.717C56.5073 11.8281 62.5542 12.5399 68.0406 14.7911C73.527 17.0422 78.2187 20.7487 81.5841 25.4923C83.7976 28.5886 85.4467 32.059 86.4416 35.7474C87.1273 38.1189 89.5423 39.6781 91.9676 39.0409Z"
                fill="currentFill"
              />
            </svg>
          </div>
        ) : !discover || discover.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-screen gap-4">
            <p className="text-black/60 dark:text-white/60 text-center">
              Click the <span className="truegpt-gradient-text font-semibold">Refresh</span> button above to load articles
            </p>
            <button
              onClick={handleRefresh}
              className="border-[0.1px] rounded-full text-sm px-6 py-2 transition duration-200 flex items-center gap-2 truegpt-gradient text-white hover:opacity-90 cursor-pointer shadow-lg"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
              </svg>
              <span>Load Articles</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4 pb-28 pt-5 lg:pb-8 w-full">
            <div className="block lg:hidden">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {discover?.map((item, i) => (
                  <SmallNewsCard key={`mobile-${i}`} item={item} />
                ))}
              </div>
            </div>

            <div className="hidden lg:block">
              {discover &&
                discover.length > 0 &&
                (() => {
                  const sections = [];
                  let index = 0;

                  while (index < discover.length) {
                    if (sections.length > 0) {
                      sections.push(
                        <hr
                          key={`sep-${index}`}
                          className="border-t border-light-200/20 dark:border-dark-200/20 my-3 w-full"
                        />,
                      );
                    }

                    if (index < discover.length) {
                      sections.push(
                        <MajorNewsCard
                          key={`major-${index}`}
                          item={discover[index]}
                          isLeft={false}
                        />,
                      );
                      index++;
                    }

                    if (index < discover.length) {
                      sections.push(
                        <hr
                          key={`sep-${index}-after`}
                          className="border-t border-light-200/20 dark:border-dark-200/20 my-3 w-full"
                        />,
                      );
                    }

                    if (index < discover.length) {
                      const smallCards = discover.slice(index, index + 3);
                      sections.push(
                        <div
                          key={`small-group-${index}`}
                          className="grid lg:grid-cols-3 sm:grid-cols-2 grid-cols-1 gap-4"
                        >
                          {smallCards.map((item, i) => (
                            <SmallNewsCard
                              key={`small-${index + i}`}
                              item={item}
                            />
                          ))}
                        </div>,
                      );
                      index += 3;
                    }

                    if (index < discover.length) {
                      sections.push(
                        <hr
                          key={`sep-${index}-after-small`}
                          className="border-t border-light-200/20 dark:border-dark-200/20 my-3 w-full"
                        />,
                      );
                    }

                    if (index < discover.length - 1) {
                      const twoMajorCards = discover.slice(index, index + 2);
                      twoMajorCards.forEach((item, i) => {
                        sections.push(
                          <MajorNewsCard
                            key={`double-${index + i}`}
                            item={item}
                            isLeft={i === 0}
                          />,
                        );
                        if (i === 0) {
                          sections.push(
                            <hr
                              key={`sep-double-${index + i}`}
                              className="border-t border-light-200/20 dark:border-dark-200/20 my-3 w-full"
                            />,
                          );
                        }
                      });
                      index += 2;
                    } else if (index < discover.length) {
                      sections.push(
                        <MajorNewsCard
                          key={`final-major-${index}`}
                          item={discover[index]}
                          isLeft={true}
                        />,
                      );
                      index++;
                    }

                    if (index < discover.length) {
                      sections.push(
                        <hr
                          key={`sep-${index}-after-major`}
                          className="border-t border-light-200/20 dark:border-dark-200/20 my-3 w-full"
                        />,
                      );
                    }

                    if (index < discover.length) {
                      const smallCards = discover.slice(index, index + 3);
                      sections.push(
                        <div
                          key={`small-group-2-${index}`}
                          className="grid lg:grid-cols-3 sm:grid-cols-2 grid-cols-1 gap-4"
                        >
                          {smallCards.map((item, i) => (
                            <SmallNewsCard
                              key={`small-2-${index + i}`}
                              item={item}
                            />
                          ))}
                        </div>,
                      );
                      index += 3;
                    }
                  }

                  return sections;
                })()}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Page;
