const DEMANDES_DB = 'e494e92c5dea4c018c123d0a471c657f';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const token = process.env.NOTION_TOKEN;
  if (!token) return res.status(500).json({ error: 'NOTION_TOKEN manquant' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    const client = body.client || body._subject?.replace('Modification – ', '') || 'Inconnu';
    const message = body.message || '';

    // Parse modifications from message text
    const modifBlocks = message.split(/--- Modification \d+ ---/).filter(Boolean);

    for (const block of modifBlocks) {
      const page = (block.match(/Page:\s*(.+)/) || [])[1]?.trim() || '';
      const desc = (block.match(/Description:\s*([\s\S]+?)(?:\nFichier:|$)/) || [])[1]?.trim() || '';
      const lien = (block.match(/Fichier:\s*(.+)/) || [])[1]?.trim() || '';
      const titre = page ? `${client} — ${page}` : client;

      const notionBody = {
        parent: { database_id: DEMANDES_DB },
        properties: {
          Titre: { title: [{ text: { content: titre } }] },
          Client: { rich_text: [{ text: { content: client } }] },
          Page: { rich_text: [{ text: { content: page } }] },
          Description: { rich_text: [{ text: { content: desc } }] },
          Statut: { select: { name: 'À faire' } },
          ...(lien ? { 'Lien fichier': { url: lien } } : {})
        }
      };

      await fetch('https://api.notion.com/v1/pages', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(notionBody)
      });
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
