"use strict";

///////////////////////////////////////////////////////////////
// APPLICATION CLASSES

class Workout {
  date = new Date();
  id = crypto.randomUUID();
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat, lng]
    this.distance = distance; // in miles
    this.duration = duration; // in minutes
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
  }

  // Used to log the amount of times a workout is clicked
  // *** NOTE: AN OBJECT RETRIEVED FROM LOCAL STORAGE WILL NOT INCLUDE ALL THE METHODS IT INHERITED WHEN IT WAS ORIGINALLY CREATED ***
  clicked() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = "running";

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  // minutes/mile
  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = "cycling";

  constructor(coords, distance, duration, elevation) {
    super(coords, distance, duration);
    this.elevation = elevation;
    this.calcSpeed();
    this._setDescription();
  }

  // miles/hour
  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

///////////////////////////////////////////////////////////////
// APPLICATION ARCHITECTURE

const deleteButton = document.querySelector('.delete__workouts');
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class App {
  #map;
  #mapEvent;
  #workouts = [];
  #mapZoomView = 10;

  constructor() {
    // Get user's location
    this._getPosition();

    // Get data from local storage
    this._getLocalStorage();

    // Attach event handlers
    deleteButton.addEventListener('click', this._deleteAllWorkouts);
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), function () {
        alert('Could not get your location!');
      });
    }
  }

  _loadMap(position) {
    const {latitude, longitude} = position.coords;
    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, this.#mapZoomView);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(this.#map);

    // Handling clicks on the map
    this.#map.on('click', this._showForm.bind(this));

    // After the map loads, get workouts from local storage and display them on the map
    this.#workouts.forEach(workout => {
      this._renderWorkoutMarker(workout);
    });
  }

  // After user clicks on map to create a marker, display the workout form
  _showForm(mapE) {
    console.log(mapE);
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  // Clear the form input fields && Hide form
  _hideForm() {
    inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = "";
    form.style.display = "none";
    form.classList.add('hidden');
    setTimeout(() => {
      form.style.display = "grid";
    }, 1000);
  }

  // If the user selects cycling workout, display the elevation gain input field and hide the cadence input field for running
  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  // If the user clicks on a workout from the sidebar list, have the map navigate and display where that workout marker was created
  _moveToPopup(e) {
    const workoutElement = e.target.closest(".workout");

    if (!workoutElement) return;

    const workout = this.#workouts.find(workout => workout.id === workoutElement.dataset.id);

    this.#map.setView(workout.coords, this.#mapZoomView, {
      animate: true,
      pan: {
        duration: 1
      }
    });

    // Using the public interface
    workout.clicked();
  }

  // Render workout on map as marker
  _renderWorkoutMarker(workout) {
    L.marker(workout.coords, {
      draggable: true
    })
      .addTo(this.#map)
      .bindPopup(L.popup({
        maxWidth: 250,
        minWidth: 100,
        className: `${workout.type}-popup`
      }))
      .setPopupContent(`${workout.type === "running" ? "🏃" : "🚴‍"} ${workout.description}`)
      .openPopup();
  }

  // Render workout on list
  _renderWorkout(workout) {
    let html = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
        <h2 class="workout__title">${workout.description}</h2>
        <div class="workout__details">
          <span class="workout__icon">${workout.type === "running" ? "🏃" : "🚴‍"}‍️</span>
          <span class="workout__value">${workout.distance}</span>
          <span class="workout__unit">miles</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${workout.duration}</span>
          <span class="workout__unit">minutes</span>
        </div>
       `;

    if (workout.type === "running") {
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.pace.toFixed(1)}</span>
          <span class="workout__unit">min/mi</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">🦶🏼</span>
          <span class="workout__value">${workout.cadence}</span>
          <span class="workout__unit">spm</span>
        </div>
      </li>
    `;
    }

    if (workout.type === "cycling") {
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.speed.toFixed(1)}</span>
          <span class="workout__unit">mph</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⛰</span>
          <span class="workout__value">${workout.elevation}</span>
          <span class="workout__unit">m</span>
        </div>
        </li>
      `;
    }

    form.insertAdjacentHTML('afterend', html);
  }

  // Store workouts in local storage
  _setLocalStorage() {
    localStorage.setItem("workouts", JSON.stringify(this.#workouts));
  }

  // Get workouts from local storage
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem("workouts"));

    if (!data) return;

    this.#workouts = data;

    this.#workouts.forEach(workout => {
      this._renderWorkout(workout);
    });
  }

  // Display the delete all workouts button
  _showDeleteAllWorkoutsButton() {
    deleteButton.classList.remove('hidden');
  }

  // Hide the delete all workouts button
  _hideDeleteAllWorkoutsButton() {
    deleteButton.classList.add('hidden');
  }

  // Delete workouts from local storage
  _deleteAllWorkouts() {
    localStorage.removeItem("workouts");
    location.reload();
    this._hideDeleteAllWorkoutsButton();
  }

  // Create a new workout object when the user submits the form
  _newWorkout(e) {
    // Form input validation helper functions
    const validInputs = (...inputs) => {
      return inputs.every(input => Number.isFinite(input));
    }
    const allPositive = (...inputs) => {
      return inputs.every(input => input > 0);
    }

    // Prevent page reload
    e.preventDefault();

    // Get data from form fields
    const input = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;

    // Coordinates variables containing coords data when user clicks on the map
    const {lat, lng} = this.#mapEvent.latlng;

    // Declare workout variable
    let workout;

    // If running workout, create a running object
    if (input === 'running') {
      const cadence = +inputCadence.value;
      // Check if data is valid
      if (!validInputs(distance, duration, cadence) || !allPositive(distance, duration, cadence)) {
        return alert("Input must be a positive number!");
      }
      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // If cycling workout, create a cycling object
    if (input === 'cycling') {
      const elevation = +inputElevation.value;
      // Check if data is valid
      if (!validInputs(distance, duration, elevation) || !allPositive(distance, duration)) {
        return alert("Input must be a positive number!");
      }
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // Add new object to workout array
    this.#workouts.push(workout);

    // Render workout on map as marker
    this._renderWorkoutMarker(workout);

    // Render workout on list
    this._renderWorkout(workout);

    // Clear the form input fields && Hide form
    this._hideForm();

    // Store workouts in local storage
    this._setLocalStorage();

    // Display the delete all workouts button
    this._showDeleteAllWorkoutsButton();
  }
}

const app = new App();

// Additional Features:
// TODO:
//  Ability to edit a workout
//  Ability to delete a specific workout
//  Ability to sort workouts by a certain field (distance, duration, etc.)
//  Re-build Running and Cycling objects retrieved from local storage to fix the error where the 'clicked' function gets removed from the object
//  More error and confirmation messages
//  Ability to position the map to show all workouts on the map
//  Ability to draw lines/shapes instead of just points
//  Geocode location from coordinates ("Run in {insert location from coordinates}")
//  Display weather data for workout time and place
