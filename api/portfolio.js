import * as XLSX from 'xlsx';

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/octet-stream,*/*'
};

async function fetchOneDrive(shareUrl) {
  const encoded = Buffer.from(shareUrl).toString('base64url');
  const apiUrl = `https://api.onedrive.com/v1.0/shares/u!${encoded}/root/content`;
  let response = await fetch(apiUrl, { headers: BROWSER_HEADERS, redirect: 'follow' });
  if (!response.ok) response = await fetch(shareUrl, { headers: BROWSER_HEADERS, redirect: 'follow' });
  if (!response.ok) throw new Error(`Erreur téléchargement (${response.status})`);
  return response;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const XLSX_URL = process.env.PORTFOLIO_XLSX_URL;
  if (!XLSX_URL) return res.status(500).json({ error: 'Portfolio non configuré' });

  try {
    const response = await fetchOneDrive(XLSX_URL);
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
