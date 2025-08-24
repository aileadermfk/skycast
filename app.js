// Modern SkyCast Pro — integrated build
const KEY = "6860a02b1fa796c549d5f9652ff8a0fc";
const els = id => document.getElementById(id);
const toast = (t)=>{ const e=els('toast'); if(!e) return; e.textContent=t; e.classList.add('show'); setTimeout(()=>e.classList.remove('show'),2200); };

// Initial UI bindings
document.addEventListener('DOMContentLoaded',()=>{ if(els('loading-screen')) els('loading-screen').style.display='none'; init(); });
if(els('search')) document.getElementById('search').addEventListener('keydown', (e)=>{ if(e.key==='Enter') doSearch(); });
if(els('mic')) document.getElementById('mic').addEventListener('click', startVoice);
if(els('unit')) document.getElementById('unit').addEventListener('change', ()=>{ localStorage.setItem('unit', document.getElementById('unit').checked ? 'imperial' : 'metric'); const last=JSON.parse(localStorage.getItem('LAST')||'{}'); if(last.lat) load(last.lat,last.lon,last.name); });
if(els('lang')) document.getElementById('lang').addEventListener('click', ()=>{ const cur = localStorage.getItem('lang')||'en'; const nw = cur==='en'?'ur':'en'; localStorage.setItem('lang', nw); location.reload(); });
if(els('favBtn')) document.getElementById('favBtn').addEventListener('click', addFavorite);
document.querySelectorAll('.tabs button').forEach(b=>b.addEventListener('click', ()=>{ document.querySelectorAll('.tabs button').forEach(x=>x.classList.remove('active')); b.classList.add('active'); document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active')); document.getElementById('tab-'+b.dataset.tab).classList.add('active'); }));

let map, radarLayer, hourChart, aqiChart;

// Initialize app
async function init(){
  try{
    // Setup map
    map = L.map('map', { zoomControl:false, attributionControl:false }).setView([24.86,67.01], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

    // Load last or default city
    const last = JSON.parse(localStorage.getItem('LAST')||'{}');
    if(last.lat) return load(last.lat,last.lon,last.name);
    // default Karachi
    const geo = await geocode('Karachi');
    if(geo && geo[0]) load(geo[0].lat,geo[0].lon, geo[0].name + ', ' + (geo[0].country||''));
  }catch(e){ console.error(e); }
}

// Geocode
async function geocode(q){
  try{ const r = await fetch('https://api.openweathermap.org/geo/1.0/direct?q='+encodeURIComponent(q)+'&limit=5&appid='+KEY); return await r.json(); }catch(e){console.error(e);return null;}
}

// Reverse geocode
async function reverseGeocode(lat,lon){ const r=await fetch('https://api.openweathermap.org/geo/1.0/reverse?lat='+lat+'&lon='+lon+'&limit=1&appid='+KEY); return r.json(); }

// Search handler
async function doSearch(){
  const q = (els('search') && els('search').value) ? els('search').value.trim() : '';
  if(!q) return toast('Type a city');
  const res = await geocode(q);
  if(res && res[0]) load(res[0].lat,res[0].lon, res[0].name + ', ' + (res[0].country||''));
  else toast('Location not found');
}

// Load weather, forecast, aqi
async function load(lat,lon, name){
  try{
    const unit = localStorage.getItem('unit') || 'metric';
    const onecallUrl = 'https://api.openweathermap.org/data/2.5/onecall?lat='+lat+'&lon='+lon+'&units='+unit+'&exclude=minutely&appid='+KEY;
    const one = await fetch(onecallUrl).then(r=>r.json());
    const aqiRes = await fetch('https://api.openweathermap.org/data/2.5/air_pollution?lat='+lat+'&lon='+lon+'&appid='+KEY).then(r=>r.json());
    // current
    const cur = one.current;
    if(els('place')) els('place').textContent = name || one.timezone;
    if(els('temp')) els('temp').textContent = Math.round(cur.temp) + (unit==='metric'?'°C':'°F');
    if(els('cond')) els('cond').textContent = cur.weather && cur.weather[0] ? cur.weather[0].description : '';
    if(els('hum')) els('hum').textContent = cur.humidity + '%';
    if(els('wind')) els('wind').textContent = Math.round(cur.wind_speed) + ' ' + (unit==='metric'?'m/s':'mph');
    if(els('feels')) els('feels').textContent = Math.round(cur.feels_like) + '°';
    if(els('aqi')) els('aqi').textContent = aqiRes && aqiRes.list && aqiRes.list[0] ? aqiRes.list[0].main.aqi : '--';
    if(els('uv')) els('uv').textContent = Math.round(cur.uvi || 0);
    setIcon(cur.weather && cur.weather[0] ? cur.weather[0].main : 'Clear');
    renderHourly(one.hourly || []);
    renderDaily(one.daily || []);
    renderAQIChart(aqiRes);
    // radar layer
    setRadarLayer('precipitation_new', lat, lon);
    localStorage.setItem('LAST', JSON.stringify({lat,lon,name}));
  }catch(e){console.error(e);toast('Failed to load weather');}
}

// Set icon
function setIcon(main){
  const key = (main||'').toLowerCase();
  const el = document.getElementById('icon');
  if(!el) return;
  el.innerHTML = '';
  let icon = '☀️';
  if(key.includes('cloud')) icon = '☁️';
  if(key.includes('rain')) icon = '🌧️';
  if(key.includes('snow')) icon = '❄️';
  if(key.includes('thunder')) icon = '⛈️';
  if(key.includes('mist')||key.includes('fog')) icon = '🌫️';
  el.textContent = icon;
}

// Hourly render + chart
function renderHourly(hours){
  const sc = document.getElementById('hourly-scroller');
  if(!sc) return;
  sc.innerHTML = '';
  const slice = hours.slice(0,24);
  slice.forEach(h=>{
    const d = new Date(h.dt*1000);
    const card = document.createElement('div'); card.className='hour-card';
    card.innerHTML = `<div>${d.getHours()}:00</div><div>${Math.round(h.temp)}°</div><div style='font-size:18px'>${h.weather && h.weather[0] ? h.weather[0].main : ''}</div>`;
    sc.appendChild(card);
  });
  // chart
  const ctx = document.getElementById('hourChart');
  if(!ctx) return;
  const ctx2 = ctx.getContext('2d');
  const labels = slice.map(h=> new Date(h.dt*1000).getHours()+':00');
  const data = slice.map(h=> Math.round(h.temp));
  if(window.hourChart) window.hourChart.destroy();
  window.hourChart = new Chart(ctx2, {type:'line',data:{labels, datasets:[{label:'Temp', data, borderWidth:2, tension:.35}]}});
}

// Daily render
function renderDaily(days){
  const el = document.getElementById('days'); if(!el) return;
  el.innerHTML='';
  days.slice(0,7).forEach(d=>{
    const date = new Date(d.dt*1000);
    const div = document.createElement('div'); div.className='day';
    div.innerHTML = `<div>${date.toLocaleDateString(undefined,{weekday:'short'})}</div><div style='font-size:20px'>${Math.round(d.temp.max)}° / ${Math.round(d.temp.min)}°</div>`;
    el.appendChild(div);
  });
}

// AQI Chart
function renderAQIChart(aqiRes){
  const parts = aqiRes && aqiRes.list && aqiRes.list[0] ? aqiRes.list[0].components : {pm2_5:0,pm10:0,no2:0,o3:0,so2:0,co:0};
  const keys = Object.keys(parts);
  const vals = keys.map(k=>Math.round(parts[k] || 0));
  const ctx = document.getElementById('aqiChart');
  if(!ctx) return;
  const ctx2 = ctx.getContext('2d');
  if(window.aqiChart) window.aqiChart.destroy();
  window.aqiChart = new Chart(ctx2, {type:'bar', data:{labels:keys, datasets:[{label:'μg/m³', data:vals}]}});
}

// Radar layer helper
function setRadarLayer(layerName, lat, lon){
  try{
    if(window.radarLayer) window.radarLayer.remove();
    window.radarLayer = L.tileLayer('https://tile.openweathermap.org/map/'+layerName+'/{z}/{x}/{y}.png?appid='+KEY, {opacity:0.6}).addTo(map);
    map.setView([lat,lon], 7);
  }catch(e){ console.error(e); }
}

// Favorites
function addFavorite(){
  const last = JSON.parse(localStorage.getItem('LAST')||'{}'); if(!last.lat) return toast('No location loaded');
  const f = JSON.parse(localStorage.getItem('FAVS')||'[]'); if(f.some(x=>x.name===last.name)) return toast('Already favorite');
  f.push(last); localStorage.setItem('FAVS', JSON.stringify(f)); renderFavs(); toast('Added to favorites');
}
function renderFavs(){
  const f = JSON.parse(localStorage.getItem('FAVS')||'[]'); const el = document.getElementById('favList'); if(!el) return;
  el.innerHTML='';
  f.forEach((item, i)=>{ const div=document.createElement('div'); div.className='fav-item'; div.textContent=item.name; div.onclick=()=>load(item.lat,item.lon,item.name); el.appendChild(div); });
}
renderFavs();

// Voice search
function startVoice(){
  try{ const SR = window.SpeechRecognition || window.webkitSpeechRecognition; if(!SR) return toast('Voice not supported'); const r = new SR(); r.lang='en-US'; r.start();
    r.onresult = (e)=>{ if(els('search')) els('search').value = e.results[0][0].transcript; doSearch(); };
  }catch(e){ toast('Voice not supported'); }
}

// Simple geocode helper for default
async function geocode(q){ return await fetch('https://api.openweathermap.org/geo/1.0/direct?q='+encodeURIComponent(q)+'&limit=1&appid='+KEY).then(r=>r.json()); }
