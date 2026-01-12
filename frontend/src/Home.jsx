import { useState, useEffect } from 'react';
import axios from 'axios';
import { AgGridReact } from 'ag-grid-react';
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ModuleRegistry } from 'ag-grid-community'; 
import { AllCommunityModule } from 'ag-grid-community'; 

// Register all Community features
ModuleRegistry.registerModules([AllCommunityModule]);

function Home({ theme, selectedUploadId, selectedUpload, refreshUploads, onSelectUpload }) {
  const [products, setProducts] = useState([]);
  const location = useLocation();
  const navigate = useNavigate();
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // Rename state
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    if (selectedUpload) {
      setEditName(selectedUpload.filename);
    }
  }, [selectedUpload]);

  const handleUpdateName = async () => {
    if (!editName.trim()) return;
    try {
      await axios.put(`http://localhost:3000/api/uploads/${selectedUploadId}`, {
        filename: editName
      });
      setIsEditingName(false);
      refreshUploads(); // Refresh app state
      setSuccessMsg('Nama database berhasil diupdate');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      console.error(err);
      alert('Gagal mengupdate nama: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleDeleteTable = async () => {
    if (!window.confirm(`Yakin ingin menghapus tabel "${selectedUpload?.filename}" beserta semua isinya? Tindakan ini tidak dapat dibatalkan.`)) {
        return;
    }

    try {
        await axios.delete(`http://localhost:3000/api/uploads/${selectedUploadId}`);
        refreshUploads(); // Refresh sidebar list
        onSelectUpload(null); // Reset selection to All Data
        setSuccessMsg('Tabel berhasil dihapus');
        setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
        console.error(err);
        alert('Gagal menghapus tabel: ' + (err.response?.data?.message || err.message));
    }
  };

  useEffect(() => {
    // Check for message from Upload page
    if (location.state?.successMessage) {
      setSuccessMsg(location.state.successMessage);
      window.history.replaceState({}, document.title);
      setTimeout(() => setSuccessMsg(null), 5000);
    }
  }, [location]);

  const [colDefs] = useState([
    { field: 'product_code', headerName: 'Product Code', sortable: true, filter: true },
    { field: 'product_name', headerName: 'Name', editable: true, flex: 1, sortable: true, filter: true },
    { field: 'category', headerName: 'Category', sortable: true, filter: true },
    { 
      field: 'price', 
      headerName: 'Price', 
      editable: true, 
      sortable: true, 
      filter: true,
      valueFormatter: (params) => {
        return params.value ? 'Rp ' + Number(params.value).toLocaleString('id-ID') : '';
      },
      comparator: (valueA, valueB) => {
        return Number(valueA) - Number(valueB);
      }
    },
    { 
      field: 'stock', 
      headerName: 'Stock', 
      editable: true, 
      sortable: true, 
      filter: true,
      comparator: (valueA, valueB) => {
        return Number(valueA) - Number(valueB);
      }
    },
    {
      headerName: 'Actions',
      width: 120,
      cellRenderer: (params) => (
        <button 
          onClick={() => handleDelete(params.data.id)} 
          className="delete-btn"
        >
          Delete
        </button>
      )
    }
  ]);

  const fetchProducts = async () => {
    try {
      let url = 'http://localhost:3000/api/products';
      if (selectedUploadId) {
        url += `?upload_id=${selectedUploadId}`;
      }

      const res = await axios.get(url);
      if (res.data.success) {
        setProducts(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching products:', err);
      setErrorMsg('Gagal mengambil data produk: ' + err.message);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [selectedUploadId]); // Refetch when filter changes

  const onCellValueChanged = async (event) => {
    const { data } = event;
    try {
      await axios.put(`http://localhost:3000/api/products/${data.id}`, {
        product_code: data.product_code,
        product_name: data.product_name,
        category: data.category,
        price: data.price,
        stock: data.stock,
        upload_id: selectedUploadId // Pass context for dynamic table
      });
      console.log('Update success for ID:', data.id);
    } catch (err) {
      console.error(err);
      alert('Gagal mengupdate produk: ' + (err.response?.data?.message || err.message));
      // Revert change locally if needed, or just refetch
      fetchProducts();
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Yakin ingin menghapus produk ini?')) return;
    try {
      let url = `http://localhost:3000/api/products/${id}`;
      if (selectedUploadId) {
        url += `?upload_id=${selectedUploadId}`;
      }
      
      await axios.delete(url);
      fetchProducts();
    } catch (err) {
      console.error(err);
      alert('Gagal menghapus produk: ' + (err.response?.data?.message || err.message));
    }
  };

  // Determine Grid Theme class based on current App Theme
  const gridThemeClass = theme === 'dark' ? 'ag-theme-quartz-dark' : 'ag-theme-quartz';

  return (
    <div className="page-container">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
             {/* Header Logic: Show filename or 'Semua Data Produk' */}
             {!selectedUploadId ? (
                <h2>Semua Data Produk</h2>
             ) : (
                <div className="editable-header" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {isEditingName ? (
                    <>
                      <input 
                        type="text" 
                        value={editName} 
                        onChange={(e) => setEditName(e.target.value)}
                        className="header-input"
                        style={{ fontSize: '1.5rem', padding: '5px' }}
                      />
                      <button onClick={handleUpdateName} className="btn-small">💾</button>
                      <button onClick={() => setIsEditingName(false)} className="btn-small cancel">❌</button>
                    </>
                  ) : (
                    <>
                      <h2>{selectedUpload ? selectedUpload.filename : 'Data Upload'}</h2>
                      <button 
                        onClick={() => setIsEditingName(true)} 
                        className="btn-icon"
                        title="Ubah nama"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
                      >
                        ✏️
                      </button>
                    </>
                  )}
                </div>
             )}
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
            {selectedUploadId && (
                <button 
                    onClick={handleDeleteTable} 
                    className="btn-danger"
                    style={{ backgroundColor: '#ff4d4f', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                    🗑️ Hapus Tabel
                </button>
            )}
            <Link to="/upload" className="btn-primary">
              + Upload Excel
            </Link>
        </div>
      </div>

      {successMsg && (
        <div className="success-banner">
          <span>✅</span> {successMsg}
        </div>
      )}

      {errorMsg && (
        <div style={{ padding: '15px', color: '#ff4d4f', backgroundColor: '#fff2f0', border: '1px solid #ffccc7', borderRadius: '8px', marginBottom: '20px' }}>
          {errorMsg}
        </div>
      )}

      <div className={`grid-wrapper ${gridThemeClass}`} style={{ height: 600, width: '100%' }}>
        <AgGridReact
          rowData={products}
          columnDefs={colDefs}
          onCellValueChanged={onCellValueChanged}
          pagination={true}
          paginationPageSize={10}
          paginationPageSizeSelector={[10, 20, 50, 100, 1000]}
        />
      </div>
    </div>
  );
}

export default Home;
