
import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Home from './Home';
import UploadProduct from './UploadProduct';
import Sidebar from './Sidebar';
import './App.css';

function App() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('app-theme') || 'light';
  });

  const [selectedUploadId, setSelectedUploadId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

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
              <Route path="/" element={<Home theme={theme} selectedUploadId={selectedUploadId} />} />
              <Route path="/upload" element={<UploadProduct />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;
