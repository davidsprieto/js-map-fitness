"use strict";

///////////////////////////////////////////////////////////////
// APPLICATION CLASSES

class Workout {
    id = crypto.randomUUID();
    date = new Date();
    type;
    city;
    coords;
    distance;
    duration;
    description;

    constructor(city, coords, distance, duration) {
        this.city = city;
        this.coords = coords; // [lat, lng]
        this.distance = distance; // in miles
        this.duration = duration; // in minutes
    }

    _setDescription() {
        const type = this.type[0].toUpperCase() + this.type.slice(1);
        // prettier-ignore
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

        this.description = `${type} in ${this.city} on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
    }
}

class Running extends Workout {
    type = "running";
    cadence;
    pace;

    constructor(city, coords, distance, duration, cadence) {
        super(city, coords, distance, duration);
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

    constructor(city, coords, distance, duration, elevation) {
        super(city, coords, distance, duration);
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

// List of workouts in sidebar container & new workout form
const containerWorkouts = document.getElementById('workouts');
const newWorkoutForm = document.getElementById('new__workout--form');
const newWorkoutInputType = document.getElementById('new__workout--form-input-type');
const newWorkoutInputDistance = document.getElementById('new__workout--form-input-distance');
const newWorkoutInputDuration = document.getElementById('new__workout--form-input-duration');
const newWorkoutInputCadence = document.getElementById('new__workout--form-input-cadence');
const newWorkoutInputElevation = document.getElementById('new__workout--form-input-elevation');

// Display delete all workouts button, no workouts listed header & sort option
const noWorkoutsListedHeader = document.getElementById('workouts__header--none-listed');
const containerSortWorkouts = document.getElementById('sort__workouts');
const sortWorkoutsOptionsBtn = document.getElementById('sort__workouts--by-options');
const deleteAllWorkoutsBtn = document.getElementById('workouts__modify--delete-all');

// Edit workout modal form
const editWorkoutModalForm = document.getElementById('modal__edit--workout-form');
const editWorkoutInputType = document.getElementById('modal__edit--workout-form-input-type');
const editWorkoutInputDistance = document.getElementById('modal__edit--workout-form-input-distance');
const editWorkoutInputDuration = document.getElementById('modal__edit--workout-form-input-duration');
const editWorkoutInputCadence = document.getElementById('modal__edit--workout-form-input-cadence');
const editWorkoutInputElevation = document.getElementById('modal__edit--workout-form-input-elevation');

// Display edit workout form fields
const editWorkoutCadenceField = document.getElementById('modal__edit-cadence-form-row');
const editWorkoutElevationField = document.getElementById('modal__edit-elevation-form-row');

// Close edit workout modal form or new workout form
const editWorkoutCloseModalBtn = document.getElementById('modal__edit--workout-close-form-btn');
const newWorkoutCloseFormBtn = document.getElementById('new__workout--close-form-btn');

// Button to position map to view all the workout markers
const positionMapToViewAllMarkersBtn = document.getElementById('position__map-to-view-all-markers');

// Alert modal && Alert modal close button
const alertModal = document.getElementById('alert__modal');
const alertModalCloseBtn = document.getElementById('alert__modal--close-btn');

// Window overlay for the alert modal
const overlay = document.getElementById('alert__modal--overlay');

class App {
    #map;
    drawnLayers = [];
    #mapEvent;
    #markers = [];
    #placeholderMarker;
    #workouts = [];
    workoutId;
    workoutToEdit;
    #workoutElements = [];
    workoutElementToEdit;
    #mapZoomView = 10;
    isModalOpen = false;
    isFormOpen = false;
    city;

    constructor() {
        // Get user's location
        this._getPosition();

        // Get workouts from local storage
        this._getWorkoutsLocalStorage();

        // Get drawn layers from local storage
        this._getDrawnLayersLocalStorage();

        // Attach event handlers
        containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
        newWorkoutForm.addEventListener('submit', this._newWorkout.bind(this));
        newWorkoutCloseFormBtn.addEventListener('click', this._hideForm.bind(this));
        newWorkoutInputType.addEventListener('change', this._toggleNewWorkoutTypeField);
        sortWorkoutsOptionsBtn.addEventListener('change', this._sortElements.bind(this));
        deleteAllWorkoutsBtn.addEventListener('click', this._deleteAllWorkouts);
        editWorkoutCloseModalBtn.addEventListener('click', this._closeModal);
        editWorkoutModalForm.addEventListener('submit', this._editSpecificWorkout.bind(this));
        editWorkoutInputType.addEventListener('change', this._toggleEditWorkoutTypeField.bind(this));
        positionMapToViewAllMarkersBtn.addEventListener('click', this._positionMapToFitMarkers.bind(this));
        alertModalCloseBtn.addEventListener('click', this._hideAlertModal.bind(this));
        overlay.addEventListener('click', this._hideAlertModal);
    }

    _hideAlertModal() {
        alertModal.classList.remove('active');
        overlay.classList.remove('active');
    }

    _showAlertModal() {
        alertModal.classList.add('active');
        overlay.classList.add('active');
    }

    // Function to get user's location
    _getPosition() {
        navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), this._showAlertModal.bind(this));
    }

    // Function to load leaflet map
    _loadMap(position) {
        const {latitude, longitude} = position.coords;
        const coords = [latitude, longitude];

        // When the map loads, set the page zoom view
        this.#map = L.map('map').setView(coords, this.#mapZoomView);

        // Add the map layer
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.#map);

        // Handling double clicks on the map by displaying the new workout form in the sidebar
        this.#map.on('dblclick', this._showForm.bind(this));

        // Create a new Feature Group object that stores all the editable shapes and add it to the map
        let drawnFeatures = new L.FeatureGroup();
        this.#map.addLayer(drawnFeatures);

        // Function that handles what happens when a layer is drawn on the map:
        // When a user draws a line or shape on the map it is added to the drawn features feature group object variable
        // Then it is converted to geoJSON and then added to the drawn layers array variable to be stored in local storage
        // And retrieved later to be displayed on the map when the user comes back to the app
        this.#map.on("draw:created", (e) => {
            let drawnLayer = e.layer;
            drawnFeatures.addLayer(drawnLayer);
            let geoJSONDrawnLayer = drawnLayer.toGeoJSON();
            let coords = geoJSONDrawnLayer.geometry.coordinates[0];
            geoJSONDrawnLayer.id = coords[0] + coords[1];
            this.drawnLayers.push(geoJSONDrawnLayer);
            this._setDrawnLayersLocalStorage();
        });

        // Functions converts the first lat & lng coordinates of the drawn layer to an id to be assigned to the drawn layer object
        // I used the coordinates as an id because they can be accessed later when updating or deleting the drawn layer object from the
        // drawn layers array variable that contains all the drawn layers objects
        function _convertCoordsToId(drawnLayer) {
            let coords = drawnLayer.features[0].geometry.coordinates[0];
            return coords[0] + coords[1];
        }

        // Function that handles what happens when a layer is edited on the map:
        this.#map.on("draw:edited", (e) => {
            let drawnLayer = e.layers.toGeoJSON();
            let id = _convertCoordsToId(drawnLayer);
            const index = this.drawnLayers.findIndex(drawnLayer => drawnLayer.id === id);
            this.drawnLayers[index] = drawnLayer;
            this._setDrawnLayersLocalStorage();
        });

        // Function that handles what happens when a layer is deleted from the map:
        this.#map.on("draw:deleted", (e) => {
            let drawnLayer = e.layers.toGeoJSON();
            let id = _convertCoordsToId(drawnLayer);
            this.drawnLayers = this.drawnLayers.filter(drawnLayer => drawnLayer.id !== id);
            this._setDrawnLayersLocalStorage();
        });

        // Enable Leaflet Draw Controls:
        // Disabled being able to create a marker as that is performed with a double click on the map
        // Enabled edit and delete controls for each drawn line
        let drawControl = new L.Control.Draw({
            draw: {
                marker: false,
            },
            edit: {
                featureGroup: drawnFeatures,
                edit: true
            },
            delete: {
                featureGroup: drawnFeatures,
                delete: true
            }
        });
        this.#map.addControl(drawControl);

        // After the map loads, get workouts from local storage and display them on the map
        if (this.#workouts.length !== 0) {
            this.#workouts.forEach(workout => {
                this._renderWorkoutMarker(workout);
            });
        }

        // After the map loads, get drawn layers from local storage and display them on the map
        if (this.drawnLayers.length !== 0) {
            L.geoJSON(this.drawnLayers).eachLayer(layer => {
                drawnFeatures.addLayer(layer).addTo(this.#map);
            });
        }

        // Wait until the map completely loads until displaying the view all workout markers button
        positionMapToViewAllMarkersBtn.style.display = "flex";
    }

    // Function that uses MapBox API to send latitude & longitude coordinates and returns the city
    async _getWorkoutCity(coords) {
        const {lat, lng} = coords;
        const Map_Box_Key = config.MAP_BOX_KEY;
        this.city = await reverseGeocode({lat: lat, lng: lng}, Map_Box_Key)
            .then((data) => {
                return data.split(',')[1].trim();
            })
            .catch((error) => {
                console.log(error);
            });
    }

    // After user clicks on the map to create a marker, display the workout form and assign the click to the map event variable
    // Then render a placeholder marker on the map
    // Then assign a value to the city with the lat & lng coordinates
    async _showForm(mapE) {
        // First check if the edit workout modal is open when a user decides to add a new workout, if it is then close it
        if (this.isModalOpen) {
            this._closeModal();
        }
        this.#mapEvent = mapE;
        this._renderPlaceholderMarker();
        await this._getWorkoutCity(this.#mapEvent.latlng);
        newWorkoutForm.classList.remove('hidden');
        newWorkoutInputDistance.focus();
        this.isFormOpen = true;
    }

    // Hide new workout form, clear the input fields
    _hideForm() {
        newWorkoutInputDistance.value = newWorkoutInputDuration.value = newWorkoutInputCadence.value = newWorkoutInputElevation.value = "";
        newWorkoutForm.style.display = "none";
        newWorkoutForm.classList.add('hidden');
        // Check if a placeholder marker has been created
        this._isThereAPlaceholderMarker();
        setTimeout(() => {
            newWorkoutForm.style.display = "flex";
        }, 1000);
        this.isFormOpen = false;
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
        this.workoutToEdit = this.workoutElementToEdit = undefined;
        editWorkoutModalForm.style.display = "none";
        editWorkoutModalForm.classList.add('hidden');
        setTimeout(() => {
            editWorkoutModalForm.style.display = "flex";
        }, 1000);
        this.isModalOpen = false;
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
        deleteAllWorkoutsBtn.classList.remove('hidden');
    }

    // Hide the delete all workouts button
    _hideDeleteAllWorkoutsButton() {
        deleteAllWorkoutsBtn.classList.add('hidden');
    }

    // Display the no workouts listed header
    _showNoWorkoutsListedHeader() {
        noWorkoutsListedHeader.classList.remove('hidden');
    }

    // Hide the no workouts listed header
    _hideNoWorkoutsListedHeader() {
        noWorkoutsListedHeader.classList.add('hidden');
    }

    // Show the sort workouts by option only if the sidebar list of workouts contains more than 1 workout
    _showSortWorkoutsByOption() {
        if (this.#workouts.length > 1) {
            containerSortWorkouts.classList.remove('hidden');
        }
    }

    // Hide the sort workouts by option
    _hideSortWorkoutsByOption() {
        containerSortWorkouts.classList.add('hidden');
    }

    // Show the edit workouts modal form cadence field & hide the elevation field
    _showEditWorkoutCadenceField() {
        editWorkoutElevationField.classList.add('hidden');
        editWorkoutCadenceField.classList.remove('hidden');
    }

    // Show the edit workouts modal form elevation field & hide the cadence field
    _showEditWorkoutElevationField() {
        editWorkoutCadenceField.classList.add('hidden');
        editWorkoutElevationField.classList.remove('hidden');
    }

    // If the length of the workouts array is 0 then hide the delete all workouts button and sort workouts by options
    // as there are no workouts to display, then display the no workouts listed header
    _areWorkoutsListed() {
        if (this.#workouts.length < 1) {
            this._hideDeleteAllWorkoutsButton();
            this._hideSortWorkoutsByOption();
            this._showNoWorkoutsListedHeader();
        }
    }

    // If there is a placeholder marker created, remove it from the map & set both the placeholder marker and map event variables to undefined
    _isThereAPlaceholderMarker() {
        if (this.#placeholderMarker) {
            this.#map.removeLayer(this.#placeholderMarker);
            this.#placeholderMarker = undefined;
            this.#mapEvent = undefined;
        }
    }

    // If a workout element was just edited, then it already exists in the array of workout elements
    // So find it and update the workout elements array with the edited workout element values
    _doesWorkoutElementExist(element) {
        if (this.workoutElementToEdit) {
            const index = this.#workoutElements.findIndex(workoutElement => workoutElement.dataset.id === element.dataset.id);
            this.#workoutElements[index] = element;
        } else {
            this.#workoutElements.push(element);
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

    // Function to find the marker that's bound to the workout by comparing it to the leaflet id and workout id
    _findWorkoutMarkerById(id) {
        return this.#markers.find(marker => marker._leaflet_id === id);
    }

    // Form input validation helper function - function determines if user input is a number
    _validInputs = (...inputs) => {
        return inputs.every(input => Number.isFinite(input));
    }

    // Form input validation helper function - function determines if user input is greater than 0
    _allPositive = (...inputs) => {
        return inputs.every(input => input > 0);
    }

    // Position the map to fit all the markers
    _positionMapToFitMarkers(e) {
        e.stopPropagation(); // Prevent a marker from being created on the map when the button is clicked
        if (this.isModalOpen) {
            this._closeModal();
        }
        if (this.#markers.length === 0) {
            return alert("There are no markers to view!");
        }
        let group = new L.featureGroup(this.#markers);
        this.#map.fitBounds(group.getBounds());
    }

    // Function that takes in the workout id and opens the popup bound to it
    _openPopup(id) {
        this.#map._layers[id].openPopup();
    }

    // If the user clicks on a workout from the sidebar list, have the map navigate and display where that workout marker was created
    _moveToPopup(e) {
        let id = this.workoutId;

        const workoutElement = this._findHTMLWorkoutElement(e);

        if (!workoutElement) return;

        const workout = this._findWorkoutByElementId(workoutElement.dataset.id);

        try {
            this.workoutId = workout.id;

            // If the user clicks on a different workout from the list while the edit workout modal form is open from clicking on a previous workout to edit, then close the modal
            if (id !== this.workoutId && this.isModalOpen && id !== undefined) {
                this._closeModal();
            }

            // Open the popup that's been bound to the workout marker
            this._openPopup(workout.id);

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

        this._highlightWorkout(workout, workoutElement);
    }

    // When a user selects a workout from the sidebar list of workouts, add a class that styles it with a border to let the user know of the currently selected workout from the sidebar
    _highlightWorkout(workout, workoutElement) {
        try {
            const type = workout.type;

            this.#workoutElements.map(workout => {
                if (workout.classList.contains('workout__running--selected')) {
                    workout.classList.remove('workout__running--selected');
                } else {
                    workout.classList.remove('workout__cycling--selected');
                }
            });

            if (type === "running") {
                workoutElement.classList.add('workout__running--selected');
            } else {
                workoutElement.classList.add('workout__cycling--selected');
            }
        } catch {
            console.log("Workout removed");
        }
    }

    // Render placeholder marker when user clicks on map
    _renderPlaceholderMarker() {
        // First check if the new workout form is open, if it is then alert the user to fill out the form or close it before proceeding
        if (this.isFormOpen) {
            return alert("Please fill out the form with your workout data or close the form!");
        }
        const {lat, lng} = this.#mapEvent.latlng;
        const coords = [lat, lng];
        this.#placeholderMarker = new L.marker(coords);
        this.#map.addLayer(this.#placeholderMarker);
    }

    // Render workout on map as marker
    _renderWorkoutMarker(workout) {
        // First check if a placeholder marker has been created
        this._isThereAPlaceholderMarker();

        // Create a new marker variable to be added to the map
        const marker = new L.marker(workout.coords, {
            draggable: true
        });

        // Set leaflet id of the marker to be the same as the workout id so that events/features can be added/accessed later on
        // Such as opening the popup on click & reassigning the coords values if the marker is dragged to a new location
        marker._leaflet_id = workout.id;

        // Add the marker to the map and bind a popup to it
        this.#map.addLayer(marker);
        marker.bindPopup(L.popup({
            maxWidth: 300,
            minWidth: 100,
            className: `${workout.type}-popup`
        })).setPopupContent(`${workout.type === "running" ? "🏃" : "🚴‍"} ${workout.description}`)
            .openPopup();

        // Add the marker to the list of markers array
        this.#markers.push(marker);

        // Update the coordinates of the selected workout marker on drag end
        marker.on('dragend', async (e) => {
            // Get the new coordinates from when the marker has stopped being dragged event
            const {lat, lng} = e.target._latlng;

            // Find the marker that was dragged in the array of markers and update its coordinates
            const marker = this.#markers.find(marker => marker._leaflet_id === e.target._leaflet_id);
            marker.coords = [lat, lng];

            // Find the workout bound to the dragged marker and update its coordinates
            const workout = this.#workouts.find(workout => workout.id === e.target._leaflet_id);
            workout.coords = [lat, lng];

            // Get the new city from the new coordinates and update the workout's city value
            await this._getWorkoutCity({lat, lng});
            workout.city = this.city;

            // Update the workout's description and popup content with the new city location where the marker was dragged to
            const description = workout.description;
            const date = description.split(" ").splice(-2).join(" ");
            const type = workout.type[0].toUpperCase() + workout.type.slice(1);
            const updatedContent = `${type} in ${this.city} on ${date}`;

            marker._popup._content = updatedContent;
            workout.description = updatedContent;

            // Update the workout element's inner text content with the new city location where the marker was dragged to
            const workoutElement = this.#workoutElements.find(workoutElement => workoutElement.dataset.id === workout.id);
            workoutElement.querySelector('.workout__title').innerText = updatedContent;

            // Open the popup that's been bound to the workout marker
            this._openPopup(workout.id);

            // Reset local storage to reflect the updated workouts coordinates
            this._setWorkoutsLocalStorage();
        });
    }

    // Once a new workout is created or a workout is edited then attach a click event handler to the edit & delete buttons
    _renderWorkoutEditAndDeleteOperations(element) {
        const editSpecificWorkout = element.querySelector('.workout__modify-edit');
        editSpecificWorkout.addEventListener('click', this._openEditWorkoutModalForm.bind(this));
        const deleteSpecificWorkout = element.querySelector('.workout__modify-delete');
        deleteSpecificWorkout.addEventListener('click', this._deleteSpecificWorkout.bind(this));
    }

    // Create workout element
    _renderWorkoutElement(workout) {
        let element = document.createElement('li');
        element.classList.add(`workout`, `workout__${workout.type}`);
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
          <span class="workout__value--distance">${workout.distance}</span>
          <span class="workout__unit">miles</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value--duration">${workout.duration}</span>
          <span class="workout__unit">minutes</span>
        </div>
       `;

        if (workout.type === "running") {
            html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value--pace">${workout.pace.toFixed(1)}</span>
          <span class="workout__unit">min/mi</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">🦶🏼</span>
          <span class="workout__value--cadence">${workout.cadence}</span>
          <span class="workout__unit">spm</span>
        </div>
    `;
        }

        if (workout.type === "cycling") {
            html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value--speed">${workout.speed.toFixed(1)}</span>
          <span class="workout__unit">mph</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⛰</span>
          <span class="workout__value--elevation">${workout.elevation}</span>
          <span class="workout__unit">m</span>
        </div>
      `;
        }
        element.innerHTML = html;

        // Attach event handlers to the edit & delete buttons on the workout element
        this._renderWorkoutEditAndDeleteOperations(element);

        // Check if the workout element already exists
        this._doesWorkoutElementExist(element);

        return element;
    }

