// src/lib/odds/sync-service.ts
import { Decimal } from '../../generated/prisma/client';
import { OddsCache } from '../upstash/redis';
import { OddsPubSub } from '../upstash/qstash';
import { prisma } from '../db/prisma';

export interface OddsUpdate {
  selectionId: string;
  gameId: string;
  marketId: string;
  oldOdds: number;
  newOdds: number;
  movement: 'up' | 'down' | 'stable';
}

export class OddsSyncService {
  // Sync odds for a specific game
  static async syncGameOdds(gameId: string, isLive: boolean = false) {
    try {
      console.log(`Syncing odds for game ${gameId} (${isLive ? 'LIVE' : 'PRE-LIVE'})`);

      // 1. Fetch game with markets and selections
      const game = await prisma.game.findUnique({
        where: { id: gameId },
        include: {
          markets: {
            where: { active: true },
            include: {
              selections: {
                where: { status: 'active' },
                include: { currentOdds: true },
              },
            },
          },
          sport: true,
          league: true,
        },
      });

      if (!game) {
        console.error(`Game ${gameId} not found`);
        return;
      }

      // 2. Fetch fresh odds from provider
      const freshOdds = await this.fetchOddsFromProvider(game);

      if (!freshOdds || freshOdds.length === 0) {
        console.log(`No odds data available for game ${gameId}`);
        return;
      }

      // 3. Compare and detect changes
      const updates: OddsUpdate[] = [];
      const cacheData: any[] = [];

      for (const market of game.markets) {
        for (const selection of market.selections) {
          const freshOdd = freshOdds.find(
            (o: any) => o.selectionId === selection.id
          );

          if (!freshOdd) continue;

          const oldOdds = selection.currentOdds?.currentOdds.toNumber() || selection.odds.toNumber();
          const newOdds = freshOdd.odds;

          // Detect significant change (> 1 cent)
          if (Math.abs(newOdds - oldOdds) > 0.01) {
            updates.push({
              selectionId: selection.id,
              gameId: game.id,
              marketId: market.id,
              oldOdds,
              newOdds,
              movement: newOdds > oldOdds ? 'up' : newOdds < oldOdds ? 'down' : 'stable',
            });
          }

          cacheData.push({
            selectionId: selection.id,
            gameId: game.id,
            marketId: market.id,
            odds: newOdds,
            previousOdds: oldOdds,
            movement: newOdds > oldOdds ? 'up' : newOdds < oldOdds ? 'down' : 'stable',
            timestamp: Date.now(),
          });
        }
      }

      // 4. Update database if there are changes
      if (updates.length > 0) {
        await this.updateOddsInDatabase(updates, isLive);
        console.log(`Updated ${updates.length} odds for game ${gameId}`);

        // 5. Publish changes via QStash
        for (const update of updates) {
          await OddsPubSub.publishOddsChange({
            gameId: update.gameId,
            selectionId: update.selectionId,
            oldOdds: update.oldOdds,
            newOdds: update.newOdds,
            timestamp: Date.now(),
          });
        }
      }

      // 6. Update Redis cache
      await OddsCache.cacheGameOdds(gameId, cacheData);

      // 7. Update sync status
      await prisma.oddsSyncStatus.upsert({
        where: { gameId },
        create: {
          gameId,
          lastSyncAt: new Date(),
          syncStatus: 'active',
          failureCount: 0,
        },
        update: {
          lastSyncAt: new Date(),
          failureCount: 0,
          lastError: null,
        },
      });

      // 8. Schedule next sync if live
      if (isLive && game.status === 'live') {
        await OddsPubSub.scheduleOddsSync(gameId, 2); // Schedule next sync in 2 seconds
      }

      return { success: true, updatesCount: updates.length };

    } catch (error) {
      console.error(`Error syncing odds for game ${gameId}:`, error);

      // Update sync status with error
      await prisma.oddsSyncStatus.upsert({
        where: { gameId },
        create: {
          gameId,
          syncStatus: 'failed',
          lastError: error instanceof Error ? error.message : 'Unknown error',
          failureCount: 1,
        },
        update: {
          failureCount: { increment: 1 },
          lastError: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      throw error;
    }
  }

  // Fetch odds from external provider
  private static async fetchOddsFromProvider(game: any) {
    // Mock implementation - replace with actual API call
    // Example using The Odds API or similar

    try {
      const response = await fetch(
        `https://api.the-odds-api.com/v4/sports/${game.sport.code}/odds?apiKey=${process.env.ODDS_API_KEY}&regions=us&markets=h2h,spreads,totals`,
        { next: { revalidate: 0 } }
      );

      if (!response.ok) {
        throw new Error(`Odds API error: ${response.statusText}`);
      }

      const data = await response.json();

      // Transform API response to match your selections
      // This is simplified - you'll need proper mapping logic
      return game.markets.flatMap((market: any) =>
        market.selections.map((selection: any) => ({
          selectionId: selection.id,
          odds: this.getOddsForSelection(data, selection),
        }))
      );

    } catch (error) {
      console.error('Failed to fetch odds from provider:', error);
      return [];
    }
  }

  private static getOddsForSelection(apiData: any, selection: any): number {
    // Implement your mapping logic here
    // This is a placeholder
    return Math.random() * 3 + 1.5; // Random odds between 1.5 and 4.5
  }

  // Update odds in database
  private static async updateOddsInDatabase(updates: OddsUpdate[], isLive: boolean) {
    await prisma.$transaction(async (tx) => {
      for (const update of updates) {
        // Update current odds
        await tx.currentOdds.upsert({
          where: { selectionId: update.selectionId },
          create: {
            selectionId: update.selectionId,
            currentOdds: new Decimal(update.newOdds),
            previousOdds: new Decimal(update.oldOdds),
            oddsMovement: update.movement,
            lastUpdatedAt: new Date(),
            syncedAt: new Date(),
          },
          update: {
            previousOdds: new Decimal(update.oldOdds),
            currentOdds: new Decimal(update.newOdds),
            oddsMovement: update.movement,
            lastUpdatedAt: new Date(),
            syncedAt: new Date(),
          },
        });

        // Create snapshot for significant changes or all live updates
        const changePercent = Math.abs((update.newOdds - update.oldOdds) / update.oldOdds * 100);
        if (isLive || changePercent > 5) {
          await tx.oddsSnapshot.create({
            data: {
              selectionId: update.selectionId,
              odds: new Decimal(update.newOdds),
              timestamp: new Date(),
              source: 'api',
            },
          });
        }

        // Create change event
        await tx.oddsChangeEvent.create({
          data: {
            selectionId: update.selectionId,
            gameId: update.gameId,
            oldOdds: new Decimal(update.oldOdds),
            newOdds: new Decimal(update.newOdds),
            changePercentage: new Decimal(changePercent),
            changeType: changePercent > 5 ? 'significant' : 'minor',
            broadcasted: false,
          },
        });
      }
    });
  }

  // Batch sync for multiple games
  static async syncMultipleGames(gameIds: string[], isLive: boolean = false) {
    const results = await Promise.allSettled(
      gameIds.map(gameId => this.syncGameOdds(gameId, isLive))
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return { successful, failed, total: gameIds.length };
  }
}