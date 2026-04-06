// firebase-config.js
// ─────────────────────────────────────────────────────────────
// 1. Initialises Firebase
// 2. Defines window.signInWithGoogle()  ← called by auth-modal.js
// 3. Runs auth-header logic (updates the Sign In button in the header)
// ─────────────────────────────────────────────────────────────

const firebaseConfig = {
    apiKey           : "AIzaSyArYBTcN6iAoUhi3OML-Es8lVzkdRN09Tc",
    authDomain       : "easynavigate-1dd3b.firebaseapp.com",
    projectId        : "easynavigate-1dd3b",
    storageBucket    : "easynavigate-1dd3b.firebasestorage.app",
    messagingSenderId: "36429516844",
    appId            : "1:36429516844:web:19544d6e5329afceb28189",
    measurementId    : "G-WVEHLHHS30"
};

// Guard: only initialise once (matters if the script is ever loaded twice)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// ── GOOGLE SIGN-IN ────────────────────────────────────────────
// auth-modal.js calls handleGoogleSignIn() which calls this function.
// Defined on window so every page can reach it.

window.signInWithGoogle = function () {
    const provider = new firebase.auth.GoogleAuthProvider();

    firebase.auth().signInWithPopup(provider)
        .then(function (result) {
            const user = result.user;

            // Split displayName into first / last for profile-page compatibility
            const nameParts = (user.displayName || '').trim().split(' ');
            const firstName = nameParts[0] || '';
            const lastName  = nameParts.slice(1).join(' ') || '';

            const auth = {
                isLoggedIn   : true,
                email        : user.email,       // used everywhere
                displayEmail : user.email,       // explicit alias for profile page
                name         : user.displayName || (firstName + ' ' + lastName).trim(),
                firstName    : firstName,
                lastName     : lastName,
                photo        : user.photoURL,
                uid          : user.uid,
                provider     : 'google',
                // No `id` field — Google users have no DB row.
                // profile.js handles id === undefined gracefully.
            };

            localStorage.setItem('easyNavigateAuth', JSON.stringify(auth));

            // Update the header button immediately
            if (typeof window.updateHeaderForAuth === 'function') {
                window.updateHeaderForAuth(auth);
            }

            // Close the auth modal
            if (typeof window.closeAuthModal === 'function') {
                window.closeAuthModal();
            }

            // Run any pending auth-gated action (e.g. "Check Availability"),
            // otherwise reload so the header reflects the signed-in state.
            if (typeof window._authPendingAction === 'function') {
                const fn = window._authPendingAction;
                window._authPendingAction = null;
                setTimeout(fn, 200);
            } else {
                setTimeout(() => location.reload(), 200);
            }
        })
        .catch(function (error) {
            const status = document.getElementById('siStatus');
            if (status) {
                status.textContent = 'Google sign-in failed: ' + error.message;
                status.style.color = '#b62020';
            }
            console.error('Google sign-in error:', error);
        });
};

// ── AUTH-HEADER LOGIC ─────────────────────────────────────────
// Reads localStorage and flips the header button between
// "Sign In / Register" and the profile icon.

(function () {
    function getAuthState() {
        try {
            const raw = window.localStorage.getItem('easyNavigateAuth');
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            return (parsed && parsed.isLoggedIn) ? parsed : null;
        } catch (_) {
            return null;
        }
    }

    function updateHeaderAuthUi() {
        const authState     = getAuthState();
        const signInButtons = document.querySelectorAll('.btn-signin');

        if (authState) {
            signInButtons.forEach(function (button) {
                button.classList.add('profile-icon-btn');
                button.setAttribute('aria-label', 'Profile');
                button.innerHTML         = '<i class="fa-solid fa-user-circle" aria-hidden="true"></i>';
                button.onclick           = function () { window.location.href = 'profile.html'; };
                button.dataset.authWired = '1';
            });
        } else {
            signInButtons.forEach(function (button) {
                button.classList.remove('profile-icon-btn');
                button.removeAttribute('aria-label');
                button.innerHTML = 'Sign In / Register';
                button.onclick   = function () {
                    if (typeof window.openAuthModal === 'function') {
                        window.openAuthModal('signin');
                    }
                };
                button.dataset.authWired = '1';
            });
        }
    }

    // Exposed so auth-modal.js can call it after a successful sign-in
    window.updateHeaderForAuth = function () {
        updateHeaderAuthUi();
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', updateHeaderAuthUi);
    } else {
        updateHeaderAuthUi();
    }
})();