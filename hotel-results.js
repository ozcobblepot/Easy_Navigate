(function () {
    const HOTEL_PAGE_CLASS = 'service-hotel';

    // --- Price Filter Logic ---
    function parsePriceRange(text) {
        const match = text.match(/([\d,]+)/g);
        if (!match) return [null, null];
        if (text.includes('>')) {
            return [parseInt(match[0].replace(/,/g, '')), null];
        }
        if (match.length === 2) {
            return [parseInt(match[0].replace(/,/g, '')), parseInt(match[1].replace(/,/g, ''))];
        }
        return [null, null];
    }

    function initPriceFilterButtons() {
        const btns = document.querySelectorAll('.filter-price-btn');
        btns.forEach(btn => {
            btn.addEventListener('click', function () {
                btns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                applyFilters();
            });
        });
    }

    function initStarFilterCheckboxes() {
        const checkboxes = document.querySelectorAll('.filter-stars input[type="checkbox"]');
        checkboxes.forEach(cb => {
            cb.addEventListener('change', function () {
                const label = cb.closest('label');
                if (label) label.classList.toggle('active-star', cb.checked);
            });
        });
    }

    function getActiveStars() {
        const checked = document.querySelectorAll('.filter-stars input[type="checkbox"]:checked');
        return Array.from(checked).map(cb => {
            const label = cb.closest('label');
            const starsEl = label ? label.querySelector('.star-icons') : null;
            if (starsEl) return (starsEl.textContent.match(/★/g) || []).length;
            return null;
        }).filter(Boolean);
    }

    function applyFilters() {
        const activeBtn = document.querySelector('.filter-price-btn.active');
        let priceMin = null, priceMax = null;
        if (activeBtn) {
            [priceMin, priceMax] = parsePriceRange(activeBtn.textContent);
        }
        const stars = getActiveStars();
        filterAndLoadHotels(priceMin, priceMax, stars);
    }

    async function filterAndLoadHotels(priceMin, priceMax, stars) {
        const listEl = document.getElementById('hotelResultsList');
        if (!listEl) return;
        listEl.innerHTML = '<div class="hotel-results-loading">Loading hotels...</div>';

        const endpointUrl = new URL(getApiUrl('search_hotels.php'), window.location.href);
        if (priceMin !== null) endpointUrl.searchParams.set('priceMin', priceMin);
        if (priceMax !== null) endpointUrl.searchParams.set('priceMax', priceMax);
        if (stars && stars.length > 0) endpointUrl.searchParams.set('stars', stars.join(','));
        const city = getCityFromQuery();
        if (city) endpointUrl.searchParams.set('city', city);

        try {
            const response = await fetch(endpointUrl.toString(), {
                method: 'GET',
                headers: { Accept: 'application/json' }
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const result = await response.json();
            const hotels = Array.isArray(result.hotels) ? result.hotels : [];
            updateResultsHeader(city, hotels.length);
            renderHotels(hotels);
        } catch (error) {
            updateResultsHeader(city, 0);
            listEl.innerHTML = '<div class="hotel-results-empty">No hotels found for the selected filters.</div>';
        }
    }

    function isHotelPage() {
        return document.body.classList.contains(HOTEL_PAGE_CLASS);
    }

    function escapeHtml(text) {
        return String(text || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function getApiUrl(pathWithFile) {
    if (window.location.protocol === 'file:') {
        return `http://localhost/platform-technologies-proj-v1-main/api/${pathWithFile}`;
    }
    // Get the folder the current HTML file lives in, then append api/
    const href = window.location.href.split('?')[0];
    const base = href.substring(0, href.lastIndexOf('/') + 1);
    return base + 'api/' + pathWithFile;
}

    function getCityFromQuery() {
        const params = new URLSearchParams(window.location.search);
        return (params.get('city') || '').trim();
    }

    function setCityQuery(cityValue, pushState) {
        const nextUrl = new URL(window.location.href);
        if (cityValue) {
            nextUrl.searchParams.set('city', cityValue);
        } else {
            nextUrl.searchParams.delete('city');
        }
        if (pushState) {
            window.history.pushState({}, '', nextUrl);
        } else {
            window.history.replaceState({}, '', nextUrl);
        }
    }

    function updateResultsHeader(city, count) {
        const titleEl = document.getElementById('hotelResultsTitle');
        const metaEl  = document.getElementById('hotelResultsMeta');
        if (!titleEl || !metaEl) return;
        titleEl.textContent = city ? `${city} Hotels & Homes` : 'Hotels & Homes';
        metaEl.textContent  = `${count} stays available`;
    }

    // ── BOOKING URL BUILDER ──────────────────────────────────────
    function buildBookingUrl(hotel) {
        const params = new URLSearchParams();
        params.set('name',    hotel.hotel_name    || '');
        params.set('price',   hotel.price_per_night || '0');
        params.set('rating',  hotel.rating         || '0');
        params.set('stars',   hotel.stars          || '0');
        params.set('reviews', hotel.review_count   || '0');
        params.set('city',    hotel.city           || '');
        params.set('address', hotel.address        || '');
        const today    = new Date();
        const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
        const fmt = d => d.toISOString().split('T')[0];
        params.set('checkin',  fmt(today));
        params.set('checkout', fmt(tomorrow));
        return `hotel-booking.html?${params.toString()}`;
    }

    // ── CARD BUILDER ─────────────────────────────────────────────
    function buildHotelCard(hotel, index) {
        const hotelName    = escapeHtml(hotel.hotel_name  || '');
        const hotelCity    = escapeHtml(hotel.city        || '');
        const hotelAddress = escapeHtml(hotel.address     || '');
        const rating       = hotel.rating       ?? 'N/A';
        const reviewCount  = hotel.review_count ?? 0;
        const price        = hotel.price_per_night
            ? `₱${Number(hotel.price_per_night).toLocaleString()}`
            : 'N/A';

        const stars     = Number(hotel.stars || 0);
        const starsHtml = stars > 0
            ? `<span class="hotel-result-stars">${'★'.repeat(stars)}</span>`
            : '';

        const ratingLabel = rating >= 4.5 ? 'Excellent' : rating >= 3.5 ? 'Very Good' : 'Good';

        const base     = (hotel.hotel_name || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
        const images   = [1, 2, 3].map(i => `hotel_homes/${base}_${i}.jpg`);
        const fallback = 'assets/hotel1_sample.png';

        const dotsHtml = images.map((_, idx) =>
            `<span class="hotel-media-dot${idx === 0 ? ' active' : ''}" data-dot-idx="${idx}"></span>`
        ).join('');

        return `
<article class="hotel-result-card" data-card-index="${index}">

    <div class="hotel-result-media">
        <img src="${images[0]}"
             alt="${hotelName}"
             class="hotel-result-image hotel-card-mainimg"
             data-img-idx="0"
             onerror="this.onerror=null;this.src='${fallback}';">
        <button type="button" class="hotel-media-prev hotel-card-arrow" aria-label="Previous image"></button>
        <button type="button" class="hotel-media-next hotel-card-arrow" aria-label="Next image"></button>
        <div class="hotel-media-dots">${dotsHtml}</div>
        <button type="button" class="hotel-media-like" aria-label="Save hotel">
            <i class="far fa-heart"></i>
        </button>
    </div>

    <div class="hotel-result-main hotel-result-main-topalign">
        <h3 class="hotel-result-name">${hotelName}${starsHtml}</h3>
        <div class="hotel-result-rating-row">
            <span class="hotel-result-rating">${rating}</span>
            <span class="hotel-result-rating-label">${ratingLabel}</span>
            <span class="hotel-result-reviewcount">· ${reviewCount} reviews</span>
        </div>
        <div class="hotel-result-location">
            <i class="fas fa-map-marker-alt"></i>
            <span class="hotel-result-locationtext">${hotelCity}, ${hotelAddress}</span>
        </div>
        <p class="hotel-result-subtitle">Great option for stays in ${hotelCity}</p>
    </div>

    <aside class="hotel-result-pricebox">
        <span class="hotel-result-from">Price per night</span>
        <div class="hotel-result-price">${price}</div>
        <button type="button" class="hotel-result-cta hotel-open-modal">
            Check Availability
            <span class="hotel-cta-arrow">&#8250;</span>
        </button>
    </aside>

</article>`;
    }

    // ── RENDER ────────────────────────────────────────────────────
    function renderHotels(hotels) {
        const listEl = document.getElementById('hotelResultsList');
        if (!listEl) return;

        if (!Array.isArray(hotels) || hotels.length === 0) {
            listEl.innerHTML = '<div class="hotel-results-empty">No hotels found.</div>';
            return;
        }

        listEl.innerHTML = hotels.map((hotel, index) => buildHotelCard(hotel, index)).join('');

        listEl.querySelectorAll('.hotel-result-card').forEach((card, cardIdx) => {
            const hotel    = hotels[cardIdx];
            const base     = (hotel.hotel_name || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
            const images   = [1, 2, 3].map(i => `hotel_homes/${base}_${i}.jpg`);
            const fallback = 'assets/hotel1_sample.png';

            const mainImg  = card.querySelector('.hotel-card-mainimg');
            const dots     = card.querySelectorAll('.hotel-media-dot');
            const prevBtn  = card.querySelector('.hotel-media-prev');
            const nextBtn  = card.querySelector('.hotel-media-next');
            let current    = 0;

            function showSlide(idx) {
                current = (idx + images.length) % images.length;
                mainImg.style.opacity    = '0';
                mainImg.style.transition = 'opacity 0.2s ease';
                setTimeout(() => {
                    mainImg.src = images[current];
                    mainImg.onerror = function () { this.onerror = null; this.src = fallback; };
                    mainImg.style.opacity = '1';
                }, 180);
                dots.forEach((d, i) => d.classList.toggle('active', i === current));
            }

            prevBtn.addEventListener('click', e => { e.stopPropagation(); showSlide(current - 1); });
            nextBtn.addEventListener('click', e => { e.stopPropagation(); showSlide(current + 1); });
            dots.forEach((dot, i) => {
                dot.addEventListener('click', e => { e.stopPropagation(); showSlide(i); });
            });

            card.querySelector('.hotel-open-modal').addEventListener('click', () => {
                showHotelModal(hotel);
            });
        });
    }

    // ── MODAL ────────────────────────────────────────────────────
    function showHotelModal(hotel) {
        const existing = document.getElementById('hotelModal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id        = 'hotelModal';
        modal.className = 'hotel-modal';

        function slugify(str) {
            return (str || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
        }
        const base     = slugify(hotel.hotel_name);
        const images   = [1, 2, 3].map(i => `hotel_homes/${base}_${i}.jpg`);
        const fallback = 'assets/hotel1_sample.png';
        const price    = hotel.price_per_night ? Number(hotel.price_per_night) : null;
        const rating   = hotel.rating ?? 'N/A';
        const bookingUrl = buildBookingUrl(hotel);

        modal.innerHTML = `
<div class="hotel-modal-content">

    <button class="hotel-modal-close-btn" id="hotelModalClose" aria-label="Close modal">✕</button>

    <div class="hotel-modal-titlebox">
        <h1 class="hotel-modal-title">${escapeHtml(hotel.hotel_name || '')}</h1>
        <div class="hotel-modal-location">
            <i class="fas fa-map-marker-alt"></i>
            <span>${escapeHtml(hotel.address || '')}</span>
        </div>
    </div>

    <div class="hotel-modal-galleryrow">
        <div class="hotel-modal-gallery">
            <div class="hotel-modal-carousel">
                <button class="hotel-modal-arrow hotel-modal-arrow-left" id="hotelModalArrowLeft" aria-label="Previous image"></button>
                <img id="hotelModalImg" src="" alt="${escapeHtml(hotel.hotel_name || '')}" class="hotel-modal-image">
                <button class="hotel-modal-arrow hotel-modal-arrow-right" id="hotelModalArrowRight" aria-label="Next image"></button>
            </div>
            <div class="hotel-modal-thumbs" id="hotelModalThumbs">
                ${images.map((src, idx) =>
                    `<img src="${src}" class="hotel-modal-thumb" data-idx="${idx}"
                          onerror="this.onerror=null;this.src='${fallback}';">`
                ).join('')}
            </div>
        </div>

        <div class="hotel-modal-description">
            <h3>Property Description</h3>
            <p>Experience a relaxing tropical escape at this luxurious property, where modern amenities and world-class hospitality create the perfect getaway. The property features spacious, elegantly designed rooms with private balconies, an outdoor infinity pool, spa and wellness center, and fine dining restaurants.</p>
        </div>
    </div>

    <div class="hotel-modal-amenities-section">
        <div class="hotel-modal-amenities">
            <h3>Amenities</h3>
            <div class="hotel-modal-amenitiesgrid">
                <span><i class="fas fa-wifi"></i> Wi-Fi</span>
                <span><i class="fas fa-users"></i> Conference</span>
                <span><i class="fas fa-arrow-up"></i> Elevator</span>
                <span><i class="fas fa-ban"></i> No smoking</span>
                <span><i class="fas fa-briefcase-medical"></i> First aid</span>
                <span><i class="fas fa-fire-extinguisher"></i> Fire safety</span>
                <span><i class="fas fa-user-shield"></i> Security</span>
                <span><i class="fas fa-bell"></i> Alarm</span>
            </div>
        </div>
        <div class="hotel-modal-reviews">
            <h3>Rating &amp; Reviews</h3>
            <div class="hotel-modal-review-score">
                <span class="hotel-result-rating">${rating}</span>
                <span class="hotel-modal-review-label">Very good</span>
                <span class="hotel-result-reviewcount">· ${hotel.review_count ?? 0} reviews</span>
            </div>
            <p class="hotel-modal-review-quote">Staff are very accommodating, rooms are clean and neat.</p>
        </div>
    </div>

    <div class="hotel-modal-footer">
        <div class="hotel-modal-footer-price">
            <span class="hotel-modal-footer-label">Price per night</span>
            <div class="hotel-modal-footer-amounts">
                <span class="hotel-modal-price-current">${price ? `₱${price.toLocaleString()}` : 'Contact for price'}</span>
                ${price ? `<span class="hotel-modal-price-original">₱${Math.round(price * 1.15).toLocaleString()}</span>` : ''}
            </div>
        </div>
        <button class="hotel-modal-reserve-btn reserve-btn"
                onclick="window.location.href='${bookingUrl}'">
            Reserve Room
        </button>
    </div>

</div>`;

        document.body.appendChild(modal);
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';

        document.getElementById('hotelModalClose').addEventListener('click', () => {
            modal.remove();
            document.body.style.overflow = '';
        });
        modal.addEventListener('click', e => {
            if (e.target === modal) { modal.remove(); document.body.style.overflow = ''; }
        });
        document.addEventListener('keydown', function escHandler(e) {
            if (e.key === 'Escape') { modal.remove(); document.body.style.overflow = ''; document.removeEventListener('keydown', escHandler); }
        });

        let currentImg = 0;
        const mainImg  = modal.querySelector('#hotelModalImg');
        const thumbs   = modal.querySelectorAll('.hotel-modal-thumb');

        function showModalImg(idx) {
            currentImg = (idx + images.length) % images.length;
            mainImg.style.opacity = '0';
            setTimeout(() => {
                mainImg.src = images[currentImg];
                mainImg.onerror = function () { this.onerror = null; this.src = fallback; };
                mainImg.style.opacity = '1';
            }, 160);
            thumbs.forEach((t, i) => t.classList.toggle('active', i === currentImg));
        }

        thumbs.forEach((thumb, idx) => thumb.addEventListener('click', () => showModalImg(idx)));
        modal.querySelector('#hotelModalArrowLeft') .addEventListener('click', () => showModalImg(currentImg - 1));
        modal.querySelector('#hotelModalArrowRight').addEventListener('click', () => showModalImg(currentImg + 1));
        showModalImg(0);
    }

    // ── LOAD HOTELS ───────────────────────────────────────────────
    // Exposed on window so service-search-suggestions.js can call it
    window.loadHotels = async function loadHotels(city) {
        const listEl = document.getElementById('hotelResultsList');
        if (!listEl) return;
        listEl.innerHTML = '<div class="hotel-results-loading">Loading hotels...</div>';

        const endpointUrl = new URL(getApiUrl('search_hotels.php'), window.location.href);
        if (city) endpointUrl.searchParams.set('city', city);

        try {
            const response = await fetch(endpointUrl.toString(), {
                method: 'GET',
                headers: { Accept: 'application/json' }
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const result = await response.json();
            const hotels = Array.isArray(result.hotels) ? result.hotels : [];
            updateResultsHeader(city, hotels.length);
            renderHotels(hotels);
        } catch (error) {
            console.error('Hotel load failed:', error);
            updateResultsHeader(city, 0);
            listEl.innerHTML = '<div class="hotel-results-empty">Unable to load hotels. Check F12 console.</div>';
        }
    };

    function initHotelResultsSearch() {
        if (!isHotelPage()) return;

        const destinationInput = document.getElementById('hotelDestinationInput');
        const searchButton     = document.querySelector('#panel-hotel .search-btn');
        if (!destinationInput || !searchButton) return;

        // ── KEY FIX: Read ?city= from URL on page load ──
        // Previously this always called loadHotels('') which ignored the URL param.
        // Now it reads the city from the URL so arriving from index.html with
        // ?city=El+Nido shows only El Nido hotels immediately.
        const initialCity = getCityFromQuery();
        destinationInput.value = initialCity;
        window.loadHotels(initialCity);

        searchButton.addEventListener('click', () => {
            const city = destinationInput.value.trim();
            setCityQuery(city, true);
            window.loadHotels(city);
        });

        window.addEventListener('popstate', () => {
            const city = getCityFromQuery();
            destinationInput.value = city;
            window.loadHotels(city);
        });
    }

    function initAllHotelFeatures() {
        initHotelResultsSearch();
        initPriceFilterButtons();
        initStarFilterCheckboxes();

        const applyBtn = document.querySelector('.filter-apply-btn');
        if (applyBtn) applyBtn.addEventListener('click', applyFilters);

        const clearBtn = document.getElementById('filterClearAll');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                document.querySelectorAll('.filter-price-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.filter-stars input[type="checkbox"]').forEach(cb => {
                    cb.checked = false;
                    const label = cb.closest('label');
                    if (label) label.classList.remove('active-star');
                });
                applyFilters();
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAllHotelFeatures);
    } else {
        initAllHotelFeatures();
    }
})();