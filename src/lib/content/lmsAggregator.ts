// ─────────────────────────────────────────────
//  Frugal AI — LMS Content Aggregator
//  Drop into: src/lib/content/lmsAggregator.ts
// ─────────────────────────────────────────────

import type { LearningModule, DomainScore, Tier } from '@/lib/types/learning'
import { scoreToTier } from '@/lib/types/learning'

// ── Seeded module catalogue ───────────────────
//  Extend this from DB (modules table) in production
export const MODULE_CATALOGUE: LearningModule[] = [
  {
    id: 'mod_001',
    title: 'Introduction to Generative AI',
    description: 'Foundational concepts of generative AI — how LLMs work, key terminology, and real-world applications.',
    domain: 'ai_essentials',
    tier: 'spark',
    type: 'video',
    source: 'aws',
    url: 'https://explore.skillbuilder.aws/learn/course/external/view/elearning/17763/introduction-to-generative-ai',
    durationMinutes: 45,
    tags: ['genai', 'llm', 'fundamentals'],
    prerequisites: [],
    rating: 4.7,
  },
  {
    id: 'mod_002',
    title: 'AI Essentials for Business Professionals',
    description: 'Non-technical grounding in AI concepts, use cases, and organisational impact. No coding required.',
    domain: 'ai_essentials',
    tier: 'spark',
    type: 'article',
    source: 'internal',
    url: '/learn/content/ai-essentials-business',
    durationMinutes: 30,
    tags: ['business', 'non-technical', 'fundamentals'],
    prerequisites: [],
    rating: 4.5,
  },
  {
    id: 'mod_003',
    title: 'Machine Learning Fundamentals',
    description: 'Supervised, unsupervised, and reinforcement learning — core algorithms explained with examples.',
    domain: 'ai_essentials',
    tier: 'build',
    type: 'video',
    source: 'aws',
    url: 'https://explore.skillbuilder.aws/learn/course/external/view/elearning/1851/machine-learning-terminology-and-process',
    durationMinutes: 60,
    tags: ['ml', 'algorithms', 'supervised', 'unsupervised'],
    prerequisites: ['mod_001'],
    rating: 4.6,
  },
  {
    id: 'mod_004',
    title: 'Python for Data Science',
    description: 'Pandas, NumPy, Matplotlib — practical data manipulation and visualisation in Python.',
    domain: 'data_science',
    tier: 'build',
    type: 'lab',
    source: 'coursera',
    url: 'https://www.coursera.org/learn/python-for-applied-data-science-ai',
    durationMinutes: 180,
    tags: ['python', 'pandas', 'data-manipulation'],
    prerequisites: [],
    rating: 4.8,
  },
  {
    id: 'mod_005',
    title: 'Feature Engineering Best Practices',
    description: 'Encoding, scaling, imputation, and feature selection strategies for ML pipelines.',
    domain: 'data_science',
    tier: 'build',
    type: 'article',
    source: 'internal',
    url: '/learn/content/feature-engineering',
    durationMinutes: 45,
    tags: ['feature-engineering', 'encoding', 'preprocessing'],
    prerequisites: ['mod_004'],
    rating: 4.4,
  },
  {
    id: 'mod_006',
    title: 'MLflow: Experiment Tracking in Practice',
    description: 'Track experiments, parameters, metrics and artefacts with MLflow. Hands-on lab.',
    domain: 'mlops',
    tier: 'build',
    type: 'lab',
    source: 'internal',
    url: '/learn/content/mlflow-lab',
    durationMinutes: 40,
    tags: ['mlflow', 'experiment-tracking', 'reproducibility'],
    prerequisites: [],
    rating: 4.6,
  },
  {
    id: 'mod_007',
    title: 'ML Deployment on Amazon SageMaker',
    description: 'Train, evaluate, and deploy ML models using SageMaker endpoints. Full pipeline walkthrough.',
    domain: 'mlops',
    tier: 'lead',
    type: 'lab',
    source: 'aws',
    url: 'https://explore.skillbuilder.aws/learn/course/external/view/elearning/1880/getting-started-with-amazon-sagemaker',
    durationMinutes: 120,
    tags: ['sagemaker', 'deployment', 'aws', 'endpoints'],
    prerequisites: ['mod_006'],
    rating: 4.7,
  },
  {
    id: 'mod_008',
    title: 'Drift Detection in Production ML Systems',
    description: 'PSI, KL-divergence, and monitoring strategies for detecting data and concept drift.',
    domain: 'mlops',
    tier: 'lead',
    type: 'article',
    source: 'internal',
    url: '/learn/content/drift-detection',
    durationMinutes: 35,
    tags: ['drift', 'monitoring', 'production', 'psi'],
    prerequisites: ['mod_007'],
    rating: 4.5,
  },
  {
    id: 'mod_009',
    title: 'Responsible AI: Bias and Fairness',
    description: 'Understanding sources of AI bias, fairness metrics, and mitigation strategies.',
    domain: 'responsible_ai',
    tier: 'build',
    type: 'video',
    source: 'coursera',
    url: 'https://www.coursera.org/learn/responsible-ai',
    durationMinutes: 90,
    tags: ['bias', 'fairness', 'ethics', 'responsible-ai'],
    prerequisites: [],
    rating: 4.8,
  },
  {
    id: 'mod_010',
    title: 'Prompt Engineering Fundamentals',
    description: 'System prompts, few-shot learning, chain-of-thought, and prompt injection defence.',
    domain: 'prompt_engineering',
    tier: 'spark',
    type: 'interactive',
    source: 'internal',
    url: '/learn/content/prompt-engineering-fundamentals',
    durationMinutes: 50,
    tags: ['prompting', 'few-shot', 'chain-of-thought', 'fundamentals'],
    prerequisites: [],
    rating: 4.9,
  },
  {
    id: 'mod_011',
    title: 'Amazon Bedrock: Build with Foundation Models',
    description: 'API access to Claude, Titan, Llama, and Stable Diffusion. RAG patterns and guardrails.',
    domain: 'cloud_ai',
    tier: 'build',
    type: 'lab',
    source: 'aws',
    url: 'https://explore.skillbuilder.aws/learn/course/external/view/elearning/17904/amazon-bedrock-getting-started',
    durationMinutes: 90,
    tags: ['bedrock', 'aws', 'foundation-models', 'rag'],
    prerequisites: ['mod_001'],
    rating: 4.8,
  },
  {
    id: 'mod_012',
    title: 'AI Strategy for Leaders',
    description: 'How to build an AI roadmap, assess AI maturity, and govern AI adoption at the enterprise level.',
    domain: 'ai_strategy',
    tier: 'lead',
    type: 'video',
    source: 'coursera',
    url: 'https://www.coursera.org/learn/ai-for-everyone',
    durationMinutes: 120,
    tags: ['strategy', 'leadership', 'roadmap', 'governance'],
    prerequisites: [],
    rating: 4.7,
  },
  {
    id: 'mod_013',
    title: 'LLM Security: Prompt Injection & Defences',
    description: 'Common LLM attack vectors — prompt injection, jailbreaks, data poisoning — and mitigation patterns.',
    domain: 'ai_security',
    tier: 'build',
    type: 'article',
    source: 'internal',
    url: '/learn/content/llm-security',
    durationMinutes: 40,
    tags: ['security', 'prompt-injection', 'llm', 'defence'],
    prerequisites: ['mod_010'],
    rating: 4.6,
  },
]

