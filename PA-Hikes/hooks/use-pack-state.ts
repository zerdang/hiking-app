/**
 * use-pack-state.ts
 *
 * Persists two values to AsyncStorage:
 *   @pack_state   — 'needs_download' | 'downloading' | 'ready'
 *   @pack_version — e.g. 'v1', 'v2', or null (not yet downloaded)
 *
 * The download state machine drives the onboarding gate.
 * The version is used by the Settings screen to show the installed pack version
 * and to decide whether a newer pack is available.
 */

import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type PackState = 'needs_download' | 'downloading' | 'ready';

const PACK_STATE_KEY = '@pack_state';
const PACK_VERSION_KEY = '@pack_version';

export function usePackState() {
  const [packState, setPackStateLocal] = useState<PackState | null>(null);
  const [packVersion, setPackVersionLocal] = useState<string | null>(null);

  // Load both values from storage on mount
  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(PACK_STATE_KEY),
      AsyncStorage.getItem(PACK_VERSION_KEY),
    ]).then(([state, version]) => {
      setPackStateLocal((state as PackState) ?? 'needs_download');
      setPackVersionLocal(version);
    });
  }, []);

  const setPackState = async (state: PackState) => {
    await AsyncStorage.setItem(PACK_STATE_KEY, state);
    setPackStateLocal(state);
  };

  /**
   * Call this once the region pack is fully downloaded and extracted.
   * Saves the version string (e.g. 'v1') and transitions state to 'ready'.
   */
  const markPackReady = async (version: string) => {
    await AsyncStorage.multiSet([
      [PACK_STATE_KEY, 'ready'],
      [PACK_VERSION_KEY, version],
    ]);
    setPackStateLocal('ready');
    setPackVersionLocal(version);
  };

  const resetPackState = async () => {
    await AsyncStorage.multiRemove([PACK_STATE_KEY, PACK_VERSION_KEY]);
    setPackStateLocal('needs_download');
    setPackVersionLocal(null);
  };

  return { packState, packVersion, setPackState, markPackReady, resetPackState };
}
