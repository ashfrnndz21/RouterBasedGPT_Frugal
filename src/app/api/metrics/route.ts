import { NextResponse } from 'next/server';
import { globalMetricsTracker } from '@/lib/metrics/metricsTracker';

export async function GET() {
  try {
    const aggregated = globalMetricsTracker.getAggregatedMetrics();
    const recent = globalMetricsTracker.getRecentQueries(20);
    
    return NextResponse.json({
      aggregated,
      recent,
    });
  } catch (error: any) {
    console.error('Error fetching metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    globalMetricsTracker.clear();
    return NextResponse.json({ message: 'Metrics cleared' });
  } catch (error: any) {
    console.error('Error clearing metrics:', error);
    return NextResponse.json(
      { error: 'Failed to clear metrics' },
      { status: 500 }
    );
  }
}
