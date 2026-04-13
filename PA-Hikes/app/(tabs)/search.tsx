/**
 * Search screen — Phase 3
 *
 * Full-text search across the species database.
 * Filter by iconic taxon group. Tap a result to open its SpeciesCard.
 */

import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { useSearchTaxa } from '@/hooks/use-species-db';
import type { SearchResult } from '@/services/species-db';

// ─── Group filter config ──────────────────────────────────────────────────────

type FilterGroup = { key: string | undefined; label: string; color: string };

const FILTER_GROUPS: FilterGroup[] = [
  { key: undefined,   label: 'All',     color: '#607d8b' },
  { key: 'Plantae',  label: 'Plants',  color: '#4caf50' },
  { key: 'Aves',     label: 'Birds',   color: '#2196f3' },
  { key: 'Fungi',    label: 'Fungi',   color: '#ff9800' },
  { key: 'Insecta',  label: 'Insects', color: '#9c27b0' },
  { key: 'Mammalia', label: 'Mammals', color: '#795548' },
];

const GROUP_COLORS: Record<string, string> = {
  Plantae:  '#4caf50',
  Aves:     '#2196f3',
  Fungi:    '#ff9800',
  Insecta:  '#9c27b0',
  Mammalia: '#795548',
  Reptilia: '#607d8b',
  Amphibia: '#00bcd4',
};

function getGroupColor(iconicTaxon: string | null): string {
  if (!iconicTaxon) return '#9e9e9e';
  return GROUP_COLORS[iconicTaxon] ?? '#9e9e9e';
}

// ─── Result row ───────────────────────────────────────────────────────────────

function ResultRow({ item }: { item: SearchResult }) {
  const dotColor = getGroupColor(item.iconic_taxon);
  return (
    <TouchableOpacity
      style={styles.resultRow}
      onPress={() => router.push({ pathname: '/species-card', params: { id: String(item.id) } })}
      activeOpacity={0.7}
    >
      {/* Color dot for group */}
      <View style={[styles.groupDot, { backgroundColor: dotColor }]} />

      <View style={styles.resultText}>
        <Text style={styles.commonName} numberOfLines={1}>
          {item.common_name ?? item.scientific_name}
        </Text>
        {item.common_name ? (
          <Text style={styles.scientificName} numberOfLines={1}>
            {item.scientific_name}
          </Text>
        ) : null}
      </View>

      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string | undefined>(undefined);

  const { results, loading } = useSearchTaxa(query, selectedGroup);

  return (
    <View style={styles.container}>
      {/* Search input */}
      <View style={styles.searchBar}>
        <TextInput
          style={styles.input}
          placeholder="Search species..."
          placeholderTextColor="#aaa"
          value={query}
          onChangeText={setQuery}
          clearButtonMode="while-editing"
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
        />
        {loading && <ActivityIndicator size="small" color="#0a7ea4" style={styles.spinner} />}
      </View>

      {/* Group filter pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContent}
      >
        {FILTER_GROUPS.map((group) => {
          const active = selectedGroup === group.key;
          return (
            <TouchableOpacity
              key={group.label}
              style={[
                styles.filterPill,
                active && { backgroundColor: group.color, borderColor: group.color },
              ]}
              onPress={() => setSelectedGroup(group.key)}
            >
              <Text style={[styles.filterPillText, active && styles.filterPillTextActive]}>
                {group.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Results */}
      <FlatList
        data={results}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <ResultRow item={item} />}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                {query.trim()
                  ? 'No species found for that search.'
                  : 'Start typing to search, or browse by group above.'}
              </Text>
            </View>
          ) : null
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 12,
    paddingHorizontal: 14,
    backgroundColor: '#f2f2f2',
    borderRadius: 10,
    height: 44,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#111',
  },
  spinner: {
    marginLeft: 8,
  },
  filterScroll: {
    maxHeight: 48,
    marginBottom: 4,
  },
  filterContent: {
    paddingHorizontal: 12,
    gap: 8,
    alignItems: 'center',
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  filterPillText: {
    fontSize: 13,
    color: '#555',
    fontWeight: '500',
  },
  filterPillTextActive: {
    color: '#fff',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  groupDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  resultText: {
    flex: 1,
  },
  commonName: {
    fontSize: 16,
    color: '#111',
    fontWeight: '500',
  },
  scientificName: {
    fontSize: 13,
    color: '#888',
    fontStyle: 'italic',
    marginTop: 1,
  },
  chevron: {
    fontSize: 20,
    color: '#ccc',
    marginLeft: 8,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#f0f0f0',
    marginLeft: 38,
  },
  empty: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#aaa',
    textAlign: 'center',
    lineHeight: 20,
  },
});
