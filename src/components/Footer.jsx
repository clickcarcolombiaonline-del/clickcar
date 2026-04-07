import React from 'react'
import { useLocation } from 'react-router-dom'
import { Car, Phone, Mail, MapPin, Globe, MessageSquare } from 'lucide-react'
import { supabase } from '../lib/supabase'

const Footer = () => {
  const location = useLocation()
  const [settings, setSettings] = React.useState({
    site_name: 'ClickCar',
    contact_phone: '+57 321 456 7890',
    contact_email: 'contacto@clickcar.com',
    business_address: 'Edificio Moderno, Piso 12. Medellín, Colombia.',
    site_description: 'La plataforma líder en compra y venta de vehículos premium. Conectamos sueños con realidades a través de tecnología y confianza.',
    privacy_policy: '',
    terms_conditions: ''
  })

  React.useEffect(() => {
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
  }, [location.pathname])

  return (
    <footer className="footer-glass">
      <div className="container" style={{ padding: '80px 20px 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '60px' }}>
          {/* Company Info */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <Car className="logo-icon glow-blue" size={32} />
              <span className="logo-text" style={{ fontSize: '1.8rem' }}>
                {settings.site_name?.includes?.('Click') ? (
                  <>Click<span className="highlight">Car</span></>
                ) : settings.site_name}
              </span>
            </div>
            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.8', marginBottom: '32px' }}>
              {settings.site_description}
            </p>
            <div style={{ display: 'flex', gap: '16px' }}>
              <a href="#" className="social-icon"><Globe size={20} /></a>
              <a href="#" className="social-icon"><MessageSquare size={20} /></a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '32px', letterSpacing: '0.1em' }}>NAVEGACIÓN</h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <li><a href="/" className="footer-link">INICIO</a></li>
              <li><a href="/compra" className="footer-link">COMPRAR VEHÍCULO</a></li>
              <li><a href="/venta" className="footer-link">VENDER VEHÍCULO</a></li>
              <li><a href="/admin" className="footer-link">ADMINISTRACIÓN</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '32px', letterSpacing: '0.1em' }}>CONTACTO</h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <li style={{ display: 'flex', gap: '12px', alignItems: 'center', color: 'var(--text-secondary)' }}>
                <Phone size={18} color="var(--primary)" />
                <span>{settings.contact_phone}</span>
              </li>
              <li style={{ display: 'flex', gap: '12px', alignItems: 'center', color: 'var(--text-secondary)' }}>
                <Mail size={18} color="var(--primary)" />
                <span>{settings.contact_email}</span>
              </li>
              <li style={{ display: 'flex', gap: '12px', alignItems: 'center', color: 'var(--text-secondary)' }}>
                <MapPin size={18} color="var(--primary)" />
                <span>{settings.business_address}</span>
              </li>
            </ul>
          </div>
        </div>

        <div style={{ marginTop: '80px', paddingTop: '40px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            © {new Date().getFullYear()} ClickCar Corp. Todos los derechos reservados.
          </p>
          <div style={{ display: 'flex', gap: '32px', fontSize: '0.8rem' }}>
            <a href="#" className="footer-link" onClick={() => settings.privacy_policy && alert(settings.privacy_policy)}>Privacidad</a>
            <a href="#" className="footer-link" onClick={() => settings.terms_conditions && alert(settings.terms_conditions)}>Términos</a>
            <a href="#" className="footer-link">Cookies</a>
          </div>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{ __html: `
        .footer-glass {
          background: #0d0d0d;
          border-top: 1px solid rgba(255,255,255,0.05);
          position: relative;
          z-index: 10;
        }
        .footer-link {
          text-decoration: none;
          color: var(--text-secondary);
          font-weight: 600;
          font-size: 0.9rem;
          transition: var(--transition-fast);
        }
        .footer-link:hover {
          color: var(--primary);
          padding-left: 5px;
        }
        .social-icon {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: rgba(255,255,255,0.05);
          display: flex;
          justify-content: center;
          align-items: center;
          color: white;
          transition: var(--transition-fast);
        }
        .social-icon:hover {
          background: var(--primary);
          color: black;
          transform: translateY(-5px);
          box-shadow: 0 0 15px var(--primary-glow);
        }
      `}} />
    </footer>
  )
}

export default Footer
