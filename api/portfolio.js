import * as XLSX from 'xlsx';

function oneDriveDirectUrl(shareUrl) {
  const encoded = Buffer.from(shareUrl).toString('base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `https://api.onedrive.com/v1.0/shares/u!${encoded}/root/content`;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const XLSX_URL = process.env.PORTFOLIO_XLSX_URL;
  if (!XLSX_URL) return res.status(500).json({ error: 'Portfolio non configuré' });

  try {
    const directUrl = oneDriveDirectUrl(XLSX_URL);
    const response = await fetch(directUrl);
    if (!response.ok) throw new Error(`Erreur téléchargement (${response.status})`);

    const buffer = await response.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'array' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    // Cache 1h
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    return res.json(rows);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
