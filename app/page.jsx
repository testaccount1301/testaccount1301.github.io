'use client';
import { useState, useEffect } from 'react';

export default function Home() {
  const [password, setPassword] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [currentPath, setCurrentPath] = useState('');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchFiles = async (path = '') => {
    setLoading(true);
    try {
      const res = await fetch(`/api/files?path=${encodeURIComponent(path)}&password=${password}`);
      const data = await res.json();
      
      if (!res.ok) {
        // This will now show the EXACT error from GitHub (e.g. "Not Found" or "Bad Credentials")
        throw new Error(data.error || 'Unknown error occurred');
      }
      
      setFiles(data);
      setCurrentPath(path);
    } catch (e) {
      alert("❌ Error: " + e.message);
      // If the error is "Wrong Password", kick them back to login
      if (e.message.includes('Wrong Password')) setIsAuthorized(false);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    setIsAuthorized(true);
    fetchFiles('');
  };

  const handleDownload = async (filePath) => {
    const response = await fetch(`/api/download?path=${encodeURIComponent(filePath)}`);
    if (!response.ok) return alert('Download failed');
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filePath.split('/').pop();
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  if (!isAuthorized) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'sans-serif', backgroundColor: '#121212', color: 'white' }}>
        <form onSubmit={handleLogin} style={{ textAlign: 'center', background: '#1e1e1e', padding: '2rem', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', border: '1px solid #333' }}>
          <h2 style={{ marginBottom: '1rem' }}>🔒 Private Access</h2>
          <input 
            type="password" 
            placeholder="Enter Password" 
            style={{ padding: '0.7rem', borderRadius: '6px', border: '1px solid #444', background: '#2a2a2a', color: 'white', marginBottom: '1rem', display: 'block', width: '100%' }}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button style={{ width: '100%', padding: '0.7rem', borderRadius: '6px', border: 'none', background: '#0070f3', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>Enter</button>
        </form>
      </div>
    );
  }

  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif', backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '1.8rem', margin: 0 }}>📁 Repo Explorer</h1>
            <p style={{ color: '#666' }}>Path: <code style={{background: '#eee', padding: '2px 4px'}}>{currentPath || '/ (Root)'}</code></p>
          </div>
          <button onClick={() => fetchFiles('')} style={{ padding: '0.5rem 1rem', cursor: 'pointer', borderRadius: '6px', border: '1px solid #ccc', background: 'white' }}>🏠 Root</button>
        </div>

        {loading ? <p>Loading files...</p> : (
          <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid #ddd', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ background: '#f1f1f1', borderBottom: '1px solid #ddd' }}>
                <tr>
                  <th style={{ padding: '1rem' }}>Name</th>
                  <th style={{ padding: '1rem' }}>Type</th>
                  <th style={{ padding: '1rem', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {files.map((file, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '1rem', color: '#333', fontWeight: file.type === 'dir' ? 'bold' : 'normal' }}>{file.name}</td>
                    <td style={{ padding: '1rem', color: '#888', fontSize: '0.9rem' }}>{file.type}</td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      {file.type === 'dir' ? (
                        <button onClick={() => fetchFiles(`${currentPath}/${file.path}`)} style={{ color: '#0070f3', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>Open ➔</button>
                      ) : (
                        <button onClick={() => handleDownload(file.path)} style={{ color: '#28a745', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>Download ⬇</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
