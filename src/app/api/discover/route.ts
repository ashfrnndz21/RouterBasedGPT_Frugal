import { searchSearxng } from '@/lib/searxng';
import { searchSerper } from '@/lib/serperSearch';
import { getSerperApiKey } from '@/lib/config';
import { 
  INTEREST_CATEGORIES, 
  getCategoryById, 
  validateCategoryIds 
} from '@/lib/preferences/interestCategories';

// Legacy topic mapping for backward compatibility
const websitesForTopic = {
  tech: {
    query: ['technology news', 'latest tech', 'AI news', 'science innovation'],
    links: ['techcrunch.com', 'wired.com', 'theverge.com'],
  },
  finance: {
    query: ['finance news', 'economy news', 'stock market', 'investing'],
    links: ['bloomberg.com', 'cnbc.com', 'marketwatch.com'],
  },
  art: {
    query: ['art news', 'culture news', 'modern art', 'cultural events'],
    links: ['artnews.com', 'hyperallergic.com', 'theartnewspaper.com'],
  },
  sports: {
    query: ['sports news', 'latest sports', 'football news', 'tennis news'],
    links: ['espn.com', 'bbc.com/sport', 'skysports.com'],
  },
  entertainment: {
    query: ['entertainment news', 'movies news', 'TV shows', 'celebrities'],
    links: ['hollywoodreporter.com', 'variety.com', 'deadline.com'],
  },
  health: {
    query: ['health news', 'wellness news', 'medical news', 'fitness'],
    links: ['healthline.com', 'webmd.com', 'medicalnewstoday.com'],
  },
  politics: {
    query: ['politics news', 'world news', 'government news', 'international'],
    links: ['politico.com', 'bbc.com/news', 'reuters.com'],
  },
  business: {
    query: ['business news', 'startup news', 'entrepreneurship', 'companies'],
    links: ['forbes.com', 'businessinsider.com', 'inc.com'],
  },
};

type Topic = keyof typeof websitesForTopic;

