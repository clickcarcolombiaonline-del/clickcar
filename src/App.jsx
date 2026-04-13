import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import Compra from './pages/Compra'
import Venta from './pages/Venta'
import Admin from './pages/Admin'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import ChatWidget from './components/ChatWidget'
import Auth from './pages/Auth'
import { AuthProvider, useAuth } from './contexts/AuthContext'

const SUPER_ADMINS = ['agentemonteriacordoba@gmail.com']; // Pon tu correo aquí

function AdminRoute({ children }) {
  const { user } = useAuth();
  
  if (!SUPER_ADMINS.includes(user?.email)) {
    // Si no es el administrador, lo manda a la página de inicio
    return <Navigate to="/" replace />;
  }
  
  // Si es el administrador, le muestra la página
  return children;
}

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
          <Route 
            path="/admin" 
            element={
              <AdminRoute>
                <Admin />
              </AdminRoute>
            } 
          />
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
