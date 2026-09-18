'use client';
import { useState } from 'react';

export default function Home() {
  const [path, setPath] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    if (!path) return alert('Please enter a file path');
    setLoading(true);
    try {
      const response = await fetch(`/api/download?path=${encodeURIComponent(path)}`);
      if (!response.ok) throw new Error('File not found');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = path.split('/').pop() || 'file'; 
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'sans-serif', backgroundColor: '#f4f4f9' }}>
      <div style={{ padding: '2rem', background: 'white', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', borderRadius: '12px', maxWidth: '400px', width: '90%', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#333' }}>GitHub Downloader</h1>
        <input 
          type="text" 
          placeholder="folder/file.txt" 
          style={{ width: '100%', padding: '0.7rem', marginBottom: '1rem', border: '1px solid #ccc', borderRadius: '6px', boxSizing: 'border-box' }}
          value={path}
          onChange={(e) => setPath(e.target.value)}
        />
        <button 
          onClick={handleDownload}
          disabled={loading}
          style={{ width: '100%', background: '#0070f3', color: 'white', padding: '0.7rem', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
        >
          {loading ? 'Downloading...' : 'Download File'}
        </button>
      </div>
    </main>
  );
}
