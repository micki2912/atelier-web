async function getGoogleToken(serviceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const encode = obj => btoa(JSON.stringify(obj)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const header = encode({ alg: 'RS256', typ: 'JWT' });
  const payload = encode({
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/analytics.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  });
  const toSign = `${header}.${payload}`;

  const pem = serviceAccount.private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\n/g, '');
  const der = Uint8Array.from(atob(pem), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(toSign));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const jwt = `${toSign}.${sigB64}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(`Token error: ${JSON.stringify(data)}`);
  return data.access_token;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { propertyId } = req.query;
  const saRaw = process.env.GA4_SERVICE_ACCOUNT;

  if (!saRaw || !propertyId) return res.status(400).json({ error: 'Paramètres manquants' });

  try {
    const serviceAccount = JSON.parse(saRaw);
    const token = await getGoogleToken(serviceAccount);

    const reportRes = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dateRanges: [{ startDate: '29daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'date' }],
        metrics: [{ name: 'screenPageViews' }],
        orderBys: [{ dimension: { dimensionName: 'date' }, desc: false }]
      })
    });

    const report = await reportRes.json();
    if (!reportRes.ok) return res.status(200).json({ error: report.error?.message || 'GA4 error', _debug: report });

    const rows = report.rows || [];
    const timeline = rows.map(r => ({
      date: `${r.dimensionValues[0].value.slice(0,4)}-${r.dimensionValues[0].value.slice(4,6)}-${r.dimensionValues[0].value.slice(6,8)}`,
      count: parseInt(r.metricValues[0].value, 10)
    }));
    const total = timeline.reduce((s, d) => s + d.count, 0);

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    return res.json({ total, timeline });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
