// app/page.tsx
'use client';
import { useState } from 'react';

export default function Home() {
  const [path, setPath] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    if (!path) return alert('Please enter a file path');
    setLoading(true);

    try {
      // Call our internal API route
      const response = await fetch(`/api/download?path=${encodeURIComponent(path)}`);
      
      if (!response.ok) throw new Error('File not found');

      // Convert response to a blob and trigger browser download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = path.split('/').pop() || 'file'; 
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-4 font-sans">
      <div className="p-8 bg-white shadow-xl rounded-lg border border-gray-200 max-w-md w-full">
        <h1 className="text-2xl font-bold mb-4 text-gray-800">GitHub File Downloader</h1>
        <p className="text-sm text-gray-500 mb-6">Enter the path to the file in the repo (e.g., <code>docs/readme.md</code>)</p>
        
        <input 
          type="text" 
          placeholder="folder/file.txt" 
          className="w-full p-2 border rounded mb-4 text-black"
          value={path}
          onChange={(e) => setPath(e.target.value)}
        />
        
        <button 
          onClick={handleDownload}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 transition"
        >
          {loading ? 'Downloading...' : 'Download File'}
        </button>
      </div>
    </main>
  );
}
