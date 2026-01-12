
import { useState, useEffect } from 'react';
import axios from 'axios';

function Sidebar({ onSelectUpload, selectedUploadId, isOpen, toggleSidebar, uploads }) {
  // Internal state removed, using props 'uploads'


  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <h3>📂 Riwayat Upload</h3>
        <button className="close-sidebar-btn" onClick={toggleSidebar}>×</button>
      </div>

      <div className="upload-list">
        {/* 'Semua Data' item removed as per request */}

        {uploads.length === 0 && (
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
