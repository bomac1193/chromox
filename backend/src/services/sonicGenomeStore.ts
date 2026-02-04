import fs from 'fs';
import path from 'path';
import {
  SonicGenome,
  SonicArchetype,
  SonicArchetypeDesignation,
  SonicSignalType,
  SonicSignal
} from '../types';

const dataDir = path.join(process.cwd(), 'storage');
const genomeFile = path.join(dataDir, 'sonic_genome.json');

fs.mkdirSync(dataDir, { recursive: true });

// ── 12 Sonic Archetypes ────────────────────────────────────────────

const SONIC_ARCHETYPES: Record<SonicArchetypeDesignation, SonicArchetype> = {
  'S-0': {
    designation: 'S-0', glyph: 'FREQ', title: 'The Frequency Pioneer',
    essence: 'Sets sonic benchmarks others unknowingly follow',
    creativeMode: 'Visionary', shadow: 'Paralysis by perfection', color: '#FFD700'
  },
  'T-1': {
    designation: 'T-1', glyph: 'MIX', title: 'The Mix Architect',
    essence: 'Sees production logic and reverse-engineers excellence',
    creativeMode: 'Architectural', shadow: 'Over-engineering the mix', color: '#4169E1'
  },
  'V-2': {
    designation: 'V-2', glyph: 'ECHO', title: 'The Early Listener',
    essence: 'Found the sound before anyone else. Temporal hearing.',
    creativeMode: 'Prophetic', shadow: 'Right too soon', color: '#9370DB'
  },
  'L-3': {
    designation: 'L-3', glyph: 'LOOP', title: 'The Patient Cultivator',
    essence: 'Long-term investment in sonic potential across iterations',
    creativeMode: 'Developmental', shadow: 'Patience becomes stagnation', color: '#2E8B57'
  },
  'C-4': {
    designation: 'C-4', glyph: 'TRIM', title: 'The Essential Editor',
    essence: 'Knows what shouldn\'t exist. Subtractive mastery.',
    creativeMode: 'Editorial', shadow: 'Nihilistic rejection', color: '#DC143C'
  },
  'N-5': {
    designation: 'N-5', glyph: 'BLEND', title: 'The Border Illuminator',
    essence: 'Bridges genres and textures that shouldn\'t work but do',
    creativeMode: 'Integrative', shadow: 'Rootlessness', color: '#FF8C00'
  },
  'H-6': {
    designation: 'H-6', glyph: 'AMP', title: 'The Relentless Advocate',
    essence: 'Champions voices and sounds others overlook',
    creativeMode: 'Advocacy', shadow: 'Losing self in championing others', color: '#FF1493'
  },
  'P-7': {
    designation: 'P-7', glyph: 'VAULT', title: 'The Living Archive',
    essence: 'Curates, preserves, and contextualizes sonic moments',
    creativeMode: 'Archival', shadow: 'Hoarding without creation', color: '#8B4513'
  },
  'D-8': {
    designation: 'D-8', glyph: 'WIRE', title: 'The Hollow Channel',
    essence: 'Receives signals. Translates vibrations into form.',
    creativeMode: 'Channelling', shadow: 'Emptiness without input', color: '#708090'
  },
  'F-9': {
    designation: 'F-9', glyph: 'ANVIL', title: 'The Manifestor',
    essence: 'Ships. Renders. Creates tangible sonic artifacts.',
    creativeMode: 'Manifestation', shadow: 'Output without intention', color: '#B22222'
  },
  'R-10': {
    designation: 'R-10', glyph: 'RIFT', title: 'The Productive Fracture',
    essence: 'Disagrees productively. Finds signal in noise.',
    creativeMode: 'Contrarian', shadow: 'Contrarianism as identity', color: '#00CED1'
  },
  'NULL': {
    designation: 'NULL', glyph: 'VOID', title: 'The Receptive Presence',
    essence: 'Open, unclassified. Pure potential.',
    creativeMode: 'Receptive', shadow: 'Permanent indecision', color: '#A0A0A0'
  }
};

// ── Signal → Archetype mapping ─────────────────────────────────────

const SIGNAL_ARCHETYPE_MAP: Record<string, Record<string, number>> = {
  render:         { 'F-9': 0.4, 'H-6': 0.2 },
  like:           { 'H-6': 0.4, 'D-8': 0.2 },
  dislike:        { 'C-4': 0.3 },
  save_to_folio:  { 'P-7': 0.3, 'L-3': 0.2 },
  adjust_effects: { 'C-4': 0.3, 'T-1': 0.2 },
  use_guide:      { 'D-8': 0.3, 'L-3': 0.2 },
  mint:           { 'S-0': 0.4, 'F-9': 0.2 },
  replay:         { 'L-3': 0.3, 'D-8': 0.2 },
  preview:        { 'V-2': 0.3, 'T-1': 0.2 },
  rate:           { 'C-4': 0.2, 'H-6': 0.2 },
  preference:     { 'S-0': 0.2, 'T-1': 0.2 }
};

