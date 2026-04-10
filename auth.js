// Auth UI controller — runs before the main app initialises

function showAuthScreen() {
  document.getElementById('authScreen').style.display = 'flex';
  document.getElementById('appRoot').style.display = 'none';
}

function hideAuthScreen() {
  document.getElementById('authScreen').style.display = 'none';
  document.getElementById('appRoot').style.display = '';
}

function switchAuthTab(tab) {
  document.getElementById('authLoginForm').style.display  = tab === 'login'    ? 'block' : 'none';
  document.getElementById('authRegisterForm').style.display = tab === 'register' ? 'block' : 'none';
  document.getElementById('authTabLogin').classList.toggle('active', tab === 'login');
  document.getElementById('authTabRegister').classList.toggle('active', tab === 'register');
  document.getElementById('authError').textContent = '';
}

function setAuthError(msg) {
  const el = document.getElementById('authError');
  el.textContent = msg;
  el.style.display = msg ? 'block' : 'none';
}

function setAuthLoading(loading) {
  document.querySelectorAll('.auth-submit-btn').forEach(btn => {
    btn.disabled = loading;
    btn.textContent = loading ? 'Please wait…' : btn.dataset.label;
  });
}

async function handleLogin(e) {
  e.preventDefault();
  const email    = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  setAuthError('');
  setAuthLoading(true);
  try {
    const { token, user } = await api.auth.login(email, password);
    setToken(token);
    setStoredUser(user);
    hideAuthScreen();
    await initApp();
  } catch (err) {
    setAuthError(err.message);
  } finally {
    setAuthLoading(false);
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const email    = document.getElementById('registerEmail').value.trim();
  const password = document.getElementById('registerPassword').value;
  const confirm  = document.getElementById('registerConfirm').value;
  setAuthError('');

  if (password !== confirm) { setAuthError('Passwords do not match.'); return; }
  if (password.length < 6)  { setAuthError('Password must be at least 6 characters.'); return; }

  setAuthLoading(true);
  try {
    const { token, user } = await api.auth.register(email, password);
    setToken(token);
    setStoredUser(user);
    hideAuthScreen();
    await initApp();
  } catch (err) {
    setAuthError(err.message);
  } finally {
    setAuthLoading(false);
  }
}

function logout() {
  if (!confirm('Log out of WordWise?')) return;
  clearAuth();
  // Reset in-memory state
  cards = []; folders = [];
  userXP = 0; userStreak = 0; userFreezes = 0;
  lastStudyDate = ''; studyHistory = {}; totalStudySeconds = 0;
  dailyQuests = []; questDate = ''; totalQuizzes = 0;
  showAuthScreen();
  switchAuthTab('login');
}
