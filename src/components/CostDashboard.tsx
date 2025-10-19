'use client';

import React, { useState, useMemo } from 'react';
import { useChat } from '@/lib/hooks/useChat';
import { DollarSign, TrendingDown, Zap, Target, Brain, ChevronDown, ChevronUp } from 'lucide-react';

const CostDashboard: React.FC = () => {
  const { sections } = useChat();
  const [isExpanded, setIsExpanded] = useState(false);

  const stats = useMemo(() => {
    let totalQueries = 0;
    let cacheHits = 0;
    let tier1Count = 0;
    let tier2Count = 0;
    let totalCost = 0;
    let totalLatency = 0;

    sections.forEach((section) => {
      if (section.metadata) {
        totalQueries++;
        
        if (section.metadata.cacheHit) {
          cacheHits++;
        }
        
        if (section.metadata.modelTier === 'tier1' || section.metadata.routingPath === 'rag-tier1') {
          tier1Count++;
        } else if (section.metadata.modelTier === 'tier2' || section.metadata.routingPath === 'rag-tier2') {
          tier2Count++;
        }
        
        if (section.metadata.estimatedCost) {
          totalCost += section.metadata.estimatedCost;
        }
        
        if (section.metadata.latencyMs) {
          totalLatency += section.metadata.latencyMs;
        }
      }
    });

    // Calculate cost without optimization (assume all tier2)
    const costWithoutOptimization = totalQueries * 0.0015; // Rough tier2 cost
    const savings = costWithoutOptimization - totalCost;
    const savingsPercent = totalQueries > 0 ? (savings / costWithoutOptimization) * 100 : 0;
    const avgLatency = totalQueries > 0 ? totalLatency / totalQueries : 0;

    return {
      totalQueries,
      cacheHits,
      tier1Count,
      tier2Count,
      totalCost,
      costWithoutOptimization,
      savings,
      savingsPercent,
      avgLatency,
    };
  }, [sections]);

  if (stats.totalQueries === 0) return null;

  return (
    <div className="fixed bottom-28 lg:bottom-14 right-4 z-30">
      <div className="bg-white dark:bg-dark-secondary rounded-xl shadow-lg border border-light-200 dark:border-dark-200 overflow-hidden">
        {/* Header - Always Visible */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-light-secondary/50 dark:hover:bg-dark-primary/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <DollarSign size={18} className="text-green-600 dark:text-green-400" />
            <span className="font-medium text-sm text-black dark:text-white">
              Session Stats
            </span>
          </div>
          {isExpanded ? (
            <ChevronDown size={16} className="text-black/60 dark:text-white/60" />
          ) : (
            <ChevronUp size={16} className="text-black/60 dark:text-white/60" />
          )}
        </button>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="px-4 pb-4 space-y-3 border-t border-light-200/50 dark:border-dark-200/50 pt-3">
            {/* Query Stats */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-black/70 dark:text-white/70">Queries:</span>
                <span className="font-medium text-black dark:text-white">{stats.totalQueries}</span>
              </div>
              
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1">
                  <Zap size={12} className="text-green-600 dark:text-green-400" />
                  <span className="text-black/70 dark:text-white/70">Cache Hits:</span>
                </div>
                <span className="font-medium text-green-600 dark:text-green-400">
                  {stats.cacheHits} ({stats.totalQueries > 0 ? Math.round((stats.cacheHits / stats.totalQueries) * 100) : 0}%)
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1">
                  <Target size={12} className="text-cyan-600 dark:text-cyan-400" />
                  <span className="text-black/70 dark:text-white/70">Tier 1:</span>
                </div>
                <span className="font-medium text-black dark:text-white">{stats.tier1Count}</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1">
                  <Brain size={12} className="text-purple-600 dark:text-purple-400" />
                  <span className="text-black/70 dark:text-white/70">Tier 2:</span>
                </div>
                <span className="font-medium text-black dark:text-white">{stats.tier2Count}</span>
              </div>
            </div>

            {/* Cost Stats */}
            <div className="pt-2 border-t border-light-200/50 dark:border-dark-200/50 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-black/70 dark:text-white/70">Estimated Cost:</span>
                <span className="font-medium text-black dark:text-white">
                  ${stats.totalCost.toFixed(4)}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-black/70 dark:text-white/70">Without Optimization:</span>
                <span className="font-medium text-black/50 dark:text-white/50 line-through">
                  ${stats.costWithoutOptimization.toFixed(4)}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <div className="flex items-center gap-1">
                  <TrendingDown size={12} className="text-green-600 dark:text-green-400" />
                  <span className="text-green-600 dark:text-green-400 font-medium">You Saved:</span>
                </div>
                <span className="font-bold text-green-600 dark:text-green-400">
                  ${stats.savings.toFixed(4)} ({Math.round(stats.savingsPercent)}%)
                </span>
              </div>
            </div>

            {/* Average Latency */}
            {stats.avgLatency > 0 && (
              <div className="pt-2 border-t border-light-200/50 dark:border-dark-200/50">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-black/70 dark:text-white/70">Avg Response Time:</span>
                  <span className="font-medium text-black dark:text-white">
                    {(stats.avgLatency / 1000).toFixed(2)}s
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CostDashboard;
