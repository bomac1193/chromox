import { Router } from 'express';
import { rewriteLyricsWithLLM } from '../services/llm';

const router = Router();

router.post('/llm/rewrite', async (req, res) => {
  const { lyrics, personaPrompt } = req.body;
  const rewritten = await rewriteLyricsWithLLM(lyrics, personaPrompt);
  res.json({ lyrics: rewritten });
});

export default router;
