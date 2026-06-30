import { useEffect } from 'react';
import type { Hardware } from '@/lib/types';

// Ported 1:1 from the web app (use-stale-offline-detection.ts) so the mobile
// app marks robots offline at the same moment the web does. Without this the
// mobile keeps a bot "online" forever after a single online frame, while the
// web flips it offline ~2s after updates stop.
const DEFAULT_STALE_THRESHOLD_MS = 2 * 1000; // 2s — flip offline near-instantly
const CHECK_INTERVAL_MS = 500;

/**
 * Marks robots offline when their lastPing exceeds the stale threshold.
 * Skips the garage marker and robots already offline.
 */
export function useStaleOfflineDetection(
  setHardwares: React.Dispatch<React.SetStateAction<Hardware[]>>,
  thresholdMs: number = DEFAULT_STALE_THRESHOLD_MS,
) {
  useEffect(() => {
    const intervalId = setInterval(() => {
      const now = Date.now();
      setHardwares((prev) => {
        let changed = false;
        const updated = prev.map((hw) => {
          if (hw.id === 'garage-home') return hw;
          if (hw.status === 'offline' && hw.online === false) return hw;

          const lastPingTime =
            hw.lastPing instanceof Date ? hw.lastPing.getTime() : new Date(hw.lastPing).getTime();

          if (now - lastPingTime > thresholdMs) {
            changed = true;
            return { ...hw, status: 'offline' as const, online: false };
          }
          return hw;
        });
        return changed ? updated : prev;
      });
    }, CHECK_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [setHardwares, thresholdMs]);
}
