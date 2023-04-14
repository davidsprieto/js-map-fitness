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
}

class Running extends Workout {
  type = "running";
  cadence;
  pace;

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this._calcPace();
    this._setDescription();
  }

  _constructRunningObject(id, coords, distance, duration, cadence) {
    this.id = id;
    this.coords = coords;
    this.distance = distance;
    this.duration = duration;
    this.cadence = cadence;
    this._calcPace();
    this._setDescription();
  }

  // minutes/mile
  _calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = "cycling";
  elevation;
  speed;

  constructor(coords, distance, duration, elevation) {
    super(coords, distance, duration);
    this.elevation = elevation;
    this._calcSpeed();
    this._setDescription();
  }

  _constructCyclingObject(id, coords, distance, duration, elevation) {
    this.id = id;
    this.coords = coords;
    this.distance = distance;
    this.duration = duration;
    this.elevation = elevation;
    this._calcSpeed();
    this._setDescription();
  }

  // miles/hour
  _calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

///////////////////////////////////////////////////////////////
// APPLICATION ARCHITECTURE

const containerWorkouts = document.querySelector('.workouts');
const newWorkoutForm = document.querySelector('.form');
const newWorkoutInputType = document.querySelector('.new__workout--form-input-type');
const newWorkoutInputDistance = document.querySelector('.new__workout--form-input-distance');
const newWorkoutInputDuration = document.querySelector('.new__workout--form-input-duration');
const newWorkoutInputCadence = document.querySelector('.new__workout--form-input-cadence');
const newWorkoutInputElevation = document.querySelector('.new__workout--form-input-elevation');

const noWorkoutsListedHeader = document.querySelector('.workouts__header--none-listed');
const deleteAllWorkoutsButton = document.querySelector('.workouts__modify--delete-all');

const editWorkoutModalForm = document.querySelector('.modal__edit--workout-form');
const editWorkoutInputType = document.querySelector('.modal__edit--workout-form-input-type');
const editWorkoutInputDistance = document.querySelector('.modal__edit--workout-form-input-distance');
const editWorkoutInputDuration = document.querySelector('.modal__edit--workout-form-input-duration');
const editWorkoutInputCadence = document.querySelector('.modal__edit--workout-form-input-cadence');
const editWorkoutCadenceField = document.querySelector('.cadence__form-row');
const editWorkoutInputElevation = document.querySelector('.modal__edit--workout-form-input-elevation');
const editWorkoutElevationField = document.querySelector('.elevation__form-row');
const closeModalBtn = document.querySelector('.close__modal--btn');

class App {
  #map;
  #mapEvent;
  #markers = [];
  #workouts = [];
  #mapZoomView = 10;
  workoutToEdit;
  workoutElementToEdit;
  isWorkoutToList = false;
  isModalOpen = false;
  isFormOpen = false;

  constructor() {
    // Get user's location
    this._getPosition();

    // Get data from local storage
    this._getLocalStorage();

    // Attach event handlers
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    newWorkoutForm.addEventListener('submit', this._newWorkout.bind(this));
    newWorkoutInputType.addEventListener('change', this._toggleNewWorkoutTypeField);
    deleteAllWorkoutsButton.addEventListener('click', this._deleteAllWorkouts);
    closeModalBtn.addEventListener('click', this._closeModal);
    editWorkoutModalForm.addEventListener('submit', this._editSpecificWorkout.bind(this));
    editWorkoutInputType.addEventListener('change', this._toggleEditWorkoutTypeField.bind(this));
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
    // First check if the edit workout modal is open when a user decides to add a new workout, if it is then close it
    if (this.isModalOpen) {
      this._closeModal();
    }
    this.#mapEvent = mapE;
    newWorkoutForm.classList.remove('hidden');
    this.isFormOpen = true;
    newWorkoutInputDistance.focus();
  }

  // Clear the form input fields & hide form
  _hideForm() {
    newWorkoutInputDistance.value = newWorkoutInputDuration.value = newWorkoutInputCadence.value = newWorkoutInputElevation.value = "";
    newWorkoutForm.style.display = "none";
    newWorkoutForm.classList.add('hidden');
    this.isFormOpen = false;
    setTimeout(() => {
      newWorkoutForm.style.display = "flex";
    }, 1000);
  }

