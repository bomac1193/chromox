import fs from 'fs';
import path from 'path';
import { v4 as uuid } from 'uuid';
import { Persona, Relic } from '../types';
import { buildHeuristicGuideMetadata, generateGuideMetadata } from './guideMetadata';

const dataDir = path.join(process.cwd(), 'storage');
const personaFile = path.join(dataDir, 'personas.json');

fs.mkdirSync(dataDir, { recursive: true });

let personas: Persona[] = [];
try {
  if (fs.existsSync(personaFile)) {
    const raw = fs.readFileSync(personaFile, 'utf-8');
    personas = (JSON.parse(raw) as Persona[]).map((persona) => ({
      ...persona,
      image_focus_x: persona.image_focus_x ?? 50,
      image_focus_y: persona.image_focus_y ?? 50,
      guide_samples: (persona.guide_samples ?? []).map((sample) => {
        const fallback = buildHeuristicGuideMetadata({
          name: sample.name,
          path: sample.path,
          tags: sample.tags,
          source: sample.source
        });
        return {
          ...sample,
          url: sample.url ?? deriveGuideUrl(sample.path),
          source: sample.source ?? 'user',
          tags: sample.tags ?? fallback.tags,
          transcript: sample.transcript ?? fallback.transcript,
          embedding: sample.embedding ?? fallback.embedding,
          mood: sample.mood ?? fallback.mood,
          aiModel: sample.aiModel ?? fallback.aiModel,
          recommendedUse: sample.recommendedUse ?? fallback.recommendedUse,
          tempo: sample.tempo ?? fallback.tempo
        };
      })
    }));
  }
} catch (error) {
  console.error('[PersonaStore] Failed to load personas from disk:', error);
  personas = [];
}

function deriveGuideUrl(filePath: string) {
  if (!filePath) return '';

  // Handle paths that are already relative URLs
  if (filePath.startsWith('/media/')) return filePath;

  // Extract the relative part after 'guide_samples'
  const guideSamplesIndex = filePath.replace(/\\/g, '/').indexOf('guide_samples/');
  if (guideSamplesIndex !== -1) {
    const relativePart = filePath.substring(guideSamplesIndex + 'guide_samples/'.length);
    return `/media/guides/${relativePart.replace(/\\/g, '/')}`;
  }

  // Fallback: use path.relative
  const guideRoot = path.join(process.cwd(), 'guide_samples');
  const relative = path.relative(guideRoot, filePath);
  return `/media/guides/${relative.replace(/\\/g, '/')}`;
}

function persist() {
  try {
    fs.writeFileSync(personaFile, JSON.stringify(personas, null, 2));
  } catch (error) {
    console.error('[PersonaStore] Failed to persist personas:', error);
  }
}

export function listPersonas() {
  return personas;
}

export function findPersona(id: string) {
  return personas.find((p) => p.id === id);
}

export function createPersona(input: Omit<Persona, 'id' | 'created_at'>) {
  const persona: Persona = {
    ...input,
    id: uuid(),
    created_at: new Date().toISOString(),
    image_focus_x: input.image_focus_x ?? 50,
    image_focus_y: input.image_focus_y ?? 50,
    guide_samples: input.guide_samples ?? []
  };
  personas.push(persona);
  persist();
  return persona;
}

export function updatePersona(
  id: string,
  updates: Partial<Omit<Persona, 'id' | 'created_at'>>
) {
  const index = personas.findIndex((p) => p.id === id);
  if (index === -1) {
    return null;
  }
  personas[index] = {
    ...personas[index],
    ...updates
  };
  persist();
  return personas[index];
}

type GuideSampleInput = {
  name: string;
  originalName: string;
  path: string;
  source?: 'user' | 'ai-lab' | 'folio';
  tags?: string[];
  mode?: 'glitch' | 'dream' | 'anthem';
  mintedFromRenderId?: string;
  folioCollectionId?: string;
  folioVideoUrl?: string;
};

export async function addGuideSample(personaId: string, sample: GuideSampleInput) {
  const persona = findPersona(personaId);
  if (!persona) return null;
  const metadata = await generateGuideMetadata({
    name: sample.name,
    path: sample.path,
    tags: sample.tags,
    source: sample.source,
    mode: sample.mode
  });
  const entry = {
    id: uuid(),
    name: sample.name,
    originalName: sample.originalName,
    path: sample.path,
    url: deriveGuideUrl(sample.path),
    uploaded_at: new Date().toISOString(),
    source: sample.source ?? 'user',
    tags: metadata.tags,
    transcript: metadata.transcript,
    embedding: metadata.embedding,
    tempo: metadata.tempo,
    mood: metadata.mood,
    aiModel: metadata.aiModel,
    recommendedUse: metadata.recommendedUse,
    mintedFromRenderId: sample.mintedFromRenderId,
    // Folio integration fields
    folioCollectionId: sample.folioCollectionId,
    folioVideoUrl: sample.folioVideoUrl,
    // Accent detection metadata from AssemblyAI/Rev.ai
    accentMetadata: metadata.accentMetadata,
    transcriptionConfidence: metadata.transcriptionConfidence,
    transcriptionProvider: metadata.transcriptionProvider,
    // Phonetic pronunciation (fixes Chinese/Russian artifacts)
    phoneticTranscript: metadata.phoneticTranscript,
    pronunciationHints: metadata.pronunciationHints,
    prosodyHints: metadata.prosodyHints,
    ensembleDetails: metadata.ensembleDetails
  };
  persona.guide_samples = [...(persona.guide_samples ?? []), entry];
  persist();
  return entry;
}

export function removeGuideSample(personaId: string, sampleId: string) {
  const persona = findPersona(personaId);
  if (!persona) return false;
  const before = persona.guide_samples?.length ?? 0;
  persona.guide_samples = (persona.guide_samples ?? []).filter((s) => s.id !== sampleId);
  if (persona.guide_samples.length < before) {
    persist();
    return true;
  }
  return false;
}

// ── Relic CRUD ─────────────────────────────────────────────────────

export function addRelicToPersona(
  personaId: string,
  relic: Omit<Relic, 'id' | 'created_at' | 'sourcePersonaId'>
): Relic | null {
  const persona = findPersona(personaId);
  if (!persona) return null;

  const entry: Relic = {
    ...relic,
    id: uuid(),
    sourcePersonaId: personaId,
    created_at: new Date().toISOString()
  };

  persona.relics = [...(persona.relics ?? []), entry];
  persist();
  return entry;
}

export function listPersonaRelics(personaId: string): Relic[] {
  const persona = findPersona(personaId);
  return persona?.relics ?? [];
}
