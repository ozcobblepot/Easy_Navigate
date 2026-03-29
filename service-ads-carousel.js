function initServiceAdsCarousel(carousel) {
    if (!carousel) return;

    const viewport = carousel.querySelector('.service-ads-viewport');
    const track = carousel.querySelector('.service-ads-track');
    const prevBtn = carousel.querySelector('.service-ads-prev');
    const nextBtn = carousel.querySelector('.service-ads-next');
    if (!viewport || !track || !prevBtn || !nextBtn) return;

    const baseItems = Array.from(track.children);
    const originalCount = baseItems.length;
    const visibleCount = 3;

    if (originalCount <= visibleCount) {
        prevBtn.style.display = 'none';
        nextBtn.style.display = 'none';
        return;
    }

    const headClones = baseItems.slice(-visibleCount).map((item) => item.cloneNode(true));
    const tailClones = baseItems.slice(0, visibleCount).map((item) => item.cloneNode(true));

    headClones.forEach((item) => track.insertBefore(item, track.firstChild));
    tailClones.forEach((item) => track.appendChild(item));

    let currentIndex = visibleCount;
    let animating = false;

    function getStepWidth() {
        const first = track.children[0];
        const second = track.children[1];
        if (!first) return 0;
        if (!second) return first.getBoundingClientRect().width;
        return second.offsetLeft - first.offsetLeft;
    }

    function setPosition(animated) {
        const step = getStepWidth();
        track.style.transition = animated ? 'transform 0.55s ease' : 'none';
        track.style.transform = `translateX(${-currentIndex * step}px)`;
    }

    function moveBy(delta) {
        if (animating) return;
        animating = true;
        currentIndex += delta;
        setPosition(true);
    }

    prevBtn.addEventListener('click', () => moveBy(-1));
    nextBtn.addEventListener('click', () => moveBy(1));

    track.addEventListener('transitionend', () => {
        if (currentIndex >= originalCount + visibleCount) {
            currentIndex = visibleCount;
            setPosition(false);
        } else if (currentIndex < visibleCount) {
            currentIndex = originalCount + currentIndex;
            setPosition(false);
        }
        animating = false;
    });

    window.addEventListener('resize', () => setPosition(false));

    setPosition(false);
}

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.service-ads-carousel').forEach((carousel) => {
        initServiceAdsCarousel(carousel);
    });
});
