import { NextRequest, NextResponse } from 'next/server';
import { loadGuardrailsConfig } from '@/lib/guardrails/storage/guardrailsStore';
import { OutputGuardrails } from '@/lib/guardrails/output';

/**
 * POST /api/guardrails/test-output
 * Test a response against output guardrails without processing it
 */
export async function POST(req: NextRequest) {
  try {
    const { response } = await req.json();

    if (!response || typeof response !== 'string') {
      return NextResponse.json(
        { error: 'Response is required and must be a string' },
        { status: 400 }
      );
    }

    // Load configuration
    const config = loadGuardrailsConfig();

    if (!config.output) {
      return NextResponse.json(
        { error: 'Output guardrails not configured' },
        { status: 400 }
      );
    }

    // Initialize output guardrails
    const outputGuardrails = new OutputGuardrails(config.output);

    // Check guardrails
    const result = await outputGuardrails.checkResponse(response);

    return NextResponse.json({
      allowed: result.allowed,
      reason: result.reason,
      violations: result.violations || [],
      filtered: result.filtered,
      metadata: result.metadata,
      code: result.code,
    });
  } catch (error: any) {
    console.error('[Guardrails Test Output API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to test output guardrails', details: error.message },
      { status: 500 }
    );
  }
}
