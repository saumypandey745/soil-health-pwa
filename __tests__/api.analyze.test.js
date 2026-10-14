import { createMocks } from 'node-mocks-http';
import handler from '../pages/api/analyze';

describe('/api/analyze endpoint', () => {
  test('valid POST returns 200 with score, overall, deficiencies, and recommendedCrops', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { n: 300, p: 20, k: 150, ph: 6.5 },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data).toHaveProperty('score');
    expect(data).toHaveProperty('overall');
    expect(data).toHaveProperty('deficiencies');
    expect(data).toHaveProperty('recommendedCrops');
  });

  test('GET returns 405', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(405);
  });

  test('PUT returns 405', async () => {
    const { req, res } = createMocks({
      method: 'PUT',
      body: { n: 300, p: 20, k: 150, ph: 6.5 },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(405);
  });

  test('missing field returns 400', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { n: 300, p: 20, k: 150 }, // missing ph
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    const data = JSON.parse(res._getData());
    expect(data).toHaveProperty('error');
    expect(data.error).toBe('Invalid NPK/pH values');
  });

  test('non-numeric string returns 400', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { n: 'abc', p: 20, k: 150, ph: 6.5 },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    const data = JSON.parse(res._getData());
    expect(data).toHaveProperty('error');
    expect(data.error).toBe('Invalid NPK/pH values');
  });

  test('empty body returns 400', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {},
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    const data = JSON.parse(res._getData());
    expect(data).toHaveProperty('error');
    expect(data.error).toBe('Invalid NPK/pH values');
  });

  test('numeric strings are coerced and return 200', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { n: '300', p: '20', k: '150', ph: '6.5' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data).toHaveProperty('score');
    expect(data).toHaveProperty('overall');
    expect(data).toHaveProperty('deficiencies');
    expect(data).toHaveProperty('recommendedCrops');
    expect(typeof data.score).toBe('number');
  });

  test('extreme large values return 200', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { n: 99999, p: 99999, k: 99999, ph: 14 },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data).toHaveProperty('score');
    expect(data).toHaveProperty('overall');
    expect(data).toHaveProperty('deficiencies');
    expect(data).toHaveProperty('recommendedCrops');
  });
});
