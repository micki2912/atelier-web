import * as XLSX from 'xlsx';

async function resolveDownloadUrl(shareUrl) {
  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
  // Suivre les redirections manuellement pour extraire resid+authkey
  let url = shareUrl;
  for (let i = 0; i < 6; i++) {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'manual',
      headers: { 'User-Agent': UA }
    });
    const loc = res.headers.get('location');
    if (!loc) break;
    url = loc;
    // Dès qu'on a un resid+authkey, construire l'URL de téléchargement
    try {
      const u = new URL(url);
      const resid = u.searchParams.get('resid');
      const authkey = u.searchParams.get('authkey') || u.searchParams.get('AuthKey');
      if (resid && authkey) {
        return `https://onedrive.live.com/download?resid=${encodeURIComponent(resid)}&authkey=${encodeURIComponent(authkey)}&em=2`;
      }
    } catch {}
  }
  // Fallback: ajouter download=1 à l'URL finale
  const sep = url.includes('?') ? '&' : '?';
  return url + sep + 'download=1';
}

async function fetchSheet(shareUrl, sheetName) {
  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
  const downloadUrl = await resolveDownloadUrl(shareUrl);
  const res = await fetch(downloadUrl, {
    headers: { 'User-Agent': UA, 'Accept': 'application/octet-stream,*/*' },
    redirect: 'follow'
  });
  if (!res.ok) throw new Error(`Erreur téléchargement (${res.status}) url=${downloadUrl}`);
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('text/html')) throw new Error(`HTML reçu au lieu du fichier — url=${downloadUrl}`);
  const buffer = await res.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheet = wb.Sheets[sheetName] || wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { defval: '' });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { action, code } = req.query;
  const PORTAIL_URL = process.env.PORTAIL_XLSX_URL;

  if (!code) return res.status(400).json({ error: 'Code manquant' });
  if (!PORTAIL_URL) return res.status(500).json({ error: 'Portail non configuré' });

  try {
    // 1. Lire le fichier index Portail.xlsx
    const index = await fetchSheet(PORTAIL_URL, 'Feuil1');
    const entry = index.find(r => r.code && String(r.code).toLowerCase() === code.toLowerCase());

    if (!entry || !entry.url_onedrive) return res.status(401).json({ error: 'Code invalide' });

    // 2. Lire le Facture.xlsx du client
    if (action === 'login') {
      const infos = await fetchSheet(entry.url_onedrive, 'Infos');
      const client = infos[0]; // une seule ligne d'infos
      if (!client) return res.status(401).json({ error: 'Données client introuvables' });

      const sites = client.sites ? String(client.sites).split('|').map(s => s.trim()).filter(Boolean) : [];
      const pages = client.pages ? String(client.pages).split('|').map(p => p.trim()).filter(Boolean) : [];

      return res.json({
        nom: client.nom || '',
        sites,
        forfait: client.forfait || '',
        prix_chf: client.prix_chf || '',
        statut: client.statut || 'À jour',
        vercel_project_id: client.vercel_project_id || '',
        pages
      });
    }

    if (action === 'factures') {
      const factures = await fetchSheet(entry.url_onedrive, 'Factures');
      return res.json(factures);
    }

    return res.status(400).json({ error: 'Action inconnue' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
