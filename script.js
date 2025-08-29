const API_KEY = "api";
let currentUnit = "metric"; // 'metric' for °C, 'imperial' for °F
let isCelsius = true;
let lastQuery = null;

document.getElementById("search-btn").addEventListener("click", () => {
  const city = document.getElementById("city-input").value.trim();
  if (city) {
    clearMessages();
    lastQuery = { type: "city", value: city };
    fetchWeather(city);
  }
});

document.getElementById("geo-btn").addEventListener("click", () => {
  clearMessages();
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        lastQuery = { type: "coords", value: { lat: latitude, lon: longitude } };
        fetchWeatherByCoords(latitude, longitude);
      },
      () => showError("Geolocation permission denied.")
    );
  } else {
    showError("Geolocation is not supported by this browser.");
  }
});

document.getElementById("unit-toggle-btn").addEventListener("click", () => {
  isCelsius = !isCelsius;
  currentUnit = isCelsius ? "metric" : "imperial";
  document.getElementById("unit-toggle-btn").textContent = isCelsius ? "Switch to °F" : "Switch to °C";

  if (lastQuery) {
    if (lastQuery.type === "city") fetchWeather(lastQuery.value);
    else if (lastQuery.type === "coords") fetchWeatherByCoords(lastQuery.value.lat, lastQuery.value.lon);
  }
});

async function fetchWeather(city) {
  try {
    setLoading(true, "Searching...");
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=${currentUnit}`
    );
    if (!response.ok) {
      const errText = await safeReadText(response);
      throw new Error(errText || "City not found.");
    }
    const data = await response.json();
    displayWeather(data);
    fetchForecast(city);
  } catch (error) {
    showError(error.message);
  } finally {
    setLoading(false);
  }
}

async function fetchWeatherByCoords(lat, lon) {
  try {
    setLoading(true, "Getting location weather...");
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${currentUnit}`
    );
    if (!response.ok) {
      const errText = await safeReadText(response);
      throw new Error(errText || "Failed to get weather for location.");
    }
    const data = await response.json();
    displayWeather(data);
    fetchForecast(data.name); // Use city name
  } catch (error) {
    showError(error.message);
  } finally {
    setLoading(false);
  }
}

async function fetchForecast(city) {
  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${API_KEY}&units=${currentUnit}`
    );
    if (!response.ok) {
      const errText = await safeReadText(response);
      throw new Error(errText || "Forecast data unavailable.");
    }
    const data = await response.json();
    displayForecast(data);
  } catch (error) {
    showError(error.message);
  }
}

function displayWeather(data) {
  const weatherInfo = document.getElementById("weather-info");
  const iconUrl = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
  const unitLabel = isCelsius ? "°C" : "°F";

  weatherInfo.innerHTML = `
    <h2>${data.name}, ${data.sys.country}</h2>
    <img src="${iconUrl}" alt="Weather Icon">
    <p>🌡️ Temp: ${data.main.temp}${unitLabel}</p>
    <p>💧 Humidity: ${data.main.humidity}%</p>
    <p>🌬️ Wind: ${data.wind.speed} ${isCelsius ? "m/s" : "mph"}</p>
    <p>☁️ Conditions: ${data.weather[0].description}</p>
  `;
}

function displayForecast(data) {
  const forecastDiv = document.getElementById("forecast-info");
  forecastDiv.innerHTML = "<h3>5-Day Forecast</h3>";

  const forecasts = data.list.filter(entry => entry.dt_txt.includes("12:00:00"));
  const unitLabel = isCelsius ? "°C" : "°F";

  forecasts.slice(0, 5).forEach(entry => {
    const date = new Date(entry.dt_txt).toLocaleDateString(undefined, {
      weekday: "short", month: "short", day: "numeric"
    });
    const iconUrl = `https://openweathermap.org/img/wn/${entry.weather[0].icon}@2x.png`;

    forecastDiv.innerHTML += `
      <div class="forecast-card">
        <p><strong>${date}</strong></p>
        <img src="${iconUrl}" alt="Icon" width="50">
        <p>${entry.main.temp}${unitLabel}</p>
        <p>${entry.weather[0].main}</p>
      </div>
    `;
  });
}

function showError(message) {
  document.getElementById("error-message").textContent = message;
  document.getElementById("weather-info").innerHTML = "";
  document.getElementById("forecast-info").innerHTML = "";
}

function clearMessages() {
  document.getElementById("error-message").textContent = "";
  document.getElementById("weather-info").innerHTML = "";
  document.getElementById("forecast-info").innerHTML = "";
}

// Loading state helpers
function setLoading(isLoading, message) {
  const searchBtn = document.getElementById("search-btn");
  const geoBtn = document.getElementById("geo-btn");
  const unitBtn = document.getElementById("unit-toggle-btn");
  const input = document.getElementById("city-input");

  [searchBtn, geoBtn, unitBtn, input].forEach((el) => {
    if (!el) return;
    el.disabled = isLoading;
    if (isLoading) {
      el.setAttribute("aria-busy", "true");
    } else {
      el.removeAttribute("aria-busy");
    }
  });

  const weatherInfo = document.getElementById("weather-info");
  if (isLoading) {
    weatherInfo.innerHTML = `<p>${message || "Loading..."}</p>`;
  }
}

async function safeReadText(response) {
  try {
    const text = await response.text();
    if (!text) return "";
    try {
      const obj = JSON.parse(text);
      return obj.message || text;
    } catch (_) {
      return text;
    }
  } catch (_) {
    return "";
  }
}

//  Dark/Light Mode Toggle
const themeToggleBtn = document.getElementById("theme-toggle-btn");
const savedTheme = localStorage.getItem("theme");

if (savedTheme === "dark") {
  document.body.classList.add("dark");
  themeToggleBtn.textContent = "Switch to Light Mode";
}

themeToggleBtn.addEventListener("click", () => {
  document.body.classList.toggle("dark");
  const isDark = document.body.classList.contains("dark");
  themeToggleBtn.textContent = isDark ? "Switch to Light Mode" : "Switch to Dark Mode";
  localStorage.setItem("theme", isDark ? "dark" : "light");
});

// Enter key to trigger search
document.getElementById("city-input").addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    document.getElementById("search-btn").click();
  }
});

