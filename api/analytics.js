export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { projectId } = req.query;
  const token = process.env.VERCEL_TOKEN;
  const teamId = process.env.VERCEL_TEAM_ID;

  if (!token || !projectId) return res.status(400).json({ error: 'Paramètres manquants' });

  const until = new Date();
  const since = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000);

  const headers = { Authorization: `Bearer ${token}` };
  const base = new URLSearchParams({
    projectId,
    since: since.toISOString(),
    until: until.toISOString(),
    ...(teamId && { teamId })
  });

  try {
    const [countRes, timelineRes] = await Promise.all([
      fetch(`https://api.vercel.com/v1/web/analytics/pageviews/count?${base}`, { headers }),
      fetch(`https://api.vercel.com/v1/web/analytics/pageviews/aggregate?${new URLSearchParams({ ...Object.fromEntries(base), by: 'day' })}`, { headers })
    ]);

    const [count, timeline] = await Promise.all([countRes.json(), timelineRes.json()]);

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    return res.json({ count, timeline });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
