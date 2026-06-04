import { caseManifestV2Schema } from "./src/script/schemas.ts";

const raw = await Bun.file("../Script/manifest.json").json();
const result = caseManifestV2Schema.safeParse(raw);

if (result.success) {
  const m = result.data;
  console.log("V2 manifest schema: OK");
  console.log("Title:", m.title);
  console.log("Entities:", m.entities.length);
  console.log("Facts:", m.facts.length);
  console.log("Evidence:", m.evidence.length);
  console.log("Interactions:", m.interactions.length);
  console.log("Questions:", m.questions.length);
  console.log("Panels:", m.panels.length);
  console.log("Progression:", m.progression.type);
  const culprit = m.questions.find((q: any) => q.id === "culprit");
  console.log("Culprit answer:", culprit?.answer);
} else {
  console.error("V2 manifest schema: FAIL");
  for (const issue of result.error.issues) {
    console.error(" ", issue.path.join("."), "-", issue.message);
  }
}
