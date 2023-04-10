"use strict";

///////////////////////////////////////////////////////////////
// APPLICATION CLASSES

class Workout {
  id = crypto.randomUUID();
  date = new Date();
  clicks = 0;
  coords;
  distance;
  duration;
  description;

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

  // Getters & Setters
  get id() {
    return this.id;
  }

  set id(id) {
    this.id = id;
  }

  get date() {
    return this.date;
  }

  set date(date) {
    this.date = date;
  }

  get clicks() {
    return this.clicks;
  }

  set clicks(clicks) {
    this.clicks = clicks;
  }

  get coords() {
    return this.coords;
  }

  set coords(coords) {
    this.coords = coords;
  }

  get distance() {
    return this.distance;
  }

  set distance(distance) {
    this.distance = distance;
  }

  get duration() {
    return this.duration;
  }

  set duration(duration) {
    this.duration = duration;
  }

  get description() {
    return this.description;
  }

  set description(description) {
    this.description = description;
  }
}

class Running extends Workout {
  type = "running";
  cadence;
  pace;

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this._calcPace();
    this._setDescription();
    this.cadence = cadence;
  }

  // minutes/mile
  _calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }

  // Getters & Setters
  get type() {
    return this.type;
  }

  set type(type) {
    this.type = type;
  }

  get cadence() {
    return this.cadence;
  }

  set cadence(cadence) {
    this.cadence = cadence;
  }

  get pace() {
    return this.pace;
  }

  set pace(pace) {
    this.pace = pace;
  }
}

class Cycling extends Workout {
  type = "cycling";
  elevation;
  speed;

  constructor(coords, distance, duration, elevation) {
    super(coords, distance, duration);
    this._calcSpeed();
    this._setDescription();
    this.elevation = elevation;
  }

