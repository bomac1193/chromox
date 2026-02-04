import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { RelicPack } from '../types';

const dataDir = path.join(process.cwd(), 'storage');
const unlockFile = path.join(dataDir, 'reliquary_unlocks.json');

fs.mkdirSync(dataDir, { recursive: true });

// ── Curated Sonic Relic Packs ──────────────────────────────────────

const SONIC_RELIC_PACKS: RelicPack[] = [
  {
    id: 'frequency-archive',
    name: 'The Frequency Archive',
    description: 'Twelve sonic artifacts recovered from abandoned studios, each resonating at impossible frequencies.',
    hashedPassword: 'a0f3c3e7bfe3ea0ac0e6da4e6a1f6e7d8c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9',
    relics: [
      {
        id: 'phantom-oscillator',
        name: 'Phantom Oscillator',
        description: 'A waveform that exists between analog and digital.',
        lore: 'Discovered in a decommissioned BBC radio studio. It plays a frequency that no instrument can produce.',
        tier: 1,
        icon: '~'
      },
      {
        id: 'broken-reverb-plate',
        name: 'Broken Reverb Plate',
        description: 'A reverb plate cracked during a legendary recording session.',
        lore: 'The crack introduced harmonics that engineers spent decades trying to recreate digitally.',
        tier: 2,
        icon: '#'
      },
      {
        id: 'ghost-note',
        name: 'Ghost Note',
        description: 'A MIDI note that triggers silence, yet changes the mix.',
        lore: 'Inserted into a track at 3AM. The engineer swore they never programmed it.',
        tier: 1,
        icon: '?'
      },
      {
        id: 'infinite-sustain',
        name: 'Infinite Sustain',
        description: 'A string that never stops vibrating.',
        lore: 'Pulled from a piano that was sealed in a concert hall for forty years.',
        tier: 3,
        icon: '|'
      }
    ]
  }
];

// ── Unlocks storage ────────────────────────────────────────────────

let unlocks: Record<string, boolean> = {};

try {
  if (fs.existsSync(unlockFile)) {
    unlocks = JSON.parse(fs.readFileSync(unlockFile, 'utf-8'));
  }
} catch (error) {
  console.error('[Reliquary] Failed to load unlocks:', error);
  unlocks = {};
}

function persist() {
  try {
    fs.writeFileSync(unlockFile, JSON.stringify(unlocks, null, 2));
  } catch (error) {
    console.error('[Reliquary] Failed to persist unlocks:', error);
  }
}

function hashPassword(plaintext: string): string {
  const normalized = plaintext.toLowerCase().trim();
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

// ── Exports ────────────────────────────────────────────────────────

export function listRelicPacks() {
  return SONIC_RELIC_PACKS.map((pack) => ({
    id: pack.id,
    name: pack.name,
    description: pack.description,
    relicCount: pack.relics.length,
    unlocked: unlocks[pack.id] === true
  }));
}

export function getReliquaryUnlocks(): Record<string, boolean> {
  return { ...unlocks };
}

export function unlockPack(packId: string, password: string): { success: boolean; pack?: ReturnType<typeof listRelicPacks>[0] & { relics: RelicPack['relics'] } } {
  const pack = SONIC_RELIC_PACKS.find((p) => p.id === packId);
  if (!pack) return { success: false };
  if (unlocks[packId]) {
    return { success: true, pack: { ...listRelicPacks().find((p) => p.id === packId)!, relics: pack.relics } };
  }

  const hash = hashPassword(password);
  if (hash !== pack.hashedPassword) {
    return { success: false };
  }

  unlocks[packId] = true;
  persist();
  return {
    success: true,
    pack: {
      id: pack.id,
      name: pack.name,
      description: pack.description,
      relicCount: pack.relics.length,
      unlocked: true,
      relics: pack.relics
    }
  };
}

export function getUnlockedPackRelics(packId: string) {
  if (!unlocks[packId]) return null;
  const pack = SONIC_RELIC_PACKS.find((p) => p.id === packId);
  return pack?.relics ?? null;
}
