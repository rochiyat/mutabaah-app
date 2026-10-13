import 'dotenv/config';
import express, { Express } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth';
import activityRoutes from './routes/activities';
import recordRoutes from './routes/records';
import statsRoutes from './routes/stats';
import groupRoutes from './routes/groups';
import userRoutes from './routes/users';
import kajianRoutes from './routes/kajian';
import meetingRoutes from './routes/meetings';
import reportRoutes from './routes/reports';
import financeRoutes from './routes/finance';
import programRoutes from './routes/programs';
import { errorHandler } from './middleware/errorHandler';
import { assertJwtSecret } from './utils/jwt';

assertJwtSecret();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app: Express = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/records', recordRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/users', userRoutes);
app.use('/api/kajian', kajianRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/programs', programRoutes);

// Endpoint API yang tidak dikenal jangan jatuh ke SPA fallback
app.use('/api', (_req, res) => {
  res.status(404).json({ message: 'Endpoint tidak ditemukan' });
});

// Serve static files from dist
app.use(express.static(path.join(__dirname, '../dist')));

// SPA fallback - serve index.html for all non-API routes
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
