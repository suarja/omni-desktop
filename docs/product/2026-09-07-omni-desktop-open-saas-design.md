# Omni Desktop — Open SaaS et gestion multi-marketplaces

**Date :** 2026-09-07
**Statut :** design validé en conversation, implémentation non démarrée
**Produit :** Omni Desktop
**Terrain de départ :** macOS, développeur solo, Codex, Claude Code et OpenCode
**Contexte Git :** design démarré sur `dev` après le merge local `efc10aa`

## Résumé

Omni Desktop est une application desktop open source, local-first, qui permet à un développeur solo de gérer plusieurs marketplaces de skills et de plugins, puis de synchroniser leur utilisation entre plusieurs projets et plusieurs harnais d’agents.

Le produit ne remplace pas les marketplaces existantes. Il les agrège, conserve leur provenance, normalise leur catalogue et matérialise un état désiré dans les projets de l’utilisateur.

La première version est déterministe : elle installe, met à jour, retire et vérifie des fichiers. Elle ne recommande pas encore de skills et ne génère pas encore de contenu avec un LLM.

La couche SaaS vient ensuite pour la synchronisation multi-machine, les jobs en arrière-plan, l’analyse de codebases, les recommandations et l’inférence hébergée.

## Décision produit

Le produit est **desktop-first**, et non un service web auquel on ajouterait plus tard une interface locale.

Le desktop est le point de contrôle principal parce qu’il est placé là où se trouvent réellement :

- les codebases ;
- les fichiers de configuration des harnais ;
- les skills installés ;
- les marketplaces locales ou clonées ;
- les permissions et les différences entre environnements.

Le cloud n’est pas requis pour que la proposition de valeur fondamentale fonctionne.

## Problème utilisateur

Un développeur solo travaille sur plusieurs codebases et utilise plusieurs harnais d’agents. Il accumule des skills et plugins provenant de sources différentes :

- marketplaces personnelles ;
- marketplaces externes ;
- dépôts Git ;
- dossiers locaux ;
- plugins contenant plusieurs skills et éventuellement des conventions ou configurations complémentaires.

Le problème n’est pas seulement de trouver un skill. Il faut savoir :

- quelle est sa source ;
- quelle version est utilisée ;
- dans quels projets il est actif ;
- pour quel harnais il est installé ;
- si une copie locale a divergé ;
- si une mise à jour externe est disponible ;
- si la suppression d’un élément doit s’appliquer à un projet ou à tous les projets.

Les outils actuels exposent généralement un marketplace ou un répertoire de skills par environnement. Ils ne fournissent pas une vue personnelle et transversale du système réellement utilisé.

## Utilisateur cible

La V1 vise le développeur solo qui :

- travaille sur plusieurs projets en parallèle ;
- passe d’un harnais à un autre ;
- crée ou adapte régulièrement des skills ;
- veut réutiliser ses conventions sans recopier manuellement des fichiers ;
- accepte une application locale open source ;
- préfère garder la maîtrise de ses fichiers et de ses clés.

Les rôles administrateurs, les organisations et la gestion d’équipe sont hors sujet pour la première version.

## Modèle Open SaaS

### Core open source

Omni Desktop doit être utile sans abonnement et sans compte :

- catalogue local multi-marketplaces ;
- connexion de sources personnelles et externes ;
- gestion des projets et des harnais ;
- affectation de plugins et skills ;
- installation, mise à jour et retrait déterministes ;
- détection de dérive ;
- import d’un plugin externe comme copie personnelle ;
- historique local des opérations ;
- export et compatibilité Git ;
- MCP local optionnel et borné.

### Couche SaaS payante

L’abonnement vend la continuité, l’automatisation et l’intelligence, pas le CRUD local :

- synchronisation entre plusieurs machines ;
- jobs et crons lorsque le desktop n’est pas ouvert ;
- surveillance périodique de plusieurs codebases ;
- analyse des diffs et détection de dérive ;
- recommandations de skills ou plugins ;
- création, fusion et amélioration de skills ;
- inférence hébergée avec quota inclus ;
- MCP distant et orchestration asynchrone.

Le BYOK reste possible. Un utilisateur peut fournir ses propres clés ou utiliser l’inférence incluse dans son abonnement Omni.

