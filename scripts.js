function openSiteURL(url) {
  window.open(url, '_blank');
}

function openGDriveURL(folderId) {
  const openURL = `https://drive.google.com/drive/folders/${folderId}#grid`;
  window.open(openURL, '_blank');
}

function downloadFile(fileId) {
  const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
  window.open(downloadUrl, '_blank');
}

function showSection(sectionId) {
  document.getElementById('download-episodes').classList.add('hidden');
  document.getElementById('individual-episodes').classList.add('hidden');
  document.getElementById('arc-buttons-container').classList.add('hidden');
  
  document.getElementById(sectionId).classList.remove('hidden');

  if (sectionId === 'individual-episodes') {
    loadArcButtons(); // Load arcs when showing individual episodes
    document.getElementById('arc-buttons-container').classList.remove('hidden');
    filterEpisodes();
  } else if (sectionId === 'download-episodes') {
    document.getElementById('arc-buttons-container').classList.add('hidden');
  }
}

function toggleTheme() {
  document.body.classList.toggle('light-theme');
  const themeToggleButton = document.querySelector('.theme-toggle-button');
  if (document.body.classList.contains('light-theme')) {
    themeToggleButton.textContent = 'Light Mode';
  } else {
    themeToggleButton.textContent = 'Dark Mode';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const themeToggleButton = document.querySelector('.theme-toggle-button');
  if (document.body.classList.contains('light-theme')) {
    themeToggleButton.textContent = 'Light Mode';
  } else {
    themeToggleButton.textContent = 'Dark Mode';
  }
  loadCollectionButtons();
  loadEpisodeButtons();
});

async function fetchCSV(url) {
  const response = await fetch(url);
  const text = await response.text();
  const rows = text.trim().split('\n').slice(1); // Skip header row
  return rows.map(row => row.split(','));
}

function createButton(id, text, fileId, onclickFunction, isHighlighted = false) {
  const button = document.createElement('button');
  button.className = `drive-button${isHighlighted ? ' highlighted' : ''}`;
  button.id = id;
  button.textContent = text;
  button.setAttribute('data-file-id', fileId);
  button.onclick = () => onclickFunction(fileId);
  return button;
}

async function loadCollectionButtons() {
  const data = await fetchCSV('collections.csv');
  const container = document.getElementById('collection-buttons-container');
  container.innerHTML = '';
  originalCollectionButtons = [];
  data.forEach(row => {
    const [id, name, folderId] = row;
    const button = createButton(id, name, folderId, openGDriveURL);
    originalCollectionButtons.push(button);
  });
  filteredCollectionButtons = [...originalCollectionButtons];
  renderCollectionButtons();
}

async function loadEpisodeButtons() {
  const data = await fetchCSV('episodes.csv');
  const fillerEpisodes = await fetchFillerEpisodes();
  const container = document.getElementById('episode-buttons-container');
  originalEpisodeButtons = [];
  fillerHighlights = new Set(); // Initialize the fillerHighlights set

  container.innerHTML = '';
  data.forEach(row => {
    const [id, episodeName, fileId] = row;
    const isHighlighted = fillerEpisodes.has(episodeName.trim());
    const button = createButton(id, episodeName, fileId, downloadFile, isHighlighted);
    originalEpisodeButtons.push(button);
    if (isHighlighted) {
      fillerHighlights.add(episodeName.trim()); // Add to fillerHighlights set if highlighted
    }
  });

  filteredButtons = [...originalEpisodeButtons];
  renderButtons(currentPage);
}

async function fetchFillerEpisodes() {
  const data = await fetchCSV('fillere.csv');
  const fillerEpisodes = new Set(data.map(row => row[0].trim())); // Assuming episode name is in the first column
  return fillerEpisodes;
}

function loadArcButtons() {
  fetchCSV('arc.csv').then(data => {
    const container = document.getElementById('arc-buttons');
    container.innerHTML = '';

    data.forEach(row => {
      const [arcName, collection] = row;
      const [start, end] = collection.split('-').map(num => `EP - ${num.trim()}`);

      const button = document.createElement('button');
      button.className = 'arc-button';
      button.textContent = arcName;
      button.onclick = () => filterEpisodesByArc(start, end, button); // Pass the button to handle highlighting
      container.appendChild(button);
    });
  });
}

let isSelectionActive = false;


