/** Default: v20 local-state online TRPG. Legacy Supabase-backed accounts are opt-in. */
import process from 'node:process';
// Node keeps already-set deployment variables ahead of values from the file.
try { process.loadEnvFile(); } catch (error) { if (error.code !== 'ENOENT') throw error; }

if (process.env.CHRONICLE_LEGACY_MODE === '1' || process.argv.includes('--legacy')) {
  console.log('[Chronicle Gate] Explicit legacy mode enabled. Legacy account/persistence settings apply.');
  await import('./legacy-server.js');
} else {
  const { startHttpService } = await import('./game-server/http-service.js');
  const runtime = await startHttpService();
  console.log(`Chronicle Gate v20 running at ${runtime.url} · storage=${runtime.service.storage} · Supabase disabled`);
  let stopping = false;
  async function shutdown(reason, exitCode = 0) {
    if (stopping) return;
    stopping = true;
    console.log(`[shutdown] ${reason}: saving local story tables`);
    const deadline = setTimeout(() => process.exit(1), 5_000); deadline.unref();
    try { await runtime.close(); clearTimeout(deadline); process.exitCode = exitCode; }
    catch (error) { console.error('[shutdown]', error.message); process.exitCode = 1; }
  }
  process.once('SIGTERM', () => void shutdown('SIGTERM'));
  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.on('unhandledRejection', error => { console.error('[unhandledRejection]', error?.message || String(error)); void shutdown('unhandledRejection', 1); });
  process.on('uncaughtException', error => { console.error('[uncaughtException]', error.message); void shutdown('uncaughtException', 1); });
}
