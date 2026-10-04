const CLIENTS_DB = '4d968e3e2928477fb5a653df7af1e9a4';
const FACTURES_DB = 'a1e45922579846c0af45255c5d8d5241';

async function notionQuery(databaseId, filter) {
  const token = process.env.NOTION_TOKEN;
  const body = filter ? { filter } : {};
  const res = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`Notion ${res.status}`);
  return res.json();
}

function prop(page, name) {
  const p = page.properties[name];
  if (!p) return '';
  switch (p.type) {
    case 'title': return p.title.map(t => t.plain_text).join('');
    case 'rich_text': return p.rich_text.map(t => t.plain_text).join('');
    case 'number': return p.number;
    case 'select': return p.select?.name || '';
    case 'url': return p.url || '';
    case 'date': return p.date?.start || '';
    case 'formula': return p.formula?.date?.start || p.formula?.string || '';
    default: return '';
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { action, code } = req.query;
  if (!code) return res.status(400).json({ error: 'Code manquant' });
  if (!process.env.NOTION_TOKEN) return res.status(500).json({ error: 'NOTION_TOKEN manquant' });

  try {
    const clientsData = await notionQuery(CLIENTS_DB, {
      property: 'Code',
      rich_text: { equals: code.toUpperCase() }
    });

    if (!clientsData.results.length) return res.status(401).json({ error: 'Code invalide' });

    const page = clientsData.results[0];
    const client = {
      nom: prop(page, 'Nom'),
      prenom: prop(page, 'Prénom contact'),
      forfait: prop(page, 'Forfait'),
      prix_chf: String(prop(page, 'Prix CHF')),
      statut: prop(page, 'Statut'),
      sites: prop(page, 'Sites').split(',').map(s => s.trim()).filter(Boolean),
      pages: prop(page, 'Pages').split(',').map(s => s.trim()).filter(Boolean),
      vercel_project_id: prop(page, 'Vercel Project ID')
    };

    if (action === 'ping') return res.json({ v: 3, source: 'notion', nom: client.nom });

    if (action === 'login') return res.json(client);

    if (action === 'factures') {
      const facturesData = await notionQuery(FACTURES_DB, {
        property: 'Client Code',
        rich_text: { equals: code.toUpperCase() }
      });
      const factures = facturesData.results.map(p => ({
        numero: prop(p, 'Numéro'),
        date: prop(p, 'Date'),
        echeance: prop(p, 'Échéance'),
        montant_chf: String(prop(p, 'Montant CHF')),
        statut: prop(p, 'Statut'),
        url: prop(p, 'URL PDF')
      }));
      return res.json(factures);
    }

    return res.status(400).json({ error: 'Action inconnue' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
