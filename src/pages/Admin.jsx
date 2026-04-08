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
  const [inventoryListings, setInventoryListings] = useState([])
  const [brands, setBrands] = useState([])
  const [editingVehicle, setEditingVehicle] = useState(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleUpdateVehicle = async () => {
    if (!editingVehicle.make || !editingVehicle.model || !editingVehicle.price) {
      alert('Completa Marca, Modelo y Precio')
      return
    }
    setLoading(true)
    try {
      const { error } = await supabase
        .from('vehicles')
        .update({
          make: editingVehicle.make,
          model: editingVehicle.model,
          year: parseInt(editingVehicle.year),
          price: parseInt(String(editingVehicle.price).replace(/\D/g, '')),
          mileage: parseInt(String(editingVehicle.mileage).replace(/\D/g, '')),
          condition: editingVehicle.condition || 'Excelente',
          description: editingVehicle.description || ''
        })
        .eq('id', editingVehicle.id)
        
      if (error) throw error
      alert('¡Vehículo actualizado correctamente!')
      setEditingVehicle(null)
      setRefreshTrigger(p => p + 1)
    } catch (err) {
      alert('Error al actualizar: ' + err.message)
    } finally {
      setLoading(false)
    }
  }
  const [isRecording, setIsRecording] = useState(false)
  const [newBrandName, setNewBrandName] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [verifying, setVerifying] = useState(true)
  const [authLog, setAuthLog] = useState([])
  const [loginGracePeriod, setLoginGracePeriod] = useState(false)

  const addToLog = (msg) => {
    console.log(`[AUTH_LOG]: ${msg}`)
    setAuthLog(prev => [...prev.slice(-3), `${new Date().toLocaleTimeString()}: ${msg}`])
  }

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
      addToLog("Sin ID de usuario.")
      setIsAdmin(false)
      setVerifying(false)
      return
    }
    
    setVerifying(true)
    const { data: { user } } = await supabase.auth.getUser()
    const emailToVerify = user?.email || ''
    addToLog(`Admin? -> ${emailToVerify}`)

    if (emailToVerify.toLowerCase().includes('echeverryhernan@gmail.com')) {
      addToLog("SuperAdmin RECONOCIDO.")
      setIsAdmin(true)
      setVerifying(false)
      return
    }

    try {
      const { data } = await supabase.from('profiles').select('is_admin').eq('id', userId).single()
      if (data?.is_admin) {
        setIsAdmin(true)
        addToLog("Admin DB RECONOCIDO.")
      } else {
        setIsAdmin(false)
        addToLog("Permisos denegados.")
      }
    } catch (e) {
      setIsAdmin(false)
      addToLog("Error verificación.")
    } finally {
      setVerifying(false)
    }
  }

  useEffect(() => {
    addToLog("Monitor con Protección iniciado...")
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSession(session)
        checkAdminRole(session.user.id)
      } else {
        setVerifying(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      addToLog(`Evento: ${event}`)
      if (session) {
        setSession(session)
        if (event === 'SIGNED_IN') {
           setLoginGracePeriod(true)
           setTimeout(() => setLoginGracePeriod(false), 15000) // 15 Segundos de escudo
        }
        checkAdminRole(session.user.id)
      } else {
        // Bloqueio de expulsión
        if (event === 'SIGNED_OUT') {
           if (loginGracePeriod) {
             addToLog("SIGNED_OUT Bloqueado (Escudo activo)")
           } else {
             setIsAdmin(false)
             setSession(null)
             setVerifying(false)
           }
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [loginGracePeriod])

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

      if (activeTab === 'inventory') {
        const fetchInventory = async () => {
          const { data } = await supabase
            .from('vehicles')
            .select('*, profiles(full_name, phone, email)')
            .order('created_at', { ascending: false })
          if (data) setInventoryListings(data)
        }
        fetchInventory()
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
    addToLog("Intentando login...")
    
    // Diagnóstico previo
    if (!import.meta.env.VITE_SUPABASE_URL) {
      addToLog("ERROR: Faltan llaves Supabase.")
      setError('Faltan llaves de servidor.')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.signInWithPassword({ 
      email: email, 
      password: password 
    })
    
    if (error) {
      addToLog(`Error Login: ${error.message}`)
      setError('Credenciales inválidas.')
      setLoading(false)
    } else {
      addToLog("Login exitoso. Esperando sesión...")
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

  const updateAllSettings = async () => {
    setLoading(true)
    try {
      const updates = Object.entries(siteSettings).map(([key, value]) => ({
        key,
        value: String(value)
      }))

      for (const update of updates) {
        const { error } = await supabase
          .from('settings')
          .upsert(update, { onConflict: 'key' })
        if (error) throw error
      }
      
      alert('¡Configuración actualizada con éxito!')
      setRefreshTrigger(prev => prev + 1)
    } catch (err) {
      alert('Error actualizando: ' + err.message)
    } finally {
      setLoading(false)
    }
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

          {/* LOG DE DIAGNÓSTICO (Para Vercel) */}
          <div style={{ marginTop: '20px', padding: '10px', background: 'black', borderRadius: '8px', border: '1px solid #333' }}>
             <p style={{ fontSize: '0.6rem', color: '#666', marginBottom: '5px' }}>ESTADO DE CONEXIÓN:</p>
             {authLog.map((log, i) => (
               <div key={i} style={{ fontSize: '0.6rem', color: '#00ff00', fontFamily: 'monospace' }}>{log}</div>
             ))}
          </div>

          <button 
            onClick={() => {
              localStorage.clear();
              sessionStorage.clear();
              supabase.auth.signOut();
              window.location.reload();
            }} 
            style={{ 
              marginTop: '15px', 
              width: '100%', 
              background: 'none', 
              border: '1px solid rgba(255,255,255,0.1)', 
              color: 'var(--text-secondary)', 
              padding: '10px', 
              borderRadius: '8px', 
              fontSize: '0.7rem', 
              cursor: 'pointer' 
            }}
          >
            🧹 LIMPIEZA DE EMERGENCIA (BORRAR CACHÉ)
          </button>
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
            <button className={`admin-nav-btn ${activeTab === 'inventory' ? 'active' : ''}`} onClick={() => setActiveTab('inventory')}>
              <LayoutDashboard size={18} /> INVENTARIO TOTAL
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
                    <div style={{ width: '320px', flexShrink: 0 }}>
                      <div style={{ width: '100%', height: '180px', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', marginBottom: '12px' }}>
                        <img src={listing.photos_urls?.[0] || 'https://images.unsplash.com/photo-1614162692292-7ac56d777ac1?auto=format&fit=crop&q=80&w=800'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      {listing.video_url && (
                        <div style={{ borderRadius: '12px', overflow: 'hidden', background: '#000' }}>
                          <video src={listing.video_url} controls muted style={{ width: '100%', height: '120px', objectFit: 'cover' }} />
                        </div>
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <h4 style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>{listing.make} {listing.model} {listing.year}</h4>
                          <p style={{ margin: '8px 0', opacity: 0.7, fontSize: '0.9rem' }}>Vendedor: {listing.profiles?.full_name || 'Desconocido'}</p>
                        </div>
                        <span style={{ fontSize: '1.4rem', color: 'var(--primary)', fontWeight: '900' }}>${(listing.price || 0).toLocaleString()}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '15px', color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '15px 0' }}>
                        <span>KM: {(listing.mileage || 0).toLocaleString()}</span>
                        <span>Motor: {listing.fuel_type}</span>
                        <span>Transmisión: {listing.transmission}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                        <button className="btn btn-primary" onClick={() => approveListing(listing.id)} style={{ padding: '8px 24px' }}>APROBAR</button>
                        <button className="btn glass" onClick={() => deleteListing(listing.id)} style={{ color: '#ff4d4d', padding: '8px 24px' }}>RECHAZAR</button>
                      </div>
                    </div>
                  </div>
                ))}
                {pendingListings.length === 0 && <p style={{ opacity: 0.5, textAlign: 'center', padding: '40px' }}>No hay vehículos pendientes por aprobar.</p>}
              </div>
            </motion.div>
          )}

          {activeTab === 'inventory' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h2 style={{ fontSize: '2.5rem', marginBottom: '32px' }}>INVENTARIO <span className="highlight">TOTAL</span></h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {inventoryListings.map(listing => (
                  <div key={listing.id} className="glass" style={{ padding: '20px', borderRadius: '20px', display: 'flex', gap: '24px', alignItems: 'center' }}>
                    <div style={{ width: '180px', flexShrink: 0 }}>
                      <div style={{ width: '100%', height: '120px', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <img src={listing.photos_urls?.[0] || 'https://images.unsplash.com/photo-1614162692292-7ac56d777ac1?auto=format&fit=crop&q=80&w=800'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <h4 style={{ fontSize: '1.3rem', fontWeight: 'bold' }}>{listing.make} {listing.model} {listing.year}</h4>
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '6px' }}>
                            <span style={{ 
                                padding: '4px 10px', 
                                borderRadius: '20px', 
                                fontSize: '0.75rem', 
                                fontWeight: 'bold', 
                                background: listing.approved_status ? 'rgba(0, 255, 0, 0.1)' : 'rgba(255, 165, 0, 0.1)', 
                                color: listing.approved_status ? '#00ff00' : 'orange',
                                border: listing.approved_status ? '1px solid rgba(0,255,0,0.3)' : '1px solid rgba(255,165,0,0.3)'
                              }}>
                              {listing.approved_status ? 'PUBLICADO' : 'PENDIENTE'}
                            </span>
                            <span style={{ opacity: 0.7, fontSize: '0.8rem' }}>
                              ID: {listing.id.substring(0, 8)}...
                            </span>
                          </div>
                        </div>
                        <span style={{ fontSize: '1.2rem', color: 'var(--primary)', fontWeight: '900' }}>${(listing.price || 0).toLocaleString()}</span>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                        <button className="btn" onClick={() => setEditingVehicle(listing)} style={{ padding: '8px 20px', fontSize: '0.85rem', background: 'white', color: 'black', borderRadius: '10px' }}>
                          <Edit3 size={16} style={{marginRight: '6px'}}/> EDITAR
                        </button>
                        <button className="btn glass" onClick={() => deleteListing(listing.id)} style={{ color: '#ff4d4d', padding: '8px 20px', fontSize: '0.85rem', borderColor: 'rgba(255,0,0,0.2)' }}>
                          <Trash2 size={16} style={{marginRight: '6px'}}/> ELIMINAR
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {inventoryListings.length === 0 && <p style={{ opacity: 0.5, textAlign: 'center', padding: '40px' }}>No hay vehículos en el inventario.</p>}
              </div>
            </motion.div>
          )}

          {activeTab === 'new' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h2 style={{ fontSize: '2.5rem', marginBottom: '32px' }}>AÑADIR <span className="highlight">DIRECTO</span></h2>
              <div className="glass" style={{ padding: '32px', borderRadius: '20px' }}>
                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px' }}>
                    <div className="filter-group">
                      <label>MARCA</label>
                      <select value={newVehicle.make} onChange={e => setNewVehicle({...newVehicle, make: e.target.value})} style={{ background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', padding: '12px', borderRadius: '10px', width: '100%' }}>
                        <option value="" style={{ color: 'black' }}>Seleccionar Marca</option>
                        {brands.map(b => <option key={b.id} value={b.name} style={{ color: 'black' }}>{b.name}</option>)}
                      </select>
                    </div>
                    <div className="filter-group"><label>MODELO</label><input type="text" value={newVehicle.model} onChange={e => setNewVehicle({...newVehicle, model: e.target.value})} placeholder="Ej. Corvette C8" /></div>
                    <div className="filter-group"><label>AÑO</label><input type="number" value={newVehicle.year} onChange={e => setNewVehicle({...newVehicle, year: e.target.value})} /></div>
                    <div className="filter-group"><label>PRECIO ($)</label><input type="number" value={newVehicle.price} onChange={e => setNewVehicle({...newVehicle, price: e.target.value})} /></div>
                    <div className="filter-group"><label>KILOMETRAJE</label><input type="number" value={newVehicle.mileage} onChange={e => setNewVehicle({...newVehicle, mileage: e.target.value})} /></div>
                 </div>
                 
                 <div className="filter-group" style={{ marginTop: '24px' }}>
                   <label>DESCRIPCIÓN (VOZ DISPONIBLE)</label>
                   <div style={{ position: 'relative' }}>
                    <textarea value={newVehicle.description} onChange={e => setNewVehicle({...newVehicle, description: e.target.value})} style={{ background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', padding: '12px', borderRadius: '10px', width: '100%', height: '100px', resize: 'none' }} />
                    <button onClick={startVoiceCapture} style={{ position: 'absolute', right: '15px', bottom: '15px', background: 'none', border: 'none', color: isRecording ? 'red' : 'var(--primary)', cursor: 'pointer' }}>
                      {isRecording ? <MicOff size={24} className="glow-red" /> : <Mic size={24} />}
                    </button>
                   </div>
                 </div>

                 <div style={{ marginTop: '32px', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                    <label className="btn glass" style={{ cursor: 'pointer' }}>
                      <ImageIcon size={18}/> FOTOS ({uploadFiles.images.length})
                      <input type="file" multiple hidden onChange={e => handleFileChange(e, 'images')} accept="image/*" />
                    </label>
                    <label className="btn glass" style={{ cursor: 'pointer', borderColor: uploadFiles.video ? 'var(--primary)' : '' }}>
                      <Video size={18}/> {uploadFiles.video ? 'VIDEO SELECCIONADO' : 'CARGAR VIDEO TOUR'}
                      <input type="file" hidden onChange={e => handleFileChange(e, 'video')} accept="video/*" />
                    </label>
                 </div>
                 
                 <button className="btn btn-primary" style={{ width: '100%', marginTop: '32px', padding: '16px', fontSize: '1.2rem', justifyContent: 'center' }} onClick={handleCreateInstant} disabled={loading}>
                   {loading ? 'PROCESANDO SUBIDA...' : 'PUBLICAR EN CATÁLOGO'}
                 </button>
              </div>
            </motion.div>
          )}

          {activeTab === 'brands' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h2 style={{ fontSize: '2.5rem', marginBottom: '32px' }}>GESTIÓN DE <span className="highlight">MARCAS</span></h2>
              <div className="glass" style={{ padding: '32px', borderRadius: '20px', marginBottom: '32px' }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <div className="filter-group" style={{ flex: 1, minWidth: '250px' }}>
                    <label>NOMBRE DE LA MARCA</label>
                    <input type="text" value={newBrandName} onChange={e => setNewBrandName(e.target.value)} placeholder="Ej. Ferrari, Lamborghini..." />
                  </div>
                  <button className="btn btn-primary" onClick={addBrand}>AÑADIR MARCA</button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
                {brands.map(brand => (
                  <div key={brand.id} className="glass" style={{ padding: '16px 20px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ fontWeight: '700', letterSpacing: '0.05em' }}>{brand.name}</span>
                    <button onClick={() => deleteBrand(brand.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,0,0,0.4)', transition: '0.2s' }} onMouseEnter={e => e.currentTarget.style.color='red'} onMouseLeave={e => e.currentTarget.style.color='rgba(255,0,0,0.4)'}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h2 style={{ fontSize: '2.5rem', marginBottom: '32px' }}>CONFIGURACIÓN DEL <span className="highlight">SITIO</span></h2>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '32px', marginBottom: '40px' }}>
                {/* Banner Principal */}
                <div className="glass" style={{ padding: '32px', borderRadius: '24px' }}>
                  <h3 style={{ color: 'var(--primary)', marginBottom: '24px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' }}><Settings size={20}/> BANNER CABECERA</h3>
                  <div className="filter-group" style={{ marginBottom: '16px' }}>
                    <label>TÍTULO DEL SITIO (LOGO)</label>
                    <input type="text" value={siteSettings.site_name} onChange={e => setSiteSettings({...siteSettings, site_name: e.target.value})} />
                  </div>
                  <div className="filter-group" style={{ marginBottom: '16px' }}>
                    <label>URL VIDEO BANNER (CLOUDINARY)</label>
                    <input type="text" value={siteSettings.hero_video_url} onChange={e => setSiteSettings({...siteSettings, hero_video_url: e.target.value})} placeholder="URL de video .mp4" />
                  </div>
                  <div className="filter-group" style={{ marginBottom: '16px' }}>
                    <label>¿MODO NÍTIDO? (QUITA EL FILTRO OSCURO)</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input 
                        type="checkbox" 
                        checked={siteSettings.banner_video_subtle === 'false'} 
                        onChange={(e) => setSiteSettings({...siteSettings, banner_video_subtle: e.target.checked ? 'false' : 'true'})}
                        style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: '0.8rem', color: siteSettings.banner_video_subtle === 'false' ? 'var(--primary)' : '#666' }}>
                        {siteSettings.banner_video_subtle === 'false' ? 'NITIDEZ ACTIVADA' : 'FILTRO OSCURO ACTIVO'}
                      </span>
                    </div>
                  </div>
                  <div className="filter-group">
                    <label>SUBTÍTULO</label>
                    <input type="text" value={siteSettings.hero_subtitle} onChange={e => setSiteSettings({...siteSettings, hero_subtitle: e.target.value})} />
                  </div>
                </div>

                {/* Contacto */}
                <div className="glass" style={{ padding: '32px', borderRadius: '24px' }}>
                  <h3 style={{ color: 'var(--secondary)', marginBottom: '24px', fontSize: '1.2rem' }}>DATOS DE CONTACTO</h3>
                  <div className="filter-group" style={{ marginBottom: '16px' }}>
                    <label>TELÉFONO WHATSAPP</label>
                    <input type="text" value={siteSettings.contact_phone} onChange={e => setSiteSettings({...siteSettings, contact_phone: e.target.value})} />
                  </div>
                  <div className="filter-group" style={{ marginBottom: '16px' }}>
                    <label>CORREO DE CONTACTO</label>
                    <input type="email" value={siteSettings.contact_email} onChange={e => setSiteSettings({...siteSettings, contact_email: e.target.value})} />
                  </div>
                  <div className="filter-group">
                    <label>DIRECCIÓN FÍSICA</label>
                    <input type="text" value={siteSettings.business_address} onChange={e => setSiteSettings({...siteSettings, business_address: e.target.value})} />
                  </div>
                </div>
              </div>

              {/* Textos Legales */}
              <div className="glass" style={{ padding: '32px', borderRadius: '24px', marginBottom: '32px' }}>
                <h3 style={{ color: 'var(--tertiary)', marginBottom: '24px', fontSize: '1.2rem' }}>FOOTER Y LEGAL</h3>
                <div className="filter-group" style={{ marginBottom: '24px' }}>
                  <label>DESCRIPCIÓN BREVE (BAJO EL LOGO)</label>
                  <textarea value={siteSettings.site_description} onChange={e => setSiteSettings({...siteSettings, site_description: e.target.value})} style={{ background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', padding: '12px', borderRadius: '10px', width: '100%', height: '80px', resize: 'none' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                  <div className="filter-group">
                    <label>POLÍTICA DE PRIVACIDAD</label>
                    <textarea value={siteSettings.privacy_policy} onChange={e => setSiteSettings({...siteSettings, privacy_policy: e.target.value})} style={{ background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', padding: '12px', borderRadius: '10px', width: '100%', height: '150px', resize: 'none' }} />
                  </div>
                  <div className="filter-group">
                    <label>TÉRMINOS Y CONDICIONES</label>
                    <textarea value={siteSettings.terms_conditions} onChange={e => setSiteSettings({...siteSettings, terms_conditions: e.target.value})} style={{ background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', padding: '12px', borderRadius: '10px', width: '100%', height: '150px', resize: 'none' }} />
                  </div>
                </div>
              </div>

              <button className="btn btn-primary" style={{ width: '100%', padding: '20px', fontSize: '1.2rem', justifyContent: 'center' }} onClick={updateAllSettings} disabled={loading}>
                {loading ? 'GUARDANDO CAMBIOS...' : 'GUARDAR CONFIGURACIÓN COMPLETA'}
              </button>
            </motion.div>
          )}
        </div>
      </div>

      {/* MODAL DE EDICIÓN DE VEHÍCULO */}
      {editingVehicle && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '20px' }}>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', padding: '32px', borderRadius: '24px', position: 'relative' }}>
            <button onClick={() => setEditingVehicle(null)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: 'white', fontSize: '2rem', cursor: 'pointer', lineHeight: 1 }}>&times;</button>
            <h2 style={{ fontSize: '2rem', marginBottom: '24px' }}>EDITAR <span className="highlight">VEHÍCULO</span></h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div className="filter-group">
                <label>MARCA</label>
                <input type="text" value={editingVehicle.make || ''} onChange={e => setEditingVehicle({...editingVehicle, make: e.target.value})} />
              </div>
              <div className="filter-group">
                <label>MODELO</label>
                <input type="text" value={editingVehicle.model || ''} onChange={e => setEditingVehicle({...editingVehicle, model: e.target.value})} />
              </div>
              <div className="filter-group">
                <label>AÑO</label>
                <input type="number" value={editingVehicle.year || ''} onChange={e => setEditingVehicle({...editingVehicle, year: e.target.value})} />
              </div>
              <div className="filter-group">
                <label>PRECIO ($)</label>
                <input type="number" value={editingVehicle.price || ''} onChange={e => setEditingVehicle({...editingVehicle, price: e.target.value})} />
              </div>
              <div className="filter-group">
                <label>KILOMETRAJE</label>
                <input type="number" value={editingVehicle.mileage || ''} onChange={e => setEditingVehicle({...editingVehicle, mileage: e.target.value})} />
              </div>
              <div className="filter-group">
                <label>ESTADO</label>
                <select value={editingVehicle.condition || 'Excelente'} onChange={e => setEditingVehicle({...editingVehicle, condition: e.target.value})} style={{ background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', padding: '12px', borderRadius: '10px' }}>
                   <option value="Excelente" style={{color: 'black'}}>Excelente</option>
                   <option value="Bueno" style={{color: 'black'}}>Bueno</option>
                   <option value="Usado" style={{color: 'black'}}>Usado</option>
                </select>
              </div>
            </div>

            <div className="filter-group" style={{ marginBottom: '32px' }}>
              <label>DESCRIPCIÓN</label>
              <textarea value={editingVehicle.description || ''} onChange={e => setEditingVehicle({...editingVehicle, description: e.target.value})} style={{ background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', padding: '12px', borderRadius: '10px', width: '100%', height: '100px', resize: 'none' }} />
            </div>

            <div style={{ display: 'flex', gap: '16px' }}>
              <button className="btn btn-primary" style={{ flex: 1, padding: '16px', justifyContent: 'center' }} onClick={handleUpdateVehicle} disabled={loading}>
                {loading ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}
              </button>
              <button className="btn glass" style={{ width: '120px', justifyContent: 'center', background: 'rgba(255,255,255,0.1)' }} onClick={() => setEditingVehicle(null)}>
                CANCELAR
              </button>
            </div>
          </motion.div>
        </div>
      )}

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
