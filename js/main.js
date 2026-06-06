/* ============================================
   Atelier Web du Lac — main.js
   ============================================ */

/**
 * Affiche une page et masque les autres
 * @param {string} id - identifiant de la page (accueil, services, portfolio, contact)
 */
/* ── ANCRES URL ── */
function getPageFromHash() {
  const hash = window.location.hash.replace('#', '');
  return ['accueil','services','portfolio','contact','mentions'].includes(hash) ? hash : 'accueil';
}

const SEO_PAGES = {
  accueil: {
    title: 'Création de site web Vully – Atelier Web du Lac | Sugiez, Môtier, Morat',
    desc:  'Création de site internet pas chère et sur mesure pour artisans, restaurateurs et PME du Vully. Sites rapides, modernes et visibles sur Google. Devis gratuit.'
  },
  services: {
    title: 'Tarifs & services – Création site web dès 480 CHF | Atelier Web du Lac',
    desc:  'Forfaits Starter dès 480 CHF, Pro dès 720 CHF. Création de sites web sur mesure pour les entreprises du Vully et de la région de Morat. Devis gratuit.'
  },
  portfolio: {
    title: 'Portfolio – Réalisations web Vully | Atelier Web du Lac',
    desc:  'Découvrez les sites web réalisés pour des entreprises locales du Vully et de la région du Lac de Morat. Sites vitrine, e-commerce, SEO local.'
  },
  contact: {
    title: 'Contact – Demande de devis gratuit | Atelier Web du Lac',
    desc:  'Contactez Atelier Web du Lac pour votre projet de site web. Basé à Sugiez, dans le Vully. Réponse sous 24h, devis gratuit.'
  }
};

function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const el = document.getElementById('page-' + id);
  if (el) {
    el.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  // Met à jour le titre et la meta description
  const seo = SEO_PAGES[id];
  if (seo) {
    document.title = seo.title;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', seo.desc);
  }
  // Met à jour l'ancre dans l'URL
  history.pushState(null, '', '#' + id);
}

// Charge la bonne page selon l'ancre à l'arrivée
window.addEventListener('DOMContentLoaded', () => {
  showPage(getPageFromHash());
});

/* ── COMPTEUR ANIMÉ (stats hero) ── */
function animateCounter(el, target, suffix = '') {
  let start = 0;
  const duration = 1200;
  const step = Math.ceil(target / (duration / 16));
  const timer = setInterval(() => {
    start = Math.min(start + step, target);
    el.textContent = start + suffix;
    if (start >= target) clearInterval(timer);
  }, 16);
}

function initCounters() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target, 100, '%');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  document.querySelectorAll('.stat-num[data-count]').forEach(el => observer.observe(el));
}

/* ── SWIPE PORTFOLIO (mobile) ── */
function initSwipe(el) {
  let startX = 0;
  el.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
  el.addEventListener('touchend', e => {
    const diff = startX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) el.scrollBy({ left: diff > 0 ? 300 : -300, behavior: 'smooth' });
  }, { passive: true });
}

/* ── BOUTON RETOUR EN HAUT ── */
window.addEventListener('scroll', () => {
  document.getElementById('btn-top').classList.toggle('visible', window.scrollY > 300);
});

/* ── ANIMATIONS AU SCROLL ── */
function initReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(el => {
      if (el.isIntersecting) {
        el.target.classList.add('visible');
        observer.unobserve(el.target);
      }
    });
  }, { threshold: 0.12 });

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

// Relance l'observer à chaque changement de page
const _origShowPage = showPage;
showPage = function(id) {
  _origShowPage(id);
  setTimeout(initReveal, 50);
};

initReveal();

/* ── MENU HAMBURGER + OVERLAY ── */
function toggleMenu() {
  const links   = document.getElementById('nav-links');
  const btn     = document.getElementById('nav-hamburger');
  const overlay = document.getElementById('nav-overlay');
  links.classList.toggle('open');
  btn.classList.toggle('active');
  overlay.classList.toggle('open');
}
function closeMenu() {
  document.getElementById('nav-links').classList.remove('open');
  document.getElementById('nav-hamburger').classList.remove('active');
  document.getElementById('nav-overlay').classList.remove('open');
}

/**
 * Gestion de l'envoi du formulaire de contact
 * Pour connecter à un vrai service d'envoi, remplacez le contenu
 * de cette fonction par un appel fetch() vers Formspree ou votre backend.
 *
 * Exemple avec Formspree :
 *   const res = await fetch('https://formspree.io/f/VOTRE_ID', {
 *     method: 'POST',
 *     body: new FormData(e.target),
 *     headers: { 'Accept': 'application/json' }
 *   });
 */
async function handleSubmit(e) {
  e.preventDefault();
  const btn = e.target.querySelector('.form-submit');
  btn.textContent = 'Envoi en cours…';
  btn.disabled = true;

  try {
    const res = await fetch('https://formspree.io/f/mvznzypq', {
      method: 'POST',
      body: new FormData(e.target),
      headers: { 'Accept': 'application/json' }
    });

    if (res.ok) {
      btn.textContent = 'Message envoyé ✓';
      btn.style.background = '#2A5E38';
      e.target.reset();
    } else {
      btn.textContent = 'Erreur — réessayez';
      btn.style.background = '#dc2626';
      btn.disabled = false;
    }
  } catch {
    btn.textContent = 'Erreur — réessayez';
    btn.style.background = '#dc2626';
    btn.disabled = false;
  }
}

