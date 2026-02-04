import { Router } from 'express';
import { listRelicPacks, getReliquaryUnlocks, unlockPack, getUnlockedPackRelics } from '../services/reliquaryStore';

const router = Router();

router.get('/reliquary/packs', (_req, res) => {
  res.json(listRelicPacks());
});

router.get('/reliquary/unlocks', (_req, res) => {
  res.json(getReliquaryUnlocks());
});

router.post('/reliquary/unlock', (req, res) => {
  const { packId, password } = req.body ?? {};
  if (!packId || !password) {
    return res.status(400).json({ error: 'packId and password are required' });
  }
  const result = unlockPack(packId, password);
  if (!result.success) {
    return res.status(403).json({ error: 'Incorrect password' });
  }
  res.json(result.pack);
});

export default router;
