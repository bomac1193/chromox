import { findPersona, updatePersona } from './personaStore';
import { GuideSample, Persona } from '../types';

/**
 * Calculate effectiveness score from usage stats.
 * Score = (likes / uses) * 100, with recency boost
 */
function calculateEffectiveness(sample: GuideSample): number {
  const uses = sample.useCount ?? 0;
  const likes = sample.likeCount ?? 0;
  const dislikes = sample.dislikeCount ?? 0;

  if (uses === 0) return 0;

  // Base score: like ratio
  const likeRatio = likes / uses;

  // Penalty for dislikes
  const dislikeRatio = dislikes / uses;

  // Final score: likes boost, dislikes penalize
  const rawScore = (likeRatio * 100) - (dislikeRatio * 50);

  // Confidence boost: more uses = more reliable score
  const confidenceMultiplier = Math.min(1, uses / 5); // Full confidence at 5+ uses

  // Recency boost: recently used samples get slight bump
  let recencyBoost = 0;
  if (sample.lastUsedAt) {
    const daysSinceUse = (Date.now() - new Date(sample.lastUsedAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceUse < 7) recencyBoost = 5;
    else if (daysSinceUse < 30) recencyBoost = 2;
  }

  const finalScore = (rawScore * confidenceMultiplier) + recencyBoost;
  return Math.max(0, Math.min(100, Math.round(finalScore)));
}

/**
 * Find a guide sample across all personas by ID.
 */
function findSampleAcrossPersonas(
  personas: Persona[],
  sampleId: string
): { persona: Persona; sample: GuideSample; index: number } | null {
  for (const persona of personas) {
    if (!persona.guide_samples) continue;
    const index = persona.guide_samples.findIndex(s => s.id === sampleId);
    if (index !== -1) {
      return { persona, sample: persona.guide_samples[index], index };
    }
  }
  return null;
}

/**
 * Record that a sample was used in a render.
 * Called when a render is created with a guide sample.
 */
export async function recordSampleUsage(personaId: string, sampleId: string): Promise<void> {
  const persona = findPersona(personaId);
  if (!persona?.guide_samples) return;

  const sampleIndex = persona.guide_samples.findIndex(s => s.id === sampleId);
  if (sampleIndex === -1) return;

  const sample = persona.guide_samples[sampleIndex];
  const updatedSample: GuideSample = {
    ...sample,
    useCount: (sample.useCount ?? 0) + 1,
    lastUsedAt: new Date().toISOString(),
    effectivenessScore: calculateEffectiveness({
      ...sample,
      useCount: (sample.useCount ?? 0) + 1,
    }),
  };

  const updatedSamples = [...persona.guide_samples];
  updatedSamples[sampleIndex] = updatedSample;

  updatePersona(personaId, { guide_samples: updatedSamples });
  console.log(`[SampleEffectiveness] Recorded usage for sample ${sampleId} (uses: ${updatedSample.useCount})`);
}

/**
 * Record feedback on a sample based on render rating.
 * Called when a render is rated like/dislike.
 */
export async function recordSampleFeedback(
  personaId: string,
  sampleId: string,
  rating: 'like' | 'dislike' | 'neutral'
): Promise<void> {
  if (rating === 'neutral') return; // Neutral doesn't affect score

  const persona = findPersona(personaId);
  if (!persona?.guide_samples) return;

  const sampleIndex = persona.guide_samples.findIndex(s => s.id === sampleId);
  if (sampleIndex === -1) return;

  const sample = persona.guide_samples[sampleIndex];
  const updatedSample: GuideSample = {
    ...sample,
    likeCount: rating === 'like' ? (sample.likeCount ?? 0) + 1 : sample.likeCount,
    dislikeCount: rating === 'dislike' ? (sample.dislikeCount ?? 0) + 1 : sample.dislikeCount,
  };
  updatedSample.effectivenessScore = calculateEffectiveness(updatedSample);

  const updatedSamples = [...persona.guide_samples];
  updatedSamples[sampleIndex] = updatedSample;

  updatePersona(personaId, { guide_samples: updatedSamples });
  console.log(`[SampleEffectiveness] Recorded ${rating} for sample ${sampleId} (score: ${updatedSample.effectivenessScore})`);
}

/**
 * Get top effective samples across all personas.
 */
export function getTopEffectiveSamples(personas: Persona[], limit = 10): Array<GuideSample & { personaId: string; personaName: string }> {
  const allSamples: Array<GuideSample & { personaId: string; personaName: string }> = [];

  for (const persona of personas) {
    if (!persona.guide_samples) continue;
    for (const sample of persona.guide_samples) {
      allSamples.push({
        ...sample,
        personaId: persona.id,
        personaName: persona.name,
      });
    }
  }

  // Sort by effectiveness score (with minimum usage threshold)
  return allSamples
    .filter(s => (s.useCount ?? 0) >= 1) // At least 1 use
    .sort((a, b) => (b.effectivenessScore ?? 0) - (a.effectivenessScore ?? 0))
    .slice(0, limit);
}

/**
 * Get samples that need more testing (used but not enough data).
 */
export function getSamplesToTest(personas: Persona[], limit = 5): Array<GuideSample & { personaId: string; personaName: string }> {
  const allSamples: Array<GuideSample & { personaId: string; personaName: string }> = [];

  for (const persona of personas) {
    if (!persona.guide_samples) continue;
    for (const sample of persona.guide_samples) {
      allSamples.push({
        ...sample,
        personaId: persona.id,
        personaName: persona.name,
      });
    }
  }

  // Samples with 1-4 uses (need more data for reliable score)
  return allSamples
    .filter(s => {
      const uses = s.useCount ?? 0;
      return uses >= 1 && uses < 5;
    })
    .sort((a, b) => (a.useCount ?? 0) - (b.useCount ?? 0))
    .slice(0, limit);
}

/**
 * Get unused samples (potential untapped value).
 */
export function getUnusedSamples(personas: Persona[], limit = 10): Array<GuideSample & { personaId: string; personaName: string }> {
  const allSamples: Array<GuideSample & { personaId: string; personaName: string }> = [];

  for (const persona of personas) {
    if (!persona.guide_samples) continue;
    for (const sample of persona.guide_samples) {
      allSamples.push({
        ...sample,
        personaId: persona.id,
        personaName: persona.name,
      });
    }
  }

  return allSamples
    .filter(s => (s.useCount ?? 0) === 0)
    .sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime())
    .slice(0, limit);
}
