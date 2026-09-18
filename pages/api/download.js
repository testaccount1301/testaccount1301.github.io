export default async function handler(req, res) {
  const { path } = req.query;
  if (!path) return res.status(400).json({ error: 'Path required' });
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  try {
    const response = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
      headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3.raw' },
    });
    if (!response.ok) return res.status(response.status).json({ error: 'File not found' });
    const buffer = await response.arrayBuffer();
    res.setHeader('Content-Disposition', `attachment; filename="${path.split('/').pop()}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.send(Buffer.from(buffer));
  } catch (error) {
    res.status(500).json({ error: 'Server Error' });
  }
}
