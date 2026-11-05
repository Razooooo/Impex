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
| Back     | Node.js, Express 5, Mongoose, JWT, bcryptjs, Nodemailer |
| Données  | MongoDB 7                                             |
| Outillage | Docker Compose, pnpm, Mailpit (boîte mail de développement) |

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
| Espace mécanicien : interventions du jour, démarrer / terminer, notes | Terminé |
| Espace client : véhicules, rendez-vous, annulation | Terminé    |
| Créneaux réellement disponibles (mécaniciens, durée, rendez-vous déjà pris) | Terminé |
| Absences des mécaniciens et fermetures du garage (jours fériés, inventaire) | Terminé |
| Espace admin : calendrier (vue jour par mécanicien, vue semaine) | Terminé |
| Mon compte : modifier ses informations, changer son mot de passe | Terminé |
| Mot de passe oublié (lien par email) | Terminé |
| Désactiver / réactiver un membre de l'équipe | Terminé |
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

Le seed peut être relancé sans risque après une mise à jour : il n'ajoute que ce qui manque (par exemple un nouveau service) et ne modifie pas les données existantes.

| Service  | Adresse                            |
| -------- | ---------------------------------- |
| Site     | http://localhost:5173              |
| API      | http://localhost:3000/api/health   |
| MongoDB  | `mongodb://localhost:27017`        |
| Emails de développement (Mailpit) | http://localhost:8025 |

Mailpit capte tous les emails envoyés par l'API (par exemple le lien « mot de passe oublié ») sans rien envoyer pour de vrai : ouvrez son interface pour les lire.

Au quotidien :

```bash
docker compose up -d      # démarrer en arrière-plan
docker compose down       # arrêter (les données sont conservées)
```

Le code est monté en volume : le front se recharge à chaque modification et le back redémarre via `nodemon` (lancé avec `-L`, nécessaire pour détecter les changements sous Windows). En développement sous Docker, si un style manque après l'ajout d'un nouveau fichier du front (marges absentes, par exemple), `docker compose restart frontend` suffit. Un `--build` n'est nécessaire que si un `Dockerfile` ou les dépendances changent :

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
│       ├── config/          connexion MongoDB, horaires et fuseau du garage
│       ├── controllers/     logique métier
│       ├── middlewares/     authentification, rôles, erreurs
│       ├── models/          User, Vehicle, Service, Appointment
│       ├── routes/          routes de l'API
│       ├── scripts/         seed.js
│       ├── utils/           availability.js (créneaux disponibles), garageTime.js (heures du garage),
│       │                    mailer.js (emails), appointmentSummary.js
│       ├── app.js
│       └── server.js
└── frontend/
    ├── public/images/       photos des modèles
    └── src/
        ├── components/      BaseModal (fenêtre générique), AuthModal (connexion / inscription),
        │                    VehicleModal, AppointmentModal, StaffModal, ServiceModal,
        │                    AdminAppointmentCard, MechanicTaskCard
        ├── data/            contenu de la page de présentation, horaires d'ouverture, photos des modèles
        ├── directives/      v-reveal (animations au scroll)
        ├── lib/             api (Axios), format (dates, durées, créneaux), categories (zones, symptômes), modalStack
        ├── router/          routes et protection par rôle
        ├── stores/          Pinia : auth, ui
        └── views/           HomeView, ClientDashboard, AdminDashboard, MechanicDashboard
