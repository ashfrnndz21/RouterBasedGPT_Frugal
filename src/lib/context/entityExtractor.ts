/**
 * Entity Extractor - Extracts key entities from conversation turns
 * 
 * Uses pattern matching and NLP techniques to identify important entities
 * that should be tracked across the conversation.
 */

import { ExtractedEntity } from './contextPayload';

interface EntityPattern {
  type: ExtractedEntity['type'];
  patterns: RegExp[];
  confidence: number;
}

// Entity extraction patterns
const ENTITY_PATTERNS: EntityPattern[] = [
  // Prices and currency
  {
    type: 'price',
    patterns: [
      /\$\s*\d+(?:,\d{3})*(?:\.\d{2})?/g,
      /\d+(?:,\d{3})*(?:\.\d{2})?\s*(?:USD|EUR|GBP|MYR|RM|dollars?|ringgit)/gi,
      /RM\s*\d+/gi,
    ],
    confidence: 0.95,
  },
  
  // Products and plans
  {
    type: 'product',
    patterns: [
      /\d+\s*(?:Mbps|Gbps|MB|GB|TB)\s+(?:fiber|cable|internet|broadband|plan)/gi,
      /(?:fiber|cable|internet|broadband)\s+\d+\s*(?:Mbps|Gbps)/gi,
      /(?:plan|package|subscription|service)\s+\w+/gi,
    ],
    confidence: 0.9,
  },
  
  // Locations
  {
    type: 'location',
    patterns: [
      /\b(?:in|at|near|around)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g,
      /\b(?:Malaysia|Singapore|Thailand|Indonesia|Philippines)\b/gi,
      /\b(?:Kuala Lumpur|KL|Penang|Johor|Selangor)\b/gi,
    ],
    confidence: 0.85,
  },
  
  // Dates and times
  {
    type: 'date',
    patterns: [
      /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}\b/gi,
      /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g,
      /\b(?:today|tomorrow|yesterday|next week|next month)\b/gi,
    ],
    confidence: 0.9,
  },
  
  // Organizations
  {
    type: 'organization',
    patterns: [
      /\b(?:TM|Maxis|Celcom|Digi|Unifi|Time|Astro)\b/gi,
      /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Inc|Corp|Ltd|Sdn Bhd|Berhad)\b/g,
    ],
    confidence: 0.85,
  },
  
  // People (basic pattern)
  {
    type: 'person',
    patterns: [
      /\b(?:Mr|Mrs|Ms|Dr|Prof)\.\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g,
    ],
    confidence: 0.8,
  },
];

/**
 * Extract entities from text
 */
export function extractEntities(
  text: string,
  turnNumber: number
): Map<string, ExtractedEntity> {
  const entities = new Map<string, ExtractedEntity>();
  
  for (const { type, patterns, confidence } of ENTITY_PATTERNS) {
    for (const pattern of patterns) {
      const matches = text.matchAll(pattern);
      
      for (const match of matches) {
        const value = match[0].trim();
        const normalizedValue = normalizeEntity(value, type);
        
        // Use normalized value as key to avoid duplicates
        const key = `${type}:${normalizedValue}`;
        
        if (!entities.has(key)) {
          entities.set(key, {
            type,
            value: normalizedValue,
            confidence,
            firstMentioned: turnNumber,
            lastMentioned: turnNumber,
          });
        } else {
          // Update last mentioned
          const existing = entities.get(key)!;
          existing.lastMentioned = turnNumber;
        }
      }
    }
  }
  
  return entities;
}

/**
 * Normalize entity values for consistency
 */
function normalizeEntity(value: string, type: ExtractedEntity['type']): string {
  switch (type) {
    case 'price':
      // Normalize price format
      return value.replace(/\s+/g, ' ').toUpperCase();
    
    case 'product':
      // Normalize product names
      return value.toLowerCase().replace(/\s+/g, ' ').trim();
    
    case 'location':
      // Capitalize location names
      return value
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    
    case 'organization':
      // Keep organization names as-is but trim
      return value.trim();
    
    case 'date':
      // Normalize date format
      return value.toLowerCase().trim();
    
    case 'person':
      // Capitalize person names
      return value
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    
    default:
      return value.trim();
  }
}

/**
 * Merge new entities with existing ones
 */
export function mergeEntities(
  existing: Map<string, ExtractedEntity>,
  newEntities: Map<string, ExtractedEntity>
): Map<string, ExtractedEntity> {
  const merged = new Map(existing);
  
  for (const [key, entity] of newEntities.entries()) {
    if (merged.has(key)) {
      // Update existing entity
      const existingEntity = merged.get(key)!;
      existingEntity.lastMentioned = entity.lastMentioned;
      // Boost confidence if mentioned multiple times
      existingEntity.confidence = Math.min(0.99, existingEntity.confidence + 0.05);
    } else {
      // Add new entity
      merged.set(key, entity);
    }
  }
  
  return merged;
}

/**
 * Get entities relevant to a query
 * Returns entities that are likely relevant based on recency and confidence
 */
export function getRelevantEntities(
  entities: Map<string, ExtractedEntity>,
  currentTurn: number,
  maxAge: number = 10
): ExtractedEntity[] {
  return Array.from(entities.values())
    .filter(entity => {
      const age = currentTurn - entity.lastMentioned;
      return age <= maxAge && entity.confidence > 0.7;
    })
    .sort((a, b) => {
      // Sort by recency and confidence
      const aScore = (1 / (currentTurn - a.lastMentioned + 1)) * a.confidence;
      const bScore = (1 / (currentTurn - b.lastMentioned + 1)) * b.confidence;
      return bScore - aScore;
    });
}

/**
 * Format entities for inclusion in prompts
 */
export function formatEntitiesForPrompt(entities: ExtractedEntity[]): string {
  if (entities.length === 0) {
    return 'No specific entities tracked.';
  }
  
  const grouped = entities.reduce((acc, entity) => {
    if (!acc[entity.type]) {
      acc[entity.type] = [];
    }
    acc[entity.type].push(entity.value);
    return acc;
  }, {} as Record<string, string[]>);
  
  const lines = Object.entries(grouped).map(([type, values]) => {
    const uniqueValues = [...new Set(values)];
    return `${type}: ${uniqueValues.join(', ')}`;
  });
  
  return lines.join('\n');
}

/**
 * Create an enhanced RAG query using entities
 */
export function enhanceQueryWithEntities(
  originalQuery: string,
  entities: ExtractedEntity[]
): string {
  if (entities.length === 0) {
    return originalQuery;
  }
  
  // Get the most relevant entities (top 3)
  const topEntities = entities.slice(0, 3);
  const entityContext = topEntities.map(e => e.value).join(' ');
  
  // Combine original query with entity context
  return `${originalQuery} (context: ${entityContext})`;
}
