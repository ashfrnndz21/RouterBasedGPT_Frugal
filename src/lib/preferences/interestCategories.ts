/**
 * Interest Categories Configuration
 * Defines all available interest categories with metadata and search keywords
 */

export interface InterestCategory {
  id: string;
  name: string;
  icon: string; // Lucide icon name
  keywords: string[]; // Search terms for this category
  color: string; // Tailwind color class
  description: string;
}

/**
 * All available interest categories
 */
export const INTEREST_CATEGORIES: InterestCategory[] = [
  {
    id: 'tech',
    name: 'Tech & Science',
    icon: 'Cpu',
    keywords: ['technology', 'AI', 'artificial intelligence', 'science', 'innovation', 'tech news', 'software', 'hardware', 'computing', 'research'],
    color: 'blue',
    description: 'Technology, AI, science, and innovation news'
  },
  {
    id: 'finance',
    name: 'Finance',
    icon: 'DollarSign',
    keywords: ['finance', 'markets', 'stocks', 'economy', 'business', 'investing', 'trading', 'cryptocurrency', 'banking', 'money'],
    color: 'green',
    description: 'Financial markets, economy, and investment news'
  },
  {
    id: 'sports',
    name: 'Sports',
    icon: 'Trophy',
    keywords: ['sports', 'football', 'basketball', 'soccer', 'athletics', 'baseball', 'tennis', 'golf', 'olympics', 'fitness'],
    color: 'orange',
    description: 'Sports news, scores, and athletic events'
  },
  {
    id: 'health',
    name: 'Health & Wellness',
    icon: 'Heart',
    keywords: ['health', 'wellness', 'fitness', 'medical', 'nutrition', 'healthcare', 'medicine', 'mental health', 'exercise', 'diet'],
    color: 'red',
    description: 'Health, wellness, fitness, and medical news'
  },
  {
    id: 'entertainment',
    name: 'Entertainment',
    icon: 'Film',
    keywords: ['entertainment', 'movies', 'music', 'celebrities', 'TV', 'television', 'streaming', 'gaming', 'pop culture', 'shows'],
    color: 'purple',
    description: 'Movies, music, TV, and entertainment news'
  },
  {
    id: 'art',
    name: 'Art & Culture',
    icon: 'Palette',
    keywords: ['art', 'culture', 'museums', 'design', 'creativity', 'photography', 'architecture', 'literature', 'books', 'theater'],
    color: 'pink',
    description: 'Art, culture, design, and creative pursuits'
  },
  {
    id: 'politics',
    name: 'Politics & World',
    icon: 'Globe',
    keywords: ['politics', 'world news', 'government', 'international', 'elections', 'policy', 'diplomacy', 'global', 'geopolitics', 'current events'],
    color: 'indigo',
    description: 'Politics, world news, and current events'
  },
  {
    id: 'business',
    name: 'Business',
    icon: 'Briefcase',
    keywords: ['business', 'startups', 'entrepreneurship', 'companies', 'corporate', 'industry', 'commerce', 'management', 'leadership', 'innovation'],
    color: 'yellow',
    description: 'Business, startups, and entrepreneurship news'
  }
];

/**
 * Get category by ID
 */
export function getCategoryById(id: string): InterestCategory | undefined {
  return INTEREST_CATEGORIES.find(cat => cat.id === id);
}

/**
 * Get categories by IDs
 */
export function getCategoriesByIds(ids: string[]): InterestCategory[] {
  return ids
    .map(id => getCategoryById(id))
    .filter((cat): cat is InterestCategory => cat !== undefined);
}

/**
 * Get all category IDs
 */
export function getAllCategoryIds(): string[] {
  return INTEREST_CATEGORIES.map(cat => cat.id);
}

/**
 * Get search keywords for categories
 */
export function getKeywordsForCategories(categoryIds: string[]): string[] {
  const categories = getCategoriesByIds(categoryIds);
  const keywords = categories.flatMap(cat => cat.keywords);
  // Remove duplicates
  return Array.from(new Set(keywords));
}

/**
 * Build search query for categories
 */
export function buildCategorySearchQuery(categoryIds: string[]): string {
  if (categoryIds.length === 0) {
    return '';
  }
  
  const keywords = getKeywordsForCategories(categoryIds);
  // Take top 3-5 keywords to avoid overly long queries
  return keywords.slice(0, 5).join(' OR ');
}

/**
 * Get Tailwind color classes for a category
 */
export function getCategoryColorClasses(color: string): {
  bg: string;
  text: string;
  border: string;
  hover: string;
} {
  const colorMap: Record<string, { bg: string; text: string; border: string; hover: string }> = {
    blue: {
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      text: 'text-blue-700 dark:text-blue-300',
      border: 'border-blue-300 dark:border-blue-700',
      hover: 'hover:bg-blue-200 dark:hover:bg-blue-900/50'
    },
    green: {
      bg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-700 dark:text-green-300',
      border: 'border-green-300 dark:border-green-700',
      hover: 'hover:bg-green-200 dark:hover:bg-green-900/50'
    },
    orange: {
      bg: 'bg-orange-100 dark:bg-orange-900/30',
      text: 'text-orange-700 dark:text-orange-300',
      border: 'border-orange-300 dark:border-orange-700',
      hover: 'hover:bg-orange-200 dark:hover:bg-orange-900/50'
    },
    red: {
      bg: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-700 dark:text-red-300',
      border: 'border-red-300 dark:border-red-700',
      hover: 'hover:bg-red-200 dark:hover:bg-red-900/50'
    },
    purple: {
      bg: 'bg-purple-100 dark:bg-purple-900/30',
      text: 'text-purple-700 dark:text-purple-300',
      border: 'border-purple-300 dark:border-purple-700',
      hover: 'hover:bg-purple-200 dark:hover:bg-purple-900/50'
    },
    pink: {
      bg: 'bg-pink-100 dark:bg-pink-900/30',
      text: 'text-pink-700 dark:text-pink-300',
      border: 'border-pink-300 dark:border-pink-700',
      hover: 'hover:bg-pink-200 dark:hover:bg-pink-900/50'
    },
    indigo: {
      bg: 'bg-indigo-100 dark:bg-indigo-900/30',
      text: 'text-indigo-700 dark:text-indigo-300',
      border: 'border-indigo-300 dark:border-indigo-700',
      hover: 'hover:bg-indigo-200 dark:hover:bg-indigo-900/50'
    },
    yellow: {
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      text: 'text-yellow-700 dark:text-yellow-300',
      border: 'border-yellow-300 dark:border-yellow-700',
      hover: 'hover:bg-yellow-200 dark:hover:bg-yellow-900/50'
    }
  };

  return colorMap[color] || colorMap.blue;
}

/**
 * Validate category IDs
 */
export function validateCategoryIds(ids: string[]): boolean {
  const validIds = getAllCategoryIds();
  return ids.every(id => validIds.includes(id));
}
