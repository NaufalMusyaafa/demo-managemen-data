import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import axios from 'axios';
import Home from './Home';
import UploadProduct from './UploadProduct';
import Sidebar from './Sidebar';
import './App.css';

function App() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('app-theme') || 'light';
  });

  const [uploads, setUploads] = useState([]);
  const [selectedUploadId, setSelectedUploadId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Derived state for selected upload object
  const selectedUpload = uploads.find(u => u.id === selectedUploadId) || null;

  const fetchUploads = async () => {
    try {
      const res = await axios.get('http://localhost:3000/api/uploads');
      if (res.data.success) {
        setUploads(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch uploads:', err);
    }
  };

  useEffect(() => {
    fetchUploads();
    const interval = setInterval(fetchUploads, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('app-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <Router>
      <div className="app-layout">
        <Sidebar 
          isOpen={isSidebarOpen} 
          toggleSidebar={toggleSidebar}
          selectedUploadId={selectedUploadId} 
          onSelectUpload={setSelectedUploadId}
          uploads={uploads} // Pass data
        />
        
        <div className="main-content">
           <header className="top-header">
              <div className="header-left">
                  <button className="menu-btn" onClick={toggleSidebar}>☰</button>
                  <h1>Management Data</h1>
              </div>
              
              <nav>
                <Link to="/">Dashboard</Link>
                <Link to="/upload">Upload</Link>
                <button onClick={toggleTheme} className="theme-toggle" title="Toggle Dark/Light Mode">
                  {theme === 'light' ? '🌙' : '☀️'}
                </button>
              </nav>
           </header>
        
          <main className="content-area">
            <Routes>
              <Route path="/" element={
                 <Home 
                   theme={theme} 
                   selectedUploadId={selectedUploadId} 
                   selectedUpload={selectedUpload}
                   refreshUploads={fetchUploads}
                   onSelectUpload={setSelectedUploadId}
                 />
              } />
              <Route path="/upload" element={<UploadProduct />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;
