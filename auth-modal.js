/**
 * auth-modal.js
 * ─────────────────────────────────────────────────────────────
 * Injects the Sign In / Register modal into ANY page that
 * includes this script, then wires up:
 *   • openAuthModal(tab)  — open to 'signin' or 'register'
 *   • closeAuthModal()
 *   • requireAuth(callback) — gate any action behind sign-in
 * ─────────────────────────────────────────────────────────────
 */

(function () {
    'use strict';

    // ── 1. INJECT MODAL HTML ──────────────────────────────────
    const MODAL_HTML = `
<style>
.auth-modal{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(17,24,39,.52);z-index:9000;padding:20px;opacity:0;visibility:hidden;pointer-events:none;transition:opacity .24s ease,visibility .24s ease}
.auth-modal.open{opacity:1;visibility:visible;pointer-events:auto}
.auth-modal-shell{width:min(980px,100%);height:min(734px,calc(100vh - 40px));background:#fff;border-radius:12px;overflow:hidden;display:grid;grid-template-columns:1fr 1fr;position:relative;transform:translateY(18px) scale(.98);opacity:.92;transition:transform .26s ease,opacity .26s ease}
.auth-modal.open .auth-modal-shell{transform:translateY(0) scale(1);opacity:1}
.auth-modal-close{position:absolute;top:14px;right:14px;width:34px;height:34px;border:1px solid #d5dae2;border-radius:50%;background:#fff;color:#364152;cursor:pointer;font-size:16px;z-index:2;display:flex;align-items:center;justify-content:center}
.auth-modal-panel{display:flex;justify-content:center;align-items:stretch;background:#fff}
.auth-modal-inner{width:min(380px,100%);padding:42px 0 28px;display:flex;flex-direction:column;overflow-y:auto}
.auth-modal-inner::-webkit-scrollbar{width:0}
.auth-modal-logo{width:160px;height:auto;margin:0 auto 24px}
.auth-modal-divider{height:1px;background:#d8d8d8;margin-bottom:18px}
.auth-tabs{display:flex;border-bottom:2px solid #e8eaf0;margin-bottom:20px}
.auth-tab-btn{flex:1;padding:11px 0;font-family:'Inter',sans-serif;font-size:14px;font-weight:700;color:#8892aa;background:none;border:none;border-bottom:2.5px solid transparent;margin-bottom:-2px;cursor:pointer;transition:color .18s,border-color .18s;letter-spacing:-.1px}
.auth-tab-btn.active{color:#282D9E;border-bottom-color:#282D9E}
.auth-tab-btn:hover:not(.active){color:#1a2140}
.auth-form-panel{display:none}
.auth-form-panel.active{display:flex;flex-direction:column}
.auth-modal-input,.auth-modal-btn{width:100%;border-radius:3px;border:1px solid #d5dae2;min-height:45px;font-family:'Inter',sans-serif;font-size:16px;box-sizing:border-box}
.auth-modal-input{padding:0 16px;color:#273142;outline:none;background:#fff}
.auth-modal-input::placeholder{color:#a5acb7}
.auth-modal-btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;font-weight:700;cursor:pointer;transition:transform .14s,box-shadow .14s,background-color .14s}
.auth-modal-or-row{margin:20px 0 16px;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:10px}
.auth-modal-or-line{height:1px;background:#d7dce5}
.auth-modal-or-text{color:#a5acb7;font-weight:600;font-size:20px;line-height:1}
.auth-modal-social{display:grid;gap:12px}
.auth-modal-btn-google{background:#4b82e0;border-color:#4b82e0;color:#fff}
.auth-modal-btn-social{background:#fff;color:#252b36}
.auth-modal-icon{width:22px;display:inline-flex;justify-content:center;align-items:center;font-size:24px}
.auth-modal-facebook-icon{color:#1e78df}
.auth-modal-terms{margin:24px 0 0;color:#515864;font-size:13px;line-height:1.35}
.auth-modal-status{min-height:19px;margin-top:10px;color:#1f3f87;font-size:13px}
.auth-pw-wrap{position:relative}
.auth-pw-wrap .auth-modal-input{padding-right:44px}
.auth-pw-toggle{position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:#8892aa;font-size:15px;padding:0;display:flex;align-items:center;transition:color .15s}
.auth-pw-toggle:hover{color:#282D9E}
.auth-name-row{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.auth-strength-wrap{margin-top:-4px}
.auth-strength-bar{height:3px;border-radius:2px;background:#e8eaf0;overflow:hidden;margin-bottom:4px}
.auth-strength-fill{height:100%;border-radius:2px;width:0%;transition:width .3s ease,background .3s ease}
.auth-strength-label{font-size:11px;color:#8892aa}
.auth-forgot{text-align:right;margin-top:-4px;font-size:12px;font-weight:600;color:#282D9E;cursor:pointer;text-decoration:none;transition:opacity .15s;display:block}
.auth-forgot:hover{opacity:.75}
.auth-terms-check{display:flex;align-items:flex-start;gap:9px;font-size:12px;color:#515864;line-height:1.4;margin-top:2px;cursor:pointer}
.auth-terms-check input[type=checkbox]{width:15px;height:15px;margin-top:1px;accent-color:#282D9E;flex-shrink:0;cursor:pointer}
.auth-modal-btn-submit{background:#282D9E;border-color:#282D9E;color:#fff;opacity:.45;pointer-events:none}
.auth-modal-btn-submit.ready{opacity:1;pointer-events:auto}
.auth-modal-btn-submit:hover{background:#1f2480;border-color:#1f2480}
.auth-success-box{display:none;flex-direction:column;align-items:center;gap:10px;padding:32px 0 16px;text-align:center}
.auth-success-box.show{display:flex}
.auth-success-icon{font-size:48px;color:#16a34a}
.auth-success-title{font-size:18px;font-weight:800;color:#1a2140}
.auth-success-sub{font-size:13px;color:#8892aa}
.auth-modal-hero{position:relative;background:center/cover no-repeat url('assets/attractions-and-tours-bg.jpg')}
.auth-modal-hero-overlay{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.08) 0%,rgba(0,0,0,.26) 100%)}
.auth-modal-hero-logo{position:absolute;right:26px;bottom:24px;width:160px;z-index:1}
.auth-gate-toast{position:fixed;bottom:32px;left:50%;transform:translateX(-50%) translateY(12px);background:#1a2140;color:#fff;padding:14px 24px;border-radius:10px;font-family:'Inter',sans-serif;font-size:14px;font-weight:600;z-index:9100;opacity:0;pointer-events:none;transition:opacity .25s,transform .25s;white-space:nowrap;box-shadow:0 8px 32px rgba(0,0,0,.22);display:flex;align-items:center;gap:12px}
.auth-gate-toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
.auth-gate-toast-btn{background:#282D9E;color:#fff;border:none;border-radius:6px;padding:6px 14px;font-family:'Inter',sans-serif;font-size:13px;font-weight:700;cursor:pointer;flex-shrink:0}
.auth-gate-toast-btn:hover{background:#1f2480}
@media(max-width:900px){
  .auth-modal-shell{grid-template-columns:1fr;overflow-y:auto}
  .auth-modal-hero{min-height:220px;order:-1}
  .auth-modal-inner{width:min(460px,calc(100% - 30px));padding-top:28px}
}
</style>

<div class="auth-modal" id="authModal" aria-hidden="true">
  <div class="auth-modal-shell" role="dialog" aria-modal="true">
    <button class="auth-modal-close" id="authModalCloseBtn" aria-label="Close dialog"><i class="fa-solid fa-xmark"></i></button>
    <section class="auth-modal-panel">
      <div class="auth-modal-inner">
        <img class="auth-modal-logo" src="assets/easy-navigate-logo-blue.png" alt="EasyNavigate">
        <div class="auth-modal-divider" aria-hidden="true"></div>
        <div class="auth-tabs" role="tablist">
          <button class="auth-tab-btn active" id="authTabSignin" role="tab" aria-selected="true"
                  onclick="authSwitchTab('signin')">Sign In</button>
          <button class="auth-tab-btn" id="authTabRegister" role="tab" aria-selected="false"
                  onclick="authSwitchTab('register')">Create Account</button>
        </div>

        <!-- SIGN IN PANEL -->
        <div class="auth-form-panel active" id="authPanelSignin" role="tabpanel">
          <div style="display:flex;flex-direction:column;gap:10px;">
            <input id="siEmail" type="email" class="auth-modal-input" placeholder="Email address" autocomplete="email">
            <div class="auth-pw-wrap">
              <input id="siPassword" type="password" class="auth-modal-input" placeholder="Password" autocomplete="current-password">
              <button type="button" class="auth-pw-toggle" onclick="authTogglePw('siPassword',this)" tabindex="-1" aria-label="Show/hide password"><i class="fa-solid fa-eye"></i></button>
            </div>
            <a class="auth-forgot" onclick="authForgotPassword()">Forgot password?</a>
            <button type="button" id="siSubmitBtn" class="auth-modal-btn auth-modal-btn-submit" onclick="authSignIn()">Sign In</button>
          </div>
          <div class="auth-modal-or-row" aria-hidden="true">
            <span class="auth-modal-or-line"></span>
            <span class="auth-modal-or-text">or</span>
            <span class="auth-modal-or-line"></span>
          </div>
          <div class="auth-modal-social">
            <button type="button" class="auth-modal-btn auth-modal-btn-google" onclick="handleGoogleSignIn()">
              <span class="auth-modal-icon"><i class="fa-brands fa-google"></i></span><span>Continue with Google</span>
            </button>
            <button type="button" class="auth-modal-btn auth-modal-btn-social" onclick="authSocial('microsoft')">
              <span class="auth-modal-icon"><i class="fa-brands fa-microsoft"></i></span><span>Continue with Microsoft</span>
            </button>
            <button type="button" class="auth-modal-btn auth-modal-btn-social" onclick="authSocial('facebook')">
              <span class="auth-modal-icon auth-modal-facebook-icon"><i class="fa-brands fa-facebook-f"></i></span><span>Continue with Facebook</span>
            </button>
          </div>
          <p class="auth-modal-terms" style="margin-top:16px;">
            By signing in you agree to Easy Navigate's
            <a href="#" style="color:#282D9E;">Terms</a> &amp;
            <a href="#" style="color:#282D9E;">Privacy Policy</a>.
          </p>
          <p id="siStatus" class="auth-modal-status" role="status" aria-live="polite"></p>
        </div>

        <!-- REGISTER PANEL -->
        <div class="auth-form-panel" id="authPanelRegister" role="tabpanel">
          <div class="auth-success-box" id="regSuccess">
            <div class="auth-success-icon"><i class="fa-solid fa-circle-check"></i></div>
            <div class="auth-success-title">Account Created!</div>
            <div class="auth-success-sub">Welcome to Easy Navigate.<br>Please sign in to continue.</div>
            <button type="button" class="auth-modal-btn auth-modal-btn-submit ready"
                    style="margin-top:8px;" onclick="authSwitchTab('signin')">Go to Sign In</button>
          </div>
          <div id="regForm" style="display:flex;flex-direction:column;gap:10px;">
            <div class="auth-name-row">
              <input id="regFirstName" type="text" class="auth-modal-input" placeholder="First name" autocomplete="given-name">
              <input id="regLastName"  type="text" class="auth-modal-input" placeholder="Last name"  autocomplete="family-name">
            </div>
            <input id="regEmail" type="email" class="auth-modal-input" placeholder="Email address" autocomplete="email">
            <div class="auth-pw-wrap">
              <input id="regPassword" type="password" class="auth-modal-input"
                     placeholder="Password (min. 8 characters)" autocomplete="new-password"
                     oninput="authCheckPwStrength(this.value)">
              <button type="button" class="auth-pw-toggle" onclick="authTogglePw('regPassword',this)" tabindex="-1" aria-label="Show/hide password"><i class="fa-solid fa-eye"></i></button>
            </div>
            <div class="auth-strength-wrap" id="regStrengthWrap" style="display:none;">
              <div class="auth-strength-bar"><div class="auth-strength-fill" id="regStrengthFill"></div></div>
              <span class="auth-strength-label" id="regStrengthLabel"></span>
            </div>
            <div class="auth-pw-wrap">
              <input id="regConfirmPw" type="password" class="auth-modal-input" placeholder="Confirm password" autocomplete="new-password">
              <button type="button" class="auth-pw-toggle" onclick="authTogglePw('regConfirmPw',this)" tabindex="-1" aria-label="Show/hide password"><i class="fa-solid fa-eye"></i></button>
            </div>
            <label class="auth-terms-check">
              <input type="checkbox" id="regTerms" onchange="authCheckRegReady()">
              I agree to Easy Navigate's <a href="#" style="color:#282D9E;margin-left:3px;">Terms &amp; Privacy Policy</a>
            </label>
            <button type="button" id="regSubmitBtn" class="auth-modal-btn auth-modal-btn-submit" onclick="authRegister()">Create Account</button>
          </div>
          <p id="regStatus" class="auth-modal-status" role="status" aria-live="polite"></p>
        </div>

      </div>
    </section>
    <section class="auth-modal-hero" aria-hidden="true">
      <div class="auth-modal-hero-overlay"></div>
      <img class="auth-modal-hero-logo" src="assets/easy-navigate-logo-white.png" alt="">
    </section>
  </div>
</div>

<div class="auth-gate-toast" id="authGateToast">
  <span id="authGateToastMsg">Please sign in to continue</span>
  <button class="auth-gate-toast-btn" onclick="openAuthModal('signin')">Sign In</button>
</div>`;
    // ── END OF MODAL_HTML TEMPLATE LITERAL ────────────────────

    if (!document.getElementById('authModal')) {
        document.body.insertAdjacentHTML('afterbegin', MODAL_HTML);
    }

    // ── 2. HELPERS ────────────────────────────────────────────

    function getApiUrl(path) {
        if (window.location.protocol === 'file:')
            return 'http://localhost/platform-technologies-proj-v1-main/api/' + path;
        const href = window.location.href.split('?')[0];
        const base = href.substring(0, href.lastIndexOf('/') + 1);
        return base + 'api/' + path;
    }

    // ── SINGLE SOURCE OF TRUTH for auth check ─────────────────
    function isSignedIn() {
        try {
            const auth = JSON.parse(localStorage.getItem('easyNavigateAuth'));
            return !!(auth && auth.isLoggedIn);
        } catch (_) { return false; }
    }
    window.isSignedIn = isSignedIn;

    // ── 3. TOAST ──────────────────────────────────────────────

    let toastTimer = null;
    window.showAuthGateToast = function (msg) {
        const toast = document.getElementById('authGateToast');
        const msgEl = document.getElementById('authGateToastMsg');
        if (!toast) return;
        if (msgEl) msgEl.textContent = msg || 'Please sign in to continue';
        toast.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.classList.remove('show'), 4000);
    };
    window.showAuthToast = window.showAuthGateToast;

    // ── 4. AUTH GATE ──────────────────────────────────────────

    window.requireAuth = function (callback, message) {
        if (isSignedIn()) {
            if (typeof callback === 'function') callback();
            return;
        }
        window._authPendingAction = callback || null;
        window.showAuthGateToast(message || 'Please sign in to continue');
        setTimeout(() => window.openAuthModal('signin'), 300);
    };

    // ── 5. MODAL OPEN / CLOSE ─────────────────────────────────

    window.openAuthModal = function (tab) {
        const m = document.getElementById('authModal');
        if (!m) return;
        const sw = window.innerWidth - document.documentElement.clientWidth;
        document.body.style.overflow = 'hidden';
        document.body.style.paddingRight = sw > 0 ? sw + 'px' : '';
        m.classList.add('open');
        m.setAttribute('aria-hidden', 'false');
        authSwitchTab(tab || 'signin');
        const si = document.getElementById('siStatus');
        const re = document.getElementById('regStatus');
        if (si) si.textContent = '';
        if (re) re.textContent = '';
    };

    window.closeAuthModal = function () {
        const m = document.getElementById('authModal');
        if (!m) return;
        m.classList.remove('open');
        m.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
    };

    // ── 6. TAB SWITCH ─────────────────────────────────────────

    window.authSwitchTab = function (tab) {
        const signinTab     = document.getElementById('authTabSignin');
        const registerTab   = document.getElementById('authTabRegister');
        const signinPanel   = document.getElementById('authPanelSignin');
        const registerPanel = document.getElementById('authPanelRegister');
        if (!signinTab || !registerTab || !signinPanel || !registerPanel) return;

        if (tab === 'signin') {
            signinTab.classList.add('active');      signinTab.setAttribute('aria-selected', 'true');
            registerTab.classList.remove('active'); registerTab.setAttribute('aria-selected', 'false');
            signinPanel.classList.add('active');
            registerPanel.classList.remove('active');
            setTimeout(() => document.getElementById('siEmail')?.focus(), 80);
        } else {
            registerTab.classList.add('active');   registerTab.setAttribute('aria-selected', 'true');
            signinTab.classList.remove('active');  signinTab.setAttribute('aria-selected', 'false');
            registerPanel.classList.add('active');
            signinPanel.classList.remove('active');
            const suc = document.getElementById('regSuccess');
            const frm = document.getElementById('regForm');
            if (suc) suc.classList.remove('show');
            if (frm) frm.style.display = 'flex';
            setTimeout(() => document.getElementById('regFirstName')?.focus(), 80);
        }
    };

    // ── 7. GOOGLE SIGN-IN — safe wrapper ─────────────────────
    // signInWithGoogle() is defined in firebase-config.js which loads
    // BEFORE auth-modal.js on every page. This wrapper checks it exists
    // at click-time (not at script-parse time) so it always works.

    window.handleGoogleSignIn = function () {
        const status = document.getElementById('siStatus');
        if (typeof window.signInWithGoogle === 'function') {
            window.signInWithGoogle();
        } else {
            // Firebase not loaded on this page — show a clear error
            if (status) {
                status.textContent = 'Google sign-in is not available. Please use email/password.';
                status.style.color = '#b62020';
            }
            console.error('signInWithGoogle() is not defined. Make sure firebase-config.js loads before auth-modal.js.');
        }
    };

    // ── 8. PASSWORD UTILS ─────────────────────────────────────

    window.authTogglePw = function (inputId, btn) {
        const inp = document.getElementById(inputId);
        if (!inp) return;
        const isHidden = inp.type === 'password';
        inp.type = isHidden ? 'text' : 'password';
        const icon = btn.querySelector('i');
        if (icon) icon.className = isHidden ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
    };

    window.authCheckPwStrength = function (pw) {
        const wrap = document.getElementById('regStrengthWrap');
        const fill = document.getElementById('regStrengthFill');
        const lbl  = document.getElementById('regStrengthLabel');
        if (!wrap || !fill || !lbl) return;
        if (!pw) { wrap.style.display = 'none'; authCheckRegReady(); return; }
        wrap.style.display = 'block';
        let score = 0;
        if (pw.length >= 8)           score++;
        if (pw.length >= 12)          score++;
        if (/[A-Z]/.test(pw))         score++;
        if (/[0-9]/.test(pw))         score++;
        if (/[^A-Za-z0-9]/.test(pw))  score++;
        const levels = [
            { pct: '20%', bg: '#ef4444', txt: 'Very weak'   },
            { pct: '40%', bg: '#f97316', txt: 'Weak'        },
            { pct: '60%', bg: '#eab308', txt: 'Fair'        },
            { pct: '80%', bg: '#22c55e', txt: 'Strong'      },
            { pct:'100%', bg: '#16a34a', txt: 'Very strong' },
        ];
        const level = levels[Math.min(score - 1, 4)] || levels[0];
        fill.style.width      = level.pct;
        fill.style.background = level.bg;
        lbl.textContent       = level.txt;
        lbl.style.color       = level.bg;
        authCheckRegReady();
    };

    window.authCheckRegReady = function () {
        const btn   = document.getElementById('regSubmitBtn');
        const fname = document.getElementById('regFirstName')?.value.trim();
        const lname = document.getElementById('regLastName')?.value.trim();
        const email = document.getElementById('regEmail')?.value.trim();
        const pw    = document.getElementById('regPassword')?.value;
        const cpw   = document.getElementById('regConfirmPw')?.value;
        const terms = document.getElementById('regTerms')?.checked;
        if (!btn) return;
        const ready = !!(fname && lname && email && pw && pw.length >= 8 && pw === cpw && terms);
        btn.classList.toggle('ready', ready);
    };

    // ── 9. SIGN IN ────────────────────────────────────────────

    window.authSignIn = async function () {
        const email  = document.getElementById('siEmail')?.value.trim();
        const pw     = document.getElementById('siPassword')?.value;
        const status = document.getElementById('siStatus');
        const btn    = document.getElementById('siSubmitBtn');
        if (!email || !pw) return;

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            if (status) { status.textContent = 'Please enter a valid email address.'; status.style.color = '#b62020'; }
            return;
        }

        if (btn) { btn.disabled = true; btn.textContent = 'Signing in…'; }
        if (status) status.textContent = '';

        try {
            const res  = await fetch(getApiUrl('signin.php'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password: pw }),
            });
            const data = await res.json();

            if (data.ok) {
                const auth = {
                    isLoggedIn : true,
                    id         : data.user.id,
                    email      : data.user.email,
                    name       : data.user.first_name + ' ' + data.user.last_name,
                };
                localStorage.setItem('easyNavigateAuth', JSON.stringify(auth));

                if (status) { status.textContent = 'Signed in successfully!'; status.style.color = '#16a34a'; }
                if (typeof window.updateHeaderForAuth === 'function') window.updateHeaderForAuth(auth);

                setTimeout(() => {
                    window.closeAuthModal();
                    if (typeof window._authPendingAction === 'function') {
                        const fn = window._authPendingAction;
                        window._authPendingAction = null;
                        setTimeout(fn, 200);
                    } else {
                        location.reload();
                    }
                }, 800);

            } else {
                if (status) { status.textContent = data.message || 'Sign in failed.'; status.style.color = '#b62020'; }
            }
        } catch (_) {
            if (status) { status.textContent = 'Could not connect to server. Please try again.'; status.style.color = '#b62020'; }
        } finally {
            if (btn) { btn.disabled = false; btn.textContent = 'Sign In'; }
        }
    };

    // ── 10. REGISTER ──────────────────────────────────────────

    window.authRegister = async function () {
        const fname  = document.getElementById('regFirstName')?.value.trim();
        const lname  = document.getElementById('regLastName')?.value.trim();
        const email  = document.getElementById('regEmail')?.value.trim();
        const pw     = document.getElementById('regPassword')?.value;
        const cpw    = document.getElementById('regConfirmPw')?.value;
        const terms  = document.getElementById('regTerms')?.checked;
        const status = document.getElementById('regStatus');
        const btn    = document.getElementById('regSubmitBtn');

        if (!fname || !lname || !email || !pw || !cpw) return;

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            if (status) { status.textContent = 'Please enter a valid email address.'; status.style.color = '#b62020'; }
            return;
        }
        if (pw.length < 8) {
            if (status) { status.textContent = 'Password must be at least 8 characters.'; status.style.color = '#b62020'; }
            return;
        }
        if (pw !== cpw) {
            if (status) { status.textContent = 'Passwords do not match.'; status.style.color = '#b62020'; }
            return;
        }
        if (!terms) {
            if (status) { status.textContent = 'Please agree to the Terms & Privacy Policy.'; status.style.color = '#b62020'; }
            return;
        }

        if (btn) { btn.disabled = true; btn.textContent = 'Creating account…'; }
        if (status) status.textContent = '';

        try {
            const res  = await fetch(getApiUrl('register.php'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ first_name: fname, last_name: lname, email, password: pw }),
            });
            const data = await res.json();

            if (data.ok) {
                const frm = document.getElementById('regForm');
                const suc = document.getElementById('regSuccess');
                if (frm) frm.style.display = 'none';
                if (suc) suc.classList.add('show');
            } else {
                if (status) { status.textContent = data.message || 'Registration failed.'; status.style.color = '#b62020'; }
                if (res.status === 400 && (data.message || '').toLowerCase().includes('already exists')) {
                    setTimeout(() => authSwitchTab('signin'), 1600);
                }
            }
        } catch (_) {
            if (status) { status.textContent = 'Could not connect to server. Please try again.'; status.style.color = '#b62020'; }
        } finally {
            if (btn) { btn.disabled = false; btn.textContent = 'Create Account'; authCheckRegReady(); }
        }
    };

    // ── 11. SOCIAL / FORGOT ───────────────────────────────────

    window.authSocial = function (provider) {
        const auth = {
            isLoggedIn : true,
            email      : provider + '_user@easynav.com',
            name       : 'Easy Navigate User',
            provider,
        };
        localStorage.setItem('easyNavigateAuth', JSON.stringify(auth));
        if (typeof window.updateHeaderForAuth === 'function') window.updateHeaderForAuth(auth);
        window.closeAuthModal();

        if (typeof window._authPendingAction === 'function') {
            const fn = window._authPendingAction;
            window._authPendingAction = null;
            setTimeout(fn, 200);
        } else {
            setTimeout(() => location.reload(), 200);
        }
    };

    window.authForgotPassword = function () {
        const email  = document.getElementById('siEmail')?.value.trim();
        const status = document.getElementById('siStatus');
        if (!email) {
            if (status) { status.textContent = 'Enter your email above, then click Forgot password.'; status.style.color = '#1f3f87'; }
            return;
        }
        if (status) { status.textContent = 'Password reset link sent to ' + email; status.style.color = '#16a34a'; }
    };

    // ── 12. WIRE EVENTS ON DOM READY ─────────────────────────

    document.addEventListener('DOMContentLoaded', function () {
        const closeBtn = document.getElementById('authModalCloseBtn');
        const modal    = document.getElementById('authModal');
        const shell    = document.querySelector('.auth-modal-shell');

        if (closeBtn) closeBtn.addEventListener('click', window.closeAuthModal);
        if (modal)    modal.addEventListener('click', window.closeAuthModal);
        if (shell)    shell.addEventListener('click', e => e.stopPropagation());

        // Wire the header Sign In / Register button
        const openBtn = document.getElementById('openAuthModalBtn');
        if (openBtn && !openBtn.dataset.authWired) {
            openBtn.dataset.authWired = '1';
            openBtn.addEventListener('click', () => window.openAuthModal('signin'));
        }

        // Real-time register validation
        ['regFirstName', 'regLastName', 'regEmail', 'regConfirmPw'].forEach(id => {
            document.getElementById(id)?.addEventListener('input', authCheckRegReady);
        });

        // Sign-in button enable/disable
        ['siEmail', 'siPassword'].forEach(id => {
            document.getElementById(id)?.addEventListener('input', () => {
                const btn     = document.getElementById('siSubmitBtn');
                const emailOk = document.getElementById('siEmail')?.value.trim();
                const pwOk    = document.getElementById('siPassword')?.value;
                if (btn) btn.classList.toggle('ready', !!(emailOk && pwOk));
            });
        });

        // Escape key
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') window.closeAuthModal();
        });

        // Gate booking buttons after cards render
        setTimeout(gateBookingButtons, 800);

        // Watch for dynamically added cards (hotel results list)
        const observerTarget = document.getElementById('hotelResultsList') || document.body;
        const observer = new MutationObserver(() => gateBookingButtons());
        observer.observe(observerTarget, { childList: true, subtree: true });
    });

    // ── 13. GATE BOOKING BUTTONS ─────────────────────────────
    // NOTE: .check-avail-btn is NOT in this list because hotel & homes.html
    // calls onCheckAvail() → requireAuth() directly. Adding it here would
    // double-wrap the button and break the pending-action callback chain.

    function gateBookingButtons() {
        const selectors = [
            '[data-requires-auth]',
            '.check-availability-btn',
            '.reserve-room-btn',
            '.book-now-btn',
            '.confirm-booking-btn',
            '.proceed-checkout-btn',
        ];

        selectors.forEach(sel => {
            document.querySelectorAll(sel).forEach(btn => {
                if (btn.dataset.authGated) return;
                btn.dataset.authGated = '1';

                const originalOnclick = btn.onclick;
                btn.onclick = null;

                btn.addEventListener('click', function (e) {
                    if (!isSignedIn()) {
                        e.preventDefault();
                        e.stopImmediatePropagation();
                        window.requireAuth(
                            function () {
                                if (typeof originalOnclick === 'function') originalOnclick.call(btn, e);
                            },
                            'Sign in to book this property'
                        );
                        return false;
                    }
                    if (typeof originalOnclick === 'function') originalOnclick.call(btn, e);
                }, true);
            });
        });
    }

    window.gateBookingButtons = gateBookingButtons;

})();