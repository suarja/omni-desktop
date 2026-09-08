# Omni Desktop — Protocole d’orchestration

Date : 2026-09-08

Statut : protocole de travail proposé

## But

Ce protocole sépare le travail de direction produit du travail d’exécution.

Le rôle de l’orchestrateur est de maintenir le contexte frais, de protéger le périmètre, de découper les unités de travail, de choisir l’architecture, de déléguer les tâches exécutables et de relire les résultats.

Le rôle d’un sub-agent est d’exécuter une tâche bornée avec un contexte explicite, un périmètre de fichiers clair et un contrat de sortie vérifiable.

## Répartition des responsabilités

### Orchestrateur

L’orchestrateur :

- conserve la vision produit et les décisions validées ;
- tient à jour les milestones, user stories et critères d’acceptation ;
- choisit les approches d’architecture et expose les arbitrages ;
- découpe le travail en tâches indépendantes ;
- attribue chaque tâche à un agent adapté ;
- évite les écritures concurrentes sur les mêmes fichiers ;
- relit les changements, la validation et les limites ;
- décide si le résultat est accepté, révisé ou rejeté ;
- ne pousse, ne publie et ne fusionne qu’avec une autorisation explicite.

### Sub-agent

Un sub-agent :

- reçoit uniquement le contexte nécessaire à sa tâche ;
- ne redéfinit pas le périmètre produit ;
- ne modifie pas les fichiers hors de son write set ;
- ne remplace pas une décision d’architecture par une préférence locale ;
- produit un résumé des changements, des commandes exécutées et des risques restants ;
- s’arrête lorsqu’un blocage dépasse son périmètre.

### Reviewer

La revue vérifie :

- la conformité à la user story ;
- la cohérence avec les contrats existants ;
- l’absence de régression hors périmètre ;
- les tests et validations réellement exécutés ;
- les permissions, la provenance, les licences et les effets destructifs ;
- la qualité de la documentation et du handoff.

## Garde-fous

1. Aucun agent ne commence une implémentation tant que la section de design concernée n’est pas validée.
2. Une tâche possède un seul objectif principal et un write set explicite.
3. Deux agents ne modifient jamais simultanément le même fichier.
4. Une tâche de lecture ou de proposition ne doit pas être présentée comme une implémentation.
5. Les changements destructifs, distants ou irréversibles restent sous contrôle de l’orchestrateur.
6. Chaque agent doit laisser une preuve exploitable : fichiers, diff, commandes, tests, limites.
7. Un agent ne doit pas étendre le périmètre parce qu’il découvre une amélioration intéressante.

## Cycle d’une tâche

### 1. Cadrage

L’orchestrateur écrit :

- le milestone et la user story ;
- le résultat attendu ;
- les fichiers autorisés ;
- les fichiers explicitement hors scope ;
- les dépendances ;
- les critères d’acceptation ;
- la validation attendue.

### 2. Dispatch

Le prompt du sub-agent doit être autonome. Il ne doit pas dépendre de la mémoire implicite de la conversation.

Modèle de brief :

    Mission :
    Contexte produit :
    User story :
    Entrées à lire :
    Fichiers autorisés :
    Fichiers interdits :
    Contraintes d’architecture :
    Critères d’acceptation :
    Commandes de validation :
    Format du compte rendu :

### 3. Exécution

L’agent travaille dans une branche ou un worktree isolé lorsque la tâche modifie le code. Pour une tâche de recherche, de design ou de rédaction, il ne modifie pas le repository tant que l’orchestrateur n’a pas demandé un fichier précis.

### 4. Revue

L’orchestrateur inspecte le diff et compare le résultat aux critères d’acceptation. Il vérifie aussi que l’agent n’a pas modifié un fichier hors scope.

### 5. Validation

Les tests, typechecks, builds, captures ou vérifications visuelles sont rapportés séparément. PASS, FAIL, NOT RUN et BLOCKED ne doivent jamais être confondus.

### 6. Intégration

L’intégration se fait uniquement après revue. Le commit doit rester focalisé sur une unité de travail compréhensible.

## Délégation des planches de design

Les planches simples peuvent être produites en parallèle par un sub-agent de design, mais l’orchestrateur conserve :

- la séquence des planches ;
- les décisions que chaque planche doit valider ;
- les invariants de produit ;
- la distinction entre inspiration et réutilisation ;
- la décision finale sur le style et le parcours.

Le premier brief visuel doit porter sur le parcours P0, pas sur toutes les fonctionnalités futures. Une planche qui montre une automation SaaS, un agent autonome ou une marketplace publique ne doit pas être utilisée pour valider le noyau local-first.

Pour chaque planche, l’agent doit retourner :

- l’objectif utilisateur ;
- le contexte d’entrée ;
- les états principaux et les états d’erreur ;
- les composants visibles ;
- les interactions indispensables ;
- la décision de design à prendre ;
- les ambiguïtés et risques de sur-promesse.

## Parallélisation

Les tâches peuvent être parallélisées uniquement si elles ont :

- des entrées stables ;
- des responsabilités indépendantes ;
- des write sets disjoints ;
- une validation séparée.

Exemples adaptés :

- brief de planches et audit de conventions open source ;
- adaptateur Codex et adaptateur OpenCode ;
- catalogue local et composants de présentation, après contrat partagé.

Exemples non adaptés :

- deux agents qui modifient le même résolveur ;
- un agent qui change le contrat pendant qu’un autre implémente l’adaptateur ;
- plusieurs agents qui éditent le même README sans coordination.

## Format de compte rendu

Chaque agent termine par :

- Résultat ;
- Fichiers modifiés ;
- Commandes exécutées ;
- Validation PASS / FAIL / NOT RUN / BLOCKED ;
- Décisions prises ;
- Risques ou questions restantes ;
- Recommandation pour l’étape suivante.

## Cadence de travail

Le travail est organisé en passes courtes :

1. une passe de conception ou d’implémentation ;
2. une revue ciblée ;
3. une correction uniquement pour les problèmes importants du périmètre ;
4. une validation finale ;
5. un handoff vers le prochain milestone.

On ne relance pas un agent pour une amélioration de confort non liée aux critères d’acceptation.