function filterEpisodesByArc(start, end, clickedButton) {
  // Highlight the clicked arc button and remove the highlight from others
  const arcButtons = document.querySelectorAll('.arc-button');
  arcButtons.forEach(button => button.classList.remove('active-arc'));
  clickedButton.classList.add('active-arc');

  // Find the index of the start episode
  const startIndex = originalEpisodeButtons.findIndex(button => button.textContent.trim() === start);

  // If the start episode is not found, clear filteredButtons
  if (startIndex === -1) {
    filteredButtons = [];
    renderButtons(1);
    return;
  }

  // Determine the endIndex
  let endIndex = originalEpisodeButtons.length - 1; // Default to the last episode if no end value
  if (end && end !== '-') {
    endIndex = originalEpisodeButtons.findIndex(button => button.textContent.trim() === end);
    if (endIndex === -1) {
      endIndex = originalEpisodeButtons.length - 1; // Use last episode if end is not found
    }
  }

  // Slice the array from startIndex to endIndex
  filteredButtons = originalEpisodeButtons.slice(startIndex, endIndex + 1);
  renderButtons(1);
}

function resetFilter() {
  filteredButtons = [...originalEpisodeButtons];
  renderButtons(1);

  // Clear search input fields
  document.getElementById('episodeSearch').value = '';
  document.getElementById('collectionSearch').value = '';

  // Reset filters and show all episodes
  filteredCollectionButtons = [...originalCollectionButtons];

  // Reapply filler highlights
  originalEpisodeButtons.forEach(button => {
    if (fillerHighlights.has(button.textContent.trim())) {
      button.classList.add('highlighted');
    } else {
      button.classList.remove('highlighted');
    }
  });

  // Remove highlighted class from all arc buttons
  const arcButtons = document.querySelectorAll('.arc-button');
  arcButtons.forEach(button => button.classList.remove('active-arc'));

  // Render all episodes and collections
  renderButtons(currentPage);
  renderCollectionButtons();

  // Ensure arc buttons remain visible
  document.getElementById('arc-buttons-container').classList.remove('hidden');
}

let originalEpisodeButtons = [];
let filteredButtons = [];
const itemsPerPage = 100;
let currentPage = 1;
let fillerHighlights = new Set(); // Initialize fillerHighlights set here

function filterEpisodes() {
  const query = document.getElementById('episodeSearch').value.toLowerCase();

  if (query) {
    filteredButtons = originalEpisodeButtons.filter(button => {
      const episodeText = button.textContent.toLowerCase();
      return episodeText.includes(query);
    });
  } else {
    filteredButtons = [...originalEpisodeButtons];
  }

  currentPage = 1;
  renderButtons(currentPage);

  document.querySelector('.pagination').style.display = filteredButtons.length > itemsPerPage ? 'block' : 'none';
}

function renderButtons(page) {
  const container = document.getElementById('episode-buttons-container');
  const start = (page - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  const pageItems = filteredButtons.slice(start, end);

  container.innerHTML = '';
  pageItems.forEach(button => {
    container.appendChild(button);
  });

  document.getElementById('page-info').textContent = `Page ${page} of ${Math.ceil(filteredButtons.length / itemsPerPage)}`;
  document.getElementById('prev-button').disabled = page === 1;
  document.getElementById('next-button').disabled = page === Math.ceil(filteredButtons.length / itemsPerPage);
}

function changePage(direction) {
  currentPage += direction;
  renderButtons(currentPage);
}

function filterCollections() {
  const query = document.getElementById('collectionSearch').value.trim();

  if (query) {
    const queryNumber = parseInt(query, 10);

    filteredCollectionButtons = originalCollectionButtons.filter(button => {
      const collectionText = button.textContent.trim();
      const match = collectionText.match(/(\d+)\s*-\s*(\d+)/);

      if (match) {
        const startRange = parseInt(match[1], 10);
        const endRange = parseInt(match[2], 10);

        return queryNumber >= startRange && queryNumber <= endRange;
      }

      return collectionText.toLowerCase().includes(query.toLowerCase());
    });
  } else {
    filteredCollectionButtons = [...originalCollectionButtons];
  }

  renderCollectionButtons();
}

function renderCollectionButtons() {
  const container = document.getElementById('collection-buttons-container');
  container.innerHTML = '';
  filteredCollectionButtons.forEach(button => {
    container.appendChild(button);
  });
}
