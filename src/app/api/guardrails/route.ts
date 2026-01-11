import { NextRequest, NextResponse } from 'next/server';
import {
  loadGuardrailsConfig,
  saveGuardrailsConfig,
  updateGuardrailsConfig,
} from '@/lib/guardrails/storage/guardrailsStore';
import { GuardrailsConfig } from '@/lib/guardrails/types';

/**
 * GET /api/guardrails
 * Returns current guardrails configuration
 */
export async function GET() {
  try {
    const config = loadGuardrailsConfig();
    return NextResponse.json(config);
  } catch (error: any) {
    console.error('[Guardrails API] Error loading config:', error);
    return NextResponse.json(
      { error: 'Failed to load guardrails configuration', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/guardrails
 * Updates guardrails configuration (partial update supported)
 */
export async function POST(req: NextRequest) {
  try {
    const updates = await req.json() as Partial<GuardrailsConfig>;
    
    // Validate that updates have expected structure
    if (updates.static || updates.dynamic || updates.output) {
      const updated = updateGuardrailsConfig(updates);
      return NextResponse.json({ success: true, config: updated });
    } else {
      return NextResponse.json(
        { error: 'Invalid update structure. Expected "static", "dynamic", or "output" fields.' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('[Guardrails API] Error updating config:', error);
    return NextResponse.json(
      { error: 'Failed to update guardrails configuration', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/guardrails
 * Replaces entire guardrails configuration
 */
export async function PUT(req: NextRequest) {
  try {
    const config = await req.json() as GuardrailsConfig;
    saveGuardrailsConfig(config);
    return NextResponse.json({ success: true, config });
  } catch (error: any) {
    console.error('[Guardrails API] Error saving config:', error);
    return NextResponse.json(
      { error: 'Failed to save guardrails configuration', details: error.message },
      { status: 500 }
    );
  }
}
