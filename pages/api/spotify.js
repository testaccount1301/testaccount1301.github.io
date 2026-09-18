export default async function handler(req, res) {
  const { code, action } = req.query;
  const clientID = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  // 1. Handle the Login (Callback)
  if (code) {
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
    // Redirect back to home with the token
    return res.redirect(`/?spotify_token=${data.access_token}`);
  }

  // 2. Handle Control Commands (Play/Pause/Next)
  if (action) {
    const token = req.query.token;
    let endpoint = '';
    if (action === 'play') endpoint = '/v1/me/player/play';
    if (action === 'pause') endpoint = '/v1/me/player/pause';
    if (action === 'next') endpoint = '/v1/me/player/next';

    const response = await fetch(`https://api.spotify.com${endpoint}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` },
    });

    return res.status(response.status).json({ success: response.ok });
  }
}
