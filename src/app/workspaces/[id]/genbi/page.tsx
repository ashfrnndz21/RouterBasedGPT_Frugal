'use client';

import { useParams } from 'next/navigation';
import GenBIDashboard from '@/components/GenBI/GenBIDashboard';

export default function WorkspaceGenBIPage() {
  const params = useParams();
  const workspaceId = params.id as string;

  return <GenBIDashboard workspaceId={workspaceId} />;
}
