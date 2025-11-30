import { Router } from 'express';
import { rewriteLyricsWithLLM, generatePersonaIdea } from '../services/llm';

const router = Router();

router.post('/llm/rewrite', async (req, res) => {
  const { lyrics, personaPrompt } = req.body;
  const rewritten = await rewriteLyricsWithLLM(lyrics, personaPrompt);
  res.json({ lyrics: rewritten });
});

router.post('/llm/persona-idea', async (req, res) => {
  const { seed, mononym } = req.body ?? {};
  const idea = await generatePersonaIdea({ seed, mononym });
  res.json(idea);
});

export default router;
