import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Compra from './pages/Compra'
import Venta from './pages/Venta'
import Admin from './pages/Admin'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import ChatWidget from './components/ChatWidget'
import Auth from './pages/Auth'
import { AuthProvider, useAuth } from './contexts/AuthContext'

function ProtectedApp() {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'black', color: 'white' }}>Cargando...</div>;
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <div className="app-container">
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/compra" element={<Compra />} />
          <Route path="/venta" element={<Venta />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </main>
      <Footer />
      <ChatWidget />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <ProtectedApp />
      </Router>
    </AuthProvider>
  )
}

export default App
