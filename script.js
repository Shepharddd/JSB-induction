// SignaturePad Setup
let signaturePad;

// Store contact information for vCard download
let contactInfo = {
  name: null,
  phone: null
};

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

// Initialize application
async function init() {
  await initLoading();
  await initToast();

  const params = new URLSearchParams(window.location.search);
  const site_param = params.get('site') || 'JSBHQ';

  const { siteInfo, inductionData } = await fetchSiteData(site_param);

  // Initialize site display (site name, date, contact info) and get site name
  await initSiteDisplay(siteInfo);

  // Load induction content and populate from JSON (pass site for API fetch)
  await loadInductionContent(inductionData);
  
  // Initialize safety card remove buttons visibility
  updateRemoveButtons();
  setLoading(false);
}

// Run initialization when DOM is ready
document.addEventListener('DOMContentLoaded', init);

// Fetch site contact and induction data from API (single call)
async function fetchSiteData(site) {
  try {
    // Fetch combined site data from single API endpoint
    const response = await fetch(`https://default68237f8abf3c425bb92b9518c6d4bf.18.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/93c563fe47744e2990ec3ed2d3fc2ce0/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=1QzeWw_UP5WztZtyg4XqP-gsRsdqMQtm2R0hmU1xkXE`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ site: site })
    });
    
    const data = await response.json();

    // Separate the combined response into site contact and induction data
    return { 
      siteInfo: data.siteInfo || null,
      inductionData: data.inductionData || null
    };

  } catch (error) {
    console.error('Error fetching site data from API:', error);
  }
}

// Initialize site display from URL parameters
async function initSiteDisplay(siteInfo) {
  
  const siteDisplay = document.getElementById('siteDisplay');
  if (siteDisplay && siteInfo) {
    siteDisplay.textContent = siteInfo.Name;
  }

  // Set site address
  const siteAddress = document.getElementById('siteAddress');
  if (siteAddress && siteInfo && siteInfo.Address) {
    siteAddress.textContent = siteInfo.Address;
  }
  
  // Set today's date
  const dateDisplay = document.getElementById('dateDisplay');
  if (dateDisplay) {
    const today = new Date();
    
    // Format: Tuesday, 22nd of March
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                    'July', 'August', 'September', 'October', 'November', 'December'];
    
    const dayName = days[today.getDay()];
    const day = today.getDate();
    const monthName = months[today.getMonth()];
    
    // Add ordinal suffix (st, nd, rd, th)
    let daySuffix = 'th';
    if (day === 1 || day === 21 || day === 31) {
      daySuffix = 'st';
    } else if (day === 2 || day === 22) {
      daySuffix = 'nd';
    } else if (day === 3 || day === 23) {
      daySuffix = 'rd';
    }
    
    const dateString = `${dayName}, ${day}${daySuffix} of ${monthName}`;
    dateDisplay.textContent = dateString;
  }

  const contactName = document.getElementById('contactButton');
  if (contactName && siteInfo && siteInfo.SiteContact) {
    // Parse SiteContact to extract name and phone
    // Format is typically "Name - Phone"
    const contactParts = siteInfo.SiteContact.split(' - ');
    const name = contactParts[0] || siteInfo.SiteContact;
    const phone = contactParts[1] ? contactParts[1].trim() : '';
    
    // Store contact info for vCard download
    contactInfo.name = name;
    contactInfo.phone = phone;
    
    // Display only the name on the button
    contactName.textContent = name;
  }
  
}

// Load induction content from separate file
async function loadInductionContent(inductionData) {
  const contentDiv = document.getElementById('inductionContent');
  if (!contentDiv) return;
  
  try {
    const response = await fetch('induction-content.html');
    if (response.ok) {
      const html = await response.text();
      contentDiv.innerHTML = html;

      // const data = inductionData.json();
      
      // Populate all fields with data-field attributes
      const fields = document.querySelectorAll('[data-field]');
      fields.forEach(field => {
        const fieldKey = field.getAttribute('data-field');
        if (fieldKey && inductionData[fieldKey] !== undefined) {
          field.textContent = inductionData[fieldKey];
        }
      });
    } else {
      console.error('Failed to load induction content');
    }
  } catch (error) {
    console.error('Error loading induction content:', error);
  }
}

