import { createMocks } from 'node-mocks-http';
import handler from '../pages/api/assistant';
import { generateAgronomyAdvice } from '../lib/assistantEngine';

describe('Phase 3C - AI Farmer Assistant & API Security', () => {
  const sampleContext = {
    soil: {
      n: 180,
      p: 15,
      k: 220,
      ph: 5.4,
      score: 62,
      grade: 'C',
      limitingFactor: 'Soil acidity (pH 5.40)',
    },
    farm: {
      season: 'rabi',
      waterAvailability: 'limited',
      previousCrop: 'Rice',
    },
    recommendations: [{ name: 'Wheat', score: 85 }, { name: 'Millets', score: 78 }],
  };

  describe('lib/assistantEngine.js (Deterministic Agronomy Reasoning)', () => {
    test('explains low soil grade and limiting factor correctly in English', () => {
      const reply = generateAgronomyAdvice({
        message: 'Why is my soil grade low?',
        context: sampleContext,
        lang: 'en',
      });

      expect(reply).toContain('Grade C');
      expect(reply).toContain('limiting factor');
      expect(reply).toContain('local agricultural office');
    });

    test('explains soil acidity and liming advice in Hindi', () => {
      const reply = generateAgronomyAdvice({
        message: 'pH 5.4 ka kya matlab hai?',
        context: sampleContext,
        lang: 'hi',
      });

      expect(reply).toContain('pH मान 5.4');
      expect(reply).toContain('अम्लीय');
      expect(reply).toContain('कृषि विशेषज्ञ');
    });

    test('explains soil acidity and liming advice in Kannada', () => {
      const reply = generateAgronomyAdvice({
        message: 'ನನ್ನ ಮಣ್ಣಿನ pH 5.4 ಬಗ್ಗೆ ತಿಳಿಸಿ',
        context: sampleContext,
        lang: 'kn',
      });

      expect(reply).toContain('5.4');
      expect(reply).toContain('ಆಮ್ಲೀಯ');
      expect(reply).toContain('ಕೃಷಿ ಅಧಿಕಾರಿ');
    });

    test('explains nitrogen management without giving universal chemical dosage', () => {
      const reply = generateAgronomyAdvice({
        message: 'Nitrogen kam hai, kya karu?',
        context: sampleContext,
        lang: 'hi',
      });

      expect(reply).toContain('नाइट्रोजन');
      // Must not give universal fertilizer dose
      expect(reply).not.toMatch(/\b\d+\s*kg\s*urea\b/i);
      expect(reply).toContain('गोबर की खाद');
    });

    test('handles crop comparison query and respects contextual fit', () => {
      const reply = generateAgronomyAdvice({
        message: 'Mere liye wheat ya maize me kya behtar hai?',
        context: sampleContext,
        lang: 'hi',
      });

      expect(reply).toContain('गेहूं');
      expect(reply).toContain('रबी');
    });

    test('always provides safe agricultural disclaimer in all languages', () => {
      const enReply = generateAgronomyAdvice({ message: 'General advice', context: sampleContext, lang: 'en' });
      const hiReply = generateAgronomyAdvice({ message: 'General advice', context: sampleContext, lang: 'hi' });
      const knReply = generateAgronomyAdvice({ message: 'General advice', context: sampleContext, lang: 'kn' });

      expect(enReply.toLowerCase()).toContain('disclaimer');
      expect(hiReply).toContain('सलाह');
      expect(knReply).toContain('ಸಲಹೆ');
    });
  });

  describe('/api/assistant Endpoint Security & Contracts', () => {
    test('POST with valid message and context returns 200 with structured reply', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          message: 'Explain my report',
          context: sampleContext,
          lang: 'en',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data).toHaveProperty('reply');
      expect(typeof data.reply).toBe('string');
      expect(data.reply.length).toBeGreaterThan(20);
    });

    test('rejects GET method with 405 Method Not Allowed', async () => {
      const { req, res } = createMocks({
        method: 'GET',
      });

      await handler(req, res);
      expect(res._getStatusCode()).toBe(405);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Method not allowed');
    });

    test('rejects PUT and DELETE methods with 405', async () => {
      const { req: putReq, res: putRes } = createMocks({ method: 'PUT', body: { message: 'hi' } });
      await handler(putReq, putRes);
      expect(putRes._getStatusCode()).toBe(405);

      const { req: delReq, res: delRes } = createMocks({ method: 'DELETE' });
      await handler(delReq, delRes);
      expect(delRes._getStatusCode()).toBe(405);
    });

    test('rejects empty or whitespace message with 400', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          message: '   ',
          context: sampleContext,
        },
      });

      await handler(req, res);
      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('A valid message string is required');
    });

    test('rejects oversized message (> 500 characters) with 400 to prevent payload abuse', async () => {
      const longMessage = 'A'.repeat(505);
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          message: longMessage,
          context: sampleContext,
        },
      });

      await handler(req, res);
      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Message exceeds maximum allowed length of 500 characters');
    });

    test('rejects invalid context parameter with 400', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          message: 'Hello',
          context: 'invalid_string_context',
        },
      });

      await handler(req, res);
      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Invalid context object');
    });

    test('does not leak internal API secrets or stack traces in error states', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: null, // will trigger safe fallback or error
      });

      await handler(req, res);
      const data = JSON.parse(res._getData());
      const rawOutput = JSON.stringify(data);

      expect(rawOutput).not.toContain('GEMINI_API_KEY');
      expect(rawOutput).not.toContain('SARVAM_API_KEY');
      expect(rawOutput).not.toContain('stack');
    });
  });
});
