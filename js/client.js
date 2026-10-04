/* ── Atelier Web du Lac — Portail Client ── */

let _clientCode = '';
let _clientData = null;
let _analyticsLoaded = false;
let _facturesLoaded = false;
let _modifCount = 0;
let _analyticsChart = null;

/* ── LOGIN ── */
function toggleCode(btn) {
  const input = document.getElementById('login-code');
  const isHidden = input.type === 'password';
  input.type = isHidden ? 'text' : 'password';
  btn.querySelector('svg').innerHTML = isHidden
    ? '<path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>'
    : '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
}

document.getElementById('login-code').addEventListener('keydown', e => {
  if (e.key === 'Enter') handleLogin();
});

async function handleLogin() {
  const code = document.getElementById('login-code').value.trim();
  if (!code) return;

  const btn = document.getElementById('login-btn');
  const errEl = document.getElementById('login-error');
  btn.textContent = 'Connexion…';
  btn.disabled = true;
  errEl.style.display = 'none';

  try {
    const res = await fetch(`/api/portal?action=login&code=${encodeURIComponent(code)}`);
    if (!res.ok) throw new Error('invalid');
    const data = await res.json();

    _clientCode = code;
    _clientData = data;

    document.getElementById('client-name-header').textContent = data.nom;
    document.getElementById('modif-client-name').value = data.nom;
    document.querySelector('input[name="_subject"]').value = `Modification – ${data.nom}`;

    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('dashboard').style.display = 'block';

    renderApercu(data);
    addModif();
  } catch {
    errEl.style.display = 'block';
    btn.textContent = 'Accéder à mon espace';
    btn.disabled = false;
  }
}

function logout() {
  _clientCode = '';
  _clientData = null;
  _analyticsLoaded = false;
  _facturesLoaded = false;
  _modifCount = 0;
  if (_analyticsChart) { _analyticsChart.destroy(); _analyticsChart = null; }
  document.getElementById('login-code').value = '';
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('dashboard').style.display = 'none';
  document.getElementById('login-btn').textContent = 'Accéder à mon espace';
  document.getElementById('login-btn').disabled = false;
  document.getElementById('login-error').style.display = 'none';
}

/* ── TABS ── */
function switchTab(tab, btn) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  btn.classList.add('active');

  if (tab === 'factures' && !_facturesLoaded) loadFactures();
  if (tab === 'visiteurs' && !_analyticsLoaded) loadAnalytics();
}

