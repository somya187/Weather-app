// Global variables
        let currentUnit = 'metric';
        let recentSearches = []; // In real implementation, use localStorage
        const API_KEY = '08e69f849f5de582c895f19fc1aad4cf'; // Free OpenWeatherMap API key

        // Weather icon mapping
        const weatherIcons = {
            '01d': '☀️', '01n': '🌙', '02d': '⛅', '02n': '☁️',
            '03d': '☁️', '03n': '☁️', '04d': '☁️', '04n': '☁️',
            '09d': '🌧️', '09n': '🌧️', '10d': '🌦️', '10n': '🌧️',
            '11d': '⛈️', '11n': '⛈️', '13d': '❄️', '13n': '❄️',
            '50d': '🌫️', '50n': '🌫️'
        };

        // Initialize app
        function init() {
            updateDateTime();
            loadRecentSearches();
            
            // Auto-search for user's location
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const { latitude, longitude } = position.coords;
                        fetchWeatherByCoords(latitude, longitude);
                    },
                    (error) => {
                        console.log('Geolocation not available');
                    }
                );
            }
        }

        // Theme toggle
        function toggleTheme() {
            const body = document.body;
            const themeToggle = document.querySelector('.theme-toggle');
            
            if (body.getAttribute('data-theme') === 'dark') {
                body.setAttribute('data-theme', 'light');
                themeToggle.innerHTML = '☀️ Light Mode';
            } else {
                body.setAttribute('data-theme', 'dark');
                themeToggle.innerHTML = '🌙 Dark Mode';
            }
        }

        // Unit toggle
        function setUnit(unit) {
            currentUnit = unit;
            document.querySelectorAll('.unit-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            document.querySelector(`[data-unit="${unit}"]`).classList.add('active');
            
            // If weather data exists, refresh with new unit
            const cityName = document.getElementById('cityName').textContent;
            if (cityName !== 'Loading...') {
                searchWeatherByName(cityName);
            }
        }

        // Search weather
        function searchWeather(event) {
            event.preventDefault();
            const city = document.getElementById('cityInput').value.trim();
            if (city) {
                searchWeatherByName(city);
                addToRecentSearches(city);
            }
        }

        // Search weather by city name
        async function searchWeatherByName(city) {
            showLoading();
            
            try {
                const response = await fetch(
                    `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=${currentUnit}`
                );
                
                if (!response.ok) {
                    throw new Error('City not found');
                }
                
                const data = await response.json();
                await displayCurrentWeather(data);
                await fetchForecast(data.coord.lat, data.coord.lon);
                
                document.getElementById('cityInput').value = '';
                hideLoading();
                showWeatherContent();
                
            } catch (error) {
                hideLoading();
                showError();
            }
        }

        // Fetch weather by coordinates
        async function fetchWeatherByCoords(lat, lon) {
            showLoading();
            
            try {
                const response = await fetch(
                    `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${currentUnit}`
                );
                
                const data = await response.json();
                await displayCurrentWeather(data);
                await fetchForecast(lat, lon);
                
                hideLoading();
                showWeatherContent();
                
            } catch (error) {
                hideLoading();
                showError();
            }
        }

        // Display current weather
        async function displayCurrentWeather(data) {
            const temp = Math.round(data.main.temp);
            const feelsLike = Math.round(data.main.feels_like);
            const unitSymbol = currentUnit === 'metric' ? '°C' : '°F';
            const windUnit = currentUnit === 'metric' ? 'km/h' : 'mph';
            const windSpeed = currentUnit === 'metric' ? 
                Math.round(data.wind.speed * 3.6) : Math.round(data.wind.speed);

            document.getElementById('cityName').textContent = `${data.name}, ${data.sys.country}`;
            document.getElementById('temperature').textContent = `${temp}${unitSymbol}`;
            document.getElementById('condition').textContent = data.weather[0].description
                .split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
            document.getElementById('feelsLike').textContent = `Feels like ${feelsLike}${unitSymbol}`;
            
            document.getElementById('humidity').textContent = `${data.main.humidity}%`;
            document.getElementById('windSpeed').textContent = `${windSpeed} ${windUnit}`;
            document.getElementById('pressure').textContent = `${data.main.pressure} hPa`;
            document.getElementById('visibility').textContent = `${(data.visibility / 1000).toFixed(1)} km`;
            
    
            // Weather icon
            const iconCode = data.weather[0].icon;
            document.getElementById('weatherIcon').textContent = weatherIcons[iconCode] || '☀️';
            
            // Sun times
            const sunrise = new Date(data.sys.sunrise * 1000).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
            const sunset = new Date(data.sys.sunset * 1000).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
            
            document.getElementById('sunrise').textContent = sunrise;
            document.getElementById('sunset').textContent = sunset;
        }

        // Fetch 3-day forecast
        async function fetchForecast(lat, lon) {
            try {
                const response = await fetch(
                    `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${currentUnit}`
                );
                
                const data = await response.json();
                displayForecast(data);
                
            } catch (error) {
                console.error('Failed to fetch forecast:', error);
            }
        }

        // Display forecast
        function displayForecast(data) {
            const forecastGrid = document.getElementById('forecastGrid');
            forecastGrid.innerHTML = '';
            
            // Get daily forecasts (one per day for next 3 days)
            const dailyForecasts = [];
            const today = new Date().getDate();
            
            data.list.forEach(item => {
                const date = new Date(item.dt * 1000);
                const day = date.getDate();
                
                // Skip today and get one forecast per day
                if (day !== today && !dailyForecasts.some(f => new Date(f.dt * 1000).getDate() === day)) {
                    dailyForecasts.push(item);
                }
            });

            // Take only first 3 days
            dailyForecasts.slice(0, 3).forEach(forecast => {
                const date = new Date(forecast.dt * 1000);
                const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
                const temp = Math.round(forecast.main.temp);
                const unitSymbol = currentUnit === 'metric' ? '°C' : '°F';
                const iconCode = forecast.weather[0].icon;
                const icon = weatherIcons[iconCode] || '☀️';
                const description = forecast.weather[0].description
                    .split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

                const forecastCard = document.createElement('div');
                forecastCard.className = 'forecast-card';
                forecastCard.innerHTML = `
                    <h4>${dayName}</h4>
                    <div class="forecast-icon">${icon}</div>
                    <div class="forecast-temp">${temp}${unitSymbol}</div>
                    <div class="forecast-desc">${description}</div>
                `;

                forecastGrid.appendChild(forecastCard);
            });
        }

        // Recent searches functionality
        function addToRecentSearches(city) {
            if (!recentSearches.includes(city)) {
                recentSearches.unshift(city);
                if (recentSearches.length > 5) {
                    recentSearches.pop();
                }
                updateRecentSearches();
                // In real implementation: localStorage.setItem('recentSearches', JSON.stringify(recentSearches));
            }
        }

        function loadRecentSearches() {
            // In real implementation: recentSearches = JSON.parse(localStorage.getItem('recentSearches') || '[]');
            recentSearches = ['New York', 'London', 'Tokyo']; // Sample data
            updateRecentSearches();
        }

        function updateRecentSearches() {
            const recentTags = document.getElementById('recentTags');
            recentTags.innerHTML = '';
            
            recentSearches.forEach(city => {
                const tag = document.createElement('div');
                tag.className = 'recent-tag';
                tag.textContent = city;
                tag.onclick = () => {
                    searchWeatherByName(city);
                };
                recentTags.appendChild(tag);
            });
        }

        // UI state management
        function showLoading() {
            document.getElementById('loadingState').classList.remove('hidden');
            document.getElementById('weatherContent').classList.add('hidden');
            document.getElementById('errorState').classList.add('hidden');
            document.getElementById('searchBtn').disabled = true;
            document.getElementById('searchBtn').textContent = '🔄 Loading...';
        }

        function hideLoading() {
            document.getElementById('loadingState').classList.add('hidden');
            document.getElementById('searchBtn').disabled = false;
            document.getElementById('searchBtn').innerHTML = '🔍 Search';
        }

        function showWeatherContent() {
            document.getElementById('weatherContent').classList.remove('hidden');
            document.getElementById('errorState').classList.add('hidden');
        }

        function showError() {
            document.getElementById('errorState').classList.remove('hidden');
            document.getElementById('weatherContent').classList.add('hidden');
        }

        // Update date and time
        function updateDateTime() {
            const now = new Date();
            const options = { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            };
            document.getElementById('currentDate').textContent = now.toLocaleDateString('en-US', options);
        }

        // Initialize app when page loads
        document.addEventListener('DOMContentLoaded', init);