Je veux implémenter un système de combat ONLINE de type Action-RPG avec les règles suivantes :

Le joueur cible automatiquement le monstre le plus proche.
Si la cible meurt → reciblage automatique du plus proche.
Le joueur peut aussi sélectionner une cible manuellement.

Si un monstre attaque le joueur, celui-ci contre-attaque automatiquement.

Le joueur poursuit sa cible sans limite de distance.

Le joueur possède une barre de skills (slot1 → slot2 → slot3 → ...).
La rotation suit strictement cet ordre, sans optimisation automatique.
Pour chaque skill : vérifier cooldown, portée, ressources, et si c’est un buff, qu’il n’est pas déjà actif.

Skills auto ON = utilisés dans la rotation.
Skills auto OFF = uniquement manuels.

Animations de skills :

full-lock : impossible de bouger ou lancer autre chose, annulable seulement par CC.

soft-lock : si le joueur bouge, l’animation est annulée.

no-lock : pure animation visuelle.

GCD (global cooldown) : 1 seconde après chaque skill.
Impossible de lancer un autre skill pendant le GCD.

Auto-attaque :

indépendante du GCD, basée sur la vitesse d’arme (ex : 1 AA toutes les 3s).

impossible pendant une animation full-lock.

si son timer expire pendant un cast, elle est mise en attente
→ et déclenchée immédiatement à la fin du cast.

File d’attente d’actions :
pendant un cast, les inputs sont mis en queue et le skill se déclenche après la fin de l’animation et du GCD.

Aucune auto-attaque ne part pendant un cast full-lock, mais peut être libérée dès la fin du cast si elle était prête.
