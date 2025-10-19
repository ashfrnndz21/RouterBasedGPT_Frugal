import { Settings } from 'lucide-react';
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
              alt="FrugalAIGpt Logo" 
              className="w-24 h-24 rounded-2xl shadow-lg"
            />
            <h1 className="text-6xl font-black truegpt-gradient-text tracking-tight">
              TrueGpt
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
        </div>
      </div>
    </div>
  );
};

export default EmptyChat;
