import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { CheckCircle2, User, Car, Image, Video, Send, Camera, PlusCircle, Trash2, X } from 'lucide-react'

const Venta = () => {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState(null)
  const [brands, setBrands] = useState([])

  const [uploadFiles, setUploadFiles] = useState({ images: [], video: null })
  const [previews, setPreviews] = useState({ images: [], video: null })

  React.useEffect(() => {
    fetchBrands()
  }, [])

  const fetchBrands = async () => {
    try {
      const { data, error } = await supabase.from('brands').select('name').order('name', { ascending: true })
      if (error) throw error
      setBrands(data || [])
    } catch (err) {
      console.error('Error fetching brands:', err)
    }
  }

  const uploadToSupabase = async (file, bucket = 'vehicles') => {
    try {
      const fileExt = file.name?.split('.')?.pop() || 'tmp'
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type || 'video/mp4' // Asegura compatibilidad
        })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath)

      return publicUrl
    } catch (err) {
      console.error('Core upload error:', err)
      return null
    }
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
      if (file) {
        setUploadFiles(prev => ({ ...prev, video: file }))
        setPreviews(prev => ({ ...prev, video: URL.createObjectURL(file) }))
      }
    }
  }

  const removeImage = (index) => {
    setUploadFiles(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }))
    setPreviews(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }))
  }

  const removeVideo = () => {
    setUploadFiles(prev => ({ ...prev, video: null }))
    setPreviews(prev => ({ ...prev, video: null }))
  }
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    year: '',
    make: '',
    model: '',
    mileage: '',
    condition: 'Nuevo',
    price: '',
    fuelType: 'Gasolina',
    photos: [],
    video: null
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const nextStep = () => setStep(step + 1)
  const prevStep = () => setStep(step - 1)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    try {
      // 1. Obtener o Crear Perfil (Seguro para evitar conflictos de ID)
      let profile;
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', formData.email)
        .single();

      if (existingProfile) {
        profile = existingProfile;
        // Opcionalmente actualizar teléfono/nombre si cambiaron
        await supabase
          .from('profiles')
          .update({ 
            full_name: formData.name || formData.sellerName, 
            phone: formData.phone 
          })
          .eq('id', profile.id);
      } else {
        const { data: newProfile, error: profileErr } = await supabase
          .from('profiles')
          .insert([{
            id: crypto.randomUUID(),
            full_name: formData.name || formData.sellerName,
            email: formData.email,
            phone: formData.phone
          }])
          .select()
          .single();
        
        if (profileErr) throw profileErr;
        profile = newProfile;
      }

      // 1.5 Upload Files
      const photoUrls = []
      for (const file of uploadFiles.images) {
        const url = await uploadToSupabase(file)
        photoUrls.push(url)
      }

      let videoUrl = ''
      if (uploadFiles.video) {
        videoUrl = await uploadToSupabase(uploadFiles.video)
      }

      // 2. Insert Vehicle listing
      const { error: vehicleError } = await supabase
        .from('vehicles')
        .insert({
          user_id: profile.id,
          make: formData.make,
          model: formData.model,
          year: parseInt(formData.year) || new Date().getFullYear(),
          mileage: parseInt(formData.mileage) || 0,
          price: parseFloat(formData.price) || 0,
          fuel_type: formData.fuelType || 'Gasolina',
          transmission: 'Automática', // Default as it's not in Step 2 yet
          condition: formData.condition || 'Usado',
          description: 'Vendido por particular a través de formulario web.',
          photos_urls: photoUrls.length > 0 ? photoUrls : ['https://images.unsplash.com/photo-1544636331-e26879cd4d9b?auto=format&fit=crop&q=80&w=800'],
          video_url: videoUrl,
          approved_status: false
        })

      if (vehicleError) throw vehicleError
      
      setSuccess(true)
    } catch (err) {
      console.error('Submission error details:', err)
      setError(`Error: ${err.message || 'Hubo un error al procesar tu solicitud. Por favor intenta de nuevo.'}`)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', textAlign: 'center' }}>
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 10 }}
        >
          <CheckCircle2 color="var(--secondary)" size={120} className="glow-green" />
        </motion.div>
        <h1 style={{ marginTop: '40px', fontSize: '3rem' }}>¡ENVIADO PARA APROBACIÓN!</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', maxWidth: '600px', marginBottom: '40px' }}>
          Tu vehículo ha sido enviado para revisión. Una vez aprobado por nuestro equipo, aparecerá en el catálogo de ClickCar.
        </p>
        <button className="btn btn-primary glow-blue" onClick={() => window.location.href = '/'}>
          VOLVER AL INICIO
        </button>
      </div>
    )
  }

  return (
    <div className="page-enter container" style={{ padding: '80px 0' }}>
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        <header style={{ marginBottom: '40px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '3rem', textTransform: 'uppercase' }}>Vende tu <span className="highlight">Vehículo</span></h1>
          <p style={{ color: 'var(--text-secondary)' }}>Completa el formulario en menos de 2 minutos.</p>
        </header>

        <div className="glass" style={{ padding: '40px', borderRadius: '32px' }}>
          {/* Progress Bar */}
          <div style={{ display: 'flex', marginBottom: '40px', background: 'rgba(255,255,255,0.05)', borderRadius: '20px', overflow: 'hidden' }}>
            <div style={{ width: `${(step / 3) * 100}%`, height: '6px', background: 'var(--primary)', transition: 'width 0.4s ease' }} />
          </div>

          {error && <div style={{ color: '#ff4d4d', background: 'rgba(255,77,77,0.1)', padding: '12px', borderRadius: '12px', marginBottom: '24px', fontSize: '0.85rem', textAlign: 'center' }}>{error}</div>}

          <form onSubmit={handleSubmit}>
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div 
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="form-step"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                    <User color="var(--primary)" />
                    <h2 style={{ fontSize: '1.5rem' }}>Información Personal</h2>
                  </div>
                  
                  <div className="filter-group" style={{ marginBottom: '20px' }}>
                    <label>NOMBRE COMPLETO *</label>
                    <input type="text" name="name" required value={formData.name} onChange={handleChange} placeholder="Ej. Juan Pérez" />
                  </div>
                  
                  <div className="filter-group" style={{ marginBottom: '20px' }}>
                    <label>TELÉFONO DE CONTACTO *</label>
                    <input type="tel" name="phone" required value={formData.phone} onChange={handleChange} placeholder="+57 321 456 7890" />
                  </div>
                  
                  <div className="filter-group" style={{ marginBottom: '40px' }}>
                    <label>CORREO ELECTRÓNICO *</label>
                    <input type="email" name="email" required value={formData.email} onChange={handleChange} placeholder="juan@email.com" />
                  </div>
                  
                  <button type="button" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={nextStep}>
                    CONTINUAR
                  </button>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div 
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="form-step"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                    <Car color="var(--primary)" />
                    <h2 style={{ fontSize: '1.5rem' }}>Detalles del Vehículo</h2>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                    <div className="filter-group">
                      <label>MARCA *</label>
                      <select name="make" required value={formData.make} onChange={handleChange} className="brand-highlight-select">
                        <option value="">Seleccionar marca</option>
                        {brands.map((brand, idx) => (
                          <option key={idx} value={brand.name} style={{ color: '#000' }}>{brand.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="filter-group">
                      <label>MODELO *</label>
                      <input type="text" name="model" required value={formData.model} onChange={handleChange} placeholder="Ej. M4" />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                    <div className="filter-group">
                      <label>AÑO *</label>
                      <input type="number" name="year" required value={formData.year} onChange={handleChange} placeholder="2024" />
                    </div>
                    <div className="filter-group">
                      <label>KILOMETRAJE *</label>
                      <input type="number" name="mileage" required value={formData.mileage} onChange={handleChange} placeholder="2000" />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '40px' }}>
                    <div className="filter-group">
                      <label>COMBUSTIBLE *</label>
                      <select name="fuelType" value={formData.fuelType} onChange={handleChange} className="brand-highlight-select">
                        <option value="Gasolina" style={{ color: '#000' }}>Gasolina</option>
                        <option value="Diesel" style={{ color: '#000' }}>Diesel</option>
                        <option value="Electricos" style={{ color: '#000' }}>Eléctrico</option>
                        <option value="Hibridos" style={{ color: '#000' }}>Híbrido</option>
                      </select>
                    </div>
                    <div className="filter-group">
                      <label>PRECIO DE VENTA ($) *</label>
                      <input type="number" name="price" required value={formData.price} onChange={handleChange} placeholder="85000" />
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '20px' }}>
                    <button type="button" className="btn glass" style={{ flex: 1, justifyContent: 'center' }} onClick={prevStep}>
                      VOLVER
                    </button>
                    <button type="button" className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={nextStep}>
                      CONTINUAR
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div 
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="form-step"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                    <Image color="var(--primary)" />
                    <h2 style={{ fontSize: '1.5rem' }}>Multimedia</h2>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '40px' }}>
                    {/* Photos Section */}
                    <div className="glass" style={{ padding: '32px', borderRadius: '24px', border: '1px dashed var(--primary)' }}>
                      <h3 style={{ color: 'var(--primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Camera size={20} /> FOTOS / CÁMARA
                      </h3>
                      
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '24px' }}>
                        {previews.images.map((src, i) => (
                          <div key={i} style={{ width: '80px', height: '80px', borderRadius: '12px', overflow: 'hidden', position: 'relative' }} className="glow-blue">
                            <img src={src} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <button 
                              onClick={() => removeImage(i)}
                              style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', color: 'white', cursor: 'pointer', padding: '4px' }}
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                        {previews.images.length < 10 && (
                          <label style={{ width: '80px', height: '80px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'center', alignItems: 'center', border: '1px dashed rgba(255,255,255,0.2)', cursor: 'pointer' }}>
                            <PlusCircle size={24} style={{ opacity: 0.3 }} />
                            <input type="file" accept="image/*" multiple onChange={(e) => handleFileChange(e, 'images')} style={{ display: 'none' }} />
                          </label>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '12px' }}>
                        <label className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', fontSize: '0.8rem', padding: '12px' }}>
                          <Camera size={14} /> CÁMARA
                          <input type="file" accept="image/*" capture="environment" onChange={(e) => handleFileChange(e, 'images')} style={{ display: 'none' }} />
                        </label>
                        <label className="btn glass" style={{ flex: 1, justifyContent: 'center', fontSize: '0.8rem', padding: '12px' }}>
                          <PlusCircle size={14} /> GALERÍA
                          <input type="file" accept="image/*" multiple onChange={(e) => handleFileChange(e, 'images')} style={{ display: 'none' }} />
                        </label>
                      </div>
                    </div>

                    {/* Video Section */}
                    <div className="glass" style={{ padding: '32px', borderRadius: '24px', border: '1px dashed var(--secondary)' }}>
                      <h3 style={{ color: 'var(--secondary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Video size={20} /> VIDEO TOUR / CÁMARA
                      </h3>

                      {previews.video ? (
                        <div style={{ width: '100%', height: '150px', borderRadius: '16px', overflow: 'hidden', position: 'relative', marginBottom: '24px' }}>
                          <video src={previews.video} controls style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <button 
                            onClick={removeVideo}
                            style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', color: 'white', cursor: 'pointer', padding: '8px', zIndex: 10 }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ) : (
                        <div style={{ width: '100%', height: '150px', borderRadius: '16px', background: 'rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'center', alignItems: 'center', border: '1px dashed rgba(255,255,255,0.2)', marginBottom: '24px' }}>
                           <Video size={32} style={{ opacity: 0.2 }} />
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '12px' }}>
                        <label className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center', fontSize: '0.8rem', padding: '12px' }}>
                          <Video size={14} /> GRABAR
                          <input type="file" accept="video/*" capture="environment" onChange={(e) => handleFileChange(e, 'video')} style={{ display: 'none' }} />
                        </label>
                        <label className="btn glass" style={{ flex: 1, justifyContent: 'center', fontSize: '0.8rem', padding: '12px' }}>
                          <PlusCircle size={14} /> SUBIR
                          <input type="file" accept="video/*" onChange={(e) => handleFileChange(e, 'video')} style={{ display: 'none' }} />
                        </label>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '20px' }}>
                    <button type="button" className="btn glass" style={{ flex: 1, justifyContent: 'center' }} onClick={prevStep}>
                      VOLVER
                    </button>
                    <button type="submit" className="btn btn-secondary glow-green" style={{ flex: 1, justifyContent: 'center' }} disabled={loading}>
                      {loading ? 'ENVIANDO...' : 'ENVIAR PARA APROBACIÓN'}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Venta
