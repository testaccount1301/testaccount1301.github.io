export default async function handler(req, res) {
  const { path = '', password } = req.query;
  if (password !== process.env.SITE_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;

  try {
    // 1. Get the list of files/folders
    const fileRes = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
      headers: { 'Authorization': `Bearer ${token}`, 'User-Agent': 'Vercel-App' },
    });

    if (!fileRes.ok) return res.status(fileRes.status).json({ error: 'Folder not found' });
    const allFiles = await fileRes.json();

    // 2. Fetch the last commit message for every file to use as a description
    const filesWithCommits = await Promise.all(allFiles.map(async (file) => {
      try {
        const commitRes = await fetch(`https://api.github.com/repos/${repo}/commits?path=${encodeURIComponent(file.path)}&per_page=1`, {
          headers: { 'Authorization': `Bearer ${token}`, 'User-Agent': 'Vercel-App' },
        });
        if (commitRes.ok) {
          const commitData = await commitRes.json();
          if (commitData.length > 0) {
            return { ...file, description: commitData[0].commit.message };
          }
        }
      } catch (e) {}
      return { ...file, description: file.type === 'dir' ? 'Directory' : 'No description available' };
    }));

    res.status(200).json(filesWithCommits);
  } catch (error) {
    res.status(500).json({ error: 'Server Error' });
  }
}
