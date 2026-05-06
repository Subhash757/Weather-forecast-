// State
let isCelsius = true;
let currentWeatherData = null;

// DOM Elements
const body = document.getElementById('body');
const cityInput = document.getElementById('city-input');
const searchBtn = document.getElementById('search-btn');
const dateTimeEl = document.getElementById('date-time');
const celsiusBtn = document.getElementById('celsius');
const fahrenheitBtn = document.getElementById('fahrenheit');

const errorMessage = document.getElementById('error-message');
const errorText = document.getElementById('error-text');
const loading = document.getElementById('loading');
const weatherContent = document.getElementById('weather-content');

// Weather Elements
const weatherIcon = document.getElementById('weather-icon');
const tempValue = document.getElementById('temp-value');
const tempUnit = document.getElementById('temp-unit');
const weatherDesc = document.getElementById('weather-desc');
const cityName = document.getElementById('city-name');
const humidity = document.getElementById('humidity');
const windSpeed = document.getElementById('wind-speed');
const feelsLike = document.getElementById('feels-like');

// Event Listeners
searchBtn.addEventListener('click', handleSearch);
cityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearch();
});
celsiusBtn.addEventListener('click', () => setUnit(true));
fahrenheitBtn.addEventListener('click', () => setUnit(false));

// Initialization
updateDateTime();
setInterval(updateDateTime, 1000); // Update clock every second
fetchWeather('London'); // Default city

// Core Functions
async function handleSearch() {
    const city = cityInput.value.trim();
    if (!city) return;
    
    await fetchWeather(city);
    cityInput.value = '';
}

async function fetchWeather(city) {
    showLoading();
    
    try {
        // Step 1: Geocoding (Convert city name to lat/lon)
        const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
        const geoResponse = await fetch(geoUrl);
        const geoData = await geoResponse.json();
        
        if (!geoData.results || geoData.results.length === 0) {
            throw new Error('City not found');
        }
        
        const location = geoData.results[0];
        const lat = location.latitude;
        const lon = location.longitude;
        const displayName = `${location.name}${location.country ? ', ' + location.country : ''}`;
        
        // Step 2: Fetch Weather Data using lat/lon
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m&timezone=auto`;
        const weatherResponse = await fetch(weatherUrl);
        const weatherData = await weatherResponse.json();
        
        if (weatherData.error) {
            throw new Error('Failed to fetch weather data');
        }
        
        currentWeatherData = {
            city: displayName,
            tempC: weatherData.current.temperature_2m,
            feelsLikeC: weatherData.current.apparent_temperature,
            humidity: weatherData.current.relative_humidity_2m,
            windSpeed: weatherData.current.wind_speed_10m, // km/h
            isDay: weatherData.current.is_day,
            code: weatherData.current.weather_code
        };
        
        updateUI();
        
    } catch (error) {
        showError(error.message);
    }
}

function updateUI() {
    if (!currentWeatherData) return;
    
    hideLoading();
    
    // Calculate temperatures based on selected unit
    const displayTemp = isCelsius ? currentWeatherData.tempC : (currentWeatherData.tempC * 9/5) + 32;
    const displayFeelsLike = isCelsius ? currentWeatherData.feelsLikeC : (currentWeatherData.feelsLikeC * 9/5) + 32;
    const unitStr = isCelsius ? '°C' : '°F';
    
    // Update DOM
    cityName.textContent = currentWeatherData.city;
    tempValue.textContent = Math.round(displayTemp);
    tempUnit.textContent = unitStr;
    feelsLike.textContent = `${Math.round(displayFeelsLike)}${unitStr}`;
    humidity.textContent = `${currentWeatherData.humidity}%`;
    windSpeed.textContent = `${currentWeatherData.windSpeed} km/h`;
    
    // Map Weather Code to descriptions and icons (WMO Weather interpretation codes)
    const weatherInfo = mapWeatherCode(currentWeatherData.code, currentWeatherData.isDay);
    weatherDesc.textContent = weatherInfo.description;
    
    // Update Icon
    weatherIcon.className = weatherInfo.iconClass;
    
    // Update Background
    updateBackground(weatherInfo.type, currentWeatherData.isDay);
    
    weatherContent.classList.remove('hidden');
}

function mapWeatherCode(code, isDay) {
    // Basic mapping for Open-Meteo WMO codes
    if (code === 0) {
        return { type: 'sunny', description: 'Clear sky', iconClass: isDay ? 'fa-solid fa-sun' : 'fa-solid fa-moon' };
    } else if (code === 1 || code === 2) {
        return { type: 'cloudy', description: 'Partly cloudy', iconClass: isDay ? 'fa-solid fa-cloud-sun' : 'fa-solid fa-cloud-moon' };
    } else if (code === 3) {
        return { type: 'cloudy', description: 'Overcast', iconClass: 'fa-solid fa-cloud' };
    } else if (code === 45 || code === 48) {
        return { type: 'cloudy', description: 'Fog', iconClass: 'fa-solid fa-smog' };
    } else if (code >= 51 && code <= 67) {
        return { type: 'rainy', description: 'Rain', iconClass: 'fa-solid fa-cloud-rain' };
    } else if (code >= 71 && code <= 82) {
        return { type: 'snowy', description: 'Snow', iconClass: 'fa-solid fa-snowflake' };
    } else if (code >= 95) {
        return { type: 'rainy', description: 'Thunderstorm', iconClass: 'fa-solid fa-cloud-bolt' };
    }
    
    // Default
    return { type: 'sunny', description: 'Clear', iconClass: isDay ? 'fa-solid fa-sun' : 'fa-solid fa-moon' };
}

function updateBackground(type, isDay) {
    // Remove all possible weather classes
    body.className = '';
    
    if (!isDay) {
        body.classList.add('night');
    } else {
        body.classList.add(type);
    }
}

function setUnit(celsius) {
    if (isCelsius === celsius) return; // No change
    
    isCelsius = celsius;
    
    // Update toggle UI
    if (isCelsius) {
        celsiusBtn.classList.add('active');
        fahrenheitBtn.classList.remove('active');
    } else {
        celsiusBtn.classList.remove('active');
        fahrenheitBtn.classList.add('active');
    }
    
    // Re-render UI with new unit
    if (currentWeatherData) {
        updateUI();
    }
}

function updateDateTime() {
    const now = new Date();
    const options = { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    dateTimeEl.textContent = now.toLocaleDateString('en-US', options);
}

function showLoading() {
    errorMessage.classList.add('hidden');
    weatherContent.classList.add('hidden');
    loading.classList.remove('hidden');
}

function hideLoading() {
    loading.classList.add('hidden');
}

function showError(msg) {
    hideLoading();
    weatherContent.classList.add('hidden');
    errorText.textContent = msg;
    errorMessage.classList.remove('hidden');
}