// ── Recommendation engine ─────────────────────
export interface RecommendedModule {
  module: LearningModule
  score: number           // relevance 0-1
  reason: string
}

export function recommendModules(
  domainScores: DomainScore[],
  completedModuleIds: string[],
  limit = 8
): RecommendedModule[] {
  const completed = new Set(completedModuleIds)
  const scoreMap = new Map(domainScores.map(s => [s.domain, s.score]))

  return MODULE_CATALOGUE
    .filter(m => m && !completed.has(m.id))
    .map(module => {
      const domainScore = scoreMap.get(module.domain) ?? 0
      const moduleTierNum = tierToNum(module.tier)
      const learnerTierNum = tierToNum(scoreToTier(domainScore))

      // Gap modules: learner is below module tier → high relevance
      // Strength modules: learner is above → lower priority
      let relevance = 0.5
      let reason = 'Expand your knowledge'

      if (domainScore === 0) {
        relevance = 0.9
        reason = 'New domain — start here'
      } else if (learnerTierNum < moduleTierNum) {
        relevance = 0.85
        reason = 'Closes a skill gap in your profile'
      } else if (learnerTierNum === moduleTierNum) {
        relevance = 0.7
        reason = 'Consolidate your current level'
      } else {
        relevance = 0.4
        reason = 'Challenge yourself with advanced content'
      }

      // Boost highly-rated modules
      if (module.rating && module.rating >= 4.7) relevance += 0.05

      return { module, score: Math.min(1, relevance), reason }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

function tierToNum(tier: Tier): number {
  return { spark: 1, build: 2, lead: 3, apex: 4 }[tier]
}

// ── Get modules by domain ─────────────────────
export function getModulesByDomain(domain: string): LearningModule[] {
  return MODULE_CATALOGUE.filter(m => m.domain === domain)
}

export function getModuleById(id: string): LearningModule | undefined {
  return MODULE_CATALOGUE.find(m => m.id === id)
}
