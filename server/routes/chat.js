import { Router } from 'express';
import { handleMessage } from '../services/orchestrator.js';

const router = Router();

router.post('/', async (req, res) => {
  const { message, history = [] } = req.body;
  if (!message?.trim())
    return res.status(400).json({ error: 'Message is required' });
  try {
    const result = await handleMessage(message.trim(), history);
    res.json(result);
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

export default router;
