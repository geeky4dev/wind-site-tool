
import React from 'react'
import {
  Chart as ChartJS,
  RadialLinearScale,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js'
import { PolarArea } from 'react-chartjs-2'

ChartJS.register(
  RadialLinearScale,
  ArcElement,
  Tooltip,
  Legend
)

const WindRoseChart = ({ directionData }) => {
  if (!directionData || directionData.length !== 8) {
    return <p>Insufficient data for the wind rose.</p>
  }

  const data = {
    labels: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'],
    datasets: [{
      label: 'Wind frequency (%)',
      data: directionData,
      backgroundColor: [
        'rgba(255, 99, 132, 0.65)',
        'rgba(54, 162, 235, 0.65)',
        'rgba(255, 206, 86, 0.65)',
        'rgba(75, 192, 192, 0.65)',
        'rgba(153, 102, 255, 0.65)',
        'rgba(255, 159, 64, 0.65)',
        'rgba(199, 199, 199, 0.65)',
        'rgba(100, 181, 246, 0.65)'
      ],
      borderColor: '#ffffff',
      borderWidth: 1
    }]
  }

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    animation: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom'
      }
    },
    scales: {
      r: {
        beginAtZero: true,
        ticks: {
          backdropColor: 'transparent'
        }
      }
    }
  }

  return (
    <div
      className="wind-rose-chart"
      style={{
        width: '100%',
        maxWidth: '440px',
        height: '440px',
        margin: '0 auto',
        position: 'relative'
      }}
    >
      <PolarArea
        data={data}
        options={options}
      />
    </div>
  )
}

export default WindRoseChart
