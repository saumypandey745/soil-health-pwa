import React from 'react';
import { createMocks } from 'node-mocks-http';
import nextConfig from '../next.config';
import ErrorBoundary from '../components/ErrorBoundary';
import assistantHandler from '../pages/api/assistant';

describe('Production Hardening (Stage B)', () => {
  describe('H-1: Production Security Headers (next.config.js)', () => {
    test('defines required security headers for all routes', async () => {
      expect(typeof nextConfig.headers).toBe('function');
      const headerConfigs = await nextConfig.headers();
      expect(Array.isArray(headerConfigs)).toBe(true);

      const catchAll = headerConfigs.find((h) => h.source === '/(.*)');
      expect(catchAll).toBeDefined();

      const headerMap = {};
      catchAll.headers.forEach((item) => {
        headerMap[item.key] = item.value;
      });

      expect(headerMap['X-Frame-Options']).toBe('DENY');
      expect(headerMap['X-Content-Type-Options']).toBe('nosniff');
      expect(headerMap['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
      expect(headerMap['X-DNS-Prefetch-Control']).toBe('on');
      expect(headerMap['Permissions-Policy']).toContain('camera=(self)');
    });
  });

  describe('H-2: Assistant Upstream Failure & Timeout Fallback', () => {
    test('gracefully falls back to expert engine when upstream AI request fails', async () => {
      const origKey = process.env.GEMINI_API_KEY;
      process.env.GEMINI_API_KEY = 'mock_key_for_timeout_test';

      const originalFetch = global.fetch;
      // Mock fetch simulating upstream network timeout or error
      global.fetch = jest.fn(() => Promise.reject(new Error('Upstream timeout')));

      const { req, res } = createMocks({
        method: 'POST',
        body: {
          message: 'What is my soil grade?',
          context: { soil: { score: 70, grade: 'C', limitingFactor: 'pH' } },
          lang: 'en',
        },
      });

      await assistantHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data).toHaveProperty('reply');
      expect(data.provider).toBe('expert_engine');
      expect(data.reply).toContain('Grade C');

      // Restore
      global.fetch = originalFetch;
      if (origKey) {
        process.env.GEMINI_API_KEY = origKey;
      } else {
        delete process.env.GEMINI_API_KEY;
      }
    });
  });

  describe('H-3: React Error Boundary', () => {
    test('instantiates and provides fallback state when error is caught', () => {
      const error = new Error('Test render crash');
      const state = ErrorBoundary.getDerivedStateFromError(error);
      expect(state).toEqual({ hasError: true, error });
    });
  });
});
