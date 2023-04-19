"use strict";

///////////////////////////////////////////////////////////////
// APPLICATION CLASSES

class Workout {
  id = crypto.randomUUID();
  date = new Date();
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

  // miles/hour
  _calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

///////////////////////////////////////////////////////////////
// APPLICATION ARCHITECTURE

// New workout form
const containerWorkouts = document.querySelector('.workouts');
const newWorkoutForm = document.querySelector('.new__workout--form');
const newWorkoutInputType = document.querySelector('.new__workout--form-input-type');
const newWorkoutInputDistance = document.querySelector('.new__workout--form-input-distance');
const newWorkoutInputDuration = document.querySelector('.new__workout--form-input-duration');
const newWorkoutInputCadence = document.querySelector('.new__workout--form-input-cadence');
const newWorkoutInputElevation = document.querySelector('.new__workout--form-input-elevation');

// Display delete all workouts button or no workouts listed header
const noWorkoutsListedHeader = document.querySelector('.workouts__header--none-listed');
const deleteAllWorkoutsButton = document.querySelector('.workouts__modify--delete-all');

// Edit workout form
const editWorkoutModalForm = document.querySelector('.modal__edit--workout-form');
const editWorkoutInputType = document.querySelector('.modal__edit--workout-form-input-type');
const editWorkoutInputDistance = document.querySelector('.modal__edit--workout-form-input-distance');
const editWorkoutInputDuration = document.querySelector('.modal__edit--workout-form-input-duration');
const editWorkoutInputCadence = document.querySelector('.modal__edit--workout-form-input-cadence');
const editWorkoutInputElevation = document.querySelector('.modal__edit--workout-form-input-elevation');

// Display edit workout form fields
const editWorkoutCadenceField = document.querySelector('.modal__edit-cadence-form-row');
const editWorkoutElevationField = document.querySelector('.modal__edit-elevation-form-row');

// Close modal or form
const editWorkoutCloseModalBtn = document.querySelector('.modal__edit--workout-close-form-btn');
const newWorkoutCloseFormBtn = document.querySelector('.new__workout--close-form-btn');


class App {
  #map;
  #mapEvent;
  #markers = [];
  #workouts = [];
  #mapZoomView = 10;
  #editedWorkout;
  #workoutToEdit;
  #workoutElementToEdit;
  isModalOpen = false;
  isFormOpen = false;
  workoutId;

  constructor() {
    // Get user's location
    this._getPosition();

    // Get data from local storage
    this._getLocalStorage();

    // Attach event handlers
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    newWorkoutForm.addEventListener('submit', this._newWorkout.bind(this));
    newWorkoutCloseFormBtn.addEventListener('click', this._hideForm);
    newWorkoutInputType.addEventListener('change', this._toggleNewWorkoutTypeField);
    deleteAllWorkoutsButton.addEventListener('click', this._deleteAllWorkouts);
    editWorkoutCloseModalBtn.addEventListener('click', this._closeModal);
    editWorkoutModalForm.addEventListener('submit', this._editSpecificWorkout.bind(this));
    editWorkoutInputType.addEventListener('change', this._toggleEditWorkoutTypeField.bind(this));
  }

