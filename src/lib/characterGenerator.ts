/**
 * Character & Relic Generator
 * Ported from Slayt's Living Character OS (LCOS)
 * Generates mythic AI character profiles with rich names, personalities, and backstories
 * Runs entirely client-side using a seeded PRNG — no backend needed
 */

// ============================================================================
// PRNG
// ============================================================================

export function createRng(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

function randomChoice<T>(rng: () => number, list: T[]): T {
  return list[Math.floor(rng() * list.length)];
}

function randomFloat(rng: () => number, min = 0, max = 1): number {
  return min + rng() * (max - min);
}

// ============================================================================
// ARCHETYPE DATA
// ============================================================================

const ARCHETYPE_SYSTEMS = ['tarot', 'jung', 'kabbalah', 'orisha', 'norse'] as const;

type ArchetypeData = {
  meaning: string;
  coreDesire: string;
  shadow: string[];
  gifts: string[];
};

const JUNG_ARCHETYPES: Record<string, ArchetypeData> = {
  innocent: { meaning: 'The Pure One', coreDesire: 'To experience paradise', shadow: ['denial', 'naivety'], gifts: ['faith', 'optimism', 'purity'] },
  sage: { meaning: 'The Wise One', coreDesire: 'To find truth and understanding', shadow: ['coldness', 'detachment'], gifts: ['wisdom', 'intelligence', 'expertise'] },
  explorer: { meaning: 'The Seeker', coreDesire: 'Freedom to discover oneself', shadow: ['aimlessness', 'alienation'], gifts: ['autonomy', 'ambition', 'authenticity'] },
  outlaw: { meaning: 'The Rebel', coreDesire: 'Revolution or liberation', shadow: ['destruction', 'crime'], gifts: ['radical freedom', 'outrageousness', 'disruption'] },
  magician: { meaning: 'The Transformer', coreDesire: 'To make dreams manifest', shadow: ['manipulation', 'deception'], gifts: ['transformation', 'vision', 'catalyst'] },
  hero: { meaning: 'The Warrior', coreDesire: 'To prove worth through courage', shadow: ['arrogance', 'ruthlessness'], gifts: ['competence', 'courage', 'determination'] },
  lover: { meaning: 'The Romantic', coreDesire: 'Intimacy and connection', shadow: ['obsession', 'jealousy'], gifts: ['passion', 'gratitude', 'appreciation'] },
  jester: { meaning: 'The Trickster', coreDesire: 'To live in the moment with joy', shadow: ['cruelty', 'irresponsibility'], gifts: ['joy', 'humor', 'lightness'] },
  everyman: { meaning: 'The Regular Person', coreDesire: 'Belonging and connection', shadow: ['losing oneself', 'superficiality'], gifts: ['realism', 'empathy', 'lack of pretense'] },
  caregiver: { meaning: 'The Nurturer', coreDesire: 'To protect and care for others', shadow: ['martyrdom', 'enabling'], gifts: ['compassion', 'generosity', 'service'] },
  ruler: { meaning: 'The Sovereign', coreDesire: 'Control and order', shadow: ['tyranny', 'rigidity'], gifts: ['leadership', 'responsibility', 'prosperity'] },
  creator: { meaning: 'The Artist', coreDesire: 'To create enduring value', shadow: ['perfectionism', 'mediocrity'], gifts: ['creativity', 'imagination', 'vision'] },
};

const KABBALAH_ARCHETYPES: Record<string, ArchetypeData> = {
  kether: { meaning: 'The Crown - Divine Will', coreDesire: 'To unite with the infinite', shadow: ['dissolution', 'ego death'], gifts: ['transcendence', 'unity', 'divine purpose'] },
  chokmah: { meaning: 'Wisdom - Creative Force', coreDesire: 'To initiate and create', shadow: ['chaos', 'recklessness'], gifts: ['inspiration', 'creative spark', 'vision'] },
  binah: { meaning: 'Understanding - Form Giver', coreDesire: 'To comprehend and structure', shadow: ['limitation', 'sorrow'], gifts: ['understanding', 'patience', 'form'] },
  chesed: { meaning: 'Mercy - Loving Kindness', coreDesire: 'To give freely', shadow: ['excess', 'chaos through abundance'], gifts: ['love', 'generosity', 'expansion'] },
  geburah: { meaning: 'Severity - Divine Strength', coreDesire: 'To judge and purify', shadow: ['cruelty', 'destruction'], gifts: ['courage', 'discipline', 'boundaries'] },
  tiphareth: { meaning: 'Beauty - Harmony', coreDesire: 'To achieve balance', shadow: ['pride', 'inflation'], gifts: ['harmony', 'beauty', 'healing'] },
  netzach: { meaning: 'Victory - Desire', coreDesire: 'To endure and feel', shadow: ['lust', 'addiction'], gifts: ['passion', 'artistry', 'emotional depth'] },
  hod: { meaning: 'Glory - Intellect', coreDesire: 'To analyze and communicate', shadow: ['dishonesty', 'over-rationalization'], gifts: ['intellect', 'communication', 'magic'] },
  yesod: { meaning: 'Foundation - Dreams', coreDesire: 'To connect and reflect', shadow: ['illusion', 'deception'], gifts: ['dreams', 'psychic ability', 'foundation'] },
  malkuth: { meaning: 'Kingdom - Manifestation', coreDesire: 'To manifest fully', shadow: ['inertia', 'materialism'], gifts: ['stability', 'grounding', 'physical mastery'] },
  thaumiel: { meaning: 'Twin Gods - Division', coreDesire: 'To challenge unity', shadow: ['division', 'duality', 'atheism'], gifts: ['questioning', 'individuation', 'breaking illusions'] },
  ghagiel: { meaning: 'Hinderers - Chaos', coreDesire: 'To disrupt order', shadow: ['confusion', 'hindrance'], gifts: ['disruption of false order', 'chaos magic', 'freedom'] },
  satariel: { meaning: 'Concealers - Hidden', coreDesire: 'To hide truth', shadow: ['concealment', 'mourning'], gifts: ['occult wisdom', 'seeing through veils', 'mystery'] },
  gamchicoth: { meaning: 'Devourers - Hunger', coreDesire: 'To consume', shadow: ['greed', 'waste'], gifts: ['breaking attachments', 'transformation through loss'] },
  golachab: { meaning: 'Burning Bodies - Wrath', coreDesire: 'To burn away weakness', shadow: ['wrath', 'violence'], gifts: ['righteous anger', 'purification', 'warrior spirit'] },
  thagirion: { meaning: 'Disputers - Discord', coreDesire: 'To challenge beauty', shadow: ['ugliness', 'disputation'], gifts: ['seeing through glamour', 'truth in darkness'] },
  harab_serapel: { meaning: 'Ravens of Death', coreDesire: 'To embrace desire', shadow: ['perversion', 'dark emotions'], gifts: ['shadow integration', 'primal power'] },
  samael: { meaning: 'Poison of God', coreDesire: 'To reveal harsh truths', shadow: ['false intellect', 'lies'], gifts: ['sharp discernment', 'cutting through deception'] },
  gamaliel: { meaning: 'Obscene Ones', coreDesire: 'To explore the unconscious', shadow: ['perversion', 'instinct'], gifts: ['dream work', 'unconscious power'] },
  lilith: { meaning: 'Night Specter', coreDesire: 'To claim autonomy', shadow: ['isolation', 'darkness'], gifts: ['independence', 'feminine power', 'shadow embracing'] },
};

const ORISHA_ARCHETYPES: Record<string, ArchetypeData> = {
  obatala: { meaning: 'Sky Father - Purity', coreDesire: 'To create in purity and wisdom', shadow: ['rigidity', 'cold judgment'], gifts: ['wisdom', 'creativity', 'ethical leadership'] },
  ogun: { meaning: 'Iron Lord - Creator/Destroyer', coreDesire: 'To forge and clear paths', shadow: ['violence', 'workaholism'], gifts: ['strength', 'innovation', 'determination'] },
  shango: { meaning: 'Thunder King - Justice', coreDesire: 'To embody righteous power', shadow: ['rage', 'pride'], gifts: ['justice', 'passion', 'charisma'] },
  yemoja: { meaning: 'Ocean Mother - Nurture', coreDesire: 'To protect and nurture life', shadow: ['smothering', 'possessiveness'], gifts: ['unconditional love', 'healing', 'fertility'] },
  oshun: { meaning: 'River Goddess - Love', coreDesire: 'To experience beauty and abundance', shadow: ['vanity', 'jealousy'], gifts: ['love', 'beauty', 'diplomacy', 'prosperity'] },
  eshu: { meaning: 'Crossroads Keeper - Trickster', coreDesire: 'To open and close paths of fate', shadow: ['chaos', 'deception'], gifts: ['communication', 'adaptability', 'fate manipulation'] },
  oya: { meaning: 'Storm Warrior - Transformation', coreDesire: 'To transform through destruction', shadow: ['destruction', 'instability'], gifts: ['transformation', 'rebirth', 'warrior spirit'] },
  orunmila: { meaning: 'Oracle - Destiny', coreDesire: 'To know and share divine wisdom', shadow: ['detachment', 'fate dependency'], gifts: ['prophecy', 'wisdom', 'guidance'] },
  osanyin: { meaning: 'Herb Master - Healing', coreDesire: 'To heal through nature', shadow: ['secrecy', 'withholding'], gifts: ['healing', 'herbalism', 'nature magic'] },
  babalu_aye: { meaning: 'Earth Healer - Suffering', coreDesire: 'To transform suffering', shadow: ['disease', 'isolation'], gifts: ['healing', 'compassion', 'transcendence'] },
  olokun: { meaning: 'Deep Ocean - Mystery', coreDesire: 'To hold the depths of existence', shadow: ['drowning', 'possession'], gifts: ['mystery', 'wealth', 'ancestral wisdom'] },
  aganju: { meaning: 'Volcano Lord - Raw Power', coreDesire: 'To channel primal force', shadow: ['eruption', 'isolation'], gifts: ['raw power', 'wilderness mastery', 'transformation'] },
};

const NORSE_ARCHETYPES: Record<string, ArchetypeData> = {
  odin: { meaning: 'Allfather - Seeker', coreDesire: 'To gain wisdom at any cost', shadow: ['sacrifice of others', 'manipulation'], gifts: ['wisdom', 'magic', 'poetry', 'prophecy'] },
  thor: { meaning: 'Thunder Lord - Protector', coreDesire: 'To protect through strength', shadow: ['brute force', 'temper'], gifts: ['strength', 'protection', 'courage'] },
  freya: { meaning: 'Love Goddess - Sovereign', coreDesire: 'To love and be sovereign', shadow: ['obsession', 'vengeance'], gifts: ['love', 'beauty', 'seidr magic', 'war'] },
  loki: { meaning: 'Shapeshifter - Catalyst', coreDesire: 'To create change through chaos', shadow: ['betrayal', 'destruction'], gifts: ['cunning', 'adaptability', 'transformation'] },
  tyr: { meaning: 'One-Handed - Sacrifice', coreDesire: 'To uphold justice through sacrifice', shadow: ['martyrdom', 'rigidity'], gifts: ['justice', 'honor', 'courage'] },
  heimdall: { meaning: 'Watchman - Guardian', coreDesire: 'To protect through vigilance', shadow: ['paranoia', 'isolation'], gifts: ['perception', 'vigilance', 'foresight'] },
  baldur: { meaning: 'Shining One - Light', coreDesire: 'To embody joy and beauty', shadow: ['vulnerability', 'naivety'], gifts: ['beauty', 'joy', 'peace'] },
  hel: { meaning: 'Death Queen - Threshold', coreDesire: 'To rule the realm between', shadow: ['coldness', 'despair'], gifts: ['death wisdom', 'threshold magic', 'acceptance'] },
  frigg: { meaning: 'All-Mother - Foresight', coreDesire: 'To know and protect fate', shadow: ['powerlessness', 'silence'], gifts: ['foresight', 'domestic magic', 'wisdom'] },
  njord: { meaning: 'Sea Lord - Prosperity', coreDesire: 'To bring abundance', shadow: ['instability', 'homesickness'], gifts: ['prosperity', 'seafaring', 'negotiation'] },
  skadi: { meaning: 'Winter Hunter - Independence', coreDesire: 'To live freely on one\'s terms', shadow: ['coldness', 'vengeance'], gifts: ['independence', 'hunting', 'winter mastery'] },
  idun: { meaning: 'Youth Keeper - Renewal', coreDesire: 'To preserve vitality', shadow: ['dependency', 'vulnerability'], gifts: ['youth', 'renewal', 'healing'] },
};

const TAROT_ARCHETYPES_DATA: Record<string, ArchetypeData> = {
  fool: { meaning: 'The Innocent Wanderer', coreDesire: 'To begin anew with wonder', shadow: ['recklessness', 'naivety'], gifts: ['new beginnings', 'spontaneity', 'faith'] },
  magician: { meaning: 'The Conscious Creator', coreDesire: 'To manifest will into reality', shadow: ['manipulation', 'trickery'], gifts: ['power', 'skill', 'concentration'] },
  high_priestess: { meaning: 'The Keeper of Secrets', coreDesire: 'To know the hidden', shadow: ['repression', 'withdrawal'], gifts: ['intuition', 'mystery', 'inner knowledge'] },
  empress: { meaning: 'The Divine Mother', coreDesire: 'To nurture and create abundance', shadow: ['smothering', 'creative block'], gifts: ['fertility', 'beauty', 'nature'] },
  emperor: { meaning: 'The Father Authority', coreDesire: 'To establish order and structure', shadow: ['tyranny', 'rigidity'], gifts: ['authority', 'structure', 'leadership'] },
  hierophant: { meaning: 'The Bridge to Divine', coreDesire: 'To connect heaven and earth', shadow: ['dogma', 'restriction'], gifts: ['spiritual wisdom', 'tradition', 'conformity'] },
  lovers: { meaning: 'The Sacred Union', coreDesire: 'To achieve union and choose wisely', shadow: ['imbalance', 'indecision'], gifts: ['love', 'harmony', 'values alignment'] },
  chariot: { meaning: 'The Triumphant Warrior', coreDesire: 'To overcome through will', shadow: ['aggression', 'lack of control'], gifts: ['willpower', 'determination', 'victory'] },
  strength: { meaning: 'The Gentle Force', coreDesire: 'To master through compassion', shadow: ['self-doubt', 'raw emotion'], gifts: ['courage', 'patience', 'inner strength'] },
  hermit: { meaning: 'The Illuminated Seeker', coreDesire: 'To find truth within', shadow: ['isolation', 'loneliness'], gifts: ['wisdom', 'solitude', 'guidance'] },
  wheel_of_fortune: { meaning: 'The Cycle Turner', coreDesire: 'To align with cosmic rhythms', shadow: ['bad luck', 'resistance to change'], gifts: ['fate', 'cycles', 'destiny'] },
  justice: { meaning: 'The Balancer', coreDesire: 'To restore balance', shadow: ['harshness', 'unfairness'], gifts: ['fairness', 'truth', 'law'] },
  hanged_man: { meaning: 'The Suspended One', coreDesire: 'To see from a new perspective', shadow: ['martyrdom', 'stalling'], gifts: ['surrender', 'new perspective', 'sacrifice'] },
  death: { meaning: 'The Transformer', coreDesire: 'To transform through endings', shadow: ['stagnation', 'fear of change'], gifts: ['transformation', 'endings', 'rebirth'] },
  temperance: { meaning: 'The Alchemist', coreDesire: 'To find balance and patience', shadow: ['imbalance', 'excess'], gifts: ['balance', 'moderation', 'alchemy'] },
  devil: { meaning: 'The Shadow Self', coreDesire: 'To acknowledge the shadow', shadow: ['bondage', 'materialism'], gifts: ['shadow work', 'liberation', 'earthly power'] },
  tower: { meaning: 'The Lightning Strike', coreDesire: 'To break false structures', shadow: ['disaster', 'upheaval'], gifts: ['revelation', 'awakening', 'liberation'] },
  star: { meaning: 'The Guiding Light', coreDesire: 'To inspire hope', shadow: ['hopelessness', 'disconnection'], gifts: ['hope', 'inspiration', 'serenity'] },
  moon: { meaning: 'The Dream Walker', coreDesire: 'To navigate the unconscious', shadow: ['illusion', 'fear'], gifts: ['intuition', 'dreams', 'the unconscious'] },
  sun: { meaning: 'The Radiant Child', coreDesire: 'To experience joy and success', shadow: ['burn-out', 'arrogance'], gifts: ['joy', 'success', 'vitality'] },
  judgement: { meaning: 'The Awakener', coreDesire: 'To answer the call', shadow: ['self-doubt', 'refusing the call'], gifts: ['rebirth', 'calling', 'absolution'] },
  world: { meaning: 'The Completed One', coreDesire: 'To achieve wholeness', shadow: ['incompletion', 'shortcuts'], gifts: ['completion', 'integration', 'accomplishment'] },
};

// ============================================================================
// APPEARANCE & PERSONALITY DATA
// ============================================================================

const BUILDS = [
  'towering and statuesque', 'lithe and serpentine', 'broad-shouldered and powerful',
  'ethereal and willowy', 'compact and coiled with energy', 'angular and striking',
  'graceful and dancer-like', 'weathered and battle-scarred', 'luminous and otherworldly',
  'imposing yet elegant',
];

const DISTINCTIVE_TRAITS = [
  'eyes that shift between gold and silver', 'geometric tattoos that pulse with inner light',
  'hair that moves like smoke', 'a voice that resonates with harmonic overtones',
  'skin that shimmers with constellation patterns', 'hands marked with ancient sigils',
  'a presence that makes shadows dance', 'scars that glow ember-red in darkness',
  'tears that crystallize upon falling', 'an aura of perpetual twilight',
  'features that blur at the edges of perception', 'a shadow that moves independently',
];

const STYLE_AESTHETICS = [
  'Dark Academia meets Afrofuturism', 'Cyberpunk Oracle', 'Desert Nomad Mystic',
  'Gothic Renaissance', 'Solarpunk Shaman', 'Neo-Victorian Occultist',
  'Astral Minimalist', 'Storm Sage Couture', 'Void Touched Elegance',
  'Ember and Chrome Hybrid', 'Ancestral Tech Fusion', 'Crystalline Prophet',
];

const VOICE_TONES = [
  'velvet thunder - soft yet commanding', 'crystalline clarity with undertones of ancient song',
  'warm embers and whispered secrets', 'rhythmic and hypnotic, like a heartbeat',
  'sharp as obsidian, smooth as honey', 'echoing as if from vast distances',
  'layered harmonics, speaking in chords', 'quiet intensity that commands attention',
  'musical and flowing like water', 'gravelly and grounding like earth',
];

const DEEP_FEARS = [
  'being forgotten by those they protect', 'that their purpose is built on a lie',
  'losing connection to the divine', 'becoming the very thing they fight',
  'the silence of the void claiming them', 'that their sacrifices meant nothing',
  'being unable to save those who matter', 'the erosion of meaning over eternity',
  'that chaos will consume all structure', 'losing their identity to transformation',
];

// ============================================================================
// DATA POOLS
// ============================================================================

const HERITAGE_CULTURES = [
  'african_yoruba', 'african_igbo', 'arabic', 'caucasian_european', 'celtic', 'norse_viking',
];

const CULTURE_LABELS: Record<string, string> = {
  african_yoruba: 'Yoruba', african_igbo: 'Igbo', arabic: 'Arabic',
  caucasian_european: 'European', celtic: 'Celtic', norse_viking: 'Norse',
};

const CULTURE_NAMES: Record<string, { male: string[]; female: string[]; surnames: string[] }> = {
  african_yoruba: {
    male: ['Adeyemi', 'Babatunde', 'Olujinmi', 'Kayode', 'Adeola', 'Olamide'],
    female: ['Amara', 'Yetunde', 'Folake', 'Temitope', 'Adaora', 'Chimamanda'],
    surnames: ['Adebayo', 'Ogunleye', 'Okoya', 'Oshodi', 'Adesanya', 'Okonkwo'],
  },
  african_igbo: {
    male: ['Chinedu', 'Obinna', 'Emeka', 'Ugochukwu', 'Ikenna', 'Nnamdi'],
    female: ['Adaeze', 'Ngozi', 'Chimaka', 'Oluchi', 'Nneka', 'Chiamaka'],
    surnames: ['Okafor', 'Nwosu', 'Eze', 'Madu', 'Okwu', 'Anyanwu'],
  },
  arabic: {
    male: ['Idris', 'Jibril', 'Zayd', 'Karim', 'Rashid', 'Tariq'],
    female: ['Layla', 'Mariam', 'Soraya', 'Zahra', 'Fatima', 'Amira'],
    surnames: ['al-Harith', 'Rahman', 'Sarif', 'Mirza', 'Hakim', 'Nasser'],
  },
  caucasian_european: {
    male: ['Lucian', 'Matthias', 'Sebastian', 'Rene', 'Viktor', 'Aldric'],
    female: ['Elara', 'Vivienne', 'Isolde', 'Rowena', 'Seraphina', 'Morgana'],
    surnames: ['Kingsley', 'Vaughn', 'Sinclair', 'Bellerose', 'Ashford', 'Blackwood'],
  },
  celtic: {
    male: ['Finnian', 'Cormac', 'Ronan', 'Aeron', 'Brennan', 'Ciaran'],
    female: ['Eira', 'Niamh', 'Siobhan', 'Rhiannon', 'Brigid', 'Saoirse'],
    surnames: ['MacCrae', "O'Connell", 'Kavanagh', 'Rowntree', 'Brennan', 'Quinn'],
  },
  norse_viking: {
    male: ['Bjorn', 'Leif', 'Soren', 'Eirik', 'Ragnar', 'Thorin'],
    female: ['Astrid', 'Freya', 'Signe', 'Liv', 'Ingrid', 'Thyra'],
    surnames: ['Stormguard', 'Ulfrik', 'Ragnarsson', 'Skeld', 'Ironside', 'Wolfsbane'],
  },
};

const ORDER_TYPES = [
  'angel', 'demon', 'jinn', 'human', 'titan', 'fae', 'yokai',
  'elemental', 'nephilim', 'archon', 'dragonkin', 'construct', 'eldritch', 'trickster',
];

const ORDER_OFFICES: Record<string, string[]> = {
  angel: ['shield-bearer', 'prophet', 'librarian of echoes', 'witness of storms'],
  demon: ['whisper broker', 'bloodforger', 'temptation smith', 'night marshal'],
  jinn: ['sandseer', 'memory merchant', 'ember courier', 'mirage tactician'],
  human: ['wayfinder', 'blacksmith', 'seer', 'sky courier'],
  titan: ['world-shaper', 'primordial keeper', 'mountain sovereign', 'epoch warden'],
  fae: ['thorn prince', 'moonweaver', 'wild hunt master', 'glamour artist'],
  yokai: ['spirit guardian', 'shapeshifter sage', 'storm herald', 'boundary keeper'],
  elemental: ['flame warden', 'tide caller', 'earthshaker', 'wind whisper'],
  nephilim: ['skyborn warrior', 'giant-blood champion', 'earth shaker', 'star descendant'],
  archon: ['cosmic judge', 'reality weaver', 'demiurge', 'plane overseer'],
  dragonkin: ['wyrm-bound emissary', 'hoard augur', 'skyfire tactician', 'ember oathkeeper'],
  construct: ['clockwork adjutant', 'axiom engraver', 'lattice sentinel', 'memory ward'],
  eldritch: ['void cantor', 'dream fracture oracle', 'horizon unravelist', 'starless witness'],
  trickster: ['clown', 'troll', 'jester', 'prankster'],
};

const ORDER_THEMES: Record<string, string> = {
  angel: 'celestial guardianship and sacred duty',
  demon: 'forbidden compacts and hidden power',
  jinn: 'desert winds, whispers, and smokeless flame',
  human: 'mortal ingenuity and resilient courage',
  titan: 'primordial strength that steadies worlds',
  fae: 'wild glamour and moonlit intrigue',
  yokai: 'spirit realms where shapes shift and teach',
  elemental: 'the raw chorus of earth, air, fire, and water',
  nephilim: 'sky-born might that bridges mortal and divine',
  archon: 'cosmic law and the architecture of reality',
  dragonkin: 'wyrmfire covenants and hoarded wisdom',
  construct: 'axiomatic purpose and timeless vigilance',
  eldritch: 'starless insight etched along the void',
  trickster: 'blasphemous mirth marrying sacred vows to chaotic pranks',
};

const TAROT_ARCHETYPES = [
  'fool', 'magician', 'high_priestess', 'empress', 'emperor', 'hierophant',
  'lovers', 'chariot', 'strength', 'hermit', 'wheel_of_fortune', 'justice',
  'hanged_man', 'death', 'temperance', 'devil', 'tower', 'star', 'moon',
  'sun', 'judgement', 'world',
];

const NAME_SYLLABLES = {
  prefixes: [
    'Ae', 'Al', 'An', 'Ar', 'As', 'Ba', 'Be', 'Br', 'Ca', 'Ce', 'Chi', 'Ci', 'Da', 'De', 'Di',
    'El', 'Em', 'Er', 'Es', 'Fa', 'Fe', 'Ga', 'Gi', 'Ha', 'He', 'Id', 'Il', 'In', 'Is', 'Ja',
    'Ka', 'Ke', 'Ki', 'Ko', 'La', 'Le', 'Li', 'Lo', 'Lu', 'Ma', 'Me', 'Mi', 'Mo', 'Na', 'Ne',
    'Ni', 'No', 'Nu', 'Ob', 'Og', 'Ol', 'On', 'Or', 'Os', 'Ra', 'Re', 'Ri', 'Ro', 'Sa', 'Se',
    'Sh', 'Si', 'So', 'Ta', 'Te', 'Th', 'Ti', 'To', 'Tr', 'Ty', 'Ul', 'Um', 'Un', 'Va', 'Ve',
    'Vi', 'Vo', 'Wa', 'We', 'Ya', 'Ye', 'Yi', 'Za', 'Ze', 'Zi', 'Zo',
  ],
  middles: [
    'da', 'de', 'di', 'do', 'du', 'la', 'le', 'li', 'lo', 'lu', 'na', 'ne', 'ni', 'no', 'nu',
    'ra', 're', 'ri', 'ro', 'ru', 'sa', 'se', 'si', 'so', 'su', 'ta', 'te', 'ti', 'to', 'tu',
    'va', 've', 'vi', 'vo', 'vu', 'ka', 'ke', 'ki', 'ko', 'ku', 'ma', 'me', 'mi', 'mo', 'mu',
    'ba', 'be', 'bi', 'bo', 'bu', 'ga', 'ge', 'gi', 'go', 'gu', 'sha', 'shi', 'sho', 'cha',
    'chi', 'cho', 'tha', 'thi', 'tho', 'zha', 'zhi', 'zho', 'nda', 'ndi', 'mba', 'mbi',
  ],
  suffixes: [
    'a', 'ah', 'an', 'ar', 'as', 'ax', 'el', 'en', 'er', 'es', 'eth', 'ia', 'id', 'il', 'in',
    'ion', 'ir', 'is', 'ith', 'ix', 'o', 'on', 'or', 'os', 'oth', 'ox', 'u', 'uk', 'un', 'ur',
    'us', 'uth', 'yn', 'yr', 'ys', 'ae', 'ai', 'ao', 'ei', 'eo', 'io', 'iu', 'ou', 'ua', 'ue',
  ],
};

const BLENDED_HERITAGE_LABELS = [
  'Cosmopolitan', 'Wanderer', 'Nomadic', 'Multiversal', 'Transcendent',
  'Unbound', 'Liminal', 'Crossroads-born', 'Wayward', 'Starwoven',
  'Dreamforged', 'Veilcrossed',
];

const MYTHICAL_BEASTS = [
  'Griffin', 'Phoenix', 'Dragon', 'Sphinx', 'Chimera', 'Manticore', 'Basilisk',
  'Hydra', 'Pegasus', 'Unicorn', 'Cerberus', 'Minotaur', 'Centaur', 'Kraken',
  'Leviathan', 'Behemoth', 'Thunderbird', 'Roc', 'Wyvern', 'Cockatrice',
  'Kitsune', 'Tengu', 'Yokai', 'Tanuki', 'Qilin', 'Fenghuang', 'Naga',
  'Garuda', 'Simurgh', 'Lamassu', 'Ammit', 'Anubis', 'Sobek', 'Quetzal',
  'Selkie', 'Kelpie', 'Banshee', 'Dryad', 'Nymph', 'Sylph', 'Salamander',
  'Ifrit', 'Djinn', 'Golem', 'Wraith', 'Shade', 'Specter', 'Revenant',
  'Direwolf', 'Shadowcat', 'Stormhawk', 'Voidwalker', 'Starweaver', 'Moonbeast',
  'Sunbird', 'Nightcrawler', 'Frostfang', 'Emberwing', 'Thornback', 'Ironhide',
];

const REAL_ANIMALS = [
  'Wolf', 'Lion', 'Tiger', 'Panther', 'Leopard', 'Jaguar', 'Lynx', 'Fox',
  'Bear', 'Hawk', 'Eagle', 'Falcon', 'Owl', 'Raven', 'Crow', 'Vulture',
  'Shark', 'Viper', 'Cobra', 'Python', 'Scorpion', 'Spider', 'Mantis',
  'Stag', 'Elk', 'Moose', 'Horse', 'Stallion', 'Mare', 'Ram', 'Bull',
  'Elephant', 'Rhino', 'Gorilla', 'Whale', 'Dolphin', 'Orca', 'Seal',
  'Swan', 'Crane', 'Heron', 'Peacock', 'Kingfisher', 'Jay', 'Magpie',
  'Sparrow', 'Finch', 'Robin', 'Wren', 'Lark', 'Nightingale', 'Dove',
  'Salamander', 'Newt', 'Frog', 'Toad', 'Turtle', 'Tortoise', 'Gecko',
  'Chameleon', 'Iguana', 'Monitor', 'Crocodile', 'Alligator',
  'Moth', 'Butterfly', 'Beetle', 'Ant', 'Bee', 'Wasp', 'Dragonfly',
  'Cricket', 'Cicada', 'Firefly', 'Ladybug', 'Scarab',
];

const ALL_ANIMALS = [...MYTHICAL_BEASTS, ...REAL_ANIMALS];

// ============================================================================
// CORE AESTHETIC SYMBOLS
// ============================================================================

const CORE_SYMBOLS: Record<string, { prefix: string[]; suffix: string[]; wrap: [string, string][] }> = {
  drowned_mall: {
    prefix: ['永', '夢', '新', '愛', '空', '星', '月', '光', '幻', '神'],
    suffix: ['永', '夢', '新', '愛', '空', '星', '月', '光', '幻', '神'],
    wrap: [['永 ', ' 夢'], ['｢', '｣'], ['【', '】'], ['「', '」'], ['『', '』'], ['〖', '〗']],
  },
  hex_garden: {
    prefix: ['☽', '✧', '☆', '⁂', '✦', '◈', '❋', '✵', '❂', '☾'],
    suffix: ['☾', '✧', '☆', '⁂', '✦', '◈', '❋', '✵', '❂', '☽'],
    wrap: [['☽ ', ' ☾'], ['✧ ', ' ✧'], ['⁂ ', ' ⁂'], ['✦ ', ' ✦'], ['☆ ', ' ☆']],
  },
  sugar_rot: {
    prefix: ['xX', '~', '★', '♥', '✖', '☆', '♪', '⚡', '✿', '❤'],
    suffix: ['Xx', '~', '★', '♥', '✖', '☆', '♪', '⚡', '✿', '❤'],
    wrap: [['xX', 'Xx'], ['~', '~'], ['★', '★'], ['xX★', '★Xx'], ['♥', '♥'], ['x', 'x']],
  },
  dead_channel: {
    prefix: ['†', '‡', '∆', 'Ω', 'Ξ', '◊', '▼', '■', '●', '◆'],
    suffix: ['†', '‡', '∆', 'Ω', 'Ξ', '◊', '▲', '■', '●', '◆'],
    wrap: [['†', '†'], ['∆', '∆'], ['▼', '▲'], ['◊', '◊'], ['‡', '‡'], ['Ω', 'Ω']],
  },
  spore_drift: {
    prefix: ['✿', '❀', '☘', '⚘', '❁', '✾', '❃', '✤', '✥', '❋'],
    suffix: ['✿', '❀', '☘', '⚘', '❁', '✾', '❃', '✤', '✥', '❋'],
    wrap: [['✿ ', ' ✿'], ['❀ ', ' ❀'], ['☘ ', ' ☘'], ['⚘ ', ' ⚘'], ['✾ ', ' ✾']],
  },
  wrong_room: {
    prefix: ['▲', '◯', '◇', '⌂', '░', '▓', '◉', '◎', '☐', '⊕'],
    suffix: ['▲', '◯', '◇', '⌂', '░', '▓', '◉', '◎', '☐', '⊕'],
    wrap: [['▲▲ ', ' ▲▲'], ['◇ ', ' ◇'], ['░░ ', ' ░░'], ['⌂ ', ' ⌂'], ['◯ ', ' ◯']],
  },
  bone_clean: {
    prefix: ['—', '·', '|', '/', '\\'],
    suffix: ['—', '·', '|', '/', '\\'],
    wrap: [['— ', ' —'], ['· ', ' ·'], ['| ', ' |'], ['/ ', ' /'], ['. ', ' .']],
  },
  lambda: {
    prefix: ['Σ', 'Λ', 'Δ', 'Π', 'Ψ', 'Φ', 'Θ', 'Ω', 'ℵ', '∂'],
    suffix: ['Σ', 'Λ', 'Δ', 'Π', 'Ψ', 'Φ', 'Θ', 'Ω', 'ℵ', '∂'],
    wrap: [['λ(', ')'], ['Σ{', '}'], ['∀ ', ' ∃'], ['⟨', '⟩'], ['∫ ', ' dx'], ['Λ.', '.Ω']],
  },
};

function applyCoreStyle(rng: () => number, name: string, core: string): string {
  const symbols = CORE_SYMBOLS[core];
  if (!symbols) return name;
  const style = Math.floor(rng() * 10);
  switch (style) {
    case 0: { const [left, right] = randomChoice(rng, symbols.wrap); return `${left}${name}${right}`; }
    case 1: return `${randomChoice(rng, symbols.prefix)} ${name}`;
    case 2: case 3: return `${name} ${randomChoice(rng, symbols.suffix)}`;
    case 4: return `${name} ${randomChoice(rng, symbols.suffix)}${randomChoice(rng, symbols.suffix)}`;
    default: return name;
  }
}

// ============================================================================
// VARIANCE
// ============================================================================

const LETTER_SUBS_MILD: Record<string, string[]> = {
  a: ['@', 'α'], e: ['3', 'ε'], i: ['1', 'ι'], o: ['0', 'ø'],
  s: ['$', '§'], t: ['+', '†'], n: ['η', 'ñ'], l: ['ℓ', '|'],
};

const LETTER_SUBS_HEAVY: Record<string, string[]> = {
  a: ['@', 'α', 'Δ', '∀', 'ä', 'â'], e: ['3', 'ε', '€', 'ξ', 'ë'],
  i: ['1', 'ι', '!', '¡', 'ï'], o: ['0', 'ø', 'Θ', '◯', 'ö'],
  s: ['$', '§', '5', 'Σ', 'ß'], t: ['+', '†', '‡', '7', 'τ'],
  n: ['η', 'ñ', 'π', '∩'], l: ['ℓ', '|', '£', 'Λ', '1'],
  r: ['®', 'ℝ', 'я'], c: ['(', '¢', '©'], g: ['9', 'ğ'],
  b: ['ß', '6', '♭'], d: ['∂', 'ð'], f: ['ƒ', 'φ'],
  h: ['#', 'ħ'], k: ['κ', 'ĸ'], m: ['μ', '♏'], p: ['ρ', '¶'],
  u: ['µ', 'ü', 'ú', '∪'], v: ['√', '∨'], w: ['ω', 'ψ'],
  x: ['×', '✖', 'χ'], y: ['¥', 'ψ', 'ÿ'], z: ['ζ', '2'],
};

const SPACING_CHARS = [' ', ' ', '\u2009', '\u200A', '\u2006'];

export function applyVariance(rng: () => number, name: string, variance: number): string {
  if (variance <= 0) return name;
  const v = variance / 100;
  let result = '';
  let wordStart = true;

  for (let i = 0; i < name.length; i++) {
    const ch = name[i];
    const lower = ch.toLowerCase();

    if (ch === ' ') { result += ch; wordStart = true; continue; }

    if (wordStart) {
      result += ch;
      wordStart = false;
      if (v > 0.15 && i < name.length - 1 && name[i + 1] !== ' ') {
        if (rng() < v * 0.35) result += randomChoice(rng, SPACING_CHARS);
      }
      continue;
    }

    const replaceChance = v * 0.6;
    if (rng() < replaceChance) {
      const pool = v > 0.5 ? LETTER_SUBS_HEAVY : LETTER_SUBS_MILD;
      const subs = pool[lower];
      if (subs) {
        result += randomChoice(rng, subs);
        if (v > 0.4 && rng() < v * 0.3) result += randomChoice(rng, SPACING_CHARS);
        continue;
      }
    }

    if (v > 0.3 && rng() < v * 0.25 && ch.match(/[a-zA-Z]/)) {
      result += ch === ch.toUpperCase() ? ch.toLowerCase() : ch.toUpperCase();
    } else {
      result += ch;
    }

    if (v > 0.15 && i < name.length - 1 && ch !== ' ' && name[i + 1] !== ' ') {
      const spacingChance = v * 0.35;
      if (rng() < spacingChance) {
        if (v > 0.7) {
          const spacer = randomChoice(rng, SPACING_CHARS);
          result += spacer.repeat(Math.floor(rng() * 2) + 1);
        } else {
          result += randomChoice(rng, SPACING_CHARS);
        }
      }
    }
  }

  if (v > 0.75) {
    const glitchGlyphs = ['̸', '̷', '̶', '̴', '̵', '͓', '͎', '͙', '͚', '͖'];
    let glitched = '';
    for (let i = 0; i < result.length; i++) {
      glitched += result[i];
      if (rng() < v * 0.15 && result[i].match(/[a-zA-Z@#$%&]/)) {
        glitched += randomChoice(rng, glitchGlyphs);
      }
    }
    result = glitched;
  }

  return result;
}

// ============================================================================
// RELIC DATA
// ============================================================================

const RELIC_OBJECTS: Record<string, string[]> = {
  natural: [
    'a petrified tree branch', 'a river stone that hums', 'a feather from an unknown bird',
    'a seed that never grows', 'a jar of perpetual rain', 'a fossilized flower',
    'a vial of moonlight', 'a splinter of lightning-struck oak', 'roots that move when unobserved',
    'a shell that echoes distant seas', 'a pinecone that smells of futures',
    'a leaf that changes with moods', 'a bone from something that never lived',
    'an acorn containing a whole forest', 'a thorn from the first rose',
  ],
  furniture: [
    'an IKEA chair that whispers assembly instructions', 'a Victorian settee that remembers its sitters',
    'a three-legged stool from a witch\'s kitchen', 'a mirror that shows yesterday',
    'a grandfather clock frozen at a significant hour', 'a doorknob from a house that no longer exists',
    'a chandelier crystal that catches impossible light', 'a drawer that opens to different rooms',
    'a wardrobe key to nowhere', 'a rocking chair that moves on its own',
    'a lamp that casts shadows of the future', 'a table that sets itself for ghosts',
  ],
  fashion: [
    'Harrods stilettos that never touch the ground', 'a Chanel scarf woven with sigils',
    'vintage Levi\'s from a parallel 1955', 'a Hermès bag that holds more than possible',
    'opera gloves that remember every hand they\'ve touched', 'a top hat that tips itself to the worthy',
    'a monocle that sees through lies', 'cufflinks made from meteorite',
    'a silk tie that tightens around betrayers', 'a brooch containing a trapped whisper',
    'boots that have walked through dreams', 'a coat that adjusts to any climate or dimension',
    'vintage spurs from a wheelbarrow that crossed the Styx',
    'a veil worn at seven weddings and three funerals', 'a belt buckle shaped like a closed eye',
  ],
  strange: [
    'a compass that points to regret', 'a music box playing songs not yet written',
    'a photograph of someone you\'ll meet', 'a candle that burns memories',
    'a typewriter that finishes your sentences', 'a radio tuned to frequencies between stations',
    'a pocket watch that counts down to something', 'a snow globe containing a real blizzard',
    'a telephone connected to the recently departed', 'a locket holding a heartbeat',
    'a book whose pages rewrite themselves', 'a chess piece that moves between games',
    'a vinyl record of silence', 'a bottle of preserved argument',
    'a jar of someone else\'s tears', 'a key that fits locks not yet made',
  ],
  mundane_twisted: [
    'a coffee mug that\'s always the wrong temperature', 'a pen that writes in extinct languages',
    'a pair of glasses that show auras', 'a wallet containing currency from dead empires',
    'a phone that receives calls from alternate selves', 'a lighter that ignites emotions',
    'an umbrella that repels more than rain', 'a wristwatch that tracks lifespans',
    'a notebook of automatic writing', 'a USB drive containing deleted realities',
    'a thermos of liquid time', 'a pillbox of crystallized decisions',
  ],
  symbolic: [
    'a broom that sweeps away sins', 'a tambourine with a bell that speaks prophecy',
    'a hand mirror stolen from a sibyl', 'a chalice that turns water to oaths',
    'an hourglass filled with someone else\'s time', 'a spindle that weaves fate',
    'a scale that weighs intentions', 'a lantern lit by a dying star',
    'a bell that rings for the unborn', 'a quill dipped in finality',
    'a mortar and pestle that grinds memories', 'a sickle that harvests words',
    'a thurible that burns regrets', 'an ankh that unlocks the dead',
    'a crystal ball showing roads not taken', 'a tarot card that changes its meaning',
  ],
  stolen_from_beings: [
    'a flute stolen from a satyr', 'a mirror pried from an archon\'s throne',
    'a thread from the Fates\' loom', 'a coin from Charon\'s collection',
    'a feather from Thoth\'s wing', 'ink from a demon\'s contract',
    'a tooth freely given by a dragon', 'a fingernail from a sleeping titan',
    'a tear crystallized from an angel', 'a whisper caught from a jinn',
    'a shadow severed from a trickster', 'a scale from Anubis\' balance',
    'a string from Orpheus\' lyre', 'a page torn from the Akashic records',
    'dust from the Sandman\'s pouch', 'a splinter from Yggdrasil',
  ],
  tools: [
    'a hammer that builds and destroys equally', 'a needle that sews souls',
    'scissors that cut ties', 'a chisel that carves truth from stone',
    'a saw that cuts through time', 'an awl that pierces veils',
    'pliers that grip the intangible', 'a level that measures worth',
    'a file that smooths rough karma', 'a trowel that buries secrets',
    'an axe that felled the world tree\'s branch', 'a wrench that adjusts reality',
  ],
  vessels: [
    'an amphora containing the last echo', 'a gourd holding liquid dreams',
    'a cauldron that stirs itself', 'a teapot that pours what you need',
    'a basin for washing away names', 'a censer burning forgotten prayers',
    'a flask of distilled starlight', 'an urn of ashes that speak',
    'a bottle with a message from yourself', 'a grail stained with something holy',
    'a pitcher that never empties of sorrow', 'a box that shouldn\'t be opened',
  ],
};

const RELIC_ORIGINS = [
  'inherited from a stranger who knew their name', 'found in a place that shouldn\'t exist',
  'won in a game against something ancient', 'gifted by a god in disguise',
  'pulled from a dream that refused to end', 'discovered the moment they were born',
  'traded for a memory they can\'t recall', 'materialized during their first death',
  'stolen from a museum of impossible things', 'left behind by their future self',
  'grown from their shadow', 'assembled from fragments of coincidence',
];

const RELIC_CATEGORIES = [
  'natural', 'furniture', 'fashion', 'strange', 'mundane_twisted',
  'symbolic', 'stolen_from_beings', 'tools', 'vessels',
];

const RELIC_ERA_ARCHAIC = {
  objects: [
    'clay tablet, language dead', 'bronze mirror showing elsewhere',
    'amphora, still sealed, still humming', 'the spindle—yes, that one',
    'a forgotten king\'s crown of thorns', 'the first weaver\'s needle, threaded',
    'saint\'s skull, hollowed into chalice', 'prophet\'s tooth, roots and all',
    'flint knife. It remembers.', 'scroll. It unrolls forever.', 'shroud. It refuses.',
    'wax seal broken between gods', 'incense still burning from Eden',
    'quill plucked mid-flight from an angel', 'pilgrimage staff, walked itself to hell',
    'one astrolabe, stars extinct', 'mosaic tile: Babylon, 2nd dynasty',
    'canopic jar (contents: present)', 'codex, dragonhide binding, unread',
    'sundial casting yesterday\'s shadow', 'loom shuttle trailing silver fate',
    'singing bowl that won\'t stop', 'the third key (first two: missing)',
    'half a clay mask, expression unknown', 'rope from a bell that rang once',
    'altar stone, still warm', 'funeral coins for a living man',
    'wine turned to something else', 'door hinge from a temple that walked away',
    'bone dice, loaded toward doom', 'hourglass sand flowing upward', 'torch that casts darkness',
  ],
  givers: [
    'a blind god', 'a temple priestess', 'a dying oracle', 'a hermit saint',
    'a wandering prophet', 'a deposed pharaoh', 'a sibyl in her cave',
    'a keeper of sacred flames', 'a monk who took vows of impossibility',
    'a witch burned seven times', 'a knight who broke every oath',
    'a queen who married death', 'a scribe of forbidden texts',
    'an alchemist seeking the stone', 'a flagellant walking to Jerusalem',
    'a virgin sacrificed to volcanoes', 'a shaman of extinct peoples',
    'a druid at the last grove', 'a pope who never existed', 'an emperor buried alive',
  ],
  contexts: [
    'at a horse race between dead kings', 'in a library that burns every midnight',
    'at the crossroads where three empires fell', 'in a garden grown from tears',
    'at a masquerade where no one wore faces', 'during an auction of forgotten things',
    'in a cathedral built by spiders', 'at the wedding of two storms',
    'during a trial held in dreams', 'at a feast where the food ate back',
    'in a temple before it was ruined', 'during the fall of a great city',
    'at the signing of a cursed treaty', 'in a crypt beneath forgotten mountains',
    'during the last mass of a dead religion', 'at a coronation attended by ghosts',
    'in a scriptorium copying lies', 'during an eclipse that lasted years',
    'at a ritual that should never have worked', 'in the tomb of something still alive',
  ],
};

const RELIC_ERA_MODERN = {
  objects: [
    'half a lottery ticket, winning', 'three AA batteries, one dead',
    'someone\'s left AirPod, still playing', 'the wrong half of a torn photo',
    'your childhood teddy bear\'s missing eye', 'a stranger\'s house key that fits your door',
    'the phone number you were too afraid to call', 'a charger that fits nothing you own',
    'an app icon for something uninstalled', 'a password written down for an account that doesn\'t exist',
    'IKEA furniture missing one screw', 'a Polaroid developing into the future',
    'Nokia 3310, one voicemail, never played', 'Tupperware still holding last Tuesday',
    'vape smoke spelling warnings', 'USB stick: DO NOT OPEN',
    'dropped car keys to somewhere else', 'cracked phone screen showing different cracks each time',
    'expired coupon for eternal youth', 'a laptop charger borrowed and never returned',
    'gift card with exactly enough for nothing', 'library book seventeen years overdue',
    'one Croc, men\'s size 11, immortal', 'CCTV footage of yesterday\'s tomorrow',
    'parking meter frozen at 0:00', 'suspiciously heavy fidget spinner',
    'uncomfortably warm doorknob', 'a perfectly normal lamp (wrong)',
    'a Roomba that witnessed something',
    'Ring doorbell footage of you arriving home (you weren\'t there)',
    'Kindle full of books with your name as author', 'a QR code that scans you back',
    'receipt for a purchase you don\'t remember making',
    'lanyard for CONFERENCE 2019 (it\'s always 2019)',
    'Post-it note in your handwriting you didn\'t write',
    'plastic bag orbiting a streetlight since 2003',
    'yoga mat that unrolls into somewhere else',
  ],
  givers: [
    'a one-armed butcher', 'a tattoo artist with no skin',
    'a barista who remembers every order', 'an Uber driver between worlds',
    'a security guard at an empty mall', 'a dental hygienist who speaks in tongues',
    'a personal trainer for the deceased', 'a wedding DJ playing at funerals',
    'a real estate agent selling haunted properties', 'a life coach for the already damned',
    'an influencer with zero followers', 'a food blogger who eats memories',
    'a yoga instructor bent wrong', 'a podcaster interviewing the dead',
    'a dog walker whose dogs are invisible', 'a locksmith who opens wrong doors',
    'a notary public for demonic contracts', 'a Lyft driver to the underworld',
    'a telemarketer calling from beyond', 'an IT guy fixing reality',
    'a crossing guard at impossible intersections', 'a plumber unclogging the river Styx',
  ],
  contexts: [
    'at a Black Friday sale at 3am', 'in a parking garage that goes down forever',
    'during a gender reveal that summoned something', 'at an IKEA after closing time',
    'in a 24-hour laundromat at the wrong hour', 'during a Zoom call with no participants',
    'at a self-checkout that became sentient', 'in an Airbnb with too many rooms',
    'during an HOA meeting about the occult', 'at a drive-through between dimensions',
    'in a WeWork for dead startups', 'during a TED talk on unspeakable things',
    'at an escape room with no exit', 'in a Spirit Halloween that never closed',
    'during a podcast recording in a void', 'at a farmer\'s market selling intangibles',
    'in a co-working space for demons', 'during an open mic night in purgatory',
    'at a CrossFit box for the damned', 'in a CVS at the end of time',
  ],
};

const RELIC_ERA_HYBRID = {
  objects: [
    // brand × ancient object
    'one-legged Primark mannequin, posed in contrapposto since the Ptolemaic dynasty',
    'Starbucks bando ID pin — employee of the month, March 1347',
    'Tesco Clubcard melted onto a Sumerian clay tablet, 47,000 points accrued',
    'Sports Direct mug containing exactly 900ml of the river Lethe',
    'a Greggs steak bake carbon-dated to the Mesolithic period',
    'a JD Sports drawstring bag holding three of Odin\'s teeth',
    'a Lidl middle aisle zweihander with a reduced sticker on the pommel',
    'a Nando\'s black card, signed in Demotic script by Imhotep',
    'a Home Bargains thurible marked down from £3 to £1.50, smoke still rising',
    'a Shein kaftan with Enochian sigils stitched into the care label',
    'a Crocs x Delphi Oracle collab — men\'s 9, women\'s 11, fate\'s one-size',
    // tech × sacred
    'a Ring doorbell bolted to a 4th-century reliquary, motion-detecting the divine',
    'AirPods Max carved from the inner ear bones of a canonised whale',
    'a Kindle Paperwhite loaded exclusively with the Dead Sea Scrolls and one Jamie Oliver recipe',
    'a Fitbit Charge 6 synced to the wearer\'s reincarnation cycle, 14,000 lives logged',
    'a Dyson V15 that hoovers up original sin (bagless)',
    'a Ring Fit controller that belonged to Gilgamesh, sweat still damp',
    'a USB-C cable that only charges objects consecrated before 1054 AD',
    'an iPhone 4S with one voicemail from Cassandra, never played',
    'a broken iPad with a crack that exactly traces the Nile Delta',
    'a Bluetooth speaker that pairs only with Tibetan singing bowls',
    'a sat-nav that routes exclusively through liminal spaces and Zones 4-6',
    // food × relic
    'a McDonald\'s Happy Meal toy: Anubis (2003, limited run, jackal head missing)',
    'a KFC bargain bucket containing the femur of a Merovingian king',
    'a Pot Noodle cup inscribed with the 99 names of God in Sharpie',
    'a Subway footlong sub, fillings: myrrh, frankincense, Southwest sauce',
    'a Pret loyalty card stamped once by each of the twelve apostles',
    'a Cornetto wrapper from 1979 that unfolds into a papal bull',
    // garment × epoch clash
    'a Supreme x Zoroastrian fire temple hoodie, tagged but unwearable near water',
    'a pair of Nike Dunks resoled with leather from a Viking longship',
    'a Primark dressing gown that is also, technically, a burial shroud',
    'a hi-vis vest screen-printed with the Book of the Dead, chapter 125',
    'a North Face puffer jacket stuffed with goose down from the Stymphalian birds',
    'a New Era fitted cap with a third eye embroidered where the logo should be',
    // document × impossible
    'a WhatsApp voice note from Moses — 7 minutes, mostly wind',
    'an Argos catalogue of forbidden relics, laminated, page 47 is warm',
    'a parking ticket issued to Elijah\'s chariot, still unpaid',
    'a gym membership to Valhalla, direct debit active, no cancellation clause',
    'a contactless Ankh — tap to pay, tap to resurrect',
    'an Uber rating of 4.2 stars left by the ferryman of the dead',
    'a Spotify Wrapped for 33 AD: top artist "Silence", 8,760 hours',
    'a Google Maps pin dropped on the Garden of Eden (currently a Halfords)',
    'a Deliveroo order — 1x holy communion, extra wine, ETA: ∞',
    'a TripAdvisor review of Purgatory: "mid. no WiFi. 2 stars"',
    // specific weird
    'a single Reebok Classic, men\'s 8, found inside a canopic jar in 2019',
    'three Duracell batteries wired into a 6th-century Byzantine icon — it blinks',
    'a Yankee Candle (scent: Golgotha) that has been burning since 1996',
    'a Costco membership for a household of 144,000',
    'a Roomba that completed a full circuit of the Labyrinth of Knossos',
    'an IKEA KALLAX shelf unit containing the Akashic records, alphabetised',
    'a vape pen loaded with pulverised cathedral incense, 5000 puffs, 0mg nicotine',
    'a self-checkout receipt from Sainsbury\'s timestamped to the exact moment of the Big Bang',
    'a Halfords bike lock securing the gates of the underworld (combination: 0000)',
    'a Poundland reading glasses prescription that reveals invisible ink on any surface',
    'a Wetherspoons menu where item 7 is "the blood of a covenant" (£3.49 with a meal)',
  ],
  givers: [
    'a temple priestess on her Greggs lunch break, cheese and onion in hand',
    'an Uber driver whose previous gig was ferrying souls across the Styx, 4.7 stars',
    'an Oracle of Delphi who pivoted to TikTok astrology, 340k followers',
    'a druid pulling a 12-hour nightshift at the Amazon fulfilment centre in Rugeley',
    'a wandering prophet whose Patreon has 11 subscribers',
    'a knight errant doing DoorDash on a moped he calls Rocinante',
    'a sibyl selling incense and phone cases from a market stall in Peckham',
    'a Norse berserker who is also a qualified CBT therapist',
    'an alchemist with a 98% positive feedback rating on Depop',
    'a hermit saint who went viral for a mukbang and now has 200k followers',
    'a witch selling "decorative" candles on Etsy that keep arriving lit',
    'a deposed pharaoh working the night security shift at Westfield Stratford',
    'a valkyrie who drives a white Transit van for a living',
    'a Capuchin monk who broke his vow of silence specifically to start a true crime podcast',
    'Anansi, doing a 20-minute set at the Edinburgh Fringe to 9 people',
    'a seraph on a zero-hours contract at a temp agency called "Celestial Staffing Solutions"',
    'a jinn who runs a barbershop in Tooting where every cut changes your fate',
    'a centaur who teaches spin class in Shoreditch, Tuesdays and Thursdays',
    'a funeral director in Lewisham who occasionally recognises the deceased from a previous life (his own)',
    'a corner shop uncle in Dalston who abdicated a throne in 1987 and has never mentioned it',
    'a minotaur working as a bouncer at a club that doesn\'t technically exist',
    'a retired archangel tutoring GCSE maths in Croydon',
    'a banshee who does ASMR on YouTube, 2 million subscribers, zero speaking videos',
    'a Mesopotamian scribe now employed as a data entry clerk at HMRC',
    'a selkie who left her skin at a dry cleaner\'s in 2014 and never went back',
  ],
  contexts: [
    'at an IKEA in Tottenham built directly on a ley line intersection, aisle 7',
    'in the Lidl middle aisle in a branch that exists 3 seconds ahead of local time',
    'during a Black Friday doorbuster at a retail park erected over a plague pit',
    'at Morley\'s chicken shop on Old Kent Road, which was a shrine to Mithras until 1997',
    'in the Tesco Express on Kingsland Road where self-checkout machine 4 speaks fluent Aramaic',
    'during a car boot sale held inside a Neolithic barrow mound near Avebury',
    'at a NCP car park in Bristol built on the footprint of a Roman amphitheatre, level -3',
    'in the McDonald\'s drive-through on the A406 that briefly phases between this world and the next at 3:17am',
    'at a PureGym in Bermondsey constructed directly over an unmarked crypt',
    'during a Zoopla house viewing of a basement flat in Hackney that predates the street by 900 years',
    'in a Primark changing room in Marble Arch where cubicle 6\'s mirror shows your previous incarnation',
    'at a nail salon in Brixton built over a forgotten oracle pit, gel extensions half-price Wednesdays',
    'during a pub quiz at the Shipwright\'s Arms, a building older than the English language',
    'at a 24-hour laundrette in Camberwell where machine 3 washes sins (delicates cycle)',
    'in the Aldi on Streatham High Road that replaced a Cistercian monastery in 2011, same opening hours',
    'at a bus stop on the A2 near Dartford that only renders into physical space on the equinoxes',
    'during a Year 6 parents\' evening at a primary school in Woolwich whose playing field is a burial mound',
    'in a barbershop on Rye Lane where chair 2 faces magnetic south and the underworld simultaneously',
    'at the food court in the Trafford Centre, built over the refurbished ruins of a flooded Atlantean outpost',
    'during a fire alarm at a call centre in Slough that handles complaints for the recently deceased',
    'at a Wetherspoons in a converted chapel where the urinals are former baptismal fonts',
    'in a Halfords on the A3 that was a Druidic grove until the car park was laid in 1974',
    'at a Costa Coffee inside a hospital that occupies the exact coordinates of a medieval leper colony',
    'during a zumba class in a leisure centre in Enfield that shares a wall with a sealed Roman catacomb',
    'in the smoking area of a Nando\'s in Elephant & Castle, which occupies the site of a 13th-century execution ground',
  ],
};

const RELIC_ACTIONS = [
  'gifted by', 'stolen from', 'traded with', 'won from', 'inherited from',
  'found beside', 'rescued from', 'bargained from', 'freed by', 'entrusted by',
  'abandoned by', 'surrendered by', 'blessed by', 'cursed by', 'forgotten by',
];

const ARCHETYPE_NUMBERS: Record<string, number[]> = {
  fool: [0, 22], magician: [1, 11], high_priestess: [2, 13], empress: [3, 12],
  emperor: [4, 40], hierophant: [5, 14], lovers: [6, 15], chariot: [7, 77],
  strength: [8, 11], hermit: [9, 99], wheel_of_fortune: [10, 1000], justice: [11, 8],
  hanged_man: [12, 3], death: [13, 4], temperance: [14, 7], devil: [15, 6],
  tower: [16, 1], star: [17, 8], moon: [18, 9], sun: [19, 1], judgement: [20, 7], world: [21, 4],
  innocent: [1, 7], sage: [3, 9], explorer: [5, 12], outlaw: [6, 13],
  hero: [1, 8], lover: [2, 6], jester: [0, 3], everyman: [4, 10],
  caregiver: [2, 9], ruler: [1, 4], creator: [3, 7],
  kether: [1, 620], chokmah: [2, 73], binah: [3, 67], chesed: [4, 72],
  geburah: [5, 216], tiphareth: [6, 1081], netzach: [7, 148], hod: [8, 15],
  yesod: [9, 80], malkuth: [10, 496], thaumiel: [11, 2], ghagiel: [12, 3],
  satariel: [13, 60], gamchicoth: [14, 4], golachab: [15, 5], thagirion: [16, 6],
  harab_serapel: [17, 7], samael: [18, 8], gamaliel: [19, 9], lilith: [20, 480],
  obatala: [8, 16], ogun: [3, 7], shango: [6, 12], yemoja: [7, 21],
  oshun: [5, 25], eshu: [3, 21], oya: [9, 99], orunmila: [16, 4],
  osanyin: [1, 7], babalu_aye: [17, 13], olokun: [7, 9], aganju: [6, 9],
  odin: [9, 3], thor: [3, 8], freya: [13, 7], loki: [0, 3],
  tyr: [1, 11], heimdall: [9, 27], baldur: [12, 1], hel: [9, 13],
  frigg: [12, 7], njord: [9, 11], skadi: [3, 9], idun: [11, 7],
};

const MODERN_SYMBOLISM: Record<string, string[]> = {
  brands_sacred: [
    'Hermès aura', 'Cartier halo', 'Chanel frequency', 'Dior wavelength',
    'Tiffany resonance', 'Rolex alignment', 'Louis Vuitton coordinates',
    'Gucci vibration', 'Prada dimension', 'Balenciaga axis',
  ],
  brands_mundane: [
    'Asda receipt', 'Tesco meal deal', 'Lidl middle aisle', 'Aldi special buy',
    'Primark tag', 'Poundland prophecy', 'Greggs wrapper', 'Sports Direct mug',
    'Iceland frozen moment', 'B&M bargain', 'Home Bargains blessing',
  ],
  brands_universal: [
    'McDonald\'s golden arc', 'Starbucks siren call', 'KFC secret scripture',
    'Subway footlong path', 'Domino\'s chain reaction', 'Uber surge',
    'Amazon Prime timeline', 'Netflix queue', 'Spotify algorithm',
    'TikTok loop', 'Instagram filter', 'WhatsApp blue tick',
  ],
  street_culture: [
    'bando frequencies', 'trap house coordinates', 'block cipher',
    'ends theorem', 'mandem energy', 'roadman resonance', 'yard blessing',
    'corner shop oracle', 'chicken shop chronicles', 'off-license liturgy',
    'estate psalm', 'postcode prophecy', 'link up ritual', 'peng alignment',
  ],
  sacred_mundane_mix: [
    'Starbucks communion', 'IKEA pilgrimage', 'Amazon prayer',
    'Deliveroo deliverance', 'Uber rapture', 'Netflix nirvana',
    'Tesco enlightenment', 'Lidl transcendence', 'Aldi awakening',
    'McDonald\'s sacrament', 'Greggs gospel', 'Primark parable',
  ],
};

const MODERN_RELIC_TWEETS: Record<string, string[]> = {
  cryptic: [
    'they not ready for what I know about the self-checkout at 3am',
    'can\'t explain it but the parking meter understood me',
    'some of y\'all never been followed home by a plastic bag and it shows',
    'the receipt said thank you but it meant something else',
    'that IKEA lamp saw what you did in 2019',
    'you think the QR code scans you? lol',
    'why did the vape smoke spell my government name',
    'the Roomba knows. the Roomba always knew.',
    'told my alexa my plans and now the algorithm is different',
  ],
  unhinged_wisdom: [
    'normalize leaving your body at the Tesco self checkout',
    'the McDonald\'s ice cream machine works in dimensions you can\'t perceive',
    'that USB stick has your search history from a different timeline',
    'Greggs sausage roll is just a vessel. you know this.',
    'the corner shop ting knows your destiny fr',
    'why is no one talking about what happens in the Lidl middle aisle at exactly 3:33am',
    'the Uber driver ain\'t human and we all know it',
  ],
  profound_mundane: [
    'we live in a society where the charger that fits nothing is the most honest object in your house',
    'your password manager contains prayers you forgot you wrote',
    'that "seen" message at 2am altered the timeline',
    'every sports direct mug holds exactly one universe',
    'the voicemail you never played is louder than the one you did',
    'poundland prophecy: everything has a price but nothing has value',
    'the bando isn\'t a place it\'s a state of being and your ring doorbell agrees',
  ],
  chaotic_energy: [
    'bestie the yoga mat unrolls both ways and only one leads back',
    'no thoughts just the parking meter frozen at 0:00',
    'me: normal day. the cracked phone screen: not quite luv',
    'they put a spirit halloween in the void???? oh this is sick actually',
    'the lanyard says 2019 but the conference hasn\'t happened yet?',
    'POV: the fidget spinner gets heavier every full moon',
    'it\'s giving haunted airpod playing frequencies only dogs hear',
  ],
  street_mystic: [
    'fam the chicken shop lights different at certain hours trust me',
    'man said the corner shop uncle is a prophet and I\'m starting to believe it',
    'the offy knows things about the ends that google maps don\'t',
    'certain blocks got different physics and that\'s just facts',
    'the mandem don\'t talk about what happened at that bus stop',
    'your postcode is a spell whether you know it or not',
    'trap house mathematics: the bag never weighs what it should',
  ],
};

const RELIC_PSEUDONYMS = [
  'Vex', 'Nul', 'Kex', 'Zyn', 'Qor', 'Jax', 'Pyx', 'Wren', 'Flux', 'Crux',
  'Hex', 'Lux', 'Rex', 'Vox', 'Nix', 'Pax', 'Dux', 'Fex', 'Mox', 'Tux',
  'Ix', 'Oz', 'Ax', 'Ex', 'Ox', 'Uz', 'Az', 'Yx', 'Qi', 'Xu',
  'Kiv', 'Zael', 'Pyth', 'Quex', 'Vorn', 'Jeth', 'Brix', 'Cael', 'Drem', 'Fyn',
  'Grix', 'Hael', 'Ixen', 'Jyn', 'Kael', 'Lem', 'Myx', 'Neth', 'Orix', 'Pael',
  'Null-7', 'Void-9', 'Echo-3', 'Static', 'Glitch', 'Relic-0', 'Lost-1', 'Found-X',
  'Shard', 'Sliver', 'Scrap', 'Husk', 'Shell', 'Core', 'Node', 'Seed', 'Spool', 'Cog',
  'Shh', 'Psst', 'Hnn', 'Tsk', 'Pfft', 'Hmm',
  'Zero', 'Nil', 'Nought', 'Rien', 'Nada',
  'Tilde', 'Caret', 'Pipe', 'Slash', 'Dot', 'Dash',
];

// ============================================================================
// RELIC GENERATION FUNCTIONS
// ============================================================================

type Arcana = {
  system: string;
  archetype: string;
  meaning: string;
  coreDesire: string;
  shadowThemes: string[];
  goldenGifts: string[];
};

type RelicItem = {
  object: string;
  category: string;
  origin: string;
};

function getArchetypeNumber(archetype: string, rng: () => number): number {
  const normalized = archetype.toLowerCase().replace(/ /g, '_');
  const numbers = ARCHETYPE_NUMBERS[normalized] || [Math.floor(rng() * 10), Math.floor(rng() * 100)];
  return randomChoice(rng, numbers);
}

function generateModernSymbolism(rng: () => number, arcana: Arcana): string {
  const categories = ['brands_sacred', 'brands_mundane', 'brands_universal', 'street_culture', 'sacred_mundane_mix'];
  const category = randomChoice(rng, categories);
  const symbol = randomChoice(rng, MODERN_SYMBOLISM[category]);
  const number = getArchetypeNumber(arcana.archetype, rng);
  const formats = [
    `${number} ${symbol}`, `${symbol} (${number})`, `${symbol} x ${number}`,
    `${symbol} at ${number}`, `${symbol} // ${number}`, `${symbol} [${number}]`,
  ];
  return randomChoice(rng, formats);
}

function generateSampleTweet(rng: () => number): string {
  const categories = ['cryptic', 'unhinged_wisdom', 'profound_mundane', 'chaotic_energy', 'street_mystic'];
  const category = randomChoice(rng, categories);
  return randomChoice(rng, MODERN_RELIC_TWEETS[category]);
}

// Syllable fragments for building unique pseudonyms
const PSEUDO_FRAGMENTS = {
  hard: ['Kex', 'Vrn', 'Grx', 'Thk', 'Brx', 'Drk', 'Krv', 'Prx', 'Trk', 'Zrk'],
  liquid: ['Ael', 'Iol', 'Uel', 'Yal', 'Eil', 'Oal', 'Ial', 'Aul', 'Eol', 'Uil'],
  sibilant: ['Syx', 'Zha', 'Shv', 'Tsx', 'Czh', 'Ssv', 'Xis', 'Zev', 'Sha', 'Szk'],
  vowel: ['Ae', 'Io', 'Ue', 'Ya', 'Ei', 'Oa', 'Ia', 'Au', 'Eo', 'Ui'],
};

function generateRelicPseudonym(rng: () => number, order: string, arcana: Arcana, personality: { voiceTone: string }): string {
  const orderName = order.charAt(0).toUpperCase() + order.slice(1);
  const gift = arcana.goldenGifts?.[0] || 'truth';
  const shadow = arcana.shadowThemes?.[0] || 'silence';
  const meaning = arcana.meaning.split(' - ')[0] || arcana.meaning;
  const system = arcana.system.charAt(0).toUpperCase() + arcana.system.slice(1);

  // Build a unique phonetic fragment from the archetype
  const archSeed = arcana.archetype.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const fragRng = createRng(archSeed + Math.floor(rng() * 1000));
  const frag1 = randomChoice(fragRng, PSEUDO_FRAGMENTS.hard);
  const frag2 = randomChoice(fragRng, PSEUDO_FRAGMENTS.liquid);
  const frag3 = randomChoice(fragRng, PSEUDO_FRAGMENTS.sibilant);
  const frag4 = randomChoice(fragRng, PSEUDO_FRAGMENTS.vowel);
  const uniqueWord = randomChoice(rng, [
    frag1 + frag2.toLowerCase(),
    frag4 + frag3.toLowerCase(),
    frag2 + frag1.toLowerCase().slice(0, 2),
    frag3.slice(0, 2) + frag2.toLowerCase() + frag1.toLowerCase().slice(-1),
  ]);

  const patterns = [
    // System-derived epithets
    `${uniqueWord}, ${meaning}`,
    `${uniqueWord} the ${randomChoice(rng, [gift, shadow]).charAt(0).toUpperCase() + randomChoice(rng, [gift, shadow]).slice(1)}-Bound`,
    // Order-fused compound names
    `${orderName.slice(0, 3)}${uniqueWord.toLowerCase()}`,
    `${frag4}-${orderName.toLowerCase()}`,
    // Title + generated word
    `The ${uniqueWord} of ${system}`,
    `${uniqueWord}, Keeper of ${randomChoice(rng, arcana.goldenGifts || ['silence'])}`,
    // Archetype-resonant epithets
    `${meaning.split(' ')[0]}-${uniqueWord.toLowerCase()}`,
    `${shadow.charAt(0).toUpperCase() + shadow.slice(1)}\'s ${uniqueWord}`,
    // Compound mythic
    `${frag1}-${frag2.toLowerCase()}, the ${orderName} Residue`,
    `${uniqueWord} (${arcana.archetype.split(' ').map(w => w[0]).join('').toUpperCase()}-${Math.floor(rng() * 99)})`,
    // Tone-derived
    `${frag3.slice(0, 3)}${frag4.toLowerCase()}, Who ${randomChoice(rng, ['Refuses', 'Remembers', 'Persists', 'Unravels', 'Waits', 'Watches', 'Burns', 'Speaks'])}`,
  ];

  return randomChoice(rng, patterns);
}

function generateRelicName(rng: () => number, relic: RelicItem): string {
  let objectName = relic.object;
  if (objectName.startsWith('a ')) objectName = objectName.slice(2);
  else if (objectName.startsWith('an ')) objectName = objectName.slice(3);

  const words = objectName.split(' ');
  const skipWords = ['a', 'an', 'the', 'of', 'from', 'that', 'which', 'who', 'with', 'to', 'in', 'on', 'at', 'for'];
  const titleCase = words.map((word, idx) => {
    if (idx === 0 || !skipWords.includes(word.toLowerCase())) {
      return word.charAt(0).toUpperCase() + word.slice(1);
    }
    return word;
  }).join(' ');

  return titleCase;
}

function getEraData(era: string) {
  if (era === 'modern') return RELIC_ERA_MODERN;
  if (era === 'hybrid') return RELIC_ERA_HYBRID;
  return RELIC_ERA_ARCHAIC;
}

function generateRelicObject(rng: () => number, era: string): RelicItem {
  const eraData = getEraData(era);
  return {
    object: randomChoice(rng, eraData.objects),
    category: era === 'hybrid' ? 'strange' : era === 'modern' ? 'mundane_twisted' : 'symbolic',
    origin: '',
  };
}

function generateRelicBackstory(rng: () => number, relic: RelicItem, arcana: Arcana, order: string, era: string): string {
  const eraData = getEraData(era);
  const context = randomChoice(rng, eraData.contexts);
  const giver = randomChoice(rng, eraData.givers);
  const action = randomChoice(rng, RELIC_ACTIONS);
  const objectDesc = relic.object.charAt(0).toUpperCase() + relic.object.slice(1);
  const sacredNumber = getArchetypeNumber(arcana.archetype, rng);
  const altNumber = getArchetypeNumber(arcana.archetype, rng);
  const orderName = order.charAt(0).toUpperCase() + order.slice(1);
  const orderTheme = ORDER_THEMES[order] || '';
  const systemName = arcana.system.charAt(0).toUpperCase() + arcana.system.slice(1);
  const archetypeName = arcana.archetype;

  const lineages = era === 'hybrid' ? [
    `Consecrated by a ${orderName} in Bay 4 of the Lidl car park in Tottenham at 2:41am, the ${systemName} seal of ${archetypeName} is laser-etched under its barcode`,
    `A ${orderName} artefact that survived both the sack of Constantinople and a Primark closing-down sale — ${orderTheme}, now with contactless`,
    `Born of ${orderTheme}, blessed by ${archetypeName} in the 3rd century, pawned in the 21st, bought back at auction by something that doesn't have hands`,
    `The last ${orderName} to hold it left a 3-star Google review: "genuinely life-altering but postage was £4.99" — ${archetypeName} energy confirmed by HMRC`,
    `It hums with ${orderName} resonance at 432Hz. The receipt says Argos catalogue #4,719 but the ${systemName} glyph of ${archetypeName} is embossed on the warranty card`,
    `Half ${orderName} covenant, half Tesco Clubcard — ${orderTheme} meets £3.50 meal deal mysticism, best before: heat death of the universe`,
    `Registered as a ${orderName} relic in 1247 and again as a Bluetooth device in 2019 — ${archetypeName} (${systemName}) runs through its firmware`,
    `The British Museum tried to acquire it but it kept returning to ${randomChoice(rng, ['a Cash Converters in Lewisham', 'a skip in Salford', 'the reduced section at Morrisons', 'a charity shop in Margate'])} — ${orderTheme}`,
  ] : era === 'modern' ? [
    `Marked by ${orderName} energy and the ${systemName} path of ${archetypeName}, it bends Wi-Fi signals when held`,
    `A ${orderName} artefact channelling the ${archetypeName} frequency — ${orderTheme}`,
    `Born of ${orderTheme}, it carries the ${systemName} imprint of ${archetypeName} in its material`,
    `The ${orderName} who last held it said the ${archetypeName} chose it, not them — ${orderTheme}`,
    `It hums with ${orderName} resonance, the ${systemName} glyph of ${archetypeName} scratched into its underside`,
  ] : [
    `Forged in the tradition of the ${orderName}, it bears the ${systemName} seal of ${archetypeName}`,
    `An instrument of ${orderTheme}, shaped by the ${archetypeName} principle`,
    `The ${orderName} order consecrated it under the ${systemName} rite of ${archetypeName}`,
    `It carries the ${orderName} covenant — ${orderTheme} — through the lens of ${archetypeName}`,
    `Touched by ${orderName} hands, it resonates with ${archetypeName}: ${arcana.meaning.toLowerCase()}`,
  ];
  const lineage = randomChoice(rng, lineages);

  const natureDescriptors = era === 'hybrid' ? [
    `It carries the ${generateModernSymbolism(rng, arcana)}, smells of myrrh and Febreze, and is warm to the touch on Tuesdays`,
    `It embodies ${sacredNumber} frequencies of ${arcana.coreDesire.toLowerCase()} — available on click & collect from a branch that closed in 2016`,
    `It whispers of ${arcana.shadowThemes[0] || 'forgotten things'} in a customer-service voice, then switches to Akkadian when the lights go off`,
    `It dreams of ${arcana.goldenGifts[0] || 'impossible things'} while drawing 0.3 amps via a Micro-USB cable that shouldn't fit`,
    `It sets off both the shop alarm at ${randomChoice(rng, ['Boots', 'Primark', 'TK Maxx', 'Superdrug'])} and the warding glyphs at any threshold consecrated before 1100 AD`,
    `Its energy reads ${altNumber} on the ${randomChoice(rng, ['Asda', 'Lidl', 'Tesco'])} scale, ${sacredNumber} on the Kabbalistic index, and "ERROR" on everything else`,
    `Carbon dating says 4,600 years old. The best-before sticker says next Thursday`,
    `It has a serial number that, read backwards, is a prayer in a language no one alive speaks`,
  ] : era === 'modern' ? [
    `It carries the ${generateModernSymbolism(rng, arcana)}`,
    `It embodies ${sacredNumber} frequencies of ${arcana.coreDesire.toLowerCase()}`,
    `It whispers of ${arcana.shadowThemes[0] || 'forgotten things'} - ${generateModernSymbolism(rng, arcana)}`,
    `It dreams in ${generateModernSymbolism(rng, arcana)}`,
    `It vibrates at ${sacredNumber} - the ${arcana.meaning.toLowerCase()} frequency`,
    `Its energy reads ${altNumber} on the ${randomChoice(rng, ['Asda', 'Lidl', 'Tesco', 'bando', 'ends', 'block'])} scale`,
  ] : [
    `It carries the weight of ${arcana.meaning.toLowerCase()}`,
    `It embodies ${arcana.coreDesire.toLowerCase()}`,
    `It whispers of ${arcana.shadowThemes[0] || 'forgotten things'}`,
    `It dreams of ${arcana.goldenGifts[0] || 'impossible things'}`,
  ];
  const nature = randomChoice(rng, natureDescriptors);

  const purposes = era === 'hybrid' ? [
    `It has ${sacredNumber} stars on Google Reviews and ${altNumber} papal blessings, the most recent dated 1471`,
    `Its warranty is eternal but the packaging is from B&M and already falling apart`,
    `It was recalled simultaneously by the manufacturer, the Vatican, and three separate intelligence agencies`,
    `It appears in every recommendation algorithm and every recorded prophecy at exactly ${sacredNumber}`,
    `Listed on Depop for £${sacredNumber}. Three bidders hospitalised. Postage not included. Seller: "no returns, it chose you"`,
    `The returns policy requires a blood oath, a valid email address, and proof of lineage going back to at least the Bronze Age`,
    `Last seen at a car boot sale in ${randomChoice(rng, ['Croydon', 'Salford', 'Bethnal Green', 'Tottenham', 'Peckham', 'Doncaster'])} in 2022. Before that, Golgotha. Before that, a branch of Woolworths`,
    `Banned from ${randomChoice(rng, ['eBay', 'Amazon', 'Facebook Marketplace', 'Vinted', 'Gumtree'])} for "violating community guidelines" and excommunicated from ${randomChoice(rng, ['the Vatican', 'the Eastern Orthodox Church', 'three separate covens', 'the Council of Nicaea (retroactively)'])}`,
    `The Deliveroo rider assigned to it has been cycling since the fall of the Western Roman Empire. He rates the gig 3/5`,
    `It has ${sacredNumber} unread notifications from the abyss, ${altNumber} from HMRC, and a pending software update it refuses to install`,
    `Customer service says the item doesn't exist. The product page 404s. The altar in your kitchen says otherwise`,
    `Always in stock at ${randomChoice(rng, ['Poundland', 'the bando', 'that corner shop in Dalston', 'the Lidl middle aisle'])} but purchasing it requires a 40-day pilgrimage and a Nectar card`,
    `Royal Mail tracking says "delivered" but it arrived via a method that predates roads by several millennia`,
    `It has been listed on the UNESCO World Heritage register, the Ikea product catalogue, and the Domesday Book, all under different names`,
  ] : era === 'modern' ? [
    `It has ${sacredNumber} stars but no reviews`,
    `Its warranty expired ${sacredNumber} dimensions ago`,
    `It was recalled but never returned - ${generateModernSymbolism(rng, arcana)}`,
    `It shows up in everyone's algorithm at exactly ${sacredNumber}`,
    `It auto-updates at ${sacredNumber} o'clock in timezones that don't exist`,
    `It's always in stock at ${randomChoice(rng, ['Asda', 'Tesco', 'the bando', 'that corner shop', 'Lidl middle aisle'])} but never ships`,
    `${generateModernSymbolism(rng, arcana)} - it knows your order before you do`,
    `Starbucks named a drink after it but only staff can see the menu`,
    `McDonald's ice cream machine works when it's nearby - ${sacredNumber}% of the time`,
    `The Deliveroo rider who carries it has been on shift since ${altNumber}`,
    `It has ${sacredNumber} unread notifications from the void`,
    `It got banned from ${randomChoice(rng, ['TikTok', 'Instagram', 'Twitter', 'the group chat', 'the bando'])} for speaking truth`,
  ] : [
    'Those who possess it find their path altered',
    'It chooses its keeper, not the other way around',
    'It has passed through many hands, remembering each',
    'It waits for the one who understands its purpose',
    'It transforms all who dare to hold it',
    'It speaks only to those ready to listen',
  ];
  const purpose = randomChoice(rng, purposes);

  return `${objectDesc}, ${action} ${giver} ${context}. ${lineage}. ${nature}. ${purpose}.`;
}

function generateRelics(rng: () => number, count = 2): RelicItem[] {
  const relics: RelicItem[] = [];
  const usedCategories = new Set<string>();
  for (let i = 0; i < count; i++) {
    const availableCategories = RELIC_CATEGORIES.filter(c => !usedCategories.has(c));
    const category = availableCategories.length > 0 ? randomChoice(rng, availableCategories) : randomChoice(rng, RELIC_CATEGORIES);
    usedCategories.add(category);
    relics.push({
      object: randomChoice(rng, RELIC_OBJECTS[category]),
      category,
      origin: randomChoice(rng, RELIC_ORIGINS),
    });
  }
  return relics;
}

// ============================================================================
// BLENDED NAME GENERATION
// ============================================================================

function generateBlendedName(rng: () => number, gender: string): string {
  const prefix = randomChoice(rng, NAME_SYLLABLES.prefixes);
  const syllableCount = Math.floor(rng() * 3) + 1;
  let name = prefix;
  for (let i = 0; i < syllableCount - 1; i++) {
    if (rng() > 0.4) name += randomChoice(rng, NAME_SYLLABLES.middles);
  }
  name += randomChoice(rng, NAME_SYLLABLES.suffixes);
  if (gender === 'feminine' && rng() > 0.5) {
    if (!name.endsWith('a') && !name.endsWith('ia') && !name.endsWith('ah')) {
      const femEndings = ['a', 'ia', 'aia', 'ella', 'ina', 'ara'];
      name = name.replace(/[aeiou]$/, '') + randomChoice(rng, femEndings);
    }
  } else if (gender === 'masculine' && rng() > 0.5) {
    if (!name.match(/[^aeiou]$/)) {
      const mascEndings = ['n', 'r', 's', 'x', 'th', 'k', 'us', 'os', 'an', 'on'];
      name = name + randomChoice(rng, mascEndings);
    }
  }
  return name;
}

function generateBlendedMononym(rng: () => number, gender: string): string {
  if (rng() > 0.5) return generateBlendedName(rng, gender);
  const culture1 = randomChoice(rng, HERITAGE_CULTURES);
  const culture2 = randomChoice(rng, HERITAGE_CULTURES.filter(c => c !== culture1));
  const pool1 = gender === 'feminine' ? CULTURE_NAMES[culture1].female : CULTURE_NAMES[culture1].male;
  const pool2 = gender === 'feminine' ? CULTURE_NAMES[culture2].female : CULTURE_NAMES[culture2].male;
  const name1 = randomChoice(rng, pool1);
  const name2 = randomChoice(rng, pool2);
  const splitPoint1 = Math.floor(name1.length * (0.3 + rng() * 0.4));
  const splitPoint2 = Math.floor(name2.length * (0.4 + rng() * 0.3));
  const blended = name1.slice(0, splitPoint1) + name2.slice(splitPoint2);
  return blended.charAt(0).toUpperCase() + blended.slice(1).toLowerCase();
}

// ============================================================================
// AMINAL NAME GENERATION
// ============================================================================

function generateAminalNameBlended(rng: () => number, baseName: string): string {
  const animal = randomChoice(rng, ALL_ANIMALS);
  const strategy = Math.floor(rng() * 5);
  switch (strategy) {
    case 0: { const ns = Math.floor(baseName.length * (0.4 + rng() * 0.3)); const as2 = Math.floor(animal.length * (0.3 + rng() * 0.4)); return baseName.slice(0, ns) + animal.slice(as2).toLowerCase(); }
    case 1: { const as3 = Math.floor(animal.length * (0.4 + rng() * 0.3)); const ns2 = Math.floor(baseName.length * (0.3 + rng() * 0.4)); return animal.slice(0, as3) + baseName.slice(ns2).toLowerCase(); }
    case 2: { const combined = animal.slice(0, 3) + baseName.slice(1, 4) + animal.slice(-2); return combined.charAt(0).toUpperCase() + combined.slice(1).toLowerCase(); }
    case 3: { const ap = animal.slice(0, Math.min(3, animal.length)); const nf = baseName.slice(Math.floor(baseName.length * 0.3)); return ap + nf.toLowerCase(); }
    default: { const np = baseName.slice(0, Math.floor(baseName.length * 0.6)); const asf = animal.slice(-Math.min(3, animal.length)); return np + asf.toLowerCase(); }
  }
}

function generateAminalNameClear(rng: () => number, baseName: string, _gender?: string): string {
  const animal = randomChoice(rng, ALL_ANIMALS);
  const pattern = Math.floor(rng() * 6);
  switch (pattern) {
    case 0: return `${baseName} the ${animal}`;
    case 1: return `${animal} ${baseName}`;
    case 2: return `${baseName} ${animal}`;
    case 3: return `${baseName} of the ${animal}`;
    case 4: return `The ${animal} ${baseName}`;
    default: return `${baseName}-${animal}`;
  }
}

// ============================================================================
// ARCHETYPE SELECTION
// ============================================================================

function selectArchetype(rng: () => number): Arcana {
  const system = randomChoice(rng, [...ARCHETYPE_SYSTEMS]);
  let archetype: string, data: ArchetypeData;

  switch (system) {
    case 'tarot': { const key = randomChoice(rng, TAROT_ARCHETYPES); archetype = key; data = TAROT_ARCHETYPES_DATA[key]; break; }
    case 'jung': { const keys = Object.keys(JUNG_ARCHETYPES); const key = randomChoice(rng, keys); archetype = key; data = JUNG_ARCHETYPES[key]; break; }
    case 'kabbalah': { const keys = Object.keys(KABBALAH_ARCHETYPES); const key = randomChoice(rng, keys); archetype = key; data = KABBALAH_ARCHETYPES[key]; break; }
    case 'orisha': { const keys = Object.keys(ORISHA_ARCHETYPES); const key = randomChoice(rng, keys); archetype = key; data = ORISHA_ARCHETYPES[key]; break; }
    case 'norse': { const keys = Object.keys(NORSE_ARCHETYPES); const key = randomChoice(rng, keys); archetype = key; data = NORSE_ARCHETYPES[key]; break; }
    default: throw new Error(`Unknown archetype system: ${system}`);
  }

  return {
    system,
    archetype: archetype.replace(/_/g, ' '),
    meaning: data.meaning,
    coreDesire: data.coreDesire,
    shadowThemes: data.shadow,
    goldenGifts: data.gifts,
  };
}

// ============================================================================
// SUBTASTE ARCHETYPE MAPPING
// ============================================================================

const SUBTASTE_DESIGNATIONS: Record<string, { glyph: string; label: string }> = {
  'S-0':  { glyph: 'KETH',   label: 'Standard-Bearer' },
  'T-1':  { glyph: 'STRATA', label: 'System-Seer' },
  'V-2':  { glyph: 'OMEN',   label: 'Early Witness' },
  'L-3':  { glyph: 'SILT',   label: 'Patient Cultivator' },
  'C-4':  { glyph: 'CULL',   label: 'Essential Editor' },
  'N-5':  { glyph: 'LIMN',   label: 'Border Illuminator' },
  'H-6':  { glyph: 'TOLL',   label: 'Relentless Advocate' },
  'P-7':  { glyph: 'VAULT',  label: 'Living Archive' },
  'D-8':  { glyph: 'WICK',   label: 'Hollow Channel' },
  'F-9':  { glyph: 'ANVIL',  label: 'Manifestor' },
  'R-10': { glyph: 'SCHISM', label: 'Productive Fracture' },
  'NULL': { glyph: 'VOID',   label: 'Receptive Presence' },
};

const ARCHETYPE_TO_SUBTASTE: Record<string, string> = {
  fool: 'V-2', magician: 'F-9', high_priestess: 'D-8', empress: 'L-3',
  emperor: 'S-0', hierophant: 'P-7', lovers: 'N-5', chariot: 'F-9',
  strength: 'H-6', hermit: 'T-1', wheel_of_fortune: 'D-8', justice: 'C-4',
  hanged_man: 'NULL', death: 'R-10', temperance: 'L-3', devil: 'R-10',
  tower: 'R-10', star: 'V-2', moon: 'D-8', sun: 'H-6',
  judgement: 'S-0', world: 'F-9',
  innocent: 'NULL', sage: 'T-1', explorer: 'V-2', outlaw: 'R-10',
  hero: 'H-6', lover: 'N-5', jester: 'R-10', everyman: 'D-8',
  caregiver: 'L-3', ruler: 'S-0', creator: 'F-9',
  kether: 'S-0', chokmah: 'V-2', binah: 'T-1', chesed: 'L-3',
  geburah: 'C-4', tiphareth: 'N-5', netzach: 'H-6', hod: 'T-1',
  yesod: 'D-8', malkuth: 'F-9', thaumiel: 'R-10', ghagiel: 'R-10',
  satariel: 'P-7', gamchicoth: 'C-4', golachab: 'H-6', thagirion: 'R-10',
  harab_serapel: 'D-8', samael: 'C-4', gamaliel: 'D-8', lilith: 'R-10',
  obatala: 'S-0', ogun: 'F-9', shango: 'H-6', yemoja: 'L-3',
  oshun: 'N-5', eshu: 'V-2', oya: 'R-10', orunmila: 'P-7',
  osanyin: 'T-1', babalu_aye: 'L-3', olokun: 'D-8', aganju: 'F-9',
  odin: 'P-7', thor: 'H-6', freya: 'N-5', loki: 'R-10',
  tyr: 'S-0', heimdall: 'V-2', baldur: 'NULL', hel: 'D-8',
  frigg: 'T-1', njord: 'L-3', skadi: 'C-4', idun: 'L-3',
};

function deriveSubtasteDesignation(arcana: Arcana) {
  const normalized = arcana.archetype.toLowerCase().replace(/ /g, '_');
  const code = ARCHETYPE_TO_SUBTASTE[normalized] || 'NULL';
  const designation = SUBTASTE_DESIGNATIONS[code];
  return { code, glyph: designation.glyph, label: designation.label };
}

// ============================================================================
// MAIN GENERATOR
// ============================================================================

export type GeneratorParams = {
  seed?: number;
  heritage?: string;
  gender?: string;
  blendHeritage?: boolean;
  mononym?: boolean;
  mononymType?: string;
  relic?: boolean;
  relicEra?: string;
  core?: string;
};

export type GeneratedCharacter = {
  seed: number;
  name: string;
  gender: string;
  heritage: string;
  order: { name: string; ideology: string };
  arcana: Arcana;
  subtaste: { code: string; glyph: string; label: string };
  appearance: { build: string; distinctiveTrait: string; styleAesthetic: string };
  personality: {
    axes: { orderChaos: number; mercyRuthlessness: number; introvertExtrovert: number; faithDoubt: number };
    coreDesire: string;
    deepFear: string;
    voiceTone: string;
  };
  backstory: string;
  relics?: RelicItem[];
  pseudonym?: string;
  samplePost?: string;
  sacredNumber?: number;
};

export function generateCharacter(params: GeneratorParams = {}): GeneratedCharacter {
  const seed = params.seed ?? Math.floor(Math.random() * 10_000_000);
  const rng = createRng(seed);

  const genderMap: Record<string, string> = {
    male: 'masculine', female: 'feminine', androgynous: 'neutral',
    masculine: 'masculine', feminine: 'feminine', neutral: 'neutral',
  };
  const heritageMap: Record<string, string> = {
    yoruba: 'african_yoruba', igbo: 'african_igbo', arabic: 'arabic',
    european: 'caucasian_european', celtic: 'celtic', norse: 'norse_viking',
  };

  const rawGender = params.gender
    ? genderMap[params.gender.toLowerCase()] || randomChoice(rng, ['masculine', 'feminine', 'neutral'])
    : randomChoice(rng, ['masculine', 'feminine', 'neutral']);

  const blendHeritage = params.blendHeritage ?? false;
  const useMononym = params.mononym ?? false;
  const mononymType = params.mononymType ?? 'squishe';

  let heritage: string, heritageLabel: string;
  if (blendHeritage) {
    heritage = randomChoice(rng, HERITAGE_CULTURES);
    heritageLabel = randomChoice(rng, BLENDED_HERITAGE_LABELS);
  } else {
    heritage = params.heritage
      ? heritageMap[params.heritage.toLowerCase()] || randomChoice(rng, HERITAGE_CULTURES)
      : randomChoice(rng, HERITAGE_CULTURES);
    heritageLabel = CULTURE_LABELS[heritage];
  }

  const order = randomChoice(rng, ORDER_TYPES);
  const office = randomChoice(rng, ORDER_OFFICES[order]);
  const arcana = selectArchetype(rng);

  const cultureNames = CULTURE_NAMES[heritage];
  const namePool = rawGender === 'feminine' ? cultureNames.female : cultureNames.male;
  const baseName = randomChoice(rng, namePool);
  let fullName: string;

  if (useMononym && mononymType === 'squishe') {
    fullName = generateBlendedMononym(rng, rawGender);
  } else if (useMononym && mononymType === 'simple') {
    fullName = baseName;
  } else if (useMononym && mononymType === 'aminal-blend') {
    fullName = generateAminalNameBlended(rng, baseName);
  } else if (useMononym && mononymType === 'aminal-clear') {
    fullName = generateAminalNameClear(rng, baseName, rawGender);
  } else if (blendHeritage && !useMononym) {
    fullName = `${generateBlendedName(rng, rawGender)} ${generateBlendedName(rng, 'neutral')}`;
  } else {
    fullName = `${baseName} ${randomChoice(rng, cultureNames.surnames)}`;
  }

  const appearance = {
    build: randomChoice(rng, BUILDS),
    distinctiveTrait: randomChoice(rng, DISTINCTIVE_TRAITS),
    styleAesthetic: randomChoice(rng, STYLE_AESTHETICS),
  };

  const axes = {
    orderChaos: Number(randomFloat(rng, 0, 1).toFixed(2)),
    mercyRuthlessness: Number(randomFloat(rng, 0, 1).toFixed(2)),
    introvertExtrovert: Number(randomFloat(rng, 0, 1).toFixed(2)),
    faithDoubt: Number(randomFloat(rng, 0, 1).toFixed(2)),
  };

  const personality = {
    axes,
    coreDesire: arcana.coreDesire,
    deepFear: randomChoice(rng, DEEP_FEARS),
    voiceTone: randomChoice(rng, VOICE_TONES),
  };

  const orderTheme = ORDER_THEMES[order];
  const disposition = axes.introvertExtrovert > 0.5 ? 'outward and engaging' : 'inward and contemplative';

  const useRelic = params.relic ?? false;
  let finalName: string, backstory: string;
  let relics: RelicItem[] | undefined;
  let pseudonym: string | undefined;
  let samplePost: string | undefined;
  let sacredNumber: number | undefined;

  if (useRelic) {
    const era = params.relicEra || randomChoice(rng, ['modern', 'archaic', 'hybrid']);
    const relic = generateRelicObject(rng, era);
    relics = [relic];
    finalName = generateRelicName(rng, relic);
    pseudonym = generateRelicPseudonym(rng, order, arcana, personality);
    backstory = generateRelicBackstory(rng, relic, arcana, order, era);
    sacredNumber = getArchetypeNumber(arcana.archetype, rng);
    if (era === 'modern' || era === 'hybrid') samplePost = generateSampleTweet(rng);
  } else {
    finalName = fullName;
    backstory = `${fullName} is a ${heritageLabel} ${order} serving as ${office}. ` +
      `Embodying the ${arcana.system.charAt(0).toUpperCase() + arcana.system.slice(1)} archetype of ${arcana.archetype} (${arcana.meaning}), ` +
      `they are ${disposition}. Their existence is woven with ${orderTheme}. ` +
      `Their deepest drive: ${arcana.coreDesire.toLowerCase()}.`;
  }

  if (params.core) finalName = applyCoreStyle(rng, finalName, params.core);

  const subtaste = deriveSubtasteDesignation(arcana);

  return {
    seed, name: finalName, gender: rawGender, heritage: heritageLabel,
    order: { name: order, ideology: orderTheme }, arcana, subtaste,
    appearance, personality, backstory,
    ...(relics ? { relics } : {}),
    ...(pseudonym ? { pseudonym } : {}),
    ...(samplePost ? { samplePost } : {}),
    ...(sacredNumber !== undefined ? { sacredNumber } : {}),
  };
}

// ============================================================================
// UI OPTION EXPORTS
// ============================================================================

export const HERITAGE_OPTIONS = [
  { value: 'yoruba', label: 'Yoruba' }, { value: 'igbo', label: 'Igbo' },
  { value: 'arabic', label: 'Arabic' }, { value: 'european', label: 'European' },
  { value: 'celtic', label: 'Celtic' }, { value: 'norse', label: 'Norse' },
  { value: 'blend', label: 'Blend' },
];

export const NAME_MODES = [
  { value: 'standard', label: 'Standard' }, { value: 'mononym-squishe', label: 'Squishe' },
  { value: 'mononym-simple', label: 'Simple' }, { value: 'aminal-blend', label: 'Aminal Blend' },
  { value: 'aminal-clear', label: 'Aminal Clear' },
];

export const CORE_STYLES = [
  { value: '', label: 'None' }, { value: 'drowned_mall', label: 'Drowned Mall' },
  { value: 'hex_garden', label: 'Hex Garden' }, { value: 'sugar_rot', label: 'Sugar Rot' },
  { value: 'dead_channel', label: 'Dead Channel' }, { value: 'spore_drift', label: 'Spore Drift' },
  { value: 'wrong_room', label: 'Wrong Room' }, { value: 'bone_clean', label: 'Bone Clean' },
  { value: 'lambda', label: 'Lambda' },
];

export const GENDER_OPTIONS = [
  { value: 'masculine', label: 'Masculine' }, { value: 'feminine', label: 'Feminine' },
  { value: 'neutral', label: 'Neutral' },
];
