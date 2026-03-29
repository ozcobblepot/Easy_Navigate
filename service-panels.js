function toggleDropdown(id, event) {
    if (event) event.stopPropagation();
    const menu = document.getElementById(id);
    if (!menu) return;
    const isOpen = menu.classList.contains('open');
    document.querySelectorAll('.dropdown-menu.open').forEach((item) => item.classList.remove('open'));
    if (!isOpen) menu.classList.add('open');
}

function getTodayDateString() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function replayPickerAnimation(element) {
    if (!element) return;
    element.classList.remove('picker-anim');
    void element.offsetWidth;
    element.classList.add('picker-anim');
    window.setTimeout(() => {
        element.classList.remove('picker-anim');
    }, 220);
}

function initDatePickers() {
    const dateInputs = document.querySelectorAll('input[type="date"].date-picker');
    const today = getTodayDateString();

    dateInputs.forEach((input) => {
        if (!input.value) input.value = today;

        if (window.flatpickr) {
            flatpickr(input, {
                dateFormat: 'Y-m-d',
                altInput: true,
                altFormat: 'D, M j',
                defaultDate: input.value,
                showMonths: 2,
                monthSelectorType: 'static',
                animate: false,
                disableMobile: true,
                position: 'below center',
                onReady: (_, __, fp) => {
                    fp.set('positionElement', fp.altInput || input);
                },
                onOpen: (_, __, fp) => {
                    fp.set('positionElement', fp.altInput || input);
                    fp.calendarContainer.style.marginTop = '8px';
                    replayPickerAnimation(fp.calendarContainer);
                },
                onClose: (_, __, fp) => {
                    fp.calendarContainer.style.marginTop = '';
                }
            });
        }
    });
}

function formatTimeLabel(timeValue) {
    if (!timeValue) return '';
    const [hourRaw, minuteRaw] = timeValue.split(':');
    const hour = Number(hourRaw);
    const minute = Number(minuteRaw);
    if (Number.isNaN(hour) || Number.isNaN(minute)) return '';
    const suffix = hour >= 12 ? 'PM' : 'AM';
    const hour12 = ((hour + 11) % 12) + 1;
    return `${hour12}:${String(minute).padStart(2, '0')} ${suffix}`;
}

let activeTimeInput = null;
let timeModalState = { hour: 10, minute: 0, period: 'AM' };

function ensureTimeModalElements() {
    if (document.getElementById('timeDropdownModal')) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'time-dropdown-modal';
    wrapper.id = 'timeDropdownModal';
    wrapper.setAttribute('aria-hidden', 'true');
    wrapper.innerHTML = `
        <div class="time-dropdown-panel" id="timeDropdownPanel" role="dialog" aria-modal="true" aria-label="Select time">
            <div class="time-modal-title">Enter Time</div>
            <div class="time-modal-body">
                <div class="time-value-row">
                    <input id="timeModalHour" class="time-number hour" type="text" maxlength="2" inputmode="numeric" aria-label="Hour">
                    <span class="time-colon">:</span>
                    <input id="timeModalMinute" class="time-number minute" type="text" maxlength="2" inputmode="numeric" aria-label="Minute">
                    <div class="time-period" role="group" aria-label="AM PM">
                        <button type="button" id="timePeriodAm" class="time-period-btn">AM</button>
                        <button type="button" id="timePeriodPm" class="time-period-btn">PM</button>
                    </div>
                </div>
                <div class="time-label-row">
                    <span>Hour</span>
                    <span style="width:22px"></span>
                    <span>Minute</span>
                    <span style="width:66px"></span>
                </div>
            </div>
            <div class="time-modal-footer">
                <button type="button" class="time-now" id="timeNowBtn" aria-label="Set current time"><i class="far fa-clock"></i></button>
                <div class="time-actions">
                    <button type="button" class="time-action-btn" id="timeCancelBtn">Cancel</button>
                    <button type="button" class="time-action-btn" id="timeOkBtn">Ok</button>
                </div>
            </div>
        </div>`;

    document.body.appendChild(wrapper);
}

