import { readFileSync } from 'fs';
import { join } from 'path';

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const data = readFileSync(join(process.cwd(), 'data', 'portfolio.json'), 'utf8');
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    return res.json(JSON.parse(data));
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
