/* ============================================
   AK LEADS TIME BASED REDIRECT TOOL - Admin Dashboard
   Main JavaScript File - Refactored & Organized
   ============================================ */

// ============================================
// Global State
// ============================================

let currentUser = null;
let campaigns = [];
let editingCampaignId = null;
let currentCampaignId = null;
let editingTimeRuleId = null;

// ============================================
// Utility Functions
// ============================================

/**
 * Escape HTML to prevent XSS attacks
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info', duration = 4000) {
  const container = document.getElementById('toastContainer');
  if (!container) {
    // Fallback to alert if container doesn't exist
    alert(message);
    return;
  }
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };
  
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.info}</span>
    <span class="toast-content">${escapeHtml(message)}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
  `;
  
  container.appendChild(toast);
  
  // Auto-remove after duration
  setTimeout(() => {
    toast.classList.add('hiding');
    setTimeout(() => {
      if (toast.parentElement) {
        toast.remove();
      }
    }, 300);
  }, duration);
}

/**
 * Show error message to user
 */
function showError(message) {
  showToast(message, 'error', 6000);
  console.error('Error:', message);
}
window.showError = showError; // Make globally available

/**
 * Show success message to user
 */
function showSuccess(message) {
  showToast(message, 'success');
}
window.showSuccess = showSuccess; // Make globally available

/**
 * Show info message to user
 */
function showInfo(message) {
  showToast(message, 'info');
}

/**
 * Set button loading state
 */
function setButtonLoading(button, loading) {
  if (!button) return;
  
  if (loading) {
    button.classList.add('loading');
    button.disabled = true;
    button.dataset.originalText = button.textContent;
    button.textContent = '';
  } else {
    button.classList.remove('loading');
    button.disabled = false;
    if (button.dataset.originalText) {
      button.textContent = button.dataset.originalText;
      delete button.dataset.originalText;
    }
  }
}

/**
 * Set form loading state
 */
function setFormLoading(form, loading) {
  if (!form) return;
  
  if (loading) {
    form.classList.add('form-loading');
    const inputs = form.querySelectorAll('input, select, textarea, button');
    inputs.forEach(input => {
      if (input.type !== 'hidden') {
        input.disabled = true;
      }
    });
  } else {
    form.classList.remove('form-loading');
    const inputs = form.querySelectorAll('input, select, textarea, button');
    inputs.forEach(input => {
      input.disabled = false;
    });
  }
}

/**
 * Copy text to clipboard
 */
function copyToClipboard(elementId) {
  const element = document.getElementById(elementId);
  if (!element) return;
  
  const text = element.textContent.trim();
  navigator.clipboard.writeText(text).then(() => {
    const btn = element.nextElementSibling;
    if (btn && btn.classList.contains('btn')) {
      const originalText = btn.textContent;
      btn.textContent = '✓ Copied!';
      btn.style.color = '#28a745';
      setTimeout(() => {
        btn.textContent = originalText;
        btn.style.color = '';
      }, 2000);
    }
  }).catch(err => {
    console.error('Failed to copy:', err);
    alert('Failed to copy. Please copy manually: ' + text);
  });
}

/**
 * Copy campaign URL to clipboard
 */
function copyCampaignUrl(campaignId, url) {
  navigator.clipboard.writeText(url).then(() => {
    const btn = document.querySelector(`#campaign-url-${campaignId}`)?.nextElementSibling;
    if (btn) {
      const originalText = btn.textContent;
      btn.textContent = '✓ Copied!';
      btn.style.color = '#28a745';
      setTimeout(() => {
        btn.textContent = originalText;
        btn.style.color = '';
      }, 2000);
    }
  }).catch(err => {
    console.error('Failed to copy:', err);
    alert('Failed to copy URL. Please copy manually: ' + url);
  });
}

// ============================================
// UI Components - Collapsible Sections
// ============================================

/**
 * Toggle collapsible section visibility
 */
function toggleSection(sectionId) {
  const content = document.getElementById(sectionId);
  const icon = document.getElementById(sectionId + 'Icon');
  
  if (!content) return;
  
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

/**
 * Initialize all collapsible sections as collapsed
 */
function initializeCollapsibleSections() {
    const sections = ['adminMenuSection', 'usersManagementSection', 'domainsSection', 'offersSection', 'campaignsSection', 'faqSection'];
  sections.forEach(sectionId => {
    const content = document.getElementById(sectionId);
    const icon = document.getElementById(sectionId + 'Icon');
    if (content) {
      content.classList.add('collapsed');
      if (icon) {
        icon.textContent = '▶';
        icon.style.transform = 'rotate(-90deg)';
      }
    }
  });
}

// ============================================
// Authentication
// ============================================

/**
 * Check if user is authenticated and load user data
 */
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
        const isAdmin = currentUser.is_admin === true || currentUser.is_admin === 1 || currentUser.is_admin === 'true';
        const adminSection = document.getElementById('adminSection');
        const alwaysVisibleWarning = document.getElementById('alwaysVisibleMigrationWarning');
        
        if (isAdmin && adminSection) {
          adminSection.style.display = 'block';
          // Show migration button for admins (will be hidden by checkMigrationStatus if migration already done)
          if (alwaysVisibleWarning) {
            alwaysVisibleWarning.style.display = 'block';
          }
          loadPendingUsers();
          loadAllUsers();
          checkMigrationStatus(); // Check if migration is needed - will hide if migration already done
        } else {
          if (adminSection) adminSection.style.display = 'none';
          // Hide migration warning for non-admins
          if (alwaysVisibleWarning) {
            alwaysVisibleWarning.style.display = 'none';
          }
        }
  } catch (error) {
    console.error('Auth check failed:', error);
    window.location.href = '/login';
  }
}

// ============================================
// User Management (Admin Only)
// ============================================

/**
 * Load pending users awaiting approval
 */
