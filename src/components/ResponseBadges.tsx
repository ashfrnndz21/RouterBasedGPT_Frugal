'use client';

import React from 'react';
import { ResponseMetadata } from './ChatWindow';
import { Zap, MessageSquare, Target, Brain, FileText, Clock, DollarSign } from 'lucide-react';

interface ResponseBadgesProps {
  metadata?: ResponseMetadata;
}

const ResponseBadges: React.FC<ResponseBadgesProps> = ({ metadata }) => {
  if (!metadata) return null;

  const {
    cacheHit,
    modelTier,
    routingPath,
    summarizationTriggered,
    estimatedCost,
    latencyMs,
  } = metadata;

  const badges = [];

  // Routing/Processing badge
  if (cacheHit) {
    badges.push({
      icon: <Zap size={12} />,
      label: 'Cached',
      color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
      tooltip: 'Retrieved from cache - instant and free!',
    });
  } else if (routingPath === 'canned') {
    badges.push({
      icon: <MessageSquare size={12} />,
      label: 'Canned',
      color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
      tooltip: 'Pre-written response',
    });
  } else if (modelTier === 'tier1') {
    badges.push({
      icon: <Target size={12} />,
      label: 'Tier 1',
      color: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300',
      tooltip: 'Fast, efficient model for simple queries',
    });
  } else if (modelTier === 'tier2') {
    badges.push({
      icon: <Brain size={12} />,
      label: 'Tier 2',
      color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
      tooltip: 'Advanced model for complex reasoning',
    });
  }

  // Summarization badge
  if (summarizationTriggered) {
    badges.push({
      icon: <FileText size={12} />,
      label: 'Summarized',
      color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
      tooltip: 'Using conversation summary for efficiency',
    });
  }

  // Latency badge
  if (latencyMs !== undefined) {
    const latencySeconds = (latencyMs / 1000).toFixed(1);
    badges.push({
      icon: <Clock size={12} />,
      label: `${latencySeconds}s`,
      color: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
      tooltip: `Response time: ${latencySeconds} seconds`,
    });
  }

  // Cost badge
  if (estimatedCost !== undefined) {
    const costDisplay = estimatedCost < 0.0001 
      ? '<$0.0001' 
      : `$${estimatedCost.toFixed(4)}`;
    
    badges.push({
      icon: <DollarSign size={12} />,
      label: costDisplay,
      color: cacheHit 
        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
      tooltip: cacheHit ? 'Free - served from cache!' : `Estimated cost: ${costDisplay}`,
    });
  }

  if (badges.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-3 mb-2">
      {badges.map((badge, index) => (
        <div
          key={index}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${badge.color} transition-all duration-200 hover:scale-105`}
          title={badge.tooltip}
        >
          {badge.icon}
          <span>{badge.label}</span>
        </div>
      ))}
    </div>
  );
};

export default ResponseBadges;
