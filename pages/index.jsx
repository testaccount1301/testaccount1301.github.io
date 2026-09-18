import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

export default function Home() {
  const [password, setPassword] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [activeTab, setActiveTab] = useState('files'); 
  const [currentPath, setCurrentPath] = useState('');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [spotifyToken, setSpotifyToken] = useState(null);
  const [track, setTrack] = useState(null);
  const [roomCode, setRoomCode] = useState(''); 
  const [inputCode, setInputCode] = useState(''); 
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  
  const myVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const socketRef = useRef(null);
  const peerConnection = useRef(null);

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
              name: data.item.name, 
              artist: data.item.artists[0].name,
              image: data.item.album.images[0].url, 
              progress: data.progress_ms,
              duration: data.item.duration_ms, 
              is_playing: data.is_playing,
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
        if (contentLength) {
          setDownloadProgress(Math.round((receivedLength / contentLength) * 100));
        }
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

  const setupPeer = async (isStreamer) => {
    const serverUrl = process.env.NEXT_PUBLIC_STREAM_SERVER_URL;
    if(!serverUrl) return alert("Server URL not set in Vercel!");

    socketRef.current = io(serverUrl);

    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
    if (myVideoRef.current) myVideoRef.current.srcObject = stream;

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    peerConnection.current = pc;

    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.emit('signal', { room: roomCode, signal: { candidate: event.candidate } });
      }
    };

    if (isStreamer) {
      const code = Math.floor(10000 + Math.random() * 90000).toString();
      setRoomCode(code);
      socketRef.current.emit('join-room', code);
    }

    socketRef.current.on('signal', async (data) => {
      if (data.signal.sdp) {
        await pc.setRemoteDescription(new RTCSessionDescription(data.signal));
        if (data.signal.type === 'offer') {
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socketRef.current.emit('signal', { room: roomCode, signal: pc.localDescription });
        }
      } else if (data.signal.candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(data.signal.candidate));
      }
    });

    pc.ontrack = (event) => {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
      setConnectionStatus('Connected');
    };
  };

  const startStreaming = async () => {
    setConnectionStatus('Initializing...');
    await setupPeer(true);
  };

  const joinStream = async () => {
    if (inputCode.length !== 5) return alert("Enter 5-digit code");
    setRoomCode(inputCode);
    setConnectionStatus('Connecting...');
    await setupPeer(false);
    const pc = peerConnection.current;
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socketRef.current.emit('signal', { room: inputCode, signal: pc.localDescription });
    socketRef.current.emit('join-room', inputCode);
  };

  if (!isAuthorized) {
    return (
      <div style={styles.authContainer}>
        <form onSubmit={(e) => { e.preventDefault(); setIsAuthorized(true); fetchFiles(''); }} style={styles.authCard}>
          <h2 style={styles.authTitle}>Vault Access</h2>
          <input type="password" placeholder="Enter Access Key" style={styles.input} value={password} onChange={(e) => setPassword(e.target.value)} />
          <button type="submit" style={styles.button}>Unlock</button>
        </form>
      </div>
    );
  }

  return (
    <main style={styles.main}>
      <nav style={styles.nav}>
        <div style={styles.navLinks}>
          <button onClick={() => setActiveTab('files')} style={{...styles.tabBtn, color: activeTab === 'files' ? '#fff' : '#666', borderBottom: activeTab === 'files' ? '2px solid #fff' : 'none'}}>📁 Vault</button>
          <button onClick={() => setActiveTab('stream')} style={{...styles.tabBtn, color: activeTab === 'stream' ? '#fff' : '#666', borderBottom: activeTab === 'stream' ? '2px solid #fff' : 'none'}}>📡 Stream</button>
          <button onClick={() => setActiveTab('watch')} style={{...styles.tabBtn, color: activeTab === 'watch' ? '#fff' : '#666', borderBottom: activeTab === 'watch' ? '2px solid #fff' : 'none'}}>📺 Watch</button>
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
        ) : activeTab === 'stream' ? (
          <div style={styles.shareContainer}>
            <div style={styles.settingsCard}>
              <h2 style={styles.sectionTitle}>Broadcaster</h2>
              <p style={styles.streamSubtitle}>Start a secure P2P broadcast from your PC.</p>
              <button onClick={startStreaming} style={styles.startBtn}>🚀 Go Live Now</button>
              {roomCode && <div style={styles.peerInfo}>Your Code: <code style={styles.peerCode}>{roomCode}</code></div>}
            </div>
            <div style={styles.previewBox}>
              <span style={styles.previewLabel}>Local Preview</span>
              <video ref={myVideoRef} autoPlay muted style={styles.videoElement} />
            </div>
          </div>
        ) : (
          <div style={styles.watchContainer}>
            <div style={styles.watchCard}>
              <h2 style={styles.sectionTitle}>Viewer Portal</h2>
              <div style={styles.inputGroup}>
                <input type="text" placeholder="Enter 5-digit code" style={styles.input} value={inputCode} onChange={(e) => setInputCode(e.target.value)} />
                <button onClick={joinStream} style={styles.joinBtn}>Connect</button>
              </div>
              <div style={styles.statusText}>Status: <span style={{color: connectionStatus === 'Connected' ? '#22c55e' : '#888'}}>{connectionStatus}</span></div>
            </div>
            <div style={styles.videoBox}>
              <span style={styles.videoLabel}>Live Broadcast</span>
              <video ref={remoteVideoRef} autoPlay style={styles.videoElement} />
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
  navLinks: { display: 'flex', gap: '1rem', background: '#111', padding: '0.4rem', borderRadius: '12px', border: '1px solid #222' },
  tabBtn: { background: 'transparent', border: 'none', padding: '0.6rem 1.2rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '500', transition: '0.2s' },
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
  shareContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem' },
  settingsCard: { background: '#0a0a0a', padding: '2rem', borderRadius: '16px', border: '1px solid #222', width: '100%', maxWidth: '400px', textAlign: 'center' },
  sectionTitle: { color: '#fff', fontSize: '1.2rem', marginBottom: '1.5rem', fontWeight: '600' },
  streamSubtitle: { color: '#666', fontSize: '0.8rem', marginBottom: '1.5rem' },
  startBtn: { width: '100%', padding: '0.8rem', borderRadius: '8px', border: 'none', background: '#fff', color: '#000', fontWeight: 'bold', cursor: 'pointer' },
  peerInfo: { marginTop: '1rem', fontSize: '0.8rem', color: '#666' },
  peerCode: { color: '#3b82f6', fontWeight: 'bold' },
  previewBox: { width: '100%', maxWidth: '800px', marginTop: '2rem', background: '#000', borderRadius: '12px', border: '1px solid #222', overflow: 'hidden' },
  previewLabel: { display: 'block', padding: '0.5rem', fontSize: '0.7rem', color: '#444', textAlign: 'center' },
  videoElement: { width: '100%', height: 'auto', display: 'block' },
  watchContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem' },
  watchCard: { background: '#0a0a0a', padding: '2rem', borderRadius: '16px', border: '1px solid #222', width: '100%', maxWidth: '500px', textAlign: 'center' },
  inputGroup: { display: 'flex', gap: '10px', marginTop: '1rem' },
  joinBtn: { padding: '0.8rem 1.5rem', borderRadius: '8px', border: 'none', background: '#fff', color: '#000', fontWeight: 'bold', cursor: 'pointer' },
  videoBox: { width: '100%', maxWidth: '1000px', background: '#000', borderRadius: '16px', border: '1px solid #222', overflow: 'hidden' },
  videoLabel: { display: 'block', padding: '0.5rem', fontSize: '0.7rem', color: '#444', textAlign: 'center', borderBottom: '1px solid #222' },
  statusText: { marginTop: '1rem', fontSize: '0.8rem', color: '#666' },
};