function normalizeModalFields() {
    const hourInput = document.getElementById('timeModalHour');
    const minuteInput = document.getElementById('timeModalMinute');
    if (!hourInput || !minuteInput) return;

    const rawHour = Number(hourInput.value.replace(/\D/g, ''));
    const rawMinute = Number(minuteInput.value.replace(/\D/g, ''));

    let hour = Number.isNaN(rawHour) ? timeModalState.hour : rawHour;
    let minute = Number.isNaN(rawMinute) ? timeModalState.minute : rawMinute;

    if (hour < 1) hour = 1;
    if (hour > 12) hour = 12;
    if (minute < 0) minute = 0;
    if (minute > 59) minute = 59;

    timeModalState.hour = hour;
    timeModalState.minute = minute;

    hourInput.value = String(hour).padStart(2, '0');
    minuteInput.value = String(minute).padStart(2, '0');
}

function refreshTimeModalUi() {
    const hourInput = document.getElementById('timeModalHour');
    const minuteInput = document.getElementById('timeModalMinute');
    const amBtn = document.getElementById('timePeriodAm');
    const pmBtn = document.getElementById('timePeriodPm');
    if (!hourInput || !minuteInput || !amBtn || !pmBtn) return;

    hourInput.value = String(timeModalState.hour).padStart(2, '0');
    minuteInput.value = String(timeModalState.minute).padStart(2, '0');
    amBtn.classList.toggle('active', timeModalState.period === 'AM');
    pmBtn.classList.toggle('active', timeModalState.period === 'PM');
}

function parseTimeForModal(time24) {
    const safe = /^\d{2}:\d{2}$/.test(time24) ? time24 : '10:00';
    const [hoursText, minutesText] = safe.split(':');
    const hours24 = Number(hoursText);
    const minutes = Number(minutesText);
    const period = hours24 >= 12 ? 'PM' : 'AM';
    const hour12 = ((hours24 + 11) % 12) + 1;

    timeModalState = {
        hour: hour12,
        minute: Number.isNaN(minutes) ? 0 : minutes,
        period
    };
}

function getTime24FromModal() {
    let hour = timeModalState.hour;
    if (timeModalState.period === 'AM') {
        if (hour === 12) hour = 0;
    } else if (hour !== 12) {
        hour += 12;
    }

    return `${String(hour).padStart(2, '0')}:${String(timeModalState.minute).padStart(2, '0')}`;
}

function positionCustomTimeDropdown(input) {
    const panel = document.getElementById('timeDropdownPanel');
    if (!panel || !input) return;

    const rect = input.getBoundingClientRect();
    const panelWidth = Math.min(240, window.innerWidth - 24);
    const panelHeight = panel.offsetHeight || 290;
    const gap = 8;

    const anchorCenterX = rect.left + (rect.width / 2);
    const left = Math.max(12, Math.min(anchorCenterX - (panelWidth / 2), window.innerWidth - panelWidth - 12));
    let top = rect.bottom + gap;
    let opensAbove = false;

    if (top + panelHeight > window.innerHeight - 12) {
        top = Math.max(12, rect.top - panelHeight - gap);
        opensAbove = true;
    }

    const arrowInset = Math.max(18, Math.min(anchorCenterX - left, panelWidth - 18));

    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
    panel.style.setProperty('--arrow-x', `${arrowInset}px`);
    panel.classList.toggle('opens-above', opensAbove);
}

function openCustomTimeDropdown(input) {
    const modal = document.getElementById('timeDropdownModal');
    const panel = document.getElementById('timeDropdownPanel');
    const hourInput = document.getElementById('timeModalHour');
    if (!modal || !panel || !input) return;

    activeTimeInput = input;
    parseTimeForModal(input.dataset.time24 || '10:00');
    refreshTimeModalUi();

    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    positionCustomTimeDropdown(input);
    replayPickerAnimation(panel);
    if (hourInput) {
        hourInput.classList.add('active');
        hourInput.focus();
    }
}

function closeCustomTimeDropdown() {
    const modal = document.getElementById('timeDropdownModal');
    if (!modal) return;
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    activeTimeInput = null;
}

function applyTimeFromModal() {
    if (!activeTimeInput) return;

    normalizeModalFields();
    const time24 = getTime24FromModal();
    activeTimeInput.dataset.time24 = time24;
    activeTimeInput.value = formatTimeLabel(time24);
    activeTimeInput.dispatchEvent(new Event('input', { bubbles: true }));
    activeTimeInput.dispatchEvent(new Event('change', { bubbles: true }));
    closeCustomTimeDropdown();
}

