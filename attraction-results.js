(function () {

    // ── API URL BUILDER ───────────────────────────────────────────
    function getApiUrl(pathWithFile) {
        if (window.location.protocol === 'file:') {
            return 'http://localhost/platform-technologies-proj-v1-main/api/' + pathWithFile;
        }
        const href = window.location.href.split('?')[0];
        const base = href.substring(0, href.lastIndexOf('/') + 1);
        return base + 'api/' + pathWithFile;
    }

    // ── STATE ─────────────────────────────────────────────────────
    let allAttractions = [];
    let attState = {
        priceMin:   0,
        priceMax:   99999,
        categories: [],
        minRating:  0,
        features:   [],
        duration:   '',
        sort:       'popular'
    };
    let attWishlist    = new Set();
    let attCarouselIdx = {};
    let attmCurrentId  = null;
    let attmImgIdx     = 0;
    let attmImgs       = [];

    // ── HELPERS ───────────────────────────────────────────────────
    function escapeHtml(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function attStars(r) {
        const full = Math.floor(r);
        let s = '';
        for (let i = 0; i < full; i++) s += '★';
        if (r - full >= 0.5) s += '☆';
        while (s.length < 5) s += '☆';
        return s;
    }

    // ── FILTER ────────────────────────────────────────────────────
    function attFilterData() {
        return allAttractions.filter(a => {
            const p = a.price;
            if (attState.priceMin === 0 && attState.priceMax === 0) {
                if (p !== 0) return false;
            } else {
                if (p < attState.priceMin || p > attState.priceMax) return false;
            }
            if (attState.categories.length && !attState.categories.includes(a.category)) return false;
            if (a.rating < attState.minRating) return false;
            for (const f of attState.features) {
                if (f === 'free_cancellation' && !a.is_free_cancellation) return false;
                if (f === 'is_popular'        && !a.is_popular)           return false;
                if (f === 'is_recommended'    && !a.is_recommended)       return false;
                if (f === 'is_best_value'     && !a.is_best_value)        return false;
            }
            if (attState.duration) {
                const d = String(a.duration || '').toLowerCase();
                if (attState.duration === 'full'  && !d.includes('full'))                      return false;
                if (attState.duration === 'half'  && !d.includes('half'))                      return false;
                if (attState.duration === 'hours' && (d.includes('full') || d.includes('half'))) return false;
            }
            return true;
        }).sort((a, b) => {
            switch (attState.sort) {
                case 'rating':     return b.rating  - a.rating;
                case 'price_asc':  return a.price   - b.price;
                case 'price_desc': return b.price   - a.price;
                case 'reviews':    return b.reviews - a.reviews;
                default: {
                    const pop = (b.is_popular + b.is_recommended) - (a.is_popular + a.is_recommended);
                    return pop !== 0 ? pop : b.reviews - a.reviews;
                }
            }
        });
    }

    // ── RENDER CARDS ──────────────────────────────────────────────
    function attRender() {
        const data  = attFilterData();
        const grid  = document.getElementById('attGrid');
        const empty = document.getElementById('attEmpty');
        const count = document.getElementById('attResultCount');

        if (count) count.textContent = `Showing ${data.length} experience${data.length !== 1 ? 's' : ''}`;
        if (!grid) return;

        if (!data.length) {
            grid.innerHTML = '';
            if (empty) empty.style.display = 'flex';
            return;
        }
        if (empty) empty.style.display = 'none';

        grid.innerHTML = data.map(a => {
            const isWished = attWishlist.has(a.id);
            if (attCarouselIdx[a.id] === undefined) attCarouselIdx[a.id] = 0;
            const imgs  = a.images || [];
            const idx   = attCarouselIdx[a.id];
            const multi = imgs.length > 1;

            const priceHTML = a.price === 0
                ? `<div class="att-card-price free">Free entry</div>`
                : `<div class="att-card-price-from">From</div>
                   <div class="att-card-price">PHP ${Number(a.price).toLocaleString()}</div>`;

            const badges = [];
            if (a.is_popular)           badges.push(`<span class="att-badge att-badge--popular">🔥 Popular</span>`);
            if (a.is_recommended)       badges.push(`<span class="att-badge att-badge--recommend">⭐ Recommended</span>`);
            if (a.is_best_value)        badges.push(`<span class="att-badge att-badge--value">💎 Best value</span>`);
            if (a.is_free_cancellation) badges.push(`<span class="att-badge att-badge--cancel">✓ Free cancel</span>`);

            const tripbestHTML = a.tripbest
                ? `<div class="att-card-tripbest">
                       <span class="att-card-tripbest-icon">🏆 Trip.Best</span>
                       <span>${escapeHtml(a.tripbest)}</span>
                   </div>` : '';

            const instantHTML = a.instant
                ? `<div class="att-instant">Instant confirmation</div>` : '';

            const dotsHTML = multi
                ? `<div class="att-carousel-dots">
                       ${imgs.map((_, i) => `<span class="att-carousel-dot${i === idx ? ' active' : ''}"
                           onclick="window.attGoSlide(event,${a.id},${i})"></span>`).join('')}
                   </div>` : '';

            const arrowsHTML = multi
                ? `<button class="att-carousel-arrow att-carousel-prev" onclick="window.attSlide(event,${a.id},-1)" aria-label="Previous"></button>
                   <button class="att-carousel-arrow att-carousel-next" onclick="window.attSlide(event,${a.id},1)"  aria-label="Next"></button>` : '';

            const imgSrc = imgs[idx] || '';

            return `
<div class="att-card" data-id="${a.id}">
    <div class="att-card-img-wrap">
        <img class="att-card-img" id="attImg-${a.id}"
             src="${escapeHtml(imgSrc)}"
             alt="${escapeHtml(a.name)}"
             onerror="window.attImgFallback(this,'${escapeHtml(imgSrc)}')">
        ${arrowsHTML}
        <button class="att-card-wishlist ${isWished ? 'active' : ''}"
                onclick="window.attToggleWishlist(event,${a.id})"
                title="Save to wishlist">${isWished ? '❤️' : '🤍'}</button>
        ${dotsHTML}
    </div>
    <div class="att-card-body">
        <div class="att-card-badges">${badges.slice(0, 2).join('')}</div>
        <h3 class="att-card-title">${escapeHtml(a.name)}</h3>
        ${tripbestHTML}
        <div class="att-card-rating-row">
            <span class="att-card-fire">${a.rating}</span>
            <span class="att-card-stars">${attStars(a.rating)}</span>
            <span class="att-card-reviews">${Number(a.reviews).toLocaleString()} reviews</span>
        </div>
        ${instantHTML}
        <p class="att-card-snippet">${escapeHtml(a.snippet)}</p>
        <div class="att-card-location">
            <i class="fas fa-map-marker-alt"></i>${escapeHtml(a.country)} · ${escapeHtml(a.city)}
        </div>
    </div>
    <div class="att-card-divider"></div>
    <div class="att-card-footer">
        <div class="att-card-price-block">${priceHTML}</div>
        <button class="att-card-book-btn" onclick="window.attOpenModal(event,${a.id})">Book now →</button>
    </div>
</div>`;
        }).join('');
    }

    // ── IMAGE FALLBACK ────────────────────────────────────────────
    window.attImgFallback = function (el, originalSrc) {
        el.onerror = null;
        el.src = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80';
    };

    // ── CAROUSEL ──────────────────────────────────────────────────
    window.attSlide = function (e, id, dir) {
        e.stopPropagation();
        const a = allAttractions.find(x => x.id === id);
        if (!a) return;
        attCarouselIdx[id] = (attCarouselIdx[id] + dir + a.images.length) % a.images.length;
        attUpdateCarousel(id, a.images);
    };

    window.attGoSlide = function (e, id, idx) {
        e.stopPropagation();
        const a = allAttractions.find(x => x.id === id);
        if (!a) return;
        attCarouselIdx[id] = idx;
        attUpdateCarousel(id, a.images);
    };

    function attUpdateCarousel(id, imgs) {
        const idx = attCarouselIdx[id];
        const img = document.getElementById('attImg-' + id);
        if (img) {
            img.style.opacity    = '0';
            img.style.transition = 'opacity 0.22s ease';
            setTimeout(() => {
                img.onerror = () => window.attImgFallback(img, imgs[idx]);
                img.src     = imgs[idx];
                img.style.opacity = '1';
            }, 120);
        }
        const wrap = img ? img.closest('.att-card-img-wrap') : null;
        if (wrap) {
            wrap.querySelectorAll('.att-carousel-dot').forEach((d, i) => d.classList.toggle('active', i === idx));
        }
    }

    // ── WISHLIST ──────────────────────────────────────────────────
    window.attToggleWishlist = function (e, id) {
        e.stopPropagation();
        if (attWishlist.has(id)) attWishlist.delete(id); else attWishlist.add(id);
        const card = document.querySelector(`.att-card[data-id="${id}"]`);
        if (card) {
            const btn = card.querySelector('.att-card-wishlist');
            const w   = attWishlist.has(id);
            btn.classList.toggle('active', w);
            btn.innerHTML = w ? '❤️' : '🤍';
        }
    };

    // ── FILTER CONTROLS (exposed globally for HTML onclick) ───────
    window.attSetPrice = function (btn) {
        document.querySelectorAll('#attPriceFilters .filter-price-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        attState.priceMin = parseFloat(btn.dataset.min);
        attState.priceMax = parseFloat(btn.dataset.max);
        attRender();
    };

    window.attSetDuration = function (btn) {
        document.querySelectorAll('#attDurationFilters .filter-price-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        attState.duration = btn.dataset.dur;
        attRender();
    };

    window.attSetSort = function (key, label) {
        attState.sort = key;
        const sortBtn = document.getElementById('attSortBtn');
        if (sortBtn) sortBtn.innerHTML = label + ' <i class="fas fa-chevron-down" style="font-size:10px"></i>';
        const sortMenu = document.getElementById('attSortMenu');
        if (sortMenu) sortMenu.classList.remove('open');
        attRender();
    };

    window.attApplyFilters = function () {
        attState.categories = [...document.querySelectorAll('#attCategoryFilters input:checked')].map(i => i.value);
        attState.features   = [...document.querySelectorAll('#attFeatureFilters input:checked')].map(i => i.value);
        const r = document.querySelector('[name="attRating"]:checked');
        attState.minRating  = r ? parseFloat(r.value) : 0;
        attRender();
    };

    window.attClearFilters = function () {
        document.querySelectorAll('#attPriceFilters .filter-price-btn').forEach((b, i) => b.classList.toggle('active', i === 0));
        attState.priceMin = 0; attState.priceMax = 99999;
        document.querySelectorAll('#attCategoryFilters input').forEach(i => i.checked = false);
        attState.categories = [];
        const anyRating = document.querySelector('[name="attRating"][value="0"]');
        if (anyRating) anyRating.checked = true;
        attState.minRating = 0;
        document.querySelectorAll('#attFeatureFilters input').forEach(i => i.checked = false);
        attState.features = [];
        document.querySelectorAll('#attDurationFilters .filter-price-btn').forEach((b, i) => b.classList.toggle('active', i === 0));
        attState.duration = '';
        attRender();
    };

    // ── MODAL ─────────────────────────────────────────────────────
    const ATT_REVIEWS = {
        default: [
            { user: 'traveller_ph',  score: '5.0', label: 'Outstanding', text: 'Absolutely breathtaking experience. One of the best trips I have ever had in the Philippines!' },
            { user: 'island_hopper', score: '4.5', label: 'Excellent',   text: 'Great guides, crystal clear waters. Will definitely come back again with family.' },
            { user: 'adventurer_jm', score: '4.0', label: 'Very Good',   text: 'The scenery was stunning. A bit crowded on weekends but overall a fantastic experience.' },
        ]
    };

    window.attOpenModal = function (e, id) {
        e.stopPropagation();
        const a = allAttractions.find(x => x.id === id);
        if (!a) return;
        attmCurrentId = id;
        attmImgs      = a.images || [];
        attmImgIdx    = attCarouselIdx[id] || 0;

        const mainImg = document.getElementById('attmMainImg');
        if (mainImg) {
            mainImg.src     = attmImgs[attmImgIdx] || '';
            mainImg.alt     = a.name;
            mainImg.style.opacity = '1';
            mainImg.onerror = () => window.attImgFallback(mainImg, attmImgs[attmImgIdx]);
        }

        const multi = attmImgs.length > 1;
        const prevBtn = document.querySelector('.attm-gallery-prev');
        const nextBtn = document.querySelector('.attm-gallery-next');
        if (prevBtn) prevBtn.style.display = multi ? '' : 'none';
        if (nextBtn) nextBtn.style.display = multi ? '' : 'none';

        const dotsEl = document.getElementById('attmDots');
        if (dotsEl) {
            dotsEl.innerHTML = multi
                ? attmImgs.map((_, i) => `<span class="attm-gdot${i === attmImgIdx ? ' active' : ''}"
                    onclick="window.attmGoImg(${i})"></span>`).join('') : '';
        }

        const counterEl = document.getElementById('attmCounter');
        if (counterEl) {
            counterEl.style.display = multi ? '' : 'none';
            counterEl.textContent   = `${attmImgIdx + 1} / ${attmImgs.length}`;
        }

        const title = document.getElementById('attmTitle');
        if (title) title.textContent = a.name;

        const wishBtn = document.getElementById('attmWishBtn');
        if (wishBtn) {
            wishBtn.innerHTML = attWishlist.has(id) ? '❤️' : '♡';
            wishBtn.classList.toggle('active', attWishlist.has(id));
        }

        const fireEl = document.getElementById('attmFire');
        if (fireEl) fireEl.textContent = a.rating;

        const scoreBadge = document.getElementById('attmScoreBadge');
        if (scoreBadge) scoreBadge.textContent = a.rating + '/5';

        const reviewCount = document.getElementById('attmReviewCount');
        if (reviewCount) reviewCount.textContent = `${Number(a.reviews).toLocaleString()} reviews ›`;

        const taEl = document.getElementById('attmTripAdvisor');
        if (taEl) {
            const full = Math.floor(a.rating), half = (a.rating - full) >= 0.5;
            let dotHtml = '<span class="attm-ta-dots">';
            for (let i = 0; i < full; i++) dotHtml += `<span class="attm-ta-dot"></span>`;
            if (half) dotHtml += `<span class="attm-ta-dot half"></span>`;
            dotHtml += `</span> based on ${Number(a.reviews).toLocaleString()} reviews ›`;
            taEl.innerHTML = dotHtml;
        }

        const badgesEl = document.getElementById('attmBadgesRow');
        if (badgesEl) {
            let badgeHtml = '';
            if (a.tripbest) badgeHtml += `<span class="attm-tripbest-badge">🏆 Trip.Best&nbsp; ${escapeHtml(a.tripbest)} ›</span>`;
            badgeHtml += `<span class="attm-cat-badge">${escapeHtml(a.category)}</span>`;
            badgesEl.innerHTML = badgeHtml;
        }

        const durEl = document.getElementById('attmDuration');
        if (durEl) durEl.textContent = a.duration;

        const locEl = document.getElementById('attmLocation');
        if (locEl) locEl.textContent = `${a.location}, ${a.city}, ${a.country}`;

        const cancelRow = document.getElementById('attmCancelRow');
        if (cancelRow) cancelRow.style.display = a.is_free_cancellation ? '' : 'none';

        const instantRow = document.getElementById('attmInstantRow');
        if (instantRow) instantRow.style.display = a.instant ? '' : 'none';

        const descEl = document.getElementById('attmDesc');
        if (descEl) descEl.textContent = a.snippet + ' This is a must-visit destination offering unforgettable memories for travelers of all ages. Book early to secure your spot and enjoy the best of what the Philippines has to offer.';

        // Price
        const priceEl   = document.getElementById('attmPriceCurrent');
        const origEl    = document.getElementById('attmPriceOrig');
        const badgePrEl = document.getElementById('attmPriceBadge');
        if (priceEl && origEl && badgePrEl) {
            if (a.price === 0) {
                priceEl.textContent = 'Free entry';
                priceEl.className   = 'attm-price-current free';
                origEl.textContent  = '';
                badgePrEl.style.display = 'none';
            } else {
                const disc = Math.round(a.price * 0.85);
                priceEl.textContent     = `PHP ${disc.toLocaleString()}`;
                priceEl.className       = 'attm-price-current';
                origEl.textContent      = `PHP ${Number(a.price).toLocaleString()}`;
                badgePrEl.textContent   = `-PHP ${(a.price - disc).toLocaleString()}`;
                badgePrEl.style.display = '';
            }
        }

        // Reviews
        const reviewsList = document.getElementById('attmReviewsList');
        if (reviewsList) {
            const reviews = ATT_REVIEWS[id] || ATT_REVIEWS.default;
            const colors  = ['#282D9E', '#0369a1', '#9d174d', '#6d28d9', '#15803d'];
            reviewsList.innerHTML = reviews.map(r => {
                const initials = r.user.substring(0, 2).toUpperCase();
                const color    = colors[r.user.charCodeAt(0) % colors.length];
                return `<div class="attm-review-card">
                    <div class="attm-review-top">
                        <div class="attm-review-avatar" style="background:${color};">${initials}</div>
                        <span class="attm-review-user">${escapeHtml(r.user)}</span>
                        <span class="attm-review-badge">⭐ ${escapeHtml(r.label)}</span>
                        <span class="attm-review-score">${escapeHtml(r.score)}/5</span>
                    </div>
                    <p class="attm-review-text">${escapeHtml(r.text)}</p>
                </div>`;
            }).join('');
        }

        const overlay = document.getElementById('attModal');
        if (overlay) overlay.classList.add('open');
        document.body.style.overflow = 'hidden';
    };

    window.attCloseModal = function () {
        const overlay = document.getElementById('attModal');
        if (overlay) overlay.classList.remove('open');
        document.body.style.overflow = '';
        attmCurrentId = null;
    };

    window.attModalOverlayClick = function (e) {
        if (e.target === document.getElementById('attModal')) window.attCloseModal();
    };

    window.attmGoImg = function (idx) {
        attmImgIdx = (idx + attmImgs.length) % attmImgs.length;
        const mainImg = document.getElementById('attmMainImg');
        if (mainImg) {
            mainImg.style.opacity    = '0';
            mainImg.style.transition = 'opacity 0.22s ease';
            setTimeout(() => {
                mainImg.src     = attmImgs[attmImgIdx];
                mainImg.onerror = () => window.attImgFallback(mainImg, attmImgs[attmImgIdx]);
                mainImg.style.opacity = '1';
            }, 120);
        }
        document.querySelectorAll('#attmDots .attm-gdot').forEach((d, i) => d.classList.toggle('active', i === attmImgIdx));
        const c = document.getElementById('attmCounter');
        if (c) c.textContent = `${attmImgIdx + 1} / ${attmImgs.length}`;
    };

    window.attmSlide = function (dir) { window.attmGoImg(attmImgIdx + dir); };

    window.attmToggleWish = function () {
        const id = attmCurrentId;
        if (!id) return;
        if (attWishlist.has(id)) attWishlist.delete(id); else attWishlist.add(id);
        const wished  = attWishlist.has(id);
        const wishBtn = document.getElementById('attmWishBtn');
        if (wishBtn) { wishBtn.innerHTML = wished ? '❤️' : '♡'; wishBtn.classList.toggle('active', wished); }
        const card = document.querySelector(`.att-card[data-id="${id}"]`);
        if (card) {
            const btn = card.querySelector('.att-card-wishlist');
            if (btn) { btn.classList.toggle('active', wished); btn.innerHTML = wished ? '❤️' : '🤍'; }
        }
    };

    window.goToAttBooking = function () {
        const a = allAttractions.find(x => x.id === attmCurrentId);
        if (!a) return;
        const params = new URLSearchParams({
            id: a.id, name: a.name, city: a.city, country: a.country,
            location: a.location, category: a.category, duration: a.duration,
            price: a.price, rating: a.rating, reviews: a.reviews,
            instant: a.instant ? '1' : '0', cancel: a.is_free_cancellation ? '1' : '0',
            tripbest: a.tripbest || '', image: encodeURIComponent(a.images[0] || '')
        });
        window.location.href = 'attraction-booking.html?' + params.toString();
    };

    // ── LOAD FROM API ─────────────────────────────────────────────
    async function loadAttractions(city, dest) {
        const grid = document.getElementById('attGrid');
        if (!grid) return;

        grid.innerHTML = `<div class="hotel-results-loading" style="grid-column:1/-1;padding:40px;text-align:center;color:var(--gray-500);">
            <div style="font-size:28px;margin-bottom:10px;">🏝️</div>
            <div>Loading attractions...</div>
        </div>`;

        const url = new URL(getApiUrl('get_attractions.php'), window.location.href);
        if (city) url.searchParams.set('city', city);

        try {
            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: { Accept: 'application/json' }
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const result = await response.json();

            if (!result.ok) throw new Error(result.message || 'API error');

            allAttractions = Array.isArray(result.attractions) ? result.attractions : [];

            // Filter by dest keyword if provided
            if (dest) {
                const kw = dest.toLowerCase();
                allAttractions = allAttractions.filter(a =>
                    a.name.toLowerCase().includes(kw) ||
                    a.location.toLowerCase().includes(kw) ||
                    a.city.toLowerCase().includes(kw)
                );
            }

            attRender();
        } catch (err) {
            console.error('Attraction load failed:', err);
            grid.innerHTML = `<div class="hotel-results-empty" style="grid-column:1/-1;">
                <div style="font-size:32px;margin-bottom:10px;">😕</div>
                <div style="font-weight:700;font-size:15px;margin-bottom:6px;">Unable to load attractions</div>
                <div style="font-size:13px;color:var(--gray-400);">Please make sure your local server is running.<br>
                <small>Error: ${err.message}</small></div>
            </div>`;
        }
    }

    // ── SEARCH BUTTON ─────────────────────────────────────────────
    function initSearch() {
        const cityInput = document.getElementById('attrCityInput');
        const destInput = document.getElementById('attrDestInput');
        const searchBtn = document.querySelector('#panel-attractions .search-btn');

        // Load all on page load
        loadAttractions('', '');

        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                const city = cityInput ? cityInput.value.trim() : '';
                const dest = destInput ? destInput.value.trim() : '';
                loadAttractions(city, dest);
            });
        }

        [cityInput, destInput].forEach(input => {
            if (!input) return;
            input.addEventListener('keydown', e => {
                if (e.key === 'Enter') {
                    const city = cityInput ? cityInput.value.trim() : '';
                    const dest = destInput ? destInput.value.trim() : '';
                    loadAttractions(city, dest);
                }
            });
        });
    }

    // ── ESC KEY ───────────────────────────────────────────────────
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') window.attCloseModal();
    });

    // ── INIT ──────────────────────────────────────────────────────
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSearch);
    } else {
        initSearch();
    }

})();