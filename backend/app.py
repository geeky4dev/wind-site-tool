
from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import random

app = Flask(__name__)
CORS(app)


@app.route('/api/site-data', methods=['POST'])
def site_data():
    data = request.get_json(silent=True) or {}

    lat = data.get('latitude')
    lon = data.get('longitude')

    if lat is None or lon is None:
        return jsonify({
            "error": "Missing latitude or longitude",
            "received": data
        }), 400

    try:
        lat = float(lat)
        lon = float(lon)

        if not (-90 <= lat <= 90 and -180 <= lon <= 180):
            return jsonify({"error": "Invalid coordinates"}), 400

        wind_url = "https://api.open-meteo.com/v1/forecast"
        params = {
            "latitude": lat,
            "longitude": lon,
            "hourly": "wind_speed_10m"
        }

        response = requests.get(
            wind_url, params=params, timeout=20
        )

        app.logger.info(
            "Open-Meteo status=%s URL=%s response=%s",
            response.status_code,
            response.url,
            response.text[:1000]
        )

        response.raise_for_status()
        wind_data = response.json()

        if "hourly" not in wind_data:
            app.logger.error(
                "Missing hourly key: %s", wind_data
            )
            return jsonify({
                "error": "Unexpected weather API response",
                "details": wind_data.get(
                    "reason", wind_data.get(
                        "message", "Missing hourly data"
                    )
                )
            }), 502

        speeds = wind_data["hourly"].get(
            "wind_speed_10m", []
        )

        if not speeds or speeds[0] is None:
            return jsonify({
                "error": "Wind speed data unavailable"
            }), 502

        wind_speed = speeds[0]

        elev_url = "https://api.open-meteo.com/v1/elevation"
        elev_response = requests.get(
            elev_url,
            params={"latitude": lat, "longitude": lon},
            timeout=20
        )
        elev_response.raise_for_status()
        elev_data = elev_response.json()

        elevations = elev_data.get("elevation", [])
        if not elevations or elevations[0] is None:
            return jsonify({
                "error": "Elevation data unavailable",
                "details": elev_data
            }), 502

        elevation = elevations[0]

        direction_data = [
            round(random.uniform(5, 20), 2)
            for _ in range(8)
        ]

        return jsonify({
            "wind_speed": wind_speed,
            "elevation": elevation,
            "directionData": direction_data
        })

    except requests.RequestException:
        app.logger.exception("Open-Meteo request failed")
        return jsonify({
            "error": "Could not retrieve data from Open-Meteo"
        }), 502

    except (TypeError, ValueError):
        return jsonify({
            "error": "Invalid latitude or longitude"
        }), 400


if __name__ == '__main__':
    import os
    app.run(
        host='0.0.0.0',
        port=int(os.environ.get('PORT', 5001))
    )
