export default async function handler(req, res) {
  const { path = '', password, code, action, token, volume } = req.query;
  const clientID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (code) {
    try {
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: 'https://testaccount1301githubio.vercel.app/api/spotify/callback',
          client_id: clientID,
          client_secret: clientSecret,
        }),
      });
      const data = await response.json();
      return res.redirect(`/?spotify_token=${data.access_token}`);
    } catch (e) { return res.status(500).json({ error: 'Login failed' }); }
  }

  if (!token) return res.status(401).json({ error: 'No token' });

  if (req.method === 'GET' && !action) {
    const response = await fetch('https://api.spotify.com/v1/me/player', {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const data = await response.json();
    return res.status(response.status).json(data);
  }

  // CONTROL COMMANDS
  let endpoint = '';
  let body = null;

  if (action === 'play') endpoint = '/v1/me/player/play';
  else if (action === 'pause') endpoint = '/v1/me/player/pause';
  else if (action === 'next') endpoint = '/v1/me/player/next';
  else if (action === 'prev') endpoint = '/v1/me/player/previous';
  else if (action === 'volume') {
    endpoint = '/v1/me/player/volume';
    body = JSON.stringify({ volume_percent: parseInt(volume) });
  }

  try {
    const response = await fetch(`https://api.spotify.com${endpoint}`, {
      method: 'PUT',
      headers: { 
        'Authorization': `Bearer ${token}`, 
        'Content-Type': 'application/json' 
      },
      body: body,
    });
    return res.status(response.status).json({ success: response.ok });
  } catch (e) {
    return res.status(500).json({ error: 'Control failed' });
  }
}
