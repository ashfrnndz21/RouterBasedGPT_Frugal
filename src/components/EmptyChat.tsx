import { Settings, GraduationCap, ShieldCheck } from 'lucide-react';
import EmptyChatMessageInput from './EmptyChatMessageInput';
import { File } from './ChatWindow';
import Link from 'next/link';
import WeatherWidget from './WeatherWidget';
import NewsArticleWidget from './NewsArticleWidget';
import CustomTopicNewsCard from './CustomTopicNewsCard';
import { useEffect, useState } from 'react';
import { preferenceManager } from '@/lib/preferences';

const EmptyChat = () => {
  const [customTopics, setCustomTopics] = useState<Array<{ id: string; name: string; keywords: string[] }>>([]);

  useEffect(() => {
    const topics = preferenceManager.getCustomTopics();
    setCustomTopics(topics);
  }, []);

  const handleRemoveCustomTopic = (id: string) => {
    preferenceManager.removeCustomTopic(id);
    const updated = preferenceManager.getCustomTopics();
    setCustomTopics(updated);
    window.location.reload(); // Refresh to update all widgets
  };
  return (
    <div className="relative">
      <div className="absolute w-full flex flex-row items-center justify-end mr-5 mt-5">
        <Link href="/settings">
          <Settings className="cursor-pointer lg:hidden" />
        </Link>
      </div>
      <div className="flex flex-col items-center justify-center min-h-screen max-w-screen-sm mx-auto p-2 space-y-4">
        <div className="flex flex-col items-center justify-center w-full space-y-8">
          <div className="flex flex-col items-center space-y-4 -mt-8">
            <img 
              src="/truegpt-logo.svg" 
              alt="PTTGPT Logo" 
              className="w-24 h-24 rounded-2xl shadow-lg"
            />
            <h1 className="text-6xl font-black truegpt-gradient-text tracking-tight">
              PTTGPT
            </h1>
            <h2 className="text-black/70 dark:text-white/70 text-xl font-semibold tracking-wide">
              AI-Powered Search & Intelligence
            </h2>
          </div>
          <EmptyChatMessageInput />
        </div>
        <div className="flex flex-col w-full gap-4 mt-2">
          {/* Weather and General News Row */}
          <div className="flex flex-col w-full gap-4 sm:flex-row sm:justify-center">
            <div className="flex-1 w-full">
              <WeatherWidget />
            </div>
            <div className="flex-1 w-full">
              <NewsArticleWidget />
            </div>
          </div>
          
          {/* Custom Topic News Cards */}
          {customTopics.length > 0 && (
            <div className="flex flex-col w-full gap-4 sm:flex-row sm:justify-center">
              {customTopics.map((topic) => (
                <div key={topic.id} className="flex-1 w-full">
                  <CustomTopicNewsCard
                    topic={topic}
                    onRemove={handleRemoveCustomTopic}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Learning Platform Cards */}
          <div className="flex flex-col w-full gap-4 sm:flex-row sm:justify-center">
            <Link href="/learn" className="flex-1 w-full group">
              <div className="flex items-center gap-4 p-4 rounded-xl border border-light-200/50 dark:border-dark-200/30 bg-light-secondary dark:bg-dark-secondary hover:border-[#4F8EF7]/50 transition-all duration-200">
                <div className="w-10 h-10 rounded-lg bg-[#4F8EF7]/10 flex items-center justify-center flex-shrink-0">
                  <GraduationCap size={20} className="text-[#4F8EF7]" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-black dark:text-white">Learning App</div>
                  <div className="text-xs text-black/50 dark:text-white/50">Assess skills, track progress & learn AI</div>
                </div>
              </div>
            </Link>
            <Link href="/studio" className="flex-1 w-full group">
              <div className="flex items-center gap-4 p-4 rounded-xl border border-light-200/50 dark:border-dark-200/30 bg-light-secondary dark:bg-dark-secondary hover:border-[#A78BFA]/50 transition-all duration-200">
                <div className="w-10 h-10 rounded-lg bg-[#A78BFA]/10 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck size={20} className="text-[#A78BFA]" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-black dark:text-white">Admin Studio</div>
                  <div className="text-xs text-black/50 dark:text-white/50">Manage learners, content & assessments</div>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmptyChat;