async function loadPendingUsers() {
  try {
    const response = await fetch('/api/admin/pending-users');
    if (!response.ok) {
      if (response.status === 403) {
        document.getElementById('adminSection').style.display = 'none';
        return;
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to load pending users');
    }
    
    const pendingUsers = await response.json();
    renderPendingUsers(pendingUsers || []);
  } catch (error) {
    console.error('Error loading pending users:', error);
  }
}

/**
 * Load all users
 */
async function loadAllUsers() {
  try {
    const response = await fetch('/api/admin/users');
    if (!response.ok) {
      if (response.status === 403) return;
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to load users');
    }
    
    const allUsers = await response.json();
    renderAllUsers(allUsers || []);
  } catch (error) {
    console.error('Error loading all users:', error);
    const container = document.getElementById('allUsersList');
    if (container) {
      container.innerHTML = '<p class="empty-state">Error loading users. Please refresh.</p>';
    }
  }
}

/**
 * Render pending users list
 */
function renderPendingUsers(users) {
  const container = document.getElementById('pendingUsersList');
  if (!container) return;
  
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

/**
 * Render all users list
 */
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
            <button class="btn btn-small btn-secondary" onclick="resetUserPassword('${user.id}')">Reset Password</button>
          ` : '<span style="color: #999; font-size: 12px;">Admin User</span>'}
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Approve a pending user
 */
async function approveUser(userId) {
  if (!confirm('Approve this user?')) return;
  
  const button = event?.target;
  if (button) setButtonLoading(button, true);
  
  try {
    const response = await fetch(`/api/admin/users/${userId}/approve`, {
      method: 'POST'
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to approve user');
    }
    
    showSuccess('User approved successfully');
    await Promise.all([loadPendingUsers(), loadAllUsers()]);
  } catch (error) {
    showError(error.message);
  } finally {
    if (button) setButtonLoading(button, false);
  }
}

/**
 * Reject and delete a pending user
 */
async function rejectUser(userId) {
  if (!confirm('Reject and delete this user? This cannot be undone.')) return;
  
  const button = event?.target;
  if (button) setButtonLoading(button, true);
  
  try {
    const response = await fetch(`/api/admin/users/${userId}/reject`, {
      method: 'POST'
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to reject user');
    }
    
    showSuccess('User rejected and deleted');
    await Promise.all([loadPendingUsers(), loadAllUsers()]);
  } catch (error) {
    showError(error.message);
  } finally {
    if (button) setButtonLoading(button, false);
  }
}

/**
 * Revoke user access (set to unverified)
 */
async function revokeUser(userId) {
  if (!confirm('Are you sure you want to revoke this user\'s access? They will need to be approved again to log in.')) return;
  
  const button = event?.target;
  if (button) setButtonLoading(button, true);
  
  try {
    const response = await fetch(`/api/admin/users/${userId}/revoke`, {
      method: 'POST'
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to revoke user');
    }
    
    showSuccess('User access revoked');
    await Promise.all([loadPendingUsers(), loadAllUsers()]);
  } catch (error) {
    showError(error.message);
  } finally {
    if (button) setButtonLoading(button, false);
  }
}

/**
 * Reset user password (admin only)
 */
async function resetUserPassword(userId) {
  if (!confirm('Reset this user\'s password? They will receive a temporary password and be required to change it on next login.')) return;
  
  const button = event?.target;
  if (button) setButtonLoading(button, true);
  
  try {
    const response = await fetch(`/api/admin/users/${userId}/reset-password`, {
      method: 'POST'
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to reset password');
    }
    
    const result = await response.json();
    showSuccess(`Password reset! Temporary password: ${result.temporary_password}`);
    showInfo('Share the temporary password with the user. They will be required to change it on next login.');
    
    await loadAllUsers();
  } catch (error) {
    showError(error.message);
  } finally {
    if (button) setButtonLoading(button, false);
  }
}

// ============================================
// Campaign Management
// ============================================

/**
 * Load all campaigns for the current user
 */
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

/**
 * Render campaigns list
 */
function renderCampaigns() {
  const container = document.getElementById('campaignsList');
  if (!container) return;
  
  if (campaigns.length === 0) {
    container.innerHTML = '<p class="empty-state">No campaigns yet. Create your first campaign!</p>';
    return;
  }
  
  container.innerHTML = campaigns.map(campaign => {
    // Get base URL - use campaign's domain if set, otherwise try custom domains, otherwise default
    let baseUrl = window.location.origin;
    if (campaign.domain_id && window.customDomains) {
      const campaignDomain = window.customDomains.find(d => d.id === campaign.domain_id && d.is_active);
      if (campaignDomain) {
        baseUrl = `https://${campaignDomain.domain}`;
      }
    } else if (window.customDomains && window.customDomains.length > 0) {
      const activeDomain = window.customDomains.find(d => d.is_active);
      if (activeDomain) {
        baseUrl = `https://${activeDomain.domain}`;
      }
    }
    
    const campaignUrl = baseUrl + '/c/' + campaign.slug;
    
    return `
      <div class="campaign-card" data-id="${campaign.id}">
        <div class="campaign-header">
          <h3>${escapeHtml(campaign.name)}</h3>
          <div class="campaign-actions">
            <button class="btn btn-small btn-primary" onclick="viewCampaign('${campaign.id}')">Set Schedule</button>
            <button class="btn btn-small btn-secondary" onclick="editCampaign('${campaign.id}')">Edit</button>
            <button class="btn btn-small btn-secondary" onclick="duplicateCampaign('${campaign.id}')" title="Duplicate Campaign">📋 Duplicate</button>
            <button class="btn btn-small btn-danger" onclick="deleteCampaign('${campaign.id}')">Delete</button>
          </div>
        </div>
        <div class="campaign-info">
          <p><strong>Slug:</strong> <code>${escapeHtml(campaign.slug)}</code></p>
          <p><strong>Link:</strong> 
            <code id="campaign-url-${campaign.id}">${escapeHtml(campaignUrl)}</code>
            <button class="btn btn-tiny btn-secondary" onclick="copyCampaignUrl('${campaign.id}', '${escapeHtml(campaignUrl)}')" title="Copy URL">
              📋 Copy
            </button>
          </p>
          <p><strong>Timezone:</strong> ${escapeHtml(campaign.timezone)}</p>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * View campaign details
 */
async function viewCampaign(id) {
  try {
    const response = await fetch(`/api/campaigns/${id}`);
    if (!response.ok) throw new Error('Failed to load campaign');
    const campaign = await response.json();
    
    // Load stats
    const statsResponse = await fetch(`/api/campaigns/${id}/stats`);
    const stats = statsResponse.ok ? await statsResponse.json() : null;
    
    renderCampaignDetails(campaign, stats);
    document.getElementById('campaignDetailsModal').style.display = 'block';
    
    // Initialize schedule grid after rendering
    setTimeout(() => {
      initializeScheduleGrid(campaign.id, campaign.time_rules || []);
    }, 100);
  } catch (error) {
    showError(error.message);
  }
}

/**
 * Render campaign details in modal
 */
function renderCampaignDetails(campaign, stats) {
  const content = document.getElementById('campaignDetailsContent');
  if (!content) return;
  
  // Get base URL - use campaign's domain if set, otherwise try custom domains, otherwise default
  let baseUrl = window.location.origin;
  if (campaign.domain_id && window.customDomains) {
    const campaignDomain = window.customDomains.find(d => d.id === campaign.domain_id && d.is_active);
    if (campaignDomain) {
      baseUrl = `https://${campaignDomain.domain}`;
    }
  } else if (window.customDomains && window.customDomains.length > 0) {
    const activeDomain = window.customDomains.find(d => d.is_active);
    if (activeDomain) {
      baseUrl = `https://${activeDomain.domain}`;
    }
  }
  
  // Store campaign ID for later use
  content.dataset.campaignId = campaign.id;
  
  const campaignUrl = baseUrl + '/c/' + campaign.slug;
  
  content.innerHTML = `
    <div class="campaign-details">
      <div class="detail-section">
        <h4>Campaign Information</h4>
        <p><strong>Name:</strong> ${escapeHtml(campaign.name)}</p>
        <p><strong>Slug:</strong> <code>${escapeHtml(campaign.slug)}</code></p>
        <p><strong>Campaign URL:</strong> 
          <code id="detail-campaign-url">${escapeHtml(campaignUrl)}</code>
          <button class="btn btn-tiny btn-secondary" onclick="copyToClipboard('detail-campaign-url')" title="Copy URL">
            📋 Copy
          </button>
        </p>
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
              <h4>Time Schedule</h4>
              <button class="btn btn-small btn-primary" onclick="saveSchedule('${campaign.id}')">Save Schedule</button>
            </div>
            <div id="scheduleGridContainer-${campaign.id}"></div>
          </div>
    </div>
  `;
}

