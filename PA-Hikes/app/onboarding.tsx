import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import { useState, useEffect, useRef } from 'react';
import { usePackState } from '@/hooks/use-pack-state';

// Version string that will be stored once the pack is downloaded.
// Bump this when a new pack is released so Settings can detect updates.
const PACK_VERSION = 'v1';

const MIN_FREE_BYTES = 500 * 1024 * 1024; // 500 MB

// Placeholder: a ~10 MB public file so you can see the progress bar working.
// Replace with the real region pack URL before shipping.
const PACK_URL = 'https://speed.hetzner.de/10MB.bin';
const PACK_DEST = FileSystem.documentDirectory + 'centre_county_v1.pack';

export default function OnboardingScreen() {
  const { packState, setPackState, markPackReady } = usePackState();
  const [progress, setProgress] = useState(0);
  const downloadRef = useRef<FileSystem.DownloadResumable | null>(null);

  // If we were mid-download when the app was killed, resume automatically.
  useEffect(() => {
    if (packState === 'downloading') {
      startDownload();
    }
    return () => {
      downloadRef.current?.pauseAsync();
    };
  }, [packState]);

  const startDownload = () => {
    const dl = FileSystem.createDownloadResumable(
      PACK_URL,
      PACK_DEST,
      {},
      ({ totalBytesWritten, totalBytesExpectedToWrite }) => {
        if (totalBytesExpectedToWrite > 0) {
          setProgress(totalBytesWritten / totalBytesExpectedToWrite);
        }
      }
    );
    downloadRef.current = dl;
    dl.downloadAsync()
      .then(async () => {
        // TODO (Phase 2 extraction): unzip PACK_DEST to documentDirectory,
        // then copy species.db to documentDirectory + 'SQLite/species.db'.
        await markPackReady(PACK_VERSION);
        router.replace('/(tabs)/identify');
      })
      .catch((err) => {
        console.error('Download error:', err);
        setPackState('needs_download');
        Alert.alert('Download failed', String(err?.message ?? err));
      });
  };

  const handleDownload = async () => {
    const free = await FileSystem.getFreeDiskStorageAsync();
    if (free < MIN_FREE_BYTES) {
      const freeMB = Math.round(free / 1024 / 1024);
      Alert.alert(
        'Low Storage',
        `Your device has ${freeMB} MB free. The region pack needs ~300 MB and we recommend at least 500 MB free. You may run out of space.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Download Anyway',
            onPress: () => setPackState('downloading'),
          },
        ]
      );
      return;
    }
    await setPackState('downloading');
  };

  const handleDebugSkip = async () => {
    await setPackState('ready');
    router.replace('/(tabs)/identify');
  };

  const percent = Math.round(progress * 100);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>PA Hikes</Text>
      <Text style={styles.subtitle}>Centre County Trail Companion</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Centre County Region Pack</Text>
        <Text style={styles.cardBody}>
          Includes species database, offline maps, and ML identification models
          for Rothrock &amp; Bald Eagle State Forests.
        </Text>
        <Text style={styles.size}>~300 MB · One-time download · Requires Wi-Fi</Text>
      </View>

      {packState === 'downloading' ? (
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${percent}%` }]} />
          </View>
          <Text style={styles.progressLabel}>{percent}%</Text>
        </View>
      ) : (
        <TouchableOpacity style={styles.button} onPress={handleDownload}>
          <Text style={styles.buttonText}>Download Region Pack</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.debugButton} onPress={handleDebugSkip}>
        <Text style={styles.debugText}>[DEBUG] Skip download → go to app</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
  },
  card: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    marginBottom: 32,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  cardBody: {
    fontSize: 14,
    color: '#444',
    lineHeight: 20,
    marginBottom: 8,
  },
  size: {
    fontSize: 13,
    color: '#888',
  },
  button: {
    backgroundColor: '#0a7ea4',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
    gap: 8,
  },
  progressTrack: {
    width: '100%',
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#0a7ea4',
    borderRadius: 4,
  },
  progressLabel: {
    fontSize: 14,
    color: '#666',
  },
  debugButton: {
    marginTop: 32,
  },
  debugText: {
    color: '#bbb',
    fontSize: 13,
  },
});
