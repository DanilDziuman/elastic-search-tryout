// create interface: interaction with the last <div>-game-card + post data submission to elasticsearch

function initModeButtons() {
  const filterModeButton = document.getElementById('filterMode');
  const fulltextModeButton = document.getElementById('fulltextMode');
  const filtersForm = document.getElementById('filtersForm');
  const fulltextForm = document.getElementById('fulltextForm');
  const activeColor = "rgba(171, 98, 171, 0.724)";
  const disabledColor = "rgb(255, 255, 255)";
  filterModeButton.addEventListener('click', (event) => {
    filterModeButton.style.backgroundColor = activeColor;
    fulltextModeButton.style.backgroundColor = disabledColor;
    filtersForm.style.display = "block";
    fulltextForm.style.display = "none";
  });

  fulltextModeButton.addEventListener('click', (event) => {
    filterModeButton.style.backgroundColor = disabledColor;
    fulltextModeButton.style.backgroundColor = activeColor;
    filtersForm.style.display = "none";
    fulltextForm.style.display = "block";
  });
}

initModeButtons();

function initPlatformAddingButtons() {
  const addPlatformButtons = Array.from(document.getElementsByClassName('add-button'));
  addPlatformButtons.forEach(button => {
    button.addEventListener('click', (event) => {
      const newPlatformContainer = document.createElement('div');
      const newPlatformCheckbox = document.createElement('input');
      const newPlatformLabel = document.createElement('label');
      const newPlatformInput = document.createElement('input');
      const newID = button.parentElement.querySelectorAll('input[type="checkbox"]').length + 1;
  
      newPlatformCheckbox.id = `newGameCard_platform${newID}`;
      newPlatformCheckbox.name = 'platforms';
      newPlatformCheckbox.value = ""; // to be defined on submitting a new game
      newPlatformCheckbox.checked = true;
      newPlatformCheckbox.type = 'checkbox';
      newPlatformLabel.for = newPlatformCheckbox.id;
      newPlatformInput.type = 'text';
      // newPlatformInput.pattern = ".*\S+.*"; // 1+ non-space char
      newPlatformInput.id = `newGameCard_platformText${newID}`;

      newPlatformLabel.appendChild(newPlatformInput);
      newPlatformContainer.appendChild(newPlatformCheckbox);
      newPlatformContainer.appendChild(newPlatformLabel);
      button.parentElement.insertBefore(newPlatformContainer, button);
    });
  });
}

initPlatformAddingButtons();

function initGameCreation() {
  const textAreas = document.querySelectorAll('.card-property-block>textarea');
  textAreas.forEach(textarea => {
    textarea.addEventListener('keyup', (event) => {
      event.target.style.height = 'auto';
      const scHeight = event.target.scrollHeight;
      event.target.style.height = `${scHeight}px`;
    })
  });

  const form = document.getElementById('newGameForm');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const platformsTextual = Array.from(form.querySelectorAll('input:checked+label>input[type="text"]'));
    formData.delete('platforms');
    const uniqueValidPlatforms = platformsTextual.reduce((platforms, currentInput) => {
      const trimmed = currentInput.value.trim();
      if (trimmed && !platforms.includes(trimmed)) {
        platforms.push(trimmed);
        formData.append('platforms', trimmed);
      }
      return platforms;
    }, []);
    if (!formData.has('platforms')) {
      alert('Please, enter at least 1 supported game platform');
      return;
    }
    console.log(formData.getAll('platforms'));
    const res = await fetch('/api/games/create', {
      method: 'POST',
      body: formData
    });
    const resBody = await res.json();
    alert(resBody.message);
    if (res.status === 201) { // succsessful creation
      // check if created game follows active filters
      // if yes, add new game-card element with it immediately
      // clear up creation form
      Array.from(form.querySelector('fieldset.card-support').querySelectorAll('div')).forEach(div => {
        div.remove();
      });
      Array.from(form.querySelectorAll('input')).forEach(input => {
        input.value = '';
      });
      textAreas.forEach(textarea => {
        textarea.value = '';
      })
    }
  });
}

initGameCreation();

// remove interface: interaction with the 'delete' <button>s + removing from elastic database

// fiiiiilteeeeeeeers

