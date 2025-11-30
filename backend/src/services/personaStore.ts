import { Persona } from '../types';
import { v4 as uuid } from 'uuid';

const personas: Persona[] = [];

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
  return persona;
}
