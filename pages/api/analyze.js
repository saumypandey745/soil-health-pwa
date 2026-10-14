import { analyzeSoil } from '../../lib/soilLogic';

export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }
  }

  const { n, p, k, ph, context } = body || {};

  if ([n, p, k, ph].some((v) => v === undefined || isNaN(v))) {
    return res.status(400).json({ error: 'Invalid NPK/pH values' });
  }

  const result = analyzeSoil(
    { n: Number(n), p: Number(p), k: Number(k), ph: Number(ph) },
    context || {}
  );
  return res.status(200).json(result);
}
