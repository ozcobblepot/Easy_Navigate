(function () {
    function getAuthState() {
        try {
            const raw = window.localStorage.getItem('easyNavigateAuth');
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            return parsed && parsed.isLoggedIn ? parsed : null;
        } catch (error) {
            return null;
        }
    }

    function updateHeaderAuthUi() {
        const authState = getAuthState();
        const signInButtons = document.querySelectorAll('.btn-signin');

        if (authState) {
            signInButtons.forEach((button) => {
                button.classList.add('profile-icon-btn');
                button.setAttribute('aria-label', 'Profile');
                button.innerHTML = '<i class="fas fa-user-circle" aria-hidden="true"></i>';
                button.onclick = () => { window.location.href = 'profile.html'; };
                button.dataset.authWired = '1';
            });
        } else {
            signInButtons.forEach((button) => {
                button.classList.remove('profile-icon-btn');
                button.removeAttribute('aria-label');
                button.innerHTML = 'Sign In / Register';
                button.onclick = () => {
                    if (typeof window.openAuthModal === 'function') {
                        window.openAuthModal('signin');
                    }
                };
                button.dataset.authWired = '1';
            });
        }
    }

    // Exposed so auth-modal.js can trigger a header refresh after sign-in
    window.updateHeaderForAuth = function () {
        updateHeaderAuthUi();
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', updateHeaderAuthUi);
    } else {
        updateHeaderAuthUi();
    }
})();