export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { projectId } = req.query;
  const token = process.env.VERCEL_TOKEN;
  const teamId = process.env.VERCEL_TEAM_ID;

  if (!token || !projectId) return res.status(400).json({ error: 'Paramètres manquants' });

  const until = new Date();
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const authHeader = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  const baseParams = {
    projectId,
    since: since.toISOString(),
    until: until.toISOString(),
    ...(teamId && { teamId })
  };

  try {
    // Vercel Web Analytics API v1
    const [timelineRes, totalRes] = await Promise.all([
      fetch(`https://api.vercel.com/v1/web/analytics/timeseries?${new URLSearchParams({ ...baseParams, granularity: 'day', event: 'pageview' })}`, { headers: authHeader }),
      fetch(`https://api.vercel.com/v1/web/analytics/stats?${new URLSearchParams(baseParams)}`, { headers: authHeader })
    ]);

    const [timeline, total] = await Promise.all([
      timelineRes.json(),
      totalRes.json()
    ]);

    return res.json({ timeline, total, raw: { timelineStatus: timelineRes.status, totalStatus: totalRes.status } });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