// ── Signal weights ─────────────────────────────────────────────────

const SIGNAL_WEIGHTS: Record<string, number> = {
  render: 1.0,
  like: 1.0,
  dislike: 0.8,
  save_to_folio: 0.7,
  adjust_effects: 0.5,
  use_guide: 0.6,
  mint: 1.2,
  replay: 0.5,
  preview: 0.3,
  rate: 0.8,
  preference: 1.0
};

// ── XP rewards ─────────────────────────────────────────────────────

const XP_REWARDS: Record<string, number> = {
  render: 20,
  like: 10,
  dislike: 8,
  mint: 15,
  save_to_folio: 12,
  replay: 5,
  preview: 3,
  adjust_effects: 5,
  use_guide: 8,
  preference: 10,
  streak_day: 10,
  rate: 5
};

// ── Tiers ──────────────────────────────────────────────────────────

const TIERS = [
  { name: 'Nascent', minXP: 0 },
  { name: 'Forming', minXP: 100 },
  { name: 'Defined', minXP: 300 },
  { name: 'Refined', minXP: 600 },
  { name: 'Intuitive', minXP: 1000 },
  { name: 'Attuned', minXP: 2000 }
];

// ── Achievements ───────────────────────────────────────────────────

const ACHIEVEMENT_DEFS = [
  { id: 'first-render', label: 'First Render', check: (g: SonicGenome) => g.gamification.totalRenders >= 1 },
  { id: 'ten-renders', label: 'Ten Renders', check: (g: SonicGenome) => g.gamification.totalRenders >= 10 },
  { id: 'fifty-renders', label: 'Fifty Renders', check: (g: SonicGenome) => g.gamification.totalRenders >= 50 },
  { id: 'first-like', label: 'First Like', check: (g: SonicGenome) => g.gamification.totalLikes >= 1 },
  { id: 'first-mint', label: 'First Mint', check: (g: SonicGenome) => g.gamification.totalMints >= 1 },
  { id: 'streak-3', label: '3-Day Streak', check: (g: SonicGenome) => g.gamification.longestStreak >= 3 },
  { id: 'streak-7', label: '7-Day Streak', check: (g: SonicGenome) => g.gamification.longestStreak >= 7 },
  { id: 'effect-explorer', label: 'Effect Explorer', check: (g: SonicGenome) => g.gamification.uniqueEffects.length >= 5 },
  { id: 'guide-explorer', label: 'Guide Explorer', check: (g: SonicGenome) => g.gamification.uniqueGuides.length >= 3 },
  { id: 'glyph-revealed', label: 'Glyph Revealed', check: (g: SonicGenome) => g.archetype.confidence >= 0.5 }
];

// ── Sonic Keywords ─────────────────────────────────────────────────

const SONIC_KEYWORDS: Record<string, string[]> = {
  'sonic.texture': ['warm', 'cold', 'gritty', 'pristine', 'analog', 'digital', 'lo-fi', 'crystalline'],
  'sonic.mood': ['aggressive', 'ethereal', 'melancholic', 'euphoric', 'haunting', 'anthemic', 'dreamy', 'intense'],
  'sonic.production': ['minimal', 'layered', 'compressed', 'spacious', 'raw', 'polished', 'saturated', 'clean'],
  'sonic.vocal': ['breathy', 'powerful', 'whispered', 'belted', 'robotic', 'organic', 'airy', 'nasal'],
  'sonic.space': ['intimate', 'cathedral', 'stadium', 'basement', 'void', 'outdoor', 'studio', 'hall']
};

// ── Genome storage ─────────────────────────────────────────────────

let genome: SonicGenome | null = null;

try {
  if (fs.existsSync(genomeFile)) {
    genome = JSON.parse(fs.readFileSync(genomeFile, 'utf-8')) as SonicGenome;
  }
} catch (error) {
  console.error('[SonicGenome] Failed to load genome:', error);
  genome = null;
}

function persist() {
  try {
    fs.writeFileSync(genomeFile, JSON.stringify(genome, null, 2));
  } catch (error) {
    console.error('[SonicGenome] Failed to persist genome:', error);
  }
}

