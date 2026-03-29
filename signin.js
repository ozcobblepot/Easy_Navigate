import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth,
  GoogleAuthProvider,
  FacebookAuthProvider,
  OAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  sendSignInLinkToEmail
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  getFirestore,
  doc,
  setDoc,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

/* ================================
   FIREBASE CONFIG (FIXED)
================================ */

const firebaseConfig = {
  apiKey: "AIzaSyDyVKb4_FYZE2mqphGqOp67GIb15WlcBv4",
  authDomain: "easy-navigate.firebaseapp.com",
  projectId: "easy-navigate",
  storageBucket: "easy-navigate.firebasestorage.app",
  messagingSenderId: "308818127740",
  appId: "1:308818127740:web:88bb9ef3e5a41c986d52f9",
  measurementId: "G-Y5YDMC35R7"
};

/* ================================
   INITIALIZE FIREBASE
================================ */

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* ================================
   EMAIL LINK SETTINGS
================================ */

const actionCodeSettings = {
  url: window.location.origin,
  handleCodeInApp: true
};

/* ================================
   DOM ELEMENTS
================================ */

const emailForm = document.getElementById('emailAuthForm');
const emailInput = document.getElementById('emailInput');
const emailContinueBtn = document.getElementById('emailContinueBtn');
const googleBtn = document.getElementById('googleBtn');
const microsoftBtn = document.getElementById('microsoftBtn');
const facebookBtn = document.getElementById('facebookBtn');
const authStatus = document.getElementById('authStatus');

/* ================================
   HELPERS
================================ */

function setStatus(message, isError = false) {
  authStatus.textContent = message;
  authStatus.classList.toggle('error', isError);
}

function emailLooksValid(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/* ================================
   EMAIL INPUT HANDLING
================================ */

emailInput.addEventListener('input', () => {
  const valid = emailLooksValid(emailInput.value.trim());
  emailContinueBtn.disabled = !valid;
  emailContinueBtn.classList.toggle('enabled', valid);

  if (!valid) setStatus('');
});

/* ================================
   SAVE USER TO FIRESTORE
================================ */

async function persistUser(user, providerName) {
  try {
    await setDoc(
      doc(db, 'users', user.uid),
      {
        uid: user.uid,
        email: user.email ?? null,
        displayName: user.displayName ?? null,
        provider: providerName,
        photoURL: user.photoURL ?? null,
        lastLoginAt: serverTimestamp(),
        createdAt: serverTimestamp()
      },
      { merge: true }
    );
    return { saved: true };
  } catch (error) {
    return { saved: false, reason: error?.message };
  }
}

/* ================================
   OAUTH LOGIN
================================ */

async function doOAuthLogin(provider, providerLabel) {
  try {
    setStatus(`Connecting ${providerLabel}...`);
    const result = await signInWithPopup(auth, provider);
    const saveResult = await persistUser(result.user, providerLabel);

    if (saveResult.saved) {
      setStatus(`Signed in with ${providerLabel}. User saved.`);
    } else {
      setStatus(`Signed in with ${providerLabel}. Save skipped.`);
    }

    redirectToSuccessPage(result.user, providerLabel);
  } catch (error) {
    if (shouldFallbackToRedirect(error)) {
      setStatus(`Popup blocked. Redirecting to ${providerLabel}...`);
      await signInWithRedirect(auth, provider);
      return;
    }
    setStatus(mapAuthError(error, providerLabel), true);
  }
}

/* ================================
   REDIRECT LOGIN HANDLER
================================ */

async function handleRedirectLogin() {
  try {
    const result = await getRedirectResult(auth);
    if (!result?.user) return;

    const providerLabel = providerLabelFromId(result.providerId);
    await persistUser(result.user, providerLabel);
    setStatus(`Signed in with ${providerLabel}.`);
    redirectToSuccessPage(result.user, providerLabel);
  } catch (error) {
    setStatus(mapAuthError(error, 'provider'), true);
  }
}

handleRedirectLogin();

/* ================================
   ERROR HELPERS
================================ */

function providerLabelFromId(providerId) {
  if (providerId === 'google.com') return 'Google';
  if (providerId === 'microsoft.com') return 'Microsoft';
  if (providerId === 'facebook.com') return 'Facebook';
  return 'provider';
}

function redirectToSuccessPage(user, providerLabel) {
  cacheAuthSession(user, providerLabel);

  const params = new URLSearchParams({
    provider: providerLabel,
    name: user?.displayName || '',
    email: user?.email || ''
  });

  window.location.href = `auth-success.html?${params.toString()}`;
}

function cacheAuthSession(user, providerLabel) {
  const authState = {
    isLoggedIn: true,
    uid: user?.uid || '',
    provider: providerLabel || '',
    name: user?.displayName || '',
    email: user?.email || '',
    photoURL: user?.photoURL || '',
    loggedInAt: Date.now()
  };

  window.localStorage.setItem('easyNavigateAuth', JSON.stringify(authState));
}

function shouldFallbackToRedirect(error) {
  const code = error?.code || '';
  return (
    code === 'auth/popup-blocked' ||
    code === 'auth/popup-closed-by-user' ||
    code === 'auth/cancelled-popup-request'
  );
}

function mapAuthError(error, providerLabel) {
  const code = error?.code || '';

  if (code === 'auth/operation-not-allowed')
    return `${providerLabel} sign-in is not enabled.`;

  if (code === 'auth/unauthorized-domain')
    return `This domain is not authorized in Firebase.`;

  if (code === 'auth/account-exists-with-different-credential')
    return `Account exists with a different sign-in method.`;

  if (code === 'auth/popup-closed-by-user')
    return `${providerLabel} sign-in cancelled.`;

  return error?.message || `Unable to sign in with ${providerLabel}.`;
}

/* ================================
   EMAIL LINK SIGN-IN
================================ */

emailForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const email = emailInput.value.trim();
  if (!emailLooksValid(email)) {
    setStatus('Please enter a valid email.', true);
    return;
  }

  try {
    setStatus('Sending sign-in link...');
    await sendSignInLinkToEmail(auth, email, actionCodeSettings);
    window.localStorage.setItem('emailForSignIn', email);
    setStatus('Sign-in link sent. Check your inbox.');
  } catch (error) {
    setStatus(error?.message || 'Unable to send email.', true);
  }
});

/* ================================
   BUTTON HANDLERS
================================ */

googleBtn.addEventListener('click', () => {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  doOAuthLogin(provider, 'Google');
});

microsoftBtn.addEventListener('click', () => {
  const provider = new OAuthProvider('microsoft.com');
  provider.addScope('openid');
  provider.addScope('profile');
  provider.addScope('email');
  provider.setCustomParameters({ prompt: 'select_account' });
  doOAuthLogin(provider, 'Microsoft');
});

facebookBtn.addEventListener('click', () => {
  const provider = new FacebookAuthProvider();
  provider.addScope('email');
  doOAuthLogin(provider, 'Facebook');
});