/**
 * Odds Validator
 * 
 * Validates that odds haven't drifted beyond acceptable thresholds
 * before accepting a bet. Protects against stale odds exploitation.
 */

import { GamesCache, type CachedGame } from './games-cache';

// Maximum allowed odds drift in points (e.g., -110 to -120 = 10 point drift)
const MAX_ODDS_DRIFT = 15;

// For live games, be more strict
const MAX_ODDS_DRIFT_LIVE = 10;

export interface OddsValidationResult {
  valid: boolean;
  gameId: string;
  selection: string;
  expectedOdds: number;
  currentOdds: number | null;
  drift: number | null;
  reason?: string;
  currentGame?: CachedGame;
}

export interface BetSelectionInput {
  gameId: string;
  type: 'spread' | 'moneyline' | 'total';
  selection: string; // 'home', 'away', 'over', 'under'
  expectedOdds: number;
}

/**
 * Extract current odds for a specific selection from a game
 */
function extractOddsForSelection(
  game: CachedGame,
  type: 'spread' | 'moneyline' | 'total',
  selection: string
): number | null {
  const odds = game.odds;

  switch (type) {
    case 'moneyline':
      if (selection === 'home') return odds.moneyline.home;
      if (selection === 'away') return odds.moneyline.away;
      break;
    case 'spread':
      if (selection === 'home') return odds.spread.homeOdds;
      if (selection === 'away') return odds.spread.awayOdds;
      break;
    case 'total':
      if (selection === 'over') return odds.total.over;
      if (selection === 'under') return odds.total.under;
      break;
  }

  return null;
}

/**
 * Calculate the drift between expected and current odds
 */
function calculateOddsDrift(expected: number, current: number): number {
  return Math.abs(current - expected);
}

/**
 * Validate a single bet selection's odds
 */
export async function validateSelectionOdds(
  input: BetSelectionInput
): Promise<OddsValidationResult> {
  const { gameId, type, selection, expectedOdds } = input;

  // Fetch fresh game data from cache
  const game = await GamesCache.getGame(gameId);

  if (!game) {
    return {
      valid: false,
      gameId,
      selection,
      expectedOdds,
      currentOdds: null,
      drift: null,
      reason: 'Game not found or no longer available',
    };
  }

  // Check if game has already started/finished
  if (game.status === 'finished' || game.completed) {
    return {
      valid: false,
      gameId,
      selection,
      expectedOdds,
      currentOdds: null,
      drift: null,
      reason: 'Game has already ended',
      currentGame: game,
    };
  }

  // Get current odds for this selection
  const currentOdds = extractOddsForSelection(game, type, selection);

  if (currentOdds === null) {
    return {
      valid: false,
      gameId,
      selection,
      expectedOdds,
      currentOdds: null,
      drift: null,
      reason: 'Selection odds not available',
      currentGame: game,
    };
  }

  // Calculate drift
  const drift = calculateOddsDrift(expectedOdds, currentOdds);

  // Use stricter threshold for live games
  const maxDrift = game.status === 'live' ? MAX_ODDS_DRIFT_LIVE : MAX_ODDS_DRIFT;

  if (drift > maxDrift) {
    return {
      valid: false,
      gameId,
      selection,
      expectedOdds,
      currentOdds,
      drift,
      reason: `Odds have changed significantly (${expectedOdds} → ${currentOdds})`,
      currentGame: game,
    };
  }

  return {
    valid: true,
    gameId,
    selection,
    expectedOdds,
    currentOdds,
    drift,
    currentGame: game,
  };
}

/**
 * Validate multiple bet selections (for parlays)
 */
export async function validateBetOdds(
  selections: BetSelectionInput[]
): Promise<{
  valid: boolean;
  results: OddsValidationResult[];
  invalidCount: number;
}> {
  // Validate all selections in parallel
  const results = await Promise.all(
    selections.map(sel => validateSelectionOdds(sel))
  );

  const invalidCount = results.filter(r => !r.valid).length;

  return {
    valid: invalidCount === 0,
    results,
    invalidCount,
  };
}

/**
 * Get the current odds for a game (for display when odds changed)
 */
export async function getCurrentOddsForGame(gameId: string): Promise<CachedGame | null> {
  return GamesCache.getGame(gameId);
}

