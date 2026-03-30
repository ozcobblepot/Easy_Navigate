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
    let allFlights   = [];
    let priceMin     = null;
    let priceMax     = null;
    let activeLabels = new Set();

    // ── HELPERS ───────────────────────────────────────────────────
    function escapeHtml(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function formatPrice(p) {
        return '₱' + Number(p).toLocaleString('en-PH', { minimumFractionDigits: 0 });
    }

    function formatTime(t) {
        if (!t) return '--';
        // t may be "HH:MM:SS" or "HH:MM"
        const parts = t.split(':');
        let h = parseInt(parts[0]);
        const m = parts[1] || '00';
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = ((h + 11) % 12) + 1;
        return `${h}:${m} ${ampm}`;
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

    // ── FILTER ────────────────────────────────────────────────────
    function applyFilters() {
        return allFlights.filter(f => {
            if (priceMin !== null && f.price < priceMin) return false;
            if (priceMax !== null && f.price > priceMax) return false;
            if (activeLabels.size > 0) {
                const labels = getLabels(f).map(l => l.key);
                const hasMatch = [...activeLabels].some(l => labels.includes(l));
                if (!hasMatch) return false;
            }
            return true;
        });
    }

    // ── RENDER AIRLINE LABEL FILTERS ─────────────────────────────
    function renderAirlineFilters() {
        const container = document.getElementById('flightAirlineFilters');
        if (!container) return;

        // Collect all unique labels from data
        const allLabels = new Map();
        allFlights.forEach(f => {
            getLabels(f).forEach(l => allLabels.set(l.key, l.text));
        });

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
            </label>
        `).join('');
    }

    window.flightLabelFilter = function (checkbox) {
        if (checkbox.checked) {
            activeLabels.add(checkbox.value);
        } else {
            activeLabels.delete(checkbox.value);
        }
        renderFlights();
    };

    // ── PRICE FILTER BUTTONS ──────────────────────────────────────
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
        priceMin = null;
        priceMax = null;
        activeLabels.clear();
        document.querySelectorAll('.filter-price-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('#flightAirlineFilters input').forEach(i => i.checked = false);
        renderFlights();
    };

    // ── BUILD CARD ────────────────────────────────────────────────
    function buildFlightCard(f) {
        const labels   = getLabels(f);
        const badgesHtml = labels.map(l =>
            `<span class="fl-badge ${l.cls}">${l.text}</span>`
        ).join('');

        const logoHtml = f.airline_logo
            ? `<img src="${escapeHtml(f.airline_logo)}"
                    alt="${escapeHtml(f.airline_name)}"
                    class="fl-airline-logo"
                    onerror="this.onerror=null;this.style.display='none';">`
            : `<span class="fl-airline-abbr">${escapeHtml(f.airline_name || '').substring(0, 2).toUpperCase()}</span>`;

        const roundTripBadge = f.round_trip
            ? `<span class="fl-roundtrip-badge">Round Trip</span>`
            : `<span class="fl-oneway-badge">One Way</span>`;

        return `
<div class="flight-result-card">

    <!-- Airline -->
    <div class="fl-airline-col">
        <div class="fl-airline-logo-wrap">${logoHtml}</div>
        <div class="fl-airline-name">${escapeHtml(f.airline_name)}</div>
        <div class="fl-flight-number">${escapeHtml(f.flight_number || '')}</div>
        ${roundTripBadge}
    </div>

    <!-- Route -->
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

    <!-- Labels -->
    <div class="fl-labels-col">
        ${badgesHtml || '<span style="font-size:12px;color:var(--gray-400);">—</span>'}
    </div>

    <!-- Price -->
    <div class="fl-price-col">
        <div class="fl-price-from">from</div>
        <div class="fl-price">${formatPrice(f.price)}</div>
        <div class="fl-price-per">per person</div>
        <button class="fl-book-btn" onclick="flightBook(${f.id})">
            Select <span style="font-size:15px;">›</span>
        </button>
    </div>

</div>`;
    }

    // ── RENDER FLIGHTS ────────────────────────────────────────────
    function renderFlights() {
        const list    = document.getElementById('flightResultsList');
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

    // ── BOOK BUTTON ───────────────────────────────────────────────
    window.flightBook = function (id) {
        const f = allFlights.find(x => x.id === id);
        if (!f) return;
        const params = new URLSearchParams({
            id:          f.id,
            airline:     f.airline_name,
            flight:      f.flight_number,
            origin:      f.origin,
            destination: f.destination,
            depart:      f.depart_time,
            arrive:      f.arrive_time,
            duration:    f.duration,
            price:       f.price,
            round_trip:  f.round_trip,
        });
        window.location.href = `flight-booking.html?${params.toString()}`;
    };

    // ── LOAD FLIGHTS FROM API ─────────────────────────────────────
    async function loadFlights(origin, destination) {
        const list = document.getElementById('flightResultsList');
        if (!list) return;

        list.innerHTML = '<div class="hotel-results-loading">Loading flights...</div>';

        const url = new URL(getApiUrl('search_flights.php'), window.location.href);
        if (origin)      url.searchParams.set('origin', origin);
        if (destination) url.searchParams.set('destination', destination);

        try {
            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: { Accept: 'application/json' }
            });
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

        // Load all flights on page load
        loadFlights('', '');

        searchBtn.addEventListener('click', () => {
            const origin      = fromInput ? fromInput.value.trim() : '';
            const destination = toInput   ? toInput.value.trim()   : '';
            loadFlights(origin, destination);
        });

        // Also trigger on Enter key
        [fromInput, toInput].forEach(input => {
            if (!input) return;
            input.addEventListener('keydown', e => {
                if (e.key === 'Enter') {
                    const origin      = fromInput.value.trim();
                    const destination = toInput.value.trim();
                    loadFlights(origin, destination);
                }
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