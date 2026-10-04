import * as XLSX from 'xlsx';

async function fetchSheet(shareUrl, sheetName) {
  // Résoudre le lien court 1drv.ms via HEAD, puis télécharger
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/octet-stream,*/*'
  };

  // Construire l'URL de téléchargement direct depuis le lien de partage
  // Pour OneDrive consumer: encoder en base64url et appeler l'API shares
  const encoded = Buffer.from(shareUrl).toString('base64url');
  const apiUrl = `https://api.onedrive.com/v1.0/shares/u!${encoded}/root/content`;

  let res = await fetch(apiUrl, { headers, redirect: 'follow' });

  // Si ça échoue, essayer de fetch le lien court directement
  if (!res.ok) {
    res = await fetch(shareUrl, { headers, redirect: 'follow' });
  }

  if (!res.ok) throw new Error(`Erreur téléchargement (${res.status})`);
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('text/html')) throw new Error('Réponse HTML inattendue — vérifiez les permissions du partage');

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
