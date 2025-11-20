# AFK Battle System Specification

## Overview

The AFK Battle System reproduces **100% of the ONLINE combat logic**, but with the player **completely immobile** and acting like a stationary turret. Whether the player is **connected or disconnected**, the AFK mode behaves identically.

The AFK system uses:

* The **same skill rotation**
* The **same GCD (1s)**
* The **same animation lock rules** (full, soft, none)
* The **same auto-attack system** (independent timer, released after cast)
* The **same cooldown logic**
* The **same projectile rules**
* The **same prioritization** (buffs → big cooldowns → small cooldowns → auto-attack)

The only differences from ONLINE combat:

* No movement ever
* Rewards are stored instead of granted instantly
* Death results in a 30-second ghost mode before respawning

---

## 1. Player Immobility

In AFK mode, the player:

* **Never moves**, regardless of whether connected or disconnected.
* Does not pursue monsters.
* Does not reposition.
* Does not approach targets.

The player becomes a **static turret** that attacks everything entering the range of their skills.

---

## 2. Target Selection

AFK always targets the **nearest monster**.

* No optimization.
* No special conditions.
* No target switching unless range is broken.

If multiple monsters are at the same distance:

* The system simply uses the first in internal order.

---

## 3. Range Logic

* Each skill has its own **individual range**.
* A skill is usable on the nearest monster **only if that monster is within the range of that skill**.

Rotation logic:

```
For each skill in the player's skill bar (slot order):
    if skill is usable (cooldown, buff conditions, resources):
         if nearest monster is within range of this skill:
              cast the skill
         else:
              skip to next skill
If no skill can hit the target:
    attempt auto-attack if in melee range
If still nothing:
    wait until a monster enters range
```

---

## 4. Losing Range

If the current target moves out of range:

* The system **immediately retargets** the new nearest monster.
* Casts are validated depending on skill type:

  * Projectiles: cancelled if the target leaves range
  * AOE: stays on the ground at cast position

---

## 5. Skill Behaviors

### 5.1 Animation Lock Types

* **Full Lock:** Cannot move (AFK doesn’t move anyway), cannot cast other skills, cannot auto-attack during cast.
* **Soft Lock:** Would be cancelled by movement (AFK never moves, so always safe).
* **No Lock:** Pure animation, cosmetic.

### 5.2 AOE Skills

* AOE position is fixed at the **target’s location at cast start**.
* Target movement does not cancel the AOE.

### 5.3 Projectile Skills

* Projectiles **track the target**.
* If the target leaves range during cast or projectile travel → **skill is cancelled/invalid**.

---

## 6. Auto-Attack System (Independent Timer)

* Auto-attacks have a fixed timer based on weapon speed (e.g., every 3 seconds).
* They do **not** use the GCD.
* Auto-attacks cannot fire during full lock casts.
* If the auto-attack timer completes during a cast:

  * It is **stored**.
  * It fires **immediately after the cast ends**.

---

## 7. Rewards Handling

AFK stores rewards rather than granting them immediately:

* XP
* Gold
* Loots (optional)
* Kill count
* AFK time

Rewards are claimed when AFK ends or when the player returns.

---

## 8. Death Behavior

If the player dies during AFK:

* The player becomes a **ghost**, immobile, untargetable.
* Ghost duration: **30 seconds**.
* After 30 seconds:

  * HP fully restored
  * Resources restored (mana/energy/etc.)
  * AFK combat resumes automatically

The AFK session **does not end** upon death.

---

## 9. AFK Offline Mode

If the player disconnects while AFK:

* The AFK session continues server-side
* Same logic, same immobility, same combat
* Rewards accumulate normally
* Resumes instantly when the player reconnects

There is **no penalty** for staying connected or disconnected.

---

## 10. Summary

The AFK system:

* Reuses 100% of the ONLINE combat logic
* Removes all movement
* Always targets the nearest monster
* Uses skills depending on their range
* Cancels projectiles leaving range
* Places AOE on cast position
* Auto-attacks independently of GCD
* Allows ghost recovery and uninterrupted AFK sessions
* Works both online and offline identically

This file acts as the reference for the **AFK Battle System**.