## Modèle mental

Le modèle de données suit cette chaîne :

```text
Marketplace source
  → Plugin
    → Skills / instructions / configurations supportées
      → Affectation projet + harnais
        → Fichiers réellement installés
```

Omni distingue trois états :

1. **Catalogue** — ce qui est disponible dans les sources connectées ;
2. **État désiré** — ce que l’utilisateur veut activer dans chaque projet et harnais ;
3. **État matérialisé** — ce qui existe réellement sur le disque.

Cette séparation permet de détecter une dérive sans écraser silencieusement le travail local.

## Objets principaux

| Objet              | Responsabilité                                                           |
| ------------------ | ------------------------------------------------------------------------ |
| Marketplace source | Référence vers une marketplace externe, personnelle ou locale            |
| Plugin             | Unité publiée par une marketplace, pouvant contenir plusieurs skills     |
| Skill              | Élément exploitable d’un plugin                                          |
| Fork importé       | Copie personnelle d’un plugin externe avec provenance conservée          |
| Projet             | Codebase locale surveillée par Omni                                      |
| Harnais            | Adaptateur Codex, Claude Code ou OpenCode                                |
| Affectation        | Déclaration qu’un plugin ou skill est actif pour un projet et un harnais |
| Installation       | État matérialisé des fichiers, hashes et chemins sur disque              |
| Opération          | Plan, application, résultat et éventuelle restauration                   |

Le plugin doit rester une unité de premier ordre. Omni ne doit pas aplatir automatiquement un plugin externe en une série de fichiers sans conserver sa structure, son identité et sa provenance.

## Sources et marketplaces

### Sources externes

Les marketplaces externes sont consommées en lecture seule par défaut.

Omni peut :

- se connecter à une source explicitement ajoutée par l’utilisateur ;
- rafraîchir son catalogue ;
- afficher ses plugins, versions, licences et compatibilités ;
- installer un plugin dans un projet ;
- signaler une mise à jour disponible.

Omni ne publie ni ne modifie une source externe en V1.

### Marketplace personnelle

L’utilisateur peut posséder une ou plusieurs marketplaces personnelles. Elles peuvent être :

- un dossier local ;
- un dépôt Git ;
- une structure suivie par Omni avec export versionnable.

Les skills créés ou importés dans cette marketplace peuvent être édités, versionnés et affectés à plusieurs projets.

### Import comme fork

« Importer comme copie personnelle » crée un snapshot détenu par l’utilisateur :

- contenu copié ;
- marketplace et plugin d’origine ;
- version d’origine ;
- licence ;
- hash du contenu ;
- date d’import ;
- absence de synchronisation bidirectionnelle automatique.

Les changements ultérieurs de la source externe peuvent être signalés, mais ne modifient jamais silencieusement le fork personnel.

L’import ne lance aucun script ou hook externe automatiquement.

## Réconciliation déterministe

Le cycle principal est :

```text
Rafraîchir les sources
  → normaliser le catalogue
    → calculer l’état désiré
      → générer un plan de changements
        → afficher les ajouts / modifications / retraits
          → appliquer après validation
            → vérifier les hashes et l’état final
```

### Principes

- Les opérations sont idempotentes.
- Chaque écriture est précédée d’un plan lisible.
- Omni ne supprime que les fichiers qu’il possède ou qu’il a explicitement installés.
- Un fichier modifié localement devient une dérive ou un conflit, jamais une cible d’écrasement silencieux.
- Les opérations destructives créent une sauvegarde ou une possibilité de restauration.
- Les mises à jour de sources externes génèrent d’abord un changement en attente.
- Les automatismes sont opt-in, notamment pour les sources personnelles de confiance.

### Suppression

Trois actions doivent être distinctes :

1. retirer l’affectation d’un seul projet ;
2. désinstaller partout où l’élément est affecté ;
3. supprimer l’élément du catalogue personnel.

La suppression depuis Omni peut déclencher une désinstallation globale, mais cette cascade doit être explicite, prévisualisée et confirmée.

## Architecture produit

L’application desktop est composée de responsabilités séparées :

