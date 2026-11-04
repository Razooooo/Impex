# IMPEX – Prise de rendez-vous pour garage Land Rover

Application web de prise de rendez-vous pour **IMPEX**, garage spécialisé Land Rover et mécanique générale à Antananarivo. Les clients réservent une prestation (diagnostic, entretien, freinage, suspension…) pour leur véhicule ; le garage planifie, assigne un mécanicien et suit l'avancement.

## Sommaire

- [Stack](#stack)
- [Fonctionnalités](#fonctionnalités)
- [Démarrage rapide](#démarrage-rapide)
- [Comptes de démonstration](#comptes-de-démonstration)
- [Structure du projet](#structure-du-projet)
- [API](#api)
- [Configuration](#configuration)
- [Développement sans Docker](#développement-sans-docker)
- [Consulter la base avec MongoDB Compass](#consulter-la-base-avec-mongodb-compass)
- [Feuille de route](#feuille-de-route)

## Stack

| Couche   | Technologies                                          |
| -------- | ----------------------------------------------------- |
| Front    | Vue 3, Vite, Pinia, Vue Router, Tailwind CSS 4, Axios |
| Back     | Node.js, Express 5, Mongoose, JWT, bcryptjs           |
| Données  | MongoDB 7                                             |
| Outillage | Docker Compose, pnpm                                 |

## Fonctionnalités

### Rôles

| Rôle     | Peut faire                                                                                   |
| -------- | -------------------------------------------------------------------------------------------- |
| `client` | Gérer ses véhicules, prendre ou annuler un rendez-vous, suivre son statut                    |
| `admin`  | Voir tous les rendez-vous, assigner un mécanicien, ajuster le temps estimé, gérer services et personnel |
| `mecano` | Voir ses tâches assignées, les démarrer ou les terminer, ajouter des notes                   |

### État d'avancement

| Élément                                           | État        |
| ------------------------------------------------- | ----------- |
| Page de présentation IMPEX                        | Terminé     |
| Connexion / inscription (fenêtre unique)          | Terminé     |
| API complète (auth, services, véhicules, rdv)     | Terminé     |
| Espace admin : demandes, assignation, durée, démarrage / fin | Terminé |
| Espace admin : équipe (mécaniciens, administrateurs) | Terminé  |
| Espace admin : gestion des services (ajout, modification, activation) | Terminé |
| Interdiction des chevauchements d'un même mécanicien | Terminé |
| Tâches du mécanicien (démarrer / terminer)        | Basique     |
| Espace client : véhicules, rendez-vous, annulation | Terminé    |
| Réservation par créneaux selon les horaires du garage | Terminé (côté client) |
| Choix guidé de la prestation (zones, « Je ne sais pas » avec symptômes) | Terminé |

## Démarrage rapide

Prérequis : [Docker Desktop](https://www.docker.com/products/docker-desktop/) démarré.

```bash
docker compose up --build
```

Dans un second terminal, une seule fois, pour créer les comptes et services de démonstration :

```bash
docker compose exec backend pnpm seed
```

| Service  | Adresse                            |
| -------- | ---------------------------------- |
| Site     | http://localhost:5173              |
| API      | http://localhost:3000/api/health   |
| MongoDB  | `mongodb://localhost:27017`        |

Au quotidien :

```bash
docker compose up -d      # démarrer en arrière-plan
docker compose down       # arrêter (les données sont conservées)
```

Le code est monté en volume : le front se recharge à chaque modification et le back redémarre via `nodemon` (lancé avec `-L`, nécessaire pour détecter les changements sous Windows). Un `--build` n'est nécessaire que si un `Dockerfile` ou les dépendances changent :

```bash
docker compose up -d --build -V
```

## Comptes de démonstration

Créés par `pnpm seed`. Mot de passe : `Password123!` (modifiable avec la variable `SEED_PASSWORD`).

| Rôle   | Email                |
| ------ | -------------------- |
| admin  | `admin@garage.local` |
| mecano | `marc@garage.local`  |
| mecano | `sophie@garage.local` |

> Ces comptes sont réservés au développement. Ne les utilisez jamais en production.

Les comptes clients se créent depuis le site (« Connexion » puis « Créer un compte »).

## Structure du projet

```
.
├── docker-compose.yml
├── Back-end/
│   └── src/
│       ├── config/          connexion MongoDB
│       ├── controllers/     logique métier
│       ├── middlewares/     authentification, rôles, erreurs
│       ├── models/          User, Vehicle, Service, Appointment
│       ├── routes/          routes de l'API
│       ├── scripts/         seed.js
│       ├── app.js
│       └── server.js
└── frontend/
    ├── public/images/       photos des modèles
    └── src/
        ├── components/      AuthModal (connexion / inscription)
        ├── data/            contenu de la page de présentation
        ├── directives/      v-reveal (animations au scroll)
        ├── lib/             client Axios
        ├── router/          routes et protection par rôle
        ├── stores/          Pinia : auth, ui
        └── views/           HomeView, ClientDashboard, AdminDashboard, MechanicDashboard
```

### Modèle de données

- **User** : prénom, nom, email, mot de passe haché, téléphone, rôle.
- **Vehicle** : propriétaire, modèle Land Rover, année, plaque, VIN, motorisation, kilométrage.
- **Service** : nom, catégorie, durée estimée par défaut, actif ou non.
- **Appointment** : client, véhicule, service, date, statut, mécanicien assigné, temps estimé, notes du client et du mécanicien.

Statuts d'un rendez-vous : `pending` → `confirmed` → `in_progress` → `done` (ou `cancelled`). Assigner un mécanicien passe le rendez-vous en `confirmed`.

## API

Toutes les routes sont préfixées par `/api`. Les routes protégées attendent l'en-tête `Authorization: Bearer <token>`.

| Méthode | Route                          | Accès                                    |
| ------- | ------------------------------ | ---------------------------------------- |
| GET     | `/health`                      | public                                   |
| POST    | `/auth/register`               | public (crée toujours un `client`)       |
| POST    | `/auth/login`                  | public                                   |
| GET     | `/auth/me`                     | connecté                                 |
| GET     | `/services`                    | public (services actifs)                 |
| GET     | `/services/all`                | admin (y compris les services désactivés) |
| POST    | `/services`                    | admin                                    |
| PATCH   | `/services/:id`                | admin                                    |
| GET     | `/vehicles`                    | client                                   |
| POST    | `/vehicles`                    | client                                   |
| PATCH   | `/vehicles/:id`                | client                                   |
| DELETE  | `/vehicles/:id`                | client                                   |
| GET     | `/appointments`                | selon le rôle (client : les siens, mécano : les siens assignés, admin : tous) |
| POST    | `/appointments`                | client                                   |
| PATCH   | `/appointments/:id/assign`     | admin                                    |
| PATCH   | `/appointments/:id/status`     | admin, mécano assigné, client (annulation) |
| GET     | `/users/mechanics`             | admin                                    |
| GET     | `/users/staff`                 | admin (mécaniciens et administrateurs)   |
| POST    | `/users/staff`                 | admin (crée un mécano ou un admin)       |

## Configuration

Avec Docker, tout est déjà défini dans `docker-compose.yml`. Pour un lancement sans Docker, copiez les fichiers d'exemple.

**`Back-end/.env`**

| Variable     | Rôle                                        | Exemple                                      |
| ------------ | ------------------------------------------- | -------------------------------------------- |
| `PORT`       | Port de l'API                               | `3000`                                       |
| `MONGO_URI`  | Connexion MongoDB                           | `mongodb://localhost:27017/garage_landrover` |
| `JWT_SECRET` | Clé de signature des tokens (à garder secrète) | une longue chaîne aléatoire               |
| `CLIENT_URL` | Origine du front autorisée (CORS)           | `http://localhost:5173`                      |

**`frontend/.env`**

| Variable       | Rôle              | Exemple                     |
| -------------- | ----------------- | --------------------------- |
| `VITE_API_URL` | Adresse de l'API  | `http://localhost:3000/api` |

## Développement sans Docker

Il faut un MongoDB accessible (par exemple `docker compose up mongo -d`).

```bash
# API
cd Back-end
cp .env.example .env
pnpm install
pnpm dev

# Site (dans un autre terminal)
cd frontend
cp .env.example .env
pnpm install
pnpm dev
```

Pour les données de démonstration : `pnpm seed` dans `Back-end`.

## Consulter la base avec MongoDB Compass

1. Ouvrir Compass puis **Add new connection**.
2. URI : `mongodb://localhost:27017`
3. Se connecter : la base `garage_landrover` contient les collections `users`, `services`, `vehicles` et `appointments`.

La base n'apparaît qu'après la première écriture (lancer le seed ou créer un compte).

## Feuille de route

**Priorité 1 : rendre la réservation utilisable**
- [x] Espace client : gestion des véhicules (ajout, liste, suppression)
- [x] Espace client : formulaire de rendez-vous (véhicule, prestation, date, description du problème)
- [x] Annulation d'un rendez-vous depuis l'espace client

**Priorité 2 : planification côté garage**
- [ ] Créneaux réellement disponibles (le formulaire propose pour l'instant tous les créneaux des horaires d'ouverture, sans tenir compte des rendez-vous déjà pris)
- [x] Éviter les chevauchements d'un même mécanicien (refusés à l'assignation)
- [x] Gestion des services et du personnel depuis l'espace admin
- [ ] Refaire l'espace mécanicien dans le même style (tâches du jour, notes)
- [ ] Vue calendrier du planning admin
- [ ] Désactiver ou supprimer un membre de l'équipe
- [ ] Temps réel passé par rapport au temps estimé

**Priorité 3 : suivi et communication**
- [ ] Notifications de confirmation et de rappel (email, SMS ou WhatsApp)
- [ ] Historique d'entretien par véhicule
- [ ] Notes et photos du mécanicien

**Qualité et mise en production**
- [ ] Validation des entrées côté API, limitation de débit, en-têtes de sécurité
- [ ] Tests automatisés et documentation OpenAPI
- [ ] Vraies coordonnées, photos et textes sur la page de présentation
- [ ] Image Docker de production, base hébergée, nom de domaine et HTTPS
