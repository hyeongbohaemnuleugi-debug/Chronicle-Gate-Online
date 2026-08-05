(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const el = {
    cloudStatus: $('cloudStatus'), authBtn: $('authBtn'), adminBtn: $('adminBtn'),
    clickStage: $('clickStage'), characterImage: $('characterImage'), clickEffects: $('clickEffects'),
    totalClicks: $('totalClicks'), sessionClicks: $('sessionClicks'), cpsValue: $('cpsValue'), myRank: $('myRank'),
    rankList: $('rankList'), podium: $('podium'), refreshRankBtn: $('refreshRankBtn'), playHint: $('playHint'),
    authModal: $('authModal'), authTitle: $('authTitle'), authForm: $('authForm'), loginTab: $('loginTab'), signupTab: $('signupTab'),
    nicknameField: $('nicknameField'), nicknameInput: $('nicknameInput'), emailInput: $('emailInput'), passwordInput: $('passwordInput'),
    authSubmitBtn: $('authSubmitBtn'), authMessage: $('authMessage'), adminModal: $('adminModal'), normalFile: $('normalFile'),
    pressedFile: $('pressedFile'), normalPreview: $('normalPreview'), pressedPreview: $('pressedPreview'), saveImagesBtn: $('saveImagesBtn'),
    adminMessage: $('adminMessage'), toast: $('toast')
  };

  const state = { user: null, total: 0, session: 0, pending: 0, saving: false, authMode: 'login', clickTimes: [], rankTimer: null };
  const fmt = (n) => new Intl.NumberFormat('ko-KR').format(Number(n || 0));
  const safeName = (v) => String(v || '플레이어').replace(/[<>]/g, '').slice(0, 14);
  const initial = (n) => safeName(n).trim().charAt(0).toUpperCase() || '?';

  async function api(url, options = {}) {
    const response = await fetch(url, { credentials: 'same-origin', ...options, headers: { ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...(options.headers || {}) } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || '요청 처리 중 오류가 발생했습니다.');
    return data;
  }
  function toast(message) { el.toast.textContent = message; el.toast.classList.add('show'); clearTimeout(toast.timer); toast.timer = setTimeout(() => el.toast.classList.remove('show'), 2100); }
  function setStatus(mode, text) { el.cloudStatus.className = `status-pill ${mode}`; el.cloudStatus.querySelector('span').textContent = text; }
  function openModal(node) { node.classList.add('open'); node.setAttribute('aria-hidden', 'false'); }
  function closeModal(node) { node.classList.remove('open'); node.setAttribute('aria-hidden', 'true'); }
  function updateScoreUI() {
    el.totalClicks.textContent = fmt(state.total + state.pending);
    el.sessionClicks.textContent = fmt(state.session);
    const now = performance.now();
    state.clickTimes = state.clickTimes.filter((t) => now - t < 1000);
    el.cpsValue.textContent = state.clickTimes.length.toFixed(1);
  }
  function updateAuthUI() {
    el.authBtn.textContent = state.user ? `${safeName(state.user.nickname)} · 로그아웃` : '로그인';
    el.adminBtn.classList.toggle('hidden', !state.user?.is_admin);
    el.playHint.textContent = state.user ? '클릭 기록이 서버에 자동 저장되고 전체 순위에 반영됩니다.' : '로그인하면 점수가 서버에 저장되고 전체 순위에 반영됩니다.';
  }
  function imageUrl(slot) { return `/api/images/${slot}?v=${window.imageVersion || 1}`; }
  function staticImageUrl(slot) { return `/assets/${slot}.png?v=${window.imageVersion || 1}`; }
  function setImageWithFallback(image, slot) {
    image.onerror = () => {
      image.onerror = null;
      image.src = staticImageUrl(slot);
    };
    image.src = imageUrl(slot);
  }
  function setPressed(value) {
    el.clickStage.classList.toggle('pressed', value);
    setImageWithFallback(el.characterImage, value ? 'pressed' : 'normal');
  }
  function addEffect(event) {
    const rect = el.clickStage.getBoundingClientRect();
    const point = event?.touches?.[0] || event;
    const pop = document.createElement('span');
    pop.className = 'click-pop'; pop.textContent = '+1';
    pop.style.left = `${point?.clientX ? point.clientX - rect.left : rect.width / 2}px`;
    pop.style.top = `${point?.clientY ? point.clientY - rect.top : rect.height / 2}px`;
    el.clickEffects.appendChild(pop); setTimeout(() => pop.remove(), 700);
  }
  function registerClick(event) {
    if (!state.user) { openModal(el.authModal); toast('먼저 로그인해 주세요.'); return; }
    state.pending += 1; state.session += 1; state.clickTimes.push(performance.now()); updateScoreUI(); addEffect(event); setPressed(true);
    clearTimeout(registerClick.releaseTimer); registerClick.releaseTimer = setTimeout(() => setPressed(false), 95);
    clearTimeout(registerClick.flushTimer);
    registerClick.flushTimer = setTimeout(flushClicks, 120);
    if (state.pending >= 20) flushClicks();
  }
  async function flushClicks() {
    if (!state.user || state.saving || state.pending < 1) return;
    state.saving = true;
    const delta = Math.min(state.pending, 100); state.pending -= delta;
    try {
      const data = await api('/api/clicks', { method: 'POST', body: JSON.stringify({ delta }) });
      state.total = data.clicks;
      setStatus('online', '서버 연결됨');
      clearTimeout(state.rankTimer);
      state.rankTimer = setTimeout(loadLeaderboard, 350);
    } catch (error) {
      state.pending += delta; setStatus('offline', '저장 재시도 중'); console.error(error);
    } finally {
      state.saving = false; updateScoreUI();
      if (state.pending > 0) setTimeout(flushClicks, 250);
    }
  }
  function renderPodium(rows) {
    const order = [rows[1], rows[0], rows[2]], classes = ['second', 'first', 'third'];
    el.podium.innerHTML = order.map((row, i) => {
      const place = [2, 1, 3][i], name = safeName(row?.nickname || '-');
      return `<div class="podium-item ${classes[i]}">${place === 1 ? '<span class="crown">♛</span>' : `<span class="medal">${place}</span>`}<div class="avatar">${initial(name)}</div><strong>${name}</strong><small>${fmt(row?.clicks || 0)}</small></div>`;
    }).join('');
  }
  async function loadLeaderboard() {
    try {
      const { rows } = await api('/api/leaderboard');
      renderPodium(rows);
      el.rankList.innerHTML = rows.slice(3).map((row, idx) => {
        const name = safeName(row.nickname), me = String(state.user?.id) === String(row.id);
        return `<li class="rank-row ${me ? 'me' : ''}"><div class="rank-player"><span class="rank-number">${idx + 4}</span><span class="mini-avatar">${initial(name)}</span><span class="rank-name">${name}${me ? ' (나)' : ''}</span></div><span class="rank-score">${fmt(row.clicks)}</span></li>`;
      }).join('') || '<li class="rank-row"><span class="rank-name">아직 등록된 기록이 없습니다.</span></li>';
      const index = rows.findIndex((row) => String(row.id) === String(state.user?.id));
      el.myRank.textContent = index >= 0 ? `${index + 1}위` : '-';
    } catch (error) { console.error(error); }
  }
  function setAuthMode(mode) {
    state.authMode = mode; const signup = mode === 'signup';
    el.loginTab.classList.toggle('active', !signup); el.signupTab.classList.toggle('active', signup); el.nicknameField.classList.toggle('hidden', !signup);
    el.authTitle.textContent = signup ? '회원가입' : '로그인'; el.authSubmitBtn.textContent = signup ? '가입하고 시작하기' : '로그인'; el.authMessage.textContent = '';
  }
  async function handleAuthSubmit(event) {
    event.preventDefault(); el.authSubmitBtn.disabled = true; el.authMessage.textContent = '처리 중입니다...';
    try {
      const payload = { email: el.emailInput.value.trim(), password: el.passwordInput.value };
      if (state.authMode === 'signup') payload.nickname = el.nicknameInput.value.trim();
      const data = await api(`/api/auth/${state.authMode === 'signup' ? 'signup' : 'login'}`, { method: 'POST', body: JSON.stringify(payload) });
      state.user = data.user; state.total = Number(data.user.clicks || 0); updateScoreUI(); updateAuthUI(); closeModal(el.authModal); toast(state.authMode === 'signup' ? '회원가입이 완료되었습니다.' : '로그인되었습니다.'); loadLeaderboard();
    } catch (error) { el.authMessage.textContent = error.message; }
    finally { el.authSubmitBtn.disabled = false; }
  }
  async function logout() {
    await flushClicks(); await api('/api/auth/logout', { method: 'POST', body: '{}' }); state.user = null; state.total = 0; state.pending = 0; updateScoreUI(); updateAuthUI(); loadLeaderboard(); toast('로그아웃되었습니다.');
  }
  function previewFile(input, image) { const file = input.files?.[0]; if (file) image.src = URL.createObjectURL(file); }
  async function saveAdminImages() {
    const form = new FormData();
    if (el.normalFile.files[0]) form.append('normal', el.normalFile.files[0]);
    if (el.pressedFile.files[0]) form.append('pressed', el.pressedFile.files[0]);
    if (![...form.keys()].length) { el.adminMessage.textContent = '변경할 이미지를 선택해 주세요.'; return; }
    el.saveImagesBtn.disabled = true; el.adminMessage.textContent = '업로드 중입니다...';
    try {
      const data = await api('/api/admin/images', { method: 'POST', body: form });
      window.imageVersion = data.version; setPressed(false);
      setImageWithFallback(el.normalPreview, 'normal'); setImageWithFallback(el.pressedPreview, 'pressed');
      el.adminMessage.textContent = '모든 사용자에게 새 이미지가 적용되었습니다.'; toast('캐릭터 이미지가 변경되었습니다.');
    } catch (error) { el.adminMessage.textContent = error.message; }
    finally { el.saveImagesBtn.disabled = false; }
  }
  async function boot() {
    window.imageVersion = Date.now();
    setImageWithFallback(el.characterImage, 'normal');
    setImageWithFallback(el.normalPreview, 'normal');
    setImageWithFallback(el.pressedPreview, 'pressed');
    try {
      const data = await api('/api/me'); state.user = data.user; state.total = Number(data.user.clicks || 0); setStatus('online', '서버 연결됨');
    } catch { setStatus('online', '서버 연결됨'); }
    updateScoreUI(); updateAuthUI(); loadLeaderboard();
    setInterval(flushClicks, 500); setInterval(loadLeaderboard, 5000);
  }

  el.clickStage.addEventListener('pointerdown', registerClick);
  el.clickStage.addEventListener('pointerup', () => setPressed(false));
  el.clickStage.addEventListener('pointercancel', () => setPressed(false));
  el.clickStage.addEventListener('keydown', (e) => { if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); registerClick(e); } });
  el.authBtn.addEventListener('click', () => state.user ? logout() : openModal(el.authModal));
  el.adminBtn.addEventListener('click', () => openModal(el.adminModal));
  el.loginTab.addEventListener('click', () => setAuthMode('login'));
  el.signupTab.addEventListener('click', () => setAuthMode('signup'));
  el.authForm.addEventListener('submit', handleAuthSubmit);
  el.refreshRankBtn.addEventListener('click', loadLeaderboard);
  el.normalFile.addEventListener('change', () => previewFile(el.normalFile, el.normalPreview));
  el.pressedFile.addEventListener('change', () => previewFile(el.pressedFile, el.pressedPreview));
  el.saveImagesBtn.addEventListener('click', saveAdminImages);
  document.querySelectorAll('[data-close]').forEach((node) => node.addEventListener('click', () => closeModal($(node.dataset.close))));
  window.addEventListener('beforeunload', () => { if (state.pending > 0) navigator.sendBeacon('/api/clicks', new Blob([JSON.stringify({ delta: state.pending })], { type: 'application/json' })); });
  boot();
})();
