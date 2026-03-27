import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';

// Import components
import Home from './components/Home';
import LoginAdmin from './components/LoginAdmin';
import LoginDocente from './components/LoginDocente';
import AdminPanel from './components/AdminPanel';
import DocentePanel from './components/DocentePanel';
import DeveloperPanel from './components/DeveloperPanel';
import ChatBot from './components/ChatBot';

// Import context provider
import { InstitutionProvider } from './context/InstitutionContext';

function App() {
  return (
    <InstitutionProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login-admin" element={<LoginAdmin />} />
            <Route path="/login-docente" element={<LoginDocente />} />
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="/docente" element={<DocentePanel />} />
            <Route path="/developer" element={<DeveloperPanel />} />
          </Routes>
          {/* ChatBot disponible en todas las páginas */}
          <ChatBot />
        </div>
      </Router>
    </InstitutionProvider>
  );
}

export default App;
