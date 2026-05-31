/* ============================================
   Atelier Web du Lac — main.js
   ============================================ */

/**
 * Affiche une page et masque les autres
 * @param {string} id - identifiant de la page (accueil, services, portfolio, contact)
 */
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const el = document.getElementById('page-' + id);
  if (el) {
    el.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
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

    grid.innerHTML = projects.map(p => {
      if (p.url && !p.url.startsWith('http')) p.url = 'https://' + p.url;
      const imgSrc = p.image_url
        ? p.image_url
        : p.url
          ? `https://api.microlink.io/?url=${encodeURIComponent(p.url)}&screenshot=true&meta=false&embed=screenshot.url`
          : null;
      return `
      <div class="portfolio-card">
        ${imgSrc
          ? `<img class="portfolio-img" src="${imgSrc}" alt="${p.titre}" onerror="this.style.display='none'">`
          : `<div class="portfolio-img-placeholder"></div>`}
        <div class="portfolio-body">
          <span class="portfolio-badge">${p.categorie || 'Projet'}</span>
          <h3 class="portfolio-card-title">${p.titre}</h3>
          <p class="portfolio-client">${p.client}</p>
          ${p.description ? `<p class="portfolio-desc">${p.description}</p>` : ''}
          ${p.url ? `<a class="portfolio-link" href="${p.url}" target="_blank" rel="noopener">Voir le site →</a>` : ''}
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
