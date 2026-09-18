import React, { useState, useEffect } from 'react';

export default function Home() {
  const [password, setPassword] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [currentPath, setCurrentPath] = useState('');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [spotifyToken, setSpotifyToken] = useState(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('spotify_token');
    if (token) {
      setSpotifyToken(token);
      window.history.replaceState({}, document.title, "/");
    }
  }, []);

  const fetchFiles = async (path = '') => {
    setLoading(true);
    try {
      const res = await fetch(`/api/files?path=${encodeURIComponent(path)}&password=${password}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unauthorized');
      setFiles(data);
      setCurrentPath(path);
    } catch (e) {
      alert("❌ Error: " + e.message);
      if (e.message.includes('Unauthorized')) setIsAuthorized(false);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (filePath) => {
    setIsDownloading(true);
    setDownloadProgress(0);
    try {
      const response = await fetch(`/api/download?path=${encodeURIComponent(filePath)}`);
      if (!response.ok) throw new Error('Download failed');
      const reader = response.body.getReader();
      const contentLength = +response.headers.get('Content-Length');
      let receivedLength = 0;
      let chunks = [];
      while(true) {
        const {done, value} = await reader.read();
        if (done) break;
        chunks.push(value);
        receivedLength += value.length;
        if (contentLength) setDownloadProgress(Math.round((receivedLength / contentLength) * 100));
      }
      const blob = new Blob(chunks);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filePath.split('/').pop();
      document.body.appendChild(a); a.click(); a.remove();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsDownloading(false);
      setTimeout(() => setDownloadProgress(0), 2000);
    }
  };

  const controlSpotify = async (action) => {
    await fetch(`/api/spotify?action=${action}&token=${spotifyToken}`);
  };

   const connectSpotify = () => {
    // We use the NEXT_PUBLIC_ prefix so the browser can see the ID
    const clientID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID; 
    const scope = 'user-modify-playback-state user-read-playback-state';
    const url = `https://accounts.spotify.com/authorize?client_id=${clientID}&response_type=code&redirect_uri=https://testaccount1301githubio.vercel.app/api/spotify/callback&scope=${scope}`;
    window.location.href = url;
  };


  if (!isAuthorized) {
    return (
      <div style={styles.authContainer}>
        <form onSubmit={(e) => { e.preventDefault(); setIsAuthorized(true); fetchFiles(''); }} style={styles.authCard}>
          <h2 style={styles.authTitle}>Vault Access</h2>
          <input type="password" placeholder="Enter Access Key" style={styles.input} value={password} onChange={(e) => setPassword(e.target.value)} />
          <button style={styles.button}>Unlock</button>
        </form>
      </div>
    );
  }

  return (
    <main style={styles.main}>
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.titleGroup}>
            <h1 style={styles.title}>File Explorer</h1>
            <div style={styles.breadcrumb}>
              <span style={{color: '#555'}}>Root</span> {currentPath && <span> / {currentPath}</span>}
            </div>
          </div>
          <button onClick={() => fetchFiles('')} style={styles.rootBtn}>🏠 Home</button>
        </div>

        {isDownloading && (
          <div style={styles.progressWrapper}>
            <div style={styles.progressText}>Downloading... {downloadProgress}%</div>
            <div style={styles.progressBarBg}><div style={{ ...styles.progressBarFill, width: `${downloadProgress}%` }}></div></div>
          </div>
        )}

        {loading ? <div style={styles.loading}>Loading Vault...</div> : (
          <div style={styles.fileGrid}>
            {files.map((file, i) => (
              <div key={i} style={styles.fileCard}>
                <div style={styles.cardMain}>
                  <div style={styles.fileIcon}>{file.type === 'dir' ? '📂' : '📄'}</div>
                  <div style={styles.fileInfo}>
                    <div style={styles.fileName}>{file.name}</div>
                    <div style={styles.fileDesc}>{file.description}</div>
                  </div>
                </div>
                <div style={styles.cardFooter}>
                  {file.type === 'dir' ? 
                    <button onClick={() => fetchFiles(`${currentPath}/${file.path}`)} style={styles.actionBtn}>Open Folder</button> : 
                    <button onClick={() => handleDownload(file.path)} style={styles.actionBtn}>Download</button>
                  }
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FLOATING MUSIC BAR */}
      <div style={styles.musicBar}>
        {!spotifyToken ? (
          <button onClick={connectSpotify} style={styles.connectBtn}>Connect Spotify</button>
        ) : (
          <div style={styles.controls}>
            <span style={styles.musicLabel}>Spotify Active</span>
            <div style={styles.btnGroup}>
              <button onClick={() => controlSpotify('pause')} style={styles.musicBtn}>⏸</button>
              <button onClick={() => controlSpotify('next')} style={styles.musicBtn}>⏭</button>
              <button onClick={() => controlSpotify('play')} style={styles.musicBtn}>▶</button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

const styles = {
  main: { padding: '3rem 1rem', fontFamily: '"Inter", sans-serif', backgroundColor: '#050505', minHeight: '100vh', color: '#eee', paddingBottom: '100px' },
  container: { maxWidth: '1000px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem', borderBottom: '1px solid #111', paddingBottom: '1.5rem' },
  titleGroup: { display: 'flex', flexDirection: 'column', gap: '0.4rem' },
  title: { fontSize: '2rem', fontWeight: '700', margin: 0, color: '#fff' },
  breadcrumb: { fontSize: '0.8rem', color: '#666', fontFamily: 'monospace' },
  rootBtn: { padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid #222', background: 'transparent', color: '#888', cursor: 'pointer', fontSize: '0.8rem' },
  authContainer: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#000' },
  authCard: { textAlign: 'center', background: '#0a0a0a', padding: '3rem', borderRadius: '16px', border: '1px solid #222' },
  authTitle: { color: 'white', marginBottom: '1.5rem', fontSize: '1.5rem' },
  input: { padding: '0.8rem', borderRadius: '8px', border: '1px solid #222', background: '#111', color: 'white', marginBottom: '1.5rem', display: 'block', width: '100%', textAlign: 'center' },
  button: { width: '100%', padding: '0.8rem', borderRadius: '8px', border: 'none', background: '#fff', color: '#000', fontWeight: '600', cursor: 'pointer' },
  progressWrapper: { marginBottom: '2rem', padding: '1rem', background: '#0a0a0a', borderRadius: '8px', border: '1px solid #222' },
  progressText: { color: '#555', fontSize: '0.7rem', marginBottom: '0.5rem', textAlign: 'center', textTransform: 'uppercase' },
  progressBarBg: { height: '3px', background: '#111', borderRadius: '2px', overflow: 'hidden' },
  progressBarFill: { height: '100%', background: '#fff', transition: 'width 0.3s ease' },
  fileGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' },
  fileCard: { background: '#0a0a0a', padding: '1.5rem', borderRadius: '12px', border: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' },
  cardMain: { display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' },
  fileIcon: { fontSize: '1.2rem', opacity: 0.5 },
  fileInfo: { flex: 1, overflow: 'hidden' },
  fileName: { fontWeight: '500', color: '#fff', fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  fileDesc: { fontSize: '0.75rem', color: '#555', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  cardFooter: { textAlign: 'right', borderTop: '1px solid #111', paddingTop: '0.8rem' },
  actionBtn: { background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '500' },
  loading: { textAlign: 'center', color: '#333', fontSize: '0.9rem', marginTop: '4rem' },
  musicBar: { position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', padding: '10px 20px', background: 'rgba(10, 10, 10, 0.8)', backdropFilter: 'blur(10px)', borderRadius: '40px', border: '1px solid #222', display: 'flex', alignItems: 'center', gap: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' },
  connectBtn: { background: '#1db954', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' },
  controls: { display: 'flex', alignItems: 'center', gap: '15px' },
  musicLabel: { color: '#1db954', fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' },
  btnGroup: { display: 'flex', gap: '10px' },
  musicBtn: { background: 'transparent', border: '1px solid #333', color: 'white', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' },
};