```

### Modèle de données

- **User** : prénom, nom, email, mot de passe haché, téléphone, rôle.
- **Vehicle** : propriétaire, modèle Land Rover, année, plaque, VIN, motorisation, kilométrage.
- **Service** : nom, catégorie (zone), durée estimée par défaut, actif ou non, et `forUnknownProblem` pour le service « Diagnostic général » proposé au client qui ne sait pas ce qui ne va pas.
- **TimeOff** : fermeture du garage ou absence d'un mécanicien (dates de début et de fin incluses, motif).
- **Appointment** : client, véhicule, service, date, statut, mécanicien assigné, temps estimé, notes du client (dont les symptômes cochés) et du mécanicien.

Statuts d'un rendez-vous : `pending` → `confirmed` → `in_progress` → `done` (ou `cancelled`).

Règles métier :
- Un créneau n'est proposé (et accepté à la réservation) que si l'intervention se termine avant la fermeture et qu'il reste au moins un mécanicien libre pendant toute sa durée. Les demandes encore en attente comptent comme occupant un mécanicien, pour ne jamais promettre plus que ce que le garage peut tenir. Le serveur revérifie le créneau à la création du rendez-vous.
- Une **fermeture du garage** ou l'**absence d'un mécanicien** (journées entières, motif facultatif) retire aussitôt les créneaux concernés : un mécanicien absent n'est plus compté comme disponible, un jour de fermeture n'est plus réservable (le motif est affiché au client) et assigner un mécanicien absent est refusé. Les rendez-vous déjà pris sur la période ne sont pas annulés automatiquement : l'admin en reçoit la liste pour les réassigner ou les refuser.
- Un **compte désactivé** ne peut plus se connecter, et ses sessions déjà ouvertes sont refusées aussitôt. Il n'est plus compté dans les créneaux ni proposé à l'assignation, mais son historique est conservé. Ses interventions à venir restent à réassigner : elles occupent une place dans les créneaux tant qu'elles ne le sont pas. On ne peut pas désactiver son propre compte.
- **Mots de passe** : changer son mot de passe (ou le réinitialiser) ferme toutes les autres sessions. Le lien « mot de passe oublié » est valable une heure, utilisable une seule fois, et n'est stocké que sous forme d'empreinte. La réponse de l'API est la même que l'adresse existe ou non, et une seule demande par minute est prise en compte par compte.
- Les horaires d'ouverture, le pas entre deux créneaux (30 min), le délai minimum avant un rendez-vous (1 h) et le fuseau du garage (Antananarivo, UTC+3) sont définis dans `Back-end/src/config/garage.js`. Toutes les heures s'affichent à l'heure du garage, quel que soit le fuseau du navigateur.
- Assigner un mécanicien passe un rendez-vous `pending` en `confirmed`.
- L'assignation est refusée si le mécanicien a déjà une intervention (confirmée ou en cours) qui chevauche le créneau, durée estimée comprise.
- Un rendez-vous ne peut pas passer `in_progress` sans mécanicien assigné.
- Un client ne peut annuler son rendez-vous que tant qu'il est `pending` ou `confirmed`, et ne peut pas supprimer un véhicule qui a un rendez-vous à venir.
- Un mécanicien ne voit que les rendez-vous qui lui sont assignés, et seulement le nom du client (pas ses coordonnées). Il peut les faire avancer (`confirmed` → `in_progress` → `done`) et rédiger une note, mais pas annuler, sauter une étape ni rouvrir une intervention.

## API

Toutes les routes sont préfixées par `/api`. Les routes protégées attendent l'en-tête `Authorization: Bearer <token>`.

| Méthode | Route                          | Accès                                    |
| ------- | ------------------------------ | ---------------------------------------- |
| GET     | `/health`                      | public                                   |
| POST    | `/auth/register`               | public (crée toujours un `client`)       |
| POST    | `/auth/login`                  | public                                   |
| POST    | `/auth/forgot-password`        | public (envoie un lien par email ; réponse identique que le compte existe ou non) |
| POST    | `/auth/reset-password`         | public (avec le jeton reçu par email)    |
| GET     | `/auth/me`                     | connecté                                 |
| PATCH   | `/auth/me`                     | connecté (nom, téléphone ; l'email demande le mot de passe actuel) |
| PATCH   | `/auth/password`               | connecté (ferme les autres sessions)     |
| GET     | `/services`                    | public (services actifs)                 |
| GET     | `/services/all`                | admin (y compris les services désactivés) |
| POST    | `/services`                    | admin                                    |
| PATCH   | `/services/:id`                | admin                                    |
| GET     | `/availability?date=&serviceId=` | client (créneaux du jour pour une prestation, et prochain créneau libre si le jour est complet ou fermé) |
| GET     | `/garage`                      | public (horaires d'ouverture, pas des créneaux, fuseau) |
| GET     | `/timeoff`                     | admin (absences et fermetures en cours ou à venir) |
| POST    | `/timeoff`                     | admin (déclare une absence ou une fermeture ; renvoie les rendez-vous déjà pris sur la période) |
| DELETE  | `/timeoff/:id`                 | admin                                    |
| GET     | `/vehicles/models`             | client (liste des modèles acceptés)      |
| GET     | `/vehicles`                    | client                                   |
| POST    | `/vehicles`                    | client                                   |
| PATCH   | `/vehicles/:id`                | client                                   |
| DELETE  | `/vehicles/:id`                | client                                   |
| GET     | `/appointments`                | selon le rôle (client : les siens, mécano : les siens assignés, admin : tous) |
| POST    | `/appointments`                | client                                   |
| PATCH   | `/appointments/:id/assign`     | admin                                    |
| PATCH   | `/appointments/:id/status`     | admin, mécano assigné (confirmé → en cours → terminé uniquement), client (annulation) |
| PATCH   | `/appointments/:id/notes`      | admin, mécano assigné (note visible par le client) |
| GET     | `/users/mechanics`             | admin                                    |
| GET     | `/users/staff`                 | admin (mécaniciens et administrateurs)   |
| POST    | `/users/staff`                 | admin (crée un mécano ou un admin)       |
| PATCH   | `/users/staff/:id/active`      | admin (désactive ou réactive ; renvoie les interventions à réassigner) |

## Configuration

Avec Docker, tout est déjà défini dans `docker-compose.yml`. Pour un lancement sans Docker, copiez les fichiers d'exemple.

**`Back-end/.env`**

| Variable     | Rôle                                        | Exemple                                      |
| ------------ | ------------------------------------------- | -------------------------------------------- |
| `PORT`       | Port de l'API                               | `3000`                                       |
| `MONGO_URI`  | Connexion MongoDB                           | `mongodb://localhost:27017/garage_landrover` |
| `JWT_SECRET` | Clé de signature des tokens (à garder secrète) | une longue chaîne aléatoire               |
| `CLIENT_URL` | Origine du front autorisée (CORS), aussi utilisée dans les liens des emails | `http://localhost:5173`      |
| `SMTP_HOST`  | Serveur d'envoi des emails. Absent : aucun email n'est envoyé, le lien est affiché dans la console de l'API | `mailpit` (Docker), ou celui de votre fournisseur |
| `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` | Réglages du serveur SMTP | `587`, `false`, … |
| `MAIL_FROM`  | Expéditeur des emails                       | `IMPEX <no-reply@impex.mg>`                  |
| `GARAGE_UTC_OFFSET_MINUTES` | Fuseau du garage (Antananarivo = UTC+3) | `180` (par défaut)                |

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
- [x] Créneaux réellement disponibles (durée de la prestation, mécaniciens libres, demandes en attente comprises)
- [x] Congés et absences des mécaniciens, jours fériés et fermetures exceptionnelles du garage
- [ ] Absences sur une demi-journée ou quelques heures (aujourd'hui, une absence couvre des journées entières)
- [ ] Reprogrammer un rendez-vous (changer sa date) depuis l'espace admin, par exemple quand une fermeture le touche
- [x] Éviter les chevauchements d'un même mécanicien (refusés à l'assignation)
- [x] Gestion des services et du personnel depuis l'espace admin
- [x] Espace mécanicien dans le même style (interventions du jour, notes)
- [x] Vue calendrier du planning admin
- [x] Désactiver ou réactiver un membre de l'équipe
- [ ] Modifier les informations d'un membre de l'équipe depuis l'espace admin
- [ ] Temps réel passé par rapport au temps estimé

**Priorité 3 : suivi et communication**
- [ ] Notifications de confirmation et de rappel (email, SMS ou WhatsApp)
- [ ] Historique d'entretien par véhicule
- [ ] Notes et photos du mécanicien

**Qualité et mise en production**
- [ ] Validation des entrées côté API, limitation de débit sur la connexion, en-têtes de sécurité
- [ ] Vérification de l'adresse email à l'inscription, et suppression de son compte par le client
- [ ] Configurer un vrai serveur SMTP (le front et l'API sont prêts : il suffit de renseigner `SMTP_*`)
- [ ] Tests automatisés et documentation OpenAPI
- [ ] Vraies coordonnées, photos et textes sur la page de présentation
- [ ] Image Docker de production, base hébergée, nom de domaine et HTTPS