function setModalTimeNow() {
    const now = new Date();
    const hour24 = now.getHours();
    const minute = now.getMinutes();
    const period = hour24 >= 12 ? 'PM' : 'AM';
    const hour12 = ((hour24 + 11) % 12) + 1;
    timeModalState = { hour: hour12, minute, period };
    refreshTimeModalUi();
}

function initTimeModalHandlers() {
    ensureTimeModalElements();

    const modal = document.getElementById('timeDropdownModal');
    const panel = document.getElementById('timeDropdownPanel');
    const hourInput = document.getElementById('timeModalHour');
    const minuteInput = document.getElementById('timeModalMinute');
    const amBtn = document.getElementById('timePeriodAm');
    const pmBtn = document.getElementById('timePeriodPm');
    const nowBtn = document.getElementById('timeNowBtn');
    const cancelBtn = document.getElementById('timeCancelBtn');
    const okBtn = document.getElementById('timeOkBtn');

    if (!modal || !panel || !hourInput || !minuteInput || !amBtn || !pmBtn || !nowBtn || !cancelBtn || !okBtn) return;

    const setActiveTimeField = (field) => {
        const isHour = field === 'hour';
        hourInput.classList.toggle('active', isHour);
        minuteInput.classList.toggle('active', !isHour);
    };

    const keepNumbers = (input) => {
        input.value = input.value.replace(/\D/g, '').slice(0, 2);
    };

    hourInput.addEventListener('input', () => keepNumbers(hourInput));
    minuteInput.addEventListener('input', () => keepNumbers(minuteInput));

    hourInput.addEventListener('focus', () => setActiveTimeField('hour'));
    hourInput.addEventListener('click', () => setActiveTimeField('hour'));
    minuteInput.addEventListener('focus', () => setActiveTimeField('minute'));
    minuteInput.addEventListener('click', () => setActiveTimeField('minute'));

    hourInput.addEventListener('blur', normalizeModalFields);
    minuteInput.addEventListener('blur', normalizeModalFields);

    amBtn.addEventListener('click', () => {
        timeModalState.period = 'AM';
        refreshTimeModalUi();
    });

    pmBtn.addEventListener('click', () => {
        timeModalState.period = 'PM';
        refreshTimeModalUi();
    });

    nowBtn.addEventListener('click', () => setModalTimeNow());
    cancelBtn.addEventListener('click', () => closeCustomTimeDropdown());
    okBtn.addEventListener('click', () => applyTimeFromModal());

    panel.addEventListener('click', (event) => event.stopPropagation());
    modal.addEventListener('click', (event) => {
        if (!event.target.closest('.time-dropdown-panel')) closeCustomTimeDropdown();
    });

    window.addEventListener('resize', () => {
        if (activeTimeInput) positionCustomTimeDropdown(activeTimeInput);
    });

    window.addEventListener('scroll', () => {
        if (activeTimeInput) positionCustomTimeDropdown(activeTimeInput);
    }, true);
}

function initTimeDisplays() {
    const timeInputs = document.querySelectorAll('input.time-picker');

    timeInputs.forEach((input) => {
        const initialTime = /^\d{2}:\d{2}$/.test(input.value) ? input.value : '10:00';
        input.dataset.time24 = initialTime;
        input.value = formatTimeLabel(initialTime);
        input.setAttribute('readonly', 'readonly');
        input.setAttribute('inputmode', 'none');

        input.addEventListener('click', (event) => {
            event.preventDefault();
            openCustomTimeDropdown(input);
        });

        input.addEventListener('focus', () => {
            openCustomTimeDropdown(input);
        });

        input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                openCustomTimeDropdown(input);
            }
            if (event.key === 'Escape') {
                closeCustomTimeDropdown();
            }
        });
    });
}

function selectFindBooking(tabName) {
    const menu = document.getElementById('findBookingsMenu');
    if (menu) menu.classList.remove('open');

    const bookingPages = {
        hotel: 'hotel & homes.html',
        car: 'car-rental.html',
        flights: 'flights.html',
        attractions: 'attractions.html',
        taxi: 'airport-taxis.html'
    };

    const targetPage = bookingPages[tabName];
    if (targetPage) window.location.href = targetPage;
}

function toggleCheck(label) {
    const box = label.querySelector('.custom-checkbox');
    if (!box) return;
    box.classList.toggle('checked');
}

