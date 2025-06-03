# 🌬️ Wind Site Suitability Tool

A full-stack web application that allows users to assess the suitability of a location for wind power generation based on wind speed, elevation, and wind direction distribution (Wind Rose Chart). Includes PDF report download functionality.  

## 📸 Preview

![App Screenshot](screenshots/app-preview.png)

---

## 📁 Project Structure

wind-site-tool/  
│
├── backend/ # Flask API  
│ ├── app.py # API logic (wind speed, elevation)  
│ └── requirements.txt # Backend dependencies  
│
├── frontend/ # React Frontend (Vite)  
│ ├── src/  
│ │ ├── App.jsx # Main application component  
│ │ ├── WindRoseChart.jsx # Chart component for wind direction  
│ │ └── ... # Other components  
│ ├── public/  
│ └── package.json # Frontend dependencies  
│
├── README.md # 📘 This file  
└── screenshots/ # Optional folder for README images  

---

## 🚀 Features  

- 🌍 Select a location by clicking on the map or choosing from examples.  
- 📡 Fetches **wind speed** and **elevation** from Open-Meteo API.  
- 🧭 Generates a **Wind Rose Chart** using `react-chartjs-2`.  
- 📊 Calculates a **Site Suitability Score** based on wind speed and elevation.  
- 📝 Allows users to **download a full PDF report** with results.  
- ⭐ Shows visual feedback using progress bar and stars.  

---

## 🛠️ Tech Stack  

**Frontend:**  
- ⚛️ React (Vite)  
- 📦 axios  
- 📊 chart.js + react-chartjs-2  
- 🗺️ react-leaflet + OpenStreetMap  
- 🧾 html2pdf.js  

**Backend:**  
- 🐍 Flask (Python)  
- 🌐 Flask-CORS  
- 🔗 External API: [Open-Meteo](https://open-meteo.com/)  

---

## 🧪 Live Demo  

You can deploy it on:  
- **Render.com**  
- **Vercel + Render (frontend + backend split)**  

---

## 🧰 Installation (Step-by-Step)  

### 1️⃣ Clone the repository  

```bash  
git clone https://github.com/yourusername/wind-site-tool.git  
cd wind-site-tool

2️⃣ Backend Setup (Flask)
cd backend
python -m venv venv
source venv/bin/activate  # Or use venv\Scripts\activate on Windows
pip install -r requirements.txt
python app.py

✅ Server should run on http://localhost:5001

3️⃣ Frontend Setup (React)
Open new terminal:
cd frontend
npm install
npm run dev

✅ Vite server should run on http://localhost:5173  
Make sure your frontend uses the correct proxy (in vite.config.js):  
proxy: {
  '/api': 'http://localhost:5001'
}

🧾 Downloadable PDF Report  
•	Click Download Report after checking a location.  
•	The report includes wind speed, elevation, wind rose chart and a site suitability score.  
________________________________________
🌟 Site Suitability Score Logic  
•	✅ Based on a formula that combines:  
o	Wind Speed  
o	Elevation  
•	🎯 Outputs:  
o	Progress bar color (red/yellow/green)  
o	Stars (1 to 5)  
________________________________________
📌 To Do / Ideas  
•	📈 Add time-series wind analysis.  
•	🗺️ Overlay map with wind potential zones.  
•	📍 Allow saving favorite locations.  
•	🌐 Add multi-language support (EN/ES).  
•	📤 Export data to CSV.  

📄 License  
MIT License — use freely, with attribution. Contributions welcome!  
Made by geeky4dev with ☀️ and ❤️ for solar energy enthusiasts!  