    // Render new workout element to the sidebar list on the page
    _renderWorkoutToPage(workout) {
        const element = this._renderWorkoutElement(workout);
        newWorkoutForm.insertAdjacentElement('afterend', element);
    }

    // Create a new workout object when the user submits the form
    _newWorkout(e) {
        // Prevent page reload
        e.preventDefault();

        // Get city value
        const city = this.city;

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
            workout = new Running(city, [lat, lng], distance, duration, cadence);
        }

        // If cycling workout, create a cycling object
        if (type === 'cycling') {
            const elevation = +newWorkoutInputElevation.value;
            // Check if data is valid
            if (!this._validInputs(distance, duration, elevation) || !this._allPositive(distance, duration)) {
                return alert("Input must be a positive number!");
            }
            workout = new Cycling(city, [lat, lng], distance, duration, elevation);
        }

        // Assign null to the city variable
        this.city = null;

        // Add new workout object to the workouts array
        this.#workouts.push(workout);

        // Render workout on map as a marker
        this._renderWorkoutMarker(workout);

        // Render workout to the sidebar list on the page
        this._renderWorkoutToPage(workout);

        // Highlight the new workout on the sidebar list of workouts
        this._highlightWorkout(workout, this.#workoutElements.at(-1));

        // Store workouts in local storage
        this._setWorkoutsLocalStorage();

        // Clear the form input fields && Hide form
        this._hideForm();

        // Hide the no workouts listed header
        this._hideNoWorkoutsListedHeader();

        // Display the delete all workouts button
        this._showDeleteAllWorkoutsButton();

        // Display the sort workouts by option
        this._showSortWorkoutsByOption();
    }

