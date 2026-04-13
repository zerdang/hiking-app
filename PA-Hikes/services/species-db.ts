/**
 * species-db.ts
 *
 * Singleton wrapper around expo-sqlite for the species.db region pack database.
 *
 * Path: the DB lives at documentDirectory/SQLite/species.db.
 * When the region pack is extracted in onboarding, it must copy species.db to
 * that location before the app calls getDB().
 *
 * In __DEV__ mode a small seed database is created automatically so the
 * Search and SpeciesCard screens are testable without the real pack.
 */

import * as SQLite from 'expo-sqlite';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Taxon = {
  id: number;
  scientific_name: string;
  common_name: string | null;
  iconic_taxon: string | null;     // 'Plantae' | 'Aves' | 'Fungi' | 'Insecta' | 'Mammalia' | 'Reptilia' | …
  description: string | null;
  native_status: string | null;    // 'native' | 'introduced' | 'invasive'
  pa_conservation_status: string | null;
  seasonal_presence: number[] | null; // 12 monthly scores [0.0–1.0], parsed from JSON
  photo_path: string | null;
};

// Raw DB row — seasonal_presence stored as JSON string
type TaxonRow = Omit<Taxon, 'seasonal_presence'> & { seasonal_presence: string | null };

export type SearchResult = Pick<Taxon, 'id' | 'scientific_name' | 'common_name' | 'iconic_taxon' | 'photo_path'>;

// ─── Singleton ────────────────────────────────────────────────────────────────

let _db: SQLite.SQLiteDatabase | null = null;
let _initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDB(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    const db = await SQLite.openDatabaseAsync('species.db');

    // Check whether the taxa table exists yet
    const meta = await db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) AS count FROM sqlite_master WHERE type='table' AND name='taxa'"
    );

    if (!meta || meta.count === 0) {
      if (__DEV__) {
        await _seedDevDB(db);
      }
      // In production the table should already exist (populated by data pipeline).
      // If it doesn't, we still return the DB handle — queries will return empty arrays.
    }

    _db = db;
    return db;
  })();

  return _initPromise;
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export async function getTaxon(id: number): Promise<Taxon | null> {
  const db = await getDB();
  const row = await db.getFirstAsync<TaxonRow>('SELECT * FROM taxa WHERE id = ?', [id]);
  if (!row) return null;
  return parseTaxonRow(row);
}

/**
 * Search taxa by common name or scientific name using LIKE.
 * Optionally filter by iconic taxon group.
 * Returns up to 50 results — well within the 500ms target for a ~500-taxa DB.
 */