/**
 * Render a single time rule
 */
function renderTimeRule(rule, campaignId) {
  const offerName = rule.offer ? escapeHtml(rule.offer.name) : 'Unknown Offer';
  const offerUrl = rule.offer ? escapeHtml(rule.offer.url) : '#';
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayName = rule.day_of_week !== null ? dayNames[rule.day_of_week] : 'All Days';
  const timezone = rule.timezone || 'Campaign Default';
  
  return `
    <div class="time-rule-card">
      <div class="time-rule-header">
        <div class="time-rule-info">
          <h5>${offerName}</h5>
          <div class="time-rule-url">
            <a href="${offerUrl}" target="_blank">${offerUrl}</a>
          </div>
        </div>
        <div class="time-rule-actions">
          <button class="btn btn-small btn-secondary" onclick="editTimeRule('${campaignId}', '${rule.id}')">Edit</button>
          <button class="btn btn-small btn-danger" onclick="deleteTimeRule('${rule.id}')">Delete</button>
        </div>
      </div>
      <div class="time-rule-details">
        <div class="time-rule-detail-item">
          <strong>Type</strong>
          ${rule.rule_type === 'range' ? 'Time Range' : 'Specific Time'}
        </div>
        <div class="time-rule-detail-item">
          <strong>Start Time</strong>
          ${escapeHtml(rule.start_time)}
        </div>
        ${rule.end_time ? `
        <div class="time-rule-detail-item">
          <strong>End Time</strong>
          ${escapeHtml(rule.end_time)}
        </div>
        ` : ''}
        <div class="time-rule-detail-item">
          <strong>Day</strong>
          ${dayName}
        </div>
        <div class="time-rule-detail-item">
          <strong>Timezone</strong>
          ${escapeHtml(timezone)}
        </div>
      </div>
    </div>
  `;
}

/**
 * Delete a campaign
 */
