# Brief de planches de design — Omni Desktop

Date : 2026-09-08

Statut : brief préparé pour itération dans Claude Design

## Direction générale

Omni Desktop est une application macOS open source, desktop-first et local-first pour un développeur solo. Les planches doivent montrer un outil de contrôle fiable des marketplaces, plugins, skills, projets et harnais Codex, Claude Code et OpenCode.

Le récit visuel central est :

Sources → Catalogue → Affectation projet/harnais → Plan de changements → Fichiers installés

Chaque opération d’écriture doit être compréhensible, prévisualisable et réversible. L’interface ne doit jamais donner l’impression qu’Omni exécute du contenu externe ou synchronise silencieusement des fichiers.

## Ordre de production

### Planche 1 — Overview : comprendre l’état réel

Priorité : P0

Objectif utilisateur : répondre immédiatement à la question « Qu’est-ce qui est actif, où, et y a-t-il quelque chose à examiner ? »

États à montrer :

- dashboard Overview au premier lancement ;
- sources connectées et état de leur dernière actualisation ;
- nombre de projets surveillés ;
- harnais détectés : Codex, Claude Code et OpenCode ;
- plugins actifs et nombre d’affectations ;
- mises à jour disponibles ;
- projets en dérive ;
- changements en attente ;
- état vide sans projet ni marketplace ;
- état partiellement configuré : projet ajouté mais aucune source connectée.

Composants :

- navigation latérale : Overview, Marketplaces, Plugins & Skills, Projects, Changes / Activity, Settings ;
- cartes de statut ;
- badges : synchronisé, à examiner, conflit, source indisponible ;
- liste d’alertes actionnables ;
- résumé de synchronisation ;
- CTA « Ajouter un projet » ;
- CTA secondaire « Connecter une marketplace ».

Décision à valider : le dashboard permet-il de comprendre la situation sans connaître le modèle interne d’Omni ?

### Planche 2 — Ajouter un projet et détecter les harnais

Priorité : P0

Objectif utilisateur : ajouter une codebase locale et comprendre quels harnais Omni peut reconnaître.

États à montrer :

- sélection d’un dossier de projet ;
- projet ajouté avec chemin local visible ;
- scan initial en lecture seule ;
- détection de Codex, Claude Code et OpenCode ;
- harnais détecté, absent ou partiellement compatible ;
- projet sans configuration reconnue ;
- permission macOS nécessaire ou accès refusé ;
- résultat du scan : plugins présents, fichiers gérés, fichiers inconnus et dérives éventuelles.

Composants :

- sélecteur de dossier ;
- carte projet avec chemin, nom et statut de scan ;
- matrice des harnais ;
- indicateur de scan ;
- résumé « détecté / non détecté / à vérifier » ;
- panneau d’explication des chemins reconnus ;
- CTA « Continuer vers le catalogue ».

Décision à valider : l’utilisateur comprend-il ce qu’Omni a inspecté et ce qu’il n’a pas pu vérifier ?

### Planche 3 — Marketplaces : connecter les sources et préserver la provenance

Priorité : P0

Objectif utilisateur : connecter plusieurs sources et distinguer marketplace personnelle, marketplace externe, dossier local et dépôt Git.

États à montrer :

- liste des marketplaces connectées ;
- marketplace personnelle locale ;
- marketplace externe en lecture seule ;
- source Git à actualiser ;
- source indisponible ou invalide ;
- catalogue en cours de normalisation ;
- marketplace sans plugin compatible ;
- action « Importer comme copie personnelle ».

Composants :

- cartes ou lignes de marketplaces ;
- type de source ;
- chemin ou URL ;
- dernière actualisation ;
- nombre de plugins et versions disponibles ;
- badge de confiance : personnel, externe, fork personnel ;
- indication de licence ;
- actions actualiser, examiner et retirer la source ;
- filtre par source.

Décision à valider : la provenance est-elle visible avant d’ouvrir un plugin ? L’utilisateur comprend-il qu’une source externe n’est pas modifiée par Omni ?

### Planche 4 — Plugin : examiner, comparer et affecter

