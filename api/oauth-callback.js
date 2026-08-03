// api/oauth-callback.js — Vercel Serverless Function

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { code, client_id: bodyClientId, client_secret: bodyClientSecret } = req.body || {};
  if (!code) return res.status(400).json({ error: 'Missing code' });

  // Kalau env var sudah di-set di server, JANGAN pakai nilai dari body.
  // Ini cegah siapapun kirim secret arbitrary ke endpoint ini.
  const client_id     = process.env.GITHUB_CLIENT_ID     || bodyClientId;
  const client_secret = process.env.GITHUB_CLIENT_SECRET || bodyClientSecret;

  // Kalau env var sudah ada tapi body masih kirim secret, tolak —
  // berarti ada yang coba override secret server dengan secret mereka sendiri.
  if (process.env.GITHUB_CLIENT_SECRET && bodyClientSecret) {
    return res.status(400).json({ error: 'Server sudah dikonfigurasi dengan env var, tidak perlu kirim secret lewat body' });
  }

  if (!client_id || !client_secret) {
    return res.status(500).json({ error: 'Client ID / Secret tidak ada — set env var GITHUB_CLIENT_ID dan GITHUB_CLIENT_SECRET di Vercel Dashboard' });
  }

  try {
    const ghRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ client_id, client_secret, code }),
    });

    if (!ghRes.ok) return res.status(502).json({ error: `GitHub merespons ${ghRes.status}` });

    const data = await ghRes.json();
    if (data.error) return res.status(400).json({ error: data.error_description || data.error });

    // Hanya kirim access_token — tidak ada field lain
    return res.status(200).json({ access_token: data.access_token });
  } catch (err) {
    return res.status(500).json({ error: 'Gagal menghubungi GitHub: ' + err.message });
  }
}
