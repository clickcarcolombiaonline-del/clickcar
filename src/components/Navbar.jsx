import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Car } from 'lucide-react'
import { supabase } from '../lib/supabase'

const Navbar = () => {
  const [siteName, setSiteName] = React.useState('ClickCar')
  const location = useLocation()

  React.useEffect(() => {
    const fetchName = async () => {
      const { data } = await supabase.from('settings').select('*').eq('key', 'site_name').single()
      if (data && data.value) setSiteName(data.value)
    }
    fetchName()
  }, [location.pathname])

  return (
    <nav className="glass sticky-nav">
      <div className="container nav-content">
        <Link to="/" className="logo-container">
          <Car className="logo-icon glow-blue" size={32} />
          <span className="logo-text">
            {siteName?.includes?.('Click') ? (
              <>Click<span className="highlight">Car</span></>
            ) : siteName}
          </span>
        </Link>
        
        <div className="nav-links">
          <Link to="/compra" className="nav-link">COMPRA</Link>
          <Link to="/venta" className="nav-link">VENTA</Link>
          <Link to="/admin" className="nav-link admin-btn glass">ADMIN</Link>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
