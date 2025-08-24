
const apiKey = "6860a02b1fa796c549d5f9652ff8a0fc";

window.addEventListener('load',()=>{
    document.getElementById('loading-screen').style.display='none';
    initMap();
});

document.getElementById('search-btn').addEventListener('click',()=>{
    const city = document.getElementById('city-input').value;
    fetchWeather(city);
});

async function fetchWeather(city){
    try {
        const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`);
        const data = await res.json();
        document.getElementById('temperature').textContent = data.main.temp + ' °C';
        document.getElementById('humidity').textContent = data.main.humidity + '%';
        document.getElementById('wind').textContent = data.wind.speed + ' m/s';
        document.getElementById('weather-icon').src = `assets/icons/${data.weather[0].main.toLowerCase()}.svg`;
        fetchForecast(data.coord.lat,data.coord.lon);
        fetchAQI(data.coord.lat,data.coord.lon);
        map.setView([data.coord.lat,data.coord.lon], 8);
    } catch(e) {console.error(e);}
}

async function fetchForecast(lat,lon){
    const res = await fetch(`https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`);
    const data = await res.json();
    const grid = document.getElementById('forecast-grid');
    grid.innerHTML = '';
    data.daily.slice(1,8).forEach(day=>{
        const div = document.createElement('div');
        div.classList.add('forecast-card');
        div.innerHTML = `<p>${new Date(day.dt*1000).toLocaleDateString()}</p>
                         <p>${day.temp.day}°C</p>`;
        grid.appendChild(div);
    });
    updateChart(data.hourly.slice(0,12));
}

async function fetchAQI(lat,lon){
    const res = await fetch(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`);
    const data = await res.json();
    document.getElementById('aqi-value').textContent = data.list[0].main.aqi;
}

let hourlyChart;
function updateChart(hourlyData){
    const ctx = document.getElementById('hourlyChart').getContext('2d');
    if(hourlyChart) hourlyChart.destroy();
    hourlyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: hourlyData.map(h=> new Date(h.dt*1000).getHours() + ':00'),
            datasets: [{
                label:'Temp (°C)',
                data: hourlyData.map(h=> h.temp),
                borderColor:'#4facfe',
                fill:false
            }]
        }
    });
}

// Dark mode toggle
document.getElementById('theme-toggle').addEventListener('click',()=>{document.body.classList.toggle('dark-mode');});

// Language toggle
const langToggle = document.getElementById('lang-toggle');
let currentLang = 'en';
const translations = {
    en: { appName:'SkyCast Pro', currentWeather:'Current Weather', hourlyForecast:'Hourly Forecast', weeklyForecast:'7-Day Forecast', airQuality:'Air Quality Index', map:'Radar Map', humidity:'Humidity', wind:'Wind Speed' },
    ur: { appName:'اسکائی کاسٹ پرو', currentWeather:'موجودہ موسم', hourlyForecast:'گھنٹہ وار پیشن گوئی', weeklyForecast:'ہفتہ وار پیشن گوئی', airQuality:'ہوا کا معیار', map:'نقشہ', humidity:'نمی', wind:'ہوا کی رفتار' }
};
langToggle.addEventListener('click',()=>{
    currentLang = currentLang === 'en' ? 'ur' : 'en';
    document.querySelectorAll('[data-translate]').forEach(el=>{
        const key = el.getAttribute('data-translate');
        el.textContent = translations[currentLang][key] || el.textContent;
    });
});

// Map with Leaflet
let map;
function initMap(){
    map = L.map('map').setView([20, 77], 2);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
    }).addTo(map);
}
