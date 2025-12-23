// Check authentication
let currentUser = null;

async function checkAuth() {
  try {
    const response = await fetch('/api/auth/me');
    if (!response.ok) {
      window.location.href = '/login';
      return;
    }
    currentUser = await response.json();
    document.getElementById('username').textContent = currentUser.username;
    
    // Show admin section if user is admin
    if (currentUser.is_admin) {
      document.getElementById('adminSection').style.display = 'block';
      loadPendingUsers();
    }
  } catch (error) {
    window.location.href = '/login';
  }
}

// Load pending users (admin only)
async function loadPendingUsers() {
  try {
    console.log('Loading pending users, currentUser:', currentUser);
    const response = await fetch('/api/admin/pending-users');
    if (!response.ok) {
      if (response.status === 403) {
        // Not an admin, hide the section
        console.log('Not an admin, hiding admin section');
        document.getElementById('adminSection').style.display = 'none';
        return;
      }
      const errorData = await response.json().catch(() => ({}));
      console.error('Failed to load pending users:', response.status, errorData);
      throw new Error(errorData.error || 'Failed to load pending users');
    }
    const pendingUsers = await response.json();
    console.log('Loaded pending users:', pendingUsers);
    renderPendingUsers(pendingUsers);
  } catch (error) {
    console.error('Error loading pending users:', error);
  }
}

function renderPendingUsers(users) {
  const container = document.getElementById('pendingUsersList');
  if (users.length === 0) {
    container.innerHTML = '<p class="empty-state">No pending users</p>';
    return;
  }
  
  container.innerHTML = users.map(user => `
    <div class="pending-user-card">
      <div class="user-info">
        <h4>${escapeHtml(user.username)}</h4>
        ${user.email ? `<p>${escapeHtml(user.email)}</p>` : ''}
        <p class="user-date">Registered: ${new Date(user.created_at).toLocaleDateString()}</p>
      </div>
      <div class="user-actions">
        <button class="btn btn-small btn-primary" onclick="approveUser('${user.id}')">Approve</button>
        <button class="btn btn-small btn-danger" onclick="rejectUser('${user.id}')">Reject</button>
      </div>
    </div>
  `).join('');
}

async function approveUser(userId) {
  if (!confirm('Approve this user?')) return;
  
  try {
    const response = await fetch(`/api/admin/users/${userId}/approve`, {
      method: 'POST'
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to approve user');
    }
    
    loadPendingUsers();
    loadCampaigns();
  } catch (error) {
    alert(error.message);
  }
}

async function rejectUser(userId) {
  if (!confirm('Reject and delete this user? This cannot be undone.')) return;
  
  try {
    const response = await fetch(`/api/admin/users/${userId}/reject`, {
      method: 'POST'
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to reject user');
    }
    
    loadPendingUsers();
  } catch (error) {
    alert(error.message);
  }
}

// Logout
document.getElementById('logoutBtn').addEventListener('click', async () => {
  await fetch('/api/auth/logout', { method: 'POST' });
  window.location.href = '/login';
});

// Load campaigns
let campaigns = [];

async function loadCampaigns() {
  try {
    const response = await fetch('/api/campaigns');
    if (!response.ok) throw new Error('Failed to load campaigns');
    campaigns = await response.json();
    renderCampaigns();
  } catch (error) {
    console.error('Error loading campaigns:', error);
    showError('Failed to load campaigns');
  }
}

function renderCampaigns() {
  const container = document.getElementById('campaignsList');
  if (campaigns.length === 0) {
    container.innerHTML = '<p class="empty-state">No campaigns yet. Create your first campaign!</p>';
    return;
  }
  
  container.innerHTML = campaigns.map(campaign => `
    <div class="campaign-card" data-id="${campaign.id}">
      <div class="campaign-header">
        <h3>${escapeHtml(campaign.name)}</h3>
        <div class="campaign-actions">
          <button class="btn btn-small btn-primary" onclick="viewCampaign('${campaign.id}')">View</button>
          <button class="btn btn-small btn-secondary" onclick="editCampaign('${campaign.id}')">Edit</button>
          <button class="btn btn-small btn-danger" onclick="deleteCampaign('${campaign.id}')">Delete</button>
        </div>
      </div>
      <div class="campaign-info">
        <p><strong>Slug:</strong> <code>${escapeHtml(campaign.slug)}</code></p>
        <p><strong>Link:</strong> <code>${escapeHtml(window.location.origin + '/c/' + campaign.slug)}</code></p>
        <p><strong>Timezone:</strong> ${escapeHtml(campaign.timezone)}</p>
      </div>
    </div>
  `).join('');
}

// Create Campaign Modal
const campaignModal = document.getElementById('campaignModal');
const campaignForm = document.getElementById('campaignForm');
let editingCampaignId = null;

document.getElementById('createCampaignBtn').addEventListener('click', () => {
  editingCampaignId = null;
  document.getElementById('modalTitle').textContent = 'Create Campaign';
  document.getElementById('campaignId').value = '';
  campaignForm.reset();
  campaignModal.style.display = 'block';
});

campaignForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const data = {
    name: document.getElementById('campaignName').value,
    slug: document.getElementById('campaignSlug').value || undefined,
    timezone: document.getElementById('campaignTimezone').value,
    fallback_offer_url: document.getElementById('fallbackUrl').value
  };
  
  try {
    const url = editingCampaignId 
      ? `/api/campaigns/${editingCampaignId}`
      : '/api/campaigns';
    const method = editingCampaignId ? 'PUT' : 'POST';
    
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to save campaign');
    }
    
    campaignModal.style.display = 'none';
    loadCampaigns();
  } catch (error) {
    showError(error.message);
  }
});

