// Check authentication
let currentUser = null;

// Collapsible sections functionality
function toggleSection(sectionId) {
  const content = document.getElementById(sectionId);
  const icon = document.getElementById(sectionId + 'Icon');
  
  if (!content) return;
  
  const isCollapsed = content.classList.contains('collapsed');
  content.classList.toggle('collapsed');
  
  if (icon) {
    if (content.classList.contains('collapsed')) {
      icon.textContent = '▶';
      icon.style.transform = 'rotate(-90deg)';
    } else {
      icon.textContent = '▼';
      icon.style.transform = 'rotate(0deg)';
    }
  }
}

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
    console.log('Current user is_admin:', currentUser.is_admin, 'type:', typeof currentUser.is_admin);
    if (currentUser.is_admin === true || currentUser.is_admin === 1 || currentUser.is_admin === 'true') {
      console.log('Showing admin section');
      document.getElementById('adminSection').style.display = 'block';
      loadPendingUsers();
    } else {
      console.log('Hiding admin section - user is not admin');
      document.getElementById('adminSection').style.display = 'none';
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

// Load all users (admin only)
async function loadAllUsers() {
  try {
    const response = await fetch('/api/admin/users');
    if (!response.ok) {
      // If 403, user might not be admin - just hide the section
      if (response.status === 403) {
        console.log('Not an admin, skipping all users load');
        return;
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to load users');
    }
    const allUsers = await response.json();
    renderAllUsers(allUsers || []);
  } catch (error) {
    console.error('Error loading all users:', error);
    // Don't show error alert - just log it
    const container = document.getElementById('allUsersList');
    if (container) {
      container.innerHTML = '<p class="empty-state">Error loading users. Please refresh.</p>';
    }
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
    loadAllUsers();
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
    loadAllUsers();
  } catch (error) {
    alert(error.message);
  }
}

function renderAllUsers(users) {
  const container = document.getElementById('allUsersList');
  if (!container) return;
  
  if (users.length === 0) {
    container.innerHTML = '<p class="empty-state">No users found.</p>';
    return;
  }
  
  container.innerHTML = users.map(user => {
    const isAdmin = user.is_admin === true || user.is_admin === 1 || user.is_admin === '1';
    const isVerified = user.is_verified === true || user.is_verified === 1 || user.is_verified === '1';
    
    return `
      <div class="pending-user-card">
        <div class="user-info">
          <h4>${escapeHtml(user.username)} ${isAdmin ? '<span style="color: #667eea; font-size: 12px;">(Admin)</span>' : ''}</h4>
          ${user.email ? `<p>${escapeHtml(user.email)}</p>` : ''}
          <p class="user-date">
            Status: <strong>${isVerified ? 'Verified' : 'Pending'}</strong> | 
            Registered: ${new Date(user.created_at).toLocaleDateString()}
          </p>
        </div>
        <div class="user-actions">
          ${!isVerified ? `
            <button class="btn btn-small btn-primary" onclick="approveUser('${user.id}')">Approve</button>
            <button class="btn btn-small btn-danger" onclick="rejectUser('${user.id}')">Reject</button>
          ` : !isAdmin ? `
            <button class="btn btn-small btn-warning" onclick="revokeUser('${user.id}')">Revoke Access</button>
          ` : '<span style="color: #999; font-size: 12px;">Admin User</span>'}
        </div>
      </div>
    `;
  }).join('');
}

async function revokeUser(userId) {
  if (!confirm('Are you sure you want to revoke this user\'s access? They will need to be approved again to log in.')) return;
  
  try {
    const response = await fetch(`/api/admin/users/${userId}/revoke`, {
      method: 'POST'
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to revoke user');
    }
    
    loadPendingUsers();
    loadAllUsers();
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
  
  // Get base URL - try to use custom domain if available
  let baseUrl = window.location.origin;
  if (window.customDomains && window.customDomains.length > 0) {
    const activeDomain = window.customDomains.find(d => d.is_active);
    if (activeDomain) {
      baseUrl = `https://${activeDomain.domain}`;
    }
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
        <p><strong>Link:</strong> <code>${escapeHtml(baseUrl + '/c/' + campaign.slug)}</code></p>
        <p><strong>Timezone:</strong> ${escapeHtml(campaign.timezone)}</p>
      </div>
    </div>
  `).join('');
}

// Create Campaign Modal
const campaignModal = document.getElementById('campaignModal');
const campaignForm = document.getElementById('campaignForm');
let editingCampaignId = null;

const createCampaignBtn = document.getElementById('createCampaignBtn');
if (createCampaignBtn) {
  createCampaignBtn.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent section collapse
    editingCampaignId = null;
    document.getElementById('modalTitle').textContent = 'Create Campaign';
    document.getElementById('campaignId').value = '';
    campaignForm.reset();
    campaignModal.style.display = 'block';
  });
}

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
  
  // Get base URL - try to use custom domain if available, otherwise use current origin
  let baseUrl = window.location.origin;
  if (window.customDomains && window.customDomains.length > 0) {
    // Use first active custom domain
    const activeDomain = window.customDomains.find(d => d.is_active);
    if (activeDomain) {
      baseUrl = `https://${activeDomain.domain}`;
    }
  }
  
  // Store campaign ID for later use
  content.dataset.campaignId = campaign.id;
  
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
        <div class="section-header-small">
          <h4>Time Rules</h4>
          <button class="btn btn-primary btn-small" onclick="addTimeRuleForCampaign('${campaign.id}')">+ Add Time Rule</button>
        </div>
        <div id="timeRulesList" class="time-rules-list"></div>
      </div>
    </div>
  `;
  
  renderTimeRules(campaign.time_rules || []);
}

function renderTimeRules(timeRules) {
  const container = document.getElementById('timeRulesList');
  if (timeRules.length === 0) {
    container.innerHTML = '<p class="empty-state">No time rules yet. Add your first time rule to control when traffic redirects to different offers!</p>';
    return;
  }
  
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  container.innerHTML = timeRules.map(rule => {
    const offer = rule.offer || {};
    const dayName = rule.day_of_week !== null && rule.day_of_week !== undefined ? dayNames[rule.day_of_week] : 'All Days';
    const timezoneDisplay = rule.timezone || 'Campaign Default';
    const timeDisplay = rule.rule_type === 'range' 
      ? `${rule.start_time} - ${rule.end_time}`
      : rule.start_time;
    
    return `
      <div class="time-rule-card">
        <div class="time-rule-header">
          <div class="time-rule-info">
            <h5>${escapeHtml(offer.name || 'Unknown Offer')}</h5>
            <p class="time-rule-url"><a href="${escapeHtml(offer.url || '#')}" target="_blank">${escapeHtml(offer.url || 'N/A')}</a></p>
          </div>
          <div class="time-rule-actions">
            <button class="btn btn-small btn-secondary" onclick="editTimeRule('${rule.id}')">Edit</button>
            <button class="btn btn-small btn-danger" onclick="deleteTimeRule('${rule.id}')">Delete</button>
          </div>
        </div>
        <div class="time-rule-details">
          <div class="time-rule-detail-item">
            <strong>Type:</strong> ${escapeHtml(rule.rule_type === 'range' ? 'Time Range' : 'Specific Time')}
          </div>
          <div class="time-rule-detail-item">
            <strong>Time:</strong> ${escapeHtml(timeDisplay)}
          </div>
          <div class="time-rule-detail-item">
            <strong>Day:</strong> ${escapeHtml(dayName)}
          </div>
          <div class="time-rule-detail-item">
            <strong>Timezone:</strong> ${escapeHtml(timezoneDisplay)}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

document.querySelector('#campaignDetailsModal .close').addEventListener('click', () => {
  detailsModal.style.display = 'none';
});

// Utility functions (share with offers.js)
window.escapeHtml = window.escapeHtml || function(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

window.showError = window.showError || function(message) {
  alert(message); // Simple alert for now
};

const escapeHtml = window.escapeHtml;
const showError = window.showError;

// Time Rule Management
const timeRuleModal = document.getElementById('timeRuleModal');
const timeRuleForm = document.getElementById('timeRuleForm');
let editingTimeRuleId = null;
let currentCampaignId = null;

async function addTimeRuleForCampaign(campaignId) {
  currentCampaignId = campaignId;
  editingTimeRuleId = null;
  document.getElementById('timeRuleModalTitle').textContent = 'Add Time Rule';
  document.getElementById('timeRuleId').value = '';
  document.getElementById('timeRuleCampaignId').value = campaignId;
  timeRuleForm.reset();
  
  // Populate offers dropdown
  await populateOffersDropdown();
  
  // Show/hide end time based on rule type
  updateTimeRuleTypeUI();
  
  timeRuleModal.style.display = 'block';
}

async function editTimeRule(ruleId) {
  try {
    // Get the rule data from the campaign
    const campaignId = document.getElementById('campaignDetailsContent').dataset.campaignId;
    if (!campaignId) return;
    
    const campaignResponse = await fetch(`/api/campaigns/${campaignId}`);
    if (!campaignResponse.ok) throw new Error('Failed to load campaign');
    const campaign = await campaignResponse.json();
    
    const rule = campaign.time_rules.find(r => r.id === ruleId);
    if (!rule) return;
    
    currentCampaignId = campaignId;
    editingTimeRuleId = ruleId;
    document.getElementById('timeRuleModalTitle').textContent = 'Edit Time Rule';
    document.getElementById('timeRuleId').value = ruleId;
    document.getElementById('timeRuleCampaignId').value = campaignId;
    
    // Populate offers dropdown
    await populateOffersDropdown();
    
    // Populate form
    document.getElementById('timeRuleOffer').value = rule.offer_id;
    document.getElementById('timeRuleType').value = rule.rule_type;
    document.getElementById('timeRuleStartTime').value = rule.start_time;
    document.getElementById('timeRuleEndTime').value = rule.end_time || '';
    document.getElementById('timeRuleDayOfWeek').value = rule.day_of_week !== null ? rule.day_of_week : '';
    document.getElementById('timeRuleTimezone').value = rule.timezone || '';
    
    // Show/hide end time based on rule type
    updateTimeRuleTypeUI();
    
    timeRuleModal.style.display = 'block';
  } catch (error) {
    showError(error.message);
  }
}

async function populateOffersDropdown() {
  try {
    const response = await fetch('/api/offers');
    if (!response.ok) throw new Error('Failed to load offers');
    const userOffers = await response.json();
    
    const select = document.getElementById('timeRuleOffer');
    select.innerHTML = userOffers.map(offer => 
      `<option value="${offer.id}">${escapeHtml(offer.name)}</option>`
    ).join('');
  } catch (error) {
    console.error('Error loading offers:', error);
    showError('Failed to load offers');
  }
}

function updateTimeRuleTypeUI() {
  const ruleType = document.getElementById('timeRuleType').value;
  const endTimeGroup = document.getElementById('timeRuleEndTimeGroup');
  const endTimeInput = document.getElementById('timeRuleEndTime');
  
  if (ruleType === 'range') {
    endTimeGroup.style.display = 'block';
    endTimeInput.required = true;
  } else {
    endTimeGroup.style.display = 'none';
    endTimeInput.required = false;
    endTimeInput.value = '';
  }
}

document.getElementById('timeRuleType').addEventListener('change', updateTimeRuleTypeUI);

timeRuleForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const campaignId = document.getElementById('timeRuleCampaignId').value;
  const data = {
    offer_id: document.getElementById('timeRuleOffer').value,
    rule_type: document.getElementById('timeRuleType').value,
    start_time: document.getElementById('timeRuleStartTime').value,
    end_time: document.getElementById('timeRuleEndTime').value || null,
    day_of_week: document.getElementById('timeRuleDayOfWeek').value || null,
    timezone: document.getElementById('timeRuleTimezone').value || null
  };
  
  try {
    const url = editingTimeRuleId 
      ? `/api/time-rules/${editingTimeRuleId}`
      : `/api/campaigns/${campaignId}/time-rules`;
    const method = editingTimeRuleId ? 'PUT' : 'POST';
    
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to save time rule');
    }
    
    timeRuleModal.style.display = 'none';
    
    // Reload campaign details
    if (currentCampaignId) {
      viewCampaign(currentCampaignId);
    }
  } catch (error) {
    showError(error.message);
  }
});

document.querySelector('#timeRuleModal .close').addEventListener('click', () => {
  timeRuleModal.style.display = 'none';
});

document.getElementById('cancelTimeRuleBtn').addEventListener('click', () => {
  timeRuleModal.style.display = 'none';
});

async function deleteTimeRule(id) {
  if (!confirm('Are you sure you want to delete this time rule?')) return;
  
  try {
    const response = await fetch(`/api/time-rules/${id}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Failed to delete time rule');
    
    // Reload campaign details
    const campaignId = document.getElementById('campaignDetailsContent').dataset.campaignId;
    if (campaignId) {
      viewCampaign(campaignId);
    } else {
      loadCampaigns();
    }
  } catch (error) {
    showError(error.message);
  }
}

// Initialize
checkAuth().then(() => {
  loadOffers();
  // Load domains first if admin (so campaign URLs can use them)
  if (currentUser && (currentUser.is_admin === true || currentUser.is_admin === 1 || currentUser.is_admin === 'true')) {
    loadAllUsers();
    if (typeof loadDomains === 'function') {
      loadDomains().then(() => {
        loadCampaigns(); // Load campaigns after domains so URLs use custom domains
      });
    } else {
      loadCampaigns();
    }
  } else {
    loadCampaigns();
  }
});
