/**
 * Schedule Grid Component
 * Google Ads-style time schedule interface
 */

// Helper functions (if not defined globally)
if (typeof escapeHtml === 'undefined') {
  window.escapeHtml = function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };
}

if (typeof showError === 'undefined') {
  window.showError = function showError(message) {
    if (typeof showToast === 'function') {
      showToast(message, 'error', 6000);
    } else {
      alert('Error: ' + message);
    }
  };
}

if (typeof showSuccess === 'undefined') {
  window.showSuccess = function showSuccess(message) {
    if (typeof showToast === 'function') {
      showToast(message, 'success');
    } else {
      alert('Success: ' + message);
    }
  };
}

// Color palette for offers (max 10 colors, then cycle)
const OFFER_COLORS = [
  '#667eea', // Primary blue
  '#f093fb', // Pink
  '#4facfe', // Light blue
  '#43e97b', // Green
  '#fa709a', // Coral
  '#fee140', // Yellow
  '#30cfd0', // Cyan
  '#a8edea', // Light cyan
  '#ff9a9e', // Light pink
  '#ffecd2'  // Peach
];

// Make ScheduleGrid globally available
window.ScheduleGrid = class ScheduleGrid {
  constructor(campaignId, timeRules = [], offers = []) {
    this.campaignId = campaignId;
    this.timeRules = timeRules || [];
    this.offers = offers || [];
    this.selectedSlots = new Set(); // Set of slot IDs (day-hour combinations)
    this.assignments = new Map(); // Map of slotId -> {ruleId, offerId, weight}
    this.currentOfferId = null;
    this.currentWeight = 100;
    this.isDragging = false;
    this.dragStartSlot = null;
    this.offerColorMap = new Map(); // Map of offerId -> color
    this.mouseDownPosition = null; // Store mouse position on mousedown to detect drag vs click
    this.hasMouseMoved = false; // Track if mouse has moved during mousedown
    
    this.initColorMap();
    this.loadAssignmentsFromRules();
  }
  
  initColorMap() {
    // Assign colors to offers
    const uniqueOfferIds = [...new Set(this.timeRules.map(r => r.offer_id))];
    uniqueOfferIds.forEach((offerId, index) => {
      this.offerColorMap.set(offerId, OFFER_COLORS[index % OFFER_COLORS.length]);
    });
  }
  
  loadAssignmentsFromRules() {
    // Convert time rules to slot assignments
    this.timeRules.forEach(rule => {
      const slots = this.getSlotsFromRule(rule);
      slots.forEach(slotId => {
        if (!this.assignments.has(slotId)) {
          this.assignments.set(slotId, []);
        }
        this.assignments.get(slotId).push({
          ruleId: rule.id,
          offerId: rule.offer_id,
          weight: rule.weight || 100
        });
      });
    });
  }
  
  getSlotsFromRule(rule) {
    const slots = new Set();
    const days = rule.day_of_week !== null ? [rule.day_of_week] : [0, 1, 2, 3, 4, 5, 6];
    
    days.forEach(day => {
      if (rule.rule_type === 'range' && rule.end_time) {
        const startHour = parseInt(rule.start_time.split(':')[0]);
        const endHour = parseInt(rule.end_time.split(':')[0]);
        
        for (let hour = startHour; hour < endHour; hour++) {
          slots.add(`${day}-${hour}`);
        }
      } else if (rule.rule_type === 'specific') {
        const hour = parseInt(rule.start_time.split(':')[0]);
        slots.add(`${day}-${hour}`);
      }
    });
    
    return Array.from(slots);
  }
  
  getSlotId(day, hour) {
    return `${day}-${hour}`;
  }
  
  getSlotColor(slotId) {
    const assignments = this.assignments.get(slotId);
    if (!assignments || assignments.length === 0) {
      return null; // Fallback (white)
    }
    
    // Use first assignment's color (if multiple, we'll blend or use first)
    const firstAssignment = assignments[0];
    if (!this.offerColorMap.has(firstAssignment.offerId)) {
      // Assign a color if not mapped
      const colorIndex = this.offerColorMap.size % OFFER_COLORS.length;
      this.offerColorMap.set(firstAssignment.offerId, OFFER_COLORS[colorIndex]);
    }
    return this.offerColorMap.get(firstAssignment.offerId);
  }
  
  getSlotTooltip(slotId) {
    const assignments = this.assignments.get(slotId);
    if (!assignments || assignments.length === 0) {
      return 'Fallback URL';
    }
    
    return assignments.map(ass => {
      const offer = this.offers.find(o => o.id === ass.offerId);
      const offerName = offer ? offer.name : 'Unknown Offer';
      return `${offerName} (${ass.weight}%)`;
    }).join(', ');
  }
  
  render() {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const hours = Array.from({ length: 24 }, (_, i) => i);
    
    let html = '<div class="schedule-grid-container">';
    
    // Legend
    html += '<div class="schedule-grid-legend">';
    const offerColorPairs = Array.from(this.offerColorMap.entries());
    offerColorPairs.forEach(([offerId, color]) => {
      const offer = this.offers.find(o => o.id === offerId);
      if (offer) {
        html += `
          <div class="legend-item">
            <div class="legend-color" style="background-color: ${color}"></div>
            <span>${escapeHtml(offer.name)}</span>
          </div>
        `;
      }
    });
    html += '<div class="legend-fallback">Unselected slots → Fallback URL</div>';
    html += '</div>';
    
    // Grid
    html += '<div class="schedule-grid-wrapper">';
    html += '<div class="schedule-grid" id="scheduleGrid">';
    
    // Header row
    html += '<div class="schedule-header"></div>'; // Empty top-left cell
    days.forEach(day => {
      html += `<div class="schedule-header">${day}</div>`;
    });
    
    // Time slots
    hours.forEach(hour => {
      // Time label
      const hourLabel = hour.toString().padStart(2, '0') + ':00';
      html += `<div class="schedule-time-label">${hourLabel}</div>`;
      
      // Day slots
      days.forEach((_, dayIndex) => {
        const slotId = this.getSlotId(dayIndex, hour);
        const color = this.getSlotColor(slotId);
        const tooltip = this.getSlotTooltip(slotId);
        const isSelected = this.selectedSlots.has(slotId);
        const hasAssignment = color !== null;
        
        html += `
          <div 
            class="schedule-slot ${hasAssignment ? 'assigned' : ''} ${isSelected ? 'selected' : ''}"
            data-slot-id="${slotId}"
            data-day="${dayIndex}"
            data-hour="${hour}"
            style="background-color: ${color || '#ffffff'};"
            onmouseenter="showSlotTooltip(event)"
            onmouseleave="hideSlotTooltip(event)"
          >
            <div class="schedule-slot-tooltip">${escapeHtml(tooltip)}</div>
          </div>
        `;
      });
    });
    
    html += '</div>'; // .schedule-grid
    html += '</div>'; // .schedule-grid-wrapper
    
    // Actions
    html += `
      <div class="schedule-actions">
        <div class="form-group">
          <label>Select Offer</label>
          <select id="scheduleOfferSelect" class="form-control">
            <option value="">Choose an offer...</option>
            ${this.offers.map(offer => 
              `<option value="${offer.id}">${escapeHtml(offer.name)}</option>`
            ).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Weight (%)</label>
          <input type="number" id="scheduleWeightInput" class="form-control schedule-weight-input" 
                 min="0" max="100" value="100">
        </div>
        <button class="btn btn-primary" onclick="scheduleGridInstance.assignSelectedSlots()">
          Assign to Selected Slots
        </button>
        <button class="btn btn-secondary" onclick="scheduleGridInstance.clearSelectedSlots()">
          Clear Selection
        </button>
        <button class="btn btn-danger" onclick="scheduleGridInstance.removeSelectedSlots()">
          Remove from Selected
        </button>
      </div>
      
      <div class="schedule-info">
        <strong>Instructions:</strong>
        Click and drag to select time slots. Choose an offer and weight, then click "Assign to Selected Slots".
        Click an assigned slot to edit it. Click again to remove the assignment.
      </div>
    `;
    
    html += '</div>'; // .schedule-grid-container
    
    return html;
  }
  
  attachEventListeners() {
    const grid = document.getElementById('scheduleGrid');
    if (!grid) return;
    
    const slots = grid.querySelectorAll('.schedule-slot');
    
    slots.forEach(slot => {
      slot.addEventListener('mousedown', (e) => this.handleMouseDown(e, slot));
      slot.addEventListener('mouseenter', (e) => this.handleMouseEnter(e, slot));
      slot.addEventListener('click', (e) => this.handleClick(e, slot));
    });
    
    document.addEventListener('mouseup', () => this.handleMouseUp());
    
    // Offer select change
    const offerSelect = document.getElementById('scheduleOfferSelect');
    if (offerSelect) {
      offerSelect.addEventListener('change', (e) => {
        this.currentOfferId = e.target.value || null;
      });
    }
    
    // Weight input change
    const weightInput = document.getElementById('scheduleWeightInput');
    if (weightInput) {
      weightInput.addEventListener('change', (e) => {
        this.currentWeight = parseInt(e.target.value) || 100;
      });
    }
  }
  
  handleMouseDown(e, slot) {
    e.preventDefault();
    const slotId = slot.dataset.slotId;
    this.mouseDownPosition = { x: e.clientX, y: e.clientY };
    this.hasMouseMoved = false;
    this.isDragging = false; // Don't set to true yet - wait for movement
    this.dragStartSlot = slotId;
    this.selectedSlots.clear();
    this.selectedSlots.add(slotId);
    this.updateSelectionDisplay();
  }
  
  handleMouseEnter(e, slot) {
    if (!this.dragStartSlot) return;
    
    // Check if mouse has moved significantly (more than 3 pixels) to start dragging
    if (this.mouseDownPosition) {
      const deltaX = Math.abs(e.clientX - this.mouseDownPosition.x);
      const deltaY = Math.abs(e.clientY - this.mouseDownPosition.y);
      if (deltaX > 3 || deltaY > 3) {
        this.hasMouseMoved = true;
        this.isDragging = true;
      }
    }
    
    if (!this.isDragging) return;
    
    const currentSlotId = slot.dataset.slotId;
    const [startDay, startHour] = this.dragStartSlot.split('-').map(Number);
    const [currentDay, currentHour] = currentSlotId.split('-').map(Number);
    
    // Select all slots in the rectangle between start and current
    this.selectedSlots.clear();
    const minDay = Math.min(startDay, currentDay);
    const maxDay = Math.max(startDay, currentDay);
    const minHour = Math.min(startHour, currentHour);
    const maxHour = Math.max(startHour, currentHour);
    
    for (let day = minDay; day <= maxDay; day++) {
      for (let hour = minHour; hour <= maxHour; hour++) {
        this.selectedSlots.add(this.getSlotId(day, hour));
      }
    }
    
    this.updateSelectionDisplay();
  }
  
  handleMouseUp() {
    // Only reset dragging state, keep dragStartSlot for click handler
    this.isDragging = false;
  }
  
  handleClick(e, slot) {
    const slotId = slot.dataset.slotId;
    
    // If we actually dragged (mouse moved significantly), don't handle as click
    if (this.hasMouseMoved && this.isDragging) {
      this.dragStartSlot = null;
      this.hasMouseMoved = false;
      this.mouseDownPosition = null;
      return;
    }
    
    // Reset drag state
    this.isDragging = false;
    this.dragStartSlot = null;
    this.hasMouseMoved = false;
    this.mouseDownPosition = null;
    
    // If clicking an assigned slot, select just that slot for editing
    if (this.assignments.has(slotId) && this.assignments.get(slotId).length > 0) {
      this.selectedSlots.clear();
      this.selectedSlots.add(slotId);
      this.updateSelectionDisplay();
      
      // Pre-fill form with first assignment
      const firstAssignment = this.assignments.get(slotId)[0];
      const offerSelect = document.getElementById('scheduleOfferSelect');
      const weightInput = document.getElementById('scheduleWeightInput');
      if (offerSelect) offerSelect.value = firstAssignment.offerId;
      if (weightInput) weightInput.value = firstAssignment.weight;
      this.currentOfferId = firstAssignment.offerId;
      this.currentWeight = firstAssignment.weight;
    } else {
      // Toggle selection
      if (this.selectedSlots.has(slotId)) {
        this.selectedSlots.delete(slotId);
      } else {
        this.selectedSlots.add(slotId);
      }
      this.updateSelectionDisplay();
    }
  }
  
  updateSelectionDisplay() {
    const slots = document.querySelectorAll('.schedule-slot');
    slots.forEach(slot => {
      const slotId = slot.dataset.slotId;
      if (this.selectedSlots.has(slotId)) {
        slot.classList.add('selected');
      } else {
        slot.classList.remove('selected');
      }
    });
  }
  
  assignSelectedSlots() {
    if (!this.currentOfferId) {
      showError('Please select an offer first');
      return;
    }
    
    if (this.selectedSlots.size === 0) {
      showError('Please select at least one time slot');
      return;
    }
    
    // Assign offer to selected slots
    this.selectedSlots.forEach(slotId => {
      if (!this.assignments.has(slotId)) {
        this.assignments.set(slotId, []);
      }
      
      // Check if this offer already exists for this slot
      const existing = this.assignments.get(slotId).find(a => a.offerId === this.currentOfferId);
      if (existing) {
        existing.weight = this.currentWeight;
      } else {
        this.assignments.get(slotId).push({
          ruleId: null, // Will be created when saving
          offerId: this.currentOfferId,
          weight: this.currentWeight
        });
      }
      
      // Ensure color is mapped
      if (!this.offerColorMap.has(this.currentOfferId)) {
        const colorIndex = this.offerColorMap.size % OFFER_COLORS.length;
        this.offerColorMap.set(this.currentOfferId, OFFER_COLORS[colorIndex]);
      }
    });
    
    // Re-render grid
    this.rerenderGrid();
    this.selectedSlots.clear();
    this.updateSelectionDisplay();
  }
  
  removeSelectedSlots() {
    if (this.selectedSlots.size === 0) {
      showError('Please select at least one time slot');
      return;
    }
    
    this.selectedSlots.forEach(slotId => {
      this.assignments.delete(slotId);
    });
    
    this.rerenderGrid();
    this.selectedSlots.clear();
    this.updateSelectionDisplay();
  }
  
  clearSelectedSlots() {
    this.selectedSlots.clear();
    this.updateSelectionDisplay();
  }
  
  rerenderGrid() {
    // Update slot colors
    const slots = document.querySelectorAll('.schedule-slot');
    slots.forEach(slot => {
      const slotId = slot.dataset.slotId;
      const color = this.getSlotColor(slotId);
      slot.style.backgroundColor = color || '#ffffff';
      
      const hasAssignment = color !== null;
      if (hasAssignment) {
        slot.classList.add('assigned');
      } else {
        slot.classList.remove('assigned');
      }
      
      // Update tooltip
      const tooltip = slot.querySelector('.schedule-slot-tooltip');
      if (tooltip) {
        tooltip.textContent = this.getSlotTooltip(slotId);
      }
    });
  }
  
  async save() {
    // Convert assignments to time rules
    // Group consecutive slots with same offer/weight into ranges
    
    const rulesToCreate = [];
    const rulesToDelete = new Set(this.timeRules.map(r => r.id));
    
    // Group assignments by offer and weight
    // Use '::' as separator since UUIDs contain dashes
    const assignmentGroups = new Map();
    
    this.assignments.forEach((assignments, slotId) => {
      assignments.forEach(ass => {
        const key = `${ass.offerId}::${ass.weight}`;
        if (!assignmentGroups.has(key)) {
          assignmentGroups.set(key, []);
        }
        assignmentGroups.get(key).push(slotId);
      });
    });
    
    // Convert slot groups to time rules
    assignmentGroups.forEach((slots, key) => {
      const [offerId, weight] = key.split('::');
      
      // Group consecutive slots
      const ranges = this.groupConsecutiveSlots(slots);
      
      ranges.forEach(range => {
        rulesToCreate.push({
          offer_id: offerId,
          weight: parseInt(weight),
          day_of_week: range.day,
          start_time: `${range.startHour.toString().padStart(2, '0')}:00`,
          end_time: `${range.endHour.toString().padStart(2, '0')}:00`,
          rule_type: 'range'
        });
      });
    });
    
    // Save via API
    try {
      console.log('Saving schedule:', { campaignId: this.campaignId, rulesToDelete: rulesToDelete.size, rulesToCreate: rulesToCreate.length });
      
      // Delete old rules
      for (const ruleId of rulesToDelete) {
        const deleteResponse = await fetch(`/api/time-rules/${ruleId}`, { method: 'DELETE' });
        if (!deleteResponse.ok) {
          const errorData = await deleteResponse.json().catch(() => ({}));
          throw new Error(`Failed to delete rule ${ruleId}: ${errorData.error || deleteResponse.statusText}`);
        }
      }
      
      // Create new rules
      for (const rule of rulesToCreate) {
        console.log('Creating rule:', rule);
        const createResponse = await fetch(`/api/campaigns/${this.campaignId}/time-rules`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(rule)
        });
        if (!createResponse.ok) {
          const errorData = await createResponse.json().catch(() => ({}));
          throw new Error(`Failed to create rule: ${errorData.error || createResponse.statusText}`);
        }
      }
      
      // Don't show success here - let the caller (saveSchedule) handle it
      return true;
    } catch (error) {
      console.error('Error saving schedule:', error);
      const showErrorFn = window.showError || alert;
      showErrorFn('Failed to save schedule: ' + (error.message || 'Unknown error'));
      return false;
    }
  }
  
  groupConsecutiveSlots(slots) {
    // Group slots into ranges by day
    const slotsByDay = new Map();
    
    slots.forEach(slotId => {
      const [day, hour] = slotId.split('-').map(Number);
      if (!slotsByDay.has(day)) {
        slotsByDay.set(day, []);
      }
      slotsByDay.get(day).push(hour);
    });
    
    const ranges = [];
    
    slotsByDay.forEach((hours, day) => {
      hours.sort((a, b) => a - b);
      
      let rangeStart = hours[0];
      let rangeEnd = hours[0] + 1;
      
      for (let i = 1; i < hours.length; i++) {
        if (hours[i] === rangeEnd) {
          rangeEnd = hours[i] + 1;
        } else {
          ranges.push({ day, startHour: rangeStart, endHour: rangeEnd });
          rangeStart = hours[i];
          rangeEnd = hours[i] + 1;
        }
      }
      
      ranges.push({ day, startHour: rangeStart, endHour: rangeEnd });
    });
    
    return ranges;
  }
}

// Global instance
let scheduleGridInstance = null;

// Helper functions
function showSlotTooltip(event) {
  // Tooltip already in HTML, CSS handles visibility
}

function hideSlotTooltip(event) {
  // Tooltip already in HTML, CSS handles visibility
}

