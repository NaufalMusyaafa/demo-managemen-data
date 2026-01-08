
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

function Home({ theme, selectedUploadId }) {
  const [products, setProducts] = useState([]);
  const location = useLocation();
  const navigate = useNavigate();
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

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
        product_name: data.product_name,
        category: data.category,
        price: data.price,
        stock: data.stock
      });
      console.log('Update success for ID:', data.id);
    } catch (err) {
      console.error(err);
      alert('Gagal mengupdate produk: ' + (err.response?.data?.message || err.message));
      fetchProducts();
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Yakin ingin menghapus produk ini?')) return;
    try {
      await axios.delete(`http://localhost:3000/api/products/${id}`);
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
             <h2>{selectedUploadId ? 'Data Filtered' : 'Semua Data Produk'}</h2>
             {selectedUploadId && <span className="badge">Filtered</span>}
        </div>
        <Link to="/upload" className="btn-primary">
          + Upload Excel
        </Link>
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
        />
      </div>
    </div>
  );
}

export default Home;
