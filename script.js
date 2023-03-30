'use strict';

// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

class Workout {
  date = new Date();
  id = crypto.randomUUID();

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat, lng]
    this.distance = distance; // in miles
    this.duration = duration; // in minutes
  }
}

class Running extends Workout {
  type = "running";

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
  }

  // minutes/mile
  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = "cycling";

  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
  }

  // miles/hour
  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

///////////////////////////////////////////////////////////////
// APPLICATION ARCHITECTURE

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

  constructor() {
    this._getPosition();
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
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

    this.#map = L.map('map').setView(coords, 10);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(this.#map);

    // Handling clicks on the map
    this.#map.on('click', this._showForm.bind(this));
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    // Helper form input validation functions
    const validInputs = (...inputs) => {
      return inputs.every(input => Number.isFinite(input));
    }
    const allPositive = (...inputs) => {
      return inputs.every(input => input > 0);
    }

    // Prevent form submission (page reload)
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
    console.log(workout);

    this.renderWorkoutMarker(workout);

    // Clear the form input fields && Hide form
    inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = "";
    form.classList.toggle('hidden');
  }

  // Render workout on map as marker
  renderWorkoutMarker(workout) {
    L.marker(workout.coords, {
      draggable: true
    })
      .addTo(this.#map)
      .bindPopup(L.popup({
        maxWidth: 250,
        minWidth: 100,
        className: `${workout.type}-popup`
      }))
      .setPopupContent("workout")
      .openPopup();
  }
}

const app = new App();
