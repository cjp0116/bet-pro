import { useEffect, useState, useCallback, useRef } from 'react';

interface OddsData {
  selectionId: string;
  odds: number;
  previousOdds?: number;
  movement?: 'up' | 'down' | 'stable';
  lastUpdated?: string;
}

export function useOddsPolling(gameId: string, interval: number = 2000) {
  const [odds, setOdds] = useState<Record<string, OddsData>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastTimestampRef = useRef<number>(0);

  const fetchOdds = useCallback(async () => {
    try {
      // Fetch initial odds if first load
      if (lastTimestampRef.current === 0) {
        const response = await fetch(`/api/odds/${gameId}`);
        const data = await response.json();

        if (data.odds) {
          const oddsMap: Record<string, OddsData> = {};
          data.odds.forEach((odd: OddsData) => {
            oddsMap[odd.selectionId] = odd;
          });
          setOdds(oddsMap);
        }

        lastTimestampRef.current = Date.now();
        setLoading(false);
      }

      // Poll for events since last check
      const eventsResponse = await fetch(
        `/api/odds/events/${gameId}?since=${lastTimestampRef.current}`
      );
      const eventsData = await eventsResponse.json();

      if (eventsData.events && eventsData.events.length > 0) {
        setOdds(prev => {
          const updated = { ...prev };
          eventsData.events.forEach((event: any) => {
            if (updated[event.selectionId]) {
              updated[event.selectionId] = {
                ...updated[event.selectionId],
                odds: event.newOdds,
                previousOdds: event.oldOdds,
                movement: event.newOdds > event.oldOdds ? 'up' : 'down',
                lastUpdated: new Date(event.timestamp).toISOString(),
              };
            }
          });
          return updated;
        });

        lastTimestampRef.current = eventsData.timestamp;
      }

      setError(null);

    } catch (err) {
      console.error('Error fetching odds:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [gameId]);

  useEffect(() => {
    fetchOdds();

    const intervalId = setInterval(fetchOdds, interval);

    return () => clearInterval(intervalId);
  }, [fetchOdds, interval]);

  return { odds, loading, error };
}