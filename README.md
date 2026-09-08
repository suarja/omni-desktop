# Omni Desktop

Omni Desktop est une application desktop open source, local-first, destinée au développeur solo qui utilise plusieurs projets, marketplaces de skills/plugins et harnais d’agents.

Le noyau du produit est déterministe : il catalogue les sources, calcule un état désiré, prévisualise les changements et synchronise les fichiers sans écraser silencieusement le travail local.

## Statut

Le repository est en phase de cadrage produit et de design. L’implémentation du desktop n’a pas commencé.

Le premier périmètre cible macOS, avec Codex, Claude Code et OpenCode. Le cloud, l’inférence hébergée et les automatisations asynchrones sont des extensions SaaS ultérieures.

## Documentation de référence

- docs/product/2026-09-07-omni-desktop-open-saas-design.md — design produit validé ;
- docs/planning/2026-09-08-omni-desktop-milestones-and-user-stories.md — backlog V1 et parcours vertical ;
- docs/process/2026-09-08-orchestration-protocol.md — protocole de planification, délégation et revue ;
- docs/research/2026-09-08-open-source-reference-notes.md — conventions observées dans OpenDesign et OpenCode.

Les planches de design seront ajoutées après validation du brief visuel.

## Développement

Le repository est indépendant d’OmniProject. Il pourra être référencé localement comme submodule par le repository parent, tout en conservant son propre historique, ses branches et ses pull requests.

## Licence

La licence open source finale reste à valider. Le choix doit être fait avant la première release publique contenant du code réutilisable.
