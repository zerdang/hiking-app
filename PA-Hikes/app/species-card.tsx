/**
 * SpeciesCard screen
 *
 * Route params:
 *   id  - taxa.id (number, passed as string in URL)
 *
 * Navigated to from: SearchScreen, IdentifyResult (Phase 4)
 */

import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTaxon } from '@/hooks/use-species-db';
import { SeasonalChart } from '@/components/seasonal-chart';

// ─── Iconic taxon display config ─────────────────────────────────────────────

type GroupConfig = { label: string; color: string; bg: string };

const ICONIC_TAXON_CONFIG: Record<string, GroupConfig> = {
  Plantae:   { label: 'Plant',    color: '#fff', bg: '#4caf50' },
  Aves:      { label: 'Bird',     color: '#fff', bg: '#2196f3' },
  Fungi:     { label: 'Fungus',   color: '#fff', bg: '#ff9800' },
  Insecta:   { label: 'Insect',   color: '#fff', bg: '#9c27b0' },
  Mammalia:  { label: 'Mammal',   color: '#fff', bg: '#795548' },
  Reptilia:  { label: 'Reptile',  color: '#fff', bg: '#607d8b' },
  Amphibia:  { label: 'Amphibian',color: '#fff', bg: '#00bcd4' },
};

function getGroupConfig(iconicTaxon: string | null): GroupConfig {
  if (!iconicTaxon) return { label: 'Species', color: '#fff', bg: '#9e9e9e' };
  return ICONIC_TAXON_CONFIG[iconicTaxon] ?? { label: iconicTaxon, color: '#fff', bg: '#9e9e9e' };
}

// ─── Status badge helpers ─────────────────────────────────────────────────────

function NativeStatusBadge({ status }: { status: string | null }) {
  if (!status) return null;
  const configs: Record<string, { label: string; bg: string }> = {
    native:     { label: 'Native',     bg: '#e8f5e9' },
    introduced: { label: 'Introduced', bg: '#fff3e0' },
    invasive:   { label: 'Invasive',   bg: '#ffebee' },
  };
  const cfg = configs[status] ?? { label: status, bg: '#f5f5f5' };
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <Text style={styles.badgeText}>{cfg.label}</Text>
    </View>
  );
}

function ConservationBadge({ status }: { status: string | null }) {
  if (!status) return null;
  return (
    <View style={[styles.badge, { backgroundColor: '#fce4ec' }]}>
      <Text style={styles.badgeText}>PA: {status}</Text>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SpeciesCardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const taxonId = id ? parseInt(id, 10) : null;
  const { taxon, loading, error } = useTaxon(taxonId);

  if (!id) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>No species ID provided.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0a7ea4" />
      </View>
    );
  }

  if (error || !taxon) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error ?? 'Species not found.'}</Text>
      </View>
    );
  }

  const groupCfg = getGroupConfig(taxon.iconic_taxon);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Photo */}
      {taxon.photo_path ? (
        <Image source={{ uri: `file://${taxon.photo_path}` }} style={styles.photo} />
      ) : (
        <View style={[styles.photoPlaceholder, { backgroundColor: groupCfg.bg + '33' }]}>
          <Text style={[styles.photoPlaceholderText, { color: groupCfg.bg }]}>
            No photo
          </Text>
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.commonName}>{taxon.common_name ?? taxon.scientific_name}</Text>
        {taxon.common_name && (
          <Text style={styles.scientificName}>{taxon.scientific_name}</Text>
        )}

        {/* Badges row */}
        <View style={styles.badgesRow}>
          <View style={[styles.groupBadge, { backgroundColor: groupCfg.bg }]}>
            <Text style={[styles.groupBadgeText, { color: groupCfg.color }]}>
              {groupCfg.label}
            </Text>
          </View>
          <NativeStatusBadge status={taxon.native_status} />
          <ConservationBadge status={taxon.pa_conservation_status} />
        </View>
      </View>

      {/* Description */}
      {taxon.description ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.description}>{taxon.description}</Text>
        </View>
      ) : null}

      {/* Seasonal presence */}
      {taxon.seasonal_presence ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Seasonal Presence</Text>
          <SeasonalChart months={taxon.seasonal_presence} color={groupCfg.bg} />
        </View>
      ) : null}

      {/* Data row */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Details</Text>
        <DataRow label="Scientific name" value={taxon.scientific_name} />
        {taxon.common_name && (
          <DataRow label="Common name" value={taxon.common_name} />
        )}
        {taxon.iconic_taxon && (
          <DataRow label="Group" value={taxon.iconic_taxon} />
        )}
        {taxon.native_status && (
          <DataRow label="Native status" value={taxon.native_status} />
        )}
        {taxon.pa_conservation_status && (
          <DataRow label="PA conservation" value={taxon.pa_conservation_status} />
        )}
      </View>
    </ScrollView>
  );
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.dataRow}>
      <Text style={styles.dataLabel}>{label}</Text>
      <Text style={styles.dataValue}>{value}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorText: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
  },
  photo: {
    width: '100%',
    height: 240,
    resizeMode: 'cover',
    backgroundColor: '#f0f0f0',
  },
  photoPlaceholder: {
    width: '100%',
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPlaceholderText: {
    fontSize: 14,
    opacity: 0.6,
  },
  header: {
    padding: 20,
    paddingBottom: 12,
  },
  commonName: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#111',
    marginBottom: 4,
  },
  scientificName: {
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  groupBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  groupBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    color: '#444',
    fontWeight: '500',
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: '#333',
  },
  dataRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0f0f0',
  },
  dataLabel: {
    flex: 1,
    fontSize: 14,
    color: '#888',
  },
  dataValue: {
    flex: 2,
    fontSize: 14,
    color: '#333',
  },
});