function swapFlight() {
    const from = document.getElementById('fl-from');
    const to = document.getElementById('fl-to');
    if (!from || !to) return;
    const tempValue = from.value;
    from.value = to.value;
    to.value = tempValue;
    const tempPlaceholder = from.placeholder;
    from.placeholder = to.placeholder;
    to.placeholder = tempPlaceholder;
}

function updateMinusBtnState(btnId, isAtMin) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    if (isAtMin) {
        btn.style.color = 'var(--gray-300, #c8cee0)';
        btn.style.cursor = 'default';
    } else {
        btn.style.color = '';
        btn.style.cursor = 'pointer';
    }
}

let carDriverAge = 18;
let pax = { adults: 1, children: 0, infants: 0 };
let attractionPax = { adults: 1, children: 0, infants: 0 };
let taxiPax = { adults: 1, children: 0, infants: 0 };
let hotelOccupancy = { adults: 2, children: 0, infants: 0, rooms: 1 };

const defaultHotelCities = [
    'Baguio',
    'Cebu City',
    'Clark',
    'Davao City',
    'Manila',
    'Pasay'
];

let hotelDestinationCities = [...defaultHotelCities];

function getApiUrl(pathWithFile) {
    if (window.location.protocol === 'file:') {
        return `http://localhost/platform-technologies-proj-v1-main/api/${pathWithFile}`;
    }

    return `api/${pathWithFile}`;
}

function normalizeCityList(cities) {
    if (!Array.isArray(cities)) return [];

    const unique = new Set();
    cities.forEach((city) => {
        const normalized = String(city || '').trim();
        if (normalized) unique.add(normalized);
    });

    return Array.from(unique).sort((a, b) => a.localeCompare(b));
}

async function loadHotelCitiesFromApi() {
    try {
        const response = await fetch(getApiUrl('get_hotels.php'), {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) return;

        const result = await response.json();
        if (!result || result.ok !== true || !Array.isArray(result.cities)) return;

        const normalized = normalizeCityList(result.cities);
        if (normalized.length > 0) {
            hotelDestinationCities = normalized;
        }
    } catch (error) {
        // Keep fallback city list if API is unavailable
    }
}

function renderHotelDestinationOptions(filterValue) {
    const menu = document.getElementById('hotelDestinationMenu');
    if (!menu) return;

    const keyword = String(filterValue || '').trim().toLowerCase();
    const filteredCities = hotelDestinationCities.filter((city) => city.toLowerCase().includes(keyword));

    if (filteredCities.length === 0) {
        menu.innerHTML = `
            <div class="destination-menu-title">Popular Destinations</div>
            <div class="destination-empty">No matching city found</div>
        `;
        return;
    }

    const cityButtons = filteredCities
        .map((city) => `<button type="button" class="destination-city-item" data-city="${city}">${city}</button>`)
        .join('');

    menu.innerHTML = `
        <div class="destination-menu-title">Popular Destinations</div>
        <div class="destination-grid">${cityButtons}</div>
    `;
}

function openHotelDestinationMenu() {
    const menu = document.getElementById('hotelDestinationMenu');
    if (!menu) return;
    menu.classList.add('open');
}

function closeHotelDestinationMenu() {
    const menu = document.getElementById('hotelDestinationMenu');
    if (!menu) return;
    menu.classList.remove('open');
}

function initHotelDestinationPicker() {
    const input = document.getElementById('hotelDestinationInput');
    const menu = document.getElementById('hotelDestinationMenu');
    if (!input || !menu) return;

    renderHotelDestinationOptions('');

    loadHotelCitiesFromApi().then(() => {
        renderHotelDestinationOptions(input.value || '');
    });

    input.addEventListener('click', (event) => {
        event.stopPropagation();
        renderHotelDestinationOptions(input.value || '');
        openHotelDestinationMenu();
    });

    input.addEventListener('focus', () => {
        renderHotelDestinationOptions(input.value || '');
        openHotelDestinationMenu();
    });

    input.addEventListener('input', (event) => {
        event.stopPropagation();
        renderHotelDestinationOptions(input.value || '');
        openHotelDestinationMenu();
    });

    input.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeHotelDestinationMenu();
        }
    });

    menu.addEventListener('mousedown', (event) => {
        event.preventDefault();
    });

    menu.addEventListener('click', (event) => {
        event.stopPropagation();
        const option = event.target.closest('[data-city]');
        if (!option) return;

        input.value = option.dataset.city || '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        closeHotelDestinationMenu();
    });
}