export async function searchTaxa(
  query: string,
  iconicTaxon?: string
): Promise<SearchResult[]> {
  const db = await getDB();
  const trimmed = query.trim();

  if (!trimmed) {
    if (iconicTaxon) {
      return db.getAllAsync<SearchResult>(
        `SELECT id, scientific_name, common_name, iconic_taxon, photo_path
           FROM taxa
          WHERE iconic_taxon = ?
          ORDER BY common_name
          LIMIT 50`,
        [iconicTaxon]
      );
    }
    return db.getAllAsync<SearchResult>(
      `SELECT id, scientific_name, common_name, iconic_taxon, photo_path
         FROM taxa
         ORDER BY common_name
         LIMIT 50`
    );
  }

  const pattern = `%${trimmed}%`;
  if (iconicTaxon) {
    return db.getAllAsync<SearchResult>(
      `SELECT id, scientific_name, common_name, iconic_taxon, photo_path
         FROM taxa
        WHERE (common_name LIKE ? OR scientific_name LIKE ?)
          AND iconic_taxon = ?
        ORDER BY
          CASE WHEN common_name LIKE ? THEN 0 ELSE 1 END,
          common_name
        LIMIT 50`,
      [pattern, pattern, iconicTaxon, `${trimmed}%`]
    );
  }

  return db.getAllAsync<SearchResult>(
    `SELECT id, scientific_name, common_name, iconic_taxon, photo_path
       FROM taxa
      WHERE common_name LIKE ? OR scientific_name LIKE ?
      ORDER BY
        CASE WHEN common_name LIKE ? THEN 0 ELSE 1 END,
        common_name
      LIMIT 50`,
    [pattern, pattern, `${trimmed}%`]
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseTaxonRow(row: TaxonRow): Taxon {
  let seasonal_presence: number[] | null = null;
  if (row.seasonal_presence) {
    try {
      const parsed = JSON.parse(row.seasonal_presence);
      if (Array.isArray(parsed) && parsed.length === 12) {
        seasonal_presence = parsed;
      }
    } catch {
      // malformed JSON — leave null
    }
  }
  return { ...row, seasonal_presence };
}

// ─── Dev seed ────────────────────────────────────────────────────────────────
// Only used in __DEV__. Inserts a handful of Centre County taxa so every screen
// is testable without the real region pack.

async function _seedDevDB(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS taxa (
      id INTEGER PRIMARY KEY,
      scientific_name TEXT NOT NULL,
      common_name TEXT,
      iconic_taxon TEXT,
      description TEXT,
      native_status TEXT,
      pa_conservation_status TEXT,
      seasonal_presence TEXT,
      photo_path TEXT
    );

    CREATE TABLE IF NOT EXISTS observations (
      id INTEGER PRIMARY KEY,
      taxon_id INTEGER REFERENCES taxa(id),
      lat REAL,
      lng REAL,
      observed_on TEXT,
      quality_grade TEXT
    );

    CREATE TABLE IF NOT EXISTS user_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      taxon_id INTEGER REFERENCES taxa(id),
      taxon_name_raw TEXT,
      lat REAL,
      lng REAL,
      observed_at TEXT,
      photo_path TEXT,
      notes TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_taxa_iconic ON taxa(iconic_taxon);
    CREATE INDEX IF NOT EXISTS idx_observations_taxon ON observations(taxon_id);
  `);

  const seed: Omit<TaxonRow, 'id'>[] = [
    {
      scientific_name: 'Acer rubrum',
      common_name: 'Red Maple',
      iconic_taxon: 'Plantae',
      description: 'One of the most abundant and widespread trees in eastern North America. Recognized by its brilliant red fall foliage and small red flowers in early spring.',
      native_status: 'native',
      pa_conservation_status: null,
      seasonal_presence: JSON.stringify([0.1, 0.2, 0.5, 0.7, 0.9, 1.0, 1.0, 0.9, 0.8, 0.9, 0.5, 0.2]),
      photo_path: null,
    },
    {
      scientific_name: 'Quercus rubra',
      common_name: 'Northern Red Oak',
      iconic_taxon: 'Plantae',
      description: 'A large deciduous oak native to eastern North America. Important mast tree for wildlife; acorns ripen in the second year. State tree of New Jersey.',
      native_status: 'native',
      pa_conservation_status: null,
      seasonal_presence: JSON.stringify([0.0, 0.0, 0.3, 0.6, 1.0, 1.0, 1.0, 1.0, 0.9, 0.8, 0.4, 0.1]),
      photo_path: null,
    },
    {
      scientific_name: 'Turdus migratorius',
      common_name: 'American Robin',
      iconic_taxon: 'Aves',
      description: 'A migratory songbird of the thrush family. Common in lawns, forests, and parks. Males have a distinctive orange-red breast; females are paler.',
      native_status: 'native',
      pa_conservation_status: null,
      seasonal_presence: JSON.stringify([0.2, 0.2, 0.6, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.8, 0.5, 0.3]),
      photo_path: null,
    },
    {
      scientific_name: 'Pleurotus ostreatus',
      common_name: 'Oyster Mushroom',
      iconic_taxon: 'Fungi',
      description: 'A common edible mushroom that grows in clusters on dead or dying hardwood trees. Fan-shaped, pale grey to brown caps. Widely cultivated worldwide.',
      native_status: 'native',
      pa_conservation_status: null,
      seasonal_presence: JSON.stringify([0.0, 0.0, 0.1, 0.3, 0.5, 0.4, 0.3, 0.4, 0.8, 1.0, 0.9, 0.3]),
      photo_path: null,
    },
    {
      scientific_name: 'Danaus plexippus',
      common_name: 'Monarch Butterfly',
      iconic_taxon: 'Insecta',
      description: 'Famous for its spectacular annual migration of up to 3,000 miles. Bright orange wings with black borders and white spots. Larvae feed exclusively on milkweed.',
      native_status: 'native',
      pa_conservation_status: 'Candidate',
      seasonal_presence: JSON.stringify([0.0, 0.0, 0.0, 0.0, 0.3, 0.8, 1.0, 1.0, 0.9, 0.5, 0.0, 0.0]),
      photo_path: null,
    },
    {
      scientific_name: 'Odocoileus virginianus',
      common_name: 'White-tailed Deer',
      iconic_taxon: 'Mammalia',
      description: 'The most widely distributed wild ungulate in the Americas. Reddish-brown in summer, grey-brown in winter. Named for the white underside of its tail, displayed when alarmed.',
      native_status: 'native',
      pa_conservation_status: null,
      seasonal_presence: JSON.stringify([1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0]),
      photo_path: null,
    },
    {
      scientific_name: 'Alliaria petiolata',
      common_name: 'Garlic Mustard',
      iconic_taxon: 'Plantae',
      description: 'An aggressive invasive herb from Europe. Produces garlic-like odor when crushed. Forms dense monocultures in forest understories, displacing native wildflowers.',
      native_status: 'invasive',
      pa_conservation_status: null,
      seasonal_presence: JSON.stringify([0.0, 0.0, 0.5, 1.0, 1.0, 0.8, 0.3, 0.1, 0.0, 0.0, 0.0, 0.0]),
      photo_path: null,
    },
    {
      scientific_name: 'Pileated Woodpecker',
      common_name: 'Dryocopus pileatus',
      iconic_taxon: 'Aves',
      description: 'The largest woodpecker in North America. Striking black body with red crest and white stripes. Excavates large, rectangular cavities in dead trees while foraging for carpenter ants.',
      native_status: 'native',
      pa_conservation_status: null,
      seasonal_presence: JSON.stringify([1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0]),
      photo_path: null,
    },
  ];

  for (const t of seed) {
    await db.runAsync(
      `INSERT OR IGNORE INTO taxa
         (scientific_name, common_name, iconic_taxon, description,
          native_status, pa_conservation_status, seasonal_presence, photo_path)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        t.scientific_name, t.common_name, t.iconic_taxon, t.description,
        t.native_status, t.pa_conservation_status, t.seasonal_presence, t.photo_path,
      ]
    );
  }
}
