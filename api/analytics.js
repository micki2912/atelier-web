export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { projectId, since, until } = req.query;
  const token = process.env.VERCEL_TOKEN;
  const teamId = process.env.VERCEL_TEAM_ID;

  if (!token || !projectId) return res.status(400).json({ error: 'Paramètres manquants' });

  const sinceDate = since || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const untilDate = until || new Date().toISOString();

  const authHeader = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  try {
    const baseParams = new URLSearchParams({
      projectId,
      since: sinceDate,
      until: untilDate,
      ...(teamId && { teamId })
    });

    const [timelineRes, totalRes, pagesRes] = await Promise.all([
      fetch(`https://api.vercel.com/v1/web/analytics/pageviews/aggregate?${new URLSearchParams({ ...Object.fromEntries(baseParams), by: 'day' })}`, { headers: authHeader }),
      fetch(`https://api.vercel.com/v1/web/analytics/pageviews/count?${baseParams}`, { headers: authHeader }),
      fetch(`https://api.vercel.com/v1/web/analytics/pageviews/aggregate?${new URLSearchParams({ ...Object.fromEntries(baseParams), by: 'requestPath', limit: '5' })}`, { headers: authHeader })
    ]);

    const [timeline, total, pages] = await Promise.all([
      timelineRes.json(),
      totalRes.json(),
      pagesRes.json()
    ]);

    return res.json({ timeline, total, pages });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