1. **Interface desktop** — dashboard, catalogue, projets, plans et activité ;
2. **Service local Omni** — accès au disque, surveillance, Git et exécution des opérations ;
3. **Adaptateurs de marketplace** — lecture et normalisation des sources ;
4. **Catalogue local** — index des marketplaces, plugins, skills, versions et provenance ;
5. **Résolveur** — calcul des affectations et des changements ;
6. **Adaptateurs de harnais** — chemins, conventions et stratégies propres à Codex, Claude Code et OpenCode ;
7. **Moteur de réconciliation** — plan, application, vérification, conflit et restauration ;
8. **Journal local** — historique auditable des opérations.

Le renderer ne doit pas effectuer directement des écritures arbitraires sur le disque. Les mutations passent par le service local et par des opérations bornées.

## Expérience utilisateur

### Premier lancement

1. L’utilisateur choisit les dossiers de projets à surveiller.
2. Omni détecte Codex, Claude Code et OpenCode.
3. L’utilisateur ajoute une ou plusieurs marketplaces.
4. Omni réalise un scan initial en lecture seule.
5. L’application présente les plugins existants, les affectations possibles, les dérives et les conflits.

### Navigation principale

```text
Overview
Marketplaces
Plugins & Skills
Projects
Changes / Activity
Settings
```

Le dashboard met en avant l’état réel :

- sources indisponibles ;
- mises à jour disponibles ;
- projets en dérive ;
- conflits locaux ;
- changements en attente ;
- dernière synchronisation.

### Actions principales

- Ajouter à un projet ;
- Mettre à jour ;
- Retirer de ce projet ;
- Retirer partout ;
- Importer comme copie personnelle ;
- Examiner les différences ;
- Restaurer l’état précédent.

Avant toute écriture, l’utilisateur voit la source, la version, la licence, les fichiers concernés et les conséquences par projet et harnais.

## Harnais et compatibilité

La V1 cible macOS et trois harnais :

- Codex ;
- Claude Code ;
- OpenCode.

Chaque harnais dispose d’un adaptateur déclarant :

- les emplacements de fichiers reconnus ;
- les formats pris en charge ;
- la manière d’installer un plugin ou une skill ;
- les fichiers qu’Omni peut posséder ;
- les limites de compatibilité.

La compatibilité est déclarée par plugin et par harnais. Omni ne promet pas qu’un même plugin aura exactement le même comportement partout.

Windows, Linux et les autres providers sont des extensions ultérieures.

## MCP et asynchrone

Le MCP local fait partie de l’architecture open source mais reste borné. Il peut exposer :

- recherche dans le catalogue ;
- inspection d’un projet ;
- calcul d’un plan ;
- proposition d’affectation ;
- application d’un plan validé.

Il ne donne pas à un agent un accès arbitraire à toutes les sources ou au disque.

En V1, le rafraîchissement se fait :

- à l’ouverture de l’application ;
- à la demande ;
- via surveillance des sources locales ;
- via rafraîchissement explicite des dépôts Git.

Le daemon permanent, le cron distant, l’analyse de codebase et l’orchestration asynchrone appartiennent à la couche SaaS ultérieure.

## Sécurité, confiance et licences

Omni doit traiter les plugins comme du contenu potentiellement non fiable :

- ne jamais exécuter automatiquement leurs scripts ;
- afficher la source et la licence avant import ;
- conserver les hashes et versions ;
- distinguer contenu lu et contenu possédé ;
- limiter les permissions du service local ;
- journaliser les opérations d’écriture et de suppression ;
- rendre explicites les cascades multi-projets.

L’import d’un plugin externe ne doit pas effacer sa provenance ni donner l’impression qu’Omni en est l’auteur.

## Faisabilité et risques

### Faisable dans le périmètre choisi

Une V1 macOS local-first est réaliste si elle commence par :

- deux types de sources : dossier local et dépôt Git ;
- trois harnais ;
- des plugins représentables comme fichiers et manifests ;
- des opérations déterministes et prévisualisables.

### Risques à traiter explicitement

