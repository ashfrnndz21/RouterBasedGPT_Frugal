import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { preferenceManager } from '@/lib/preferences';

interface Article {
  title: string;
  content: string;
  url: string;
  thumbnail: string;
}

const NewsArticleWidget = () => {
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [customTopics, setCustomTopics] = useState<Array<{ id: string; name: string; keywords: string[] }>>([]);
  const [showAddCustomTopic, setShowAddCustomTopic] = useState(false);
  const [customTopicName, setCustomTopicName] = useState('');
  const [customTopicKeywords, setCustomTopicKeywords] = useState('');

  useEffect(() => {
    // Load custom topics
    const topics = preferenceManager.getCustomTopics();
    setCustomTopics(topics);
    
    // Build API URL with custom topics
    const params = new URLSearchParams({ mode: 'preview' });
    if (topics.length > 0) {
      params.append('customTopics', encodeURIComponent(JSON.stringify(topics)));
    }
    
    fetch(`/api/discover?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        const articles = data.blogs || [];
        if (articles.length > 0) {
          setArticle(articles[Math.floor(Math.random() * articles.length)]);
        }
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  const handleAddCustomTopic = () => {
    if (!customTopicName.trim() || !customTopicKeywords.trim()) {
      toast.error('Please enter both topic name and keywords');
      return;
    }

    const keywords = customTopicKeywords.split(',').map(k => k.trim()).filter(Boolean);
    if (keywords.length === 0) {
      toast.error('Please enter at least one keyword');
      return;
    }

    const success = preferenceManager.addCustomTopic(customTopicName.trim(), keywords);
    if (success) {
      const updated = preferenceManager.getCustomTopics();
      setCustomTopics(updated);
      setCustomTopicName('');
      setCustomTopicKeywords('');
      setShowAddCustomTopic(false);
      toast.success(`Custom topic "${customTopicName}" added!`);
      
      // Refresh article with new topics
      window.location.reload();
    } else {
      toast.error('Maximum 2 custom topics allowed');
    }
  };

  const handleRemoveCustomTopic = (id: string) => {
    preferenceManager.removeCustomTopic(id);
    const updated = preferenceManager.getCustomTopics();
    setCustomTopics(updated);
    toast.success('Custom topic removed');
    
    // Refresh article
    window.location.reload();
  };

  return (
    <>
      {/* Add Custom Topic Modal */}
      {showAddCustomTopic && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-dark-primary rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold truegpt-gradient-text">Add Custom Topic</h2>
              <button
                onClick={() => {
                  setShowAddCustomTopic(false);
                  setCustomTopicName('');
                  setCustomTopicKeywords('');
                }}
                className="text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-black/70 dark:text-white/70">
                  Topic Name
                </label>
                <input
                  type="text"
                  value={customTopicName}
                  onChange={(e) => setCustomTopicName(e.target.value)}
                  placeholder="e.g., Space Exploration"
                  className="w-full px-4 py-2 rounded-lg border border-black/20 dark:border-white/20 bg-white dark:bg-dark-secondary text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  maxLength={30}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2 text-black/70 dark:text-white/70">
                  Keywords (comma-separated)
                </label>
                <input
                  type="text"
                  value={customTopicKeywords}
                  onChange={(e) => setCustomTopicKeywords(e.target.value)}
                  placeholder="e.g., NASA, SpaceX, Mars, rockets"
                  className="w-full px-4 py-2 rounded-lg border border-black/20 dark:border-white/20 bg-white dark:bg-dark-secondary text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-xs text-black/50 dark:text-white/50 mt-1">
                  Enter 3-5 keywords that describe your topic
                </p>
              </div>
            </div>
            
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setShowAddCustomTopic(false);
                  setCustomTopicName('');
                  setCustomTopicKeywords('');
                }}
                className="flex-1 px-4 py-2 rounded-lg border border-black/20 dark:border-white/20 text-black/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/5 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCustomTopic}
                className="flex-1 px-4 py-2 rounded-lg truegpt-gradient text-white hover:opacity-90 transition shadow-lg"
              >
                Add Topic
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2 w-full">
        {/* Custom Topics Display */}
        {(customTopics.length > 0 || customTopics.length < 2) && (
          <div className="flex flex-wrap gap-2 items-center">
            {customTopics.map((topic) => (
              <div
                key={topic.id}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs border border-purple-400 dark:border-purple-600 text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/20"
              >
                <span>{topic.name}</span>
                <button
                  onClick={() => handleRemoveCustomTopic(topic.id)}
                  className="hover:text-red-600 dark:hover:text-red-400"
                  title="Remove custom topic"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            
            {customTopics.length < 2 && (
              <button
                onClick={() => setShowAddCustomTopic(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border border-dashed border-black/30 dark:border-white/30 text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white hover:border-black/40 dark:hover:border-white/40 hover:bg-black/5 dark:hover:bg-white/5 transition"
                title="Add custom news topic"
              >
                <Plus size={14} />
                <span>Add Topic</span>
              </button>
            )}
          </div>
        )}

        <div className="bg-light-secondary dark:bg-dark-secondary rounded-2xl border border-light-200 dark:border-dark-200 shadow-sm shadow-light-200/10 dark:shadow-black/25 flex flex-row items-stretch w-full h-24 min-h-[96px] max-h-[96px] p-0 overflow-hidden">
      {loading ? (
        <div className="animate-pulse flex flex-row items-stretch w-full h-full">
          <div className="w-24 min-w-24 max-w-24 h-full bg-light-200 dark:bg-dark-200" />
          <div className="flex flex-col justify-center flex-1 px-3 py-2 gap-2">
            <div className="h-4 w-3/4 rounded bg-light-200 dark:bg-dark-200" />
            <div className="h-3 w-1/2 rounded bg-light-200 dark:bg-dark-200" />
          </div>
        </div>
      ) : error ? (
        <div className="w-full text-xs text-red-400">Could not load news.</div>
      ) : article ? (
        <a
          href={`/?q=Summary: ${article.url}`}
          className="flex flex-row items-stretch w-full h-full relative overflow-hidden group"
        >
          <div className="relative w-24 min-w-24 max-w-24 h-full overflow-hidden">
            <img
              className="object-cover w-full h-full bg-light-200 dark:bg-dark-200 group-hover:scale-110 transition-transform duration-300"
              src={article.thumbnail}
              alt={article.title}
              onError={(e) => {
                // Fallback to placeholder if image fails to load
                e.currentTarget.src = 'https://via.placeholder.com/96x96/1e293b/64748b?text=News';
              }}
            />
          </div>
          <div className="flex flex-col justify-center flex-1 px-3 py-2">
            <div className="font-semibold text-xs text-black dark:text-white leading-tight line-clamp-2 mb-1">
              {article.title}
            </div>
            <p className="text-black/60 dark:text-white/60 text-[10px] leading-relaxed line-clamp-2">
              {article.content}
            </p>
          </div>
        </a>
      ) : null}
        </div>
      </div>
    </>
  );
};

export default NewsArticleWidget;
