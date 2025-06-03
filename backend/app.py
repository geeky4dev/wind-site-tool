from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import random

app = Flask(__name__)
CORS(app)

@app.route('/api/site-data', methods=['POST'])
def site_data():
    data = request.get_json()
    lat = data.get('latitude')
    lon = data.get('longitude')

    # Obtener velocidad del viento (Open-Meteo)
    wind_url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&hourly=wind_speed_10m"
    wind_data = requests.get(wind_url).json()
    wind_speed = wind_data["hourly"]["wind_speed_10m"][0]

    # Obtener elevación
    elev_url = f"https://api.open-meteo.com/v1/elevation?latitude={lat}&longitude={lon}"
    elev_data = requests.get(elev_url).json()
    elevation = elev_data["elevation"]

    # Simular datos de dirección del viento (8 direcciones)
    direction_data = [round(random.uniform(5, 20), 2) for _ in range(8)]

    return jsonify({
        "wind_speed": wind_speed,
        "elevation": elevation,
        "directionData": direction_data
    })

if __name__ == '__main__':
    app.run(port=5001)