  // Function to get user's location
  _getPosition() {
    navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), function () {
      alert('Could not get your location!');
    });
  }

  // Function to load leaflet map
  _loadMap(position) {
    const {latitude, longitude} = position.coords;
    const coords = [latitude, longitude];

    // If a workout was just edited, then get it from local storage and set the map zoom view to that edited workout marker when the page is done reloading
    if (this.#editedWorkout) {
      this.#map = L.map('map').setView(this.#editedWorkout.coords, this.#mapZoomView);
    } else {
      this.#map = L.map('map').setView(coords, this.#mapZoomView);
    }

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(this.#map);

    // Handling clicks on the map
    this.#map.on('click', this._showForm.bind(this));

    // After the map loads, get workouts from local storage and display them on the map
    this.#workouts.forEach(workout => {
      this._renderWorkoutMarker(workout);
    });

    // After the map loads, if a workout was just edited then get it from local storage and open the popup bound to it
    if (this.#editedWorkout) {
      this.#map._layers[this.#editedWorkout.id].openPopup();
    }
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

  // Hide new workout form & clear the input fields
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

  // Hide the edit workout form & clear the input fields
  _closeModal() {
    editWorkoutInputDistance.value = editWorkoutInputDuration.value = editWorkoutInputCadence.value = editWorkoutInputElevation.value = "";
    editWorkoutModalForm.style.display = "none";
    editWorkoutModalForm.classList.add('hidden');
    this.isModalOpen = false;
    setTimeout(() => {
      editWorkoutModalForm.style.display = "flex";
    }, 1000);
  }

  // For the new workout form:
  // If the user selects running workout, display the cadence input field
  // If the user selects cycling workout, display the elevation gain input field
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
    editWorkoutElevationField.classList.add('hidden');
    editWorkoutCadenceField.classList.remove('hidden');
  }

  // Show the edit workouts modal elevation field & hide the cadence field
  _showEditWorkoutElevationField() {
    editWorkoutCadenceField.classList.add('hidden');
    editWorkoutElevationField.classList.remove('hidden');
  }

  // If the length of the workouts array is 0 then hide the delete all workouts button as there are no workouts to display,
  // else display the no workouts listed header
  _areWorkoutsListed() {
    if (this.#workouts.length < 1) {
      this._hideDeleteAllWorkoutsButton();
      this._showNoWorkoutsListedHeader();
    }
  }

  // Function to retrieve the workout HTML element by traversing the DOM towards the document root to find the matching inputted class selector string
  _findHTMLWorkoutElement(e) {
    return e.target.closest(".workout");
  }

  // Function to find workout in the workouts array by comparing it to its id and HTML data-id
  _findWorkoutByElementId(id) {
    return this.#workouts.find(workout => workout.id === id);
  }

  _findWorkoutMarkerById(id) {
    return this.#markers.find(marker => marker._leaflet_id === id)
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
    let id = this.workoutId;

    const workoutElement = this._findHTMLWorkoutElement(e);

    if (!workoutElement) return;

    const workout = this._findWorkoutByElementId(workoutElement.dataset.id);

    this.workoutId = workout.id;

    // If the user clicks on a different workout from the list while the edit workout modal is open from clicking on a previous workout to edit, then close the modal
    if (id !== this.workoutId && this.isModalOpen && id !== undefined) {
      this._closeModal();
    }

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
  }

  // Render workout on map as marker
  _renderWorkoutMarker(workout) {
    const marker = new L.marker(workout.coords, {
      draggable: true
    });

    // Set leaflet id of the marker to be the same as the workout id so that events/features can be added/accessed later on
    // Such as opening the popup on click & reassigning the coords values if the marker is dragged to a new location
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

    // Update the coordinates of the selected workout marker on drag end
    marker.on('dragend', (e) => {
      // Get the new coordinates from when the marker has stopped being dragged event
      const {lat, lng} = e.target._latlng;

      // Find the marker that was dragged in the array of markers and update its coordinates
      const marker = this.#markers.find(marker => marker._leaflet_id === e.target._leaflet_id);
      marker.coords = [lat, lng];

      // Find the workout bound to the dragged marker and update its coordinates
      const workout = this.#workouts.find(workout => workout.id === e.target._leaflet_id);
      workout.coords = [lat, lng];

      // Reset local storage to reflect the updated workouts coordinates
      this._setLocalStorage();
    });
  }

  // Once a new workout is created or a workout is edited then rendered on the page, query the DOM and attach a click event handler to the edit & delete buttons
  _renderWorkoutEditAndDeleteOperations() {
    const editSpecificWorkout = document.querySelector('.workout__modify-edit');
    editSpecificWorkout.addEventListener('click', this._openEditWorkoutModalForm.bind(this));
    const deleteSpecificWorkout = document.querySelector('.workout__modify-delete');
    deleteSpecificWorkout.addEventListener('click', this._deleteSpecificWorkout.bind(this));
  }

  // Create workout element
  _renderWorkoutElement(workout) {
    const element = document.createElement('li');
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

    return element;
  }

  // Render new workout element to the sidebar list on the page
  _renderWorkoutToPage(workout) {
    const element = this._renderWorkoutElement(workout);
    newWorkoutForm.insertAdjacentElement('afterend', element);
    // Render edit and delete workout operations since the DOM is updated
    this._renderWorkoutEditAndDeleteOperations();
  }

  // Store edited workout & workouts in local storage
  _setLocalStorage() {
    if (this.#editedWorkout) {
      localStorage.setItem("editedWorkout", JSON.stringify(this.#editedWorkout));
    }
    localStorage.setItem("workouts", JSON.stringify(this.#workouts));
  }

  // Get edited workout & workouts from local storage
  _getLocalStorage() {
    this.#editedWorkout = JSON.parse(localStorage.getItem("editedWorkout"));

    const data = JSON.parse(localStorage.getItem("workouts"));

    if (!data || data.length === 0) {
      return this._showNoWorkoutsListedHeader();
    }

    this.#workouts = data;

    this.#workouts.forEach(workout => {
      this._renderWorkoutToPage(workout);
    });

    this._showDeleteAllWorkoutsButton();
  }

  // Delete edited workout & all workouts from local storage
  _deleteAllWorkouts() {
    localStorage.removeItem("editedWorkout");
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

    const confirmDeletion = confirm("Are you sure you want to delete this workout?");

    if (confirmDeletion) {
      const workoutElement = this._findHTMLWorkoutElement(e);
      const workout = this._findWorkoutByElementId(workoutElement.dataset.id);
      const marker = this._findWorkoutMarkerById(workout.id);

      // Remove the selected workout to be deleted from the array of workouts
      this.#workouts = this.#workouts.filter(workout => workout.id !== workoutElement.dataset.id);

      // Remove the workout marker bound to the selected workout to be deleted from the array of markers
      this.#markers = this.#markers.filter(marker => marker._leaflet_id !== workout.id);

      // If the selected workout to be deleted was the previously edited workout saved in local storage then remove it and assign the edited workout to be null
      if (this.#editedWorkout.id === workout.id) {
        this.#editedWorkout = null;
        localStorage.removeItem("editedWorkout");
      }

      // Remove the workout marker bound to the selected workout to be deleted from the map
      this.#map.removeLayer(marker);

      // Remove the selected workout to be deleted from the sidebar list of workouts
      workoutElement.remove();

      // Check if the workouts array is empty
      this._areWorkoutsListed();

      // Reset the local storage of workouts so that it's updated with the new array of workouts with the deleted workout removed
      this._setLocalStorage();
    }
  }

  // Open the edit workout modal form and set the values in the form with the clicked workout data
  _openEditWorkoutModalForm(e) {
    this._openModal();
    this.#workoutElementToEdit = this._findHTMLWorkoutElement(e);
    this.#workoutToEdit = this._findWorkoutByElementId(this.#workoutElementToEdit.dataset.id);

    editWorkoutInputDistance.value = editWorkoutInputDuration.value = editWorkoutInputCadence.value = editWorkoutInputElevation.value = "";

    // Get the values from the selected workout
    const type = this.#workoutToEdit.type;
    const distance = this.#workoutToEdit.distance;
    const duration = this.#workoutToEdit.duration;

    // Set the current values in the edit workout modal form
    if (type === "running") {
      this._showEditWorkoutCadenceField();
      editWorkoutInputCadence.value = this.#workoutToEdit.cadence;
    }
    if (type === "cycling") {
      this._showEditWorkoutElevationField();
      editWorkoutInputElevation.value = this.#workoutToEdit.elevation;
    }
    editWorkoutInputType.value = type;
    editWorkoutInputDistance.value = distance;
    editWorkoutInputDuration.value = duration;
  }

  // Edit a specific workout from the list of entered workouts on form submit
  _editSpecificWorkout(e) {
    // Prevent page reload
    e.preventDefault();

    // Get selected workout to be edited id value & coordinates values
    const id = this.#workoutToEdit.id;
    const lat = this.#workoutToEdit.coords[0];
    const lng = this.#workoutToEdit.coords[1];

    // Get edit workout modal form values on form submit
    const type = editWorkoutInputType.value;
    const distance = +editWorkoutInputDistance.value;
    const duration = +editWorkoutInputDuration.value;

    // If the user edits a running workout, and it remains a running workout then edit the distance, duration, and cadence values
    if (type === "running" && this.#workoutToEdit.type === "running") {
      const cadence = +editWorkoutInputCadence.value;
      // Check if data is valid
      if (!this._validInputs(distance, duration, cadence) || !this._allPositive(distance, duration, cadence)) {
        return alert("Input must be a positive number!");
      }
      this.#workoutToEdit.distance = distance;
      this.#workoutToEdit.duration = duration;
      this.#workoutToEdit.cadence = cadence;
    }

    // If the user edits a cycling workout BUT changes it to a running workout then create a new running workout object while keeping the same id & coords
    if (type === "running" && this.#workoutToEdit.type === "cycling") {
      const cadence = +editWorkoutInputCadence.value;
      // Check if data is valid
      if (!this._validInputs(distance, duration, cadence) || !this._allPositive(distance, duration)) {
        return alert("Input must be a positive number!");
      }
      this.#workoutToEdit = new Running([lat, lng], distance, duration, cadence);
      this.#workoutToEdit.id = id;
    }

    // If the user edits a cycling workout, and it remains a cycling workout then edit the distance, duration, and elevation values
    if (type === "cycling" && this.#workoutToEdit.type === "cycling") {
      const elevation = +editWorkoutInputElevation.value;
      // Check if data is valid
      if (!this._validInputs(distance, duration, elevation) || !this._allPositive(distance, duration)) {
        return alert("Input must be a positive number!");
      }
      this.#workoutToEdit.distance = distance;
      this.#workoutToEdit.duration = duration;
      this.#workoutToEdit.elevation = elevation;
    }

    // If the user edits a running workout BUT changes it to a cycling workout then create a new cycling workout object while keeping the same id & coords
    if (type === "cycling" && this.#workoutToEdit.type === "running") {
      const elevation = +editWorkoutInputElevation.value;
      // Check if data is valid
      if (!this._validInputs(distance, duration, elevation) || !this._allPositive(distance, duration)) {
        return alert("Input must be a positive number!");
      }
      this.#workoutToEdit = new Cycling([lat, lng], distance, duration, elevation);
      this.#workoutToEdit.id = id;
    }

    // Update the selected workout to be edited in the workouts array with the updated workout values
    const index = this.#workouts.findIndex(workout => workout.id === this.#workoutToEdit.id);
    this.#workouts[index] = this.#workoutToEdit;

    // Update the marker that's bound to the selected workout to be edited
    this.#map._layers[this.#workoutToEdit.id].bindPopup(L.popup({
      maxWidth: 250,
      minWidth: 100,
      className: `${this.#workoutToEdit.type}-popup`
    }))
      .setPopupContent(`${this.#workoutToEdit.type === "running" ? "🏃" : "🚴‍"} ${this.#workoutToEdit.description}`)
      .openPopup();

    // Update the workout element in the sidebar with the new values
    this.#workoutElementToEdit = this._renderWorkoutElement(this.#workoutToEdit);

    // Assign the edited workout value so that the data can be used after page reload
    this.#editedWorkout = this.#workoutToEdit;

    // Render edit and delete workout operations since the DOM is updated
    this._renderWorkoutEditAndDeleteOperations();

    // Reset the local storage of edited workout & workouts so that the workouts array data is updated along with the workout just edited
    // so that on page reload the map view can be set to that marker
    this._setLocalStorage();

    // Close the edit workout modal
    this._closeModal();

    // Reload the page to display the edits/changes
    location.reload();
  }

  // Create a new workout object when the user submits the form
  _newWorkout(e) {
    // Prevent page reload
    e.preventDefault();

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

    // Render workout to the list on the page
    this._renderWorkoutToPage(workout);

    // Store workouts in local storage
    this._setLocalStorage();

    // Clear the form input fields && Hide form
    this._hideForm();

    // Hide the no workouts listed header
    this._hideNoWorkoutsListedHeader();

    // Display the delete all workouts button
    this._showDeleteAllWorkoutsButton();
  }
}

const app = new App();

// Additional Features:
// TODO:
//  Ability to delete a specific workout ✅
//  Ability to edit a workout ✅
//  Ability to drag marker to new location and update the workout object's location data to the new dragged location ✅
//  More error and confirmation messages (confirm deletion of workout with popup) ✅
//  Ability to sort workouts by a certain field (distance, duration, etc.)
//  Ability to position the map to show all workouts on the map
//  Ability to draw lines/shapes instead of just points
//  Geocode location from coordinates ("Run in {insert location from coordinates}")
//  Display weather data for workout time and place
