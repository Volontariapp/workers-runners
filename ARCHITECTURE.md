# Architecture & Design Document

## Architecture Overview

Les **workers-runners** sont le moteur asynchrone principal de la plateforme Volontariapp. Afin de combiner la propreté du code (Injection de Dépendances de NestJS) avec des impératifs d'exécution "Background Job" (rapidité, faible coût mémoire), ces projets utilisent le paradigme du **NestJS Standalone Application Context**.
De plus, ils s'intègrent profondément avec la base de données via `@volontariapp/workers` pour générer automatiquement une trace d'audit complète (`job_audit`).

## Directory Structure

Chaque sous-projet (ex: `worker-user`) est totalement isolé et autonome avec son propre `yarn.lock`.

```text
workers-runners/
├── worker-user/            
│   ├── src/
│   │   ├── handlers/      # Logique métier pour des tâches spécifiques (ex: SendWelcomeEmailHandler)
│   │   ├── modules/       # Importation des contextes (Redis, Postgres)
│   │   └── main.ts        # Bootstrap du Standalone App Context
├── worker-event/           # Dépendant de @volontariapp/domain-event
├── scripts/                # Outils bash (Bump des deps, clean, scaffold)
└── command.sh              # Entrypoint interactif centralisé
```

## Data Flow : Flux Outbox Transactionnel

Pour garantir un pattern d'exécution *At-Least-Once*, aucun microservice API ne pousse un message directement vers Redis. Le flux complet utilise les workers et une cascade de réconciliations via les Post-Processors (voir ci-dessous) :

```mermaid
graph TD
    %% Liens et styles globaux
    classDef ms fill:#e1f5fe,stroke:#03a9f4,stroke-width:2px;
    classDef db fill:#efebe9,stroke:#795548,stroke-width:2px;
    classDef worker fill:#e8f5e9,stroke:#4caf50,stroke-width:2px;
    classDef redis fill:#ffebee,stroke:#f44336,stroke-width:2px;

    %% Composants
    MS[Microservice]:::ms
    DB_OUT[Table: jobs_outbox]:::db
    OB_WORKER1[Outbox Worker]:::worker
    REDIS_Q[Redis: BullMQ Queue]:::redis
    RUNNERS["Workers Runners<br>(Ce Repo)"]:::worker
    DB_AUDIT[Table locale: job_audit]:::db
    DB_EV_OUT[Table: event_outbox]:::db
    OB_WORKER2[Outbox Worker]:::worker
    REDIS_STR[Redis: Stream]:::redis
    POST_PROC[Post-Processor]:::worker

    %% Flux de traitement
    MS -->|1. Persiste le Job (Pending)| DB_OUT
    DB_OUT -->|2. Pull (Processing)| OB_WORKER1
    OB_WORKER1 -->|3. Push vers file| REDIS_Q
    REDIS_Q -->|4. Récupère le job| RUNNERS

    %% Actions du Runner
    RUNNERS -->|5. Audit: 'working'| DB_AUDIT
    RUNNERS -->|6. Exécute métier| RUNNERS
    RUNNERS -->|7. Audit: 'done' / 'failed'| DB_AUDIT

    %% Cycle de post-traitement (Event Loop)
    DB_AUDIT -->|8. SQL Trigger| DB_EV_OUT
    DB_EV_OUT -->|9. Pull (Pending)| OB_WORKER2
    OB_WORKER2 -->|10. Push stream| REDIS_STR
    REDIS_STR -->|11. Écoute| POST_PROC
    POST_PROC -->|12. Hard Delete du job original| DB_OUT
```

## Design Decisions & Trade-offs

### 1. Standalone Application Context vs Serveur HTTP
- **Décision** : Démarrer l'application avec `NestFactory.createApplicationContext()`.
- **Raison** : Les workers consomment des files BullMQ ; ils n'ont pas de routes à exposer (hors Health Checks simplifiés). Ne pas initialiser Express/Fastify divise l'empreinte RAM par 4, idéal pour des conteneurs distribués sur Kubernetes.

### 2. Injection de Dépendances Explicite (`@Inject`)
- **Décision** : Toujours utiliser les décorateurs explicites pour l'injection (ex: `constructor(@Inject(JobAuditRepository) repo)`).
- **Raison** : Les bundles ultra-rapides (`esbuild`, `tsx` utilisés en Dev/CI) peuvent ignorer l'émission native des métadonnées de types (`emitDecoratorMetadata`). L'injection explicite évite de recevoir `undefined` au runtime et garantit une compatibilité à 100% avec les nouveaux tooling frontend/backend.

### 3. Graceful Shutdown & Nettoyage de Pool
- **Décision** : Assurer la fermeture propre de Postgres et Redis dans `OnModuleDestroy`.
- **Raison** : Lorsque Kubernetes envoie un `SIGTERM`, un processus brutal laisserait des connexions orphelines ouvertes (Ghost sockets). La fermeture propre empêche les fuites mémoires et les "Max Connections Exceeded" sur les instances de bases de données de Volontariapp.

### 4. Base métier dans `npm-packages/packages/workers`
- **Décision** : Les workers héritent tous de la classe générique `BaseJobHandler` (provenant de la librairie partagée).
- **Raison** : Centraliser la gestion d'état (`Working`, `Done`, `Failed`) et l'écriture dans la table SQL d'audit. Cela libère les développeurs qui n'ont qu'à se concentrer sur l'implémentation de la fonction métier `processJob(payload)`.
