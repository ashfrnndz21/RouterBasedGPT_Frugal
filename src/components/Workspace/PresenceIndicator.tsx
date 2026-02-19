'use client';

import { useState, useEffect } from 'react';

interface PresenceIndicatorProps {
  workspaceId: string;
}

export default function PresenceIndicator({ workspaceId }: PresenceIndicatorProps) {
  const [activeCount, setActiveCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchPresence() {
      try {
        const res = await fetch(`/api/workspaces/${workspaceId}/presence`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          setActiveCount(typeof data.activeCount === 'number' ? data.activeCount : 0);
        }
      } catch {
        // Fail silently — don't crash the sidebar
      }
    }

    fetchPresence();
    const interval = setInterval(fetchPresence, 30_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [workspaceId]);

  if (activeCount === null) return null;

  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5">
      <span className="text-xs text-green-500">🟢</span>
      <span className="text-xs text-black/60 dark:text-white/60">
        {activeCount} {activeCount === 1 ? 'member' : 'members'} active
      </span>
    </div>
  );
}
