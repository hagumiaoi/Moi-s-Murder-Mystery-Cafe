import "./src/config.ts";

const { repository } = await import("./src/script/repository.ts");

console.log("=== Repository compat data ===");
console.log("Title:", repository.manifest.title);
console.log("max_days:", repository.manifest.max_days);
console.log("rounds_per_day:", repository.manifest.rounds_per_day);
console.log("firstNpc:", repository.firstNpc);
console.log("murdererName:", repository.murdererName);
console.log("npcNames:", repository.npcNames);
console.log("npcSecrets:", repository.npcSecrets);
console.log("npcScriptMap:", repository.npcScriptMap);
console.log("search_locations count:", repository.manifest.search_locations.length);
for (const loc of repository.manifest.search_locations) {
  console.log(`  ${loc.id} (${loc.name}): ${loc.clues.length} clues`);
}
console.log("npcs count:", repository.manifest.npcs.length);
for (const npc of repository.manifest.npcs) {
  console.log(`  ${npc.id} (${npc.name}): is_murderer=${npc.is_murderer}, script_file=${npc.script_file}`);
}

const script = repository.loadNpcScript("butler");
console.log("\nButler script length:", script.length, "chars, first 50:", script.slice(0, 50));
