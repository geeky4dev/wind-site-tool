
from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import time
import os

app = Flask(__name__)
CORS(app)

# --------------------------------------------------
# CONFIGURATION
# --------------------------------------------------

WEATHER_API_KEY = os.environ.get("WEATHER_API_KEY")

WEATHER_CACHE = {}
ELEVATION_CACHE = {}

WEATHER_CACHE_TTL = 600          # 10 minutes
ELEVATION_CACHE_TTL = 2592000    # 30 days

WEATHER_API_URL = (
    "https://api.weatherapi.com/v1/forecast.json"
)

ELEVATION_API_URL = (
    "https://api.opentopodata.org/v1/mapzen"
)

SECTORS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]


# --------------------------------------------------
# EXTERNAL API EXCEPTIONS
# --------------------------------------------------

class ExternalAPIError(Exception):
    pass


class ExternalRateLimit(Exception):
    def __init__(self, retry_after="60"):
        self.retry_after = retry_after


# --------------------------------------------------
# HTTP REQUEST HELPER
# --------------------------------------------------

def get_api_data(url, params):

    response = requests.get(
        url,
        params=params,
        timeout=20
    )

    if response.status_code == 429:
        raise ExternalRateLimit(
            response.headers.get("Retry-After", "60")
        )

    response.raise_for_status()

    result = response.json()

    if "error" in result:
        raise ExternalAPIError(
            "External API returned an error"
        )

    return result


# --------------------------------------------------
# WIND DIRECTION DISTRIBUTION
# --------------------------------------------------

def calculate_wind_distribution(forecast_days):

    counts = [0] * 8
    total = 0
    now = time.time()

    for day in forecast_days:

        for hour in day.get("hour", []):

            timestamp = hour.get("time_epoch")
            direction = hour.get("wind_degree")

            if timestamp is None or direction is None:
                continue

            # Use current and future forecast hours only
            if timestamp < now - 3600:
                continue

            direction = float(direction) % 360

            # Assign direction to one of eight sectors
            sector_index = int(
                ((direction + 22.5) % 360) // 45
            )

            counts[sector_index] += 1
            total += 1

    if total == 0:
        raise ExternalAPIError(
            "No hourly wind direction data available"
        )

    distribution = [
        round((count / total) * 100, 2)
        for count in counts
    ]

    return distribution


# --------------------------------------------------
# WEATHER DATA
# --------------------------------------------------

def get_weather_data(lat, lon):

    cache_key = (round(lat, 5), round(lon, 5))
    now = time.monotonic()

    cached = WEATHER_CACHE.get(cache_key)

    if cached and now - cached["time"] < WEATHER_CACHE_TTL:

        app.logger.info("Using cached weather data")

        return cached["data"]

    if not WEATHER_API_KEY:
        raise ExternalAPIError(
            "WeatherAPI key is not configured"
        )

    weather = get_api_data(
        WEATHER_API_URL,
        {
            "key": WEATHER_API_KEY,
            "q": f"{lat},{lon}",
            "days": 3,
            "aqi": "no",
            "alerts": "no"
        }
    )

    current = weather.get("current", {})
    forecast = weather.get("forecast", {})

    wind_kph = current.get("wind_kph")

    if wind_kph is None:
        raise ExternalAPIError(
            "Current wind speed unavailable"
        )

    # Convert km/h to m/s
    wind_speed = round(float(wind_kph) / 3.6, 2)

    forecast_days = forecast.get("forecastday", [])

    direction_data = calculate_wind_distribution(
        forecast_days
    )

    result = {
        "wind_speed": wind_speed,
        "wind_direction": current.get("wind_degree"),
        "wind_cardinal": current.get("wind_dir"),
        "directionData": direction_data
    }

    WEATHER_CACHE[cache_key] = {
        "data": result,
        "time": now
    }

    return result


# --------------------------------------------------
# ELEVATION DATA
# --------------------------------------------------

def get_elevation(lat, lon):

    cache_key = (round(lat, 5), round(lon, 5))
    now = time.monotonic()

    cached = ELEVATION_CACHE.get(cache_key)

    if cached and now - cached["time"] < ELEVATION_CACHE_TTL:

        app.logger.info("Using cached elevation data")

        return cached["elevation"]

    elevation_data = get_api_data(
        ELEVATION_API_URL,
        {
            "locations": f"{lat},{lon}"
        }
    )

    results = elevation_data.get("results", [])

    if not results or results[0].get("elevation") is None:
        raise ExternalAPIError(
            "Elevation data unavailable"
        )

    elevation = float(results[0]["elevation"])

    ELEVATION_CACHE[cache_key] = {
        "elevation": elevation,
        "time": now
    }

    return elevation


# --------------------------------------------------
# MAIN SITE DATA ENDPOINT
# --------------------------------------------------

@app.route("/api/site-data", methods=["POST"])
def site_data():

    try:

        data = request.get_json(silent=True) or {}

        lat = data.get("latitude")
        lon = data.get("longitude")

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

        # Retrieve weather data
        weather = get_weather_data(lat, lon)

        # Retrieve elevation independently
        elevation = get_elevation(lat, lon)

        return jsonify({

            "wind_speed": weather["wind_speed"],

            "wind_direction": weather["wind_direction"],

            "wind_cardinal": weather["wind_cardinal"],

            "elevation": elevation,

            "directionData": weather["directionData"]

        }), 200

    except ExternalRateLimit as error:

        app.logger.warning(
            "External API rate limit reached"
        )

        return jsonify({
            "error": "External API request limit reached",
            "details": "Please wait before trying again",
            "retry_after": error.retry_after
        }), 503

    except requests.RequestException:

        app.logger.exception(
            "External API connection error"
        )

        return jsonify({
            "error": "External weather or elevation service unavailable"
        }), 502

    except ExternalAPIError as error:

        app.logger.error(
            "External API error: %s", str(error)
        )

        return jsonify({
            "error": str(error)
        }), 502

    except Exception:

        app.logger.exception(
            "Unexpected backend error"
        )

        return jsonify({
            "error": "Internal server error"
        }), 500


# --------------------------------------------------
# APPLICATION START
# --------------------------------------------------

if __name__ == "__main__":

    app.run(
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 5001))
    )
