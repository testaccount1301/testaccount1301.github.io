export default async function handler(req, res) {
  const { path = '', password } = req.query;

  if (password !== process.env.SITE_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized: Wrong Password' });
  }

  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;

  if (!token || !repo) {
    return res.status(500).json({ error: 'Server Config Error: Missing Token or Repo variable' });
  }

  try {
    // Use Bearer token and add User-Agent to avoid GitHub blocking the request
    const response = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
      headers: { 
        'Authorization': `Bearer ${token}`, 
        'User-Agent': 'Vercel-App-Downloader',
        'Accept': 'application/vnd.github.v3+json'
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('GitHub API Error:', errorBody);
      return res.status(response.status).json({ 
        error: `GitHub Error (${response.status}): ${errorBody || 'Not Found'}` 
      });
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Critical System Error: ' + error.message });
  }
}
