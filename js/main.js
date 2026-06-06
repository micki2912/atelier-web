/* ============================================
   Atelier Web du Lac — main.js
   ============================================ */

/**
 * Affiche une page et masque les autres
 * @param {string} id - identifiant de la page (accueil, services, portfolio, contact)
 */
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
}

/* ── MENU HAMBURGER ── */
function toggleMenu() {
  const links = document.getElementById('nav-links');
  const btn   = document.getElementById('nav-hamburger');
  links.classList.toggle('open');
  btn.classList.toggle('active');
}
function closeMenu() {
  document.getElementById('nav-links').classList.remove('open');
  document.getElementById('nav-hamburger').classList.remove('active');
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
function handleSubmit(e) {
  e.preventDefault();
  const btn = e.target.querySelector('.form-submit');
  btn.textContent = 'Message envoyé !';
  btn.style.background = '#2A5E38';
  btn.disabled = true;
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
          ? `<img class="portfolio-img" src="${imgSrc}" alt="${p.titre}" onerror="this.style.display='none'">`
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

loadPortfolio();

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
