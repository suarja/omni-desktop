# Omni Desktop — Milestones et user stories V1

Date : 2026-09-08

Statut : backlog de cadrage validé pour préparer le design ; implémentation non démarrée

## Intention

Ce document consigne le backlog V1 avant la production des planches de design. Il sert de référence commune pour le découpage, l’architecture, les briefs d’agents et les décisions de périmètre.

Le produit vise un développeur solo sur macOS qui travaille sur plusieurs projets et utilise Codex, Claude Code et OpenCode. La promesse P0 est une synchronisation déterministe des plugins et skills entre marketplaces, projets et harnais.

## Backlog proposé pour Omni Desktop V1

### M0 — Nouveau repository open source

Objectif : avoir une base publique propre, indépendante de l’actuel OmniProject.

- US-00 — En tant que contributeur, je peux cloner le repo, installer les dépendances et lancer un shell desktop vide sur macOS.
- US-01 — En tant qu’utilisateur, je trouve un README, une licence, un guide de contribution, une politique de sécurité et un quickstart clairs.
- US-02 — En tant que mainteneur, je dispose des contrats documentés pour les marketplaces, plugins, skills et adaptateurs de harnais.
- US-03 — En tant que contributeur, je peux valider un plugin ou un adaptateur avec une commande reproductible.

### M1 — Découverte de l’environnement local

Objectif : Omni comprend où vivent les projets et les harnais, sans encore rien modifier.

- US-10 — Ajouter et retirer des dossiers de projets surveillés.
- US-11 — Détecter Codex, Claude Code et OpenCode.
- US-12 — Afficher les chemins, versions, permissions et statuts détectés.
- US-13 — Scanner en lecture seule les skills/plugins déjà présents.
- US-14 — Distinguer ce qui est connu, inconnu, géré par Omni ou externe.

### M2 — Connexion de plusieurs marketplaces

Objectif : construire le catalogue personnel unifié.

- US-20 — Connecter une marketplace personnelle locale.
- US-21 — Connecter une marketplace personnelle Git.
- US-22 — Connecter une marketplace externe en lecture seule.
- US-23 — Rafraîchir les sources et afficher les erreurs ou indisponibilités.
- US-24 — Parcourir le catalogue unifié par plugin, skill, source, version et harnais.
- US-25 — Voir la provenance, licence, hash et compatibilité de chaque élément.
- US-26 — Détecter les doublons ou versions concurrentes provenant de plusieurs sources.

### M3 — Synchronisation déterministe

Objectif : réaliser la première promesse forte du produit.

- US-30 — Affecter un plugin ou skill à un projet et un harnais précis.
- US-31 — Voir la différence entre état désiré et état réellement installé.
- US-32 — Prévisualiser un plan d’ajout, modification ou retrait.
- US-33 — Appliquer ce plan de manière idempotente.
- US-34 — Vérifier les fichiers installés avec leurs hashes.
- US-35 — Détecter une modification locale sans l’écraser.
- US-36 — Mettre à jour un plugin après rafraîchissement de sa source.
- US-37 — Retirer un plugin d’un seul projet.
- US-38 — Retirer un plugin partout, avec confirmation, sauvegarde et historique.

### M4 — Marketplace personnelle et forks

Objectif : permettre à l’utilisateur de capitaliser sur son propre travail.

- US-40 — Importer un plugin externe comme snapshot personnel.
- US-41 — Conserver la source, version, licence et hash d’origine.
- US-42 — Capturer un skill déjà présent dans un projet vers la marketplace personnelle.
- US-43 — Créer ou modifier un skill personnel.
- US-44 — Versionner les changements dans un dépôt Git personnel.
- US-45 — Voir qu’un fork personnel a divergé de sa source externe.

### M5 — Intégration locale avec les agents

Objectif : permettre aux agents de consulter Omni sans lui donner un accès incontrôlé.

- US-50 — Rechercher dans le catalogue via le MCP local.
- US-51 — Demander à Omni d’inspecter un projet.
- US-52 — Demander un plan de synchronisation.
- US-53 — Faire valider l’application du plan par l’utilisateur.
- US-54 — Rafraîchir automatiquement les sources locales.
- US-55 — Afficher les changements en attente lorsqu’une source évolue.

### M6 — Première release publique

Objectif : rendre le projet installable et partageable.

- US-60 — Installer Omni via une release macOS.
- US-61 — Suivre le quickstart sans connaissance interne du projet.
- US-62 — Ouvrir un bug ou une feature request avec les bons templates.
- US-63 — Lire les release notes et comprendre les changements de version.
- US-64 — Utiliser Omni sans compte, cloud ni clé API.

## Parcours vertical prioritaire

Ajouter un projet
→ détecter les harnais
→ connecter une marketplace
→ voir un plugin
→ l’affecter à un projet
→ prévisualiser les fichiers
→ appliquer
→ détecter une mise à jour
→ retirer proprement

## Priorité

Le P0 comprend M0, M1, M2 et M3. Ces milestones doivent prouver le moteur de synchronisation avant d’ajouter l’intelligence.

M4, M5 et M6 complètent la V1 publique, mais ne doivent pas retarder la validation du noyau local-first.

## Critères de sortie du cadrage

Avant l’implémentation, il faut avoir :

- une série de planches validant le parcours vertical ;
- une décision sur la licence ;
- une structure de repository et des conventions de contribution ;
- un contrat d’adaptateur de marketplace et de harnais ;
- une stratégie de propriété des fichiers et de gestion des conflits ;
- un plan d’implémentation découpé en unités indépendantes.
