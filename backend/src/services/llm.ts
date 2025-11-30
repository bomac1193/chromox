export async function rewriteLyricsWithLLM(lyrics: string, stylePrompt: string) {
  return `${lyrics}\n// Reimagined via Nebula Tone: ${stylePrompt}`;
}

export async function promptToControls(stylePrompt: string) {
  const hash = Array.from(stylePrompt).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const normalize = (offset: number) => ((hash + offset) % 100) / 100;
  return {
    brightness: normalize(5),
    breathiness: normalize(11),
    energy: normalize(19),
    formant: normalize(23) * 2 - 1,
    vibratoDepth: normalize(31),
    vibratoRate: normalize(37),
    roboticism: normalize(41),
    glitch: normalize(43),
    stereoWidth: normalize(47)
  };
}

const personaAdjectives = [
  'Pixel',
  'Velvet',
  'Glitch',
  'Nebula',
  'Aether',
  'Prismatic',
  'Obsidian',
  'Aurora',
  'Synthetic',
  'Crystal',
  'Cyber',
  'Sakura',
  'Bubblegum',
  'Astral',
  'Lofi',
  'Hyperpop',
  '808',
  'Lo-fi',
  'Reverb-soaked',
  'Chromatic',
  'Hologram'
];

const personaNouns = [
  'Muse',
  'Oracle',
  'Siren',
  'Specter',
  'Pulse',
  'Echo',
  'Flux',
  'Phantom',
  'Nova',
  'Chimera',
  'Kitten',
  'Avatar',
  'Sprite',
  'Nyx',
  'Vibe',
  'Stream',
  'Chanteuse',
  'MC',
  'Fader',
  'Frequenzy',
  'Loop'
];

const vibeDescriptions = [
  'E-girl lullaby machine who speaks in lowercase heart emojis, bounces in 6/8, and layers celestial harmonies like she is live looping on stream',
  'Chronically online siren with uwu husk, glitch-pop adlibs, and mix-notes on how much plate reverb to send to the aux bus',
  'Twitch-night owl weaving “no thoughts head empty” whispers into sparkly sub-bass hugs, sidechained to her own heartbeat BPM',
  'Discord kitten crooner dropping parasocial winks over mascara-stained hyperpop pads while calling out key changes mid-verse',
  'Zoomer dreamweaver mixing “pls hydrate” ASMR tones with cracked Valorant bravado and vocal fry bridges pitched up an octave',
  'E-boy crooner with softboy falsetto, auto-tuned meows, perma-doomscroll ennui, and an 808 that follows his mood swings',
  'Kawaii cyber bard who speedruns heartbreak arcs with stan-Twitter diction, stacking fifths and ninths like she is speedrunning music theory',
  'Neon mod goddess who chants “ratio me daddy” between reverb-drenched harmonics and filter sweeps that mimic modulated vocals',
  'Lo-fi vtuber specter armed with pastel synth stabs, crunchy tape hiss, and synthwave slay energy for late-night setlists',
  'Antihero streamer poet layering keysmash giggles over 200 bpm jellycore drums and shouting out the DAW automation lanes mid-hook'
];

const mononymFixed = [
  'Nyxxie',
  'Luxwave',
  'Voxara',
  'Liminala',
  'Astridaze',
  'Kyarix',
  'Veloria',
  'Riotline',
  'Nebuline',
  'Seraphae',
  'Junoverse',
  'Soniclair',
  'Echoette',
  'Synthara',
  'Lushwave',
  'Ravena'
];

const mononymPrefixes = [
  'Lumi',
  'Vanta',
  'Neon',
  'Pixel',
  'Astra',
  'Velvi',
  'Chroma',
  'Kitsu',
  'Vivi',
  'Echo',
  'Rave',
  'Nyte',
  'Plasma',
  'Halo',
  'Nova',
  'Sable'
];

const mononymSuffixes = [
  'lina',
  'ique',
  'elle',
  'wave',
  'line',
  'essa',
  'phira',
  'night',
  'mori',
  'elle',
  'ora',
  'vy',
  'lithe',
  'flux',
  'aria',
  'rae'
];

function buildMononymName() {
  const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
  if (Math.random() < 0.6) {
    return pick(mononymFixed);
  }
  return `${pick(mononymPrefixes)}${pick(mononymSuffixes)}`;
}

export async function generatePersonaIdea(options: { seed?: string; mononym?: boolean } = {}) {
  const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
  const name = options.mononym ? buildMononymName() : `${pick(personaAdjectives)} ${pick(personaNouns)}`;
  const description = pick(vibeDescriptions);
  return { name, description };
}