Priorité : P0

Objectif utilisateur : choisir un plugin en connaissance de cause, voir son contenu et l’affecter à un projet et à un ou plusieurs harnais.

États à montrer :

- page de détail d’un plugin ;
- nom, marketplace source, version, licence, hash et date d’actualisation ;
- liste des skills, instructions et configurations ;
- compatibilité Codex, Claude Code et OpenCode ;
- projets déjà affectés ;
- plugin externe pouvant être installé ou importé comme fork ;
- plugin local modifié ou version divergente ;
- affectation en cours avant confirmation.

Composants :

- en-tête du plugin ;
- badge de provenance ;
- sections aperçu, contenu, compatibilité, affectations et historique ;
- matrice projet × harnais ;
- sélecteurs d’affectation ;
- résumé des fichiers concernés ;
- CTA « Prévisualiser les changements » ;
- CTA distinct « Importer comme copie personnelle ».

Décision à valider : l’utilisateur distingue-t-il clairement l’usage d’une source externe, la création d’un fork personnel, l’affectation d’un plugin et l’installation réelle de fichiers ?

### Planche 5 — Changes : prévisualiser puis appliquer

Priorité : P0

Objectif utilisateur : comprendre exactement ce qu’Omni va écrire avant de l’autoriser.

États à montrer :

- plan de changements après une affectation ou une mise à jour ;
- ajouts, modifications, retraits et fichiers inchangés ;
- répartition par projet et harnais ;
- source et version de chaque changement ;
- fichier appartenant déjà à Omni ;
- fichier modifié localement avec conflit explicite ;
- opération sans changement ;
- confirmation avant application ;
- application en cours, réussite, échec partiel et restauration disponible.

Composants :

- résumé de l’opération ;
- diff lisible par fichier ;
- groupes par projet, harnais et plugin ;
- ownership et hash ;
- alerte de conflit ;
- actions appliquer, revenir, restaurer et examiner le détail ;
- journal technique secondaire.

Décision à valider : la prévisualisation donne-t-elle suffisamment de confiance pour autoriser une écriture sur une vraie codebase ?

### Planche 6 — Mise à jour, dérive et retrait propre

Priorité : P0

Objectif utilisateur : gérer le changement dans le temps sans perdre de travail local ni supprimer plus que prévu.

États à montrer :

- mise à jour disponible ;
- différence entre version installée et version proposée ;
- modification locale détectée ;
- retrait d’un seul projet ;
- retrait de tous les projets ;
- suppression d’une affectation sans suppression du catalogue ;
- suppression globale avec cascade listée ;
- restauration après retrait ou mise à jour ;
- source externe modifiée alors qu’un fork personnel existe.

Composants :

- carte de mise à jour ;
- comparateur de versions ;
- état « dérive détectée » ;
- choix distincts : retirer de ce projet, désinstaller partout, supprimer du catalogue personnel ;
- confirmation en deux niveaux pour les cascades ;
- liste des sauvegardes et restaurations ;
- historique local.

Décision à valider : les conséquences d’un retrait ou d’une mise à jour sont-elles impossibles à mal interpréter ?

### Planche 7 — Settings, confiance et limites du système

Priorité : P1

Objectif utilisateur : comprendre les réglages de confiance, les permissions et les limites d’Omni sans transformer l’interface en console technique.

États à montrer :

- settings local-first ;
- dossiers surveillés ;
- harnais activés ;
- sources autorisées ;
- préférences de rafraîchissement ;
- confirmation avant opérations destructives ;
- gestion des sauvegardes ;
- export de l’historique ;
- MCP local désactivé, activé ou limité ;
- informations open source, licence et version.

Composants :

- sections de réglages sobres ;
- permissions par projet ;
- toggle explicite pour les automatisations locales ;
- explication « aucun script de plugin n’est exécuté automatiquement » ;
- état cloud absent ou optionnel ;
- liens vers la documentation et le dépôt source.

Décision à valider : les réglages renforcent-ils la confiance sans suggérer une infrastructure SaaS distante déjà disponible ?

## Prompt général à donner à Claude Design

