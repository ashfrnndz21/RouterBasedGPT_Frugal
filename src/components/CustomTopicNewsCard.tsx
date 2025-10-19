import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface Article {
  title: string;
  content: string;
  url: string;
  thumbnail: string;
}

interface CustomTopicNewsCardProps {
  topic: { id: string; name: string; keywords: string[] };
  onRemove: (id: string) => void;
}

const CustomTopicNewsCard = ({ topic, onRemove }: CustomTopicNewsCardProps) => {
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Fetch articles for this specific custom topic
    const params = new URLSearchParams({ 
      mode: 'preview',
      customTopics: encodeURIComponent(JSON.stringify([topic]))
    });
    
    fetch(`/api/discover?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        console.log(`[CustomTopicNewsCard] Fetched articles for "${topic.name}":`, data.blogs?.length || 0);
        const articles = data.blogs || [];
        if (articles.length > 0) {
          // Filter articles with valid thumbnails first
          const articlesWithImages = articles.filter((a: Article) => 
            a.thumbnail && 
            !a.thumbnail.startsWith('data:') && 
            !a.thumbnail.includes('placeholder')
          );
          
          // Pick from articles with images if available, otherwise use any article
          const pool = articlesWithImages.length > 0 ? articlesWithImages : articles;
          const selectedArticle = pool[Math.floor(Math.random() * pool.length)];
          
          // Ensure thumbnail has a fallback
          if (!selectedArticle.thumbnail || selectedArticle.thumbnail.startsWith('data:') || selectedArticle.thumbnail.includes('placeholder')) {
            selectedArticle.thumbnail = `https://via.placeholder.com/96x96/9333ea/ffffff?text=${encodeURIComponent(topic.name)}`;
          }
          
          console.log(`[CustomTopicNewsCard] Selected article:`, selectedArticle.title, 'Thumbnail:', selectedArticle.thumbnail);
          setArticle(selectedArticle);
        } else {
          console.warn(`[CustomTopicNewsCard] No articles found for "${topic.name}"`);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(`[CustomTopicNewsCard] Error fetching articles for "${topic.name}":`, err);
        setError(true);
        setLoading(false);
      });
  }, [topic]);

  const handleRemove = () => {
    onRemove(topic.id);
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      {/* Topic Header */}
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs border border-purple-400 dark:border-purple-600 text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/20">
          <span className="font-semibold">{topic.name}</span>
        </div>
        <button
          onClick={handleRemove}
          className="text-black/40 dark:text-white/40 hover:text-red-600 dark:hover:text-red-400 transition"
          title="Remove custom topic"
        >
          <X size={16} />
        </button>
      </div>

      {/* News Card */}
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
          <div className="w-full flex items-center justify-center text-xs text-red-400">
            Could not load news for this topic.
          </div>
        ) : article ? (
          <a
            href={`/?q=Summary: ${article.url}`}
            className="flex flex-row items-stretch w-full h-full relative overflow-hidden group"
          >
            <div className="relative w-24 min-w-24 max-w-24 h-full overflow-hidden bg-gradient-to-br from-purple-500/10 to-cyan-500/10">
              <img
                className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-300"
                src={article.thumbnail}
                alt={article.title}
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.src = `https://via.placeholder.com/96x96/9333ea/ffffff?text=${encodeURIComponent(topic.name)}`;
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
        ) : (
          <div className="w-full flex items-center justify-center text-xs text-black/60 dark:text-white/60">
            No articles found for this topic.
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomTopicNewsCard;
