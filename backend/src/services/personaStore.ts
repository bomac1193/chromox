import fs from 'fs';
import path from 'path';
import { v4 as uuid } from 'uuid';
import { Persona } from '../types';

const dataDir = path.join(process.cwd(), 'storage');
const personaFile = path.join(dataDir, 'personas.json');

fs.mkdirSync(dataDir, { recursive: true });

let personas: Persona[] = [];
try {
  if (fs.existsSync(personaFile)) {
    const raw = fs.readFileSync(personaFile, 'utf-8');
    personas = JSON.parse(raw) as Persona[];
  }
} catch (error) {
  console.error('[PersonaStore] Failed to load personas from disk:', error);
  personas = [];
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
    created_at: new Date().toISOString()
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