  // open modal when the edit button is clicked
  _openModal() {
    // First check if the add new workout form is open when a user decides to edit a workout, if it is then close it
    if (this.isFormOpen) {
      this._hideForm();
    }
    editWorkoutModalForm.classList.remove('hidden');
    this.isModalOpen = true;
  }

  // close modal on button click & clear the form input fields
  _closeModal() {
    editWorkoutInputType.value = editWorkoutInputDistance.value = editWorkoutInputDuration.value = editWorkoutInputCadence.value = editWorkoutInputElevation.value = "";
    this.workoutToEdit = this.workoutElementToEdit = "";
    editWorkoutModalForm.style.display = "none";
    editWorkoutModalForm.classList.add('hidden');
    this.isModalOpen = false;
    setTimeout(() => {
      editWorkoutModalForm.style.display = "flex";
    }, 1000);
  }

  // For the new workout form:
  // If the user selects cycling workout, display the elevation gain input field and hide the cadence input field for running
  _toggleNewWorkoutTypeField() {
    newWorkoutInputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    newWorkoutInputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  // For the edit workout modal form:
  // If the user selects running workout, display the cadence input field
  // If the user selects cycling workout, display the elevation gain input field
  _toggleEditWorkoutTypeField(e) {
    const type = e.target.value;

    if (type === "running") {
      this._showEditWorkoutCadenceField();
    }
    if (type === "cycling") {
      this._showEditWorkoutElevationField();
    }
  }

  // Display the delete all workouts button
  _showDeleteAllWorkoutsButton() {
    deleteAllWorkoutsButton.classList.remove('hidden');
  }

  // Hide the delete all workouts button
  _hideDeleteAllWorkoutsButton() {
    deleteAllWorkoutsButton.classList.add('hidden');
  }

  // Display the no workouts listed header
  _showNoWorkoutsListedHeader() {
    noWorkoutsListedHeader.classList.remove('hidden');
  }

  // Hide the no workouts listed header
  _hideNoWorkoutsListedHeader() {
    noWorkoutsListedHeader.classList.add('hidden');
  }

  // Show the edit workouts modal cadence field & hide the elevation field
  _showEditWorkoutCadenceField() {
    editWorkoutCadenceField.classList.remove('hidden');
    editWorkoutElevationField.classList.add('hidden');
  }

  // Show the edit workouts modal elevation field & hide the cadence field
  _showEditWorkoutElevationField() {
    editWorkoutElevationField.classList.remove('hidden');
    editWorkoutCadenceField.classList.add('hidden');
  }

  // If the length of the workouts array is 0 then hide the delete all workouts button as there are no workouts to display,
  // else display the no workouts listed header
  _areWorkoutsListed() {
    if (this.#workouts.length < 1) {
      this._hideDeleteAllWorkoutsButton();
      this._showNoWorkoutsListedHeader();
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

  // Form input validation helper function - function determines if user input is a number
  _validInputs = (...inputs) => {
    return inputs.every(input => Number.isFinite(input));
  }

  // Form input validation helper function - function determines if user input is greater than 0
  _allPositive = (...inputs) => {
    return inputs.every(input => input > 0);
  }

  // If the user clicks on a workout from the sidebar list, have the map navigate and display where that workout marker was created
  _moveToPopup(e) {
    const workoutElement = this._findHTMLWorkoutElement(e);

    if (!workoutElement) return;

    const workout = this._findWorkoutByElementId(workoutElement.dataset.id);

    try {
      // Open the popup that's been bound to this workout marker
      this.#map._layers[workout.id].openPopup();

      // Set the map view on the selected workout
      this.#map.setView(workout.coords, this.#mapZoomView, {
        animate: true,
        pan: {
          duration: 1
        }
      });
    } catch {
      console.log("Marker removed");
    }

    // Using the public interface
    // workout.clicked();
  }

  // Render workout on map as marker
  _renderWorkoutMarker(workout) {
    let marker = new L.marker(workout.coords, {
      draggable: false
    });

    // Set leaflet id of the marker to be the same as the workout id so that events/features can be added/accessed later on (such as opening the popup on click)
    marker._leaflet_id = workout.id;

    // Add the marker to the map and bind a popup to it
    this.#map.addLayer(marker);
    marker.bindPopup(L.popup({
      maxWidth: 250,
      minWidth: 100,
      className: `${workout.type}-popup`
    }))
      .setPopupContent(`${workout.type === "running" ? "🏃" : "🚴‍"} ${workout.description}`)
      .openPopup();

    // Add the marker to the list of markers array
    this.#markers.push(marker);
  }

  // Once a new workout is created or a workout is edited then rendered on the page, query the DOM and attach a click event handler to the edit & delete buttons
  _renderWorkoutEditAndDeleteOperations() {
    setTimeout(() => {
      const editSpecificWorkout = document.querySelector('.workout__modify-edit');
      editSpecificWorkout.addEventListener('click', this._openEditWorkoutModalForm.bind(this));
      const deleteSpecificWorkout = document.querySelector('.workout__modify-delete');
      deleteSpecificWorkout.addEventListener('click', this._deleteSpecificWorkout.bind(this));
    }, 500);
  }

  // Render workout on sidebar list
  _renderWorkout(workout) {
    let element = document.createElement('li');
    element.classList.add(`workout`, `workout--${workout.type}`);
    element.setAttribute("data-id", `${workout.id}`);

    let html = `
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
      `;
    }
    element.innerHTML = html;

    if (this.isWorkoutToList) {
      newWorkoutForm.insertAdjacentElement('afterend', element);
      return this._renderWorkoutEditAndDeleteOperations();
    }
    return element;
  }

