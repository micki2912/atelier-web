const DEMANDES_DB = 'e494e92c5dea4c018c123d0a471c657f';

async function createNotionEntry(token, client, page, desc, lien) {
  const titre = page ? `${client} — ${page}` : client;
  await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      parent: { database_id: DEMANDES_DB },
      properties: {
        Titre: { title: [{ text: { content: titre } }] },
        Client: { rich_text: [{ text: { content: client } }] },
        Page: { rich_text: [{ text: { content: page } }] },
        Description: { rich_text: [{ text: { content: desc } }] },
        Statut: { select: { name: 'À faire' } },
        ...(lien ? { 'Lien fichier': { url: lien } } : {})
      }
    })
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const token = process.env.NOTION_TOKEN;
  if (!token) return res.status(500).json({ error: 'NOTION_TOKEN manquant' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { client, modifications } = body;

    if (!client || !Array.isArray(modifications)) {
      return res.status(400).json({ error: 'Format invalide' });
    }

    await Promise.all(modifications.map(m =>
      createNotionEntry(token, client, m.page || '', m.description || '', m.lien || '')
    ));

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
