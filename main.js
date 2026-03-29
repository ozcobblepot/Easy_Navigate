// ── DATE FORMATTER (Sat, Feb 21) ──
function formatDateDisplay(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dayName = days[date.getDay()];
    const monthName = months[date.getMonth()];
    const dayNum = date.getDate();
    return `${dayName}, ${monthName} ${dayNum}`;
}

// Update custom date display
function updateDateDisplay(input) {
    const wrapper = input.closest('.date-input-wrapper');
    if (!wrapper) return;
    
    const display = wrapper.querySelector('.date-display');
    if (!display) return;
    
    if (input.value) {
        const formatted = formatDateDisplay(input.value);
        display.textContent = formatted;
        display.classList.add('has-date');
    } else {
        display.textContent = '';
        display.classList.remove('has-date');
    }
}

// Helper function to format date for input value (YYYY-MM-DD)
function getTodayDateString() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Initialize date pickers with custom display
document.addEventListener('DOMContentLoaded', function() {
    const dateInputs = document.querySelectorAll('input[type="date"], input[type="datetime-local"]');
    const today = getTodayDateString();
    
    dateInputs.forEach(input => {
        // Create wrapper if not exists
        let wrapper = input.closest('.date-input-wrapper');
        if (!wrapper) {
            wrapper = document.createElement('div');
            wrapper.className = 'date-input-wrapper';
            input.parentNode.insertBefore(wrapper, input);
            wrapper.appendChild(input);
            
            // Create display element
            const display = document.createElement('span');
            display.className = 'date-display';
            wrapper.appendChild(display);
        }
        
        // Set today's date if no value is set
        if (!input.value) {
            input.value = today;
        }
        
        // Update display on change
        input.addEventListener('change', function() {
            updateDateDisplay(this);
        });
        
        // Update display on input
        input.addEventListener('input', function() {
            updateDateDisplay(this);
        });
        
        // Set initial value and display
        updateDateDisplay(input);
    });
});

// ── FLIGHT FROM ↔ TO SWAP (flights panel only) ──
function swapFlight() {
    const from = document.getElementById('fl-from');
    const to   = document.getElementById('fl-to');
    if (!from || !to) return;
    const tmpVal = from.value; from.value = to.value; to.value = tmpVal;
    const tmpPH  = from.placeholder; from.placeholder = to.placeholder; to.placeholder = tmpPH;
}

// ── TAB SWITCHING ──
const tabPills = document.querySelectorAll('.tab-pill[data-tab]');
const panelMap = {
    hotel:       'panel-hotel',
    car:         'panel-car',
    flights:     'panel-flights',
    attractions: 'panel-attractions',
    taxi:        'panel-taxi'
};

tabPills.forEach(pill => {
    pill.addEventListener('click', () => {
        // Update active pill
        tabPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');

        // Show matching panel
        Object.values(panelMap).forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.remove('active');
        });
        const panelId = panelMap[pill.dataset.tab];
        if (panelId) document.getElementById(panelId)?.classList.add('active');
    });
});

// ── CUSTOM CHECKBOX TOGGLE ──
function toggleCheck(label) {
    const box = label.querySelector('.custom-checkbox');
    box.classList.toggle('checked');
}

// ── DROPDOWN OPEN / CLOSE ──
function toggleDropdown(id, event) {
    if (event) event.stopPropagation();
    const menu = document.getElementById(id);
    const isOpen = menu.classList.contains('open');
    document.querySelectorAll('.dropdown-menu.open').forEach(m => m.classList.remove('open'));
    if (!isOpen) menu.classList.add('open');
}

// Close dropdowns when clicking outside
document.addEventListener('click', () => {
    document.querySelectorAll('.dropdown-menu.open').forEach(m => m.classList.remove('open'));
});

// ── ADULT DROPDOWN FUNCTIONS ──
function selectAdult(count) {
    const display = document.getElementById('adultDisplay');
    const input = document.getElementById('adultInput');
    if (count === 10) {
        display.textContent = '10+ Adults';
    } else {
        display.textContent = count + ' Adult' + (count > 1 ? 's' : '');
    }
        input.value = 10;
    } else {
        display.textContent = count + ' Adult' + (count > 1 ? 's' : '');
        input.value = count;
    }
    // Close dropdown
    document.querySelectorAll('.dropdown-menu.open').forEach(m => m.classList.remove('open'));
}

function updateAdultFromInput(value) {
    const display = document.getElementById('adultDisplay');
    const count = parseInt(value);
    if (isNaN(count) || count < 1) {
        display.textContent = '1 Adult';
    } else if (count >= 10) {
        display.textContent = '10+ Adults';
    } else {
        display.textContent = count + ' Adult' + (count > 1 ? 's' : '');
    }
    } else {
        display.textContent = count + ' Adult' + (count > 1 ? 's' : '');
    }
}

// ── SWAP BUTTON (Flights: swap From ↔ To) ──
document.querySelectorAll('.swap-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const row = btn.closest('.search-row');
        const inputs = row.querySelectorAll('input');
        if (inputs.length >= 2) {
            const tmpVal = inputs[0].value;
            inputs[0].value = inputs[1].value;
            inputs[1].value = tmpVal;
            const tmpPH = inputs[0].placeholder;
            inputs[0].placeholder = inputs[1].placeholder;
            inputs[1].placeholder = tmpPH;
        }
    });
});

// ── FLIGHT FROM ↔ TO SWAP ──
function swapFlightOrigin() {
    const from = document.getElementById('flight-from');
    const to   = document.getElementById('flight-to');
    if (!from || !to) return;
    const tmpVal = from.value;
    from.value = to.value;
    to.value = tmpVal;
    const tmpPH = from.placeholder;
    from.placeholder = to.placeholder;
    to.placeholder = tmpPH;
}

// ── SEARCH BUTTON RIPPLE ──
document.querySelectorAll('.search-btn').forEach(btn => {
    btn.addEventListener('click', function (e) {
        const ripple = document.createElement('span');
        const rect = btn.getBoundingClientRect();
        ripple.style.cssText = `
            position: absolute;
            left: ${e.clientX - rect.left}px;
            top: ${e.clientY - rect.top}px;
            width: 0; height: 0;
            border-radius: 50%;
            background: rgba(255,255,255,0.35);
            transform: translate(-50%, -50%);
            animation: ripple 0.5s ease-out;
            pointer-events: none;
        `;
        btn.style.position = 'relative';
        btn.style.overflow = 'hidden';
        btn.appendChild(ripple);
        setTimeout(() => ripple.remove(), 500);
    });
});
