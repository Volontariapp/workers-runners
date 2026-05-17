# Workers Runners 🏃‍♂️📦

Ce dépôt contient les **Workers** chargés de l'exécution asynchrone des tâches lourdes et des processus d'arrière-plan. Il s'intègre dans une architecture microservices multi-dépôts basée sur le **Transactional Outbox Pattern** pour garantir une communication fiable et _at-least-once delivery_ sans couplage direct entre les services.

## 🏗️ Architecture & Dépendances

Le projet s'appuie fortement sur notre écosystème multi-repo :

- **`npm-packages`** : Notre dépôt central de bibliothèques partagées. Les workers étendent la classe `BaseWorker` et importent les définitions de domaines, les interfaces et les configurations globales depuis ce package.
- **Redis / BullMQ** : Utilisé comme broker de messages haute performance pour la distribution et le queuing des jobs vers les runners.

---

## 🔄 Cycle de Vie Complet d'un Job (Transactional Outbox)

Pour garantir la résilience du système, aucun Microservice (MS) ne pousse directement dans Redis. Tout passe par des tables d'Outbox transactionnelles.

Voici le flux complet, de l'initialisation du job jusqu'à son nettoyage final :

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
    MS -->|1. Persiste le Job<br>Job_State = Pending| DB_OUT
    DB_OUT -->|2. Pull les jobs Pending<br>& passe à Processing| OB_WORKER1
    OB_WORKER1 -->|3. Push le job<br>Job_State = Done dans outbox| REDIS_Q
    REDIS_Q -->|4. Récupère le job| RUNNERS

    %% Actions du Runner
    RUNNERS -->|5. Écrit le début de tâche<br>Job_Status = 'working'| DB_AUDIT
    RUNNERS -->|6. Exécute le traitement métier| RUNNERS
    RUNNERS -->|7. Met à jour la fin de tâche<br>Job_Status = 'done'| DB_AUDIT

    %% Cycle de post-traitement
    DB_AUDIT -->|8. Trigger SQL automatique| DB_EV_OUT
    DB_EV_OUT -.->|Event = Pending| DB_EV_OUT
    DB_EV_OUT -->|9. Pull l'event Pending<br>& passe à Process| OB_WORKER2
    OB_WORKER2 -->|10. Publie l'évènement<br>Event = Done dans outbox| REDIS_STR
    REDIS_STR -->|11. Écoute le Stream| POST_PROC
    POST_PROC -->|12. Hard Delete du job initial| DB_OUT

    %% Ajustements graphiques pour la lisibilité
    style RUNNERS color:#000,stroke:#2e7d32,stroke-width:3px;
```