  // Store workouts in local storage
  _setLocalStorage() {
    localStorage.setItem("workouts", JSON.stringify(this.#workouts));
  }

  // Get workouts from local storage
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem("workouts"));

    if (!data || data.length === 0) {
      return this._showNoWorkoutsListedHeader();
    }

    this.isWorkoutToList = true;

    this._showDeleteAllWorkoutsButton();

    this.#workouts = data;

    this.#workouts.forEach(workout => {
      this._renderWorkout(workout);
    });
  }

  // Delete all workouts from local storage
  _deleteAllWorkouts() {
    localStorage.removeItem("workouts");
    location.reload();
    this._hideDeleteAllWorkoutsButton();
    this._showNoWorkoutsListedHeader();
  }

  // Delete specific workout from the list of entered workouts
  _deleteSpecificWorkout(e) {
    // First check if the edit workout modal is open when a user decides to delete a workout, if it is then close it
    if (this.isModalOpen) {
      this._closeModal();
    }

    const workoutElement = this._findHTMLWorkoutElement(e);
    const workout = this._findWorkoutByElementId(workoutElement.dataset.id);
    const marker = this.#markers.find(marker => marker._leaflet_id === workout.id);

    // Remove the selected workout to be deleted from the sidebar list of workouts
    workoutElement.remove();

    // Remove the workout marker bound to the selected workout to be deleted from the map
    this.#map.removeLayer(marker);

    // Remove the selected workout to be deleted from the array of workouts
    this.#workouts = this.#workouts.filter(workout => workout.id !== workoutElement.dataset.id);

    // Remove the workout marker bound to the selected workout to be deleted from the array of markers
    this.#markers = this.#markers.filter(marker => marker._leaflet_id !== workout.id);

    // Check if the workouts array is empty
    this._areWorkoutsListed();

    // Reset the local storage of workouts so that it's updated with the new array of workouts with the deleted workout removed
    this._setLocalStorage();
  }

  // Open the edit workout modal form and set the values in the form with the clicked workout data
  _openEditWorkoutModalForm(e) {
    // The user may click the edit button on a different workout before closing the modal so have to clear the input fields every time the edit button on a workout is clicked
    editWorkoutInputType.value = editWorkoutInputDistance.value = editWorkoutInputDuration.value = editWorkoutInputCadence.value = editWorkoutInputElevation.value = "";
    this.workoutToEdit = this.workoutElementToEdit = "";

    this._openModal();
    this.workoutElementToEdit = this._findHTMLWorkoutElement(e);
    this.workoutToEdit = this._findWorkoutByElementId(this.workoutElementToEdit.dataset.id);

    // Get the values from the selected workout
    const type = this.workoutToEdit.type;
    const distance = this.workoutToEdit.distance;
    const duration = this.workoutToEdit.duration;
    const cadence = this.workoutToEdit.cadence;
    const elevation = this.workoutToEdit.elevation;

    // Set the current values in the edit workout modal form
    editWorkoutInputType.value = type;
    editWorkoutInputDistance.value = distance;
    editWorkoutInputDuration.value = duration;

    if (type === "running") {
      this._showEditWorkoutCadenceField();
      editWorkoutInputCadence.value = cadence;
    }
    if (type === "cycling") {
      this._showEditWorkoutElevationField();
      editWorkoutInputElevation.value = elevation;
    }
  }

  // Edit a specific workout from the list of entered workouts
  _editSpecificWorkout(e) {
    // Prevent page reload
    e.preventDefault();

    this.isWorkoutToList = false;

    // Get selected workout to be edited id value & coordinates values
    const id = this.workoutToEdit.id;
    const lat = this.workoutToEdit.coords[0];
    const lng = this.workoutToEdit.coords[1];

    // Get edit workout modal form values
    const type = editWorkoutInputType.value;
    const distance = +editWorkoutInputDistance.value;
    const duration = +editWorkoutInputDuration.value;

    // If the workout is of running type, create a new running object but keep the same id & coords
    if (type === "running") {
      const cadence = +editWorkoutInputCadence.value;
      // Check if data is valid
      if (!this._validInputs(distance, duration, cadence) || !this._allPositive(distance, duration, cadence)) {
        return alert("Input must be a positive number!");
      }
      this.workoutToEdit = new Running();
      this.workoutToEdit._constructRunningObject(id, [lat, lng], distance, duration, cadence);
    }

    // If the workout is of cycling type, create a new cycling object but keep the same id & coords
    if (type === 'cycling') {
      const elevation = +editWorkoutInputElevation.value;
      // Check if data is valid
      if (!this._validInputs(distance, duration, elevation) || !this._allPositive(distance, duration)) {
        return alert("Input must be a positive number!");
      }
      this.workoutToEdit = new Cycling();
      this.workoutToEdit._constructCyclingObject(id, [lat, lng], distance, duration, elevation);
    }

    // Update the selected workout to be edited in the workouts array with the new workout values
    const index = this.#workouts.findIndex(workout => workout.id === this.workoutToEdit.id);
    this.#workouts[index] = this.workoutToEdit;

    // Update the marker that's bound to the selected workout to be edited
    this.#map._layers[this.workoutToEdit.id].bindPopup(L.popup({
      maxWidth: 250,
      minWidth: 100,
      className: `${this.workoutToEdit.type}-popup`
    }))
      .setPopupContent(`${this.workoutToEdit.type === "running" ? "🏃" : "🚴‍"} ${this.workoutToEdit.description}`)
      .openPopup();

    // Update the workout element in the sidebar with the new values
    const updatedHtmlElement = this._renderWorkout(this.workoutToEdit);
    this.workoutElementToEdit.replaceWith(updatedHtmlElement);

    // Rerender edit and delete workout operations since the DOM is updated
    this._renderWorkoutEditAndDeleteOperations();

    // Reset the local storage of workouts so that it's updated with the edited workout object
    this._setLocalStorage();

    // Close the edit workout modal
    this._closeModal();
  }

  // Create a new workout object when the user submits the form
  _newWorkout(e) {
    // Prevent page reload
    e.preventDefault();

    this.isWorkoutToList = true;

    // Get data from form fields
    const type = newWorkoutInputType.value;
    const distance = +newWorkoutInputDistance.value;
    const duration = +newWorkoutInputDuration.value;

    // Coordinates variables containing coords data when user clicks on the map
    const {lat, lng} = this.#mapEvent.latlng;

    // Declare workout variable
    let workout;

    // If running workout, create a running object
    if (type === 'running') {
      const cadence = +newWorkoutInputCadence.value;
      // Check if data is valid
      if (!this._validInputs(distance, duration, cadence) || !this._allPositive(distance, duration, cadence)) {
        return alert("Input must be a positive number!");
      }
      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // If cycling workout, create a cycling object
    if (type === 'cycling') {
      const elevation = +newWorkoutInputElevation.value;
      // Check if data is valid
      if (!this._validInputs(distance, duration, elevation) || !this._allPositive(distance, duration)) {
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

    // Store workouts in local storage
    this._setLocalStorage();

    // Clear the form input fields && Hide form
    this._hideForm();

    // Display the delete all workouts button
    this._showDeleteAllWorkoutsButton();

    // Hide the no workouts listed header
    this._hideNoWorkoutsListedHeader();
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
