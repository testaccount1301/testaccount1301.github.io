import React, { useState, useEffect, useRef } from 'react';

export default function Home() {
  // AUTH & UI STATE
  const [password, setPassword] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [activeTab, setActiveTab] = useState('files'); // 'files' or 'screen'
  
  // FILE EXPLORER STATE
  const [currentPath, setCurrentPath] = useState('');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);

  // SPOTIFY STATE
  const [spotifyToken, setSpotifyToken] = useState(null);
  const [track, setTrack] = useState(null);

  // SCREEN SHARE STATE
  const [peerId, setPeerId] = useState('');
  const [remoteStream, setRemoteStream] = useState(null);
  const [isSharing, setIsSharing] = useState(false);
  const myVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('spotify_token');
    if (token) {
      setSpotifyToken(token);
      window.history.replaceState({}, document.title, "/");
    }
  }, []);

  useEffect(() => {
    if (!spotifyToken) return;
    const updatePlayer = async () => {
      try {
        const res = await fetch(`/api/spotify/callback?token=${spotifyToken}`);
        if (res.ok) {
          const data = await res.json();
          if (data.item) {
            setTrack({
              name: data.item.name, artist: data.item.artists[0].name,
              image: data.item.album.images[0].url, progress: data.progress_ms,
              duration: data.item.duration_ms, is_playing: data.is_playing,
              volume: data.device?.volume_percent || 50
            });
          }
        }
      } catch (e) {}
    };
    const interval = setInterval(updatePlayer, 3000);
    return () => clearInterval(interval);
  }, [spotifyToken]);

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
    } catch (err) { alert(err.message); } finally {
      setIsDownloading(false);
      setTimeout(() => setDownloadProgress(0), 2000);
    }
  };

  const controlSpotify = async (action, value = '') => {
    const query = value ? `action=${action}&volume=${value}` : `action=${action}`;
    await fetch(`/api/spotify/callback?${query}&token=${spotifyToken}`);
  };

  const connectSpotify = () => {
    const clientID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
    const scope = 'user-modify-playback-state user-read-playback-state';
    const url = `https://accounts.spotify.com/authorize?client_id=${clientID}&response_type=code&redirect_uri=https://testaccount1301githubio.vercel.app/api/spotify/callback&scope=${scope}`;
    window.location.href = url;
  };

  useEffect(() => {
    if (activeTab !== 'screen') return;
    const script = document.createElement('script');
    script.src = "https://unpkg.com/peerjs@1.5.2/dist/peerjs.min.js";
    script.async = true;
    script.onload = () => {
      const peer = new window.Peer();
      peer.on('open', (id) => setPeerId(id));
      peer.on('call', (call) => {
        call.answer();
        call.on('stream', (remoteStream) => {
          setRemoteStream(remoteStream);
        });
      });
    };
    document.body.appendChild(script);
  }, [activeTab]);

  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      if (myVideoRef.current) myVideoRef.current.srcObject = stream;
      setIsSharing(true);
      const peer = new window.Peer();
      peer.on('open', (id) => {
        alert("Your Peer ID: " + id + "\nShare this ID with the viewer!");
      });
      const urlParams = new URLSearchParams(window.location.search);
      const remoteId = urlParams.get('peer');
      if (remoteId) {
        const call = peer.call(remoteId, stream);
      }
    } catch (e) { alert("Screen share denied"); }
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
      <nav style={styles.nav}>
        <div style={styles.navLinks}>
          <button onClick={() => setActiveTab('files')} style={{...styles.tabBtn, color: activeTab === 'files' ? '#fff' : '#666', borderBottom: activeTab === 'files' ? '2px solid #fff' : 'none'}}>📁 Vault</button>
          <button onClick={() => setActiveTab('screen')} style={{...styles.tabBtn, color: activeTab === 'screen' ? '#fff' : '#666', borderBottom: activeTab === 'screen' ? '2px solid #fff' : 'none'}}>📺 Live Share</button>
        </div>
      </nav>

      <div style={styles.container}>
        {activeTab === 'files' ? (
          <>
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
                      {file.type === 'dir' ? <button onClick={() => fetchFiles(`${currentPath}/${file.path}`)} style={styles.actionBtn}>Open</button> : <button onClick={() => handleDownload(file.path)} style={styles.actionBtn}>Download</button>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div style={styles.screenShareContainer}>
            <div style={styles.screenHeader}>
              <h2 style={styles.screenTitle}>Live Screen Sharing</h2>
              <p style={styles.screenSubtitle}>Share your screen in real-time via a secure P2P link.</p>
            </div>
            <div style={styles.screenControls}>
              <button onClick={startScreenShare} style={styles.shareBtn}>Start Sharing Screen</button>
              {peerId && <div style={styles.peerInfo}>Your ID: <code style={styles.peerCode}>{peerId}</code></div>}
            </div>
            <div style={styles.videoGrid}>
              <div style={styles.videoBox}>
                <span style={styles.videoLabel}>Your Stream</span>
                <video ref={myVideoRef} autoPlay muted style={styles.videoElement} />
              </div>
              <div style={styles.videoBox}>
                <span style={styles.videoLabel}>Remote Stream</span>
                <video ref={remoteVideoRef} autoPlay style={styles.videoElement} />
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={styles.musicBar}>
        {!spotifyToken ? (
          <button onClick={connectSpotify} style={styles.connectBtn}>Connect Spotify</button>
        ) : !track ? (
          <div style={styles.musicLabel}>No Active Device</div>
        ) : (
          <>
            <div style={styles.trackInfo}>
              <img src={track.image} style={styles.albumArt} alt="Art" />
              <div style={styles.trackText}>
                <div style={styles.songName}>{track.name}</div>
                <div style={styles.artistName}>{track.artist}</div>
              </div>
            </div>
            <div style={styles.playerControls}>
              <div style={styles.btnGroup}>
                <button onClick={() => controlSpotify('prev')} style={styles.musicBtn}>⏮</button>
                <button onClick={() => controlSpotify(track.is_playing ? 'pause' : 'play')} style={styles.playBtn}>{track.is_playing ? '⏸' : '▶'}</button>
                <button onClick={() => controlSpotify('next')} style={styles.musicBtn}>⏭</button>
              </div>
              <div style={styles.volumeGroup}>
                <span style={styles.volIcon}>🔊</span>
                <input type="range" min="0" max="100" value={track.volume || 0} onChange={(e) => controlSpotify('volume', e.target.value)} style={styles.volSlider} />
              </div>
            </div>
            <div style={styles.timerGroup}>
               <div style={styles.timerText}>{Math.floor(track.progress / 60000)}:{(Math.floor((track.progress % 60000) / 1000)).toString().padStart(2, '0')}</div>
               <div style={styles.progressMiniBg}><div style={{...styles.progressMiniFill, width: `${(track.progress / track.duration) * 100}%`}}></div></div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

const styles = {
  main: { padding: '3rem 1rem', fontFamily: '"Inter", sans-serif', backgroundColor: '#050505', minHeight: '100vh', color: '#eee', paddingBottom: '120px' },
  nav: { display: 'flex', justifyContent: 'center', marginBottom: '3rem' },
  navLinks: { display: 'flex', gap: '2rem', background: '#111', padding: '0.5rem', borderRadius: '12px', border: '1px solid #222' },
  tabBtn: { background: 'transparent', border: 'none', padding: '0.6rem 1.5rem', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '500', transition: '0.2s' },
  container: { maxWidth: '1100px', margin: '0 auto' },
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
  musicBar: { position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', padding: '12px 24px', background: 'rgba(10, 10, 10, 0.9)', backdropFilter: 'blur(20px)', borderRadius: '100px', border: '1px solid #222', display: 'flex', alignItems: 'center', gap: '25px', boxShadow: '0 15px 40px rgba(0,0,0,0.6)', zIndex: 1000 },
  connectBtn: { background: '#1db954', color: 'white', border: 'none', padding: '8px 20px', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' },
  trackInfo: { display: 'flex', alignItems: 'center', gap: '12px', width: '180px' },
  albumArt: { width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover' },
  trackText: { overflow: 'hidden', whiteSpace: 'nowrap' },
  songName: { fontSize: '0.8rem', fontWeight: 'bold', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis' },
  artistName: { fontSize: '0.7rem', color: '#666', overflow: 'hidden', textOverflow: 'ellipsis' },
  playerControls: { display: 'flex', alignItems: 'center', gap: '20px' },
  btnGroup: { display: 'flex', alignItems: 'center', gap: '12px' },
  musicBtn: { background: 'transparent', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: '1rem', padding: '5px' },
  playBtn: { background: '#fff', color: '#000', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  volumeGroup: { display: 'flex', alignItems: 'center', gap: '8px' },
  volIcon: { color: '#555', fontSize: '0.8rem' },
  volSlider: { width: '70px', accentColor: '#fff', cursor: 'pointer' },
  timerGroup: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', width: '60px' },
  timerText: { fontSize: '0.65rem', color: '#555', marginBottom: '4px', fontFamily: 'monospace' },
  progressMiniBg: { height: '3px', width: '100%', background: '#222', borderRadius: '2px', overflow: 'hidden' },
  progressMiniFill: { height: '100%', background: '#1db954' },
  screenShareContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem' },
  screenHeader: { textAlign: 'center' },
  screenTitle: { fontSize: '2rem', fontWeight: '700', color: '#fff', margin: 0 },
  screenSubtitle: { color: '#666', fontSize: '0.9rem' },
  screenControls: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' },
  shareBtn: { padding: '1rem 2rem', borderRadius: '12px', border: 'none', background: '#fff', color: '#000', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem' },
  peerInfo: { fontSize: '0.85rem', color: '#888' },
  peerCode: { color: '#3b82f6', fontWeight: 'bold' },
  videoGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem', width: '100%', marginTop: '2rem' },
  videoBox: { background: '#111', borderRadius: '16px', border: '1px solid #222', overflow: 'hidden', display: 'flex', flexDirection: 'column' },
  videoLabel: { padding: '0.5rem', fontSize: '0.7rem', color: '#555', textAlign: 'center', borderBottom: '1px solid #222' },
  videoElement: { width: '100%', height: 'auto', backgroundColor: '#000' },
};
