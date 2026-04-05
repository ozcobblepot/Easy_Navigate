(function () {

    // ── API URL BUILDER ───────────────────────────────────────────
    function getApiUrl(pathWithFile) {
        if (window.location.protocol === 'file:') {
            return `http://localhost/platform-technologies-proj-v1-main/api/${pathWithFile}`;
        }
        const href = window.location.href.split('?')[0];
        const base = href.substring(0, href.lastIndexOf('/') + 1);
        return base + 'api/' + pathWithFile;
    }

    // ── STATE ─────────────────────────────────────────────────────
    let allFlights      = [];
    let priceMin        = null;
    let priceMax        = null;
    let activeLabels    = new Set();

    // Fare modal state
    let modalFlight     = null;   // the flight object currently shown in modal
    let selectedTierIdx = 0;      // which fare tier card is selected (0 = cheapest)

    // ── HELPERS ───────────────────────────────────────────────────
    function escapeHtml(str) {
        return String(str || '')
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function formatPrice(p) {
        return '₱' + Number(p).toLocaleString('en-PH', { minimumFractionDigits: 0 });
    }

    function formatTime(t) {
        if (!t) return '--';
        const parts = t.split(':');
        let h = parseInt(parts[0]);
        const m = parts[1] || '00';
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = ((h + 11) % 12) + 1;
        return `${h}:${m} ${ampm}`;
    }

    /**
     * Combine a date string (YYYY-MM-DD or "Mon DD, YYYY") and a time string
     * (HH:MM or HH:MM:SS) into a full ISO datetime "YYYY-MM-DDTHH:MM:SS"
     * that the booking page can reliably parse.
     */
    function buildDatetime(dateStr, timeStr) {
        if (!dateStr && !timeStr) return '';

        // Normalise the date part to YYYY-MM-DD
        let datePart = '';
        if (dateStr) {
            // Already ISO? e.g. "2025-06-15"
            if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
                datePart = dateStr.substring(0, 10);
            } else {
                // Try to parse freeform strings like "Jun 15, 2025" or "June 15 2025"
                const d = new Date(dateStr);
                if (!isNaN(d.getTime())) {
                    datePart = d.toISOString().substring(0, 10);
                }
            }
        }

        // Normalise time to HH:MM:SS
        let timePart = '00:00:00';
        if (timeStr) {
            // Strip any trailing seconds already there, re-add cleanly
            const tp = timeStr.trim().split(':');
            const hh = (tp[0] || '00').padStart(2, '0');
            const mm = (tp[1] || '00').padStart(2, '0');
            const ss = (tp[2] || '00').padStart(2, '0');
            timePart = `${hh}:${mm}:${ss}`;
        }

        if (datePart) return `${datePart}T${timePart}`;

        // Fallback: no date available — return time only so the booking page
        // at least shows the time rather than "Not provided"
        return timePart;
    }

    function getLabels(f) {
        const labels = [];
        if (f.is_cheapest)     labels.push({ key: 'cheapest',    text: 'Cheapest',     cls: 'fl-badge--cheapest' });
        if (f.is_popular)      labels.push({ key: 'popular',     text: 'Popular',      cls: 'fl-badge--popular' });
        if (f.is_best_value)   labels.push({ key: 'best_value',  text: 'Best Value',   cls: 'fl-badge--bestvalue' });
        if (f.is_fastest)      labels.push({ key: 'fastest',     text: 'Fastest',      cls: 'fl-badge--fastest' });
        if (f.is_recommended)  labels.push({ key: 'recommended', text: 'Recommended',  cls: 'fl-badge--recommended' });
        if (f.is_limited_deal) labels.push({ key: 'limited',     text: 'Limited Deal', cls: 'fl-badge--limited' });
        if (f.is_included)     labels.push({ key: 'included',    text: 'Included',     cls: 'fl-badge--included' });
        return labels;
    }

    // ── FARE TIERS ────────────────────────────────────────────────
    function buildFareTiers(f) {
        const base = Number(f.price);
        return [
            {
                name:        'Economy class',
                subtitle:    'Regular Fare',
                bagCarry:    '1 piece',
                bagChecked:  null,
                refundable:  false,
                changeable:  false,
                miles:       true,
                ticketing:   'Within 3 hours after payment',
                price:       base,
                originalPrice: Math.round(base * 1.013),
                recommended: true,
            },
            {
                name:        'Economy class',
                subtitle:    'Regular Fare',
                bagCarry:    '1 piece',
                bagChecked:  '20 kg',
                refundable:  false,
                changeable:  false,
                miles:       true,
                ticketing:   'Within 3 hours after payment',
                price:       Math.round(base * 1.043),
                originalPrice: Math.round(base * 1.057),
                recommended: false,
            },
            {
                name:        'Economy class',
                subtitle:    'Regular Fare With Luggage 30',
                bagCarry:    '1 piece',
                bagChecked:  '30 kg',
                refundable:  false,
                changeable:  false,
                miles:       true,
                ticketing:   'Within 3 hours after payment',
                price:       Math.round(base * 1.089),
                originalPrice: Math.round(base * 1.103),
                recommended: false,
            },
        ];
    }

    // ── MODAL OPEN ────────────────────────────────────────────────
    function openFareModal(id) {
        const f = allFlights.find(x => x.id === id);
        if (!f) return;

        modalFlight     = f;
        selectedTierIdx = 0;

        const overlay = document.getElementById('flFareModalOverlay');
        if (!overlay) return;

        document.getElementById('flFareOriginName').textContent  = f.origin_name || f.origin || '';
        document.getElementById('flFareDestName').textContent    = f.destination_name || f.destination || '';

        const legsEl = document.getElementById('flFareLegs');
        const logoHtml = f.airline_logo
            ? `<img src="${escapeHtml(f.airline_logo)}" alt="${escapeHtml(f.airline_name)}" onerror="this.onerror=null;this.style.display='none';">`
            : `<span class="fl-fare-leg-logo-abbr">${escapeHtml(f.airline_name || '').substring(0,2).toUpperCase()}</span>`;

        const legDepart = `
            <div class="fl-fare-leg">
                <div>
                    <span class="fl-fare-leg-badge depart">Depart</span>
                    <span class="fl-fare-leg-date">${escapeHtml(f.depart_date || '')}</span>
                    <span class="fl-fare-leg-duration">Duration ${escapeHtml(f.duration || '--')}</span>
                </div>
                <div class="fl-fare-leg-flight">
                    <div class="fl-fare-leg-logo">${logoHtml}</div>
                    <div class="fl-fare-leg-times">
                        <div class="fl-fare-leg-time-row">${formatTime(f.depart_time)}</div>
                        <div class="fl-fare-leg-airports">${escapeHtml(f.origin)} ${escapeHtml(f.origin_name || '')}</div>
                        <div class="fl-fare-leg-time-row" style="margin-top:4px;">${formatTime(f.arrive_time)}</div>
                        <div class="fl-fare-leg-airports">${escapeHtml(f.destination)} ${escapeHtml(f.destination_name || '')}</div>
                        <div class="fl-fare-leg-info">${escapeHtml(f.airline_name)} &nbsp;${escapeHtml(f.flight_number || '')} &nbsp;${escapeHtml(f.aircraft || 'Airbus A320')} &nbsp;Economy class</div>
                    </div>
                </div>
            </div>`;

        let legReturn = '';
        if (f.round_trip) {
            const returnLogoHtml = f.airline_logo
                ? `<img src="${escapeHtml(f.airline_logo)}" alt="${escapeHtml(f.airline_name)}" onerror="this.onerror=null;this.style.display='none';">`
                : `<span class="fl-fare-leg-logo-abbr">${escapeHtml(f.airline_name || '').substring(0,2).toUpperCase()}</span>`;

            legReturn = `
            <div class="fl-fare-leg">
                <div>
                    <span class="fl-fare-leg-badge return-badge">Return</span>
                    <span class="fl-fare-leg-date">${escapeHtml(f.return_date || '')}</span>
                    <span class="fl-fare-leg-duration">Duration ${escapeHtml(f.return_duration || f.duration || '--')}</span>
                </div>
                <div class="fl-fare-leg-flight">
                    <div class="fl-fare-leg-logo">${returnLogoHtml}</div>
                    <div class="fl-fare-leg-times">
                        <div class="fl-fare-leg-time-row">${formatTime(f.return_depart_time || f.arrive_time)}</div>
                        <div class="fl-fare-leg-airports">${escapeHtml(f.destination)} ${escapeHtml(f.destination_name || '')}</div>
                        <div class="fl-fare-leg-time-row" style="margin-top:4px;">${formatTime(f.return_arrive_time || f.depart_time)}</div>
                        <div class="fl-fare-leg-airports">${escapeHtml(f.origin)} ${escapeHtml(f.origin_name || '')}</div>
                        <div class="fl-fare-leg-info">${escapeHtml(f.airline_name)} &nbsp;${escapeHtml(f.return_flight_number || f.flight_number || '')} &nbsp;${escapeHtml(f.aircraft || 'Airbus A320')} &nbsp;Economy class</div>
                    </div>
                </div>
            </div>`;
        }

        legsEl.innerHTML = legDepart + legReturn;
        renderFareTiers(f);
        updateFooterPrice();
        overlay.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    function renderFareTiers(f) {
        const tiers   = buildFareTiers(f);
        const tiersEl = document.getElementById('flFareTiers');
        if (!tiersEl) return;

        tiersEl.innerHTML = tiers.map((t, i) => {
            const isSelected = i === selectedTierIdx;

            const bagCheckedHtml = t.bagChecked
                ? `<div class="fl-fare-feature bag"><i class="fas fa-suitcase-rolling"></i> Checked baggage: ${escapeHtml(t.bagChecked)}</div>`
                : `<div class="fl-fare-feature no"><i class="fas fa-times"></i> Checked baggage: Not included</div>`;

            const recommendedBadge = t.recommended
                ? `<div class="fl-fare-recommended-badge">Recommended</div>`
                : '';

            return `
            <div class="fl-fare-card${isSelected ? ' selected' : ''}${t.recommended ? ' recommended' : ''}"
                 onclick="selectFareTier(${i})">
                ${recommendedBadge}
                <div class="fl-fare-card-header">
                    <div class="fl-fare-card-title-group">
                        <div class="fl-fare-card-name">${escapeHtml(t.name)}</div>
                        <div class="fl-fare-card-subtitle">${escapeHtml(t.subtitle)}</div>
                    </div>
                    <div class="fl-fare-radio${isSelected ? ' checked' : ''}"></div>
                </div>
                <div class="fl-fare-section-title">Baggage</div>
                <div class="fl-fare-feature bag"><i class="fas fa-briefcase"></i> Carry-on baggage: ${escapeHtml(t.bagCarry)}</div>
                ${bagCheckedHtml}
                <div class="fl-fare-section-title">Flexibility</div>
                <div class="fl-fare-feature ${t.refundable ? 'ok' : 'no'}">
                    <i class="fas fa-${t.refundable ? 'check' : 'times'}"></i>
                    ${t.refundable ? 'Refundable' : 'Non-refundable'}
                </div>
                <div class="fl-fare-feature ${t.changeable ? 'ok' : 'no'}">
                    <i class="fas fa-${t.changeable ? 'check' : 'times'}"></i>
                    ${t.changeable ? 'Changeable' : 'Non-changeable (partial segments)'}
                </div>
                <div class="fl-fare-section-title">Other benefits</div>
                <div class="fl-fare-feature ${t.miles ? 'ok' : 'no'}">
                    <i class="fas fa-${t.miles ? 'check' : 'times'}"></i>
                    Airline miles: ${t.miles ? 'Eligible' : 'Not eligible'}
                </div>
                <div class="fl-fare-feature ok">
                    <i class="far fa-clock"></i>
                    Ticketing: ${escapeHtml(t.ticketing)}
                </div>
                <div class="fl-fare-card-price-row">
                    <div style="display:flex;align-items:baseline;gap:8px;">
                        <span class="fl-fare-card-price">${formatPrice(t.price)}</span>
                        <span class="fl-fare-card-original">${formatPrice(t.originalPrice)}</span>
                    </div>
                    <div class="fl-fare-card-trip-label">${f.round_trip ? 'Round-trip' : 'One-way'}</div>
                </div>
                <div class="fl-fare-payment-row">
                    <i class="fas fa-wallet"></i>
                    <span>Payment method: GCash</span>
                    <i class="fas fa-chevron-down"></i>
                </div>
            </div>`;
        }).join('');
    }

    window.selectFareTier = function (idx) {
        selectedTierIdx = idx;
        if (modalFlight) {
            renderFareTiers(modalFlight);
            updateFooterPrice();
        }
    };

    function updateFooterPrice() {
        if (!modalFlight) return;
        const tiers    = buildFareTiers(modalFlight);
        const tier     = tiers[selectedTierIdx];
        const footerOrigEl  = document.getElementById('flFareFooterOriginal');
        const footerPriceEl = document.getElementById('flFareFooterPrice');
        const footerTripEl  = document.getElementById('flFareFooterTrip');
        if (footerOrigEl)  footerOrigEl.textContent  = formatPrice(tier.originalPrice);
        if (footerPriceEl) footerPriceEl.textContent = formatPrice(tier.price);
        if (footerTripEl)  footerTripEl.textContent  = modalFlight.round_trip ? 'Round-trip' : 'One-way';
    }

    // ── MODAL CLOSE ───────────────────────────────────────────────
    window.closeFareModal = function (event) {
        if (event && event.target !== document.getElementById('flFareModalOverlay')) return;
        _closeFareModal();
    };
    window.closeFareModalBtn = function () { _closeFareModal(); };

    function _closeFareModal() {
        const overlay = document.getElementById('flFareModalOverlay');
        if (overlay) overlay.classList.remove('open');
        document.body.style.overflow = '';
        modalFlight = null;
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') _closeFareModal();
    });

    // ── CONTINUE (proceed to booking) ────────────────────────────
    window.fareModalContinue = function () {
        if (!modalFlight) return;
        const f     = modalFlight;
        const tiers = buildFareTiers(f);
        const tier  = tiers[selectedTierIdx];

        // PHP now sends pre-built depart_datetime / arrive_datetime directly.
        // Fall back to building from parts only if somehow missing.
        const departDT = f.depart_datetime || buildDatetime(f.depart_date, f.depart_time);
        const arriveDT = f.arrive_datetime || buildDatetime(f.depart_date, f.arrive_time);

        const retDepartDT = f.return_datetime || buildDatetime(f.return_date, f.return_depart_time || f.arrive_time);
        const retArriveDT = buildDatetime(f.return_date, f.return_arrive_time || f.depart_time);

        // Read current passenger counts from the search form
        const adults   = parseInt(document.getElementById('paxAdults')?.textContent   || '1');
        const children = parseInt(document.getElementById('paxChildren')?.textContent || '0');
        const infants  = parseInt(document.getElementById('paxInfants')?.textContent  || '0');

        // Read selected cabin class from the label
        const cabin = document.getElementById('cabinLabel')?.textContent?.trim() || 'Economy';

        const params = new URLSearchParams({
            // ── IDs ──────────────────────────────────────────────
            fid:        f.id,

            // ── Airline / flight ─────────────────────────────────
            airline:    f.airline_name  || '',
            fn:         f.flight_number || '',

            // ── Origin / destination ─────────────────────────────
            // IATA codes
            orig:       f.origin        || '',
            dest:       f.destination   || '',
            // City / airport full names
            origCity:   f.origin_name   || '',
            destCity:   f.destination_name || '',

            // ── Full datetime strings ────────────────────────────
            dep:        departDT,
            arr:        arriveDT,

            // ── Cabin + trip type ────────────────────────────────
            cabin:      cabin,
            trip:       f.round_trip ? 'round_trip' : 'one_way',

            // ── Passengers ───────────────────────────────────────
            adults:     adults,
            children:   children,
            infants:    infants,

            // ── Price ────────────────────────────────────────────
            price:      tier.price,

            // ── Return leg (only meaningful for round trips) ─────
            retAirline: f.airline_name  || '',
            retFn:      f.return_flight_number || f.flight_number || '',
            retDep:     retDepartDT,
            retArr:     retArriveDT,
        });

        window.location.href = `flight-booking.html?${params.toString()}`;
    };

    // ── FILTER ────────────────────────────────────────────────────
    function applyFilters() {
        return allFlights.filter(f => {
            if (priceMin !== null && f.price < priceMin) return false;
            if (priceMax !== null && f.price > priceMax) return false;
            if (activeLabels.size > 0) {
                const labels = getLabels(f).map(l => l.key);
                if (![...activeLabels].some(l => labels.includes(l))) return false;
            }
            return true;
        });
    }

    function renderAirlineFilters() {
        const container = document.getElementById('flightAirlineFilters');
        if (!container) return;
        const allLabels = new Map();
        allFlights.forEach(f => getLabels(f).forEach(l => allLabels.set(l.key, l.text)));
        if (allLabels.size === 0) {
            container.innerHTML = '<p style="font-size:12px;color:var(--gray-400);">No labels available</p>';
            return;
        }
        container.innerHTML = [...allLabels.entries()].map(([key, text]) => `
            <label style="display:flex;align-items:center;gap:8px;font-size:13px;font-weight:500;
                          color:var(--gray-700);cursor:pointer;margin-bottom:6px;">
                <input type="checkbox" value="${key}" onchange="flightLabelFilter(this)"
                       style="cursor:pointer;accent-color:var(--blue);">
                <span>${text}</span>
            </label>`).join('');
    }

    window.flightLabelFilter = function (checkbox) {
        checkbox.checked ? activeLabels.add(checkbox.value) : activeLabels.delete(checkbox.value);
        renderFlights();
    };

    function initPriceFilters() {
        const btns = document.querySelectorAll('.filter-price-btn[data-min]');
        btns.forEach(btn => {
            btn.addEventListener('click', function () {
                btns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                priceMin = btn.dataset.min !== '' ? parseFloat(btn.dataset.min) : null;
                priceMax = btn.dataset.max !== '' ? parseFloat(btn.dataset.max) : null;
                renderFlights();
            });
        });
    }

    window.clearFlightFilters = function () {
        priceMin = null; priceMax = null; activeLabels.clear();
        document.querySelectorAll('.filter-price-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('#flightAirlineFilters input').forEach(i => i.checked = false);
        renderFlights();
    };

    // ── BUILD CARD ────────────────────────────────────────────────
    function buildFlightCard(f) {
        const labels     = getLabels(f);
        const badgesHtml = labels.map(l => `<span class="fl-badge ${l.cls}">${l.text}</span>`).join('');

        const logoHtml = f.airline_logo
            ? `<img src="${escapeHtml(f.airline_logo)}" alt="${escapeHtml(f.airline_name)}"
                    class="fl-airline-logo" onerror="this.onerror=null;this.style.display='none';">`
            : `<span class="fl-airline-abbr">${escapeHtml(f.airline_name || '').substring(0, 2).toUpperCase()}</span>`;

        const roundTripBadge = f.round_trip
            ? `<span class="fl-roundtrip-badge">Round Trip</span>`
            : `<span class="fl-oneway-badge">One Way</span>`;

        return `
<div class="flight-result-card">
    <div class="fl-airline-col">
        <div class="fl-airline-logo-wrap">${logoHtml}</div>
        <div class="fl-airline-name">${escapeHtml(f.airline_name)}</div>
        <div class="fl-flight-number">${escapeHtml(f.flight_number || '')}</div>
        ${roundTripBadge}
    </div>
    <div class="fl-route-col">
        <div class="fl-route-time">
            <div class="fl-time">${formatTime(f.depart_time)}</div>
            <div class="fl-airport">${escapeHtml(f.origin)}</div>
            <div class="fl-airport-name">${escapeHtml(f.origin_name || '')}</div>
        </div>
        <div class="fl-route-middle">
            <div class="fl-duration">${escapeHtml(f.duration || '--')}</div>
            <div class="fl-route-line">
                <span class="fl-route-dot"></span>
                <span class="fl-route-dash"></span>
                <i class="fas fa-plane fl-plane-icon"></i>
                <span class="fl-route-dash"></span>
                <span class="fl-route-dot"></span>
            </div>
            <div class="fl-stops">Direct</div>
        </div>
        <div class="fl-route-time">
            <div class="fl-time">${formatTime(f.arrive_time)}</div>
            <div class="fl-airport">${escapeHtml(f.destination)}</div>
            <div class="fl-airport-name">${escapeHtml(f.destination_name || '')}</div>
        </div>
    </div>
    <div class="fl-labels-col">
        ${badgesHtml || '<span style="font-size:12px;color:var(--gray-400);">—</span>'}
    </div>
    <div class="fl-price-col">
        <div class="fl-price-from">from</div>
        <div class="fl-price">${formatPrice(f.price)}</div>
        <div class="fl-price-per">per person</div>
        <button class="fl-book-btn" onclick="openFlightFareModal(${f.id})">
            Select <span style="font-size:15px;">›</span>
        </button>
    </div>
</div>`;
    }

    window.openFlightFareModal = function (id) {
    requireAuth(function () { openFareModal(id); }, 'Sign in to view fare options');
};

    // ── RENDER FLIGHTS ────────────────────────────────────────────
    function renderFlights() {
        const list = document.getElementById('flightResultsList');
        if (!list) return;
        const filtered = applyFilters();
        if (filtered.length === 0) {
            list.innerHTML = `
                <div class="hotel-results-empty">
                    <div style="font-size:32px;margin-bottom:10px;">✈️</div>
                    <div style="font-weight:700;font-size:15px;margin-bottom:6px;">No flights found</div>
                    <div style="font-size:13px;color:var(--gray-400);">Try adjusting your filters or search a different route.</div>
                </div>`;
            return;
        }
        list.innerHTML = filtered.map(buildFlightCard).join('');
    }

    // ── LOAD FLIGHTS FROM API ─────────────────────────────────────
    async function loadFlights(origin, destination) {
        const list = document.getElementById('flightResultsList');
        if (!list) return;
        list.innerHTML = '<div class="hotel-results-loading">Loading flights...</div>';

        const url = new URL(getApiUrl('search_flights.php'), window.location.href);
        if (origin)      url.searchParams.set('origin', origin);
        if (destination) url.searchParams.set('destination', destination);

        try {
            const response = await fetch(url.toString(), { method: 'GET', headers: { Accept: 'application/json' } });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const result = await response.json();
            allFlights = Array.isArray(result.flights) ? result.flights : [];
            renderAirlineFilters();
            renderFlights();
        } catch (err) {
            console.error('Flight load failed:', err);
            list.innerHTML = `
                <div class="hotel-results-empty">
                    Unable to load flights. Please make sure your local server is running.<br>
                    <small style="color:#aaa;">Error: ${err.message}</small>
                </div>`;
        }
    }

    // ── SEARCH BUTTON ─────────────────────────────────────────────
    function initSearch() {
        const fromInput = document.getElementById('fl-from');
        const toInput   = document.getElementById('fl-to');
        const searchBtn = document.querySelector('#panel-flights .search-btn');
        if (!searchBtn) return;

        loadFlights('', '');

        searchBtn.addEventListener('click', () => {
            loadFlights(fromInput ? fromInput.value.trim() : '', toInput ? toInput.value.trim() : '');
        });

        [fromInput, toInput].forEach(input => {
            if (!input) return;
            input.addEventListener('keydown', e => {
                if (e.key === 'Enter') loadFlights(fromInput.value.trim(), toInput.value.trim());
            });
        });
    }

    // ── INIT ──────────────────────────────────────────────────────
    function init() {
        initPriceFilters();
        initSearch();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();