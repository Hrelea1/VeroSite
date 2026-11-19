// Shared across all pages: scroll reveal, cookie consent (<dialog>), form handoff, and #beneficii accordion.

const BEN = 5, IMGS = 3, STEPS = BEN * IMGS;
const stepAt = p => Math.min(STEPS - 1, Math.max(0, Math.floor(p * STEPS)));
if (stepAt(-1) !== 0 || stepAt(0) !== 0 || stepAt(.5) !== 7 || stepAt(1) !== 14) throw new Error('stepAt check failed');

if (typeof document !== 'undefined') {
  // Mobile hamburger menu
  const hdr = document.querySelector('.nav');
  if (hdr) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'burger';
    b.setAttribute('aria-label', 'Meniu');
    b.setAttribute('aria-expanded', 'false');
    b.textContent = '☰';
    const setOpen = v => { hdr.classList.toggle('open', v); b.setAttribute('aria-expanded', String(v)); b.textContent = v ? '✕' : '☰'; };
    b.onclick = () => setOpen(!hdr.classList.contains('open'));
    hdr.append(b);
    hdr.querySelector('nav')?.addEventListener('click', e => { if (e.target.tagName === 'A') setOpen(false); });
  }

  // Scroll reveal
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: .15 });
  document.querySelectorAll('.rv').forEach(el => io.observe(el));

  // Cookie consent: native <dialog>, blocks third-party map embed until accepted
  const CONSENT = 'sidor-consent';
  const getConsent = () => { try { return localStorage.getItem(CONSENT); } catch { return null; } };
  const setConsent = v => { try { localStorage.setItem(CONSENT, v); } catch { } };

  function loadEmbeds() {
    document.querySelectorAll('[data-consent-src]').forEach(f => {
      if (!f.src) f.src = f.dataset.consentSrc;
      const btn = f.parentElement?.querySelector('[data-load-map]');
      if (btn) btn.hidden = true;
    });
  }

  function cookieBanner() {
    if (document.querySelector('dialog.cookie')) return;
    const d = document.createElement('dialog');
    d.className = 'cookie';
    d.setAttribute('aria-label', 'Preferințe cookie');
    d.innerHTML = `
      <img src="media/cookies.png" alt="" width="110" height="70">
      <h3>Preferințe cookie</h3>
      <p>Folosim cookie-uri doar pentru funcționarea site-ului și pentru harta Google Maps de pe pagina de contact.</p>
      <div class="row">
        <button type="button" class="btn solid" data-c="all">ACCEPT TOATE</button>
        <button type="button" class="btn" data-c="necessary">DOAR NECESARE</button>
      </div>
      <a class="muted small" href="cookies.html">Detalii în Politica cookie</a>`;
    const save = c => {
      const prev = getConsent();
      setConsent(c);
      if (d.open) d.close();
      d.remove();
      if (c === 'all') loadEmbeds();
      else if (prev === 'all') location.reload();
    };
    d.addEventListener('click', e => {
      const c = e.target.dataset.c || (e.target === d ? 'necessary' : null);
      if (c) save(c);
    });
    d.addEventListener('close', () => {
      if (!['all', 'necessary'].includes(getConsent())) setConsent('necessary');
      d.remove();
    });
    document.body.append(d);
    d.showModal();
  }

  const saved = getConsent();
  if (saved === 'all') loadEmbeds();
  else if (!['all', 'necessary'].includes(saved)) cookieBanner();

  document.addEventListener('click', e => {
    if (e.target.closest('[data-cookie-settings]')) { e.preventDefault(); cookieBanner(); }
    if (e.target.closest('[data-load-map]')) loadEmbeds();
  });

  // Contact form: native constraint check + mailto handoff
  // ponytail: mailto client handoff because this is a static site with no backend; upgrade path: POST endpoint.
  const form = document.querySelector('.contact form');
  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      const d = new FormData(form);
      const subj = (d.get('subiect') || 'Solicitare contact').toString().trim();
      const body = `Nume: ${d.get('nume')}\nE-mail: ${d.get('email')}\nTelefon: ${d.get('telefon') || '-'}\n\n${d.get('mesaj')}`;
      location.href = `mailto:sidorbeautycenter@gmail.com?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}`;
      const msg = form.querySelector('.form-msg');
      if (msg) { msg.textContent = 'Se deschide aplicația de e-mail cu mesajul pregătit.'; msg.hidden = false; }
    });
  }

  // Benefits accordion (index.html only)
  const wrap = document.getElementById('beneficii');
  if (wrap) {
    const rows = [...wrap.querySelectorAll('.rows li')];
    const imgs = [...wrap.querySelectorAll('.stage .m')];
    const range = () => wrap.offsetHeight - innerHeight;
    let cur = -1;

    rows.forEach(r => {
      r.ps = [...r.querySelectorAll('p')];
      r.ps.forEach(p => p.innerHTML = p.textContent.trim().split(/\s+/).map((w, j) => `<span class="w" style="--d:${j * 40}ms">${w}</span>`).join(' '));
    });

    // ponytail: simple clamp cooldown, so a hard fling snaps back (no wheel-delta handling); fine for a landing page.
    const COOLDOWN = 1200;
    let cooling = false;
    const y0 = s => wrap.offsetTop + range() * s / STEPS;

    function render(s) {
      rows.forEach((r, i) => {
        const on = i === (s / IMGS | 0), k = s % IMGS;
        r.classList.toggle('open', on);
        const btn = r.querySelector('button');
        btn.setAttribute('aria-expanded', String(on));
        btn.querySelector('b').textContent = on ? '−' : '+';
        r.ps.forEach((p, j) => p.classList.toggle('on', on && j <= k));
      });
      imgs.forEach((m, i) => m.classList.toggle('show', (i / IMGS | 0) === (s / IMGS | 0) && i <= s));
    }

    function lock() {
      cooling = true;
      setTimeout(() => { cooling = false; update(); }, COOLDOWN);
    }

    const mobile = matchMedia('(max-width:900px)');
    const openAll = i => { cur = i * IMGS + IMGS - 1; render(cur); };
    let last = scrollY;

    function update() {
      if (mobile.matches) {
        if (cur < 0 || cur % IMGS !== IMGS - 1) openAll(cur < 0 ? 0 : (cur / IMGS | 0));
        last = scrollY;
        return;
      }
      const up = scrollY < last;
      const t = stepAt((scrollY - wrap.offsetTop) / range());
      if (cur < 0) { render(cur = t); last = scrollY; return; }
      if (up) { if (t !== cur) render(cur = t); last = scrollY; return; }
      if (!cooling && t !== cur) { render(cur += Math.sign(t - cur)); lock(); }
      if (cooling) {
        const lo = cur === 0 ? -Infinity : Math.ceil(y0(cur)), hi = cur === STEPS - 1 ? Infinity : y0(cur + 1) - 1;
        if (scrollY < lo || scrollY > hi) scrollTo({ top: Math.min(hi, Math.max(lo, scrollY)), behavior: 'instant' });
      }
      last = scrollY;
    }

    addEventListener('scroll', update, { passive: true });
    addEventListener('resize', update);
    update();

    rows.forEach((r, i) => r.querySelector('button').addEventListener('click', () => {
      if (mobile.matches) return openAll(i);
      cur = i * IMGS; render(cur); lock();
      scrollTo({ top: Math.ceil(y0(cur)) + 2, behavior: 'instant' });
      last = scrollY;
    }));
  }
}
