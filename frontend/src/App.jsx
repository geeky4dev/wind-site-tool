
import React, { useState, useRef } from 'react'
import axios from 'axios'
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents
} from 'react-leaflet'
import WindRoseChart from './WindRoseChart'
import html2pdf from 'html2pdf.js'
import './App.css'

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001'

const DIRECTIONS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']

const EXAMPLES = [
  { name: 'Tehachapi, California (USA)', lat: 35.1015, lon: -118.4012 },
  { name: 'Schleswig-Holstein (Germany)', lat: 54.5194, lon: 9.9946 },
  { name: 'Sierra de los Caracoles (Uruguay)', lat: -34.4746, lon: -54.9379 },
  { name: 'Zaragoza (Spain)', lat: 41.6488, lon: -0.8891 },
  { name: 'Whitelee Wind Farm (Scotland)', lat: 55.7148, lon: -4.2764 },
  { name: 'Nevada Desert (USA)', lat: 36.1699, lon: -115.1398 }
]

function LocationMarker({ setLat, setLon }) {
  useMapEvents({
    click(event) {
      setLat(event.latlng.lat.toFixed(4))
      setLon(event.latlng.lng.toFixed(4))
    }
  })

  return null
}

function calculateSuitabilityScore(wind, elevation) {
  const windScore = Math.min(Math.max(wind, 0) / 10, 1) * 70
  const elevationScore = Math.min(Math.max(elevation, 0) / 500, 1) * 30

  return Math.round(windScore + elevationScore)
}

function scoreToStars(score) {
  if (score >= 80) return '⭐⭐⭐⭐⭐ Excellent'
  if (score >= 60) return '⭐⭐⭐⭐ Good'
  if (score >= 40) return '⭐⭐⭐ Fair'
  if (score >= 20) return '⭐⭐ Poor'
  return '⭐ Very Low'
}

