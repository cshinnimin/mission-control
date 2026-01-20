/**
 * Jira Uplink Loading Effect
 * 
 * Shows "Awaiting Jira uplink" loading screen when input.json is missing or empty.
 * Polls every 3 seconds until data is available, then loads the mission-control component.
 */

const CHECK_INTERVAL = 3000; // 3 seconds
let checkTimer = null;

/**
 * Check if input.json exists and has data
 */
async function checkForData() {
  try {
    const response = await fetch('/data/input.json');
    
    if (!response.ok) {
      console.log('input.json not found, will retry...');
      return { hasData: false, data: null };
    }
    
    const data = await response.json();
    
    // Check if data is empty or missing required structure
    if (!data || !data.epics || data.epics.length === 0) {
      console.log('input.json is empty, will retry...');
      return { hasData: false, data: null };
    }
    
    return { hasData: true, data };
  } catch (error) {
    console.log('Error checking for data:', error.message);
    return { hasData: false, data: null };
  }
}

/**
 * Load mission control with data
 */
function loadMissionControl(data) {
  const missionControl = document.getElementById('missionControl');
  if (missionControl) {
    missionControl.setAttribute('data', JSON.stringify(data));
  }
}

/**
 * Hide loading screen and show main content
 */
function hideLoadingScreen() {
  const loadingScreen = document.getElementById('loadingScreen');
  const loadingText = document.getElementById('loadingText');
  const mainContent = document.getElementById('mainContent');
  
  if (!loadingScreen || !mainContent) return;
  
  // Stop the typing animation and cursor
  if (loadingText) {
    loadingText.classList.add('done');
  }
  
  // Fade out loading screen
  setTimeout(() => {
    loadingScreen.classList.add('fade-out');
    mainContent.style.display = 'block';
    
    // Remove loading screen from DOM after fade completes
    setTimeout(() => {
      loadingScreen.remove();
    }, 500);
  }, 800); // Small delay to let the typing animation finish
}

/**
 * Start polling for data
 */
async function startPolling() {
  const result = await checkForData();
  
  if (result.hasData) {
    // Stop polling
    if (checkTimer) {
      clearInterval(checkTimer);
      checkTimer = null;
    }
    
    // Load the data and hide loading screen
    loadMissionControl(result.data);
    hideLoadingScreen();
  } else if (!checkTimer) {
    // Start interval to check every 3 seconds
    checkTimer = setInterval(async () => {
      const checkResult = await checkForData();
      if (checkResult.hasData) {
        // Stop polling
        clearInterval(checkTimer);
        checkTimer = null;
        
        // Load the data and hide loading screen
        loadMissionControl(checkResult.data);
        hideLoadingScreen();
      }
    }, CHECK_INTERVAL);
  }
}

/**
 * Initialize uplink on page load
 */
window.addEventListener('DOMContentLoaded', async () => {
  // First check if data is already available
  const result = await checkForData();
  
  if (result.hasData) {
    // Data is available immediately, load without showing loading screen
    const loadingScreen = document.getElementById('loadingScreen');
    const mainContent = document.getElementById('mainContent');
    
    if (loadingScreen) {
      loadingScreen.style.display = 'none';
    }
    if (mainContent) {
      mainContent.style.display = 'block';
    }
    
    loadMissionControl(result.data);
  } else {
    // No data available, show loading screen and start polling
    startPolling();
  }
});
