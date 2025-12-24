// Offers Library Management
let offers = [];

// Use shared utility functions (defined in admin.js, loaded first)
const escapeHtml = function(text) {
  if (window.escapeHtml) return window.escapeHtml(text);
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

async function loadOffers() {
  try {
    const response = await fetch('/api/offers');
    if (!response.ok) throw new Error('Failed to load offers');
    offers = await response.json();
    renderOffers();
  } catch (error) {
    console.error('Error loading offers:', error);
    const showErrorFn = window.showError || alert;
    showErrorFn('Failed to load offers');
  }
}

function renderOffers() {
  const container = document.getElementById('offersList');
  if (offers.length === 0) {
    container.innerHTML = '<p class="empty-state">No offers yet. Create your first offer!</p>';
    return;
  }
  
  container.innerHTML = offers.map(offer => `
    <div class="offer-card" data-id="${offer.id}">
      <div class="offer-header">
        <h3>${escapeHtml(offer.name)}</h3>
        <div class="offer-actions">
          <button class="btn btn-small btn-secondary" onclick="editOfferFromLibrary('${offer.id}')">Edit</button>
          <button class="btn btn-small btn-danger" onclick="deleteOfferFromLibrary('${offer.id}')">Delete</button>
        </div>
      </div>
      <div class="offer-info">
        <p><strong>URL:</strong> <a href="${escapeHtml(offer.url)}" target="_blank">${escapeHtml(offer.url)}</a></p>
      </div>
    </div>
  `).join('');
}

// Offer Modal
const offerModal = document.getElementById('offerModal');
const offerForm = document.getElementById('offerForm');
let editingOfferId = null;

document.getElementById('createOfferBtn').addEventListener('click', () => {
  editingOfferId = null;
  document.getElementById('offerModalTitle').textContent = 'Create Offer';
  document.getElementById('offerId').value = '';
  offerForm.reset();
  offerModal.style.display = 'block';
});

offerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const data = {
    name: document.getElementById('offerName').value,
    url: document.getElementById('offerUrl').value
  };
  
  try {
    const url = editingOfferId 
      ? `/api/offers/${editingOfferId}`
      : '/api/offers';
    const method = editingOfferId ? 'PUT' : 'POST';
    
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to save offer');
    }
    
    offerModal.style.display = 'none';
    loadOffers();
  } catch (error) {
    const showErrorFn = window.showError || alert;
    showErrorFn(error.message);
  }
});

document.querySelector('#offerModal .close').addEventListener('click', () => {
  offerModal.style.display = 'none';
});

document.getElementById('cancelOfferBtn').addEventListener('click', () => {
  offerModal.style.display = 'none';
});

async function editOfferFromLibrary(id) {
  const offer = offers.find(o => o.id === id);
  if (!offer) return;
  
  editingOfferId = id;
  document.getElementById('offerModalTitle').textContent = 'Edit Offer';
  document.getElementById('offerId').value = id;
  document.getElementById('offerName').value = offer.name;
  document.getElementById('offerUrl').value = offer.url;
  offerModal.style.display = 'block';
}

async function deleteOfferFromLibrary(id) {
  if (!confirm('Are you sure you want to delete this offer? This will also remove it from all campaigns using it.')) return;
  
  try {
    const response = await fetch(`/api/offers/${id}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Failed to delete offer');
    loadOffers();
    // Reload campaigns if viewing one
    const detailsModal = document.getElementById('campaignDetailsModal');
    if (detailsModal && detailsModal.style.display === 'block') {
      const campaignId = document.getElementById('campaignDetailsContent').dataset.campaignId;
      if (campaignId && typeof viewCampaign === 'function') {
        viewCampaign(campaignId);
      }
    }
  } catch (error) {
    const showErrorFn = window.showError || alert;
    showErrorFn(error.message);
  }
}

