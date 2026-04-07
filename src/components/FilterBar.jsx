import React from 'react'

const FilterBar = ({ filters, setFilters }) => {
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFilters(prev => ({ ...prev, [name]: value }))
  }

  return (
    <div className="glass filter-bar">
      <div className="container filter-container">
        <div className="filter-group">
          <label>MARCA</label>
          <select name="make" value={filters.make} onChange={handleInputChange} className="brand-highlight-select">
            <option value="" style={{ color: '#000' }}>TODAS</option>
            <option value="Toyota" style={{ color: '#000' }}>Toyota</option>
            <option value="BMW" style={{ color: '#000' }}>BMW</option>
            <option value="Chevrolet" style={{ color: '#000' }}>Chevrolet</option>
            <option value="Mercedes" style={{ color: '#000' }}>Mercedes</option>
            <option value="Audi" style={{ color: '#000' }}>Audi</option>
          </select>
        </div>
        
        <div className="filter-group">
          <label>PRECIO MAX ($)</label>
          <input 
            type="number" 
            name="maxPrice" 
            placeholder="0" 
            value={filters.maxPrice} 
            onChange={handleInputChange} 
          />
        </div>
        
        <div className="filter-group">
          <label>KILOMETRAJE MAX</label>
          <input 
            type="number" 
            name="maxMileage" 
            placeholder="0" 
            value={filters.maxMileage} 
            onChange={handleInputChange} 
          />
        </div>
        
        <div className="filter-group">
          <label>COMBUSTIBLE</label>
          <select name="fuelType" value={filters.fuelType} onChange={handleInputChange} className="brand-highlight-select">
            <option value="" style={{ color: '#000' }}>TODOS</option>
            <option value="Electricos" style={{ color: '#000' }}>Eléctricos</option>
            <option value="Gasolina" style={{ color: '#000' }}>Gasolina</option>
            <option value="Diesel" style={{ color: '#000' }}>Diesel</option>
            <option value="Hibridos" style={{ color: '#000' }}>Híbridos</option>
          </select>
        </div>
        
        <button 
          className="btn btn-primary glow-blue"
          onClick={() => setFilters({ make: '', maxPrice: '', maxMileage: '', fuelType: '' })}
        >
          LIMPIAR
        </button>
      </div>
    </div>
  )
}

export default FilterBar
