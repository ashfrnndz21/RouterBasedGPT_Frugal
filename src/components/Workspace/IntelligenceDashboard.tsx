'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bot, MessageSquare, FileText, Brain, Database, Zap, DollarSign, Pin, Loader2 } from 'lucide-react';
import type { WorkspaceDashboardMetrics } from '@/lib/workspace/dashboardAggregator';

interface IntelligenceDashboardProps {
  workspaceId: string;
}

// ─── Metric Card ────────────────────────────────────────────────────────────

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
}

function MetricCard({ icon, label, value, sub }: MetricCardProps) {
  return (
    <div className="bg-light-primary dark:bg-dark-primary rounded-lg p-4 border border-light-200 dark:border-dark-200 flex items-start gap-3">
      <div className="p-2 bg-[#24A0ED]/10 rounded-lg flex-shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-black/50 dark:text-white/50">{label}</p>
        <p className="text-lg font-semibold text-black dark:text-white leading-tight">{value}</p>
        {sub && <p className="text-xs text-black/40 dark:text-white/40 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Section Header ──────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <h3 className="text-sm font-semibold text-black dark:text-white mb-3">{title}</h3>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyState({ icon, message }: { icon: React.ReactNode; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-6 px-4 text-center bg-light-primary dark:bg-dark-primary rounded-lg border border-light-200 dark:border-dark-200">
      <div className="text-black/20 dark:text-white/20 mb-2">{icon}</div>
      <p className="text-xs text-black/50 dark:text-white/50">{message}</p>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function IntelligenceDashboard({ workspaceId }: IntelligenceDashboardProps) {
  const [metrics, setMetrics] = useState<WorkspaceDashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch(`/api/workspaces/${workspaceId}/dashboard`);
      if (!res.ok) throw new Error('Failed to load dashboard metrics');
      const data: WorkspaceDashboardMetrics = await res.json();
      setMetrics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-[#24A0ED]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  const noData = !metrics || (
    metrics.agentCount === 0 &&
    metrics.recentConversationCount === 0 &&
    metrics.documentCount === 0 &&
    metrics.memoryEntryCount === 0
  );

  return (
    <div className="space-y-6 p-4">

      {/* ── Metric Cards ── */}
      <section>
        <SectionHeader title="Overview" />
        {noData ? (
          <EmptyState
            icon={<Zap className="w-8 h-8" />}
            message="No workspace activity yet. Start a conversation to see metrics here."
          />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            <MetricCard
              icon={<Bot className="w-4 h-4 text-[#24A0ED]" />}
              label="Agents"
              value={metrics?.agentCount ?? 0}
            />
            <MetricCard
              icon={<MessageSquare className="w-4 h-4 text-[#24A0ED]" />}
              label="Conversations"
              value={metrics?.recentConversationCount ?? 0}
              sub="last 7 days"
            />
            <MetricCard
              icon={<FileText className="w-4 h-4 text-[#24A0ED]" />}
              label="Documents"
              value={metrics?.documentCount ?? 0}
            />
            <MetricCard
              icon={<Brain className="w-4 h-4 text-[#24A0ED]" />}
              label="Memory Entries"
              value={metrics?.memoryEntryCount ?? 0}
            />
            <MetricCard
              icon={<Database className="w-4 h-4 text-[#24A0ED]" />}
              label="Data Sources"
              value={metrics?.dataSourceCount ?? 0}
            />
            <MetricCard
              icon={<Zap className="w-4 h-4 text-[#24A0ED]" />}
              label="Tokens Used"
              value={(metrics?.totalTokens ?? 0).toLocaleString()}
            />
            <MetricCard
              icon={<DollarSign className="w-4 h-4 text-[#24A0ED]" />}
              label="Est. Cost"
              value={`$${(metrics?.estimatedCost ?? 0).toFixed(4)}`}
            />
          </div>
        )}
      </section>

      {/* ── Agent Performance ── */}
      <section>
        <SectionHeader title="Agent Performance" />
        {!metrics?.agentPerformance?.length ? (
          <EmptyState
            icon={<Bot className="w-8 h-8" />}
            message="No agent activity recorded yet."
          />
        ) : (
          <div className="bg-light-primary dark:bg-dark-primary rounded-lg border border-light-200 dark:border-dark-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-light-200 dark:border-dark-200">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-black/50 dark:text-white/50">Agent</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-black/50 dark:text-white/50">Queries Answered</th>
                </tr>
              </thead>
              <tbody>
                {metrics.agentPerformance.map((agent) => (
                  <tr
                    key={agent.agentId}
                    className="border-b border-light-200 dark:border-dark-200 last:border-0 hover:bg-light-200/50 dark:hover:bg-dark-200/50 transition-colors"
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-base leading-none">{agent.avatar}</span>
                        <span className="text-xs font-medium text-black dark:text-white">{agent.agentName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className="text-xs font-semibold text-black dark:text-white">{agent.queryCount}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Pinned Insights ── */}
      <section>
        <SectionHeader title="Pinned Insights" />
        {!metrics?.pinnedInsights?.length ? (
          <EmptyState
            icon={<Pin className="w-8 h-8" />}
            message="No pinned insights yet. Pin important messages to surface them here."
          />
        ) : (
          <div className="space-y-2">
            {metrics.pinnedInsights.map((insight) => (
              <div
                key={insight.id}
                className="bg-light-primary dark:bg-dark-primary rounded-lg p-3 border border-light-200 dark:border-dark-200"
              >
                <div className="flex items-start gap-2">
                  <Pin className="w-3.5 h-3.5 text-[#24A0ED] mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    {insight.title && (
                      <p className="text-xs font-semibold text-black dark:text-white mb-1 truncate">
                        {insight.title}
                      </p>
                    )}
                    {insight.content && (
                      <p className="text-xs text-black/70 dark:text-white/70 line-clamp-2">
                        {insight.content}
                      </p>
                    )}
                    <p className="text-xs text-black/40 dark:text-white/40 mt-1">
                      {new Date(insight.pinnedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

    </div>
  );
}
