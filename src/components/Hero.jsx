import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { Volume2, VolumeX } from 'lucide-react'

import { useMotionValue, useTransform } from 'framer-motion'

const CarShape = ({ className, label, color, delay = 0 }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      transition={{ duration: 1.2, delay, ease: "easeOut" }}
      className={`car-container ${className}`}
    >
      <svg viewBox="0 0 600 300" className="car-svg" style={{ overflow: 'visible' }}>
        <defs>
          <filter id="neon-glow">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Accented HUD HUD Circles */}
        <motion.circle 
          cx="300" cy="150" r="140" 
          fill="none" stroke={color} strokeWidth="0.5" strokeDasharray="4 20" opacity="0.3"
          animate={{ rotate: 360 }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        />
        <motion.circle 
          cx="300" cy="150" r="110" 
          fill="none" stroke={color} strokeWidth="2" strokeDasharray="60 120" opacity="0.5"
          animate={{ rotate: -360 }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        />
        <motion.circle 
          cx="300" cy="150" r="115" 
          fill="none" stroke="#fff" strokeWidth="0.5" opacity="0.1"
        />

        {/* Single-Stroke Elegant Car Isotype (Un intento final muy refinado) */}
        <motion.path
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 3, ease: "easeInOut", delay: delay + 0.5 }}
          d="M150,180 C180,180 200,160 250,155 C300,150 400,120 450,140 C500,160 520,180 550,180"
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          filter="url(#neon-glow)"
        />

        {/* Floating Label */}
        <text 
          x="300" y="160" 
          textAnchor="middle" 
          className="car-label-svg" 
          style={{ 
            fontSize: '42px', 
            fontWeight: '900', 
            letterSpacing: '0.4em', 
            fill: '#fff', 
            filter: `drop-shadow(0 0 15px ${color})`,
            textTransform: 'uppercase'
          }}
        >
          {label}
        </text>

        {/* Interactive Rings */}
        <motion.path
          d="M200,150 A100,100 0 0,1 400,150"
          fill="none" stroke={color} strokeWidth="1" strokeDasharray="10 10"
          animate={{ rotate: 360 }}
          style={{ originX: '300px', originY: '150px' }}
          transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
        />
      </svg>
    </motion.div>
  )
}

const Hero = () => {
  const location = useLocation()
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  const videoRef = React.useRef(null)
  const [isMuted, setIsMuted] = React.useState(true)

  const textX = useTransform(mouseX, [-500, 500], [-15, 15])
  const textY = useTransform(mouseY, [-500, 500], [-15, 15])

  const [settings, setSettings] = React.useState({
    hero_bg_url: '',
    hero_video_url: '',
    site_name: 'ClickCar',
    hero_subtitle: 'EXPERIENCIA AUTOMOTRIZ PREMIUM',
    banner_video_subtle: 'true'
  })

  React.useEffect(() => {
    const handleMouseMove = (e) => {
      mouseX.set(e.clientX - window.innerWidth / 2)
      mouseY.set(e.clientY - window.innerHeight / 2)
    }
    window.addEventListener('mousemove', handleMouseMove)
    
    const fetchSettings = async () => {
      const { data } = await supabase.from('settings').select('*')
      if (data) {
        const newSettings = { ...settings }
        data.forEach(s => {
          if (newSettings.hasOwnProperty(s.key)) {
            newSettings[s.key] = s.value
          }
        })
        setSettings(newSettings)
      }
    }
    fetchSettings()
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [location.pathname])

  const isSubtle = settings.banner_video_subtle === 'true'

  return (
    <section 
      className="hero-section" 
      style={{ 
        backgroundImage: (settings.hero_bg_url && !settings.hero_video_url) ? `url("${settings.hero_bg_url}")` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      {settings.hero_video_url && (
        <video 
          ref={videoRef}
          autoPlay 
          muted={isMuted}
          loop 
          playsInline 
          className={`hero-video-bg ${isSubtle ? 'subtle' : 'crisp'}`}
        >
          <source src={settings.hero_video_url} type="video/mp4" />
        </video>
      )}

      {/* Audio Controller HUD */}
      {settings.hero_video_url && (
        <motion.button
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsMuted(!isMuted)}
          className="audio-control-hud"
        >
          {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} className="glow-text" />}
          <span className="hud-status">{isMuted ? 'AUDIO_OFF' : 'AUDIO_ON'}</span>
          <div className="hud-pulse"></div>
        </motion.button>
      )}

      <div className={`hero-overlay ${isSubtle ? 'active' : 'hidden'}`}></div>
      
      <motion.div 
        style={{ x: textX, y: textY }}
        className="hero-content"
      >
        <motion.h1 
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: "circOut" }}
          className="hero-title text-gradient"
        >
          {settings.site_name?.includes?.('Click') ? (
            <>
              Click<span className="highlight">Car</span>
            </>
          ) : settings.site_name}
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 1 }}
          className="hero-subtitle floating"
          style={{ color: '#fff', textShadow: '0 0 30px rgba(0, 114, 255, 0.6)' }}
        >
          {settings.hero_subtitle}
        </motion.p>
        
        <div className="car-buttons-container">
          <Link to="/compra" className="car-nav-btn buy-car">
            <CarShape label="COMPRAR" color="#00f2ff" delay={0.2} />
            <div className="cta-button-glow neon-blue"></div>
          </Link>
          
          <Link to="/venta" className="car-nav-btn sell-car">
            <CarShape label="VENDER" color="#ff00ff" delay={0.4} />
            <div className="cta-button-glow neon-magenta"></div>
          </Link>
        </div>
      </motion.div>
    </section>
  )
}

export default Hero
