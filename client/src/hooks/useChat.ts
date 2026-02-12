import { useState, useCallback } from 'react';
import type { Message } from '../types';
import { sendMessage } from '../api/chat';

const WELCOME: Message = {
  id:      'welcome',
  role:    'assistant',
  content: 'Hoi! 👋 Welkom bij ZEB. Hoe kan ik je helpen?\n\nHello! How can I help you today? I speak NL, FR and EN.\n\nBonjour! Comment puis-je vous aider?',
};

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    setError(null);

    const userMsg: Message = {
      id:      Date.now().toString(),
      role:    'user',
      content: text.trim(),
    };

    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const data = await sendMessage(text.trim(), messages);
      const assistantMsg: Message = {
        id:              (Date.now() + 1).toString(),
        role:            'assistant',
        content:         data.reply,
        intent:          data.intent,
        sentiment:       data.sentiment,
        orders:          data.orders,
        sources:         data.sources,
        escalated:       data.escalated,
        escalationReason: data.escalationReason,
        ms:              data.ms,
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      setError(err.message);
      setMessages(prev => [...prev, {
        id:      (Date.now() + 1).toString(),
        role:    'assistant',
        content: `⚠️ Error: ${err.message}`,
      }]);
    } finally {
      setLoading(false);
    }
  }, [messages, loading]);

  const reset = useCallback(() => {
    setMessages([WELCOME]);
    setError(null);
  }, []);

  return { messages, loading, error, send, reset };
}
