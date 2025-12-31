/**
 * Odds Module Exports
 * 
 * Use UnifiedOddsSync for all odds syncing operations.
 * It provides:
 * - Redis caching for fast client requests
 * - Database persistence for audit trail
 * - Rate limiting to protect API quota
 */

export { UnifiedOddsSync, type SyncResult } from './unified-sync';
export { GamesCache, type CachedGame } from './games-cache';

// Legacy exports (deprecated - use UnifiedOddsSync instead)
export { OddsSyncService } from './sync-service';
export { ExternalOddsSync } from './external-sync';

