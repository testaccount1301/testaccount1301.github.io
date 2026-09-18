import React, { useState } from 'react';

export default function Home() {
  const [password, setPassword] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [currentPath, setCurrentPath] = useState('');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);

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

  if (!isAuthorized) {
    return (
      <div style={styles.authContainer}>
        <form onSubmit={(e) => { e.preventDefault(); setIsAuthorized(true); fetchFiles(''); }} style={styles.authCard}>
          <h2 style={styles.authTitle}>🔒 Private Vault</h2>
          <input type="password" placeholder="Access Key" style={styles.input} value={password} onChange={(e) => setPassword(e.target.value)} />
          <button style={styles.button}>Unlock</button>
        </form>
      </div>
    );
  }

  return (
    <main style={styles.main}>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>📁 File Explorer</h1>
            <p style={styles.subtitle}>Path: <code style={styles.pathCode}>{currentPath || '/ (Root)'}</code></p>
          </div>
          <button onClick={() => fetchFiles('')} style={styles.rootBtn}>🏠 Root</button>
        </div>

        {isDownloading && (
          <div style={styles.progressWrapper}>
            <div style={styles.progressText}>Downloading... {downloadProgress}%</div>
            <div style={styles.progressBarBg}><div style={{ ...styles.progressBarFill, width: `${downloadProgress}%` }}></div></div>
          </div>
        )}

        {loading ? <p style={styles.loading}>Loading files...</p> : (
          <div style={styles.fileGrid}>
            {files.map((file, i) => (
              <div key={i} style={styles.fileCard}>
                <div style={styles.fileIcon}>{file.type === 'dir' ? '📂' : '📄'}</div>
                <div style={styles.fileInfo}>
                  <div style={styles.fileName}>{file.name}</div>
                  <div style={styles.fileDesc}>{file.description}</div>
                </div>
                {file.type === 'dir' ? 
                  <button onClick={() => fetchFiles(`${currentPath}/${file.path}`)} style={styles.openBtn}>Open</button> : 
                  <button onClick={() => handleDownload(file.path)} style={styles.downloadBtn}>Download</button>
                }
              </div>
            ))}
          </div>
        )}

        <div style={styles.spotifyWrapper}>
          <h3 style={styles.sectionTitle}>🎵 Now Playing</h3>
          <iframe style={styles.spotifyIframe} src="https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5j?utm_source=generator&theme=0" width="100%" height="152" frameBorder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>
        </div>
      </div>
    </main>
  );
}

const styles = {
  main: { padding: '2rem', fontFamily: 'Inter, sans-serif', backgroundColor: '#0f172a', minHeight: '100vh', color: '#f8fafc' },
  container: { maxWidth: '1000px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' },
  title: { fontSize: '2rem', fontWeight: 'bold', margin: 0 },
  subtitle: { color: '#94a3b8', margin: 0 },
  pathCode: { background: '#1e293b', padding: '2px 6px', borderRadius: '4px', color: '#3b82f6' },
  rootBtn: { padding: '0.6rem 1.2rem', borderRadius: '8px', border: '1px solid #334155', background: '#1e293b', color: 'white', cursor: 'pointer' },
  authContainer: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#020617', fontFamily: 'sans-serif' },
  authCard: { textAlign: 'center', background: '#0f172a', padding: '3rem', borderRadius: '24px', border: '1px solid #1e293b', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' },
  authTitle: { color: 'white', marginBottom: '1.5rem', fontSize: '1.8rem' },
  input: { padding: '0.8rem', borderRadius: '12px', border: '1px solid #334155', background: '#1e293b', color: 'white', marginBottom: '1.5rem', display: 'block', width: '100%', outline: 'none' },
  button: { width: '100%', padding: '0.8rem', borderRadius: '12px', border: 'none', background: '#3b82f6', color: 'white', fontWeight: 'bold', cursor: 'pointer' },
  progressWrapper: { marginBottom: '2rem', padding: '1rem', background: '#1e293b', borderRadius: '12px', border: '1px solid #334155' },
  progressText: { color: '#94a3b8', fontSize: '0.9rem', marginBottom: '0.5rem', textAlign: 'center' },
  progressBarBg: { height: '8px', background: '#0f172a', borderRadius: '4px', overflow: 'hidden' },
  progressBarFill: { height: '100%', background: '#3b82f6', transition: 'width 0.3s ease' },
  fileGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' },
  fileCard: { background: '#1e293b', padding: '1.2rem', borderRadius: '16px', border: '1px solid #334155', display: 'flex', alignItems: 'center', gap: '1rem' },
  fileIcon: { fontSize: '2rem' },
  fileInfo: { flex: 1, overflow: 'hidden' },
  fileName: { fontWeight: 'bold', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  fileDesc: { fontSize: '0.8rem', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  openBtn: { background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontWeight: 'bold' },
  downloadBtn: { background: 'none', border: 'none', color: '#22c55e', cursor: 'pointer', fontWeight: 'bold' },
  spotifyWrapper: { marginTop: '3rem', padding: '1.5rem', background: '#1e293b', borderRadius: '24px', border: '1px solid #334155' },
  sectionTitle: { color: '#1db954', marginBottom: '1rem', textAlign: 'center' },
  spotifyIframe: { borderRadius: '12px' },
  loading: { textAlign: 'center', color: '#94a3b8' }
};
