import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import chatRouter from './routes/chat.js';
import adminRouter from './routes/admin.js';
import healthRouter from './routes/health.js';

const app  = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  process.env.ADMIN_ORIGIN  || 'http://localhost:5174',
];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

app.use(express.json({ limit: '4mb' }));

app.use('/api/chat',   chatRouter);
app.use('/api/admin',  adminRouter);
app.use('/api/health', healthRouter);

app.listen(PORT, () => {
  console.log(`\n✅  ZEB API  →  http://localhost:${PORT}`);
  console.log(`   Model    →  ${process.env.ANTHROPIC_MODEL}`);
  console.log(`   Pinecone →  ${process.env.PINECONE_INDEX}\n`);
});