function createGenome(): SonicGenome {
  return {
    userId: 'default',
    version: 1,
    archetype: {
      primary: null,
      secondary: null,
      distribution: {},
      confidence: 0,
      classifiedAt: null
    },
    keywordScores: {},
    sonicPatterns: {
      dominantTextures: [],
      avoidTextures: [],
      preferredMoods: [],
      productionStyle: [],
      vocalPreference: [],
      spatialPreference: []
    },
    signals: [],
    gamification: {
      xp: 0,
      tier: 0,
      achievements: [],
      streak: 0,
      longestStreak: 0,
      lastActiveDate: null,
      totalRenders: 0,
      totalLikes: 0,
      totalMints: 0,
      uniqueEffects: [],
      uniqueGuides: []
    },
    confidence: 0,
    itemCount: 0,
    lastUpdated: null,
    createdAt: new Date().toISOString()
  };
}

// ── Core functions ─────────────────────────────────────────────────

export function getOrCreateGenome(): SonicGenome {
  if (!genome) {
    genome = createGenome();
    persist();
  }
  return genome;
}

export function recordSonicSignal(signal: {
  type: SonicSignalType;
  value?: string;
  metadata?: Record<string, unknown>;
}): SonicGenome {
  const g = getOrCreateGenome();
  const { type, value, metadata = {} } = signal;
  const timestamp = new Date().toISOString();

  const isNegative = ['dislike'].includes(type);
  const weight = SIGNAL_WEIGHTS[type] ?? 0.5;
  const direction = isNegative ? -0.5 : 1;

  // Compute archetype weights from signal type
  const archetypeMap = SIGNAL_ARCHETYPE_MAP[type] ?? {};
  const archetypeWeights: Record<string, number> = {};
  for (const [designation, w] of Object.entries(archetypeMap)) {
    archetypeWeights[designation] = w * direction;
  }

  const signalRecord: SonicSignal = {
    type,
    value,
    weight: weight * direction,
    metadata,
    timestamp,
    archetypeWeights
  };

  g.signals.push(signalRecord);
  if (g.signals.length > 1000) {
    g.signals = g.signals.slice(-1000);
  }

  g.itemCount += 1;
  g.lastUpdated = timestamp;

  updateArchetypeFromSignals(g);
  updateKeywordScores(g, type, metadata);
  updateGamification(g, type, metadata);
  checkAchievements(g);

  persist();
  return g;
}

function updateArchetypeFromSignals(g: SonicGenome) {
  const dist: Record<string, number> = {};

  for (const signal of g.signals) {
    for (const [designation, w] of Object.entries(signal.archetypeWeights)) {
      dist[designation] = (dist[designation] ?? 0) + w;
    }
  }

  g.archetype.distribution = dist;

  // Find primary and secondary
  const sorted = Object.entries(dist).sort((a, b) => b[1] - a[1]);
  if (sorted.length > 0 && sorted[0][1] > 0) {
    g.archetype.primary = sorted[0][0] as SonicArchetypeDesignation;
    g.archetype.secondary = sorted.length > 1 && sorted[1][1] > 0
      ? sorted[1][0] as SonicArchetypeDesignation
      : null;
    g.archetype.classifiedAt = new Date().toISOString();

    // Confidence based on signal count and distribution clarity
    const total = sorted.reduce((sum, [, v]) => sum + Math.abs(v), 0);
    const topRatio = total > 0 ? sorted[0][1] / total : 0;
    g.archetype.confidence = Math.min(1, topRatio * Math.min(1, g.signals.length / 20));
  }

  g.confidence = g.archetype.confidence;
}

function updateKeywordScores(g: SonicGenome, type: SonicSignalType, metadata: Record<string, unknown>) {
  const keywords = metadata.keywords as string[] | undefined;
  if (!keywords) return;

  for (const kw of keywords) {
    if (!g.keywordScores[kw]) {
      g.keywordScores[kw] = { score: 0, count: 0 };
    }
    const direction = type === 'dislike' ? -1 : 1;
    g.keywordScores[kw].score += direction;
    g.keywordScores[kw].count += 1;
  }

  // Update sonic patterns from keyword scores
  updateSonicPatterns(g);
}

