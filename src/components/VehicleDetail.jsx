import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Calendar, Gauge, Fuel, ChevronLeft, ChevronRight, PlayCircle } from 'lucide-react'

const VehicleDetail = ({ vehicle, onClose }) => {
  const [currentImage, setCurrentImage] = useState(0)
  const [showVideo, setShowVideo] = useState(false)

  if (!vehicle) return null

  const nextImage = () => setCurrentImage((currentImage + 1) % vehicle.photos_urls.length)
  const prevImage = () => setCurrentImage((currentImage - 1 + vehicle.photos_urls.length) % vehicle.photos_urls.length)

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="modal-overlay"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 50 }}
        className="modal-content glass"
        onClick={e => e.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose}><X size={24} /></button>

        <div className="modal-layout">
          {/* Left: Gallery */}
          <div className="modal-gallery">
            <div className="main-media">
              {showVideo && vehicle.video_url ? (
                <div style={{ width: '100%', height: '100%', background: '#000', borderRadius: '24px', overflow: 'hidden' }}>
                  <video 
                    src={vehicle.video_url} 
                    controls 
                    autoPlay 
                    muted 
                    playsInline
                    className="gallery-main-video" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover', background: '#000' }} 
                  />
                  <button 
                    className="btn btn-primary" 
                    style={{ position: 'absolute', bottom: '24px', left: '24px', zIndex: 10, boxShadow: '0 0 20px rgba(0,0,0,0.5)' }} 
                    onClick={() => setShowVideo(false)}
                  >
                    REGRESAR A FOTOS
                  </button>
                </div>
              ) : (
                <>
                  <img src={vehicle.photos_urls[currentImage]} alt={vehicle.model} className="gallery-main-img" />
                  <div className="gallery-nav">
                    <button onClick={prevImage} className="nav-arrow"><ChevronLeft /></button>
                    <button onClick={nextImage} className="nav-arrow"><ChevronRight /></button>
                  </div>
                  <button className="video-trigger" onClick={() => setShowVideo(true)}>
                    <PlayCircle size={20} /> VER VIDEO TOUR
                  </button>
                </>
              )}
            </div>
            <div className="thumb-grid">
              {vehicle.photos_urls.map((url, idx) => (
                <img 
                  key={idx} 
                  src={url} 
                  onClick={() => { setCurrentImage(idx); setShowVideo(false); }}
                  className={`thumb-img ${currentImage === idx && !showVideo ? 'active' : ''}`}
                />
              ))}
            </div>
          </div>

          {/* Right: Details */}
          <div className="modal-info">
            <h2 className="modal-title">{vehicle.make} <span className="highlight">{vehicle.model}</span></h2>
            <div className="modal-price">${vehicle.price.toLocaleString()}</div>
            
            <div className="specs-grid">
              <div className="spec-card">
                <Calendar size={18} color="var(--primary)" />
                <div className="spec-label">AÑO</div>
                <div className="spec-value">{vehicle.year}</div>
              </div>
              <div className="spec-card">
                <Gauge size={18} color="var(--primary)" />
                <div className="spec-label">KILOMETRAJE</div>
                <div className="spec-value">{vehicle.mileage.toLocaleString()} km</div>
              </div>
              <div className="spec-card">
                <Fuel size={18} color="var(--primary)" />
                <div className="spec-label">MOTOR</div>
                <div className="spec-value">{vehicle.fuel_type}</div>
              </div>
            </div>

            <div className="modal-description">
              <h3>Descripción del Vehículo</h3>
              <p>
                Este {vehicle.make} {vehicle.model} {vehicle.year} se encuentra en perfectas condiciones. 
                Cuenta con mantenimiento al día, único dueño y está listo para traspaso inmediato. 
                Viene equipado con las últimas tecnologías de seguridad y confort para una experiencia de manejo inigualable.
              </p>
            </div>

            <div className="modal-actions">
              <button className="btn btn-primary glow-blue" style={{ flex: 1, padding: '18px', fontSize: '1.1rem' }}>
                RESERVAR AHORA
              </button>
              <button className="btn btn-secondary glow-green" style={{ flex: 1, padding: '18px', fontSize: '1.1rem' }}>
                AGENDAR CITA
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default VehicleDetail
