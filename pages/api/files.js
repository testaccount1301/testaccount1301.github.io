export default async function handler(req, res) {
  const { path = '', password } = req.query;
  if (password !== process.env.SITE_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  try {
    const response = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
      headers: { Authorization: `token ${token}` },
    });
    if (!response.ok) return res.status(response.status).json({ error: 'Folder not found' });
    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Server Error' });
  }
}
