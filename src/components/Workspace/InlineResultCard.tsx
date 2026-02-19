'use client';

import { useState } from 'react';
import { InlineResultCard as InlineResultCardData } from '@/lib/workspace/dataAgentService';

interface InlineResultCardProps {
  data: InlineResultCardData;
}

export default function InlineResultCard({ data }: InlineResultCardProps) {
  const [sqlOpen, setSqlOpen] = useState(false);

  return (
    <div className="border border-light-200 dark:border-dark-200 rounded-lg p-4 bg-white dark:bg-gray-800 my-2 max-w-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-black dark:text-white flex items-center gap-1.5">
          📊 DataAgent Result
        </span>
        <span className="text-xs text-black/50 dark:text-white/50">
          {data.rowCount} {data.rowCount === 1 ? 'row' : 'rows'} · {data.executionTimeMs}ms
        </span>
      </div>

      {/* AI Summary */}
      {data.summary && (
        <p className="text-sm text-black/80 dark:text-white/80 mb-3 leading-relaxed">
          {data.summary}
        </p>
      )}

      {/* Table */}
      {data.columns.length > 0 && (
        <div className="overflow-auto max-h-64 rounded border border-light-200 dark:border-dark-200 mb-3">
          <table className="min-w-full text-xs">
            <thead className="bg-light-primary dark:bg-dark-primary sticky top-0">
              <tr>
                {data.columns.map((col) => (
                  <th
                    key={col}
                    className="px-3 py-2 text-left font-semibold text-black/70 dark:text-white/70 whitespace-nowrap border-b border-light-200 dark:border-dark-200"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row, i) => (
                <tr
                  key={i}
                  className="border-b border-light-200 dark:border-dark-200 last:border-0 hover:bg-light-primary dark:hover:bg-dark-primary transition-colors"
                >
                  {data.columns.map((col) => (
                    <td
                      key={col}
                      className="px-3 py-2 text-black/80 dark:text-white/80 whitespace-nowrap"
                    >
                      {row[col] == null ? (
                        <span className="text-black/30 dark:text-white/30 italic">null</span>
                      ) : (
                        String(row[col])
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* SQL collapsible */}
      <details
        open={sqlOpen}
        onToggle={(e) => setSqlOpen((e.target as HTMLDetailsElement).open)}
        className="text-xs"
      >
        <summary className="cursor-pointer text-black/50 dark:text-white/50 hover:text-black/70 dark:hover:text-white/70 select-none transition-colors">
          {sqlOpen ? 'Hide SQL' : 'Show SQL'}
        </summary>
        <pre className="mt-2 p-3 bg-light-primary dark:bg-dark-primary rounded border border-light-200 dark:border-dark-200 overflow-auto text-black/70 dark:text-white/70 whitespace-pre-wrap break-all">
          {data.generatedSql}
        </pre>
      </details>
    </div>
  );
}