async function deleteCampaign(id) {
  if (!confirm('Are you sure you want to delete this campaign?')) return;
  
  const button = event?.target;
  if (button) setButtonLoading(button, true);
  
  try {
    const response = await fetch(`/api/campaigns/${id}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Failed to delete campaign');
    showSuccess('Campaign deleted successfully');
    await loadCampaigns();
  } catch (error) {
    showError(error.message);
  } finally {
    if (button) setButtonLoading(button, false);
  }
}

// ============================================
// Campaign Form Management
// ============================================

const campaignModal = document.getElementById('campaignModal');
const campaignForm = document.getElementById('campaignForm');

/**
 * Load offers for campaign form dropdown
 */
async function loadOffersForCampaign() {
  try {
    const response = await fetch('/api/offers');
    if (!response.ok) throw new Error('Failed to load offers');
    const offers = await response.json();
    
    const select = document.getElementById('fallbackOffer');
    if (select) {
      select.innerHTML = '<option value="">Select an offer...</option>' + 
        offers.map(offer => `<option value="${offer.id}">${escapeHtml(offer.name)}</option>`).join('');
    }
  } catch (error) {
    console.error('Error loading offers:', error);
  }
}

/**
 * Load domains for campaign form dropdown
 */
async function loadDomainsForCampaign() {
  try {
    const response = await fetch('/api/domains');
    if (!response.ok) throw new Error('Failed to load domains');
    const domains = await response.json();
    
    const select = document.getElementById('campaignDomain');
    if (select) {
      select.innerHTML = '<option value="">Use default domain</option>' + 
        domains.filter(d => d.is_active).map(domain => 
          `<option value="${domain.id}">${escapeHtml(domain.domain)}</option>`
        ).join('');
    }
  } catch (error) {
    console.error('Error loading domains:', error);
  }
}

/**
 * Toggle between offer dropdown and URL input for fallback
 */
function toggleFallbackInput() {
  const fallbackType = document.getElementById('fallbackType');
  if (!fallbackType) return;
  
  const type = fallbackType.value;
  const offerGroup = document.getElementById('fallbackOfferGroup');
  const urlGroup = document.getElementById('fallbackUrlGroup');
  const offerSelect = document.getElementById('fallbackOffer');
  const urlInput = document.getElementById('fallbackUrl');
  
  if (type === 'offer') {
    if (offerGroup) offerGroup.style.display = 'block';
    if (urlGroup) urlGroup.style.display = 'none';
    if (offerSelect) offerSelect.required = true;
    if (urlInput) {
      urlInput.required = false;
      urlInput.value = '';
    }
  } else {
    if (offerGroup) offerGroup.style.display = 'none';
    if (urlGroup) urlGroup.style.display = 'block';
    if (offerSelect) {
      offerSelect.required = false;
      offerSelect.value = '';
    }
    if (urlInput) urlInput.required = true;
  }
}

/**
 * Edit campaign
 */
async function editCampaign(id) {
  try {
    const campaign = campaigns.find(c => c.id === id);
    if (!campaign) {
      showError('Campaign not found');
      return;
    }
    
    editingCampaignId = id;
    const modalTitle = document.getElementById('modalTitle');
    if (modalTitle) modalTitle.textContent = 'Edit Campaign';
    
    const campaignId = document.getElementById('campaignId');
    if (campaignId) campaignId.value = id;
    
    const campaignName = document.getElementById('campaignName');
    if (campaignName) campaignName.value = campaign.name;
    
    const campaignSlug = document.getElementById('campaignSlug');
    if (campaignSlug) campaignSlug.value = campaign.slug;
    
    const campaignTimezone = document.getElementById('campaignTimezone');
    if (campaignTimezone) campaignTimezone.value = campaign.timezone;
    
    // Load offers and domains, then set values
    await Promise.all([loadOffersForCampaign(), loadDomainsForCampaign()]);
    
    // Set fallback type and value
    const fallbackType = document.getElementById('fallbackType');
    if (fallbackType) {
      if (campaign.fallback_offer_id) {
        fallbackType.value = 'offer';
        const fallbackOffer = document.getElementById('fallbackOffer');
        if (fallbackOffer) fallbackOffer.value = campaign.fallback_offer_id;
        toggleFallbackInput();
      } else if (campaign.fallback_offer_url) {
        fallbackType.value = 'url';
        const fallbackUrl = document.getElementById('fallbackUrl');
        if (fallbackUrl) fallbackUrl.value = campaign.fallback_offer_url;
        toggleFallbackInput();
      } else {
        fallbackType.value = 'offer';
        toggleFallbackInput();
      }
    }
    
    // Set domain if available
    if (campaign.domain_id) {
      const campaignDomain = document.getElementById('campaignDomain');
      if (campaignDomain) campaignDomain.value = campaign.domain_id;
    }
    
    if (campaignModal) campaignModal.style.display = 'block';
  } catch (error) {
    console.error('Error in editCampaign:', error);
    showError('Error loading campaign for editing: ' + error.message);
  }
}

// ============================================
// Campaign Form Event Handlers
// ============================================

const createCampaignBtn = document.getElementById('createCampaignBtn');
if (createCampaignBtn) {
  createCampaignBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    editingCampaignId = null;
    const modalTitle = document.getElementById('modalTitle');
    if (modalTitle) modalTitle.textContent = 'Create Campaign';
    
    const campaignId = document.getElementById('campaignId');
    if (campaignId) campaignId.value = '';
    
    if (campaignForm) campaignForm.reset();
    
    // Reset fallback type to offer
    const fallbackType = document.getElementById('fallbackType');
    if (fallbackType) {
      fallbackType.value = 'offer';
      toggleFallbackInput();
    }
    
    // Load offers and domains
    await Promise.all([loadOffersForCampaign(), loadDomainsForCampaign()]);
    
    if (campaignModal) campaignModal.style.display = 'block';
  });
}

if (campaignForm) {
  campaignForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const fallbackType = document.getElementById('fallbackType');
    if (!fallbackType) return;
    
    const submitButton = campaignForm.querySelector('button[type="submit"]');
    setFormLoading(campaignForm, true);
    
    // Get form values with null checks
    const campaignName = document.getElementById('campaignName');
    const campaignSlug = document.getElementById('campaignSlug');
    const campaignTimezone = document.getElementById('campaignTimezone');
    const campaignDomain = document.getElementById('campaignDomain');
    
    if (!campaignName || !campaignTimezone) {
      showError('Required form fields are missing');
      setFormLoading(campaignForm, false);
      return;
    }
    
    const data = {
      name: campaignName.value,
      slug: campaignSlug?.value || undefined,
      timezone: campaignTimezone.value
    };
    
    // Only include domain_id if the field exists
    if (campaignDomain) {
      data.domain_id = campaignDomain.value || null;
    }
    
    // Use fallback_offer_id if offer type selected, otherwise use fallback_offer_url
    // Important: Only send fallback fields if they're being changed
    // Don't send null values - let the backend handle existing values
    if (fallbackType.value === 'offer') {
      const fallbackOffer = document.getElementById('fallbackOffer');
      const fallbackOfferId = fallbackOffer?.value;
      if (!fallbackOfferId) {
        showError('Please select a fallback offer');
        setFormLoading(campaignForm, false);
        return;
      }
      data.fallback_offer_id = fallbackOfferId;
      // Don't set fallback_offer_url - backend will set it from the offer
    } else {
      const fallbackUrlInput = document.getElementById('fallbackUrl');
      const fallbackUrl = fallbackUrlInput?.value;
      if (!fallbackUrl) {
        showError('Please enter a fallback URL');
        setFormLoading(campaignForm, false);
        return;
      }
      data.fallback_offer_url = fallbackUrl;
      // When using URL, clear offer ID
      data.fallback_offer_id = null;
    }
    
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
        let errorMessage = 'Failed to save campaign';
        let errorDetails = null;
        try {
          const error = await response.json();
          errorMessage = error.error || errorMessage;
          errorDetails = error;
        } catch (e) {
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
        console.error('Campaign save failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorMessage,
          details: errorDetails
        });
        throw new Error(errorMessage);
      }
      
      const result = await response.json().catch(() => ({}));
      showSuccess(editingCampaignId ? 'Campaign updated successfully' : 'Campaign created successfully');

      if (campaignModal) campaignModal.style.display = 'none';
      
      // If campaign details modal is open, reload the campaign to show updated URL
      const detailsModal = document.getElementById('campaignDetailsModal');
      const detailsContent = document.getElementById('campaignDetailsContent');
      if (detailsModal && detailsModal.style.display === 'block' && detailsContent) {
        const currentCampaignId = detailsContent.dataset.campaignId || editingCampaignId;
        if (currentCampaignId) {
          await viewCampaign(currentCampaignId);
        }
      }
      
      await loadCampaigns();
    } catch (error) {
      console.error('Campaign save error:', error);
      showError(error.message || 'An unexpected error occurred');
    } finally {
      setFormLoading(campaignForm, false);
    }
  });
}

// Modal close handlers
const campaignModalClose = document.querySelector('#campaignModal .close');
if (campaignModalClose) {
  campaignModalClose.addEventListener('click', () => {
    if (campaignModal) campaignModal.style.display = 'none';
  });
}

const cancelCampaignBtn = document.getElementById('cancelCampaignBtn');
if (cancelCampaignBtn) {
  cancelCampaignBtn.addEventListener('click', () => {
    if (campaignModal) campaignModal.style.display = 'none';
  });
}

// Campaign Details Modal close handlers
const campaignDetailsModal = document.getElementById('campaignDetailsModal');
const campaignDetailsModalClose = document.querySelector('#campaignDetailsModal .close');
if (campaignDetailsModalClose) {
  campaignDetailsModalClose.addEventListener('click', () => {
    if (campaignDetailsModal) campaignDetailsModal.style.display = 'none';
  });
}

// Close modal when clicking outside of it
if (campaignDetailsModal) {
  campaignDetailsModal.addEventListener('click', (e) => {
    if (e.target === campaignDetailsModal) {
      campaignDetailsModal.style.display = 'none';
    }
  });
}

// ============================================
// Time Rule Management
// ============================================

const timeRuleModal = document.getElementById('timeRuleModal');
const timeRuleForm = document.getElementById('timeRuleForm');

/**
 * Open add time rule modal
 */
async function openAddTimeRuleModal(campaignId) {
  try {
    currentCampaignId = campaignId;
    editingTimeRuleId = null;
    
    const modalTitle = document.getElementById('timeRuleModalTitle');
    if (modalTitle) modalTitle.textContent = 'Add Time Rule';
    
    const timeRuleId = document.getElementById('timeRuleId');
    if (timeRuleId) timeRuleId.value = '';
    
    const timeRuleCampaignId = document.getElementById('timeRuleCampaignId');
    if (timeRuleCampaignId) timeRuleCampaignId.value = campaignId;
    
    if (timeRuleForm) timeRuleForm.reset();
    
    await populateOffersDropdown();
    updateTimeRuleTypeUI();
    
    if (timeRuleModal) timeRuleModal.style.display = 'block';
  } catch (error) {
    showError(error.message);
  }
}

/**
 * Edit time rule
 */
async function editTimeRule(campaignId, ruleId) {
  try {
    const response = await fetch(`/api/campaigns/${campaignId}`);
    if (!response.ok) throw new Error('Failed to load campaign');
    const campaign = await response.json();
    
    const rule = campaign.time_rules?.find(r => r.id === ruleId);
    if (!rule) {
      showError('Time rule not found');
      return;
    }
    
    currentCampaignId = campaignId;
    editingTimeRuleId = ruleId;
    
    const modalTitle = document.getElementById('timeRuleModalTitle');
    if (modalTitle) modalTitle.textContent = 'Edit Time Rule';
    
    const timeRuleId = document.getElementById('timeRuleId');
    if (timeRuleId) timeRuleId.value = ruleId;
    
    const timeRuleCampaignId = document.getElementById('timeRuleCampaignId');
    if (timeRuleCampaignId) timeRuleCampaignId.value = campaignId;
    
    // Populate offers dropdown
    await populateOffersDropdown();
    
    // Populate form
    const timeRuleOffer = document.getElementById('timeRuleOffer');
    if (timeRuleOffer) timeRuleOffer.value = rule.offer_id;
    
    const timeRuleType = document.getElementById('timeRuleType');
    if (timeRuleType) timeRuleType.value = rule.rule_type;
    
    const timeRuleStartTime = document.getElementById('timeRuleStartTime');
    if (timeRuleStartTime) timeRuleStartTime.value = rule.start_time;
    
    const timeRuleEndTime = document.getElementById('timeRuleEndTime');
    if (timeRuleEndTime) timeRuleEndTime.value = rule.end_time || '';
    
    const timeRuleDayOfWeek = document.getElementById('timeRuleDayOfWeek');
    if (timeRuleDayOfWeek) timeRuleDayOfWeek.value = rule.day_of_week !== null ? rule.day_of_week : '';
    
    const timeRuleTimezone = document.getElementById('timeRuleTimezone');
    if (timeRuleTimezone) timeRuleTimezone.value = rule.timezone || '';
    
    // Show/hide end time based on rule type
    updateTimeRuleTypeUI();
    
    if (timeRuleModal) timeRuleModal.style.display = 'block';
  } catch (error) {
    showError(error.message);
  }
}

/**
 * Populate offers dropdown for time rules
 */
async function populateOffersDropdown() {
  try {
    const response = await fetch('/api/offers');
    if (!response.ok) throw new Error('Failed to load offers');
    const userOffers = await response.json();
    
    const select = document.getElementById('timeRuleOffer');
    if (select) {
      select.innerHTML = userOffers.map(offer => 
        `<option value="${offer.id}">${escapeHtml(offer.name)}</option>`
      ).join('');
    }
  } catch (error) {
    console.error('Error loading offers:', error);
    showError('Failed to load offers');
  }
}

/**
 * Update time rule type UI (show/hide end time)
 */
function updateTimeRuleTypeUI() {
  const ruleType = document.getElementById('timeRuleType');
  if (!ruleType) return;
  
  const endTimeGroup = document.getElementById('timeRuleEndTimeGroup');
  const endTimeInput = document.getElementById('timeRuleEndTime');
  
  if (ruleType.value === 'range') {
    if (endTimeGroup) endTimeGroup.style.display = 'block';
    if (endTimeInput) endTimeInput.required = true;
  } else {
    if (endTimeGroup) endTimeGroup.style.display = 'none';
    if (endTimeInput) {
      endTimeInput.required = false;
      endTimeInput.value = '';
    }
  }
}

/**
 * Delete time rule
 */
async function deleteTimeRule(id) {
  if (!confirm('Are you sure you want to delete this time rule?')) return;
  
  const button = event?.target;
  if (button) setButtonLoading(button, true);
  
  try {
    const response = await fetch(`/api/time-rules/${id}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Failed to delete time rule');
    
    showSuccess('Time rule deleted successfully');
    
    // Reload campaign details
    const campaignId = document.getElementById('campaignDetailsContent')?.dataset.campaignId;
    if (campaignId) {
      await viewCampaign(campaignId);
    } else {
      await loadCampaigns();
    }
  } catch (error) {
    showError(error.message);
  } finally {
    if (button) setButtonLoading(button, false);
  }
}

// Time rule form submission
if (timeRuleForm) {
  timeRuleForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    setFormLoading(timeRuleForm, true);
    
    const campaignId = document.getElementById('timeRuleCampaignId').value;
    const ruleId = document.getElementById('timeRuleId').value;
    
    const data = {
      offer_id: document.getElementById('timeRuleOffer').value,
      rule_type: document.getElementById('timeRuleType').value,
      start_time: document.getElementById('timeRuleStartTime').value,
      end_time: document.getElementById('timeRuleEndTime').value || null,
      day_of_week: document.getElementById('timeRuleDayOfWeek').value || null,
      timezone: document.getElementById('timeRuleTimezone').value || null
    };
    
    try {
      const url = ruleId
        ? `/api/time-rules/${ruleId}`
        : `/api/campaigns/${campaignId}/time-rules`;
      const method = ruleId ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save time rule');
      }
      
      showSuccess(ruleId ? 'Time rule updated successfully' : 'Time rule created successfully');
      if (timeRuleModal) timeRuleModal.style.display = 'none';
      
      // Reload campaign details
      const detailsContent = document.getElementById('campaignDetailsContent');
      if (detailsContent && detailsContent.dataset.campaignId) {
        await viewCampaign(detailsContent.dataset.campaignId);
      } else {
        await loadCampaigns();
      }
    } catch (error) {
      showError(error.message);
    } finally {
      setFormLoading(timeRuleForm, false);
    }
  });
}