    // Sort elements by distance or duration
    _sortElements(e) {
        let sortBy = e.target.value.toLowerCase();
        let elements = containerWorkouts.getElementsByTagName('li');

        if (sortBy === "shortest-distance") {
            return Array.from(elements)
                .sort((a, b) => +a.querySelector('.workout__value--distance').innerText - +b.querySelector('.workout__value--distance').innerText)
                .forEach(li => containerWorkouts.appendChild(li));
        }
        if (sortBy === "shortest-duration") {
            return Array.from(elements)
                .sort((a, b) => +a.querySelector('.workout__value--duration').innerText - +b.querySelector('.workout__value--duration').innerText)
                .forEach(li => containerWorkouts.appendChild(li));
        }
        if (sortBy === "longest-distance") {
            return Array.from(elements)
                .sort((a, b) => +b.querySelector('.workout__value--distance').innerText - +a.querySelector('.workout__value--distance').innerText)
                .forEach(li => containerWorkouts.appendChild(li));
        }
        if (sortBy === "longest-duration") {
            return Array.from(elements)
                .sort((a, b) => +b.querySelector('.workout__value--duration').innerText - +a.querySelector('.workout__value--duration').innerText)
                .forEach(li => containerWorkouts.appendChild(li));
        }
    }

    // Delete edited workout & all workouts from local storage
    _deleteAllWorkouts() {
        // Confirm deletion of all workouts
        const confirmDeletion = confirm("Are you sure you want to delete all of the workouts?");

        if (confirmDeletion) {
            localStorage.removeItem("editedWorkout");
            localStorage.removeItem("workouts");
            location.reload();

            this._hideDeleteAllWorkoutsButton();
            this._hideSortWorkoutsByOption();
            this._showNoWorkoutsListedHeader();
        }
    }

