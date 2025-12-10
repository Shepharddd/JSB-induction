/**
 * Toast Notification Component
 * Handles displaying toast notifications for success and error messages
 */

// Toast component configuration
const TOAST_CONFIG = {
  DURATION: 3000,
  DEFAULT_SUCCESS_MESSAGE: "Success!",
  DEFAULT_ERROR_MESSAGE: "Error!"
};

/**
 * Helper function to load and inject CSS
 */
function loadToastCSS(href) {
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
 * Initializes the toast component by injecting HTML and CSS into the page
 */
async function initToast() {
  // Check if toast already exists
  if (document.getElementById("toast")) {
    return;
  }

  // Load CSS
  loadToastCSS("components/toast/toast.css");

  await fetch("components/toast/toast.html")
    .then(res => res.text())
    .then(html => {
      // Create a temporary container to parse the HTML
      const temp = document.createElement('div');
      temp.innerHTML = html;
      const toast = temp.firstElementChild;
      
      if (toast) {
        document.body.appendChild(toast);
      }
    });
}

/**
 * Shows a toast notification
 * @param {string} message - The message to display
 * @param {string} type - The type of toast ('success' or 'error')
 */
function showToast(message = TOAST_CONFIG.DEFAULT_SUCCESS_MESSAGE, type = "success") {
  // Ensure toast is initialized
  if (!document.getElementById("toast")) {
    initToast();
  }

  const toast = document.getElementById("toast");
  const toastMessage = document.getElementById("toastMessage");
  if (toast && toastMessage) {
    toastMessage.textContent = message;
    
    // Remove existing type classes
    toast.classList.remove("success", "error");
    
    // Add appropriate type class
    toast.classList.add(type);
    toast.classList.add("show");
    
    // Hide toast after configured duration
    setTimeout(() => {
      toast.classList.remove("show");
    }, TOAST_CONFIG.DURATION);
  }
}
