import React, { useState, useEffect } from 'react'
import FilterBar from '../components/FilterBar'
import VehicleDetail from '../components/VehicleDetail'
import { supabase } from '../lib/supabase'
import { Calendar, Gauge, Fuel, CheckCircle } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'

// Mock data while Supabase is being set up
const MOCK_VEHICLES = [
  {
    id: '1',
    make: 'Toyota',
    model: 'Supra GR',
    year: 2024,
    mileage: 1200,
    price: 65000,
    fuel_type: 'Gasolina',
    photos_urls: [
      'https://images.unsplash.com/photo-1617469767053-d3b508a0d182?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1621410953243-248fca73bc9c?auto=format&fit=crop&q=80&w=800'
    ],
    approved_status: true
  },
  {
    id: '2',
    make: 'BMW',
    model: 'M4 Competition',
    year: 2023,
    mileage: 4500,
    price: 89000,
    fuel_type: 'Gasolina',
    photos_urls: [
      'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1603386329225-868f9b1ee6c9?auto=format&fit=crop&q=80&w=800'
    ],
    approved_status: true
  },
  {
    id: '3',
    make: 'Tesla',
    model: 'Model S Plaid',
    year: 2024,
    mileage: 500,
    price: 110000,
    fuel_type: 'Electricos',
    photos_urls: [
      'https://images.unsplash.com/photo-1617788131775-dc3470ff4582?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1571127236794-81c0bbfe1ce3?auto=format&fit=crop&q=80&w=800'
    ],
    approved_status: true
  }
]

import { useLocation } from 'react-router-dom'

const Compra = () => {
  const location = useLocation()
  const [vehicles, setVehicles] = useState(MOCK_VEHICLES)
  const [selectedVehicle, setSelectedVehicle] = useState(null)
  const [filters, setFilters] = useState({
    make: '',
    maxPrice: '',
    maxMileage: '',
    fuelType: ''
  })

  useEffect(() => {
    // Fetch from Supabase if active
    const fetchVehicles = async () => {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('approved_status', true)
      
      if (data && data.length > 0) {
        // Priority: Real data first, then mocks if ID doesn't collide
        setVehicles(prev => {
          const supabaseIds = new Set(data.map(v => v.id))
          const remainingMocks = MOCK_VEHICLES.filter(m => !supabaseIds.has(m.id))
          return [...data, ...remainingMocks]
        })
      }
    }
    
    fetchVehicles()
  }, [location.key])

  const filteredVehicles = vehicles.filter(v => {
    return (filters.make === '' || v.make === filters.make) &&
           (filters.maxPrice === '' || v.price <= parseInt(filters.maxPrice)) &&
           (filters.maxMileage === '' || v.mileage <= parseInt(filters.maxMileage)) &&
           (filters.fuelType === '' || v.fuel_type === filters.fuelType)
  })

  return (
    <div className="page-enter container">
      <header style={{ marginTop: '60px', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '3.5rem', color: 'var(--primary)' }}>CATALOGO</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>Encuentra el vehículo de tus sueños con la garantía ClickCar.</p>
      </header>

      <FilterBar filters={filters} setFilters={setFilters} />

      <div className="catalog-grid">
        {filteredVehicles.map((vehicle) => (
          <div key={vehicle.id} className="vehicle-card glass" onClick={() => setSelectedVehicle(vehicle)} style={{ cursor: 'pointer' }}>
            <div className="vehicle-image-container">
              <span className="vehicle-badge">GARANTIZADO</span>
              <img 
                src={vehicle.photos_urls[0]} 
                alt={`${vehicle.make} ${vehicle.model}`} 
                className="vehicle-image"
              />
            </div>
            
            <div className="vehicle-info">
              <div className="vehicle-price">${vehicle.price.toLocaleString()}</div>
              <h3 className="vehicle-title">{vehicle.make} {vehicle.model}</h3>
              
              <div className="vehicle-stats">
                <div className="stat-item">
                  <Calendar size={16} />
                  <span>{vehicle.year}</span>
                </div>
                <div className="stat-item">
                  <Gauge size={16} />
                  <span>{vehicle.mileage.toLocaleString()} km</span>
                </div>
                <div className="stat-item">
                  <Fuel size={16} />
                  <span>{vehicle.fuel_type}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="btn btn-primary glow-blue" style={{ flex: 1, justifyContent: 'center' }}>
                  DETALLES
                </button>
                <button className="btn btn-secondary glow-green" style={{ flex: 1, justifyContent: 'center' }} onClick={(e) => e.stopPropagation()}>
                  CONTACTAR
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {selectedVehicle && (
          <VehicleDetail 
            vehicle={selectedVehicle} 
            onClose={() => setSelectedVehicle(null)} 
          />
        )}
      </AnimatePresence>

      {filteredVehicles.length === 0 && (
        <div style={{ textAlign: 'center', padding: '100px 0' }}>
          <h2 style={{ color: 'var(--text-secondary)' }}>No se encontraron vehículos con estos filtros.</h2>
        </div>
      )}
    </div>
  )
}

export default Compra
