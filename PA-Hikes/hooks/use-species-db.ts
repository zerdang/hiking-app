/**
 * use-species-db.ts
 *
 * React hooks that wrap the species-db service with debouncing and state management.
 */

import { useState, useEffect, useRef } from 'react';
import { getTaxon, searchTaxa, type Taxon, type SearchResult } from '@/services/species-db';

// ─── useSearchTaxa ────────────────────────────────────────────────────────────

type UseSearchTaxaResult = {
  results: SearchResult[];
  loading: boolean;
};

/**
 * Debounced species search hook.
 * @param query  - search string from the text input
 * @param group  - optional iconic taxon filter ('Plantae', 'Aves', etc.)
 * @param delay  - debounce delay in ms (default 300)
 */
export function useSearchTaxa(
  query: string,
  group?: string,
  delay = 300
): UseSearchTaxaResult {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    setLoading(true);

    timerRef.current = setTimeout(async () => {
      try {
        const rows = await searchTaxa(query, group);
        setResults(rows);
      } catch (err) {
        console.error('[useSearchTaxa]', err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, delay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, group, delay]);

  return { results, loading };
}

// ─── useTaxon ─────────────────────────────────────────────────────────────────

type UseTaxonResult = {
  taxon: Taxon | null;
  loading: boolean;
  error: string | null;
};

/**
 * Fetch a single taxon by id.
 */
export function useTaxon(id: number | null): UseTaxonResult {
  const [taxon, setTaxon] = useState<Taxon | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id === null) {
      setTaxon(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    getTaxon(id)
      .then((result) => {
        if (!cancelled) setTaxon(result);
      })
      .catch((err) => {
        if (!cancelled) setError(String(err?.message ?? err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  return { taxon, loading, error };
}
