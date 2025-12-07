// SignaturePad Setup
let signaturePad;
let termsAgreed = false;

// PDF.js variables
let pdfDoc = null;
let currentPage = 1;
let totalPages = 0;
let pdfScale = 1.0;
let baseScale = 1.0;

function initSignaturePad() {
  const canvas = document.getElementById('signatureCanvas');
  if (!canvas) return;
  
  // Clear existing signature pad if it exists
  if (signaturePad) {
    signaturePad.clear();
    signaturePad = null;
  }
  
  // Set canvas size
  const rect = canvas.getBoundingClientRect();
  const ratio = Math.max(window.devicePixelRatio || 1, 1);
  canvas.width = rect.width * ratio;
  canvas.height = 200 * ratio;
  canvas.style.width = rect.width + 'px';
  canvas.style.height = '200px';
  
  const ctx = canvas.getContext('2d');
  ctx.scale(ratio, ratio);
  
  // Initialize SignaturePad
  signaturePad = new SignaturePad(canvas, {
    backgroundColor: 'rgb(255, 255, 255)',
    penColor: 'rgb(0, 0, 0)',
    minWidth: 2,
    maxWidth: 3
  });
}

// Initialize SignaturePad when page loads
document.addEventListener('DOMContentLoaded', function() {
  initSiteDisplay();
  initPdfJs();
  
  // Initialize Lucide icons
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
  // Don't load PDF automatically - wait for modal to open
});

// Initialize PDF.js worker
function initPdfJs() {
  // Wait for PDF.js to be loaded
  if (typeof pdfjsLib !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = './modules/pdfjs-5.4.449-dist/build/pdf.worker.mjs';
  } else {
    // Retry after a short delay if PDF.js hasn't loaded yet
    setTimeout(initPdfJs, 100);
  }
}

// Site contact information mapping
const siteContacts = {
  'JSBHQ': {
    name: 'John Smith',
    number: '0412 345 678'
  },
  // Add more site contacts as needed
  'default': {
    name: 'Site Manager',
    number: '0400 000 000'
  }
};

