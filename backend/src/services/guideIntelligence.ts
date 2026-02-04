import fs from 'fs';
import path from 'path';
import { GuideSuggestion, RenderJobRecord, TasteProfile } from '../types';
import { findPersona, addGuideSample } from './personaStore';
import { listRenderJobs } from './renderStore';
import { renderMintedGuide } from './neuralMint';

const guideRoot = path.join(process.cwd(), 'guide_samples');

function ensurePersona(personaId: string) {
  const persona = findPersona(personaId);
  if (!persona) {
    throw new Error('Persona not found');
  }
  return persona;
}

function cosineSimilarity(a: number[], b: number[]) {
  if (!a.length || !b.length) return 0;
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  if (!magA || !magB) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

function averageEmbedding(embeddings: number[][]) {
  if (!embeddings.length) return [];
  const length = embeddings[0].length;
  const result = new Array(length).fill(0);
  embeddings.forEach((emb) => {
    for (let i = 0; i < length; i++) {
      result[i] += emb[i] ?? 0;
    }
  });
  return result.map((value) => Number((value / embeddings.length).toFixed(4)));
}

type TasteVector = {
  likedCount: number;
  dislikedCount: number;
  likedGuideIds: Set<string>;
  dislikedGuideIds: Set<string>;
  energeticPreference: number;
  glitchAffinity: number;
  tasteEmbedding: number[];
};

function analyzeTasteVector(renders: RenderJobRecord[]): TasteVector {
  const liked = renders.filter((job) => job.rating === 'like');
  const disliked = renders.filter((job) => job.rating === 'dislike');
  const likedGuideIds = new Set<string>(
    liked.map((job) => job.guideSampleId).filter((id): id is string => Boolean(id))
  );
  const dislikedGuideIds = new Set<string>(
    disliked.map((job) => job.guideSampleId).filter((id): id is string => Boolean(id))
  );
  const sample = liked.length ? liked : renders;
  const likedGuideEmbeddings = liked
    .map((job) => job.guideSampleId)
    .filter((id): id is string => Boolean(id));
  const energeticPreference =
    sample.length > 0
      ? sample.reduce((acc, job) => acc + (job.controls.energy ?? 0.5), 0) / sample.length
      : 0.6;
  const glitchAffinity =
    liked.length > 0
      ? liked.filter((job) => job.effects.preset?.includes('8d') || job.effects.engine.includes('rave')).length /
        liked.length
      : 0.3;
  const persona = renders.length ? findPersona(renders[0].personaId) : null;
  const likedEmbeddings =
    persona?.guide_samples
      ?.filter((sample) => sample.embedding && likedGuideEmbeddings.includes(sample.id))
      .map((sample) => sample.embedding as number[]) ?? [];
  return {
    likedCount: liked.length,
    dislikedCount: disliked.length,
    likedGuideIds,
    dislikedGuideIds,
    energeticPreference,
    glitchAffinity,
    tasteEmbedding: likedEmbeddings.length ? averageEmbedding(likedEmbeddings) : []
  };
}

export function getGuideSuggestions(personaId: string): GuideSuggestion[] {
  const persona = ensurePersona(personaId);
  const samples = persona.guide_samples ?? [];
  const renders = listRenderJobs().filter((job) => job.personaId === personaId);
  const tasteVector = analyzeTasteVector(renders);

  const usage = new Map<
    string,
    {
      count: number;
      lastUsed: number;
      lastLabel?: string;
    }
  >();
  renders.forEach((job) => {
    if (!job.guideSampleId) return;
    const current = usage.get(job.guideSampleId) ?? { count: 0, lastUsed: 0 };
    usage.set(job.guideSampleId, {
      count: current.count + 1,
      lastUsed: Math.max(current.lastUsed, new Date(job.created_at).getTime()),
      lastLabel: job.label ?? current.lastLabel
    });
  });

  const rankedSamples = [...samples].sort((a, b) => {
    const usageA = usage.get(a.id);
    const usageB = usage.get(b.id);
    const countDiff = (usageB?.count ?? 0) - (usageA?.count ?? 0);
    if (countDiff !== 0) return countDiff;
    if (usageB?.lastUsed && usageA?.lastUsed) {
      return usageB.lastUsed - usageA.lastUsed;
    }
    return new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime();
  });

  const suggestions: GuideSuggestion[] = rankedSamples.slice(0, 3).map((sample, index) => {
    const stats = usage.get(sample.id);
    const similarity =
      tasteVector.tasteEmbedding.length && sample.embedding
        ? cosineSimilarity(tasteVector.tasteEmbedding, sample.embedding)
        : 0;
    const ratingBoost = tasteVector.likedGuideIds.has(sample.id)
      ? 0.2
      : tasteVector.dislikedGuideIds.has(sample.id)
        ? -0.25
        : 0;
    const confidence = stats
      ? Math.min(0.95, 0.4 + stats.count * 0.2 + ratingBoost + similarity * 0.2)
      : 0.35 + index * 0.1 + ratingBoost + similarity * 0.25;
    const energyScore =
      0.4 + tasteVector.energeticPreference * 0.4 + (sample.tags?.includes('ai') ? 0.1 : index * 0.05);
    return {
      id: sample.id,
      title: sample.name,
      description:
        sample.recommendedUse ??
        sample.tags?.join(' • ') ??
        sample.transcript?.slice(0, 80) ??
        'From your guide vault',
      reason: stats
        ? `Used ${stats.count}×${stats.lastLabel ? ` in ${stats.lastLabel}` : ''}`
        : tasteVector.likedGuideIds.has(sample.id)
          ? 'Previously liked by you'
          : 'Freshly uploaded + ready to imprint',
      vibe: sample.mood === 'dream' ? 'nostalgic' : sample.mood === 'anthem' ? 'hype' : sample.mood === 'ambient' ? 'chill' : 'glitch',
      energyScore,
      matchConfidence: confidence,
      sampleId: sample.id,
      previewUrl: sample.url,
      action: 'use',
      transcriptSnippet: sample.transcript?.slice(0, 120)
    };
  });

  const highEnergy = renders.reduce((acc, render) => acc + (render.guideMatchIntensity ?? 0.5), 0);
  const avgMatch = renders.length ? highEnergy / renders.length : 0.6;
  const dominantLabel = (() => {
    const groups = new Map<string, number>();
    renders.forEach((render) => {
      if (!render.label) return;
      groups.set(render.label, (groups.get(render.label) ?? 0) + 1);
    });
    return [...groups.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  })();

  suggestions.push({
    id: `mint-${personaId}`,
    title: 'AI Viral Hook',
    description: dominantLabel
      ? `Mint a glitchy chop inspired by "${dominantLabel}"`
      : 'Mint a glitchy 12s chop to spark a new verse.',
    reason:
      renders.length > 0
        ? `Leaning into ${tasteVector.likedCount} likes (${Math.round(avgMatch * 100)}% guide lock).`
        : 'Kickstart this persona with a Chromox Lab guide.',
    vibe: 'glitch',
    energyScore: Math.min(1, 0.7 + tasteVector.glitchAffinity * 0.3),
    matchConfidence: Math.min(0.96, avgMatch + 0.2 + tasteVector.glitchAffinity * 0.1),
    action: 'mint',
    mintMode: 'glitch'
  });

  suggestions.push({
    id: `dream-${personaId}`,
    title: 'AI Dream Loop',
    description: 'Generates a lofi, reverb-soaked whisper loop from your last render.',
    reason:
      tasteVector.dislikedCount > 0
        ? 'Balances out harsher takes you downvoted.'
        : 'Pairs well with mellow tempos and breathy personas.',
    vibe: 'nostalgic',
    energyScore: Math.max(0.35, 0.7 - tasteVector.energeticPreference * 0.4),
    matchConfidence: 0.6 + (1 - tasteVector.energeticPreference) * 0.2,
    action: 'mint',
    mintMode: 'dream'
  });

  if (tasteVector.energeticPreference > 0.65) {
    suggestions.push({
      id: `anthem-${personaId}`,
      title: 'AI Anthem Stack',
      description: 'High-energy gang chants with stereo spreads and octave stacks.',
      reason: 'Your recent takes skew energetic—layer this under choruses.',
      vibe: 'hype',
      energyScore: 0.95,
      matchConfidence: 0.78 + tasteVector.glitchAffinity * 0.1,
      action: 'mint',
      mintMode: 'anthem'
    });
  }

  return suggestions;
}

type MintMode = 'glitch' | 'dream' | 'anthem';

export async function mintGuideClip(
  personaId: string,
  mode: MintMode = 'glitch',
  duration: number = 12,
  dry: boolean = true
) {
  const persona = ensurePersona(personaId);
  const renders = listRenderJobs().filter((job) => job.personaId === personaId);
  const latest = renders[0];
  if (!latest) {
    throw new Error('Need at least one render before minting a clip.');
  }
  if (!fs.existsSync(latest.audioPath)) {
    throw new Error('Latest render audio missing on disk.');
  }
  const personaFolder = path.join(guideRoot, personaId);
  fs.mkdirSync(personaFolder, { recursive: true });
  const outputName = `ai_${mode}_${duration}s_${Date.now()}.wav`;
  const outputPath = path.join(personaFolder, outputName);
  await renderMintedGuide({ sourcePath: latest.audioPath, outputPath, mode, duration, dry });
  const sample = await addGuideSample(persona.id, {
    name: mode === 'dream' ? `Dream Loop (${duration}s)` : `Viral Hook Chop (${duration}s)`,
    originalName: outputName,
    path: outputPath,
    source: 'ai-lab',
    tags: ['ai', mode, `${duration}s`],
    mode,
    mintedFromRenderId: latest.id
  });
  if (!sample) {
    throw new Error('Failed to register generated clip.');
  }
  return sample;
}

export function getTasteProfile(personaId: string): TasteProfile {
  const persona = ensurePersona(personaId);
  const renders = listRenderJobs().filter((job) => job.personaId === personaId);
  const tasteVector = analyzeTasteVector(renders);
  const likes = renders.filter((job) => job.rating === 'like');
  const dislikes = renders.filter((job) => job.rating === 'dislike');
  const recentLabels = [
    ...new Set(
      renders
        .map((job) => job.label)
        .filter((label): label is string => Boolean(label))
        .slice(0, 4)
    )
  ];
  const favoriteGuideId =
    likes
      .map((job) => job.guideSampleId)
      .filter((id): id is string => Boolean(id))
      .shift() ?? undefined;
  const favoriteGuide = persona.guide_samples?.find((sample) => sample.id === favoriteGuideId);
  const recommendedMintMode =
    tasteVector.energeticPreference > 0.65
      ? 'anthem'
      : tasteVector.energeticPreference < 0.4
        ? 'dream'
        : 'glitch';
  return {
    personaId,
    totalRenders: renders.length,
    likes: likes.length,
    dislikes: dislikes.length,
    favoriteGuide: favoriteGuide
      ? { id: favoriteGuide.id, name: favoriteGuide.name, mood: favoriteGuide.mood }
      : undefined,
    recentLabels,
    energeticPreference: Number(tasteVector.energeticPreference.toFixed(2)),
    glitchAffinity: Number(tasteVector.glitchAffinity.toFixed(2)),
    recommendedMintMode
  };
}
