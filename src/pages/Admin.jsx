import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { motion } from 'framer-motion'
import { LayoutDashboard, CheckCircle, PlusCircle, Settings, LogOut, Trash2, Edit3, Image as ImageIcon, Video, FileText, Camera, Mic, MicOff, Tag } from 'lucide-react'

const Admin = () => {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('approvals')
  const [pendingListings, setPendingListings] = useState([])
  const [brands, setBrands] = useState([])
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [isRecording, setIsRecording] = useState(false)
  const [newBrandName, setNewBrandName] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [verifying, setVerifying] = useState(true)

  const [newVehicle, setNewVehicle] = useState({
    make: '',
    model: '',
    year: new Date().getFullYear(),
    price: '',
    mileage: '',
    fuel_type: 'Gasolina',
    transmission: 'Automática',
    description: '',
    condition: 'Excelente'
  })
  const [uploadFiles, setUploadFiles] = useState({
    images: [],
    video: null
  })
  const [previews, setPreviews] = useState({
    images: [],
    video: null
  })

  const [siteSettings, setSiteSettings] = useState({
    hero_bg_url: '',
    hero_video_url: '',
    site_name: 'ClickCar',
    hero_subtitle: 'EXPERIENCIA AUTOMOTRIZ PREMIUM',
    contact_phone: '+57 321 456 7890',
    contact_email: 'contacto@clickcar.com',
    business_address: 'Edificio Moderno, Piso 12. Medellín, Colombia.',
    site_description: 'La plataforma líder en compra y venta de vehículos premium. Conectamos sueños con realidades a través de tecnología y confianza.',
    privacy_policy: '',
    terms_conditions: '',
    banner_video_subtle: 'true'
  })

  // SEGURIDAD: Función de verificación de rango
  const checkAdminRole = async (userId) => {
    if (!userId) {
      setIsAdmin(false)
      setVerifying(false)
      return
    }
    
    setVerifying(true)
    const { data: { user } } = await supabase.auth.getUser()
    const currentEmail = user?.email || ''

    console.log('--- DIAGNÓSTICO DE ACCESO CLICKCAR ---')
    console.log('Usuario:', currentEmail)
    console.log('ID:', userId)

    // 1. BYPASS MAESTRO PARA EL PROPIETARIO
    if (currentEmail === 'echeverryhernan@gmail.com') {
      console.log('Acceso concedido vía Super-Bypass Propietario')
      setIsAdmin(true)
      setVerifying(false)
      return
    }

    // 2. VERIFICACIÓN EN BASE DE DATOS PARA OTROS
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', userId)
        .single()
      
      if (data?.is_admin) {
        setIsAdmin(true)
      } else {
        console.warn('Acceso denegado: El perfil no tiene flag de admin en la DB.')
        setIsAdmin(false)
        if (userId) {
          alert(`ACCESO RESTRINGIDO\nCorreo: ${currentEmail}\n\nSi eres el dueño del sistema, asegúrate de estar usando el correo echeverryhernan@gmail.com`)
          // Eliminamos el signOut automático aquí para evitar bucles
        }
      }
    } catch (e) {
      console.error('Error verificando roles:', e)
      setIsAdmin(false)
    } finally {
      setVerifying(false)
    }
  }

  // GESTIÓN DE SESIÓN ÚNICA
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) checkAdminRole(session.user.id)
      else setVerifying(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) checkAdminRole(session.user.id)
      else {
        setIsAdmin(false)
        setVerifying(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // CARGA DE DATOS BASADA EN TABS
  useEffect(() => {
    if (session && isAdmin) {
      if (activeTab === 'approvals') {
        const fetchPending = async () => {
          const { data } = await supabase
            .from('vehicles')
            .select('*, profiles(full_name, phone, email)')
            .eq('approved_status', false)
          if (data) setPendingListings(data)
        }
        fetchPending()
      }

      const fetchAllSettings = async () => {
        const { data } = await supabase.from('settings').select('*')
        if (data) {
          const newSettings = { ...siteSettings }
          data.forEach(s => {
            if (newSettings.hasOwnProperty(s.key)) {
              newSettings[s.key] = s.value
            }
          })
          setSiteSettings(newSettings)
        }
      }

      const fetchBrands = async () => {
        const { data } = await supabase.from('brands').select('*').order('name')
        if (data) setBrands(data)
      }

      fetchAllSettings()
      fetchBrands()
    }
  }, [session, isAdmin, activeTab, refreshTrigger])

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    // Diagnóstico previo
    if (!import.meta.env.VITE_SUPABASE_URL) {
      alert('ERROR CRÍTICO: No se han configurado las llaves de Supabase en el servidor.')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.signInWithPassword({ 
      email: email, 
      password: password 
    })
    
    if (error) {
      setError('Credenciales inválidas o error de conexión.')
      setLoading(false)
    } else {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setSession(null)
    setIsAdmin(false)
  }

  const uploadToCloudinary = async (file) => {
    if (!file) return null
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
    const preset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

    if (!cloudName || !preset) {
      alert('¡ATENCIÓN! Faltan las llaves de Cloudinary en el sistema. Revisa el archivo .env o las variables en Vercel.')
      return null
    }

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('upload_preset', preset)
      
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
        method: 'POST',
        body: formData
      })
      
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'Error en Cloudinary')
      return data.secure_url
    } catch (err) {
      alert(`ERROR DE SUBIDA: ${err.message}`)
      return null
    }
  }

  const approveListing = async (id) => {
    setLoading(true)
    const { error } = await supabase
      .from('vehicles')
      .update({ approved_status: true })
      .eq('id', id)
    
    if (error) alert('Error: ' + error.message)
    else {
      setRefreshTrigger(prev => prev + 1)
      alert('Vehículo verificado y publicado.')
    }
    setLoading(false)
  }

  const deleteListing = async (id) => {
    if (!confirm('¿Estás seguro de eliminar esta publicación?')) return
    setLoading(true)
    const { error } = await supabase.from('vehicles').delete().eq('id', id)
    if (error) alert('Error: ' + error.message)
    else setRefreshTrigger(prev => prev + 1)
    setLoading(false)
  }

  const handleFileChange = (e, type) => {
    const files = e.target.files
    if (type === 'images') {
      const fileArr = Array.from(files)
      setUploadFiles(prev => ({ ...prev, images: [...prev.images, ...fileArr] }))
      const newPreviews = fileArr.map(file => URL.createObjectURL(file))
      setPreviews(prev => ({ ...prev, images: [...prev.images, ...newPreviews] }))
    } else if (type === 'video') {
      const file = files[0]
      setUploadFiles(prev => ({ ...prev, video: file }))
      setPreviews(prev => ({ ...prev, video: URL.createObjectURL(file) }))
    }
  }

  const handleCreateInstant = async () => {
    if (!newVehicle.make || !newVehicle.model || !newVehicle.price) {
      alert('Completa Marca, Modelo y Precio')
      return
    }

    setLoading(true)
    try {
      const photoUrls = []
      for (const file of uploadFiles.images) {
        const url = await uploadToCloudinary(file)
        if (url) photoUrls.push(url)
      }

      let videoUrl = ''
      if (uploadFiles.video) videoUrl = await uploadToCloudinary(uploadFiles.video) || ''

      const vehicleData = {
        make: newVehicle.make,
        model: newVehicle.model,
        year: parseInt(newVehicle.year),
        price: parseInt(String(newVehicle.price).replace(/\D/g, '')),
        mileage: parseInt(String(newVehicle.mileage).replace(/\D/g, '')),
        fuel_type: newVehicle.fuel_type,
        transmission: newVehicle.transmission,
        condition: newVehicle.condition,
        description: newVehicle.description,
        user_id: session?.user?.id,
        approved_status: true,
        photos_urls: photoUrls.length > 0 ? photoUrls : [],
        video_url: videoUrl
      }

      const { error } = await supabase.from('vehicles').insert([vehicleData])
      if (error) throw error
      
      alert('¡Vehículo publicado correctamente!')
      setNewVehicle({ make: '', model: '', year: 2024, price: '', mileage: 0, fuel_type: 'Gasolina', transmission: 'Automática', description: '', condition: 'Excelente' })
      setUploadFiles({ images: [], video: null })
      setPreviews({ images: [], video: null })
    } catch (err) {
      alert('Error en publicación: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const startVoiceCapture = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.lang = 'es-ES';
    recognition.onstart = () => setIsRecording(true);
    recognition.onend = () => setIsRecording(false);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setNewVehicle(prev => ({ ...prev, description: prev.description + ' ' + transcript }));
    };
    recognition.start();
  }

  const addBrand = async () => {
    if (!newBrandName) return
    await supabase.from('brands').insert([{ name: newBrandName }])
    setNewBrandName('')
    setRefreshTrigger(p => p + 1)
  }

  const deleteBrand = async (id) => {
    await supabase.from('brands').delete().eq('id', id)
    setRefreshTrigger(p => p + 1)
  }

  if (verifying) {
    return <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--primary)', fontWeight: 'bold' }}>VERIFICANDO ACCESO SEGURO...</div>
  }

  if (!isAdmin) {
    const hasSupabase = !!import.meta.env.VITE_SUPABASE_URL;
    const hasCloudinary = !!import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;

    return (
      <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <div className="glass" style={{ width: '100%', maxWidth: '400px', padding: '40px', borderRadius: '24px' }}>
          
          {/* PANEL DE DIAGNÓSTICO (Solo visible si algo falta) */}
          {(!hasSupabase || !hasCloudinary) && (
            <div style={{ background: 'rgba(255,0,0,0.2)', padding: '15px', borderRadius: '12px', marginBottom: '20px', border: '1px solid red', fontSize: '0.8rem' }}>
              <strong style={{ color: '#ff4d4d' }}>🚨 ERROR DE CONFIGURACIÓN:</strong>
              <ul style={{ marginTop: '5px', paddingLeft: '20px' }}>
                {!hasSupabase && <li>Faltan llaves de Supabase en Vercel</li>}
                {!hasCloudinary && <li>Faltan llaves de Cloudinary en Vercel</li>}
              </ul>
              <p style={{ marginTop: '10px', fontSize: '0.7rem' }}><i>Debes agregar estas variables en el panel de Vercel y re-desplegar.</i></p>
            </div>
          )}

          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'var(--primary)', display: 'inline-flex', justifyContent: 'center', alignItems: 'center', marginBottom: '16px' }}>
              <LayoutDashboard color="black" size={32} />
            </div>
            <h2 style={{ fontSize: '2rem' }}>Panel de <span className="highlight">Control</span></h2>
            <p style={{ fontSize: '0.8rem', opacity: 0.6, marginTop: '8px' }}>ADMINISTRACIÓN CLICKCAR</p>
          </div>
          
          <form onSubmit={handleLogin}>
            <div className="filter-group" style={{ marginBottom: '20px' }}>
              <label>CORREO ELECTRÓNICO</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="ej. admin@clickcar.com" />
            </div>
            <div className="filter-group" style={{ marginBottom: '32px' }}>
              <label>CONTRASEÑA</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {error && <p style={{ color: '#ff4d4d', fontSize: '0.8rem', marginBottom: '16px', textAlign: 'center' }}>{error}</p>}
            
            <button type="submit" disabled={loading || !hasSupabase} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
              {loading ? 'VERIFICANDO...' : 'ENTRAR AL PANEL'}
            </button>
          </form>

          {session && (
            <div style={{ marginTop: '25px', padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', textAlign: 'center' }}>
              <p style={{ fontSize: '0.7rem', opacity: 0.6 }}>SESIÓN ACTUAL:</p>
              <p style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--primary)' }}>{session.user.email}</p>
              <button 
                onClick={handleSignOut} 
                style={{ background: 'none', border: 'none', color: '#ff4d4d', cursor: 'pointer', textDecoration: 'underline', marginTop: '10px', fontSize: '0.7rem' }}
              >
                Cerrar Sesión e intentar otro
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="page-enter container" style={{ padding: '40px 0' }}>
      <div style={{ display: 'flex', gap: '32px' }}>
        {/* Sidebar */}
        <aside className="glass" style={{ width: '260px', padding: '24px', borderRadius: '24px', position: 'sticky', top: '100px', height: 'fit-content' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <LayoutDashboard color="black" />
            </div>
            <h3 style={{ fontSize: '1.2rem' }}>Panel Admin</h3>
          </div>

          <nav className="admin-nav" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button className={`admin-nav-btn ${activeTab === 'approvals' ? 'active' : ''}`} onClick={() => setActiveTab('approvals')}>
              <CheckCircle size={18} /> APROBACIONES
            </button>
            <button className={`admin-nav-btn ${activeTab === 'new' ? 'active' : ''}`} onClick={() => setActiveTab('new')}>
              <PlusCircle size={18} /> NUEVO VEHÍCULO
            </button>
            <button className={`admin-nav-btn ${activeTab === 'brands' ? 'active' : ''}`} onClick={() => setActiveTab('brands')}>
              <Tag size={18} /> MARCAS
            </button>
            <button className={`admin-nav-btn ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
              <Settings size={18} /> CONFIGURACIÓN SITIO
            </button>
            
            <div style={{ margin: '20px 0', borderTop: '1px solid rgba(255,255,255,0.1)' }} />
            
            <button className="admin-nav-btn" onClick={handleSignOut} style={{ color: 'rgba(255,0,0,0.7)' }}>
              <LogOut size={18} /> CERRAR SESIÓN
            </button>
          </nav>
        </aside>

        {/* Content Area */}
        <div style={{ flex: 1 }}>
          {activeTab === 'approvals' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h2 style={{ fontSize: '2.5rem', marginBottom: '32px' }}>PENDIENTES POR <span className="highlight">VALIDAR</span></h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {pendingListings.map(listing => (
                  <div key={listing.id} className="glass" style={{ padding: '24px', borderRadius: '20px', display: 'flex', gap: '24px' }}>
                    <div style={{ width: '320px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <img src={listing.photos_urls?.[0]} style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '16px' }} />
                      {listing.video_url && <video src={listing.video_url} controls muted style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '16px' }} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <h4 style={{ fontSize: '1.4rem' }}>{listing.make} {listing.model}</h4>
                        <span style={{ fontSize: '1.2rem', color: 'var(--primary)', fontWeight: 'bold' }}>${listing.price.toLocaleString()}</span>
                      </div>
                      <p style={{ margin: '10px 0', opacity: 0.7 }}>Usuario: {listing.profiles?.full_name || 'Desconocido'}</p>
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <button className="btn btn-primary" onClick={() => approveListing(listing.id)}>APROBAR</button>
                        <button className="btn glass" onClick={() => deleteListing(listing.id)} style={{ color: 'red' }}>RECHAZAR</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'new' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h2 style={{ fontSize: '2.5rem', marginBottom: '32px' }}>AÑADIR <span className="highlight">DIRECTO</span></h2>
              <div className="glass" style={{ padding: '32px', borderRadius: '20px' }}>
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                    <div className="filter-group"><label>MARCA</label><input type="text" value={newVehicle.make} onChange={e => setNewVehicle({...newVehicle, make: e.target.value})} /></div>
                    <div className="filter-group"><label>MODELO</label><input type="text" value={newVehicle.model} onChange={e => setNewVehicle({...newVehicle, model: e.target.value})} /></div>
                    <div className="filter-group"><label>PRECIO</label><input type="number" value={newVehicle.price} onChange={e => setNewVehicle({...newVehicle, price: e.target.value})} /></div>
                 </div>
                 <div style={{ marginTop: '24px', display: 'flex', gap: '24px' }}>
                    <label className="btn glass"><ImageIcon size={18}/> FOTOS<input type="file" multiple hidden onChange={e => handleFileChange(e, 'images')} /></label>
                    <label className="btn glass"><Video size={18}/> VIDEO TOUR<input type="file" hidden onChange={e => handleFileChange(e, 'video')} /></label>
                 </div>
                 <button className="btn btn-secondary" style={{ width: '100%', marginTop: '32px', padding: '16px' }} onClick={handleCreateInstant} disabled={loading}>
                   {loading ? 'SUBIENDO...' : 'PUBLICAR VEHÍCULO'}
                 </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .admin-nav-btn {
          display: flex; align-items: center; gap: 12px; width: 100%; padding: 12px 16px;
          background: none; border: none; color: white; opacity: 0.6; cursor: pointer;
          border-radius: 12px; transition: 0.2s; text-align: left;
        }
        .admin-nav-btn.active { background: rgba(255,255,255,0.1); opacity: 1; color: var(--primary); }
        .admin-nav-btn:hover { opacity: 1; background: rgba(255,255,255,0.05); }
      `}} />
    </div>
  )
}

export default Admin