// Time rule type change handler
const timeRuleType = document.getElementById('timeRuleType');
if (timeRuleType) {
  timeRuleType.addEventListener('change', updateTimeRuleTypeUI);
}

// Time rule modal close handlers
const timeRuleModalClose = document.querySelector('#timeRuleModal .close');
if (timeRuleModalClose) {
  timeRuleModalClose.addEventListener('click', () => {
    if (timeRuleModal) timeRuleModal.style.display = 'none';
  });
}

const cancelTimeRuleBtn = document.getElementById('cancelTimeRuleBtn');
if (cancelTimeRuleBtn) {
  cancelTimeRuleBtn.addEventListener('click', () => {
    if (timeRuleModal) timeRuleModal.style.display = 'none';
  });
}

// ============================================
// UTM Parameter Testing
// ============================================

/**
 * Test UTM parameter passing
 */
function testUtmParameters() {
  const campaignUrl = document.getElementById('testCampaignUrl')?.value.trim();
  const offerUrl = document.getElementById('testOfferUrl')?.value.trim();
  const utmSource = document.getElementById('testUtmSource')?.value.trim();
  const utmMedium = document.getElementById('testUtmMedium')?.value.trim();
  const utmCampaign = document.getElementById('testUtmCampaign')?.value.trim();
  const utmTerm = document.getElementById('testUtmTerm')?.value.trim();
  const utmContent = document.getElementById('testUtmContent')?.value.trim();
  
  if (!campaignUrl || !offerUrl) {
    alert('Please enter both Campaign URL and Offer URL');
    return;
  }
  
  // Build UTM parameters object
  const utmParams = {};
  if (utmSource) utmParams.utm_source = utmSource;
  if (utmMedium) utmParams.utm_medium = utmMedium;
  if (utmCampaign) utmParams.utm_campaign = utmCampaign;
  if (utmTerm) utmParams.utm_term = utmTerm;
  if (utmContent) utmParams.utm_content = utmContent;
  
  // Build the test URL (campaign URL with UTM params)
  const testCampaignUrl = new URL(campaignUrl);
  Object.entries(utmParams).forEach(([key, value]) => {
    testCampaignUrl.searchParams.set(key, value);
  });
  
  // Build the final offer URL with UTM params appended
  const finalOfferUrl = new URL(offerUrl);
  Object.entries(utmParams).forEach(([key, value]) => {
    finalOfferUrl.searchParams.set(key, value);
  });
  
  // Display results
  const resultDiv = document.getElementById('utmTestResult');
  if (!resultDiv) return;
  
  resultDiv.style.display = 'block';
  resultDiv.innerHTML = `
    <h4 style="margin-top: 0;">Test Results</h4>
    <p><strong>Campaign URL with UTM parameters:</strong></p>
    <code style="display: block; padding: 10px; background: #f0f0f0; border-radius: 3px; margin: 10px 0; word-break: break-all;">
      ${escapeHtml(testCampaignUrl.toString())}
    </code>
    <p><strong>Final Offer URL (with UTM parameters appended):</strong></p>
    <code style="display: block; padding: 10px; background: #f0f0f0; border-radius: 3px; margin: 10px 0; word-break: break-all;">
      ${escapeHtml(finalOfferUrl.toString())}
    </code>
    <p style="color: #28a745; margin-top: 15px;">
      ✓ When a visitor clicks the campaign URL with UTM parameters, they will be redirected to the offer URL with all UTM parameters preserved.
    </p>
    <button class="btn btn-small btn-secondary" onclick="copyToClipboard('utm-test-campaign')" style="margin-top: 10px;">Copy Campaign URL</button>
    <button class="btn btn-small btn-secondary" onclick="copyToClipboard('utm-test-offer')" style="margin-top: 10px; margin-left: 10px;">Copy Offer URL</button>
    <div id="utm-test-campaign" style="display: none;">${escapeHtml(testCampaignUrl.toString())}</div>
    <div id="utm-test-offer" style="display: none;">${escapeHtml(finalOfferUrl.toString())}</div>
  `;
}

