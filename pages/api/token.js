export default async function handler(req, res) {
  const { channelName } = req.query;
  const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID;
  const appCertificate = process.env.AGORA_APP_CERTIFICATE;

  if (!channelName) return res.status(400).json({ error: 'channelName required' });
  if (!appId || !appCertificate) return res.status(500).json({ error: 'Server keys missing' });

  try {
    // We use the Agora token service with an explicit request for a 24-hour token
    const response = await fetch(`https://token.agora.io/token?appId=${appId}&appCertificate=${appCertificate}&channelName=${channelName}&ttl=86400`);
    const data = await response.json();
    
    if (data.token) {
      res.status(200).json({ token: data.token });
    } else {
      res.status(500).json({ error: 'Agora refused to issue token' });
    }
  } catch (e) {
    res.status(500).json({ error: 'Token Server Error' });
  }
}