| Risque                              | Réponse de design                                                         |
| ----------------------------------- | ------------------------------------------------------------------------- |
| Formats de marketplaces hétérogènes | Adaptateurs explicites et statut « non supporté »                         |
| Plugins exécutables ou dangereux    | Lecture/import sans exécution automatique                                 |
| Écrasement de travail local         | Ownership, hashes, diff et conflit                                        |
| Suppression globale inattendue      | Cascade prévisualisée et confirmation                                     |
| Différences entre harnais           | Matrice de compatibilité par adaptateur                                   |
| Permissions macOS                   | Accès projet par projet et journalisation                                 |
| Valeur SaaS trop faible             | Valider d’abord l’usage local, puis monétiser automatisation et inférence |

La difficulté principale n’est donc pas de construire une interface Electron. Elle est de définir un contrat d’adaptateur et un moteur de réconciliation suffisamment fiables pour ne jamais surprendre l’utilisateur.

## Périmètre V1

### Inclus

- application desktop macOS ;
- développeur solo ;
- Codex, Claude Code et OpenCode ;
- plusieurs marketplaces personnelles et externes ;
- sources locales et Git ;
- catalogue unifié avec provenance ;
- plugins et skills ;
- affectations projet/harnais ;
- installation, mise à jour, retrait et restauration ;
- import externe comme snapshot personnel ;
- détection de dérive ;
- fonctionnement sans compte ni cloud ;
- historique local ;
- MCP local borné.

### Hors périmètre

- Windows et Linux ;
- publication vers une marketplace externe ;
- synchronisation automatique d’un fork avec sa source ;
- exécution automatique de scripts de plugins ;
- recommandations ou génération par IA ;
- organisations, rôles et équipes ;
- cron distant obligatoire ;
- gestion complète des worktrees et process.

Les worktrees et les process peuvent devenir des extensions naturelles après validation du noyau marketplace/synchronisation.

## Critères de réussite

La V1 doit permettre de démontrer :

1. la connexion d’une marketplace personnelle et de deux marketplaces externes ;
2. l’indexation de plugins provenant de sources différentes sans perdre leur provenance ;
3. l’import d’un plugin externe comme fork personnel ;
4. la surveillance de plusieurs projets ;
5. l’affectation d’un plugin à plusieurs harnais ;
6. l’installation et la mise à jour idempotentes ;
7. la suppression globale prévisualisée ;
8. la détection d’une modification locale sans écrasement ;
9. la restauration après une opération ;
10. l’utilisation complète sans compte, cloud ou clé API.

## Validation produit avant le SaaS

La première validation doit se faire sur l’usage réel :

1. utiliser Omni Desktop sur plusieurs codebases personnelles ;
2. mesurer les copies manuelles, dérives et changements de harnais évités ;
3. vérifier que le dashboard répond à la question « qu’est-ce qui est actif où ? » ;
4. faire essayer le noyau à quelques développeurs solos ;
5. observer quelles alertes et automatisations sont réellement demandées ;
6. seulement ensuite construire l’observation distante et l’inférence payante.

## Itérations produit

### Itération 1 — voir et comprendre

Connecter les sources, scanner les projets, normaliser le catalogue et montrer les dérives en lecture seule.

### Itération 2 — synchroniser sans surprise

Ajouter les affectations, les plans de changement, l’installation, la mise à jour, le retrait et la restauration.

### Itération 3 — posséder et réutiliser

Ajouter la marketplace personnelle, l’import comme fork et l’export Git.

### Itération 4 — intégrer les agents

Ajouter le MCP local borné et les rafraîchissements en arrière-plan sur la machine.

### Itération 5 — vendre l’intelligence

Ajouter le compte cloud, la synchronisation multi-machine, les crons, l’analyse des diffs, les recommandations et l’inférence hébergée.

## Références et continuité avec Omni

- OmniProject/docs/skills-creator/spec.md — référence historique du produit web autour des skills custom et de leur dépôt GitHub ;
- OmniProject/docs/roadmap/skills-and-marketplace.md — historique des fonctionnalités marketplace du repository parent ;
- [OpenDesign](https://open-design.ai/fr/) — référence de desktop local-first, open source, BYOK et multi-agents ;
- [OpenCode Go](https://opencode.ai/go) — référence de couche d’inférence provider-agnostic monétisée par abonnement.

La réorientation ne supprime pas nécessairement le travail web existant. Elle change le centre de gravité : le web devient éventuellement une surface SaaS et d’intelligence, tandis que le desktop devient le produit fondamental.
