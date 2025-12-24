// Custom Domains Management
let domains = [];

async function loadDomains() {
  try {
    const response = await fetch('/api/domains');
    if (!response.ok) throw new Error('Failed to load domains');
    domains = await response.json();
    window.customDomains = domains; // Make available globally for campaign URL generation
    renderDomains();
  } catch (error) {
    console.error('Error loading domains:', error);
    const showErrorFn = window.showError || alert;
    showErrorFn('Failed to load domains');
  }
}

function renderDomains() {
  const container = document.getElementById('domainsList');
  if (!container) return;
  
  if (domains.length === 0) {
    container.innerHTML = '<p class="empty-state">No custom domains configured. Add your first domain!</p>';
    return;
  }
  
  const escape = window.escapeHtml || function(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };
  
  container.innerHTML = domains.map(domain => `
    <div class="pending-user-card">
      <div class="user-info">
        <h4>${escape(domain.domain)} ${domain.is_active ? '<span style="color: #10b981; font-size: 12px;">(Active)</span>' : '<span style="color: #999; font-size: 12px;">(Inactive)</span>'}</h4>
        <p class="user-date">
          Added: ${new Date(domain.created_at).toLocaleDateString()}
        </p>
      </div>
      <div class="user-actions">
        <button class="btn btn-small btn-secondary" onclick="editDomain('${domain.id}')">Edit</button>
        <button class="btn btn-small btn-danger" onclick="deleteDomain('${domain.id}')">Delete</button>
      </div>
    </div>
  `).join('');
}

// Domain Modal
let domainModal, domainForm, editingDomainId = null;

function initDomainModal() {
  domainModal = document.getElementById('domainModal');
  domainForm = document.getElementById('domainForm');
  
  if (!domainModal || !domainForm) {
    console.error('Domain modal elements not found');
    return;
  }
  
  const createDomainBtn = document.getElementById('createDomainBtn');
  if (createDomainBtn) {
    createDomainBtn.addEventListener('click', () => {
      editingDomainId = null;
      document.getElementById('domainModalTitle').textContent = 'Add Custom Domain';
      document.getElementById('domainId').value = '';
      domainForm.reset();
      document.getElementById('domainActive').checked = true;
      domainModal.style.display = 'block';
    });
  }
  
  const cancelDomainBtn = document.getElementById('cancelDomainBtn');
  if (cancelDomainBtn) {
    cancelDomainBtn.addEventListener('click', () => {
      domainModal.style.display = 'none';
    });
  }
  
  const closeBtn = domainModal.querySelector('.close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      domainModal.style.display = 'none';
    });
  }
  
  domainForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const data = {
      domain: document.getElementById('domainName').value.trim(),
      is_active: document.getElementById('domainActive').checked
    };
    
    try {
      const url = editingDomainId 
        ? `/api/domains/${editingDomainId}`
        : '/api/domains';
      const method = editingDomainId ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save domain');
      }
      
      domainModal.style.display = 'none';
      loadDomains();
    } catch (error) {
      const showErrorFn = window.showError || alert;
      showErrorFn(error.message);
    }
  });
}

async function editDomain(id) {
  const domain = domains.find(d => d.id === id);
  if (!domain) return;
  
  editingDomainId = id;
  document.getElementById('domainModalTitle').textContent = 'Edit Domain';
  document.getElementById('domainId').value = id;
  document.getElementById('domainName').value = domain.domain;
  document.getElementById('domainActive').checked = domain.is_active === true || domain.is_active === 1;
  domainModal.style.display = 'block';
}

async function deleteDomain(id) {
  if (!confirm('Are you sure you want to delete this domain?')) return;
  
  try {
    const response = await fetch(`/api/domains/${id}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Failed to delete domain');
    loadDomains();
  } catch (error) {
    const showErrorFn = window.showError || alert;
    showErrorFn(error.message);
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDomainModal);
} else {
  initDomainModal();
}