// ============================================
// Logout
// ============================================

const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  });
}

// ============================================
// Database Migration
// ============================================

/**
 * Check if migration is needed and show/hide warning accordingly
 */
async function checkMigrationStatus() {
  try {
    console.log('Checking migration status...');
    const response = await fetch('/api/admin/migration-status');
    if (!response.ok) {
      console.error('Migration status check failed:', response.status, response.statusText);
      // If check fails, show the always-visible warning anyway (to be safe)
      const alwaysVisibleWarning = document.getElementById('alwaysVisibleMigrationWarning');
      if (alwaysVisibleWarning) {
        alwaysVisibleWarning.style.display = 'block';
        console.log('Showing always-visible migration warning due to check failure');
      }
      // Also show the nested one
      const migrationWarning = document.getElementById('migrationWarning');
      if (migrationWarning) {
        migrationWarning.style.display = 'block';
      }
      return;
    }
    
    const data = await response.json();
    console.log('Migration status check result:', JSON.stringify(data, null, 2));
    
    // Show/hide the always-visible warning (at top of page)
    const alwaysVisibleWarning = document.getElementById('alwaysVisibleMigrationWarning');
    console.log('alwaysVisibleWarning element found:', !!alwaysVisibleWarning);
    if (alwaysVisibleWarning) {
      if (data.needs_migration === true) {
        alwaysVisibleWarning.style.display = 'block';
        console.log('Migration needed - showing always-visible warning');
      } else {
        alwaysVisibleWarning.style.display = 'none';
        console.log('Migration not needed - hiding always-visible warning. Checks:', data.checks);
      }
    } else {
      console.error('alwaysVisibleMigrationWarning element not found in DOM!');
    }
    
    // Also show/hide the nested warning in User Management section
    const migrationWarning = document.getElementById('migrationWarning');
    if (migrationWarning) {
      if (data.needs_migration === true) {
        migrationWarning.style.display = 'block';
        console.log('Migration needed - showing nested warning');
        // Also expand the User Management section so user can see it
        const usersSection = document.getElementById('usersManagementSection');
        if (usersSection && usersSection.classList.contains('collapsed')) {
          // Expand parent sections too
          const adminMenuSection = document.getElementById('adminMenuSection');
          if (adminMenuSection && adminMenuSection.classList.contains('collapsed')) {
            toggleSection('adminMenuSection');
          }
          toggleSection('usersManagementSection');
        }
      } else {
        migrationWarning.style.display = 'none';
        console.log('Migration not needed - hiding nested warning');
      }
    } else {
      console.error('Migration warning element not found in DOM');
    }
  } catch (error) {
    console.error('Error checking migration status:', error);
    // On error, show the always-visible warning to be safe
    const alwaysVisibleWarning = document.getElementById('alwaysVisibleMigrationWarning');
    if (alwaysVisibleWarning) {
      alwaysVisibleWarning.style.display = 'block';
      console.log('Showing always-visible migration warning due to error');
    }
    // Also show the nested one
    const migrationWarning = document.getElementById('migrationWarning');
    if (migrationWarning) {
      migrationWarning.style.display = 'block';
    }
  }
}

