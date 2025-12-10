/**
 * Loading Overlay Component
 * Handles displaying and hiding the loading overlay
 */

/**
 * Helper function to load and inject CSS
 */
function loadCSS(href) {
  // Check if stylesheet already exists
  const existingLink = document.querySelector(`link[href="${href}"]`);
  if (existingLink) {
    return;
  }
  
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

/**
 * Initializes the loading component by injecting HTML and CSS into the page
 */
async function initLoading(isLoading = true) {
  // Check if loading overlay already exists
  if (document.getElementById("loadingOverlay")) {
    return;
  }

  // Load CSS
  loadCSS("components/loading/loading.css");

  await fetch("components/loading/loading.html")
    .then(res => res.text())
    .then(html => {
      // Create a temporary container to parse the HTML
      const temp = document.createElement('div');
      temp.innerHTML = html;
      const loading = temp.firstElementChild;
      
      if (!isLoading && loading) {
        loading.classList.add("hidden");
      }
      if (loading) {
        document.body.appendChild(loading);
      }
    });
}

/**
 * Shows or hides the loading overlay
 * @param {boolean} loading - Whether to show (true) or hide (false) the loading overlay
 */
function setLoading(loading) {
  const loadingOverlay = document.getElementById("loadingOverlay");
  if (loadingOverlay) {
    if (loading) {
      loadingOverlay.classList.remove("hidden");
    } else {
      loadingOverlay.classList.add("hidden");
    }
  }
}



