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





OBJECTIF : Implémenter un système de combat ONLINE dynamique de type Action-RPG, avec auto-combat intelligent, rotation de skills, animations bloquantes, réaction automatique, poursuite illimitée, auto-attaque indépendante du GCD, et comportement fluide du joueur.
Le système doit respecter STRICTEMENT les règles suivantes :

🟦 1. Ciblage

Le joueur cible automatiquement le monstre le plus proche.

Si la cible meurt, le joueur recible immédiatement le nouveau monstre le plus proche.

Le joueur peut manuellement sélectionner une cible :
→ cela remplace la cible automatique tant que cette cible est vivante.

Toutes les AOE sont centrées uniquement sur la cible active actuelle.

🟥 2. Réaction aux attaques ennemies

Si un monstre attaque le joueur, le joueur attaque automatiquement ce monstre.

Le joueur ne reste jamais passif lorsqu’il se fait frapper.

🟩 3. Déplacement & poursuite

Le joueur se déplace automatiquement vers la cible si elle n’est pas à portée.

Le joueur poursuit sans limite de distance (aucun rayon de reset), même dans les donjons.

Le combat continue tant que la cible existe.

🟧 4. Système de skills
4.1. Ordre des skills (rotation user-defined)

Le joueur définit l’ordre des skills dans une barre : slot1 → slot2 → slot3 → ...

La rotation suit strictement cet ordre.

Aucune optimisation automatique ne change cette priorité.

4.2. Comportement de la rotation

Pour chaque skill dans l’ordre :

Vérifier s’il est autorisé en auto-combat (skill auto ON/OFF).

Vérifier que son cooldown est terminé.

Vérifier toutes les conditions : portée, ressources, état du buff, etc.

Si c’est un buff, vérifier qu’il n’est pas déjà actif.

Dès qu’un skill est valide → on le lance, et la rotation s’arrête ici.

Si aucun skill n’est utilisable → on passe à l’auto-attaque.

🟨 5. Animation Lock (3 types)

Chaque skill définit un paramètre animationLockType :

FULL LOCK

Aucune action possible pendant l’animation.

Impossible de bouger.

Impossible de lancer un autre skill.

L'auto-attaque ne peut PAS partir pendant ce cast.

Interruption possible via CC (stun, knockback, etc.).

SOFT LOCK

Le joueur peut bouger.

Mais si le joueur bouge → l’animation est annulée.

Aucun autre skill ne peut être lancé pendant le cast.

L’auto-attaque peut être mise en attente selon son timer.

NO LOCK

Animation purement visuelle, immediate.

Cancelable à tout moment.

N’interdit rien.

🟪 6. GCD (Global CoolDown)

Après chaque skill lancé, un GCD de 1 seconde est appliqué.

Pendant le GCD :

Aucun skill ne peut être lancé

L'auto-attaque peut continuer (voir section suivante)

🟫 7. Auto-Attaque (indépendante du GCD)
7.1. Timer indépendant

L'auto-attaque a son propre timer basé sur la vitesse d'arme :
→ weaponSpeed = 3 → une auto-attaque toutes les 3 secondes.

7.2. Relation avec les skills

L'auto-attaque n’est PAS affectée par le GCD.

Elle peut partir même juste après un skill (si elle est prête).

Mais jamais pendant un skill FULL LOCK.

Pendant un full lock, si l’auto-attaque arrive à échéance, elle est mise en attente et déclenchée immédiatement à la fin du cast.

7.3. Conditions

On peut auto-attaquer uniquement si :

Aucune animation FULL LOCK n'est en cours

Une cible est à portée

Le timer est écoulé

🟦 8. File d’attente d’actions (Action Queueing)

Le joueur peut appuyer sur un skill pendant un cast.

Ce skill est “en réserve”.

Dès que l'animation en cours finit, et que le GCD le permet :
→ le skill en file d’attente est lancé.

🟩 9. Skills en mode manuel (auto OFF)

Un skill marqué OFF ne sera jamais utilisé automatiquement.

Il peut être déclenché par le joueur à tout moment si cooldown OK.

Il est pris en compte dans la file d’attente.

🟧 10. Comportement général

Le système doit être fluide, sans temps morts, sans ralentissements.

Les skills gèrent leur priorité via la barre définie par le joueur.

Le combat est interrompu si le joueur bouge (pour les skills soft lock).

En mode online, le joueur est toujours actif, jamais passif.

🟣 Résumé final en une phrase

Le combat ONLINE est un système d’auto-combat dynamique utilisant une rotation définie par le joueur, avec buffs prioritaires, skills soumis à GCD, animations full/soft lock, poursuite illimitée, auto-attaque indépendante du GCD, file d’attente de skills, reciblage automatique, et réaction immédiate aux attaques ennemies.

File d’attente d’actions :
pendant un cast, les inputs sont mis en queue et le skill se déclenche après la fin de l’animation et du GCD.

Aucune auto-attaque ne part pendant un cast full-lock, mais peut être libérée dès la fin du cast si elle était prête.