function initCustomFilterButtons() {
  function setupCustomFilter(filterContainerID) {
    const filterContainer = document.getElementById(`${filterContainerID.toLowerCase()}-filter`);
    const customContainer = filterContainer.querySelector('div[class="custom-container"]');
    const addButton = customContainer.querySelector('button');
    addButton.addEventListener('click', (event) => {
      const currentCheckboxes = Array.from(filterContainer.querySelectorAll(`input[name="${filterContainerID.toLowerCase()}"]`));
      const newFilterInputs = Array.from(customContainer.querySelectorAll('input'));
      const newFilterValues = newFilterInputs.map(input => {
        return input.value.trim();
      });
      if (newFilterValues.indexOf('') !== -1) {
        alert(`Please, fill up the custom '${filterContainerID}' filter before adding`);
        return;
      }
      const isUnique = isUniqueFilter(filterContainerID, currentCheckboxes, newFilterValues);
      if (!isUnique) {
        alert(`Please, enter a unique custom '${filterContainerID}' filter`);
        return;
      }
      const divContainer = document.createElement('div');
      if (filterContainerID === 'Company' || 
          filterContainerID === 'Platforms' ||
          filterContainerID === 'CompanyIncludes') {
        divContainer.innerHTML =
        `<input id="${newFilterValues[0].toLowerCase()}Checkbox" type="checkbox" name="${filterContainerID.toLowerCase()}" value="${newFilterValues[0]}" checked>
         <label for="${newFilterValues[0].toLowerCase()}Checkbox" class="filter-label">${newFilterValues[0]}</label>`;
      } else if (filterContainerID === 'Released') {
        divContainer.innerHTML =
        `<input id="${newFilterValues[0]}/${newFilterValues[1]}Checkbox" type="checkbox" name="${filterContainerID.toLowerCase()}" value="${newFilterValues[0]}/${newFilterValues[1]}" checked>
         <label for="${newFilterValues[0]}/${newFilterValues[1]}Checkbox" class="filter-label">${newFilterValues[0]}...${newFilterValues[1]}</label>`;
      } else if (filterContainerID === 'Rating') {
        divContainer.innerHTML = 
        `<input id="${newFilterValues[0]}-${newFilterValues[1]}${filterContainerID.toLowerCase()}Checkbox" type="checkbox" name="${filterContainerID.toLowerCase()}" value="${newFilterValues[0]}-${newFilterValues[1]}" checked>
         <label for="${newFilterValues[0]}-${newFilterValues[1]}${filterContainerID.toLowerCase()}Checkbox" class="filter-label">${newFilterValues[0]}...${newFilterValues[1]}</label>`;
      }
      // clearing the customContainer inputs:
      newFilterInputs.forEach(input => {
        input.value = '';
      })
      filterContainer.appendChild(divContainer);
      filterContainer.appendChild(customContainer);
    });
  }

  function isUniqueFilter(filterContainerID, currentCheckboxes, filterValues) {
    let isUnique = false;
    if (filterContainerID === 'Company' || 
        filterContainerID === 'Platforms' || 
        filterContainerID === 'CompanyIncludes') {
      isUnique = currentCheckboxes.find(checkbox => checkbox.value === filterValues[0]) ? false : true;
    } else if (filterContainerID === 'Rating') {
      const duplicateID = currentCheckboxes.findIndex(checkbox => {
        const ratingEdges = checkbox.value.split('-');
        return ratingEdges.every((edge, index) => edge === filterValues[index]);
      });
      if (duplicateID === -1) {
        isUnique = true;
      }
    } else if (filterContainerID === 'Released') {
      const duplicateID = currentCheckboxes.findIndex(checkbox => {
        const releaseEdges = checkbox.value.split('/');
        return releaseEdges.every((edge, index) => edge === filterValues[index]);
      });
      if (duplicateID === -1) {
        isUnique = true;
      }
    }
    return isUnique;
  }
  setupCustomFilter('Company');
  setupCustomFilter('CompanyIncludes');
  setupCustomFilter('Platforms');
  setupCustomFilter('Released');
  setupCustomFilter('Rating');
}

initCustomFilterButtons();

