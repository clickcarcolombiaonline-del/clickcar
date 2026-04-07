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
  const [heroBgUrl, setHeroBgUrl] = useState('')

  // New vehicle direct creation state
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

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

  useEffect(() => {
    if (session && activeTab === 'approvals') {
      const fetchPending = async () => {
        const { data, error } = await supabase
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
  }, [session, activeTab, refreshTrigger])

  const startVoiceCapture = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Tu navegador no soporta reconocimiento de voz.")
      return;
    }
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
    const { error } = await supabase.from('brands').insert([{ name: newBrandName }])
    if (!error) {
      setNewBrandName('')
      setRefreshTrigger(p => p + 1)
    }
  }

  const deleteBrand = async (id) => {
    await supabase.from('brands').delete().eq('id', id)
    setRefreshTrigger(p => p + 1)
  }

  const updateAllSettings = async () => {
    setLoading(true)
    const updates = Object.entries(siteSettings).map(([key, value]) => ({
      key, value
    }))
    
    // In a real environment, you'd upsert these. For simplicity and mock compatibility:
    for (const update of updates) {
      await supabase.from('settings').upsert([update], { onConflict: 'key' })
    }
    
    alert('¡Configuración actualizada correctamente!')
    setRefreshTrigger(p => p + 1)
    setLoading(false)
  }

  const uploadToSupabase = async (file, bucket = 'vehicles') => {
    if (!file) return null
    const fileExt = file.name?.split('.')?.pop() || 'tmp'
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`
    const filePath = `${fileName}`

    try {
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type // Asegura que el navegador sepa que es un Video
        })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath)

      return publicUrl
    } catch (err) {
      console.error('Upload error:', err)
      return null
    }
  }

  const [isAdmin, setIsAdmin] = useState(false)
  const [verifying, setVerifying] = useState(true)

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

  const checkAdminRole = async (userId) => {
    setVerifying(true)
    
    // 1. ACCESO PRIVILEGIADO PARA EL PROPIETARIO (Fail-safe)
    if (session?.user?.email === 'echeverryhernan@gmail.com') {
      setIsAdmin(true)
      setVerifying(false)
      return
    }

    // 2. VERIFICACIÓN EN BASE DE DATOS PARA OTROS ADMINS
    const { data } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .single()
    
    if (data?.is_admin) {
      setIsAdmin(true)
    } else {
      setIsAdmin(false)
      if (userId) {
        alert('Acceso denegado: No tienes permisos de administrador.')
        supabase.auth.signOut()
      }
    }
    setVerifying(false)
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Credenciales inválidas.')
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setSession(null)
    setIsAdmin(false)
  }

  const approveListing = async (id) => {
    setLoading(true)
    const { error } = await supabase
      .from('vehicles')
      .update({ approved_status: true })
      .eq('id', id)
    
    if (error) {
      alert('Error: ' + error.message)
    } else {
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
      alert('Por favor completa los campos básicos (Marca, Modelo, Precio)')
      return
    }

    setLoading(true)
    
    try {
      const photoUrls = []
      for (const file of uploadFiles.images) {
        const url = await uploadToSupabase(file)
        if (url) photoUrls.push(url)
      }

      let videoUrl = ''
      if (uploadFiles.video) {
        videoUrl = await uploadToSupabase(uploadFiles.video)
      }

      const { data, error } = await supabase
        .from('vehicles')
        .insert([
          { 
            ...newVehicle,
            year: parseInt(newVehicle.year) || new Date().getFullYear(),
            price: parseInt(newVehicle.price) || 0,
            mileage: parseInt(newVehicle.mileage) || 0,
            user_id: session?.user?.id,
            approved_status: true,
            photos_urls: photoUrls.length > 0 ? photoUrls : ['https://images.unsplash.com/photo-1614162692292-7ac56d777ac1?auto=format&fit=crop&q=80&w=800'],
            video_url: videoUrl || ''
          }
        ])

      if (error) throw error
      
      alert('¡Vehículo publicado instantáneamente!')
      setNewVehicle({
        make: '', model: '', year: 2024, price: '', mileage: '', fuel_type: 'Gasolina', transmission: 'Automática', description: '', condition: 'Excelente'
      })
      setUploadFiles({ images: [], video: null })
      setPreviews({ images: [], video: null })
    } catch (err) {
      alert('Error: ' + err.message)
    }
    setLoading(false)
  }

  if (verifying) {
    return <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--primary)' }}>VERIFICANDO ACCESO SEGURO...</div>
  }

  if (!session || !isAdmin) {
    return (
      <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <div className="glass" style={{ width: '100%', maxWidth: '400px', padding: '40px', borderRadius: '24px' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'var(--primary)', display: 'inline-flex', justifyContent: 'center', alignItems: 'center', marginBottom: '16px' }}>
              <LayoutDashboard color="black" size={32} />
            </div>
            <h2 style={{ fontSize: '2rem' }}>Panel de <span className="highlight">Control</span></h2>
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
            {session && !isAdmin && <p style={{ color: '#ff4d4d', fontSize: '0.8rem', marginBottom: '16px', textAlign: 'center' }}>Acceso denegado: No tienes permisos de administrador.</p>}
            <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
              {loading ? 'SOLICITANDO ACCESO...' : 'ENTRAR AL SISTEMA'}
            </button>
          </form>
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
                    {/* Media Verification Panel */}
                    <div style={{ width: '320px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div className="glass" style={{ width: '100%', height: '200px', borderRadius: '16px', overflow: 'hidden', position: 'relative', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <img 
                          src={listing.photos_urls?.[0] || 'https://images.unsplash.com/photo-1614162692292-7ac56d777ac1?auto=format&fit=crop&q=80&w=800'} 
                          alt="Main Preview" 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        />
                        <div style={{ position: 'absolute', bottom: '10px', left: '10px', background: 'rgba(0,0,0,0.6)', padding: '4px 10px', borderRadius: '4px', fontSize: '0.6rem', color: 'white' }}>
                          FOTO PRINCIPAL
                        </div>
                      </div>

                      {listing.photos_urls?.length > 1 && (
                        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', padding: '4px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
                          {listing.photos_urls.map((url, i) => (
                            <img 
                              key={i} 
                              src={url} 
                              style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)', cursor: 'zoom-in' }} 
                              onClick={() => window.open(url, '_blank')}
                            />
                          ))}
                        </div>
                      )}

                       {listing.video_url && (
                        <div className="glass" style={{ width: '100%', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--secondary-glow)', position: 'relative' }}>
                           <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'white', opacity: 0.3, fontSize: '0.6rem' }}>
                             CARGANDO...
                           </div>
                           <video 
                             src={`${listing.video_url}?t=${Date.now()}`} 
                             controls 
                             muted
                             autoPlay
                             playsInline
                             loop
                             style={{ width: '100%', height: '140px', objectFit: 'cover', background: '#000', position: 'relative', zIndex: 1 }} 
                           />
                           <div style={{ fontSize: '0.65rem', textAlign: 'center', padding: '6px', background: 'var(--secondary)', color: 'black', fontWeight: '800', letterSpacing: '0.1em', position: 'relative', zIndex: 2 }}>
                             REVISIÓN DE VIDEO TOUR
                           </div>
                        </div>
                      )}
                    </div>
                    
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <h4 style={{ fontSize: '1.4rem' }}>{listing.make} {listing.model} {listing.year}</h4>
                        <span style={{ fontSize: '1.2rem', color: 'var(--primary)', fontWeight: '900' }}>
                          ${(listing.price || 0).toLocaleString()}
                        </span>
                      </div>
                      <p style={{ color: 'var(--text-secondary)', margin: '8px 0' }}>
                        Usuario: <strong>{listing.profiles?.full_name || listing.name || 'Usuario Externo'}</strong> • {listing.profiles?.email || listing.email || 'Sin correo'}
                      </p>
                      <div style={{ display: 'flex', gap: '16px', color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '16px' }}>
                        <span>TEL: {listing.profiles?.phone || listing.phone || 'N/A'}</span>
                        <span>KM: {(listing.mileage || 0).toLocaleString()}</span>
                        <span>Motor: {listing.fuel_type || 'N/A'}</span>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <button className="btn btn-primary" onClick={() => approveListing(listing.id)} disabled={loading}>
                          <CheckCircle size={16} /> {loading ? 'ESPERE...' : 'APROBAR'}
                        </button>
                        <button className="btn glass" onClick={() => deleteListing(listing.id)} disabled={loading}>
                          <Trash2 size={16} color="red" /> {loading ? 'ESPERE...' : 'RECHAZAR'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {pendingListings.length === 0 && <p style={{ opacity: 0.5, textAlign: 'center', padding: '40px' }}>No hay solicitudes pendientes.</p>}
              </div>
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h2 style={{ fontSize: '2.5rem', marginBottom: '32px' }}>CONFIGURACIÓN DEL <span className="highlight">SITIO</span></h2>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '32px' }}>
                {/* Banner Section */}
                <div className="glass" style={{ padding: '32px', borderRadius: '24px' }}>
                  <h3 style={{ color: 'var(--primary)', marginBottom: '24px' }}>BANNER PRINCIPAL</h3>
                  <div className="filter-group" style={{ marginBottom: '16px' }}>
                    <label>URL IMAGEN FONDO</label>
                    <input type="text" value={siteSettings.hero_bg_url} onChange={e => setSiteSettings({...siteSettings, hero_bg_url: e.target.value})} />
                  </div>
                  <div className="filter-group" style={{ marginBottom: '16px' }}>
                    <label>URL VIDEO FONDO (CLOUDINARY)</label>
                    <input type="text" value={siteSettings.hero_video_url} onChange={e => setSiteSettings({...siteSettings, hero_video_url: e.target.value})} placeholder="URL de video mp4..." />
                  </div>
                  <div className="filter-group" style={{ marginBottom: '24px' }}>
                    <label>TÍTULO PRINCIPAL (LOGO)</label>
                    <input type="text" value={siteSettings.site_name} onChange={e => setSiteSettings({...siteSettings, site_name: e.target.value})} />
                  </div>
                  <div className="filter-group" style={{ marginBottom: '24px' }}>
                    <label>SUBTÍTULO</label>
                    <input type="text" value={siteSettings.hero_subtitle} onChange={e => setSiteSettings({...siteSettings, hero_subtitle: e.target.value})} />
                  </div>

                  {/* Banner Style Toggle */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div>
                      <h4 style={{ fontSize: '0.9rem', marginBottom: '4px' }}>EFECTO SUTIL EN BANNER</h4>
                      <p style={{ fontSize: '0.7rem', opacity: 0.5 }}>Reduce el brillo y añade desenfoque para resaltar el texto.</p>
                    </div>
                    <button 
                      onClick={() => setSiteSettings({...siteSettings, banner_video_subtle: siteSettings.banner_video_subtle === 'true' ? 'false' : 'true' })}
                      className="btn glass"
                      style={{ 
                        padding: '8px 16px', 
                        fontSize: '0.7rem', 
                        background: siteSettings.banner_video_subtle === 'true' ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                        color: siteSettings.banner_video_subtle === 'true' ? 'black' : 'white'
                      }}
                    >
                      {siteSettings.banner_video_subtle === 'true' ? 'ACTIVO' : 'INACTIVO'}
                    </button>
                  </div>
                  
                  {siteSettings.hero_bg_url && !siteSettings.hero_video_url && (
                    <div style={{ marginTop: '20px', width: '100%', height: '120px', borderRadius: '12px', background: `url("${siteSettings.hero_bg_url}")`, backgroundSize: 'cover' }} />
                  )}
                  {siteSettings.hero_video_url && (
                    <div style={{ marginTop: '20px', width: '100%', height: '120px', borderRadius: '12px', overflow: 'hidden', background: '#000', position: 'relative' }}>
                      <video src={siteSettings.hero_video_url} muted loop autoPlay style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: siteSettings.banner_video_subtle === 'true' ? 0.6 : 1, filter: siteSettings.banner_video_subtle === 'true' ? 'blur(1px)' : 'none' }} />
                      <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.6)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.6rem' }}>VISTA PREVIA</div>
                    </div>
                  )}

                  <button 
                    className="btn btn-primary" 
                    style={{ width: '100%', marginTop: '24px', padding: '12px', fontSize: '0.9rem', justifyContent: 'center' }} 
                    onClick={updateAllSettings} 
                    disabled={loading}
                  >
                    {loading ? 'ACTUALIZANDO...' : 'ACTUALIZAR BANNER Y VIDEO'}
                  </button>
                </div>

                {/* Contact Section */}
                <div className="glass" style={{ padding: '32px', borderRadius: '24px' }}>
                  <h3 style={{ color: 'var(--secondary)', marginBottom: '24px' }}>CONTACTO Y UBICACIÓN</h3>
                  <div className="filter-group" style={{ marginBottom: '16px' }}>
                    <label>TELÉFONO</label>
                    <input type="text" value={siteSettings.contact_phone} onChange={e => setSiteSettings({...siteSettings, contact_phone: e.target.value})} />
                  </div>
                  <div className="filter-group" style={{ marginBottom: '16px' }}>
                    <label>EMAIL</label>
                    <input type="email" value={siteSettings.contact_email} onChange={e => setSiteSettings({...siteSettings, contact_email: e.target.value})} />
                  </div>
                  <div className="filter-group" style={{ marginBottom: '16px' }}>
                    <label>DIRECCIÓN FÍSICA</label>
                    <input type="text" value={siteSettings.business_address} onChange={e => setSiteSettings({...siteSettings, business_address: e.target.value})} />
                  </div>
                  <div className="filter-group">
                    <label>DESCRIPCIÓN DE LA EMPRESA (FOOTER)</label>
                    <textarea 
                      value={siteSettings.site_description} 
                      onChange={e => setSiteSettings({...siteSettings, site_description: e.target.value})}
                      style={{ background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', padding: '12px', borderRadius: '10px', height: '80px', width: '100%', resize: 'none' }}
                    />
                  </div>
                </div>
              </div>

              {/* Legal Section */}
              <div className="glass" style={{ padding: '32px', borderRadius: '24px', marginBottom: '32px' }}>
                <h3 style={{ color: 'var(--tertiary)', marginBottom: '24px' }}>TEXTOS LEGALES</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                  <div className="filter-group">
                    <label>POLÍTICA DE PRIVACIDAD</label>
                    <textarea 
                      value={siteSettings.privacy_policy} 
                      onChange={e => setSiteSettings({...siteSettings, privacy_policy: e.target.value})}
                      style={{ background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', padding: '12px', borderRadius: '10px', height: '150px', width: '100%', resize: 'none' }}
                    />
                  </div>
                  <div className="filter-group">
                    <label>TÉRMINOS Y CONDICIONES</label>
                    <textarea 
                      value={siteSettings.terms_conditions} 
                      onChange={e => setSiteSettings({...siteSettings, terms_conditions: e.target.value})}
                       style={{ background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', padding: '12px', borderRadius: '10px', height: '150px', width: '100%', resize: 'none' }}
                    />
                  </div>
                </div>
              </div>

              <button className="btn btn-primary" style={{ width: '100%', padding: '20px', fontSize: '1.2rem', justifyContent: 'center' }} onClick={updateAllSettings} disabled={loading}>
                {loading ? 'GUARDANDO TODO...' : 'GUARDAR CONFIGURACIÓN COMPLETA'}
              </button>
            </motion.div>
          )}

          {activeTab === 'new' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h2 style={{ fontSize: '2.5rem', marginBottom: '32px' }}>CREACIÓN <span className="highlight">DIRECTA</span></h2>
              <div className="glass" style={{ padding: '32px', borderRadius: '20px' }}>
                <p style={{ marginBottom: '32px', opacity: 0.7 }}>Añade un vehículo directamente al catálogo con imágenes y video tour.</p>
                
                {/* Form Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
                  <div className="filter-group">
                    <label>MARCA</label>
                    <select 
                      value={newVehicle.make} 
                      onChange={e => setNewVehicle({...newVehicle, make: e.target.value})} 
                      className="brand-highlight-select"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '12px', borderRadius: '10px', width: '100%' }}
                    >
                      <option value="" style={{ color: '#000' }}>Seleccionar Marca</option>
                      {brands.map(b => <option key={b.id} value={b.name} style={{ color: '#000' }}>{b.name}</option>)}
                    </select>
                  </div>
                  <div className="filter-group">
                    <label>MODELO</label>
                    <input type="text" value={newVehicle.model} onChange={e => setNewVehicle({...newVehicle, model: e.target.value})} placeholder="Ej. R8 V10" />
                  </div>
                  <div className="filter-group">
                    <label>AÑO</label>
                    <input type="number" value={newVehicle.year} onChange={e => setNewVehicle({...newVehicle, year: e.target.value})} placeholder="2024" />
                  </div>
                  <div className="filter-group">
                    <label>PRECIO ($)</label>
                    <input type="number" value={newVehicle.price} onChange={e => setNewVehicle({...newVehicle, price: e.target.value})} placeholder="200000" />
                  </div>
                  <div className="filter-group" style={{ position: 'relative' }}>
                    <label>DESCRIPCIÓN (VOZ DISPONIBLE)</label>
                    <div style={{ position: 'relative' }}>
                      <input type="text" value={newVehicle.description} onChange={e => setNewVehicle({...newVehicle, description: e.target.value})} placeholder="Detalles..." style={{ paddingRight: '50px' }} />
                      <button 
                        onClick={startVoiceCapture} 
                        style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: isRecording ? 'red' : 'var(--primary)' }}
                      >
                        {isRecording ? <MicOff size={20} className="glow-red" /> : <Mic size={20} />}
                      </button>
                    </div>
                  </div>
                  <div className="filter-group">
                    <label>KILOMETRAJE</label>
                    <input type="number" value={newVehicle.mileage} onChange={e => setNewVehicle({...newVehicle, mileage: e.target.value})} placeholder="0" />
                  </div>
                  <div className="filter-group">
                    <label>COMBUSTIBLE</label>
                    <select 
                      value={newVehicle.fuel_type} 
                      onChange={e => setNewVehicle({...newVehicle, fuel_type: e.target.value})}
                      className="brand-highlight-select"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '12px', borderRadius: '10px', width: '100%' }}
                    >
                      <option value="Gasolina" style={{ color: '#000' }}>Gasolina</option>
                      <option value="Diesel" style={{ color: '#000' }}>Diesel</option>
                      <option value="Electricos" style={{ color: '#000' }}>Eléctrico</option>
                      <option value="Hibridos" style={{ color: '#000' }}>Híbrido</option>
                    </select>
                  </div>
                </div>

                {/* Media Section */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '40px' }}>
                  {/* Images Upload - Mobile Friendly */}
                  <div className="glass" style={{ padding: '24px', borderRadius: '16px', border: '1px dashed var(--primary)' }}>
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', color: 'var(--primary)' }}>
                      <Camera size={20} /> FOTOS / CÁMARA
                    </h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
                      {previews.images.map((src, i) => (
                        <div key={i} style={{ width: '60px', height: '60px', borderRadius: '8px', overflow: 'hidden', position: 'relative' }}>
                          <img src={src} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <button onClick={() => setPreviews({...previews, images: previews.images.filter((_, idx) => idx !== i)})} style={{ position: 'absolute', top: 0, right: 0, background: 'red', border: 'none', color: 'white', cursor: 'pointer', padding: '2px', fontSize: '10px' }}>×</button>
                        </div>
                      ))}
                      <label className="btn glass glow-blue" style={{ width: '60px', height: '60px', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', border: '1px dashed var(--primary)' }}>
                        <PlusCircle size={24} />
                        <input type="file" multiple accept="image/*" style={{ display: 'none' }} onChange={e => handleFileChange(e, 'images')} />
                      </label>
                    </div>
                  </div>

                  {/* Video Upload - Real Player */}
                  <div className="glass" style={{ padding: '24px', borderRadius: '16px', border: '1px dashed var(--secondary)' }}>
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', color: 'var(--secondary)' }}>
                      <Video size={20} /> VIDEO TOUR REAL
                    </h4>
                    {previews.video ? (
                      <div style={{ width: '100%', borderRadius: '16px', overflow: 'hidden', background: '#000' }}>
                        <video 
                          src={previews.video} 
                          controls 
                          style={{ width: '100%', height: '180px', objectFit: 'cover' }} 
                        />
                        <button className="btn-text" onClick={() => { setPreviews({...previews, video: null}); setUploadFiles({...uploadFiles, video: null}); }} style={{ color: 'red', marginTop: '10px', display: 'block', textAlign: 'center', width: '100%' }}>Eliminar Video</button>
                      </div>
                    ) : (
                      <label className="btn glass glow-green" style={{ width: '100%', padding: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                        <FileText size={20} /> GRABAR O CARGAR VÍDEO
                        <input type="file" accept="video/*" onChange={e => handleFileChange(e, 'video')} style={{ display: 'none' }} />
                      </label>
                    )}
                  </div>
                </div>

                <button 
                  className="btn btn-secondary glow-green" 
                  style={{ width: '100%', justifyContent: 'center', padding: '20px', fontSize: '1.2rem' }}
                  onClick={handleCreateInstant}
                  disabled={loading}
                >
                  {loading ? 'PUBLICANDO...' : 'PUBLICAR EN CATÁLOGO'}
                </button>
              </div>
            </motion.div>
          )}

          {activeTab === 'brands' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h2 style={{ fontSize: '2.5rem', marginBottom: '32px' }}>GESTIÓN DE <span className="highlight">MARCAS</span></h2>
              <div className="glass" style={{ padding: '32px', borderRadius: '20px', marginBottom: '32px' }}>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <div className="filter-group" style={{ flex: 1 }}>
                    <label>NOMBRE DE LA NUEVA MARCA</label>
                    <input type="text" value={newBrandName} onChange={e => setNewBrandName(e.target.value)} placeholder="Ej. Porsche, Tesla..." />
                  </div>
                  <button className="btn btn-primary glow-blue" style={{ marginTop: 'auto', marginBottom: '2px' }} onClick={addBrand}>AÑADIR MARCA</button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                {brands.map(brand => (
                  <div key={brand.id} className="glass" style={{ padding: '16px 20px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: '700' }}>{brand.name}</span>
                    <button onClick={() => deleteBrand(brand.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,0,0,0.5)' }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>
      
      {/* Admin Specific Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        .admin-nav-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 12px 16px;
          background: none;
          border: none;
          color: var(--text-secondary);
          font-weight: 700;
          cursor: pointer;
          border-radius: 12px;
          transition: var(--transition-fast);
          text-align: left;
        }
        .admin-nav-btn:hover {
          background: rgba(255,255,255,0.05);
          color: white;
        }
        .admin-nav-btn.active {
          background: var(--primary);
          color: black;
          box-shadow: 0 0 15px var(--primary-glow);
        }
      `}} />
    </div>
  )
}

export default Admin