    // Delete specific workout from the list of entered workouts
    _deleteSpecificWorkout(e) {
        // First check if the edit workout modal is open when a user decides to delete a workout, if it is then close it
        if (this.isModalOpen) {
            this._closeModal();
        }

        // Confirm deletion of workout
        const confirmDeletion = confirm("Are you sure you want to delete this workout?");

        if (confirmDeletion) {
            const workoutElement = this._findHTMLWorkoutElement(e);
            const workout = this._findWorkoutByElementId(workoutElement.dataset.id);
            const marker = this._findWorkoutMarkerById(workout.id);

            // Remove the selected workout to be deleted from the array of workouts
            this.#workouts = this.#workouts.filter(workout => workout.id !== workoutElement.dataset.id);

            // Remove the workout marker bound to the selected workout to be deleted from the array of markers
            this.#markers = this.#markers.filter(marker => marker._leaflet_id !== workout.id);

            // Remove the workout marker bound to the selected workout to be deleted from the map
            this.#map.removeLayer(marker);

            // Remove the selected workout to be deleted from the sidebar list of workouts
            workoutElement.remove();

            // Check if the workouts array contains workouts data
            this._areWorkoutsListed();

            // Reset the local storage of workouts so that it's updated with the new array of workouts with the deleted workout removed
            this._setWorkoutsLocalStorage();
        }
    }