/* ── PORTFOLIO GOOGLE SHEETS ── */
function parseCSV(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
  return lines.slice(1).map(line => {
    const cols = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { inQ = !inQ; }
      else if (c === ',' && !inQ) { cols.push(cur); cur = ''; }
      else { cur += c; }
    }
    cols.push(cur);
    return Object.fromEntries(headers.map((h, i) => [h, (cols[i] || '').trim()]));
  });
}

async function loadPortfolio() {
  if (typeof SHEET_CSV_URL === 'undefined' || SHEET_CSV_URL === 'VOTRE_URL_CSV') return;

  try {
    const res = await fetch(SHEET_CSV_URL);
    if (!res.ok) { console.error('Portfolio: réponse HTTP', res.status); return; }
    const text = await res.text();
    console.log('Portfolio CSV reçu:', text.substring(0, 200));
    const projects = parseCSV(text).filter(p => p.titre);
    console.log('Portfolio projets parsés:', projects);

    if (projects.length === 0) { console.warn('Portfolio: aucun projet trouvé (vérifiez les noms de colonnes)'); return; }

    const grid = document.getElementById('portfolio-grid');
    const coming = document.getElementById('portfolio-coming');

    // Stocke les projets pour la page détail
    window._portfolioProjects = projects;

    grid.innerHTML = projects.map((p, i) => {
      if (p.url && !p.url.startsWith('http')) p.url = 'https://' + p.url;
      const imgSrc = p.image_url
        ? p.image_url
        : p.url
          ? `https://api.microlink.io/?url=${encodeURIComponent(p.url)}&screenshot=true&meta=false&embed=screenshot.url`
          : null;
      return `
      <div class="portfolio-card" onclick="openProjet(${i})" style="cursor:pointer">
        ${imgSrc
          ? `<img class="portfolio-img" src="${imgSrc}" alt="${p.titre}" loading="lazy" onerror="this.style.display='none'">`
          : `<div class="portfolio-img-placeholder"></div>`}
        <div class="portfolio-body">
          <span class="portfolio-badge">${p.categorie || 'Projet'}</span>
          <h3 class="portfolio-card-title">${p.titre}</h3>
          <p class="portfolio-client">${p.client}</p>
          ${p.description ? `<p class="portfolio-desc">${p.description}</p>` : ''}
          <span class="portfolio-link">Voir le détail →</span>
        </div>
      </div>
    `; }).join('');

    grid.style.display = 'grid';
    coming.style.display = 'none';
  } catch (e) {
    console.error('Portfolio erreur fetch:', e.message);
  }
}

loadPortfolio().then(() => {
  const grid = document.getElementById('portfolio-grid');
  if (grid) initSwipe(grid);
});

// Lazy loading images portfolio
document.addEventListener('DOMContentLoaded', () => {
  initCounters();
});

/* ── PAGE DÉTAIL PROJET ── */
function openProjet(index) {
  const p = window._portfolioProjects[index];
  if (!p) return;

  const imgSrc = p.image_url
    ? p.image_url
    : p.url
      ? `https://api.microlink.io/?url=${encodeURIComponent(p.url)}&screenshot=true&meta=false&embed=screenshot.url`
      : null;

  // Avis client (défini avant utilisation)
  const etoiles = parseInt(p.etoiles) || 0;
  const starsHtml = etoiles > 0 ? `
    <div class="avis-block">
      <div class="avis-etoiles">${'★'.repeat(etoiles)}${'☆'.repeat(5 - etoiles)}</div>
      ${p.avis ? `<blockquote class="avis-texte">"${p.avis}"</blockquote>` : ''}
    </div>
  ` : '';

  // Image hero
  document.getElementById('projet-hero').innerHTML = imgSrc
    ? `<img src="${imgSrc}" alt="${p.titre}" class="projet-img">`
    : `<div class="projet-img-placeholder"></div>`;

  // Méta (badge, titre, client, lien, avis)
  document.getElementById('projet-meta').innerHTML = `
    <span class="portfolio-badge">${p.categorie || 'Projet'}</span>
    <h1 class="projet-titre">${p.titre}</h1>
    <p class="projet-client">Client : <strong>${p.client}</strong></p>
    ${p.url ? `<a href="${p.url}" target="_blank" rel="noopener" class="btn-primary" style="margin-top:1.25rem;display:inline-block">Visiter le site →</a>` : ''}
    ${starsHtml}
  `;

  // Contenu détaillé
  const details = p.details || p.description || '';
  document.getElementById('projet-contenu').innerHTML =
    details ? details.split('|').map(para => `<p>${para.trim()}</p>`).join('') : '<p style="color:#888">Aucune description détaillée pour ce projet.</p>';

  showPage('projet');
}
