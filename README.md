# Atelier Web du Lac — Guide de démarrage

## Structure du dossier

```
atelier-web/
├── index.html        ← page principale (ouvrir dans le navigateur)
├── css/
│   └── style.css     ← tous les styles
├── js/
│   └── main.js       ← navigation et formulaire
└── README.md         ← ce fichier
```

## Démarrer en local

Double-cliquez sur `index.html` pour ouvrir le site dans votre navigateur.
Aucune installation requise.

## Personnaliser avant mise en ligne

Cherchez les commentaires `<!-- REMPLACEZ -->` dans `index.html` :

1. **Email** — ligne ~120 : remplacez `hello@atelierwebdulac.ch`
2. **Téléphone** — ligne ~128 : remplacez `+41 XX XXX XX XX`
3. **Année du copyright** — footer : mettez à jour si nécessaire

## Connecter le formulaire de contact

Le formulaire affiche "Message envoyé !" sans vraiment envoyer d'email.
Pour recevoir les messages, utilisez **Formspree** (gratuit jusqu'à 50 messages/mois) :

1. Créez un compte sur https://formspree.io
2. Créez un nouveau formulaire → copiez votre ID (ex: `xpzgkwqr`)
3. Dans `js/main.js`, remplacez la fonction `handleSubmit` par :

```javascript
async function handleSubmit(e) {
  e.preventDefault();
  const btn = e.target.querySelector('.form-submit');
  btn.textContent = 'Envoi en cours…';
  btn.disabled = true;

  const res = await fetch('https://formspree.io/f/VOTRE_ID', {
    method: 'POST',
    body: new FormData(e.target),
    headers: { 'Accept': 'application/json' }
  });

  if (res.ok) {
    btn.textContent = 'Message envoyé !';
    btn.style.background = '#2A5E38';
  } else {
    btn.textContent = 'Erreur — réessayez';
    btn.style.background = '#A32D2D';
    btn.disabled = false;
  }
}
```

## Mettre en ligne

### Option 1 — Hébergement mutualisé (Infomaniak, recommandé en Suisse)
1. Achetez un hébergement + nom de domaine sur https://infomaniak.com
2. Connectez-vous au panneau FTP (FileZilla)
3. Copiez tout le contenu du dossier `atelier-web/` dans `public_html/`
4. Votre site est en ligne !

### Option 2 — Netlify (gratuit, très simple)
1. Créez un compte sur https://netlify.com
2. Glissez-déposez le dossier `atelier-web/` sur la page d'accueil Netlify
3. Vous obtenez une URL en quelques secondes
4. Connectez ensuite votre nom de domaine personnalisé

## Ajouter votre logo en SVG exporté

Remplacez le bloc `<svg>` dans la `<nav>` de `index.html` par votre fichier SVG final,
ou référencez-le avec `<img src="images/logo.svg" alt="Atelier Web du Lac">`.

---
Site créé avec Claude · Atelier Web du Lac · 2025