/* ── VUE D'ENSEMBLE ── */
function renderApercu(data) {
  const statut = data.statut || 'À jour';
  const isLate = statut.toLowerCase().includes('retard') || statut.toLowerCase().includes('impayé');

  const sitesHtml = data.sites && data.sites.length > 0
    ? `<div class="sites-grid">${data.sites.map(s => {
        const url = s.startsWith('http') ? s : 'https://' + s;
        return `<div class="site-card"><a href="${url}" target="_blank" rel="noopener">
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20"/></svg>
          ${s.replace(/^https?:\/\//, '')}
        </a></div>`;
      }).join('')}</div>`
    : '<p style="color:var(--grey);font-size:.9rem">Aucun site configuré</p>';

  const prenom = data.prenom || data.nom || '';
  document.getElementById('apercu-content').innerHTML = `
    ${prenom ? `<p style="font-family:'Lora',serif;font-size:1.4rem;margin-bottom:1.2rem">Bonjour <em>${prenom}</em> 👋</p>` : ''}
    <div class="forfait-card">
      <div class="forfait-label">Votre forfait</div>
      <div class="forfait-name">${data.forfait || '—'}</div>
      ${data.prix_chf ? `<div class="forfait-price">CHF ${data.prix_chf} / mois</div>` : ''}
      <span class="forfait-status ${isLate ? 'status-late' : 'status-ok'}">${statut}</span>
    </div>
    <div class="card">
      <h2 class="card-title">Vos sites</h2>
      ${sitesHtml}
    </div>
  `;
}

/* ── FACTURES ── */
async function loadFactures() {
  _facturesLoaded = true;
  const el = document.getElementById('factures-content');

  try {
    const res = await fetch(`/api/portal?action=factures&code=${encodeURIComponent(_clientCode)}`);
    const factures = await res.json();

    if (!factures || factures.length === 0) {
      el.innerHTML = `<div class="empty-state"><p>Aucune facture disponible pour le moment.</p></div>`;
      return;
    }

    const ouvertes = factures.filter(f => f.statut && f.statut.toLowerCase() !== 'payée');
    const payees = factures.filter(f => f.statut && f.statut.toLowerCase() === 'payée');

    const buildTable = (rows, title) => {
      if (rows.length === 0) return '';
      return `
        <div class="card">
          <h2 class="card-title">${title}</h2>
          <table class="factures-table">
            <thead><tr>
              <th>N°</th><th>Date</th><th>Montant</th><th>Statut</th><th>Lien</th>
            </tr></thead>
            <tbody>${rows.map(f => {
              const badge = f.statut.toLowerCase() === 'payée' ? 'badge-green'
                          : f.statut.toLowerCase().includes('retard') ? 'badge-red'
                          : 'badge-blue';
              const driveUrl = convertOneDriveUrl(f.url);
              return `<tr>
                <td><strong>${f.numero || '—'}</strong></td>
                <td>${f.date || '—'}</td>
                <td>CHF ${f.montant_chf || '—'}</td>
                <td><span class="badge ${badge}">${f.statut}</span></td>
                <td>${driveUrl ? `<a class="btn-download" href="${driveUrl}" target="_blank" rel="noopener">
                  <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                  Voir</a>` : '—'}</td>
              </tr>`;
            }).join('')}</tbody>
          </table>
        </div>`;
    };

    el.innerHTML = buildTable(ouvertes, 'Factures ouvertes') + buildTable(payees, 'Factures payées');
  } catch {
    el.innerHTML = `<div class="empty-state"><p>Impossible de charger les factures.</p></div>`;
  }
}

/* ── ANALYTICS ── */
async function loadAnalytics() {
  _analyticsLoaded = true;
  const el = document.getElementById('visiteurs-content');
  const projectId = _clientData && _clientData.vercel_project_id;

  if (!projectId) {
    el.innerHTML = `<div class="analytics-unavailable">
      <p>Aucun projet Vercel configuré pour ce client.</p>
    </div>`;
    return;
  }

  try {
    const res = await fetch(`/api/analytics?projectId=${encodeURIComponent(projectId)}`);
    const data = await res.json();

    if (data.error || !data.total) throw new Error(data.error || 'no data');

    const total = data.total?.data?.[0]?.count ?? data.total?.count ?? '—';
    const timeline = data.timeline?.data || [];
    const pages = data.pages?.data || [];

    const labels = timeline.map(d => {
      const date = new Date(d.key);
      return date.toLocaleDateString('fr-CH', { day: '2-digit', month: '2-digit' });
    });
    const values = timeline.map(d => d.count || 0);

    el.innerHTML = `
      <div class="analytics-grid">
        <div class="stat-card">
          <div class="stat-num-big">${total.toLocaleString('fr-CH')}</div>
          <div class="stat-label">Pages vues (30j)</div>
        </div>
      </div>
      <div class="card">
        <h2 class="card-title">Visites par jour</h2>
        <div class="chart-container"><canvas id="analytics-chart"></canvas></div>
      </div>
      ${pages.length > 0 ? `<div class="card">
        <h2 class="card-title">Pages les plus visitées</h2>
        ${pages.map(p => `
          <div style="display:flex;align-items:center;gap:.75rem;margin-bottom:.5rem">
            <div style="flex:1;font-size:.88rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.key || '/'}</div>
            <div style="font-weight:500;color:var(--blue)">${p.count}</div>
          </div>
        `).join('')}
      </div>` : ''}
    `;

    if (labels.length > 0) {
      const ctx = document.getElementById('analytics-chart').getContext('2d');
      _analyticsChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            data: values,
            backgroundColor: 'rgba(26,63,111,.15)',
            borderColor: '#1A3F6F',
            borderWidth: 1.5,
            borderRadius: 4,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, ticks: { precision: 0, font: { size: 11 } }, grid: { color: '#f0ece6' } },
            x: { ticks: { font: { size: 10 }, maxRotation: 45 }, grid: { display: false } }
          }
        }
      });
    }
  } catch {
    el.innerHTML = `<div class="analytics-unavailable">
      <p style="margin-bottom:1rem">Les données de visites ne sont pas disponibles.</p>
      <a href="https://vercel.com/dashboard" target="_blank" rel="noopener" style="color:var(--blue)">Voir sur Vercel →</a>
    </div>`;
  }
}

