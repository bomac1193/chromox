import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import personaRoutes from './routes/personas';
import renderRoutes from './routes/render';
import llmRoutes from './routes/llm';
import voiceCloneRoutes from './routes/voiceClone';
import renderLibraryRoutes from './routes/renderLibrary';
import personaGuideRoutes from './routes/personaGuides';
import folioRoutes from './routes/folio';
import genomeRoutes from './routes/genome';
import reliquaryRoutes from './routes/reliquary';
import usageRoutes from './routes/usage';
import photoRoutes from './routes/photos';
import { config } from './config';

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from renders directory
app.use('/renders', express.static(path.join(process.cwd(), 'renders')));
app.use('/media/personas', express.static(path.join(process.cwd(), 'persona_media')));
app.use('/media/guides', express.static(path.join(process.cwd(), 'guide_samples')));
app.use('/media/thumbs', express.static(path.join(process.cwd(), 'photo_thumbs')));


app.use('/api', personaRoutes);
app.use('/api', renderRoutes);
app.use('/api', llmRoutes);
app.use('/api', renderLibraryRoutes);
app.use('/api', personaGuideRoutes);
app.use('/api', folioRoutes);
app.use('/api', genomeRoutes);
app.use('/api', reliquaryRoutes);
app.use('/api/voice-clone', voiceCloneRoutes);
app.use('/api/usage', usageRoutes);
app.use('/api', photoRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok', engine: 'Persona Synth Kernel' }));

app.listen(config.port, () => {
  console.log(`Chromox backend online at http://localhost:${config.port}`);
});
