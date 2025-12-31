'use client';

import { useOddsPolling } from '@/hooks/useOddsPolling';
import { use } from 'react';

export default function GamePage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const { odds, loading, error } = useOddsPolling(gameId, 2000);

  if (loading) return <div>Loading odds...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="space-y-4">
      <h1>Live Odds</h1>

      <div className="grid grid-cols-2 gap-4">
        {Object.entries(odds).map(([selectionId, data]) => (
          <div
            key={selectionId}
            className="border p-4 rounded-lg"
          >
            <div className="flex justify-between items-center">
              <span className="font-semibold">{data.odds.toFixed(2)}</span>

              {data.movement && data.movement !== 'stable' && (
                <span
                  className={`text-sm ${data.movement === 'up' ? 'text-green-500' : 'text-red-500'
                    }`}
                >
                  {data.movement === 'up' ? '↑' : '↓'}
                  {data.previousOdds &&
                    ` ${Math.abs(data.odds - data.previousOdds).toFixed(2)}`
                  }
                </span>
              )}
            </div>
            {data.lastUpdated && (
              <div className="text-xs text-gray-500 mt-1">
                Updated: {new Date(data.lastUpdated).toLocaleTimeString()}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
