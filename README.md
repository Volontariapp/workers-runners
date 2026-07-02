# Workers Runners 🏃‍♂️📦

## Project Overview & Value Proposition

Ce dépôt héberge la flotte de **Workers Runners** de Volontariapp. Ces runners exécutent de manière asynchrone les tâches lourdes et les processus d'arrière-plan du système.

L'architecture est entièrement construite sur des **Contextes d'Application Standalone NestJS** (sans pile HTTP ni serveur Express/Fastify), garantissant une empreinte RAM minimale (ultra-légère) et un boot-up instantané, tout en conservant la puissance de l'injection de dépendances de NestJS et de la gestion de files d'attente avec `@nestjs/bullmq`.

> **Note d'Architecture** : Pour en savoir plus sur le cycle de vie transactionnel complet, la résolution stricte des dépendances (`esbuild`/`tsx`), et le Graceful Shutdown, référez-vous au [Document d'Architecture (ARCHITECTURE.md)](file:///Users/victoragahi/Developer/meta/workers-runners/ARCHITECTURE.md).

## Key Features

- **Traitement Asynchrone de Jobs** : Consommation de files d'attente partagées (via BullMQ) pour déléguer les tâches longues (emails, synchronisation de données, publications).
- **Architecture Modulaire Isolé** : Un runner dédié par domaine métier (`worker-user`, `worker-event`), permettant un provisionnement granulaire des ressources selon la charge.
- **Boot ultra-rapide** : L'utilisation de l'IoC NestJS en mode "Standalone Application Context" permet au daemon de s'exécuter en tâche de fond avec des ressources minimales.
- **Orchestration Unifiée** : Un outil en ligne de commande interactif (`command.sh`) centralise l'installation, le build, les tests et le run en parallèle (via `concurrently`).

## Tech Stack & Dependencies

| Composant | Technologie | Usage / Rôle |
| :--- | :--- | :--- |
| **Framework Base** | NestJS (Standalone) | Inversion de contrôle, sans charge HTTP. |
| **Base asynchrone** | [`@volontariapp/workers`](https://github.com/Volontariapp/npm-packages/tree/main/packages/workers) | Librairie métier centralisée (Audits SQL automatiques, wrappers BullMQ). |
| **Gestionnaire de Queue**| BullMQ (`@nestjs/bullmq`) | Gestion performante des files d'attente via Redis. |
| **Base de Données** | PostgreSQL & TypeORM | Tables d'audit (`job_audit`) mises à jour automatiquement à l'exécution du worker. |

## Getting Started

### Prérequis

- **Node.js** (>= 24.14.0)
- **Package Manager** : Yarn v4 (`corepack enable`)
- Infrastructure Redis et PostgreSQL (générée par `ci-tools`).

### Registre des Binds Port & File d'attente (BullMQ)

Les files d'attente sont fortement typées grâce aux contrats (`@volontariapp/messaging`) :

| Nom du Worker | Port Interne | File d'attente BullMQ | Type de Job Consommé | Handler Métier |
| :--- | :---: | :--- | :--- | :--- |
| **`worker-user`** | `4102` | `UserQueue.USER` | `user.send_welcome_email` <br> `user.reset_password` | `SendWelcomeEmailHandler` <br> `ResetPasswordHandler` |
| **`worker-event`** | `4103` | `EventsQueue.EVENTS` | `events.publish_event` | `PublishEventHandler` |
| **`worker-post`** | `4104` | `PostQueue.POST` | `post.publish_post` | `PublishPostHandler` |
| **`worker-social`** | `4105` | `SocialQueue.SOCIAL` | `social.follow_user` | `FollowUserHandler` |

### Installation et Command Center

Le dépôt fournit un panneau de contrôle interactif :

```bash
cd workers-runners

# Menu interactif principal
./command.sh

# Raccourcis directs :
./command.sh 1 # Install All (Yarn install partout)
./command.sh 2 # Build All
./command.sh 8 # Run All (Lancement de tous les workers en local en parallèle)
```

## Testing & CI/CD

- **Validation GitHub Actions** : Lancement matriciel pour les tests (`yarn test`), le build (`yarn build`) et le linter (`yarn lint`) sur chaque domaine indépendamment.
- **Déploiement GitOps** : Une fusion sur la branche `main` met à jour automatiquement le sous-module de déploiement (`Volontariapp/deploy`), pilotant la flotte sur le cluster de production de manière silencieuse.
