# Vocal Archetype Matching

**Status:** Idea / Parked
**Priority:** Low (until demand signal)
**Date:** 2026-02-09

## Concept

Analyze audio tracks (Suno imports, Chromox renders, uploads) and extract vocal identity fingerprint, then show "Similar energy to: [artist examples]" as educational reference points.

## Use Case

User has AI-generated song and wants to find real human vocalist to collaborate with. Instead of building a marketplace (red ocean), provide vocabulary and artist references they can use to search independently.

## Flow

1. User uploads/selects a track
2. System extracts vocal fingerprint (timbre, formants, pitch contour, emotional texture)
3. Display: "Similar energy to: **Billie Eilish** (breathy intimacy), **FKA twigs** (glitchy vulnerability)"
4. User has language + references to find collaborators elsewhere

## Technical Requirements

1. **Vocal analysis engine** — extract timbre, formant, pitch contour, emotional characteristics
2. **Artist reference database** — pre-analyzed profiles of ~100-500 known artists
3. **Matching algorithm** — cosine similarity or similar on feature vectors

## Why Parked

- No clear user demand signal yet
- Significant infrastructure investment (analysis engine, artist database)
- Doesn't improve core rendering/creation loop
- Solves a problem that happens *after* user leaves Chromox

## When to Revisit

- Users explicitly ask "who sounds like this?"
- Core product is mature and needs expansion vectors
- Partnership opportunity makes artist database trivial
- Could feed back into persona creation ("create persona with X energy")

## Blue vs Red Ocean

- **Blue (current framing):** Educational discovery, vocabulary building
- **Red (avoid):** Becomes a vocalist marketplace competing with SoundBetter, Vocalizr, Fiverr

## Related Ideas

- Taste profiling across liked renders
- Vocal archetype informing AI voice prompts
- "Your style gravitates toward X" personalization
