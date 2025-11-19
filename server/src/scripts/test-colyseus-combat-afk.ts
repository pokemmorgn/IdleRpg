room.onMessage("combat_start", msg => {
  console.log("DEBUG combat_start:", msg);

  const monsterId = msg.monsterId ?? "UnknownMonster";
  log.info(`⚔️  Combat start contre ${monsterId}`);
});

room.onMessage("combat_damage", msg => {
  console.log("DEBUG combat_damage:", msg);

  const attacker = msg.attackerId ?? "UnknownAttacker";
  const defender = msg.defenderId ?? "UnknownTarget";
  const dmg = msg.damage ?? 0;

  log.info(`💥 Dégâts: ${attacker} → ${defender}: ${dmg}`);
});

room.onMessage("combat_death", msg => {
  console.log("DEBUG combat_death:", msg);

  const id = msg.entityId ?? "UnknownEntity";
  const type = msg.isPlayer ? "player" : "monster";

  log.info(`☠️ Mort: ${type} ${id}`);
});

room.onMessage("afk_summary_claimed", data => {
  console.log("DEBUG afk_summary_claimed:", data);

  const xp = data.xpGained ?? 0;
  const gold = data.goldGained ?? 0;

  log.info(`📦 Résumé réclamé: +${xp} XP, +${gold} gold`);
});

room.onMessage("afk_summary_update", summary => {
  console.log("DEBUG afk_summary_update:", summary);

  log.info(
    `📊 AFK Update: kills=${summary.monstersKilled}, xp=${summary.xpGained}, gold=${summary.goldGained}`
  );
});
