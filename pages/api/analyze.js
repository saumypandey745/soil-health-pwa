import { analyzeSoil } from '../../lib/soilLogic';

export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { n, p, k, ph } = req.body || {};

  if ([n, p, k, ph].some((v) => v === undefined || isNaN(v))) {
    return res.status(400).json({ error: 'Invalid NPK/pH values' });
  }

  const result = analyzeSoil({ n: Number(n), p: Number(p), k: Number(k), ph: Number(ph) });
  res.status(200).json(result);
}
