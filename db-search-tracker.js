(function () {
    const SERVICE_BY_PANEL_ID = {
        'panel-hotel': 'hotel',
        'panel-car': 'car',
        'panel-flights': 'flights',
        'panel-attractions': 'attractions',
        'panel-taxi': 'taxi',
    };

    const SERVICE_BY_BODY_CLASS = [
        { className: 'service-hotel', service: 'hotel' },
        { className: 'service-car', service: 'car' },
        { className: 'service-flights', service: 'flights' },
        { className: 'service-attractions', service: 'attractions' },
        { className: 'service-taxi', service: 'taxi' },
    ];

    function normalizeLabel(text) {
        return String(text || '')
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '');
    }

    function getServiceType(panel) {
        if (panel && SERVICE_BY_PANEL_ID[panel.id]) {
            return SERVICE_BY_PANEL_ID[panel.id];
        }

        for (const item of SERVICE_BY_BODY_CLASS) {
            if (document.body.classList.contains(item.className)) {
                return item.service;
            }
        }

        return 'hotel';
    }

    function extractFieldKey(input, fallbackIndex) {
        if (input.id) return input.id;
        if (input.name) return input.name;

        const fieldWrap = input.closest('.search-field, .fl-half, .fl-date-half');
        const fieldLabel = fieldWrap?.querySelector('.field-label');
        if (fieldLabel?.textContent) {
            const normalized = normalizeLabel(fieldLabel.textContent);
            if (normalized) return normalized;
        }

        const placeholder = normalizeLabel(input.getAttribute('placeholder') || '');
        if (placeholder) return placeholder;

        return `field_${fallbackIndex}`;
    }

    function getInputValue(input) {
        if (input.type === 'checkbox' || input.type === 'radio') {
            return input.checked;
        }

        return String(input.value || '').trim();
    }

    function collectSearchData(panel) {
        const searchData = {};

        const inputs = panel.querySelectorAll('input, select, textarea');
        let index = 1;
        inputs.forEach((input) => {
            const key = extractFieldKey(input, index++);
            const value = getInputValue(input);
            if (value === '' || value === null) return;
            searchData[key] = value;
        });

        const summaryMap = [
            'hotelGuestsLabel',
            'hotelRoomsLabel',
            'carAgeLabel',
            'passengerLabel',
            'cabinClassDisplay',
            'attractionsPassengerLabel',
            'taxiPassengerLabel',
        ];

        summaryMap.forEach((id) => {
            const element = panel.querySelector(`#${id}`) || document.getElementById(id);
            if (!element) return;
            const text = String(element.textContent || '').trim();
            if (!text) return;
            searchData[id] = text;
        });

        return searchData;
    }

    function getUserState() {
        try {
            const raw = window.localStorage.getItem('easyNavigateAuth');
            const parsed = raw ? JSON.parse(raw) : null;
            return parsed && typeof parsed === 'object' ? parsed : {};
        } catch (error) {
            return {};
        }
    }

    async function saveSearch(panel) {
        const payload = {
            serviceType: getServiceType(panel),
            pagePath: window.location.pathname,
            searchData: collectSearchData(panel),
            userState: getUserState(),
        };

        try {
            const response = await fetch('api/save_search.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                keepalive: true,
            });

            if (!response.ok) {
                console.warn('Search not saved. HTTP status:', response.status);
                return;
            }

            const result = await response.json();
            if (!result.ok) {
                console.warn('Search not saved:', result.message || 'Unknown server error');
            }
        } catch (error) {
            console.warn('Search save failed:', error);
        }
    }

    function bindSearchButtons() {
        const buttons = document.querySelectorAll('.search-btn');
        buttons.forEach((button) => {
            button.addEventListener('click', () => {
                const panel = button.closest('.search-panel');
                if (!panel) return;
                saveSearch(panel);
            });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bindSearchButtons);
    } else {
        bindSearchButtons();
    }
})();
