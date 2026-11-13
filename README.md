<<<<<<< HEAD
# Campus Incidents — démo

API de gestion des pannes et incidents d'un campus : **Express + TypeScript + Prisma + PostgreSQL**.
=======
# Campus Connect — démo

API de gestion des pannes d'un campus : **Express + TypeScript + Prisma + PostgreSQL**.
>>>>>>> 24f9b4eb547c871a340585b08d1b54778a7af3d1

## Architecture (en couches)

```
Routes / Controller  →  Service  →  Domaine (Ticket + États)  →  Repository (interface)
  (HTTP, rôles, zod)    (cas d'usage)   (règles de transition)     ├─ Prisma (PostgreSQL)
                             │                                      └─ InMemory (tests)
                             └──► EventBus ──► Historique + NotificationService ──► Canaux (in-app, email)
```

| Pattern | Où |
|---|---|
| State | `modules/tickets/domain/states.ts` |
| Strategy | `modules/tickets/strategies/assignment.ts` |
| Repository | `modules/*/…repository.ts` (interface) + implémentations Prisma / InMemory |
| Observer / Pub-Sub | `shared/event-bus.ts` |
| Adapter | `modules/notifications/channels.ts` |
| Composition root (injection) | `container.ts` |

## Démarrage rapide (sans base de données)

```bash
npm install
<<<<<<< HEAD
npm start                       # mode « memory » par défaut → http://localhost:3000 (interface) et /api
npm test                        # scénario complet, en mémoire
```

> Le mode se choisit avec `DATA_MODE` (`memory` ou `prisma`), et une variable d'environnement
> l'emporte sur `.env`. Bash : `DATA_MODE=memory npm start`. PowerShell : `$env:DATA_MODE="memory"; npm start`.
> Sous PowerShell, `curl` est un alias de `Invoke-WebRequest` : utilisez `curl.exe` ou `Invoke-RestMethod`.

=======
DATA_MODE=memory npm start      # http://localhost:3000/api
npm test                        # scénario complet, en mémoire
```

>>>>>>> 24f9b4eb547c871a340585b08d1b54778a7af3d1
## Avec PostgreSQL

```bash
cp .env.example .env            # DATA_MODE=prisma
npm run db:up                   # PostgreSQL via Docker
npm run prisma:generate
npm run db:push                 # crée les tables
npm run db:seed                 # utilisateurs, lieux, catégories de démo
npm start
```

<<<<<<< HEAD
Les mêmes tests peuvent être rejoués contre PostgreSQL (base migrée et seedée) :
`DATA_MODE=prisma npm test` (PowerShell : `$env:DATA_MODE="prisma"; npm test`).

## Docker

```bash
docker compose up -d                       # PostgreSQL seul (développement)
docker compose --profile full up --build   # démo complète : base + migration/seed + application → http://localhost:3000
```

`Dockerfile` multi-étapes : `build` (dépendances complètes, client Prisma, compilation `tsc`) →
`prod-deps` (production uniquement) → `runtime` (utilisateur non-root `node`, `HEALTHCHECK` sur `/api/health`).
`prod-deps` utilise `--omit=optional` : sans cela, `@prisma/client` (dépendance de pair optionnelle) fait entrer
tout le CLI Prisma dans l'image (206 Mo → 87 Mo de `node_modules` une fois exclu).
Le service `migrate` est une tâche unique (`prisma db push` + seed) qui s'exécute avant l'application.

## Pipeline CI (`.github/workflows/ci.yml`)

| Job | Contenu | Bloquant |
|---|---|---|
| `test` | `prisma generate`, typecheck, tests en mémoire, puis les mêmes tests contre PostgreSQL | oui |
| `security` | `npm audit` sur ce qui est livré (`--omit=dev --omit=optional`), gitleaks ; audit complet informatif | oui (HIGH/CRITICAL) |
| `docker` | build, Trivy (CRITICAL bloquant, HIGH informatif), test de fumée du conteneur (santé, interface, non-root), publication sur GHCR (branche `main` uniquement) | oui |

Pas encore couvert : déploiement sur un cloud, supervision, infrastructure décrite en code.

## Diagrammes de classes

`docs/class-domain.mmd` (Ticket, états, stratégies), `docs/class-application.mmd` (services, repositories,
bus d'événements, notifications, composition) et `docs/class-errors.mmd` (erreurs), avec leurs rendus `.png` / `.svg`.

=======
>>>>>>> 24f9b4eb547c871a340585b08d1b54778a7af3d1
## Authentification de démo

Pas de login : l'utilisateur est désigné par l'en-tête `x-user-id` (à remplacer par SSO/JWT).

| x-user-id | Rôle |
|---|---|
| `u-student` | REPORTER (signaleur) |
| `u-dispatcher` | DISPATCHER |
| `u-tech-elec`, `u-tech-it` | TECHNICIAN |
| `u-admin` | ADMIN |

## Scénario de démo (curl)

```bash
H='content-type: application/json'
API=http://localhost:3000/api

