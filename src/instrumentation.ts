/**
 * Next.js 15 instrumentation hook.
 * Called once at server startup before any requests are handled.
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Only run bootstrap in the Node.js runtime (not in Edge runtime)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { bootstrap } = await import('./lib/bootstrap');
    await bootstrap();
  }
}