export const GET = async (req: Request) => {
  try {
    const params = new URL(req.url).searchParams;
    const mode: 'normal' | 'preview' =
      (params.get('mode') as 'normal' | 'preview') || 'normal';
    const topic: Topic = (params.get('topic') as Topic) || 'tech';
    const allTopics = params.get('allTopics') === 'true';
    const categoriesParam = params.get('categories');
    const customTopicsParam = params.get('customTopics');

    // Handle multiple categories or all topics mode
    let categoriesToSearch: string[] = [];
    let customTopics: Array<{ id: string; name: string; keywords: string[] }> = [];
    
    // Parse custom topics if provided
    if (customTopicsParam) {
      try {
        customTopics = JSON.parse(decodeURIComponent(customTopicsParam));
        console.log('[Discover API] Received custom topics:', customTopics);
      } catch (e) {
        console.error('[Discover] Failed to parse custom topics:', e);
      }
    }
    
    // Check if we're fetching ONLY custom topics (no regular categories)
    const onlyCustomTopics = customTopics.length > 0 && !categoriesParam && !allTopics && !params.get('topic');
    
    if (onlyCustomTopics) {
      // Don't search regular categories, only custom topics
      categoriesToSearch = [];
      console.log('[Discover API] Fetching ONLY custom topics, no regular categories');
    } else if (allTopics) {
      // Fetch from all available categories
      categoriesToSearch = INTEREST_CATEGORIES.map(cat => cat.id);
    } else if (categoriesParam) {
      // Parse comma-separated categories
      const requestedCategories = categoriesParam.split(',').map(c => c.trim()).filter(Boolean);
      
      // Validate category IDs
      if (requestedCategories.length > 0 && validateCategoryIds(requestedCategories)) {
        categoriesToSearch = requestedCategories;
      } else {
        // Fallback to single topic for backward compatibility
        categoriesToSearch = [topic];
      }
    } else if (customTopics.length === 0) {
      // Only use default topic if no custom topics provided
      categoriesToSearch = [topic];
    } else {
      // Has custom topics but no specific category request
      categoriesToSearch = [];
    }

    const serperApiKey = getSerperApiKey();

    // Check if Serper is configured
    if (!serperApiKey || serperApiKey.trim() === '') {
      console.log('[Discover] No Serper API key configured');
      return Response.json({
        blogs: [],
        message: 'Please add SERPER_API_KEY to config.toml to enable Discover. Get free key at https://serper.dev/',
      });
    }

    let data = [];

    if (mode === 'normal') {
      // Use Serper for fast, reliable news search
      const seenUrls = new Set();
      
      // Build search queries for custom topics
      const customTopicPromises = customTopics.map(async (customTopic) => {
        const queries = customTopic.keywords.slice(0, 2).map(keyword => `${keyword} news`);
        console.log('[Discover API] Searching custom topic:', customTopic.name, 'with queries:', queries);
        
        const results = await Promise.all(queries.map(async (query) => {
          const newsResults = await searchSerper(query, {
            apiKey: serperApiKey,
            type: 'news',
            num: 10,
          });
          
          const imageResults = await searchSerper(query, {
            apiKey: serperApiKey,
            type: 'images',
            num: 5,
          });
          
          const resultsWithImages = newsResults.results.map((article, index) => ({
            ...article,
            thumbnailUrl: imageResults.results[index]?.url || article.imageUrl || '',
            category: customTopic.id,
            categoryName: customTopic.name,
          }));
          
          return {
            ...newsResults,
            results: resultsWithImages,
          };
        }));
        
        return results;
      });
      
      // Build search queries using category keywords
      const allSearchPromises = categoriesToSearch.flatMap((categoryId) => {
        const category = getCategoryById(categoryId);
        
        if (!category) {
          // Fallback to legacy topic data if category not found
          const topicData = websitesForTopic[categoryId as Topic];
          if (!topicData) return [];
          
          const queriesPerCategory = categoriesToSearch.length > 3 ? 1 : 2;
          const randomQueries = topicData.query
            .sort(() => Math.random() - 0.5)
            .slice(0, queriesPerCategory);

          return randomQueries.map(async (query) => {
            const newsResults = await searchSerper(query, {
              apiKey: serperApiKey,
              type: 'news',
              num: 10,
            });
            
            const imageResults = await searchSerper(query, {
              apiKey: serperApiKey,
              type: 'images',
              num: 10,
            });
            
            const resultsWithImages = newsResults.results.map((article, index) => ({
              ...article,
              thumbnailUrl: imageResults.results[index]?.imageUrl || article.imageUrl || '',
              category: categoryId,
            }));
            
            return {
              ...newsResults,
              results: resultsWithImages,
            };
          });
        }
        
        // Use category keywords to build search queries
        // Pick 1-2 queries per category depending on how many categories we're fetching
        const queriesPerCategory = categoriesToSearch.length > 3 ? 1 : 2;
        
        // Select top keywords for this category
        const topKeywords = category.keywords.slice(0, 3);
        const queries = topKeywords
          .map(keyword => `${keyword} news`)
          .sort(() => Math.random() - 0.5)
          .slice(0, queriesPerCategory);

        return queries.map(async (query) => {
          // Fetch news articles
          const newsResults = await searchSerper(query, {
            apiKey: serperApiKey,
            type: 'news',
            num: 10,
          });
          
          // Fetch related images for better thumbnails
          const imageResults = await searchSerper(query, {
            apiKey: serperApiKey,
            type: 'images',
            num: 10,
          });
          
          // Map news results with image URLs and category tag
          const resultsWithImages = newsResults.results.map((article, index) => ({
            ...article,
            thumbnailUrl: imageResults.results[index]?.imageUrl || article.imageUrl || '',
            category: categoryId,
            categoryName: category.name,
          }));
          
          return {
            ...newsResults,
            results: resultsWithImages,
          };
        });
      });

      const categoryResults = await Promise.all(allSearchPromises);
      const customResults = await Promise.all(customTopicPromises);
      
      // Combine category and custom topic results
      const allResults = [...categoryResults, ...customResults.flat()];
      
      data = allResults
        .flatMap(r => r.results)
        .filter((item) => {
          const url = item.url?.toLowerCase().trim();
          if (seenUrls.has(url)) return false;
          seenUrls.add(url);
          return true;
        })
        .map((item: any) => {
          // Priority: Use real images from Serper, fallback to placeholder
          const categoryName = item.categoryName || item.category || topic;
          
          // Check multiple possible image fields
          const possibleImage = item.thumbnailUrl || item.imageUrl;
          
          let thumbnail = '';
          if (possibleImage && !possibleImage.startsWith('data:')) {
            // Use actual image URL if it's not a base64 data URI
            thumbnail = possibleImage;
            console.log(`[Discover] Using image for "${item.title?.substring(0, 50)}...": ${thumbnail.substring(0, 100)}`);
          } else {
            // Fallback to placeholder
            thumbnail = `https://via.placeholder.com/800x600/1e293b/64748b?text=${encodeURIComponent(categoryName.toUpperCase())}`;
            console.log(`[Discover] No image found for "${item.title?.substring(0, 50)}...", using placeholder`);
          }
          
          return {
            title: item.title,
            url: item.url,
            content: item.content || item.snippet,
            thumbnail,
            category: item.category,
          };
        })
        .slice(0, 12) // Limit to 12 results
        .sort(() => Math.random() - 0.5);
        
    } else {
      // Preview mode - quick search using Serper for better results
      const allPreviewPromises = [];
      
      // Add custom topics to preview
      if (customTopics.length > 0) {
        customTopics.forEach((customTopic) => {
          // Use first keyword for preview
          const keyword = customTopic.keywords[0];
          const query = `${keyword} news`;
          
          allPreviewPromises.push(
            searchSerper(query, {
              apiKey: serperApiKey,
              type: 'news',
              num: 3,
            }).then(async (newsResults) => {
              const imageResults = await searchSerper(query, {
                apiKey: serperApiKey,
                type: 'images',
                num: 3,
              });
              
              return newsResults.results.map((article, index) => ({
                ...article,
                thumbnailUrl: imageResults.results[index]?.imageUrl || article.imageUrl || '',
                category: customTopic.id,
                categoryName: customTopic.name,
              }));
            })
          );
        });
      }
      
      // Add regular categories to preview
      if (categoriesToSearch.length > 0) {
        const previewCategoryId = categoriesToSearch[0];
        const previewCategory = getCategoryById(previewCategoryId);
        
        let randomQuery: string;
        
        if (previewCategory) {
          // Use category keywords
          const topKeywords = previewCategory.keywords.slice(0, 3);
          randomQuery = `${topKeywords[Math.floor(Math.random() * topKeywords.length)]} news`;
        } else {
          // Fallback to legacy topic data
          const previewTopicData = websitesForTopic[previewCategoryId as Topic];
          randomQuery = previewTopicData?.query[
            Math.floor(Math.random() * previewTopicData.query.length)
          ] || 'technology news';
        }
        
        allPreviewPromises.push(
          searchSerper(randomQuery, {
            apiKey: serperApiKey,
            type: 'news',
            num: 3,
          }).then(async (newsResults) => {
            const imageResults = await searchSerper(randomQuery, {
              apiKey: serperApiKey,
              type: 'images',
              num: 3,
            });
            
            return newsResults.results.map((article, index) => ({
              ...article,
              thumbnailUrl: imageResults.results[index]?.imageUrl || article.imageUrl || '',
              category: previewCategoryId,
              categoryName: previewCategory?.name || previewCategoryId,
            }));
          })
        );
      }
      
      // Fetch all preview articles
      const previewResults = await Promise.all(allPreviewPromises);
      const seenUrls = new Set();
      
      data = previewResults
        .flat()
        .filter((item) => {
          const url = item.url?.toLowerCase().trim();
          if (seenUrls.has(url)) return false;
          seenUrls.add(url);
          return true;
        })
        .map((item: any) => {
          const categoryName = item.categoryName || item.category || 'News';
          const possibleImage = item.thumbnailUrl || item.imageUrl;
          
          let thumbnail = '';
          if (possibleImage && !possibleImage.startsWith('data:')) {
            thumbnail = possibleImage;
          } else {
            thumbnail = `https://via.placeholder.com/400x300/9333ea/ffffff?text=${encodeURIComponent(categoryName)}`;
          }
          
          return {
            title: item.title,
            url: item.url,
            content: item.content || item.snippet || '',
            thumbnail,
            category: item.category,
            categoryName: item.categoryName,
          };
        })
        .slice(0, 10);
    }

    const categoriesDescription = allTopics 
      ? 'all topics' 
      : categoriesToSearch.length > 1 
        ? `${categoriesToSearch.length} categories (${categoriesToSearch.join(', ')})` 
        : categoriesToSearch[0];
    console.log(`[Discover] Found ${data.length} articles for ${categoriesDescription}`);

    return Response.json(
      {
        blogs: data,
      },
      {
        status: 200,
      },
    );
  } catch (err) {
    console.error(`[Discover] Error: ${err}`);
    return Response.json(
      {
        blogs: [],
        message: 'An error occurred loading discover content',
      },
      {
        status: 200, // Return 200 with empty array instead of 500
      },
    );
  }
};