function updateCarDriverAge(change) {
    carDriverAge += change;
    if (carDriverAge < 18) carDriverAge = 18;
    if (carDriverAge > 99) carDriverAge = 99;

    const label = document.getElementById('carAgeLabel');
    const value = document.getElementById('carAgeValue');
    if (label) {
        label.textContent = carDriverAge + ' years old';
        label.title = carDriverAge + ' years old';
    }
    if (value) value.textContent = carDriverAge;

    updateMinusBtnState('carAgeMinus', carDriverAge <= 18);
}

function updateHotelOccupancy(type, change) {
    if (!(type in hotelOccupancy)) return;

    hotelOccupancy[type] += change;

    if (type === 'adults' && hotelOccupancy.adults < 1) hotelOccupancy.adults = 1;
    if (type === 'children' && hotelOccupancy.children < 0) hotelOccupancy.children = 0;
    if (type === 'infants' && hotelOccupancy.infants < 0) hotelOccupancy.infants = 0;
    if (type === 'rooms' && hotelOccupancy.rooms < 1) hotelOccupancy.rooms = 1;
    if (hotelOccupancy[type] > 30) hotelOccupancy[type] = 30;

    const adults = document.getElementById('hotelAdults');
    const children = document.getElementById('hotelChildren');
    const infants = document.getElementById('hotelInfants');
    const rooms = document.getElementById('hotelRooms');
    if (adults) adults.textContent = hotelOccupancy.adults;
    if (children) children.textContent = hotelOccupancy.children;
    if (infants) infants.textContent = hotelOccupancy.infants;
    if (rooms) rooms.textContent = hotelOccupancy.rooms;

    updateMinusBtnState('hotelAdultsMinus', hotelOccupancy.adults <= 1);
    updateMinusBtnState('hotelChildrenMinus', hotelOccupancy.children <= 0);
    updateMinusBtnState('hotelInfantsMinus', hotelOccupancy.infants <= 0);
    updateMinusBtnState('hotelRoomsMinus', hotelOccupancy.rooms <= 1);

    const guestParts = [];
    guestParts.push(hotelOccupancy.adults + ' Adult' + (hotelOccupancy.adults > 1 ? 's' : ''));
    if (hotelOccupancy.children > 0) guestParts.push(hotelOccupancy.children + ' Child' + (hotelOccupancy.children > 1 ? 'ren' : ''));
    if (hotelOccupancy.infants > 0) guestParts.push(hotelOccupancy.infants + ' Infant' + (hotelOccupancy.infants > 1 ? 's' : ''));

    const guestText = guestParts.join(' + ');
    const roomText = hotelOccupancy.rooms + ' Room' + (hotelOccupancy.rooms > 1 ? 's' : '');

    const guestLabel = document.getElementById('hotelGuestsLabel');
    const roomLabel = document.getElementById('hotelRoomsLabel');

    if (guestLabel) {
        guestLabel.textContent = guestText;
        guestLabel.title = guestParts.join(', ');
    }
    if (roomLabel) roomLabel.textContent = roomText;
}

function updatePax(type, change) {
    if (!(type in pax)) return;

    pax[type] += change;
    if (type === 'adults' && pax.adults < 1) pax.adults = 1;
    if (type === 'children' && pax.children < 0) pax.children = 0;
    if (type === 'infants' && pax.infants < 0) pax.infants = 0;
    if (pax[type] > 9) pax[type] = 9;

    const adults = document.getElementById('paxAdults');
    const children = document.getElementById('paxChildren');
    const infants = document.getElementById('paxInfants');
    if (adults) adults.textContent = pax.adults;
    if (children) children.textContent = pax.children;
    if (infants) infants.textContent = pax.infants;

    updateMinusBtnState('paxAdultsMinus', pax.adults <= 1);
    updateMinusBtnState('paxChildrenMinus', pax.children <= 0);
    updateMinusBtnState('paxInfantsMinus', pax.infants <= 0);

    const compactParts = [];
    compactParts.push(pax.adults + ' Adult' + (pax.adults > 1 ? 's' : ''));
    if (pax.children > 0) compactParts.push(pax.children + ' Child' + (pax.children > 1 ? 'ren' : ''));
    if (pax.infants > 0) compactParts.push(pax.infants + ' Infant' + (pax.infants > 1 ? 's' : ''));

    const label = document.getElementById('passengerLabel');
    if (label) {
        label.textContent = compactParts.join(' + ');
        label.title = compactParts.join(', ');
    }
}

