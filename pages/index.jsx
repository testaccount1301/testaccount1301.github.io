import React, { useState } from 'react';

export default function Home() {
  const [password, setPassword] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [currentPath, setCurrentPath] = useState('');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showSpotifyModal, setShowSpotifyModal] = useState(false);

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

  const openSpotify = () => {
    // This triggers the local Spotify App on the user's PC
    window.location.href = "spotify:open"; 
    setShowSpotifyModal(false);
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
              <span style={{color: '#666'}}>Root</span> 
              {currentPath && <span> / {currentPath}</span>}
            </div>
          </div>
          <div style={styles.actions}>
            <button onClick={() => setShowSpotifyModal(true)} style={styles.spotifyBtn}>🎵 Spotify</button>
            <button onClick={() => fetchFiles('')} style={styles.rootBtn}>🏠 Home</button>
          </div>
        </div>

        {isDownloading && (
          <div style={styles.progressWrapper}>
            <div style={styles.progressText}>Downloading asset... {downloadProgress}%</div>
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

      {/* Spotify Modal Popup */}
      {showSpotifyModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>Link Spotify</h3>
            <p style={styles.modalText}>Would you like to open your local Spotify app to listen while you browse?</p>
            <div style={styles.modalButtons}>
              <button onClick={() => setShowSpotifyModal(false)} style={styles.modalCancel}>Cancel</button>
              <button onClick={openSpotify} style={styles.modalConfirm}>Open App</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

const styles = {
  main: { padding: '3rem 1rem', fontFamily: '"Inter", system-ui, sans-serif', backgroundColor: '#0a0a0a', minHeight: '100vh', color: '#eee' },
  container: { maxWidth: '1100px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '3rem', borderBottom: '1px solid #222', paddingBottom: '1.5rem' },
  titleGroup: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  title: { fontSize: '2.2rem', fontWeight: '700', margin: 0, letterSpacing: '-1px' },
  breadcrumb: { fontSize: '0.85rem', color: '#888', fontFamily: 'monospace' },
  actions: { display: 'flex', gap: '1rem' },
  rootBtn: { padding: '0.6rem 1rem', borderRadius: '6px', border: '1px solid #333', background: 'transparent', color: '#ccc', cursor: 'pointer', fontSize: '0.9rem' },
  spotifyBtn: { padding: '0.6rem 1rem', borderRadius: '6px', border: '1px solid #1db954', background: 'transparent', color: '#1db954', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 'bold' },
  authContainer: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#000', fontFamily: 'sans-serif' },
  authCard: { textAlign: 'center', background: '#0a0a0a', padding: '3rem', borderRadius: '16px', border: '1px solid #222', boxShadow: '0 20px 40px rgba(0,0,0,0.8)' },
  authTitle: { color: 'white', marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: '400' },
  input: { padding: '0.8rem', borderRadius: '8px', border: '1px solid #222', background: '#111', color: 'white', marginBottom: '1.5rem', display: 'block', width: '100%', outline: 'none', textAlign: 'center' },
  button: { width: '100%', padding: '0.8rem', borderRadius: '8px', border: 'none', background: '#fff', color: '#000', fontWeight: '600', cursor: 'pointer' },
  progressWrapper: { marginBottom: '2rem', padding: '1rem', background: '#111', borderRadius: '8px', border: '1px solid #222' },
  progressText: { color: '#666', fontSize: '0.8rem', marginBottom: '0.5rem', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '1px' },
  progressBarBg: { height: '4px', background: '#000', borderRadius: '2px', overflow: 'hidden' },
  progressBarFill: { height: '100%', background: '#fff', transition: 'width 0.3s ease' },
  fileGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' },
  fileCard: { background: '#111', padding: '1.5rem', borderRadius: '12px', border: '1px solid #222', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', transition: 'border 0.2s' },
  cardMain: { display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' },
  fileIcon: { fontSize: '1.5rem', opacity: 0.7 },
  fileInfo: { flex: 1, overflow: 'hidden' },
  fileName: { fontWeight: '600', color: '#fff', fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  fileDesc: { fontSize: '0.8rem', color: '#666', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' },
  cardFooter: { borderTop: '1px solid #222', paddingTop: '1rem', textAlign: 'right' },
  actionBtn: { background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '500', transition: 'color 0.2s' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modal: { background: '#111', padding: '2rem', borderRadius: '16px', border: '1px solid #333', maxWidth: '400px', width: '90%', textAlign: 'center' },
  modalTitle: { color: '#fff', fontSize: '1.3rem', marginBottom: '1rem' },
  modalText: { color: '#888', fontSize: '0.9rem', marginBottom: '2rem', lineHeight: '1.5' },
  modalButtons: { display: 'flex', gap: '1rem', justifyContent: 'center' },
  modalCancel: { padding: '0.6rem 1.2rem', borderRadius: '6px', border: 'none', background: 'transparent', color: '#666', cursor: 'pointer' },
  modalConfirm: { padding: '0.6rem 1.2rem', borderRadius: '6px', border: 'none', background: '#1db954', color: 'white', cursor: 'pointer', fontWeight: 'bold' },
  loading: { textAlign: 'center', color: '#444', fontSize: '0.9rem', marginTop: '4rem' }
};