  // miles/hour
  _calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }

  // Getters & Setters
  get type() {
    return this.type;
  }

  set type(type) {
    this.type = type;
  }

  get elevation() {
    return this.elevation;
  }

  set elevation(elevation) {
    this.elevation = elevation;
  }

  get speed() {
    return this.speed;
  }

  set speed(speed) {
    this.speed = speed;
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
const deleteAllWorkoutsButton = document.querySelector('.workouts__modify-delete-all');

class App {
  #map;
  #mapEvent;
  #markers = [];
  #workouts = [];
  #mapZoomView = 10;

  constructor() {
    // Get user's location
    this._getPosition();

    // Get data from local storage
    this._getLocalStorage();

    // Attach event handlers
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    deleteAllWorkoutsButton.addEventListener('click', this._deleteAllWorkouts);
    document.addEventListener('click', this._closeModalOnBackgroundClick.bind(this));
  }

  _getPosition() {
    navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), function () {
      alert('Could not get your location!');
    });
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

  // open modal by id
  _openModal() {
    document.getElementById('edit-modal').classList.add('open');
    document.body.classList.add('edit-modal-open');
  }

  // close modal
  _closeModal() {
    document.querySelector('.edit-modal.open').classList.remove('open');
    document.body.classList.remove('edit-modal-open');
  }

  // close modal on background click
  _closeModalOnBackgroundClick(e) {
    if (e.target.classList.contains('edit-modal')) {
      this._closeModal();
    }
  }

  // Function to find workout in the workouts array by comparing it to its id and HTML data-id
  _findWorkoutByElementId(id) {
    return this.#workouts.find(workout => workout.id === id);
  }

  // Function to retrieve the workout HTML element by traversing the DOM towards the document root to find the matching inputted class selector string
  _findHTMLWorkoutElement(e) {
    return e.target.closest(".workout");
  }

  // If the user clicks on a workout from the sidebar list, have the map navigate and display where that workout marker was created
  _moveToPopup(e) {
    const workoutElement = this._findHTMLWorkoutElement(e);

    if (!workoutElement) return;

    const workout = this._findWorkoutByElementId(workoutElement.dataset.id);

    this._renderWorkoutMarker(workout);

    this.#map.setView(workout.coords, this.#mapZoomView, {
      animate: true,
      pan: {
        duration: 1
      }
    });

    // Using the public interface
    // workout.clicked();
  }

  // Render workout on map as marker
  _renderWorkoutMarker(workout) {
    let marker = new L.marker(workout.coords, {
      draggable: false
    });

    marker.addTo(this.#map).bindPopup(L.popup({
      maxWidth: 250,
      minWidth: 100,
      className: `${workout.type}-popup`
    }))
      .setPopupContent(`${workout.type === "running" ? "🏃" : "🚴‍"} ${workout.description}`)
      .openPopup();

    this.#markers.push(marker);
  }

  // Once a new workout is rendered on the page, query the DOM and attach a click event handler to the edit button
  _renderWorkoutEditFeature() {
    const editSpecificWorkout = document.querySelector('.workout__modify-edit');
    editSpecificWorkout.addEventListener('click', this._editSpecificWorkout.bind(this));
  }

  // Once a new workout is rendered on the page, query the DOM and attach a click event handler to the delete button
  _renderWorkoutDeleteFeature() {
    const deleteSpecificWorkout = document.querySelector('.workout__modify-delete');
    deleteSpecificWorkout.addEventListener('click', this._deleteSpecificWorkout.bind(this));
  }

  // Render workout on list
  _renderWorkout(workout) {
    let html = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
        <div class="workout__title-container">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__modify-container">
            <span class="workout__modify-edit">Edit</span>
            <span class="workout__modify-delete">Delete</span>
          </div>
        </div>
        <div class="workout__details">
          <span class="workout__icon">${workout.type === "running" ? "🏃" : "🚴‍"}</span>
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

    // Have to wait until a new workout is created and rendered on the page before querying the DOM and attaching an event handler to the edit workout button
    this._renderWorkoutEditFeature();

    // Have to wait until a new workout is created and rendered on the page before querying the DOM and attaching an event handler to the delete workout button
    this._renderWorkoutDeleteFeature();
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
    deleteAllWorkoutsButton.classList.remove('hidden');
  }

  // Hide the delete all workouts button
  _hideDeleteAllWorkoutsButton() {
    deleteAllWorkoutsButton.classList.add('hidden');
  }

  // Delete all workouts from local storage
  _deleteAllWorkouts() {
    localStorage.removeItem("workouts");
    location.reload();
    this._hideDeleteAllWorkoutsButton();
  }

  // Edit a specific workout from the list of entered workouts
  _editSpecificWorkout(e) {
    const workoutElement = this._findHTMLWorkoutElement(e);
    console.log(workoutElement);
    this._openModal();
    console.log(workoutElement);
  }

  // Delete specific workout from the list of entered workouts
  _deleteSpecificWorkout(e) {
    const workoutElement = this._findHTMLWorkoutElement(e);
    const workout = this._findWorkoutByElementId(workoutElement.dataset.id);
    const lat = workout.coords[0];
    const lng = workout.coords[1];
    const layer = this.#markers.find(marker => (lat === marker._latlng.lat) && (lng === marker._latlng.lng));

    // Remove the deleted workout from the sidebar list of workouts
    containerWorkouts.removeChild(workoutElement);

    // Remove the deleted workout marker from the map
    this.#map.removeLayer(layer);

    // Remove the deleted workout from the array of workouts
    this.#workouts = this.#workouts.filter(workout => workout.id !== workoutElement.dataset.id);

    // Remove the deleted marker from the array of markers
    this.#markers = this.#markers.filter(marker => (lat !== marker._latlng.lat) && (lng !== marker._latlng.lng));

    // If the length of the workouts array is 0 then hide the delete all workouts button as there are no workouts to display
    if (this.#workouts.length < 1) {
      this._hideDeleteAllWorkoutsButton();
    }

    // Reset the local storage of workouts so that it's updated with the new array of workouts with the deleted workout removed
    this._setLocalStorage();
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
//  Ability to delete a specific workout ✅
//  Ability to edit a workout
//  Ability to drag marker to new location and update the workout object's location data to the new dragged location
//  Ability to sort workouts by a certain field (distance, duration, etc.)
//  Re-build Running and Cycling objects retrieved from local storage to fix the error where the 'clicked' function gets removed from the object
//  More error and confirmation messages
//  Ability to position the map to show all workouts on the map
//  Ability to draw lines/shapes instead of just points
//  Geocode location from coordinates ("Run in {insert location from coordinates}")
//  Display weather data for workout time and place
