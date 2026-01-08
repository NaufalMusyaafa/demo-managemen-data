
import { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

function UploadProduct() {
  const [uploadFile, setUploadFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleUpload = async () => {
    if (!uploadFile) {
      alert('Pilih file dulu!');
      return;
    }

    const formData = new FormData();
    formData.append('file', uploadFile);

    setLoading(true);
    try {
      const res = await axios.post('http://localhost:3000/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      navigate('/', { 
        state: { 
          successMessage: res.data.message,
          stats: res.data.data 
        } 
      });
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || err.message;
      const errorDetail = err.response?.data?.error || '';
      alert(`Upload Gagal: ${msg} ${errorDetail}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container upload-container">
      <div className="card" style={{ width: '100%', padding: '2rem' }}>
        <h2>Upload Data Produk</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          Pilih file Excel (.xlsx) untuk menambahkan data produk secara massal.
        </p>
        
        <div className="upload-area">
          <input 
            type="file" 
            id="file-upload"
            accept=".xlsx"
            onChange={(e) => setUploadFile(e.target.files[0])}
          />
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <Link to="/" className="btn-secondary">
              Batal
            </Link>
            <button 
              onClick={handleUpload} 
              disabled={loading}
              className="btn-primary"
            >
              {loading ? 'Uploading...' : 'Upload File'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UploadProduct;
