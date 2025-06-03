import React from 'react'
import {
  Chart as ChartJS,
  RadialLinearScale,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js'
import { PolarArea } from 'react-chartjs-2'

ChartJS.register(RadialLinearScale, ArcElement, Tooltip, Legend)

const WindRoseChart = ({ directionData }) => {
  if (!directionData || directionData.length !== 8) {
    return <p>Insufficient data for the wind rose.</p>
  }

  const data = {
    labels: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'],
    datasets: [{
      label: 'Frecuencia del viento (%)',
      data: directionData,
      backgroundColor: [
        'rgba(255, 99, 132, 0.6)',
        'rgba(54, 162, 235, 0.6)',
        'rgba(255, 206, 86, 0.6)',
        'rgba(75, 192, 192, 0.6)',
        'rgba(153, 102, 255, 0.6)',
        'rgba(255, 159, 64, 0.6)',
        'rgba(199, 199, 199, 0.6)',
        'rgba(100, 181, 246, 0.6)'
      ],
      borderWidth: 1
    }]
  }

  return (
  <div style={{ maxWidth: 500, margin: 'auto' }}>
    <PolarArea data={data} />
  </div>
)
}

export default WindRoseChart