// Download vCard function
function downloadVCard() {
  const siteDisplay = document.getElementById('siteDisplay');
  
  if (!siteDisplay) {
    showToast('Site information not available', 'error');
    return;
  }
  
  // Use stored contact information
  const name = contactInfo.name || 'Site Contact';
  const phone = contactInfo.phone ? contactInfo.phone.replace(/\s/g, '') : '';
  
  if (!phone) {
    showToast('Phone number not available', 'error');
    return;
  }
  
  const site = siteDisplay.textContent;
  
  // Create vCard content
  const vCardContent = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${name}`,
    // `ORG:${site}`,
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
  
  // Prevent body scrolling when modal is open
  document.body.style.overflow = 'hidden';
  
  // Initialize signature pad when modal opens
  setTimeout(() => {
    initSignaturePad();
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
    // Restore body scrolling when modal is closed
    document.body.style.overflow = '';
    // Clear signature
    if (signaturePad) {
      signaturePad.clear();
    }
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
  const iconImg = document.createElement('img');
  iconImg.src = './assets/trash-2.svg';
  iconImg.alt = 'Delete';
  iconImg.style.width = '24px';
  iconImg.style.height = '24px';
  removeBtn.appendChild(iconImg);
  removeBtn.onclick = function() { removeSafetyCard(this); };
  
  cardRow.appendChild(nameInput);
  cardRow.appendChild(numberInput);
  cardRow.appendChild(removeBtn);
  container.appendChild(cardRow);
  
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
  if (!container) return;
  
  const rows = container.querySelectorAll('.safety-card-row');
  
  rows.forEach((row, index) => {
    const removeBtn = row.querySelector('.remove-card-btn');
    if (removeBtn) {
      if (rows.length > 1) {
        removeBtn.style.display = 'block';
      } else {
        removeBtn.style.display = 'none';
      }
    }
  });
}

// Form Handling
function resetForm() {
  document.getElementById('inductionForm').reset();
  if (signaturePad) {
    signaturePad.clear();
  }
  
  // Reset safety cards to just one
  // const container = document.getElementById('safetyCardsContainer');
  // const rows = container.querySelectorAll('.safety-card-row');
  // for (let i = 1; i < rows.length; i++) {
  //   rows[i].remove();
  // }
  // updateRemoveButtons();
}

function submitForm() {
  // Validate signature
  if (!signaturePad || signaturePad.isEmpty()) {
    showToast('Please provide a signature before submitting.', 'error');
    return;
  }
  
  // Collect form data
  // const additionalCards = [];
  // const cardRows = document.querySelectorAll('.safety-card-row');
  // cardRows.forEach(row => {
  //   const nameInput = row.querySelector('.safety-card-name');
  //   const numberInput = row.querySelector('.safety-card-number');
  //   if (nameInput && numberInput) {
  //     const name = nameInput.value.trim();
  //     const number = numberInput.value.trim();
  //     if (name || number) {
  //       additionalCards.push({
  //         name: name,
  //         number: number
  //       });
  //     }
  //   }
  // });
  
    // Parse date from display text (format: Tuesday, 22nd of March)
    const dateText = document.getElementById('dateDisplay').innerText;
    let parsedDate = new Date(); // Default to today if parsing fails
    
    if (dateText) {
      // Extract day and month from format like "Tuesday, 22nd of March"
      const match = dateText.match(/(\d+)(?:st|nd|rd|th)\s+of\s+(\w+)/);
      if (match) {
        const day = parseInt(match[1], 10);
        const monthName = match[2];
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'];
        const month = months.indexOf(monthName);
        
        if (month !== -1) {
          const year = new Date().getFullYear(); // Use current year
          parsedDate = new Date(year, month, day);
        }
      }
    }
    
    const formData = {
      date: parsedDate ? parsedDate.toISOString() : dateText,
      site: document.getElementById('siteDisplay').innerText,
      fullName: document.getElementById('name').value,
      phoneNumber: document.getElementById('phone').value,
      whiteCardNumber: document.getElementById('whiteCard').value,
      signature: signaturePad.toDataURL('image/png'),
      timestamp: new Date().toISOString()
    };
  
  // Log the form data
  console.log('Form Data:', formData);
  
  // Close modal
  closeSubmitModal();
  
  // Show loading
  setLoading(true);
  
  // Submit to server
  fetch('https://default68237f8abf3c425bb92b9518c6d4bf.18.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/95a3332058cc435ba3dc09ec8454ab2e/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=uQZO00H7wt1z8RHqtiLH5mhVO30CboF2_wSHvH9uB-U', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData)
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
  })
  .then(() => {
    setLoading(false);
    showToast('Form submitted successfully!', 'success');
    resetForm();
  })
  .catch(error => {
    setLoading(false);
    console.error('Error submitting form:', error);
    showToast('Error submitting form. Please try again.', 'error');
  });
}