function updateAttractionPax(type, change) {
    if (!(type in attractionPax)) return;

    attractionPax[type] += change;
    if (type === 'adults' && attractionPax.adults < 1) attractionPax.adults = 1;
    if (type === 'children' && attractionPax.children < 0) attractionPax.children = 0;
    if (type === 'infants' && attractionPax.infants < 0) attractionPax.infants = 0;
    if (attractionPax[type] > 9) attractionPax[type] = 9;

    const adults = document.getElementById('attractionsAdults');
    const children = document.getElementById('attractionsChildren');
    const infants = document.getElementById('attractionsInfants');
    if (adults) adults.textContent = attractionPax.adults;
    if (children) children.textContent = attractionPax.children;
    if (infants) infants.textContent = attractionPax.infants;

    updateMinusBtnState('attractionsAdultsMinus', attractionPax.adults <= 1);
    updateMinusBtnState('attractionsChildrenMinus', attractionPax.children <= 0);
    updateMinusBtnState('attractionsInfantsMinus', attractionPax.infants <= 0);

    const parts = [];
    parts.push(attractionPax.adults + ' Adult' + (attractionPax.adults > 1 ? 's' : ''));
    if (attractionPax.children > 0) parts.push(attractionPax.children + ' Child' + (attractionPax.children > 1 ? 'ren' : ''));
    if (attractionPax.infants > 0) parts.push(attractionPax.infants + ' Infant' + (attractionPax.infants > 1 ? 's' : ''));

    const label = document.getElementById('attractionsPassengerLabel');
    if (label) {
        label.textContent = parts.join(' + ');
        label.title = parts.join(', ');
    }
}

function updateTaxiPax(type, change) {
    if (!(type in taxiPax)) return;

    taxiPax[type] += change;
    if (type === 'adults' && taxiPax.adults < 1) taxiPax.adults = 1;
    if (type === 'children' && taxiPax.children < 0) taxiPax.children = 0;
    if (type === 'infants' && taxiPax.infants < 0) taxiPax.infants = 0;
    if (taxiPax[type] > 9) taxiPax[type] = 9;

    const adults = document.getElementById('taxiAdults');
    const children = document.getElementById('taxiChildren');
    const infants = document.getElementById('taxiInfants');
    if (adults) adults.textContent = taxiPax.adults;
    if (children) children.textContent = taxiPax.children;
    if (infants) infants.textContent = taxiPax.infants;

    updateMinusBtnState('taxiAdultsMinus', taxiPax.adults <= 1);
    updateMinusBtnState('taxiChildrenMinus', taxiPax.children <= 0);
    updateMinusBtnState('taxiInfantsMinus', taxiPax.infants <= 0);

    const parts = [];
    parts.push(taxiPax.adults + ' Adult' + (taxiPax.adults > 1 ? 's' : ''));
    if (taxiPax.children > 0) parts.push(taxiPax.children + ' Child' + (taxiPax.children > 1 ? 'ren' : ''));
    if (taxiPax.infants > 0) parts.push(taxiPax.infants + ' Infant' + (taxiPax.infants > 1 ? 's' : ''));

    const label = document.getElementById('taxiPassengerLabel');
    if (label) {
        label.textContent = parts.join(' + ');
        label.title = parts.join(', ');
    }
}

function selectCabin(type, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    const label = document.getElementById('cabinLabel');
    if (label) label.textContent = type;

    document.querySelectorAll('#cabinPicker .cabin-option-btn').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.cabin === type);
    });
}

document.addEventListener('click', (e) => {
    if (e && e.target && e.target.closest && e.target.closest('.dropdown-menu')) return;
    document.querySelectorAll('.dropdown-menu.open').forEach((menu) => menu.classList.remove('open'));
});

document.addEventListener('DOMContentLoaded', () => {
    initDatePickers();
    initTimeModalHandlers();
    initTimeDisplays();
    initHotelDestinationPicker();

    updateCarDriverAge(0);
    updatePax('adults', 0);
    updateAttractionPax('adults', 0);
    updateTaxiPax('adults', 0);
    updateHotelOccupancy('adults', 0);
});