/**
 * Run database migration (admin only)
 * Make it globally accessible for onclick handlers
 */
window.runMigration = async function runMigration() {
  if (!confirm('This will update your database schema. Continue?')) return;
  
  // Try to find any migration button (could be nested or always-visible)
  const button = document.getElementById('runMigrationBtn') || document.getElementById('alwaysVisibleRunMigrationBtn');
  if (button) setButtonLoading(button, true);
  
  try {
    console.log('Starting migration...');
    const response = await fetch('/api/admin/run-migration', {
      method: 'POST'
    });
    
    console.log('Migration response status:', response.status);
    
    if (!response.ok) {
      let errorMessage = 'Migration failed';
      try {
        const error = await response.json();
        errorMessage = error.error || errorMessage;
        console.error('Migration error response:', error);
      } catch (e) {
        errorMessage = `Server error: ${response.status} ${response.statusText}`;
        console.error('Failed to parse error response:', e);
      }
      throw new Error(errorMessage);
    }
    
    const result = await response.json();
    console.log('Migration result:', result);
    showSuccess('Migration completed successfully!');
    if (result.results && result.results.length > 0) {
      showInfo('Results: ' + result.results.map(r => r.message).join(', '));
    }
    
    // Hide migration warnings and reload page after a short delay
    const migrationWarning = document.getElementById('migrationWarning');
    if (migrationWarning) {
      migrationWarning.style.display = 'none';
    }
    const alwaysVisibleWarning = document.getElementById('alwaysVisibleMigrationWarning');
    if (alwaysVisibleWarning) {
      alwaysVisibleWarning.style.display = 'none';
    }
    
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  } catch (error) {
    console.error('Migration error:', error);
    showError(error.message || 'Migration failed. Check server logs for details.');
  } finally {
    if (button) setButtonLoading(button, false);
  }
};

// ============================================
// Initialize Application
// ============================================

