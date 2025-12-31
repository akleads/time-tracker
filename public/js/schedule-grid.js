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
  constructor(campaignId, timeRules = [], campaign = null) {
    this.campaignId = campaignId;
    this.timeRules = timeRules || [];
    this.campaign = campaign || { number_of_offers: 1, offer_positions: [] };
    this.selectedSlots = new Set(); // Set of slot IDs (day-hour combinations)
    this.assignments = new Map(); // Map of slotId -> {ruleId, offer_position, weight}
    this.currentOfferPosition = 1;
    this.currentWeight = 100;
    this.isDragging = false;
    this.dragStartSlot = null;
    this.offerPositionColorMap = new Map(); // Map of offer_position -> color
    this.mouseDownPosition = null; // Store mouse position on mousedown to detect drag vs click
    this.hasMouseMoved = false; // Track if mouse has moved during mousedown
    this.copiedDay = null; // Store copied day assignments (0-6, where 0 is Sunday)
    this.history = []; // Undo/redo history
    this.historyIndex = -1; // Current position in history
    
    this.days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    this.hours = Array.from({ length: 24 }, (_, i) => i);
    
    this.initColorMap();
    this.loadAssignmentsFromRules();
    this.saveToHistory(); // Save initial state
  }
  
  initColorMap() {
    // Assign colors to offer positions from time rules
    const numberOfOffers = this.campaign.number_of_offers || 1;
    for (let i = 1; i <= numberOfOffers; i++) {
      if (!this.offerPositionColorMap.has(i)) {
        this.offerPositionColorMap.set(i, OFFER_COLORS[(i - 1) % OFFER_COLORS.length]);
      }
    }
    
    console.log('initColorMap: Mapped colors for', this.offerPositionColorMap.size, 'offer positions');
  }
  
  loadAssignmentsFromRules() {
    // Clear existing assignments first
    this.assignments.clear();
    
    // Convert time rules to slot assignments
    console.log('Loading assignments from', this.timeRules.length, 'time rules');
    this.timeRules.forEach(rule => {
      const slots = this.getSlotsFromRule(rule);
      slots.forEach(slotId => {
        if (!this.assignments.has(slotId)) {
          this.assignments.set(slotId, []);
        }
        this.assignments.get(slotId).push({
          ruleId: rule.id,
          offer_position: rule.offer_position || 1,
          weight: rule.weight || 100
        });
      });
      
      // Ensure offer position color is mapped when loading from rules
      const position = rule.offer_position || 1;
      if (!this.offerPositionColorMap.has(position)) {
        this.offerPositionColorMap.set(position, OFFER_COLORS[(position - 1) % OFFER_COLORS.length]);
      }
    });
    
    console.log('Loaded assignments for', this.assignments.size, 'slots');
    console.log('Total assignments:', Array.from(this.assignments.values()).reduce((sum, arr) => sum + arr.length, 0));
    console.log('Color map now has', this.offerPositionColorMap.size, 'offer positions');
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
    
    // Ensure all offer position colors are mapped
    assignments.forEach(ass => {
      const position = ass.offer_position || 1;
      if (!this.offerPositionColorMap.has(position)) {
        this.offerPositionColorMap.set(position, OFFER_COLORS[(position - 1) % OFFER_COLORS.length]);
      }
    });
    
    // Get colors for all assignments
    const colors = assignments.map(ass => this.offerPositionColorMap.get(ass.offer_position || 1));
    
    // If single assignment, return single color
    if (colors.length === 1) {
      return colors[0];
    }
    
    // Multiple assignments - create striped pattern
    return this.createStripePattern(colors);
  }
  
  createStripePattern(colors) {
    // Create a diagonal stripe pattern with all colors
    // Each stripe takes up equal space
    const stripeCount = colors.length;
    const stripeSize = 100 / stripeCount;
    
    const stripes = colors.map((color, index) => {
      const start = index * stripeSize;
      const end = (index + 1) * stripeSize;
      return `${color} ${start}%, ${color} ${end}%`;
    }).join(', ');
    
    // Create diagonal stripes at 45 degrees
    return `linear-gradient(45deg, ${stripes})`;
  }
  
  getSlotTooltip(slotId) {
    const assignments = this.assignments.get(slotId);
    if (!assignments || assignments.length === 0) {
      return 'Offer Position 1 (default)';
    }
    
    return assignments.map(ass => {
      const position = ass.offer_position || 1;
      const positionTitle = this.getPositionTitle(position);
      return `Offer Position ${position}${positionTitle ? ` (${positionTitle})` : ''} (${ass.weight}%)`;
    }).join(', ');
  }
  
  getPositionTitle(position) {
    if (!this.campaign || !this.campaign.offer_positions) return null;
    const pos = this.campaign.offer_positions.find(p => p.position === position);
    return pos ? pos.title : null;
  }
  
  render() {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const hours = Array.from({ length: 24 }, (_, i) => i);
    
    let html = '<div class="schedule-grid-container">';
    
    // Two-column layout wrapper
    html += '<div class="schedule-layout-wrapper">';
    
    // Left column: Grid
    html += '<div class="schedule-grid-column">';
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
        
        // Determine if it's a gradient (multiple offers) or solid color
        const isGradient = color && color.includes('linear-gradient');
        const styleAttr = isGradient 
          ? `background: ${color};`
          : `background-color: ${color || '#ffffff'};`;
        
        html += `
          <div 
            class="schedule-slot ${hasAssignment ? 'assigned' : ''} ${isSelected ? 'selected' : ''} ${isGradient ? 'multi-offer' : ''}"
            data-slot-id="${slotId}"
            data-day="${dayIndex}"
            data-hour="${hour}"
            style="${styleAttr}"
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
    html += '</div>'; // .schedule-grid-column
    
    // Right column: Actions Panel
    html += '<div class="schedule-actions-column">';
    
    // Legend (moved to right panel)
    html += '<div class="schedule-grid-legend">';
    html += '<div class="legend-title">Offer Position Legend</div>';
    const numberOfOffers = this.campaign.number_of_offers || 1;
    if (numberOfOffers > 0) {
      for (let i = 1; i <= numberOfOffers; i++) {
        const color = this.offerPositionColorMap.get(i) || OFFER_COLORS[(i - 1) % OFFER_COLORS.length];
        const title = this.getPositionTitle(i);
        html += `
          <div class="legend-item">
            <div class="legend-color" style="background-color: ${color}"></div>
            <span>Offer Position ${i}${title ? ` - ${escapeHtml(title)}` : ''}</span>
          </div>
        `;
      }
    } else {
      html += '<div class="legend-empty">No positions configured</div>';
    }
    html += '<div class="legend-fallback">Unselected slots → Offer Position 1 (default)</div>';
    html += '</div>';
    
    // Actions
    html += `
      <div class="schedule-actions">
        <div class="form-group">
          <label>Select Offer Position</label>
          <select id="scheduleOfferSelect" class="form-control">
            <option value="">Choose an offer position...</option>
            ${Array.from({ length: numberOfOffers }, (_, i) => {
              const pos = i + 1;
              const title = this.getPositionTitle(pos);
              return `<option value="${pos}">Offer Position ${pos}${title ? ` - ${escapeHtml(title)}` : ''}</option>`;
            }).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Weight (%)</label>
          <input type="number" id="scheduleWeightInput" class="form-control schedule-weight-input" 
                 min="0" max="100" value="100">
        </div>
        <div class="schedule-action-buttons">
          <button class="btn btn-primary" onclick="window.scheduleGridInstance.assignSelectedSlots()">
            Assign to Selected Slots
          </button>
          <button class="btn btn-secondary" onclick="window.scheduleGridInstance.clearSelectedSlots()">
            Clear Selection
          </button>
          <button class="btn btn-danger" onclick="window.scheduleGridInstance.removeSelectedSlots()">
            Remove from Selected
          </button>
        </div>
      </div>
      
      <div class="schedule-bulk-actions">
        <div class="bulk-actions-header">
          <strong>Bulk Actions</strong>
        </div>
        <div class="bulk-actions-content">
          <div class="form-group">
            <label>Day Operations</label>
            <div class="day-buttons-row">
              <button class="btn btn-small btn-secondary" onclick="window.scheduleGridInstance.copyDay(0)" title="Copy Sunday">Copy Sun</button>
              <button class="btn btn-small btn-secondary" onclick="window.scheduleGridInstance.copyDay(1)" title="Copy Monday">Copy Mon</button>
              <button class="btn btn-small btn-secondary" onclick="window.scheduleGridInstance.copyDay(2)" title="Copy Tuesday">Copy Tue</button>
            </div>
            <div class="day-buttons-row">
              <button class="btn btn-small btn-secondary" onclick="window.scheduleGridInstance.copyDay(3)" title="Copy Wednesday">Copy Wed</button>
              <button class="btn btn-small btn-secondary" onclick="window.scheduleGridInstance.copyDay(4)" title="Copy Thursday">Copy Thu</button>
              <button class="btn btn-small btn-secondary" onclick="window.scheduleGridInstance.copyDay(5)" title="Copy Friday">Copy Fri</button>
              <button class="btn btn-small btn-secondary" onclick="window.scheduleGridInstance.copyDay(6)" title="Copy Saturday">Copy Sat</button>
            </div>
            <div class="day-buttons-row" style="margin-top: 8px;">
              <button class="btn btn-small btn-primary" onclick="window.scheduleGridInstance.pasteToWeekdays()" ${this.copiedDay === null ? 'disabled' : ''} title="Paste to Weekdays: Copy the selected day's schedule to Monday through Friday">
                Paste to Weekdays
              </button>
              <button class="btn btn-small btn-primary" onclick="window.scheduleGridInstance.pasteToWeekend()" ${this.copiedDay === null ? 'disabled' : ''} title="Paste to Weekend: Copy the selected day's schedule to Saturday and Sunday">
                Paste to Weekend
              </button>
            </div>
            <div class="day-buttons-row">
              <button class="btn btn-small btn-primary" onclick="window.scheduleGridInstance.pasteToAll()" ${this.copiedDay === null ? 'disabled' : ''} title="Paste to All Days: Copy the selected day's schedule to all other days of the week">
                Paste to All Days
              </button>
            </div>
          </div>
          <div class="form-group" style="margin-top: 12px;">
            <label>Fill Operations</label>
            <button class="btn btn-small btn-secondary" onclick="window.scheduleGridInstance.fillDayPrompt()" style="width: 100%; margin-bottom: 6px;" title="Fill Day: Assign the selected offer position to all time slots for a chosen day">
              Fill Day with Offer
            </button>
            <button class="btn btn-small btn-primary" onclick="window.scheduleGridInstance.fillAllEmptySlots()" style="width: 100%; margin-bottom: 6px;" title="Fill All Empty Slots: Assign the selected offer position to all empty time slots across the entire schedule">
              Fill All Empty Slots
            </button>
            <button class="btn btn-small btn-secondary" onclick="window.scheduleGridInstance.clearDayPrompt()" style="width: 100%; margin-bottom: 6px;" title="Clear Day: Remove all assignments from a chosen day">
              Clear Day
            </button>
            <button class="btn btn-small btn-danger" onclick="window.scheduleGridInstance.clearAll()" style="width: 100%;" title="Clear All: Remove all time-based assignments from the entire schedule">
              Clear All Schedule
            </button>
          </div>
        </div>
      </div>
      
      <div class="schedule-undo-redo">
        <div class="undo-redo-header">
          <strong>History</strong>
        </div>
        <div class="undo-redo-buttons">
          <button class="btn btn-small btn-secondary" onclick="window.scheduleGridInstance.undo()" ${this.historyIndex <= 0 ? 'disabled' : ''} title="Undo last change">
            ↶ Undo
          </button>
          <button class="btn btn-small btn-secondary" onclick="window.scheduleGridInstance.redo()" ${this.historyIndex >= this.history.length - 1 ? 'disabled' : ''} title="Redo last undone change">
            ↷ Redo
          </button>
        </div>
      </div>
      
      <div class="schedule-info">
        <strong>Instructions:</strong>
        <ul>
          <li>Click a single slot to select it</li>
          <li>Click and drag to select multiple slots</li>
          <li>Choose an offer and weight, then click "Assign"</li>
          <li>Click an assigned slot to edit it</li>
          <li>Use bulk actions to copy/paste days or fill/clear days</li>
        </ul>
      </div>
    `;
    
    html += '</div>'; // .schedule-actions-column
    html += '</div>'; // .schedule-layout-wrapper
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
    
    // Offer position select change
    const offerSelect = document.getElementById('scheduleOfferSelect');
    if (offerSelect) {
      offerSelect.addEventListener('change', (e) => {
        this.currentOfferPosition = parseInt(e.target.value) || 1;
      });
    }
    
    // Weight input change
    const weightInput = document.getElementById('scheduleWeightInput');
    if (weightInput) {
      weightInput.addEventListener('change', (e) => {
        this.currentWeight = parseInt(e.target.value) || 100;
      });
    }
    
    // Initialize button states
    this.updatePasteButtons();
    this.updateUndoRedoButtons();
  }
  
  handleMouseDown(e, slot) {
    e.preventDefault();
    const slotId = slot.dataset.slotId;
    this.mouseDownPosition = { x: e.clientX, y: e.clientY };
    this.hasMouseMoved = false;
    this.isDragging = false; // Don't set to true yet - wait for movement
    this.dragStartSlot = slotId;
    // Don't change selection on mousedown - wait for click or drag
    // This prevents conflicts between mousedown selection and click toggle
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
    // If we were dragging, the selection is already done in handleMouseEnter
    // If we weren't dragging, handleClick will handle the selection
    // Just reset the drag state
    if (this.isDragging) {
      // Drag is complete, selection already done
      this.isDragging = false;
      this.dragStartSlot = null;
      this.hasMouseMoved = false;
      this.mouseDownPosition = null;
    } else {
      // Single click - handleClick will handle it
      // Just reset these flags
      this.isDragging = false;
    }
  }
  
  handleClick(e, slot) {
    const slotId = slot.dataset.slotId;
    
    // If we actually dragged (mouse moved significantly), don't handle as click
    if (this.hasMouseMoved) {
      // Was a drag operation, selection already handled in handleMouseEnter
      this.dragStartSlot = null;
      this.hasMouseMoved = false;
      this.mouseDownPosition = null;
      return;
    }
    
    // This was a single click (no drag)
    // Reset drag state
    this.isDragging = false;
    this.dragStartSlot = null;
    this.hasMouseMoved = false;
    this.mouseDownPosition = null;
    
    // If clicking an assigned slot, select just that slot for editing
    if (this.assignments.has(slotId) && this.assignments.get(slotId).length > 0) {
      // If already selected and clicking again, deselect it
      if (this.selectedSlots.has(slotId) && this.selectedSlots.size === 1) {
        this.selectedSlots.clear();
      } else {
        // Select just this slot
        this.selectedSlots.clear();
        this.selectedSlots.add(slotId);
        
        // Pre-fill form with first assignment
        const firstAssignment = this.assignments.get(slotId)[0];
        const offerSelect = document.getElementById('scheduleOfferSelect');
        const weightInput = document.getElementById('scheduleWeightInput');
        if (offerSelect) offerSelect.value = firstAssignment.offer_position || 1;
        if (weightInput) weightInput.value = firstAssignment.weight;
        this.currentOfferPosition = firstAssignment.offer_position || 1;
        this.currentWeight = firstAssignment.weight;
      }
      this.updateSelectionDisplay();
    } else {
      // For unassigned slots, toggle selection
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
    if (!this.currentOfferPosition) {
      const showErrorFn = window.showError || alert;
      showErrorFn('Please select an offer position first');
      return;
    }
    
    if (this.selectedSlots.size === 0) {
      const showErrorFn = window.showError || alert;
      showErrorFn('Please select at least one time slot');
      return;
    }
    
    console.log('Assigning offer position', this.currentOfferPosition, 'with weight', this.currentWeight, 'to', this.selectedSlots.size, 'slots');
    console.log('Assignments before:', Array.from(this.assignments.entries()).length, 'slots');
    
    this.saveToHistory(); // Save state before assignment
    
    // Assign offer position to selected slots
    this.selectedSlots.forEach(slotId => {
      if (!this.assignments.has(slotId)) {
        this.assignments.set(slotId, []);
      }
      
      // Check if this offer position already exists for this slot
      const existing = this.assignments.get(slotId).find(a => a.offer_position === this.currentOfferPosition);
      if (existing) {
        existing.weight = this.currentWeight;
        console.log('Updated existing assignment for slot', slotId, 'weight:', this.currentWeight);
      } else {
        this.assignments.get(slotId).push({
          ruleId: null, // Will be created when saving
          offer_position: this.currentOfferPosition,
          weight: this.currentWeight
        });
        console.log('Added new assignment for slot', slotId);
      }
      
      // Ensure color is mapped
      if (!this.offerPositionColorMap.has(this.currentOfferPosition)) {
        this.offerPositionColorMap.set(this.currentOfferPosition, OFFER_COLORS[(this.currentOfferPosition - 1) % OFFER_COLORS.length]);
      }
    });
    
    console.log('Assignments after:', Array.from(this.assignments.entries()).length, 'slots');
    const totalAssignments = Array.from(this.assignments.values()).reduce((sum, arr) => sum + arr.length, 0);
    console.log('Total assignments across all slots:', totalAssignments);
    
    // Verify all assignments are still present
    const assignmentSummary = Array.from(this.assignments.entries()).map(([slotId, arr]) => ({
      slotId,
      count: arr.length,
      positions: arr.map(a => a.offer_position)
    }));
    console.log('Assignment summary:', assignmentSummary.slice(0, 10), assignmentSummary.length > 10 ? '...' : '');
    
    // Re-render grid
    this.rerenderGrid();
    this.selectedSlots.clear();
    this.updateSelectionDisplay();
    this.updateUndoRedoButtons();
  }
  
  removeSelectedSlots() {
    if (this.selectedSlots.size === 0) {
      showError('Please select at least one time slot');
      return;
    }
    
    this.saveToHistory(); // Save state before removal
    
    this.selectedSlots.forEach(slotId => {
      this.assignments.delete(slotId);
    });
    
    this.rerenderGrid();
    this.selectedSlots.clear();
    this.updateSelectionDisplay();
    this.updateUndoRedoButtons();
  }
  
  clearSelectedSlots() {
    this.selectedSlots.clear();
    this.updateSelectionDisplay();
  }
  
  // ============================================
  // Copy/Paste Day Operations
  // ============================================
  
  copyDay(dayIndex) {
    // Copy all assignments from a specific day
    const dayAssignments = new Map();
    
    for (let hour = 0; hour < 24; hour++) {
      const slotId = this.getSlotId(dayIndex, hour);
      const assignments = this.assignments.get(slotId);
      if (assignments && assignments.length > 0) {
        dayAssignments.set(hour, JSON.parse(JSON.stringify(assignments))); // Deep copy
      }
    }
    
    this.copiedDay = { dayIndex, assignments: dayAssignments };
    const dayName = this.days[dayIndex];
    window.showSuccess(`Copied ${dayName} schedule`);
    this.updatePasteButtons();
  }
  
  pasteToDay(targetDayIndex, skipHistory = false) {
    if (this.copiedDay === null) {
      window.showError('No day copied. Please copy a day first.');
      return;
    }
    
    if (!skipHistory) {
      this.saveToHistory(); // Save state before paste
    }
    
    // Paste assignments to target day
    for (let hour = 0; hour < 24; hour++) {
      const slotId = this.getSlotId(targetDayIndex, hour);
      const copiedAssignments = this.copiedDay.assignments.get(hour);
      
      if (copiedAssignments && copiedAssignments.length > 0) {
        this.assignments.set(slotId, JSON.parse(JSON.stringify(copiedAssignments))); // Deep copy
      } else {
        this.assignments.delete(slotId); // Clear if no assignments in copied day
      }
    }
    
    if (!skipHistory) {
      this.rerenderGrid();
      this.updateUndoRedoButtons();
    }
  }
  
  pasteToWeekdays() {
    if (this.copiedDay === null) {
      window.showError('No day copied. Please copy a day first.');
      return;
    }
    
    this.saveToHistory();
    // Weekdays are Monday (1) through Friday (5)
    for (let day = 1; day <= 5; day++) {
      this.pasteToDay(day, true); // Skip history for individual days
    }
    this.rerenderGrid();
    window.showSuccess('Pasted to weekdays (Mon-Fri)');
    this.updateUndoRedoButtons();
  }
  
  pasteToWeekend() {
    if (this.copiedDay === null) {
      window.showError('No day copied. Please copy a day first.');
      return;
    }
    
    this.saveToHistory();
    // Weekend is Saturday (6) and Sunday (0)
    this.pasteToDay(0, true); // Sunday
    this.pasteToDay(6, true); // Saturday
    this.rerenderGrid();
    window.showSuccess('Pasted to weekend (Sat-Sun)');
    this.updateUndoRedoButtons();
  }
  
  pasteToAll() {
    if (this.copiedDay === null) {
      window.showError('No day copied. Please copy a day first.');
      return;
    }
    
    this.saveToHistory();
    // Paste to all 7 days
    for (let day = 0; day < 7; day++) {
      this.pasteToDay(day, true); // Skip history for individual days
    }
    this.rerenderGrid();
    window.showSuccess('Pasted to all days');
    this.updateUndoRedoButtons();
  }
  
  updatePasteButtons() {
    // Update paste button states based on whether a day is copied
    const pasteButtons = document.querySelectorAll('[onclick*="pasteTo"]');
    pasteButtons.forEach(btn => {
      if (this.copiedDay === null) {
        btn.disabled = true;
      } else {
        btn.disabled = false;
      }
    });
  }
  
  // ============================================
  // Bulk Operations
  // ============================================
  
  fillDayPrompt() {
    const dayIndex = prompt('Enter day index (0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat):');
    if (dayIndex === null) return;
    
    const dayNum = parseInt(dayIndex);
    if (isNaN(dayNum) || dayNum < 0 || dayNum > 6) {
      window.showError('Invalid day index. Please enter 0-6.');
      return;
    }
    
    if (!this.currentOfferPosition) {
      window.showError('Please select an offer position first');
      return;
    }
    
    this.fillDay(dayNum, this.currentOfferPosition, this.currentWeight);
  }
  
  fillAllEmptySlots() {
    if (!this.currentOfferPosition) {
      const showErrorFn = window.showError || alert;
      showErrorFn('Please select an offer position first');
      return;
    }
    
    if (!confirm(`Fill all empty slots with Offer Position ${this.currentOfferPosition}?`)) {
      return;
    }
    
    this.saveToHistory(); // Save state before assignment
    
    const days = 7; // Sun-Sat
    const hours = 24; // 0-23
    let filledCount = 0;
    
    // Iterate through all slots
    for (let dayIndex = 0; dayIndex < days; dayIndex++) {
      for (let hour = 0; hour < hours; hour++) {
        const slotId = this.getSlotId(dayIndex, hour);
        
        // Check if slot is empty (no assignment or empty array)
        const assignments = this.assignments.get(slotId);
        const isEmpty = !assignments || assignments.length === 0;
        
        if (isEmpty) {
          // Initialize slot if needed
          if (!this.assignments.has(slotId)) {
            this.assignments.set(slotId, []);
          }
          
          // Add assignment
          this.assignments.get(slotId).push({
            ruleId: null, // Will be created when saving
            offer_position: this.currentOfferPosition,
            weight: this.currentWeight
          });
          
          filledCount++;
        }
      }
    }
    
    if (filledCount === 0) {
      const showInfoFn = window.showInfo || alert;
      showInfoFn('No empty slots found. All slots already have assignments.');
      return;
    }
    
    this.rerenderGrid();
    this.updateUndoRedoButtons();
    
    const showSuccessFn = window.showSuccess || alert;
    showSuccessFn(`Filled ${filledCount} empty slot${filledCount === 1 ? '' : 's'} with Offer Position ${this.currentOfferPosition}`);
  }
  
  fillDay(dayIndex, offerPosition, weight = 100) {
    this.saveToHistory();
    
    // Fill all 24 hours of the day with the specified offer position
    for (let hour = 0; hour < 24; hour++) {
      const slotId = this.getSlotId(dayIndex, hour);
      this.assignments.set(slotId, [{
        ruleId: null,
        offer_position: offerPosition,
        weight: weight
      }]);
    }
    
    this.rerenderGrid();
    const dayName = this.days[dayIndex];
    window.showSuccess(`Filled ${dayName} with selected offer`);
    this.updateUndoRedoButtons();
  }
  
  clearDayPrompt() {
    const dayIndex = prompt('Enter day index to clear (0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat):');
    if (dayIndex === null) return;
    
    const dayNum = parseInt(dayIndex);
    if (isNaN(dayNum) || dayNum < 0 || dayNum > 6) {
      window.showError('Invalid day index. Please enter 0-6.');
      return;
    }
    
    if (!confirm(`Clear all assignments for ${this.days[dayNum]}?`)) return;
    
    this.clearDay(dayNum);
  }
  
  clearDay(dayIndex) {
    this.saveToHistory();
    
    // Clear all 24 hours of the day
    for (let hour = 0; hour < 24; hour++) {
      const slotId = this.getSlotId(dayIndex, hour);
      this.assignments.delete(slotId);
    }
    
    this.rerenderGrid();
    const dayName = this.days[dayIndex];
    window.showSuccess(`Cleared ${dayName}`);
    this.updateUndoRedoButtons();
  }
  
  clearAll() {
    if (!confirm('Clear all schedule assignments? This cannot be undone.')) return;
    
    this.saveToHistory();
    this.assignments.clear();
    this.rerenderGrid();
    window.showSuccess('Cleared all schedule assignments');
    this.updateUndoRedoButtons();
  }
  
  // ============================================
  // Undo/Redo
  // ============================================
  
  saveToHistory() {
    // Save current state to history
    const state = this.serializeState();
    
    // Remove any states after current index (when undoing and then making new changes)
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }
    
    this.history.push(state);
    this.historyIndex = this.history.length - 1;
    
    // Limit history size to prevent memory issues (keep last 50 states)
    if (this.history.length > 50) {
      this.history = this.history.slice(-50);
      this.historyIndex = this.history.length - 1;
    }
  }
  
  serializeState() {
    // Serialize assignments map to a plain object
    const assignmentsObj = {};
    this.assignments.forEach((value, key) => {
      assignmentsObj[key] = JSON.parse(JSON.stringify(value));
    });
    return { assignments: assignmentsObj };
  }
  
  restoreState(state) {
    // Restore assignments from serialized state
    this.assignments.clear();
    Object.entries(state.assignments).forEach(([slotId, assignments]) => {
      this.assignments.set(slotId, JSON.parse(JSON.stringify(assignments)));
    });
    this.rerenderGrid();
  }
  
  undo() {
    if (this.historyIndex <= 0) {
      window.showError('Nothing to undo');
      return;
    }
    
    this.historyIndex--;
    const state = this.history[this.historyIndex];
    this.restoreState(state);
    this.updateUndoRedoButtons();
  }
  
  redo() {
    if (this.historyIndex >= this.history.length - 1) {
      window.showError('Nothing to redo');
      return;
    }
    
    this.historyIndex++;
    const state = this.history[this.historyIndex];
    this.restoreState(state);
    this.updateUndoRedoButtons();
  }
  
  updateUndoRedoButtons() {
    // Update undo/redo button states
    const undoBtn = document.querySelector('[onclick*="undo()"]');
    const redoBtn = document.querySelector('[onclick*="redo()"]');
    
    if (undoBtn) {
      undoBtn.disabled = this.historyIndex <= 0;
    }
    if (redoBtn) {
      redoBtn.disabled = this.historyIndex >= this.history.length - 1;
    }
  }
  
  rerenderGrid() {
    // Update slot colors - always ensure slots with assignments have correct colors
    const slots = document.querySelectorAll('.schedule-slot');
    let slotsWithColors = 0;
    let slotsWithoutColors = 0;
    let slotsWithAssignmentsButNoColor = 0;
    
    slots.forEach(slot => {
      const slotId = slot.dataset.slotId;
      if (!slotId) {
        console.warn('rerenderGrid: Slot missing slotId:', slot);
        return;
      }
      
      const assignments = this.assignments.get(slotId);
      const color = this.getSlotColor(slotId);
      
      // Check if it's a gradient (multiple offers) or solid color
      const isGradient = color && color.includes('linear-gradient');
      const hasAssignment = color !== null;
      
      if (hasAssignment) {
        slotsWithColors++;
        slot.classList.add('assigned');
        
        // Always set the color - don't try to optimize by checking if it changed
        // This ensures colors are never lost
        if (isGradient) {
          // For gradients, use background property and clear background-color
          slot.style.removeProperty('background-color');
          slot.style.setProperty('background', color, 'important');
          slot.classList.add('multi-offer');
        } else {
          // For solid colors, use background-color and explicitly clear background
          // to override the CSS rule that sets background: #ffffff
          slot.style.setProperty('background', 'none', 'important');
          slot.style.setProperty('background-color', color, 'important');
          slot.classList.remove('multi-offer');
        }
      } else {
        // Only clear if there really are no assignments
        if (!assignments || assignments.length === 0) {
          slotsWithoutColors++;
          // Clear both properties and set white
          slot.style.removeProperty('background');
          slot.style.setProperty('background-color', '#ffffff', 'important');
          slot.classList.remove('assigned');
          slot.classList.remove('multi-offer');
        } else {
          // Has assignments but color is null - this is a bug, try to fix it
          slotsWithAssignmentsButNoColor++;
          console.error('rerenderGrid: Slot', slotId, 'has assignments but color is null!', {
            assignments,
            offerPositionColorMapSize: this.offerPositionColorMap.size,
            positions: assignments.map(a => a.offer_position),
            colorsInMap: assignments.map(a => this.offerPositionColorMap.has(a.offer_position || 1))
          });
          
          // Try to force color assignment for all offer positions in this slot
          assignments.forEach(ass => {
            const position = ass.offer_position || 1;
            if (!this.offerPositionColorMap.has(position)) {
              this.offerPositionColorMap.set(position, OFFER_COLORS[(position - 1) % OFFER_COLORS.length]);
              console.log('rerenderGrid: Added missing color for position', position);
            }
          });
          
          // Try again to get color
          const retryColor = this.getSlotColor(slotId);
          if (retryColor) {
            slotsWithColors++;
            slotsWithAssignmentsButNoColor--;
            slot.classList.add('assigned');
            // Clear both properties first
            slot.style.removeProperty('background');
            slot.style.removeProperty('background-color');
            if (retryColor.includes('linear-gradient')) {
              slot.style.setProperty('background', retryColor, 'important');
              slot.classList.add('multi-offer');
            } else {
              slot.style.setProperty('background-color', retryColor, 'important');
              slot.classList.remove('multi-offer');
            }
          } else {
            // Still no color - this is a serious bug
            console.error('rerenderGrid: Still no color after retry for slot', slotId);
          }
        }
      }
      
      // Update tooltip
      const tooltip = slot.querySelector('.schedule-slot-tooltip');
      if (tooltip) {
        tooltip.textContent = this.getSlotTooltip(slotId);
      }
    });
    
    console.log('rerenderGrid: Updated', slots.length, 'slots -', slotsWithColors, 'with colors,', slotsWithoutColors, 'without,', slotsWithAssignmentsButNoColor, 'with assignments but no color');
  }
  
  async save() {
    // Convert assignments to time rules
    // Group consecutive slots with same offer/weight into ranges
    
    const rulesToCreate = [];
    const rulesToDelete = new Set(this.timeRules.map(r => r.id));
    
    console.log('Save: Total assignments to process:', Array.from(this.assignments.entries()).length);
    console.log('Save: Rules to delete:', rulesToDelete.size);
    
    // Group assignments by offer position and weight
    // Use '::' as separator
    const assignmentGroups = new Map();
    
    this.assignments.forEach((slotAssignments, slotId) => {
      if (!slotAssignments || slotAssignments.length === 0) {
        return; // Skip empty assignments
      }
      
      slotAssignments.forEach(ass => {
        const position = ass.offer_position || 1;
        const key = `${position}::${ass.weight}`;
        if (!assignmentGroups.has(key)) {
          assignmentGroups.set(key, []);
        }
        assignmentGroups.get(key).push(slotId);
      });
    });
    
    console.log('Save: Assignment groups:', assignmentGroups.size);
    
    // Log each assignment group
    assignmentGroups.forEach((slots, key) => {
      const [position, weight] = key.split('::');
      console.log(`Save: Group ${key} has ${slots.length} slots:`, slots.slice(0, 10), slots.length > 10 ? '...' : '');
    });
    
    // Convert slot groups to time rules
    assignmentGroups.forEach((slots, key) => {
      const [position, weight] = key.split('::');
      
      if (!slots || slots.length === 0) {
        console.warn('Save: Empty slot group for key:', key);
        return;
      }
      
      // Group consecutive slots
      const ranges = this.groupConsecutiveSlots(slots);
      
      console.log(`Save: Position ${position}, weight ${weight}, slots: ${slots.length}, ranges: ${ranges.length}`);
      
      ranges.forEach(range => {
        const rule = {
          offer_position: parseInt(position),
          weight: parseInt(weight),
          day_of_week: range.day,
          start_time: `${range.startHour.toString().padStart(2, '0')}:00`,
          end_time: `${range.endHour.toString().padStart(2, '0')}:00`,
          rule_type: 'range'
        };
        console.log('Save: Creating rule:', rule);
        rulesToCreate.push(rule);
      });
    });
    
    console.log('Save: Total rules to create:', rulesToCreate.length);
    console.log('Save: Rules to delete:', Array.from(rulesToDelete));
    
    // Verify we're not losing any assignments
    const totalAssignmentsBeforeSave = Array.from(this.assignments.values()).reduce((sum, arr) => sum + arr.length, 0);
    const totalSlotsWithAssignments = this.assignments.size;
    console.log('Save: Verification - Total assignments in memory:', totalAssignmentsBeforeSave, 'across', totalSlotsWithAssignments, 'slots');
    
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
      // Remove duplicates and sort
      const uniqueHours = Array.from(new Set(hours)).sort((a, b) => a - b);
      
      if (uniqueHours.length === 0) {
        return; // Skip empty days
      }
      
      let rangeStart = uniqueHours[0];
      let rangeEnd = uniqueHours[0] + 1;
      
      for (let i = 1; i < uniqueHours.length; i++) {
        if (uniqueHours[i] === rangeEnd) {
          rangeEnd = uniqueHours[i] + 1;
        } else {
          ranges.push({ day, startHour: rangeStart, endHour: rangeEnd });
          rangeStart = uniqueHours[i];
          rangeEnd = uniqueHours[i] + 1;
        }
      }
      // Always push the final range (handles single slots too)
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

