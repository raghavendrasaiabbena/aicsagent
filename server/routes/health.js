import { Router } from 'express';
import { getConfig } from '../services/configService.js';

const router = Router();

router.get('/', (_req, res) => {
  const cfg    = getConfig();
  const checks = {
    anthropicKey:  cfg.anthropicKey?.length > 10,
    openaiKey:     cfg.openaiKey?.length > 10,
    pineconeKey:   cfg.pineconeKey?.length > 10,
    pineconeIndex: !!cfg.pineconeIndex,
  };
  const allOk = Object.values(checks).every(Boolean);
  res.status(allOk ? 200 : 503).json({
    status: allOk ? 'ok' : 'degraded',
    checks,
    model: cfg.anthropicModel,
    index: cfg.pineconeIndex,
  });
});

export default router;
