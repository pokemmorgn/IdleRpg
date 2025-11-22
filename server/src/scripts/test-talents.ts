// =====================================================================
// TEST TALENT SYSTEM
// =====================================================================
async function testTalentSystem(room: Colyseus.Room) {
    console.log("\n🔥 DÉBUT DU TEST SYSTÈME DE TALENTS\n");

    // --- ÉTAPE 1 : Demander les stats initiales (plus fiable que d'attendre welcome) ---
    console.log("⏳ Demande des stats initiales au serveur...");
    const initialStats = await waitForMessage(room, "stats_update");
    console.log("📊 Stats initiales:", initialStats);
    console.log(`👉 Points de talent disponibles: ${initialStats.availableSkillPoints}`);

    // --- ÉTAPE 2 : Donner de l'XP pour monter d'un niveau ---
    console.log(`\n--- ÉTAPE 2 : Donner ${XP_AMOUNT_TO_LEVEL_UP} XP ---`);
    room.send("debug_give_xp", { amount: XP_AMOUNT_TO_LEVEL_UP });

    const levelUpMessage = await waitForMessage(room, "level_up");
    console.log("✅ Message de level-up reçu:", levelUpMessage);
    const statsAfterLevelUp = levelUpMessage.stats;
    console.log("📊 Stats après level-up:", statsAfterLevelUp);
    console.log(`👉 Points de talent disponibles: ${statsAfterLevelUp.availableSkillPoints}`);
    console.log("📊 DIFF →", diff(initialStats, statsAfterLevelUp));

    // --- ÉTAPE 3 : Apprendre un talent ---
    console.log(`\n--- ÉTAPE 3 : Apprendre le talent ${TALENT_TO_LEARN_ID} ---`);
    room.send("talent_learn", { talentId: TALENT_TO_LEARN_ID });
    
    const statsAfterLearn = await waitForMessage(room, "stats_update");
    console.log("📊 Stats après apprentissage du talent:", statsAfterLearn);
    console.log(`👉 Points de talent disponibles: ${statsAfterLearn.availableSkillPoints}`);
    console.log("📊 DIFF →", diff(statsAfterLevelUp, statsAfterLearn));

    // --- ÉTAPE 4 : Reset des talents ---
    console.log(`\n--- ÉTAPE 4 : Reset des talents ---`);
    room.send("talent_reset");

    const statsAfterReset = await waitForMessage(room, "stats_update");
    console.log("📊 Stats après reset:", statsAfterReset);
    console.log(`👉 Points de talent disponibles: ${statsAfterReset.availableSkillPoints}`);
    console.log("📊 DIFF →", diff(statsAfterLearn, statsAfterReset));

    console.log("\n🎉 FIN DU TEST SYSTÈME DE TALENTS\n");
}