checkAuth().then(() => {
  // Initialize all sections as collapsed
  initializeCollapsibleSections();
  
  // Load offers first (needed for campaigns)
  if (typeof loadOffers === 'function') {
    loadOffers().catch(err => {
      console.error('Error loading offers:', err);
    });
  }
  
  // Load domains first if admin (so campaign URLs can use them)
  if (currentUser && (currentUser.is_admin === true || currentUser.is_admin === 1 || currentUser.is_admin === 'true')) {
    loadAllUsers().catch(err => {
      console.error('Error loading users:', err);
    });
    if (typeof loadDomains === 'function') {
      loadDomains().then(() => {
        loadCampaigns(); // Load campaigns after domains so URLs use custom domains
      }).catch(err => {
        console.error('Error loading domains:', err);
        loadCampaigns(); // Still load campaigns even if domains fail
      });
    } else {
      loadCampaigns();
    }
  } else {
    // For non-admin users, load domains first (for campaign URL generation)
    // Then load campaigns
    if (typeof loadDomains === 'function') {
      loadDomains().then(() => {
        loadCampaigns(); // Load campaigns after domains so URLs use custom domains
      }).catch(err => {
        console.error('Error loading domains:', err);
        loadCampaigns(); // Still load campaigns even if domains fail
      });
    } else {
      loadCampaigns();
    }
    
    // Expand campaigns and offers sections for non-admin users so they see something
    setTimeout(() => {
      // Expand campaigns section
      const campaignsSection = document.getElementById('campaignsSection');
      if (campaignsSection) {
        campaignsSection.classList.remove('collapsed');
        const icon = document.getElementById('campaignsSectionIcon');
        if (icon) {
          icon.textContent = '▼';
          icon.style.transform = 'rotate(0deg)';
        }
      }
      
      // Expand offers section
      const offersSection = document.getElementById('offersSection');
      if (offersSection) {
        offersSection.classList.remove('collapsed');
        const offersIcon = document.getElementById('offersSectionIcon');
        if (offersIcon) {
          offersIcon.textContent = '▼';
          offersIcon.style.transform = 'rotate(0deg)';
        }
      }
    }, 500);
  }
});

// ============================================
// Schedule Grid Integration
// ============================================

/**
 * Initialize schedule grid for a campaign
 */
async function initializeScheduleGrid(campaignId, timeRules) {
  try {
    // Check if ScheduleGrid is defined
    if (typeof ScheduleGrid === 'undefined') {
      console.error('ScheduleGrid class not found. Make sure schedule-grid.js is loaded.');
      showError('Schedule grid component not loaded. Please refresh the page.');
      return;
    }
    
    // Load offers for the schedule
    const offersResponse = await fetch('/api/offers');
    if (!offersResponse.ok) throw new Error('Failed to load offers');
    const offers = await offersResponse.json();
    
    // Create schedule grid instance (make it global for button handlers)
    window.scheduleGridInstance = new ScheduleGrid(campaignId, timeRules, offers);
    const scheduleGridInstance = window.scheduleGridInstance;
    
    // Render grid
    const container = document.getElementById(`scheduleGridContainer-${campaignId}`);
    if (container) {
      container.innerHTML = scheduleGridInstance.render();
      scheduleGridInstance.attachEventListeners();
    }
  } catch (error) {
    console.error('Error initializing schedule grid:', error);
    showError('Failed to initialize schedule grid: ' + error.message);
  }
}

/**
 * Save schedule grid
 */
async function saveSchedule(campaignId) {
  if (!scheduleGridInstance || scheduleGridInstance.campaignId !== campaignId) {
    showError('Schedule grid not initialized for this campaign');
    return;
  }
  
  const button = event?.target;
  if (button) setButtonLoading(button, true);
  
  try {
    console.log('saveSchedule called for campaign:', campaignId);
    const success = await scheduleGridInstance.save();
    if (success) {
      showSuccess('Schedule saved successfully!');
      // Reload campaign details to show updated rules
      await viewCampaign(campaignId);
    } else {
      showError('Failed to save schedule. Check console for details.');
    }
  } catch (error) {
    console.error('Error in saveSchedule:', error);
    showError('Failed to save schedule: ' + (error.message || 'Unknown error'));
  } finally {
    if (button) setButtonLoading(button, false);
  }
}

// ============================================
// Duplicate Campaign
// ============================================

/**
 * Duplicate/clone a campaign
 */
async function duplicateCampaign(campaignId) {
  if (!confirm('Duplicate this campaign? This will create a copy with "(Copy)" in the name.')) {
    return;
  }
  
  const button = event?.target;
  if (button) setButtonLoading(button, true);
  
  try {
    // Get the original campaign
    const campaignResponse = await fetch(`/api/campaigns/${campaignId}`);
    if (!campaignResponse.ok) throw new Error('Failed to load campaign');
    const originalCampaign = await campaignResponse.json();
    
    // Get time rules for the original campaign
    const timeRulesResponse = await fetch(`/api/campaigns/${campaignId}`);
    if (!timeRulesResponse.ok) throw new Error('Failed to load time rules');
    const originalCampaignWithRules = await timeRulesResponse.json();
    const timeRules = originalCampaignWithRules.time_rules || [];
    
    // Create new campaign with "(Copy)" suffix
    const newName = `${originalCampaign.name} (Copy)`;
    const newCampaignData = {
      name: newName,
      timezone: originalCampaign.timezone || 'UTC',
      domain_id: originalCampaign.domain_id || null,
      fallback_offer_id: originalCampaign.fallback_offer_id || null,
      fallback_offer_url: originalCampaign.fallback_offer_url || null
    };
    
    // Create the new campaign
    const createResponse = await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCampaignData)
    });
    
    if (!createResponse.ok) {
      const error = await createResponse.json();
      throw new Error(error.error || 'Failed to create duplicate campaign');
    }
    
    const newCampaign = await createResponse.json();
    
    // Clone time rules
    for (const rule of timeRules) {
      const ruleData = {
        offer_id: rule.offer_id,
        rule_type: rule.rule_type,
        start_time: rule.start_time,
        day_of_week: rule.day_of_week !== null && rule.day_of_week !== undefined ? rule.day_of_week : null
      };
      
      if (rule.rule_type === 'range' && rule.end_time) {
        ruleData.end_time = rule.end_time;
      }
      
      if (rule.timezone) {
        ruleData.timezone = rule.timezone;
      }
      
      if (rule.weight !== undefined && rule.weight !== null) {
        ruleData.weight = rule.weight;
      }
      
      const ruleResponse = await fetch(`/api/campaigns/${newCampaign.id}/time-rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ruleData)
      });
      
      if (!ruleResponse.ok) {
        console.warn('Failed to clone time rule:', rule.id);
      }
    }
    
    showSuccess('Campaign duplicated successfully!');
    await loadCampaigns();
  } catch (error) {
    console.error('Error duplicating campaign:', error);
    showError(error.message || 'Failed to duplicate campaign');
  } finally {
    if (button) setButtonLoading(button, false);
  }
}