// Initialize site display from URL parameters
function initSiteDisplay() {
  const params = new URLSearchParams(window.location.search);
  const site = params.get('site') || 'JSBHQ';
  const siteDisplay = document.getElementById('siteDisplay');
  if (siteDisplay) {
    siteDisplay.textContent = site;
  }
  
  // Set today's date
  const dateDisplay = document.getElementById('dateDisplay');
  if (dateDisplay) {
    const today = new Date();
    const dateString = today.toLocaleDateString('en-AU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    dateDisplay.textContent = dateString;
  }
  
  // Set contact information
  const contact = siteContacts[site] || siteContacts['default'];
  const contactName = document.getElementById('contactButton');
  // const contactNumber = document.getElementById('contactNumber');
  if (contactName) {
    contactName.textContent = contact.name + ' - ' + contact.number;
  }
}

// Download vCard function
function downloadVCard() {
  const siteDisplay = document.getElementById('siteDisplay');
  const contactName = document.getElementById('contactName');
  const contactNumber = document.getElementById('contactNumber');
  
  if (!siteDisplay || !contactName || !contactNumber) {
    alert('Contact information not available');
    return;
  }
  
  const site = siteDisplay.textContent;
  const name = contactName.textContent;
  const phone = contactNumber.textContent.replace(/\s/g, ''); // Remove spaces from phone number
  
  // Create vCard content
  const vCardContent = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${name}`,
    `ORG:${site}`,
    `TEL;TYPE=CELL:${phone}`,
    'END:VCARD'
  ].join('\n');
  
  // Create blob and download
  const blob = new Blob([vCardContent], { type: 'text/vcard' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${name.replace(/\s/g, '_')}_${site}.vcf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

// Terms and Conditions Functions (removed checkbox - terms agreed on submission)

async function loadPdf() {
  const loadingDiv = document.getElementById('pdfLoading');
  const container = document.getElementById('pdfViewerContainer');
  const canvas = document.getElementById('termsPdfCanvas');
  
  try {
    // Ensure PDF.js is initialized
    if (typeof pdfjsLib === 'undefined') {
      loadingDiv.innerHTML = '<p style="color: #dc3545;">PDF viewer is still loading. Please wait...</p>';
      return;
    }
    
    // Ensure worker is set up
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = './modules/pdfjs-5.4.449-dist/build/pdf.worker.mjs';
    }
    
    loadingDiv.style.display = 'block';
    container.style.display = 'flex';
    
    // PDF URL - replace with your actual terms PDF URL
    const pdfUrl = './assets/test.pdf';
    
    // Load the PDF
    const loadingTask = pdfjsLib.getDocument(pdfUrl);
    pdfDoc = await loadingTask.promise;
    totalPages = pdfDoc.numPages;
    currentPage = 1;
    
    // Reset zoom and base scale
    pdfScale = 1.0;
    baseScale = 1.0;
    
    // Small delay to ensure container dimensions are calculated
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Render first page
    await renderPage(currentPage);
    
    // Update page controls
    updatePageControls();
    
    loadingDiv.style.display = 'none';
  } catch (error) {
    console.error('Error loading PDF:', error);
    loadingDiv.innerHTML = '<p style="color: #dc3545;">Error loading PDF. Please try again.</p>';
    container.style.display = 'none';
  }
}

async function renderPage(pageNum) {
  const canvas = document.getElementById('termsPdfCanvas');
  const container = document.getElementById('pdfViewerContainer');
  const ctx = canvas.getContext('2d');
  
  try {
    const page = await pdfDoc.getPage(pageNum);
    
    // Get the base viewport
    const viewport = page.getViewport({ scale: 1 });
    
    // Calculate base scale to fit container width (with padding) on first load
    if (baseScale === 1.0) {
      const containerWidth = container.clientWidth || container.offsetWidth || 800;
      const availableWidth = containerWidth - 40; // Account for padding (20px each side)
      baseScale = Math.max(0.5, Math.min(2.0, availableWidth / viewport.width));
      pdfScale = baseScale;
    }
    
    // Apply zoom scale
    const scale = baseScale * pdfScale;
    
    // Create scaled viewport
    const scaledViewport = page.getViewport({ scale: scale });
    
    // Set canvas dimensions with device pixel ratio for crisp rendering
    const outputScale = window.devicePixelRatio || 1;
    canvas.width = Math.floor(scaledViewport.width * outputScale);
    canvas.height = Math.floor(scaledViewport.height * outputScale);
    
    // Reset transform and scale the context to match device pixel ratio
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(outputScale, outputScale);
    
    // Clear canvas
    ctx.clearRect(0, 0, scaledViewport.width, scaledViewport.height);
    
    // Render PDF page into canvas context
    const renderContext = {
      canvasContext: ctx,
      viewport: scaledViewport
    };
    
    await page.render(renderContext).promise;
    
    // Update page info if element exists
    const pageInfo = document.getElementById('pageInfo');
    if (pageInfo) {
      pageInfo.textContent = `Page ${pageNum} of ${totalPages}`;
    }
  } catch (error) {
    console.error('Error rendering page:', error);
  }
}

function previousPage() {
  if (currentPage <= 1) return;
  currentPage--;
  renderPage(currentPage);
  updatePageControls();
}

function nextPage() {
  if (currentPage >= totalPages) return;
  currentPage++;
  renderPage(currentPage);
  updatePageControls();
}

function updatePageControls() {
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  
  if (prevBtn) {
    prevBtn.disabled = currentPage <= 1;
  }
  if (nextBtn) {
    nextBtn.disabled = currentPage >= totalPages;
  }
}

function zoomIn() {
  pdfScale = Math.min(3.0, pdfScale + 0.25);
  renderPage(currentPage);
}

function zoomOut() {
  pdfScale = Math.max(0.5, pdfScale - 0.25);
  renderPage(currentPage);
}

function resetZoom() {
  pdfScale = 1.0;
  renderPage(currentPage);
}

function openSubmitModal() {
  const modal = document.getElementById('submitModal');
  if (!modal) return;
  
  // Validate form first
  const form = document.getElementById('inductionForm');
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  
  modal.style.display = 'flex';
  
  // Initialize signature pad when modal opens
  setTimeout(() => {
    initSignaturePad();
    
    // Load PDF when modal opens
    if (typeof pdfjsLib !== 'undefined') {
      loadPdf();
    } else {
      // Retry if PDF.js hasn't loaded yet
      setTimeout(() => loadPdf(), 500);
    }
  }, 100);
  
  // Close modal when clicking outside
  modal.onclick = function(event) {
    if (event.target === modal) {
      closeSubmitModal();
    }
  };
}

function closeSubmitModal() {
  const modal = document.getElementById('submitModal');
  if (modal) {
    modal.style.display = 'none';
    // Reset PDF state
    pdfDoc = null;
    currentPage = 1;
    totalPages = 0;
    // Clear signature
    if (signaturePad) {
      signaturePad.clear();
    }
    // Reset terms agreement
    termsAgreed = false;
  }
}

function closeTermsModal() {
  const modal = document.getElementById('termsModal');
  if (modal) {
    modal.style.display = 'none';
    // Reset PDF state
    pdfDoc = null;
    currentPage = 1;
    totalPages = 0;
  }
}



function clearSignature() {
  if (signaturePad) {
    signaturePad.clear();
  }
}

// Safety Card Management
function addSafetyCard() {
  const container = document.getElementById('safetyCardsContainer');
  const cardRow = document.createElement('div');
  cardRow.className = 'safety-card-row';
  
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.className = 'safety-card-input safety-card-name';
  nameInput.placeholder = 'Card Name';
  
  const numberInput = document.createElement('input');
  numberInput.type = 'text';
  numberInput.className = 'safety-card-input safety-card-number';
  numberInput.placeholder = 'Card Number';
  
  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'remove-card-btn';
  removeBtn.setAttribute('aria-label', 'Delete');
  removeBtn.innerHTML = '<i data-lucide="trash-2"></i>';
  removeBtn.onclick = function() { removeSafetyCard(this); };
  
  cardRow.appendChild(nameInput);
  cardRow.appendChild(numberInput);
  cardRow.appendChild(removeBtn);
  container.appendChild(cardRow);
  
  // Initialize Lucide icons in the new row
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
  
  // Show remove buttons if there's more than one card
  updateRemoveButtons();
}

function removeSafetyCard(button) {
  const cardRow = button.parentElement;
  cardRow.remove();
  updateRemoveButtons();
}

function updateRemoveButtons() {
  const container = document.getElementById('safetyCardsContainer');
  const rows = container.querySelectorAll('.safety-card-row');
  
  rows.forEach((row, index) => {
    const removeBtn = row.querySelector('.remove-card-btn');
    if (rows.length > 1) {
      removeBtn.style.display = 'block';
    } else {
      removeBtn.style.display = 'none';
    }
  });
}

// Form Handling
function resetForm() {
  if (confirm('Are you sure you want to reset the form? All entered data will be lost.')) {
    document.getElementById('inductionForm').reset();
    if (signaturePad) {
      signaturePad.clear();
    }
    
    // Reset terms agreement
    termsAgreed = false;
    
    // Reset safety cards to just one
    const container = document.getElementById('safetyCardsContainer');
    const rows = container.querySelectorAll('.safety-card-row');
    for (let i = 1; i < rows.length; i++) {
      rows[i].remove();
    }
    updateRemoveButtons();
  }
}

function submitForm() {
  // Automatically set terms as agreed when submitting
  termsAgreed = true;
  
  // Validate signature
  if (!signaturePad || signaturePad.isEmpty()) {
    alert('Please provide a signature before submitting.');
    return;
  }
  
  // Collect form data
  const additionalCards = [];
  const cardRows = document.querySelectorAll('.safety-card-row');
  cardRows.forEach(row => {
    const nameInput = row.querySelector('.safety-card-name');
    const numberInput = row.querySelector('.safety-card-number');
    if (nameInput && numberInput) {
      const name = nameInput.value.trim();
      const number = numberInput.value.trim();
      if (name || number) {
        additionalCards.push({
          name: name,
          number: number
        });
      }
    }
  });
  
  const formData = {
    name: document.getElementById('name').value,
    phone: document.getElementById('phone').value,
    whiteCard: document.getElementById('whiteCard').value,
    additionalCards: additionalCards,
    signature: signaturePad.toDataURL('image/png'),
    termsAgreed: termsAgreed,
    timestamp: new Date().toISOString()
  };
  
  // Log the form data (in a real application, you would send this to a server)
  console.log('Form Data:', formData);
  
  // Close modal
  closeSubmitModal();
  
  // Show success message
  alert('Induction form submitted successfully!\n\nForm data has been logged to the console.');
  
  // Optionally, you could send this to a server:
  // fetch('/api/submit-induction', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(formData)
  // })
  // .then(response => response.json())
  // .then(data => {
  //   alert('Form submitted successfully!');
  //   resetForm();
  // })
  // .catch(error => {
  //   alert('Error submitting form. Please try again.');
  // });
}
