import React, { useState, useRef } from 'react'
import axios from 'axios'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import WindRoseChart from './WindRoseChart'
import html2pdf from 'html2pdf.js'

const EXAMPLES = [
  { name: "Tehachapi, California (USA)", lat: 35.1015, lon: -118.4012 },
  { name: "Schleswig-Holstein (Germany)", lat: 54.5194, lon: 9.9946 },
  { name: "Sierra de los Caracoles (Uruguay)", lat: -34.4746, lon: -54.9379 },
  { name: "Zaragoza (Spain)", lat: 41.6488, lon: -0.8891 },
  { name: "Whitelee Wind Farm (Scotland)", lat: 55.7148, lon: -4.2764 },
  { name: "Nevada Desert (USA)", lat: 36.1699, lon: -115.1398 }
]

function LocationMarker({ setLat, setLon }) {
  useMapEvents({
    click(e) {
      setLat(e.latlng.lat.toFixed(4))
      setLon(e.latlng.lng.toFixed(4))
    }
  })
  return null
}

function App() {
  const [lat, setLat] = useState('')
  const [lon, setLon] = useState('')
  const [data, setData] = useState(null)
  const reportRef = useRef()

  const fetchSiteData = async (e) => {
    e.preventDefault()
    try {
      const res = await axios.post('/api/site-data', {
        latitude: lat,
        longitude: lon
      })
      const { wind_speed, elevation, directionData } = res.data

      const score = calculateSuitabilityScore(wind_speed, elevation)
      const rating = scoreToStars(score)

      setData({ wind_speed, elevation, directionData, score, rating })
    } catch (error) {
      console.error('Error fetching site data:', error)
      setData(null)
    }
  }

  const calculateSuitabilityScore = (wind, elev) => {
    let windScore = Math.min(wind / 10, 1) * 70 // up to 70%
    let elevScore = Math.min(elev / 500, 1) * 30 // up to 30%
    return Math.round(windScore + elevScore)
  }

  const scoreToStars = (score) => {
    if (score >= 80) return '⭐⭐⭐⭐⭐ Excellent'
    if (score >= 60) return '⭐⭐⭐⭐ Good'
    if (score >= 40) return '⭐⭐⭐ Fair'
    if (score >= 20) return '⭐⭐ Poor'
    return '⭐ Very Low'
  }

  const handleExampleClick = (example) => {
    setLat(example.lat)
    setLon(example.lon)
  }

  const downloadPDF = () => {
    const element = reportRef.current
    const opt = {
      margin: 0.5,
      filename: 'wind-site-report.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    }
    html2pdf().set(opt).from(element).save()
  }

  return (
    <div style={{ padding: '1rem', fontFamily: 'sans-serif' }}>
      <h1>🌬️ Wind Site Suitability Tool</h1>

      <form onSubmit={fetchSiteData} style={{ marginBottom: '1rem' }}>
        <input
          type="text"
          value={lat}
          onChange={(e) => setLat(e.target.value)}
          placeholder="Latitude"
          style={{ marginRight: '0.5rem' }}
        />
        <input
          type="text"
          value={lon}
          onChange={(e) => setLon(e.target.value)}
          placeholder="Longitude"
          style={{ marginRight: '0.5rem' }}
        />
        <button type="submit">Check Site</button>
      </form>

      {data && (
        <div ref={reportRef} style={{ border: '1px solid #ccc', padding: '1rem', marginBottom: '1rem' }}>
          <h3>📊 Site Assessment Report</h3>
          <p><strong>Latitude:</strong> {lat}</p>
          <p><strong>Longitude:</strong> {lon}</p>
          <p><strong>Wind Speed:</strong> {data.wind_speed} m/s</p>
          <p><strong>Elevation:</strong> {data.elevation} m</p>
          <p><strong>Suitability Score:</strong> {data.score} / 100</p>

          <div style={{ background: '#eee', borderRadius: '6px', overflow: 'hidden', height: '20px', marginBottom: '0.5rem' }}>
            <div
              style={{
                width: `${data.score}%`,
                height: '100%',
                backgroundColor: data.score >= 70 ? 'green' : data.score >= 40 ? 'orange' : 'red'
              }}
            />
          </div>

          <p><strong>Recommendation:</strong> {data.rating}</p>

          {data.directionData && data.directionData.length === 8 && (
            <>
              <h4>🧭 Wind Rose Chart</h4>
              <p style={{ fontStyle: 'italic' }}>
                The distribution of wind speed and direction (measured %) at a specific location over a defined period.
              </p>
              <WindRoseChart directionData={data.directionData} />
            </>
          )}
        </div>
      )}

      {data && (
        <button
          onClick={downloadPDF}
          style={{
            marginTop: '1.5rem',
            padding: '0.8rem 1.5rem',
            fontSize: '1.1rem',
            backgroundColor: '#28a745',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            transition: 'background-color 0.3s ease'
          }}
          onMouseOver={(e) => (e.target.style.backgroundColor = '#218838')}
          onMouseOut={(e) => (e.target.style.backgroundColor = '#28a745')}
        >
          📄 Download Report
        </button>
      )}

      <h2>🗺️ Click Map to Select Coordinates</h2>
      <MapContainer center={[20, 0]} zoom={2} style={{ height: '400px', marginBottom: '1rem' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <LocationMarker setLat={setLat} setLon={setLon} />
        {lat && lon && (
          <Marker position={[parseFloat(lat), parseFloat(lon)]} />
        )}
      </MapContainer>

      <h2>📌 Example Locations</h2>
      <table border="1" cellPadding="8" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>Location</th>
            <th>Latitude</th>
            <th>Longitude</th>
            <th>Use</th>
          </tr>
        </thead>
        <tbody>
          {EXAMPLES.map((loc, i) => (
            <tr key={i}>
              <td>{loc.name}</td>
              <td>{loc.lat}</td>
              <td>{loc.lon}</td>
              <td>
                <button onClick={() => handleExampleClick(loc)}>Use</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default App








