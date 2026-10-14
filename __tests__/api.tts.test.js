import { createMocks } from 'node-mocks-http';

describe('/api/tts endpoint', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
    global.fetch = jest.fn();
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    jest.restoreAllMocks();
  });

  const getHandler = () => require('../pages/api/tts').default;

  test('no SARVAM_API_KEY returns 400', async () => {
    delete process.env.SARVAM_API_KEY;
    const handler = getHandler();
    const { req, res } = createMocks({
      method: 'POST',
      body: { text: 'Hello', lang: 'en' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    const data = JSON.parse(res._getData());
    expect(data).toEqual({ error: 'SARVAM_API_KEY not configured' });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('GET returns 405', async () => {
    process.env.SARVAM_API_KEY = 'test_key';
    const handler = getHandler();
    const { req, res } = createMocks({
      method: 'GET',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(405);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('missing text returns 400', async () => {
    process.env.SARVAM_API_KEY = 'test_key';
    const handler = getHandler();
    const { req, res } = createMocks({
      method: 'POST',
      body: { text: '', lang: 'en' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    const data = JSON.parse(res._getData());
    expect(data).toHaveProperty('error');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('unsupported lang returns 400', async () => {
    process.env.SARVAM_API_KEY = 'test_key';
    const handler = getHandler();
    const { req, res } = createMocks({
      method: 'POST',
      body: { text: 'Valid text', lang: 'fr' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    const data = JSON.parse(res._getData());
    expect(data).toEqual({ error: 'Unsupported language' });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('upstream non-OK returns 502', async () => {
    process.env.SARVAM_API_KEY = 'test_key';
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Internal Sarvam Error with secret details',
    });

    const handler = getHandler();
    const { req, res } = createMocks({
      method: 'POST',
      body: { text: 'Test text', lang: 'hi' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(502);
    const data = JSON.parse(res._getData());
    expect(data).toEqual({ error: 'Sarvam AI request failed' });
    // Verify no secret leak
    expect(res._getData()).not.toContain('secret details');
  });

  test('fetch rejection returns 500', async () => {
    process.env.SARVAM_API_KEY = 'test_key';
    global.fetch.mockRejectedValueOnce(new Error('Network connection timeout'));

    const handler = getHandler();
    const { req, res } = createMocks({
      method: 'POST',
      body: { text: 'Test text', lang: 'kn' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(500);
    const data = JSON.parse(res._getData());
    expect(data).toEqual({ error: 'TTS generation failed' });
  });

  test('success returns 200 with Content-Type audio/wav and decoded bytes, with expected payload and headers', async () => {
    process.env.SARVAM_API_KEY = 'sarvam_secret_test_key';
    const sampleAudioBytes = Buffer.from('RIFF_SAMPLE_WAV_HEADER_DATA_123');
    const base64Audio = sampleAudioBytes.toString('base64');

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        request_id: 'req_tts_12345',
        audios: [base64Audio],
      }),
    });

    const handler = getHandler();
    const { req, res } = createMocks({
      method: 'POST',
      body: { text: 'Namaste kisan bhai', lang: 'hi' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(res.getHeader('content-type') || res._getHeaders()['content-type']).toBe('audio/wav');

    const receivedBuffer = Buffer.isBuffer(res._getData())
      ? res._getData()
      : Buffer.from(res._getData());
    expect(receivedBuffer.equals(sampleAudioBytes)).toBe(true);

    // Assert fetch call specifications
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [calledUrl, calledOptions] = global.fetch.mock.calls[0];
    expect(calledUrl).toBe('https://api.sarvam.ai/text-to-speech');
    expect(calledOptions.headers).toHaveProperty('api-subscription-key', 'sarvam_secret_test_key');
    expect(calledOptions.headers).toHaveProperty('Content-Type', 'application/json');

    const sentBody = JSON.parse(calledOptions.body);
    expect(sentBody).toEqual({
      text: 'Namaste kisan bhai',
      language_code: 'hi-IN',
      model: 'bulbul:v3',
      speaker: 'shubh',
    });
  });

  test('text longer than 2500 chars is truncated', async () => {
    process.env.SARVAM_API_KEY = 'sarvam_test_key';
    const longText = 'kisan '.repeat(600); // 3600 characters
    expect(longText.length).toBeGreaterThan(2500);

    const sampleAudioBytes = Buffer.from('RIFF_WAV');
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        request_id: 'req_long',
        audios: [sampleAudioBytes.toString('base64')],
      }),
    });

    const handler = getHandler();
    const { req, res } = createMocks({
      method: 'POST',
      body: { text: longText, lang: 'en' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [, calledOptions] = global.fetch.mock.calls[0];
    const sentBody = JSON.parse(calledOptions.body);
    expect(sentBody.text).toHaveLength(2500);
    expect(sentBody.text).toBe(longText.slice(0, 2500));
    expect(sentBody.language_code).toBe('en-IN');
    expect(sentBody.model).toBe('bulbul:v3');
  });
});