Conçois une série de 7 planches de design pour Omni Desktop, dans l’ordre de production indiqué.

Omni Desktop est une application macOS open source, desktop-first et local-first pour un développeur solo. Elle agrège plusieurs marketplaces personnelles et externes, référence des plugins et skills, surveille plusieurs projets locaux et synchronise leur usage entre Codex, Claude Code et OpenCode.

Le parcours P0 est :

ajouter un projet
→ détecter les harnais
→ connecter une marketplace
→ voir un plugin
→ l’affecter à un projet et un harnais
→ prévisualiser les changements
→ appliquer
→ détecter une mise à jour ou une dérive
→ retirer proprement ou restaurer.

Navigation principale :

Overview
Marketplaces
Plugins & Skills
Projects
Changes / Activity
Settings

Contraintes produit essentielles :

- préserver la provenance de chaque plugin ;
- distinguer marketplace externe, marketplace personnelle et fork personnel ;
- distinguer catalogue, état désiré et état matérialisé sur le disque ;
- montrer les opérations avant toute écriture ;
- ne jamais écraser silencieusement un fichier modifié localement ;
- rendre explicites les différences entre retrait d’un projet, désinstallation globale et suppression du catalogue ;
- ne pas exécuter automatiquement de scripts de plugins ;
- ne pas suggérer que le cloud, la synchronisation multi-machine ou les recommandations IA existent déjà en V1 ;
- afficher les états vides, erreurs de permission, conflits, sources indisponibles, opérations en cours, réussite et restauration.

Direction visuelle :

- outil open source sérieux, calme et précis ;
- esthétique desktop macOS, dense mais lisible ;
- hiérarchie claire entre catalogue, décisions utilisateur et fichiers installés ;
- provenance, version, licence, hash et compatibilité visibles au bon moment ;
- panneaux, tableaux, cartes de statut, diffs et matrices projet × harnais ;
- éviter l’esthétique de marketplace grand public ou de dashboard SaaS générique ;
- ne pas copier le code, les assets, les textes ou les écrans d’OpenDesign ou d’OpenCode ;
- s’inspirer uniquement de leurs conventions : séparation claire des responsabilités, documentation, open source, modularité et transparence.

Pour chaque planche, montre les états principaux et un chemin utilisateur crédible. Les écrans doivent permettre de juger le produit, pas seulement son style. Signale les éléments qui nécessiteraient une validation produit avant implémentation.

## Risques de complexité ou de fausse promesse visuelle

- Dashboard trop magique : les cartes ne doivent pas masquer les différences entre catalogue, état désiré et disque réel.
- Marketplace trop proche d’un store : une source externe est un catalogue référencé, pas un contenu contrôlé par Omni.
- Bouton « Install » ambigu : préférer « Prévisualiser les changements », puis « Appliquer le plan ».
- Diffs trop simplifiés : une liste de plugins ne suffit pas à représenter ownership, hash, conflit et sauvegarde.
- Compatibilité surestimée : un plugin compatible avec Codex ne doit pas être présenté comme identique avec Claude Code ou OpenCode.
- Fork confondu avec synchronisation : l’import personnel doit montrer la provenance conservée et l’absence de synchronisation bidirectionnelle automatique.
- Suppression dangereusement séduisante : préciser la portée, projet courant, tous les projets ou catalogue personnel.
- Fausse promesse SaaS : éviter les écrans de collaboration, recommandations IA, synchronisation cloud ou jobs distants déjà fonctionnels en apparence.
- Daemon invisible : ne pas représenter une automatisation permanente si la V1 repose sur l’ouverture de l’application, le rafraîchissement explicite et une surveillance locale bornée.
- Trop de détails techniques : hashes, chemins et logs doivent être disponibles mais secondaires.
- États vides négligés : ils sont essentiels pour un outil local-first sans compte ni cloud obligatoire.

## Règle de validation

Les planches P0 sont validées une par une. Une planche n’est pas acceptée parce qu’elle est esthétique : elle doit permettre de vérifier une décision d’usage et rester fidèle au périmètre local-first.
