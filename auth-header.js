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
        if (!authState) return;

        const signInButtons = document.querySelectorAll('.btn-signin');
        signInButtons.forEach((button) => {
            button.classList.add('profile-icon-btn');
            button.setAttribute('aria-label', 'Profile');
            button.innerHTML = '<i class="fas fa-user-circle" aria-hidden="true"></i>';
            button.onclick = () => {
                window.location.href = 'auth-success.html';
            };
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', updateHeaderAuthUi);
    } else {
        updateHeaderAuthUi();
    }
})();
