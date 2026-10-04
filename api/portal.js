import { readFileSync } from 'fs';
import { join } from 'path';

function readJSON(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { action, code } = req.query;
  if (!code) return res.status(400).json({ error: 'Code manquant' });

  const dataDir = join(process.cwd(), 'data');
  const clients = readJSON(join(dataDir, 'clients.json'));
  if (!clients) return res.status(500).json({ error: 'Données non disponibles' });

  const client = clients.find(c => c.code && c.code.toLowerCase() === code.toLowerCase());
  if (!client) return res.status(401).json({ error: 'Code invalide' });

  if (action === 'login') {
    const { code: _code, ...safeClient } = client;
    return res.json(safeClient);
  }

  if (action === 'factures') {
    const factures = readJSON(join(dataDir, 'factures', `${client.code.toUpperCase()}.json`)) || [];
    return res.json(factures);
  }

  return res.status(400).json({ error: 'Action inconnue' });
}