document.querySelector('#campaignModal .close').addEventListener('click', () => {
  campaignModal.style.display = 'none';
});

document.getElementById('cancelCampaignBtn').addEventListener('click', () => {
  campaignModal.style.display = 'none';
});

async function editCampaign(id) {
  const campaign = campaigns.find(c => c.id === id);
  if (!campaign) return;
  
  editingCampaignId = id;
  document.getElementById('modalTitle').textContent = 'Edit Campaign';
  document.getElementById('campaignId').value = id;
  document.getElementById('campaignName').value = campaign.name;
  document.getElementById('campaignSlug').value = campaign.slug;
  document.getElementById('campaignTimezone').value = campaign.timezone;
  document.getElementById('fallbackUrl').value = campaign.fallback_offer_url;
  campaignModal.style.display = 'block';
}

async function deleteCampaign(id) {
  if (!confirm('Are you sure you want to delete this campaign?')) return;
  
  try {
    const response = await fetch(`/api/campaigns/${id}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Failed to delete campaign');
    loadCampaigns();
  } catch (error) {
    showError(error.message);
  }
}

// View Campaign Details
const detailsModal = document.getElementById('campaignDetailsModal');

async function viewCampaign(id) {
  try {
    const response = await fetch(`/api/campaigns/${id}`);
    if (!response.ok) throw new Error('Failed to load campaign');
    const campaign = await response.json();
    
    // Load stats
    const statsResponse = await fetch(`/api/campaigns/${id}/stats`);
    const stats = statsResponse.ok ? await statsResponse.json() : null;
    
    renderCampaignDetails(campaign, stats);
    detailsModal.style.display = 'block';
  } catch (error) {
    showError(error.message);
  }
}

function renderCampaignDetails(campaign, stats) {
  const content = document.getElementById('campaignDetailsContent');
  const baseUrl = window.location.origin;
  
  content.innerHTML = `
    <div class="campaign-details">
      <div class="detail-section">
        <h4>Campaign Information</h4>
        <p><strong>Name:</strong> ${escapeHtml(campaign.name)}</p>
        <p><strong>Slug:</strong> <code>${escapeHtml(campaign.slug)}</code></p>
        <p><strong>Campaign URL:</strong> <code>${escapeHtml(baseUrl + '/c/' + campaign.slug)}</code></p>
        <p><strong>Timezone:</strong> ${escapeHtml(campaign.timezone)}</p>
        <p><strong>Fallback URL:</strong> <a href="${escapeHtml(campaign.fallback_offer_url)}" target="_blank">${escapeHtml(campaign.fallback_offer_url)}</a></p>
      </div>
      
      ${stats ? `
      <div class="detail-section">
        <h4>Statistics</h4>
        <p><strong>Total Clicks:</strong> ${stats.overall.total_clicks || 0}</p>
        <p><strong>Fallback Clicks:</strong> ${stats.overall.fallback_clicks || 0}</p>
        <p><strong>Unique Days:</strong> ${stats.overall.unique_days || 0}</p>
      </div>
      ` : ''}
      
      <div class="detail-section">
        <h4>Offers</h4>
        <button class="btn btn-primary btn-small" onclick="addOffer('${campaign.id}')">+ Add Offer</button>
        <div id="offersList" class="offers-list"></div>
      </div>
    </div>
  `;
  
  renderOffers(campaign.offers || []);
}

function renderOffers(offers) {
  const container = document.getElementById('offersList');
  if (offers.length === 0) {
    container.innerHTML = '<p class="empty-state">No offers yet. Add your first offer!</p>';
    return;
  }
  
  container.innerHTML = offers.map(offer => `
    <div class="offer-card">
      <div class="offer-header">
        <h5>${escapeHtml(offer.name)}</h5>
        <div class="offer-actions">
          <button class="btn btn-small btn-secondary" onclick="editOffer('${offer.id}')">Edit</button>
          <button class="btn btn-small btn-danger" onclick="deleteOffer('${offer.id}')">Delete</button>
        </div>
      </div>
      <p><strong>URL:</strong> <a href="${escapeHtml(offer.url)}" target="_blank">${escapeHtml(offer.url)}</a></p>
      <p><strong>Priority:</strong> ${offer.priority}</p>
      <div class="time-rules">
        <strong>Time Rules:</strong>
        <button class="btn btn-small btn-primary" onclick="addTimeRule('${offer.id}')">+ Add Rule</button>
        <div class="rules-list">
          ${(offer.time_rules || []).map(rule => `
            <div class="rule-item">
              <span>${escapeHtml(rule.rule_type)}: ${escapeHtml(rule.start_time)}${rule.end_time ? ' - ' + escapeHtml(rule.end_time) : ''}</span>
              <span>${rule.day_of_week !== null ? 'Day: ' + rule.day_of_week : 'All days'}</span>
              <span>${rule.timezone || 'Campaign default'}</span>
              <button class="btn btn-small btn-danger" onclick="deleteTimeRule('${rule.id}')">Delete</button>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `).join('');
}

document.querySelector('#campaignDetailsModal .close').addEventListener('click', () => {
  detailsModal.style.display = 'none';
});

// Utility functions
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showError(message) {
  alert(message); // Simple alert for now
}

// Placeholder functions for offer/time rule management
function addOffer(campaignId) {
  const name = prompt('Offer name:');
  if (!name) return;
  const url = prompt('Offer URL:');
  if (!url) return;
  const priority = parseInt(prompt('Priority (0 = highest):') || '0');
  
  fetch(`/api/campaigns/${campaignId}/offers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, url, priority })
  }).then(() => {
    const campaign = campaigns.find(c => c.id === campaignId);
    if (campaign) viewCampaign(campaignId);
  });
}

function editOffer(id) {
  alert('Edit offer functionality - to be implemented');
}

function deleteOffer(id) {
  if (!confirm('Delete this offer?')) return;
  fetch(`/api/offers/${id}`, { method: 'DELETE' })
    .then(() => loadCampaigns());
}

function addTimeRule(offerId) {
  const ruleType = prompt('Rule type (range/specific):');
  if (!ruleType) return;
  const startTime = prompt('Start time (HH:mm):');
  if (!startTime) return;
  const endTime = ruleType === 'range' ? prompt('End time (HH:mm):') : null;
  
  fetch(`/api/offers/${offerId}/time-rules`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rule_type: ruleType, start_time: startTime, end_time: endTime })
  }).then(() => {
    const campaignId = campaigns[0]?.id; // Simplified - should track current campaign
    if (campaignId) viewCampaign(campaignId);
  });
}

function deleteTimeRule(id) {
  if (!confirm('Delete this time rule?')) return;
  fetch(`/api/time-rules/${id}`, { method: 'DELETE' })
    .then(() => loadCampaigns());
}

// Initialize
checkAuth().then(() => {
  loadCampaigns();
});
