export const SONIC_RELIC_PACKS = [
  {
    id: 'frequency-archive',
    name: 'The Frequency Archive',
    description: 'Twelve sonic artifacts recovered from abandoned studios, each resonating at impossible frequencies.',
    hashedPassword: 'a0f3c3e7bfe3ea0ac0e6da4e6a1f6e7d8c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9'
  }
];

export async function hashPassword(plaintext: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function tryUnlockPack(
  plaintext: string,
  currentUnlocks: Record<string, boolean>
): Promise<string | null> {
  const hash = await hashPassword(plaintext);
  for (const pack of SONIC_RELIC_PACKS) {
    if (!currentUnlocks[pack.id] && hash === pack.hashedPassword) {
      return pack.id;
    }
  }
  return null;
}
