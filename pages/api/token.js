export default async function handler(req, res) {
  const { channelName } = req.query;
  const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID;
  const appCertificate = process.env.AGORA_APP_CERTIFICATE;

  if (!channelName) return res.status(400).json({ error: 'channelName required' });

  try {
    // We use a lightweight token generator service to avoid installing heavy SDKs
    const response = await fetch(`https://token.agora.io/token?appId=${appId}&appCertificate=${appCertificate}&channelName=${channelName}&ttl=3600`);
    const data = await response.json();
    
    if (data.token) {
      res.status(200).json({ token: data.token });
    } else {
      res.status(500).json({ error: 'Failed to generate token' });
    }
  } catch (e) {
    res.status(500).json({ error: 'Server Error' });
  }
}
