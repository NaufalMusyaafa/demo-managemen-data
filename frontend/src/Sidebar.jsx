
import { useState, useEffect } from 'react';
import axios from 'axios';

function Sidebar({ onSelectUpload, selectedUploadId, isOpen, toggleSidebar }) {
  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchUploads = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:3000/api/uploads');
      if (res.data.success) {
        setUploads(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch uploads:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUploads();
    
    // Auto refresh every 30 seconds or listen to event? 
    // For now simple fetch on mount.
    const interval = setInterval(fetchUploads, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <h3>📂 Riwayat Upload</h3>
        <button className="close-sidebar-btn" onClick={toggleSidebar}>×</button>
      </div>

      <div className="upload-list">
        <div 
          className={`upload-item ${selectedUploadId === null ? 'active' : ''}`}
          onClick={() => onSelectUpload(null)}
        >
          <span className="icon">📊</span>
          <div className="info">
            <span className="filename">Semua Data</span>
            <span className="meta">Tampilkan semua</span>
          </div>
        </div>

        {uploads.length === 0 && !loading && (
          <div className="empty-state">Belum ada history upload</div>
        )}

        {uploads.map((upload) => (
          <div 
            key={upload.id} 
            className={`upload-item ${selectedUploadId === upload.id ? 'active' : ''}`}
            onClick={() => onSelectUpload(upload.id)}
          >
            <span className="icon">📄</span>
            <div className="info">
              <span className="filename" title={upload.filename}>{upload.filename}</span>
              <span className="meta">
                {new Date(upload.created_at).toLocaleDateString()} • {upload.total_rows} baris
              </span>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

export default Sidebar;
