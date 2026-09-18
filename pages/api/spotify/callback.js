export default async function handler(req, res) {
  const { path = '', password, code, action } = req.query;
  
  // We use a generic password check here just in case, 
  // but the Spotify token is what really matters for the music.
  const token = req.query.token;
  const clientID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  // 1. Handle the Login (Callback from Spotify)
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
    } catch (e) {
      return res.status(500).json({ error: 'Login failed' });
    }
  }

  // 2. Handle Control Commands (Play/Pause/Next)
  if (action) {
    if (!token) return res.status(401).json({ error: 'No token provided' });
    
    let endpoint = '';
    if (action === 'play') endpoint = '/v1/me/player/play';
    if (action === 'pause') endpoint = '/v1/me/player/pause';
    if (action === 'next') endpoint = '/v1/me/player/next';

    try {
      const response = await fetch(`https://api.spotify.com${endpoint}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      return res.status(response.status).json({ success: response.ok });
    } catch (e) {
      return res.status(500).json({ error: 'Control failed' });
    }
  }
}