# 1. L'étudiante signale une panne
curl -s -X POST $API/tickets -H "$H" -H 'x-user-id: u-student' \
  -d '{"title":"Projecteur en panne","description":"Ne démarre plus","locationId":"loc-a-101"}'
# → noter l'id : ID=...

# 2. Le dispatcher qualifie puis affecte (stratégie par compétence)
curl -s -X PATCH $API/tickets/$ID/qualify -H "$H" -H 'x-user-id: u-dispatcher' \
  -d '{"priority":"HIGH","categoryId":"cat-electricity"}'
curl -s -X POST $API/tickets/$ID/assign -H "$H" -H 'x-user-id: u-dispatcher' \
  -d '{"strategy":"category"}'

# 3. Le technicien traite
curl -s -X POST $API/tickets/$ID/start   -H 'x-user-id: u-tech-elec'
curl -s -X POST $API/tickets/$ID/resolve -H "$H" -H 'x-user-id: u-tech-elec' -d '{"comment":"Lampe remplacée"}'

# 4. L'étudiante note → clôture
curl -s -X POST $API/tickets/$ID/feedback -H "$H" -H 'x-user-id: u-student' -d '{"rating":5}'

# 5. Suivi
curl -s $API/tickets/$ID       -H 'x-user-id: u-student'      # détail + historique
curl -s $API/notifications     -H 'x-user-id: u-student'      # notifications reçues
curl -s $API/dashboard         -H 'x-user-id: u-dispatcher'   # indicateurs
```

## Endpoints

| Méthode | Route | Rôle |
|---|---|---|
| POST | `/tickets` | tous |
| GET | `/tickets`, `/tickets/:id` | tous (filtré selon le rôle) |
| PATCH | `/tickets/:id/qualify` | DISPATCHER, ADMIN |
| POST | `/tickets/:id/reject` · `/assign` | DISPATCHER, ADMIN |
| POST | `/tickets/:id/start` · `/resolve` | TECHNICIAN (assigné) |
| POST | `/tickets/:id/feedback` · `/reopen` | REPORTER (propriétaire) |
| GET | `/locations`, `/categories`, `/notifications` | tous |
| GET | `/technicians`, `/dashboard` | DISPATCHER, ADMIN |

Une transition interdite renvoie **409 `INVALID_TRANSITION`** (levée par le pattern State).

## Simplifications assumées (à faire évoluer)

- Pas de photos/pièces jointes ni de commentaires (le champ « description » remplace le QR code)
- `reopen` renvoie directement à l'état `ASSIGNED` (pas d'état `REOPENED` séparé)
- Email simulé dans la console (`EmailConsoleChannel`) ; pas de SLA ni d'escalade
- Authentification par en-tête, à remplacer par SSO/JWT