function updateSonicPatterns(g: SonicGenome) {
  const positiveByCategory: Record<string, string[]> = {};
  const negativeByCategory: Record<string, string[]> = {};

  for (const [kw, score] of Object.entries(g.keywordScores)) {
    for (const [category, words] of Object.entries(SONIC_KEYWORDS)) {
      if (words.includes(kw)) {
        if (score.score > 0) {
          if (!positiveByCategory[category]) positiveByCategory[category] = [];
          positiveByCategory[category].push(kw);
        } else if (score.score < 0) {
          if (!negativeByCategory[category]) negativeByCategory[category] = [];
          negativeByCategory[category].push(kw);
        }
      }
    }
  }

  g.sonicPatterns.dominantTextures = positiveByCategory['sonic.texture'] ?? [];
  g.sonicPatterns.avoidTextures = negativeByCategory['sonic.texture'] ?? [];
  g.sonicPatterns.preferredMoods = positiveByCategory['sonic.mood'] ?? [];
  g.sonicPatterns.productionStyle = positiveByCategory['sonic.production'] ?? [];
  g.sonicPatterns.vocalPreference = positiveByCategory['sonic.vocal'] ?? [];
  g.sonicPatterns.spatialPreference = positiveByCategory['sonic.space'] ?? [];
}

function updateGamification(g: SonicGenome, type: SonicSignalType, metadata: Record<string, unknown>) {
  // XP
  g.gamification.xp += XP_REWARDS[type] ?? 0;

  // Tier
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (g.gamification.xp >= TIERS[i].minXP) {
      g.gamification.tier = i;
      break;
    }
  }

  // Counters
  if (type === 'render') g.gamification.totalRenders += 1;
  if (type === 'like') g.gamification.totalLikes += 1;
  if (type === 'mint') g.gamification.totalMints += 1;

  // Unique effects
  const effectPreset = metadata.effectPreset as string | undefined;
  if (effectPreset && !g.gamification.uniqueEffects.includes(effectPreset)) {
    g.gamification.uniqueEffects.push(effectPreset);
  }

  // Unique guides
  const guideSampleId = metadata.guideSampleId as string | undefined;
  if (guideSampleId && !g.gamification.uniqueGuides.includes(guideSampleId)) {
    g.gamification.uniqueGuides.push(guideSampleId);
  }

  // Streak
  const today = new Date().toISOString().split('T')[0];
  if (g.gamification.lastActiveDate) {
    const lastDate = new Date(g.gamification.lastActiveDate);
    const diff = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 1) {
      g.gamification.streak += 1;
      g.gamification.xp += XP_REWARDS.streak_day;
    } else if (diff > 1) {
      g.gamification.streak = 1;
    }
    // diff === 0: same day, no change
  } else {
    g.gamification.streak = 1;
  }

  if (g.gamification.streak > g.gamification.longestStreak) {
    g.gamification.longestStreak = g.gamification.streak;
  }

  g.gamification.lastActiveDate = today;
}

function checkAchievements(g: SonicGenome) {
  for (const def of ACHIEVEMENT_DEFS) {
    if (!g.gamification.achievements.includes(def.id) && def.check(g)) {
      g.gamification.achievements.push(def.id);
    }
  }
}

export function getSonicGenomeSummary() {
  const g = getOrCreateGenome();
  const primaryArchetype = g.archetype.primary
    ? SONIC_ARCHETYPES[g.archetype.primary]
    : SONIC_ARCHETYPES['NULL'];
  const secondaryArchetype = g.archetype.secondary
    ? SONIC_ARCHETYPES[g.archetype.secondary]
    : null;

  const tierInfo = TIERS[g.gamification.tier];
  const nextTier = TIERS[g.gamification.tier + 1] ?? null;

  // Top keywords
  const topKeywords = Object.entries(g.keywordScores)
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, 10)
    .map(([keyword, score]) => ({ keyword, ...score }));

  return {
    archetype: {
      primary: primaryArchetype,
      secondary: secondaryArchetype,
      distribution: g.archetype.distribution,
      confidence: g.archetype.confidence
    },
    gamification: {
      ...g.gamification,
      tierName: tierInfo.name,
      nextTierName: nextTier?.name ?? null,
      nextTierXP: nextTier?.minXP ?? null
    },
    sonicPatterns: g.sonicPatterns,
    topKeywords,
    signalCount: g.signals.length,
    confidence: g.confidence,
    itemCount: g.itemCount,
    lastUpdated: g.lastUpdated,
    createdAt: g.createdAt
  };
}

export function getSonicArchetypes(): Record<string, SonicArchetype> {
  return { ...SONIC_ARCHETYPES };
}

export function getSonicSignals(): SonicSignal[] {
  return getOrCreateGenome().signals;
}

export function getSonicGamification() {
  const g = getOrCreateGenome();
  const tierInfo = TIERS[g.gamification.tier];
  const nextTier = TIERS[g.gamification.tier + 1] ?? null;
  return {
    ...g.gamification,
    tierName: tierInfo.name,
    nextTierName: nextTier?.name ?? null,
    nextTierXP: nextTier?.minXP ?? null
  };
}