    // Open the edit workout modal form and set the values in the form with the clicked workout data
    _openEditWorkoutModalForm(e) {
        this._openModal();
        this.workoutElementToEdit = this._findHTMLWorkoutElement(e);
        this.workoutToEdit = this._findWorkoutByElementId(this.workoutElementToEdit.dataset.id);

        editWorkoutInputDistance.value = editWorkoutInputDuration.value = editWorkoutInputCadence.value = editWorkoutInputElevation.value = "";

        // Get the values from the selected workout
        const type = this.workoutToEdit.type;
        const distance = this.workoutToEdit.distance;
        const duration = this.workoutToEdit.duration;

        // Set the current values in the edit workout modal form
        if (type === "running") {
            this._showEditWorkoutCadenceField();
            editWorkoutInputCadence.value = this.workoutToEdit.cadence;
        }
        if (type === "cycling") {
            this._showEditWorkoutElevationField();
            editWorkoutInputElevation.value = this.workoutToEdit.elevation;
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
        const city = this.workoutToEdit.city;
        const id = this.workoutToEdit.id;
        const lat = this.workoutToEdit.coords[0];
        const lng = this.workoutToEdit.coords[1];

        // Get edit workout modal form values on form submit
        const type = editWorkoutInputType.value;
        const distance = +editWorkoutInputDistance.value;
        const duration = +editWorkoutInputDuration.value;

        // If the user edits a running workout, and it remains a running workout then edit the distance, duration, and cadence values
        if (type === "running" && this.workoutToEdit.type === "running") {
            const cadence = +editWorkoutInputCadence.value;
            // Check if data is valid
            if (!this._validInputs(distance, duration, cadence) || !this._allPositive(distance, duration, cadence)) {
                return alert("Input must be a positive number!");
            }
            this.workoutToEdit.distance = distance;
            this.workoutToEdit.duration = duration;
            this.workoutToEdit.cadence = cadence;
        } else if (type === "running" && this.workoutToEdit.type === "cycling") { // If the user edits a cycling workout BUT changes it to a running workout then create a new running workout object while keeping the same id & coords
            const cadence = +editWorkoutInputCadence.value;
            // Check if data is valid
            if (!this._validInputs(distance, duration, cadence) || !this._allPositive(distance, duration)) {
                return alert("Input must be a positive number!");
            }
            this.workoutToEdit = new Running(city, [lat, lng], distance, duration, cadence);
            this.workoutToEdit.id = id;
        } else if (type === "cycling" && this.workoutToEdit.type === "cycling") { // If the user edits a cycling workout, and it remains a cycling workout then edit the distance, duration, and elevation values
            const elevation = +editWorkoutInputElevation.value;
            // Check if data is valid
            if (!this._validInputs(distance, duration, elevation) || !this._allPositive(distance, duration)) {
                return alert("Input must be a positive number!");
            }
            this.workoutToEdit.distance = distance;
            this.workoutToEdit.duration = duration;
            this.workoutToEdit.elevation = elevation;
        } else if (type === "cycling" && this.workoutToEdit.type === "running") { // If the user edits a running workout BUT changes it to a cycling workout then create a new cycling workout object while keeping the same id & coords
            const elevation = +editWorkoutInputElevation.value;
            // Check if data is valid
            if (!this._validInputs(distance, duration, elevation) || !this._allPositive(distance, duration)) {
                return alert("Input must be a positive number!");
            }
            this.workoutToEdit = new Cycling(city, [lat, lng], distance, duration, elevation);
            this.workoutToEdit.id = id;
        }

        // Update the selected workout to be edited in the workouts array with the updated workout values
        const index = this.#workouts.findIndex(workout => workout.id === this.workoutToEdit.id);
        this.#workouts[index] = this.workoutToEdit;

        // Update the marker that's bound to the selected workout to be edited
        this.#map._layers[this.workoutToEdit.id].bindPopup(L.popup({
            maxWidth: 300,
            minWidth: 100,
            className: `${this.workoutToEdit.type}-popup`
        }))
            .setPopupContent(`${this.workoutToEdit.type === "running" ? "🏃" : "🚴‍"} ${this.workoutToEdit.description}`)
            .openPopup();

        // Update the workout element in the sidebar with the new values
        const element = this._renderWorkoutElement(this.workoutToEdit);
        this.workoutElementToEdit.replaceWith(element);

        // Reset the local storage of edited workout & workouts so that the workouts array data is updated along with the workout just edited
        // so that on page reload the map view can be set to that marker
        this._setWorkoutsLocalStorage();

        // Highlight the edited workout
        this._highlightWorkout(this.workoutToEdit, element);

        // Close the edit workout modal
        this._closeModal();
    }

    // Store drawn layers in local storage
    _setDrawnLayersLocalStorage() {
        localStorage.setItem("drawnLayers", JSON.stringify(this.drawnLayers));
    }

    // Store workouts in local storage
    _setWorkoutsLocalStorage() {
        localStorage.setItem("workouts", JSON.stringify(this.#workouts));
    }

    // Get drawn layers from local storage
    _getDrawnLayersLocalStorage() {
        const drawnLayers = JSON.parse(localStorage.getItem("drawnLayers"));

        if (drawnLayers) {
            return this.drawnLayers = drawnLayers;
        }
    }

    // Get workouts from local storage
    _getWorkoutsLocalStorage() {
        const data = JSON.parse(localStorage.getItem("workouts"));

        if (!data || data.length === 0) {
            return this._showNoWorkoutsListedHeader();
        }

        this.#workouts = data;

        this.#workouts.forEach(workout => {
            this._renderWorkoutToPage(workout);
        });

        this._showDeleteAllWorkoutsButton();

        this._showSortWorkoutsByOption();
    }
}

const app = new App();

// Additional Features:
// TODO:
//  Ability to delete a specific workout ✅
//  Ability to edit a workout ✅
//  Ability to drag marker to new location and update the workout object's location data to the new dragged location ✅
//  More error and confirmation messages (confirm deletion of workout with popup) ✅
//  Ability to sort workouts by a certain field (distance, duration, etc.) ✅
//  Ability to position the map to show all workouts on the map ✅
//  Geocode location from coordinates ("Run in {insert location from coordinates}" ✅
//  Ability to draw lines/shapes instead of just points ✅
//  Allow user to edit and delete drawn lines/shapes ✅
//  Change alert notifications to modals
