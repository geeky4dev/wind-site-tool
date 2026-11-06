
from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import random
import time
import os

app = Flask(__name__)
CORS(app)

# Caché local: 10 minutos
CACHE = {}
CACHE_TTL = 600


class OpenMeteoRateLimit(Exception):
    def __init__(self, retry_after="60"):
        self.retry_after = retry_after


def get_api_data(url, params):
    response = requests.get(url, params=params, timeout=20)

    if response.status_code == 429:
        raise OpenMeteoRateLimit(
            response.headers.get("Retry-After", "60")
        )

    response.raise_for_status()
    return response.json()


@app.route('/api/site-data', methods=['POST'])
def site_data():
    try:
        data = request.get_json(silent=True) or {}

        lat = data.get('latitude')
        lon = data.get('longitude')

        if lat is None or lon is None:
            return jsonify({
                "error": "Latitude and longitude are required"
            }), 400

        try:
            lat = float(lat)
            lon = float(lon)
        except (ValueError, TypeError):
            return jsonify({
                "error": "Coordinates must be numbers"
            }), 400

        if not (-90 <= lat <= 90 and -180 <= lon <= 180):
            return jsonify({
                "error": "Invalid coordinate range"
            }), 400

        # Identificador de caché
        cache_key = (round(lat, 5), round(lon, 5))
        now = time.monotonic()

        cached = CACHE.get(cache_key)

        if cached and now - cached["time"] < CACHE_TTL:
            wind_speed = cached["wind_speed"]
            elevation = cached["elevation"]

            app.logger.info("Using cached site data")

        else:
            # Open-Meteo: viento y elevación en una sola consulta
            wind_data = get_api_data(
                "https://api.open-meteo.com/v1/forecast",
                {
                    "latitude": lat,
                    "longitude": lon,
                    "hourly": "wind_speed_10m"
                }
            )

            if "hourly" not in wind_data:
                app.logger.error(
                    "Unexpected wind response: %s", wind_data
                )
                return jsonify({
                    "error": "Wind data unavailable"
                }), 502

            speeds = wind_data["hourly"].get(
                "wind_speed_10m", []
            )

            if not speeds or speeds[0] is None:
                return jsonify({
                    "error": "No wind speed available"
                }), 502

            wind_speed = speeds[0]

            # La respuesta forecast también contiene elevation
            elevation_value = wind_data.get("elevation")

            if elevation_value is None:
                return jsonify({
                    "error": "Elevation unavailable"
                }), 502

            # Mantener el formato de lista esperado por el frontend
            elevation = [elevation_value]

            # Guardar resultados meteorológicos
            CACHE[cache_key] = {
                "wind_speed": wind_speed,
                "elevation": elevation,
                "time": now
            }

        # Datos simulados: conservar compatibilidad con frontend
        direction_data = [
            round(random.uniform(5, 20), 2)
            for _ in range(8)
        ]

        return jsonify({
            "wind_speed": wind_speed,
            "elevation": elevation,
            "directionData": direction_data
        })

    except OpenMeteoRateLimit as e:
        app.logger.warning(
            "Open-Meteo rate limit reached"
        )
        return jsonify({
            "error": "Open-Meteo request limit reached",
            "details": "Please wait before trying again",
            "retry_after": e.retry_after
        }), 503

    except requests.RequestException:
        app.logger.exception("Open-Meteo connection error")
        return jsonify({
            "error": "External weather service unavailable"
        }), 502

    except Exception:
        app.logger.exception("Unexpected backend error")
        return jsonify({
            "error": "Internal server error"
        }), 500
@app.route('/api/diagnostic', methods=['GET'])
def diagnostic():
    try:
        start = time.monotonic()

        response = requests.get(
            "https://api.open-meteo.com/v1/forecast",
            params={
                "latitude": 48.137154,
                "longitude": 11.576124,
                "hourly": "wind_speed_10m"
            },
            timeout=20
        )

        elapsed = round(time.monotonic() - start, 2)

        return jsonify({
            "provider": "Open-Meteo",
            "http_status": response.status_code,
            "response_time_seconds": elapsed,
            "retry_after": response.headers.get("Retry-After"),
            "response": response.text[:500]
        }), 200

    except requests.RequestException as e:
        return jsonify({
            "error": str(e)
        }), 502

if __name__ == '__main__':
    app.run(
        host='0.0.0.0',
        port=int(os.environ.get('PORT', 5001))
    )
