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
    const countUrl = `https://api.vercel.com/v1/web/analytics/pageviews/count?${base}`;
    const timelineUrl = `https://api.vercel.com/v1/web/analytics/pageviews/aggregate?${new URLSearchParams({ ...Object.fromEntries(base), by: 'day' })}`;

    const [countRes, timelineRes] = await Promise.all([
      fetch(countUrl, { headers }),
      fetch(timelineUrl, { headers })
    ]);

    const countText = await countRes.text();
    const timelineText = await timelineRes.text();

    let countRaw, timelineRaw;
    try { countRaw = JSON.parse(countText); } catch { countRaw = { _parseError: countText }; }
    try { timelineRaw = JSON.parse(timelineText); } catch { timelineRaw = { _parseError: timelineText }; }

    if (!countRes.ok) {
      return res.status(200).json({
        error: `Vercel count API ${countRes.status}`,
        _debug: { countRaw, timelineRaw, countUrl, base: base.toString() }
      });
    }

    // Normalize count — handle multiple possible response shapes
    const total = countRaw?.data?.pageviews
      ?? countRaw?.data?.total
      ?? countRaw?.pageviews
      ?? countRaw?.total
      ?? countRaw?.count
      ?? null;

    // Normalize timeline rows
    const rows = timelineRaw?.data ?? timelineRaw?.rows ?? timelineRaw?.results ?? [];
    const timeline = Array.isArray(rows) ? rows.map(d => ({
      date: d.key ?? d.start ?? d.date ?? d.timestamp ?? '',
      count: d.pageviews ?? d.count ?? d.total ?? 0
    })) : [];

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    return res.json({ total, timeline, _debug: { countRaw, timelineRaw } });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