function App() {
  const [lat, setLat] = useState('')
  const [lon, setLon] = useState('')
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)

  const reportRef = useRef(null)

  // --------------------------------------------------
  // FETCH SITE DATA
  // --------------------------------------------------

  const fetchSiteData = async (event) => {
    event.preventDefault()

    const latitude = Number(lat)
    const longitude = Number(lon)

    if (
      lat.trim() === '' ||
      lon.trim() === '' ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      alert('Please enter valid latitude and longitude values.')
      return
    }

    if (isLoading) return

    setIsLoading(true)
    setData(null)

    try {
      const response = await axios.post(
        `${API_BASE}/site-data`,
        {
          latitude,
          longitude
        },
        {
          timeout: 60000
        }
      )

      const {
        wind_speed,
        elevation,
        directionData
      } = response.data

      if (
        !Number.isFinite(Number(wind_speed)) ||
        !Number.isFinite(Number(elevation))
      ) {
        throw new Error('Invalid wind speed or elevation data.')
      }

      if (
        !Array.isArray(directionData) ||
        directionData.length !== 8 ||
        !directionData.every(value => Number.isFinite(Number(value)))
      ) {
        throw new Error('Invalid wind direction data.')
      }

      const score = calculateSuitabilityScore(
        Number(wind_speed),
        Number(elevation)
      )

      setData({
        wind_speed: Number(wind_speed),
        elevation: Number(elevation),
        directionData: directionData.map(Number),
        score,
        rating: scoreToStars(score)
      })

    } catch (error) {
      console.error('Site data error:', error)

      const message = error.response?.data?.error ||
        error.message ||
        'Unable to retrieve site data.'

      alert(`Site assessment failed: ${message}`)
      setData(null)

    } finally {
      setIsLoading(false)
    }
  }

  // --------------------------------------------------
  // EXAMPLE LOCATIONS
  // --------------------------------------------------

  const handleExampleClick = (example) => {
    setLat(String(example.lat))
    setLon(String(example.lon))
  }

  // --------------------------------------------------
  // PDF GENERATION
  // --------------------------------------------------

  const downloadPDF = async () => {
    const element = reportRef.current

    if (!element || !data) {
      alert('Please calculate a site assessment before downloading the report.')
      return
    }

    if (
      !Array.isArray(data.directionData) ||
      data.directionData.length !== 8
    ) {
      alert('Wind direction data is incomplete. Cannot generate the report.')
      return
    }

    if (isGeneratingPDF) return

    setIsGeneratingPDF(true)

    try {
      // Wait for React and Chart.js to finish rendering.
      await new Promise(resolve => setTimeout(resolve, 500))

      const options = {
        margin: 0,

        filename: 'wind-site-report.pdf',

        image: {
          type: 'jpeg',
          quality: 0.98
        },

        html2canvas: {
          scale: 2,
          useCORS: true,
          allowTaint: false,
          backgroundColor: '#ffffff',
          logging: false,
          scrollX: 0,
          scrollY: 0,
          windowWidth: 794
        },

        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait',
          compress: true
        },

        // Explicitly separate the two report pages.
        pagebreak: {
          mode: ['css']
        }
      }

      await html2pdf()
        .set(options)
        .from(element)
        .save()

    } catch (error) {
      console.error('PDF generation error:', error)
      alert('The PDF could not be generated. Please try again.')

    } finally {
      setIsGeneratingPDF(false)
    }
  }

  // --------------------------------------------------
  // SCORE COLOUR
  // --------------------------------------------------

  const scoreColor =
    data?.score >= 70
      ? '#198754'
      : data?.score >= 40
        ? '#d97706'
        : '#dc3545'

  // --------------------------------------------------
  // APPLICATION UI
  // --------------------------------------------------

  return (
    <div className="app-container">

      <main className="no-print">

        <h1>🌬️ Wind Site Suitability Tool</h1>

        <form onSubmit={fetchSiteData} className="site-form">

          <input
            type="number"
            step="any"
            value={lat}
            onChange={(event) => setLat(event.target.value)}
            placeholder="Latitude"
            aria-label="Latitude"
          />

          <input
            type="number"
            step="any"
            value={lon}
            onChange={(event) => setLon(event.target.value)}
            placeholder="Longitude"
            aria-label="Longitude"
          />

          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Loading...' : 'Check Site'}
          </button>

        </form>

        {data && (
          <section className="screen-results">

            <h3>📊 Site Assessment Report</h3>

            <p><strong>Latitude:</strong> {lat}</p>
            <p><strong>Longitude:</strong> {lon}</p>
            <p><strong>Wind Speed:</strong> {data.wind_speed.toFixed(1)} m/s</p>
            <p><strong>Elevation:</strong> {data.elevation.toFixed(0)} m</p>
            <p><strong>Suitability Score:</strong> {data.score} / 100</p>
            <p><strong>Recommendation:</strong> {data.rating}</p>

            {data.directionData.length === 8 && (
              <>
                <h4>🧭 Wind Rose Chart</h4>

                <p>
                  Forecast distribution of wind directions (%) based on
                  hourly weather forecasts for the next 3 days. This is
                  not a historical climatological wind rose.
                </p>

                <WindRoseChart
                  directionData={data.directionData}
                />
              </>
            )}

            <button
              type="button"
              onClick={downloadPDF}
              disabled={isGeneratingPDF}
              className="download-button"
            >
              {isGeneratingPDF
                ? 'Generating PDF...'
                : '📄 Download Report'}
            </button>

          </section>
        )}

        <h2>🗺️ Click Map to Select Coordinates</h2>

        <MapContainer
          center={[20, 0]}
          zoom={2}
          style={{ height: '400px', marginBottom: '1rem' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <LocationMarker
            setLat={setLat}
            setLon={setLon}
          />

          {lat !== '' && lon !== '' &&
            Number.isFinite(Number(lat)) &&
            Number.isFinite(Number(lon)) && (
              <Marker
                position={[Number(lat), Number(lon)]}
              />
            )}
        </MapContainer>

        <h2>📌 Example Locations</h2>

        <table className="examples-table">

          <thead>
            <tr>
              <th>Location</th>
              <th>Latitude</th>
              <th>Longitude</th>
              <th>Use</th>
            </tr>
          </thead>

          <tbody>
            {EXAMPLES.map((location) => (
              <tr key={location.name}>
                <td>{location.name}</td>
                <td>{location.lat}</td>
                <td>{location.lon}</td>
                <td>
                  <button
                    type="button"
                    onClick={() => handleExampleClick(location)}
                  >
                    Use
                  </button>
                </td>
              </tr>
            ))}
          </tbody>

        </table>

      </main>

      {/* ------------------------------------------------
          INDEPENDENT PDF REPORT
      ------------------------------------------------ */}

      {data && (
        <div className="pdf-export-wrapper">

          <div
            ref={reportRef}
            className="pdf-report"
          >

            {/* PAGE 1 */}

            <section className="pdf-page pdf-page-1">

              <header className="report-header">

                <div>
                  <div className="report-brand">
                    APPS FOR GREEN
                  </div>

                  <div className="report-subbrand">
                    GREENTECH WEB SOLUTIONS
                  </div>
                </div>

                <div className="report-document-type">
                  TECHNICAL REPORT
                </div>

              </header>

              <div className="report-title-block">

                <div className="report-kicker">
                  WIND RESOURCE ASSESSMENT
                </div>

                <h1>Wind Site Suitability Report</h1>

                <p>
                  Preliminary assessment of wind conditions
                  and site characteristics.
                </p>

              </div>

              <div className="report-section">

                <h2>01 — Site Identification</h2>

                <div className="report-coordinates">

                  <div>
                    <span>LATITUDE</span>
                    <strong>{Number(lat).toFixed(4)}°</strong>
                  </div>

                  <div>
                    <span>LONGITUDE</span>
                    <strong>{Number(lon).toFixed(4)}°</strong>
                  </div>

                </div>

              </div>

              <div className="report-section">

                <h2>02 — Wind Resource Indicators</h2>

                <div className="report-metrics">

                  <div className="metric-card">
                    <span>WIND SPEED</span>
                    <strong>{data.wind_speed.toFixed(1)}</strong>
                    <small>m/s</small>
                  </div>

                  <div className="metric-card">
                    <span>GROUND ELEVATION</span>
                    <strong>{data.elevation.toFixed(0)}</strong>
                    <small>m above sea level</small>
                  </div>

                </div>

              </div>

              <div className="report-section">

                <h2>03 — Suitability Assessment</h2>

                <div className="report-score">

                  <div className="score-value">
                    {data.score}
                    <span> / 100</span>
                  </div>

                  <div className="score-label">
                    {data.rating}
                  </div>

                </div>

                <div className="report-score-track">
                  <div
                    className="report-score-fill"
                    style={{
                      width: `${data.score}%`,
                      backgroundColor: scoreColor
                    }}
                  />
                </div>

                <p className="report-note">
                  Preliminary indicative score based on the
                  wind speed and elevation indicators used
                  by this application. It is not a bankable
                  wind resource assessment.
                </p>

              </div>

              <div className="report-methodology">

                <strong>Assessment methodology</strong>

                <p>
                  Wind speed contributes up to 70 points and
                  elevation contributes up to 30 points.
                  The resulting score is an indicative screening
                  metric and does not replace a detailed
                  wind resource study.
                </p>

              </div>

              <footer className="report-footer">
                <span>APPS FOR GREEN — GREENTECH WEB SOLUTIONS</span>
                <span>PAGE 1 / 2</span>
              </footer>

            </section>

            {/* PAGE 2 */}

            <section className="pdf-page pdf-page-2">

              <header className="report-header">

                <div>
                  <div className="report-brand">
                    APPS FOR GREEN
                  </div>

                  <div className="report-subbrand">
                    GREENTECH WEB SOLUTIONS
                  </div>
                </div>

                <div className="report-document-type">
                  WIND ANALYSIS
                </div>

              </header>

              <div className="report-title-block">

                <div className="report-kicker">
                  WIND DIRECTION ANALYSIS
                </div>

                <h1>Wind Rose</h1>

                <p>
                  Distribution of forecast wind directions
                  across eight directional sectors.
                </p>

              </div>

              <div className="report-chart-container">

                <WindRoseChart
                  directionData={data.directionData}
                />

              </div>

              <div className="report-section">

                <h2>04 — Directional Distribution</h2>

                <table className="direction-table">

                  <thead>
                    <tr>
                      <th>Direction</th>
                      <th>Frequency (%)</th>
                    </tr>
                  </thead>

                  <tbody>
                    {DIRECTIONS.map((sector, index) => (
                      <tr key={sector}>
                        <td>{sector}</td>
                        <td>
                          {data.directionData[index].toFixed(2)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>

                </table>

              </div>

              <div className="report-methodology">

                <strong>Forecast period and interpretation</strong>

                <p>
                  The wind rose represents the percentage
                  distribution of hourly forecast wind
                  directions over the next three days.
                  It is not a historical climatological
                  wind rose and must not be interpreted
                  as long-term wind statistics.
                </p>

              </div>

              <div className="report-sources">

                <strong>Data sources</strong>

                <p>
                  Wind speed and hourly wind direction:
                  WeatherAPI.
                </p>

                <p>
                  Ground elevation: Open Topo Data.
                </p>

              </div>

              <footer className="report-footer">
                <span>APPS FOR GREEN — GREENTECH WEB SOLUTIONS</span>
                <span>PAGE 2 / 2</span>
              </footer>

            </section>

          </div>

        </div>
      )}

    </div>
  )
}

export default App