/* ── FORMULAIRE MODIFICATIONS ── */
function addModif() {
  _modifCount++;
  const n = _modifCount;
  const container = document.getElementById('modif-items');

  const div = document.createElement('div');
  div.className = 'modif-item';
  div.id = `modif-${n}`;
  div.innerHTML = `
    <div class="modif-item-header">
      <span class="modif-num">Modification ${n}</span>
      ${n > 1 ? `<button type="button" class="btn-remove" onclick="removeModif(${n})" title="Supprimer">✕</button>` : ''}
    </div>
    <div class="form-group">
      <label>Page à modifier</label>
      <input type="text" name="page_${n}" placeholder="Ex: Page Accueil, Page Services, Tout le site…" required>
    </div>
    <div class="form-group">
      <label>Description de la modification</label>
      <textarea name="description_${n}" placeholder="Décrivez précisément ce que vous souhaitez modifier…" required></textarea>
    </div>
    <div class="form-group">
      <label>Lien vers un fichier (optionnel)</label>
      <input type="url" name="lien_${n}" placeholder="Lien SwissTransfer, OneDrive, Google Drive…">
    </div>
  `;
  container.appendChild(div);
}

function removeModif(n) {
  const el = document.getElementById(`modif-${n}`);
  if (el) el.remove();
}

async function handleModifSubmit(e) {
  e.preventDefault();
  const btn = document.getElementById('modif-submit-btn');
  const successEl = document.getElementById('modif-success');

  btn.textContent = 'Envoi en cours…';
  btn.disabled = true;

  const form = e.target;
  const items = document.querySelectorAll('.modif-item');
  let body = `Demande de modification de ${_clientData.nom}\n\n`;

  items.forEach((item, i) => {
    const n = item.id.replace('modif-', '');
    const page = form.querySelector(`[name="page_${n}"]`)?.value || '';
    const desc = form.querySelector(`[name="description_${n}"]`)?.value || '';
    const lien = form.querySelector(`[name="lien_${n}"]`)?.value || '';
    body += `--- Modification ${i + 1} ---\n`;
    body += `Page: ${page}\n`;
    body += `Description: ${desc}\n`;
    if (lien) body += `Fichier: ${lien}\n`;
    body += '\n';
  });

  const formData = new FormData();
  formData.append('_subject', `Modification – ${_clientData.nom}`);
  formData.append('client', _clientData.nom);
  formData.append('message', body);

  try {
    const res = await fetch('https://formspree.io/f/mvznzypq', {
      method: 'POST',
      body: formData,
      headers: { 'Accept': 'application/json' }
    });

    if (res.ok) {
      form.style.display = 'none';
      successEl.style.display = 'block';
    } else {
      btn.textContent = 'Erreur – réessayez';
      btn.style.background = 'var(--red)';
      btn.disabled = false;
    }
  } catch {
    btn.textContent = 'Erreur – réessayez';
    btn.style.background = 'var(--red)';
    btn.disabled = false;
  }
}

/* ── ONERIVE URL CONVERSION ── */
function convertOneDriveUrl(url) {
  if (!url) return url;
  if (!url.includes('1drv.ms') && !url.includes('onedrive.live.com') && !url.includes('sharepoint.com')) return url;
  try {
    const encoded = btoa(url).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    return `https://api.onedrive.com/v1.0/shares/u!${encoded}/root/content`;
  } catch {
    return url;
  }
}
