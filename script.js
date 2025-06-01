document.addEventListener('DOMContentLoaded', () => {
    const apiKey = 'b90b00f8c24cabb59423bca6f16d83d9';
    const cityInput = document.getElementById('cityInput');
    const searchButton = document.getElementById('searchButton');
    const loader = document.getElementById('loader');
    const errorMessage = document.getElementById('errorMessage');

    // Current Weather Elements
    const currentWeatherOrb = document.getElementById('currentWeatherOrb');
    const cityNameEl = document.getElementById('cityName');
    const weatherIconEl = document.getElementById('weatherIcon');
    const temperatureEl = document.getElementById('temperature');
    const descriptionEl = document.getElementById('description');
    const humidityEl = document.getElementById('humidity');
    const windSpeedEl = document.getElementById('windSpeed');
    const feelsLikeEl = document.getElementById('feelsLike');

    // Forecast Elements
    const forecastGrid = document.getElementById('forecastGrid');
    const showElement = (el) => {
        if (!el) return;
        if (el.classList.contains('forecast-grid')) {
            el.style.display = 'grid';
        } else if (el.classList.contains('current-weather-orb') || el.classList.contains('loader')) {
            el.style.display = 'flex';
        } else {
            el.style.display = 'block';
        }
        // Re-trigger entry animations if they exist
        el.style.animation = 'none';
        el.offsetHeight; /* trigger reflow */
        el.style.animation = '';
    };

    const hideElement = (el) => {
        if (!el) return;
        el.style.display = 'none';
    };

    const displayCurrentWeatherData = (data) => {
        if (data.cod === '404') {
            displayError(data.message || "City not found.");
            return;
        }
        if (data.cod !== 200) { // Check for other API errors
            displayError(data.message || "Could not fetch current weather.");
            return;
        }

        cityNameEl.textContent = data.name;
        weatherIconEl.src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
        weatherIconEl.alt = data.weather[0].description;
        temperatureEl.textContent = `${Math.round(data.main.temp)}°C`; // Assumes units=metric
        descriptionEl.textContent = data.weather[0].description;
        humidityEl.textContent = data.main.humidity;
        windSpeedEl.textContent = data.wind.speed.toFixed(1);
        feelsLikeEl.textContent = `${Math.round(data.main.feels_like)}°C`; // Assumes units=metric

        showElement(currentWeatherOrb);
    };

    const displayForecastData = (data) => {
        if (data.cod !== "200") { // Forecast API uses string "200" for success
             // Don't necessarily show a blocking error for forecast if current weather worked
            console.warn("Could not fetch forecast data:", data.message);
            hideElement(forecastGrid); // Just hide it
            return;
        }

        forecastGrid.innerHTML = ''; // Clear previous forecast

        const dailyForecasts = {};
        data.list.forEach(item => {
            const date = new Date(item.dt_txt.split(' ')[0]);
            const dayKey = date.toISOString().split('T')[0];

            if (!dailyForecasts[dayKey]) {
                dailyForecasts[dayKey] = {
                    temps: [],
                    icons: [],
                    descriptions: [],
                    date: date
                };
            }
            dailyForecasts[dayKey].temps.push(item.main.temp);
            dailyForecasts[dayKey].icons.push(item.weather[0].icon);
            dailyForecasts[dayKey].descriptions.push(item.weather[0].description);
        });

        const forecastDaysToShow = [];
        let count = 0;
        const todayKey = new Date().toISOString().split('T')[0];

        for (const dayKey in dailyForecasts) {
            if (dayKey === todayKey && new Date().getHours() > 15) continue;
            if (count >= 4) break;

            const dayData = dailyForecasts[dayKey];
            const avgTemp = dayData.temps.reduce((a, b) => a + b, 0) / dayData.temps.length;
            const iconCounts = {};
            dayData.icons.forEach(icon => iconCounts[icon] = (iconCounts[icon] || 0) + 1);
            const mostCommonIcon = Object.keys(iconCounts).reduce((a, b) => iconCounts[a] > iconCounts[b] ? a : b, dayData.icons[0]);
            const descCounts = {};
            dayData.descriptions.forEach(desc => descCounts[desc] = (descCounts[desc] || 0) + 1);
            const mostCommonDesc = Object.keys(descCounts).reduce((a, b) => descCounts[a] > descCounts[b] ? a : b, dayData.descriptions[0]);

            forecastDaysToShow.push({
                date: dayData.date,
                temp: Math.round(avgTemp),
                icon: mostCommonIcon,
                description: mostCommonDesc
            });
            count++;
        }
        
        if (forecastDaysToShow.length > 0) {
            forecastDaysToShow.forEach((day, index) => {
                const card = document.createElement('div');
                card.classList.add('forecast-card');
                card.style.animationDelay = `${index * 0.1}s`;

                const dayName = day.date.toLocaleDateString('en-US', { weekday: 'short' });

                card.innerHTML = `
                    <h4>${dayName}</h4>
                    <img src="https://openweathermap.org/img/wn/${day.icon}@2x.png" alt="${day.description}">
                    <p class="temp">${day.temp}°C</p>
                    <p class="desc">${day.description}</p>
                `;
                forecastGrid.appendChild(card);
            });
            showElement(forecastGrid);
        } else {
            hideElement(forecastGrid);
        }
    };

    const displayError = (message) => {
        errorMessage.textContent = `Error: ${message.charAt(0).toUpperCase() + message.slice(1)}.`;
        showElement(errorMessage);
        hideElement(currentWeatherOrb);
        hideElement(forecastGrid);
        hideElement(loader);
    };

    const getWeather = () => {
        const city = cityInput.value.trim();

        if (!city) {
            displayError("Please enter a city name.");
            return;
        }

        if (apiKey === 'YOUR_ACTUAL_API_KEY' || !apiKey) {
            displayError("API Key not configured. Please add it to script.js.");
            return;
        }

        // Reset UI for new search
        hideElement(currentWeatherOrb);
        hideElement(forecastGrid);
        hideElement(errorMessage);
        showElement(loader);
        loader.querySelector('p').textContent = "Fetching Cosmic Data...";


        const currentWeatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;
        const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}&units=metric`;

        // Use Promise.allSettled to fetch both, even if one fails
        Promise.allSettled([
            fetch(currentWeatherUrl).then(response => {
                if (!response.ok) {
                    return response.json().then(errData => Promise.reject(errData)); // Throw API error object
                }
                return response.json();
            }),
            fetch(forecastUrl).then(response => {
                if (!response.ok) {
                     return response.json().then(errData => Promise.reject(errData));
                }
                return response.json();
            })
        ])
        .then(results => {
            hideElement(loader);
            const [currentResult, forecastResult] = results;

            let currentSuccess = false;

            if (currentResult.status === 'fulfilled') {
                displayCurrentWeatherData(currentResult.value);
                currentSuccess = true; // Mark current weather as successful
            } else {
                // Handle error from current weather fetch (might be 404 or other)
                const errorData = currentResult.reason;
                displayError(errorData.message || "Failed to fetch current weather.");
            }

            if (forecastResult.status === 'fulfilled') {
                displayForecastData(forecastResult.value);
            } else {
                // Log forecast error but don't necessarily block UI if current weather succeeded
                console.warn("Forecast fetch failed:", forecastResult.reason.message);
                if (currentSuccess) { // If current weather was ok, just hide forecast
                    hideElement(forecastGrid);
                } else { // If current also failed, the main error message is already shown
                     hideElement(forecastGrid);
                }
            }
        })
        .catch(error => {
            // This catch is for network errors or truly unexpected issues before .then()
            console.error('Overall fetch error:', error);
            hideElement(loader);
            displayError("A network error occurred or the service is unavailable.");
        });
    };

    searchButton.addEventListener('click', getWeather);
    cityInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            getWeather();
        }
    });

    // Initial UI State
    hideElement(currentWeatherOrb);
    hideElement(forecastGrid);
    hideElement(errorMessage);
    if (apiKey === 'YOUR_ACTUAL_API_KEY' || !apiKey) {
        displayError("API Key not configured in script.js.");
    } else {
        loader.querySelector('p').textContent = "Awaiting Transmission...";
        showElement(loader); // Show loader with initial message
        setTimeout(() => { // Hide loader if no auto-search
            if (currentWeatherOrb.style.display === 'none' && errorMessage.style.display === 'none') {
                 loader.querySelector('p').textContent = "Enter a city to begin your scan.";
            }
        }, 2000);
    }
});