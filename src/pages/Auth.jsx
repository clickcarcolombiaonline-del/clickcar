import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { ShieldAlert, LogIn, UserPlus, Loader2 } from 'lucide-react';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password
        });
        if (error) throw error;
        setMessage('Revisa tu correo para confirmar tu cuenta.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container" style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background effects */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundImage: 'radial-gradient(circle at center, #111 0%, #000 100%)',
        zIndex: -2
      }} />
      <div className="pulse-primary" style={{
        position: 'absolute',
        width: '50vw',
        height: '50vw',
        background: 'var(--primary-glow)',
        filter: 'blur(100px)',
        opacity: 0.2,
        borderRadius: '50%',
        zIndex: -1
      }} />

      <div className="glass" style={{
        width: '100%',
        maxWidth: '450px',
        padding: '40px',
        borderRadius: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
      }}>
        
        <div style={{ textAlign: 'center' }}>
          <div className="logo-text" style={{ fontSize: '2rem', marginBottom: '8px' }}>
            CLICK<span className="highlight">CAR</span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
            {isLogin ? 'Inicia sesión para continuar' : 'Crea tu cuenta ahora'}
          </p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(255, 77, 0, 0.1)',
            border: '1px solid var(--accent)',
            padding: '12px',
            borderRadius: '12px',
            color: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.9rem'
          }}>
            <ShieldAlert size={20} />
            {error}
          </div>
        )}

        {message && (
          <div style={{
            background: 'rgba(57, 255, 20, 0.1)',
            border: '1px solid var(--secondary)',
            padding: '12px',
            borderRadius: '12px',
            color: 'var(--secondary)',
            fontSize: '0.9rem'
          }}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="filter-group">
            <label>CORREO ELECTRÓNICO</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
              style={{ width: '100%' }}
            />
          </div>

          <div className="filter-group">
            <label>CONTRASEÑA</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              style={{ width: '100%' }}
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', marginTop: '10px' }}
          >
            {loading ? <Loader2 className="spinner" size={20} style={{ animation: 'car-wheel-spin 1.5s linear infinite' }} /> : (isLogin ? <LogIn size={20} /> : <UserPlus size={20} />)}
            {isLogin ? 'ACCEDER' : 'REGISTRARSE'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '10px' }}>
          <button 
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
              setMessage(null);
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: 600,
              textDecoration: 'underline'
            }}
          >
            {isLogin ? '¿No tienes cuenta? Regístrate aquí' : '¿Ya tienes cuenta? Inicia sesión'}
          </button>
        </div>
      </div>
    </div>
  );
}