function initGameSearchByFilters() {
  async function handleSubmit(event, searchAPI) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const queryParams = new URLSearchParams(formData);
    // res.body.json() => [ { title: ..., company: ..., platforms: ["", "", ""], released: 2017-01-02, rating: 3.1 }, { ... }, { ... } ]
    const response = await fetch(`${searchAPI}?${queryParams}`, {
      method: 'GET',
    });
    const foundGames = (await response.json()).result;
    console.log(foundGames);
    const gameCardsWrapper = document.querySelector('div.games-flex-wrapper');
    const lastCustomGameCard = gameCardsWrapper.querySelector('div.game-card:last-child');
    gameCardsWrapper.innerHTML = '';
    for (let i = 0; i < foundGames.length; i++) {
      const game = foundGames[i]._source;
      if (typeof game.platforms === 'string') { // костиль
        game.platforms = [game.platforms]
      }
      const supportedFieldset = document.createElement('fieldset');
      const supportedLabel = document.createElement('label');
      supportedFieldset.className = 'card-support';
      supportedLabel.className = 'card-property-label';
      supportedLabel.innerHTML = 'Supported at';
      supportedFieldset.appendChild(supportedLabel);
      for (let j = 0; j < game.platforms.length; j++) {
        const appendedPlatform = document.createElement('div');
        appendedPlatform.innerHTML = 
        `<input id="gameCard${i+1}_platform${j+1}" name="platforms" type="checkbox" value="${game.platforms[j]}" checked disabled>
         <label for="gameCard${i+1}_platform${j+1}">${game.platforms[j]}</label>`;
        supportedFieldset.appendChild(appendedPlatform);
      }
      const supportedEditButton = document.createElement('button');
      supportedEditButton.type = 'button';
      supportedEditButton.className = 'interactable-button edit-button';
      supportedFieldset.appendChild(supportedEditButton);
      const appendedGameCard = document.createElement('div');
      appendedGameCard.className = 'game-card';
      appendedGameCard.innerHTML = 
      `<h3>${game.title}</h3>
      <form>
        <div class="card-property-block">
          <label for="gameCard${i+1}_company" class="card-property-label">Produced by</label>
          <input id="gameCard${i+1}_company" name="company" type="text" value="${game.company}" pattern=".*\S+.*" disabled>
          <button type="button" class="interactable-button edit-button"></button>
        </div>
        ${supportedFieldset.outerHTML}
        <div class="card-property-block">
          <label for="gameCard${i+1}_released" class="card-property-label">Released </label>
          <input id="gameCard${i+1}_released" name="released" type="date" value="${game.released}" min="1970-01-01" max="2023-03-24" disabled>
          <button type="button" class="interactable-button edit-button"></button>
        </div>
        <div class="card-property-block">
          <label for="gameCard${i+1}_rating" class="card-property-label">Rating: </label>
          <input id="gameCard${i+1}_rating" name="rating" type="number" value="${game.rating}" min="0" max="5" step="0.1" disabled>
          <button type="button" class="interactable-button edit-button"></button>
        </div>
        <div class="card-property-block" about>
          <label for="gameCard${i+1}_about" class="card-property-label">About: </label>
          <textarea id="gameCard${i+1}_about" name="about" disabled>${game.about}</textarea>
          <button type="button" class="interactable-button edit-button"></button>
        </div>
        <div class="card-property-block" review>
          <label for="gameCard${i+1}_review" class="card-property-label">Review: </label>
          <textarea id="gameCard${i+1}_review" name="review" disabled>${game.review}</textarea>
          <button type="button" class="interactable-button edit-button"></button>
        </div>
        <button type="button" class="interactable-button delete-button" onclick="gameDeleteHandler(this)" id="${game.title}Delete"></button>
      </form>`;
  
      gameCardsWrapper.appendChild(appendedGameCard);
    }
    gameCardsWrapper.appendChild(lastCustomGameCard);

    // FINISH THIS METHOD UP AFTER BACK-END!
  }
  
  const filtersForm = document.getElementById('filtersForm');
  const fulltextForm = document.getElementById('fulltextForm');
  filtersForm.addEventListener('submit', async (event) => {
    await handleSubmit(event, '/api/games/filter');
  });
  fulltextForm.addEventListener('submit', async (event) => {
    await handleSubmit(event, '/api/games/fulltext');
  })

}

initGameSearchByFilters();

async function gameDeleteHandler(button) {
  const gameTitle = button.id.slice(0, -6); // every button ID = "<title>Delete"
  console.log(gameTitle);
  const encodedGameID = encodeURIComponent(gameTitle);
  const response = await fetch(`/api/games/delete/${encodedGameID}`, {
    method: 'DELETE'
  });
  console.log(response);
  const gameCard = button.parentElement.parentElement;
  gameCard.remove();
}