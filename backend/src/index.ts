import express from 'express';
import cors from 'cors';
import personaRoutes from './routes/personas';
import renderRoutes from './routes/render';
import llmRoutes from './routes/llm';
import voiceCloneRoutes from './routes/voiceClone';
import { config } from './config';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api', personaRoutes);
app.use('/api', renderRoutes);
app.use('/api', llmRoutes);
app.use('/api/voice-clone', voiceCloneRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok', engine: 'Persona Synth Kernel' }));

app.listen(config.port, () => {
  console.log(`Chromox backend online at http://localhost:${config.port}`);
});
