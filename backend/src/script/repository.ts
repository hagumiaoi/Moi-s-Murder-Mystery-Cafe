import { readFileSync } from "node:fs";
import { join } from "node:path";
import { caseManifestV2Schema, type CaseManifestV2 } from "./schemas.ts";
import type { PublicCaseManifest, EntityDef, FactDef, QuestionDef } from "@shared/types";
import { config } from "../config.ts";

const scriptDir = join(import.meta.dir, "..", "..", config.game.script_dir);

function loadManifest(): CaseManifestV2 {
  const path = join(scriptDir, "manifest.json");
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    console.error(`Failed to read manifest: ${path}`);
    process.exit(1);
  }

  const result = caseManifestV2Schema.safeParse(raw);
  if (!result.success) {
    console.error("Invalid manifest.json:");
    for (const issue of result.error.issues) {
      console.error(`  [${issue.path.join(".")}] ${issue.message}`);
    }
    process.exit(1);
  }
  return result.data;
}

function validateManifest(m: CaseManifestV2): void {
  if (m.entities.filter((e) => e.kind === "person").length === 0) {
    console.error("Manifest requires at least one entity with kind=person");
    process.exit(1);
  }
  if (m.first_entity && !m.entities.find((e) => e.id === m.first_entity)) {
    console.error(`first_entity "${m.first_entity}" not found in entities`);
    process.exit(1);
  }
  for (const qid of m.resolution.required_questions) {
    if (!m.questions.find((q) => q.id === qid)) {
      console.error(`Required question "${qid}" not found in questions`);
      process.exit(1);
    }
  }
}

export const manifest = loadManifest();
validateManifest(manifest);

function getEntityScript(entityId: string): string {
  const entity = manifest.entities.find((e) => e.id === entityId);
  return entity?.script ?? "";
}

function getEntitySecret(entityId: string): string {
  const entity = manifest.entities.find((e) => e.id === entityId);
  return entity?.secret ?? "";
}

function getEntityById(entityId: string): EntityDef | undefined {
  return manifest.entities.find((e) => e.id === entityId);
}

function getEntityByName(name: string): EntityDef | undefined {
  return manifest.entities.find((e) => e.name === name);
}

function getEntitiesByTags(tags: string[]): EntityDef[] {
  return manifest.entities.filter((e) => e.tags?.some((t) => tags.includes(t)));
}

function getInteractionsForEntity(entityId: string) {
  const entity = manifest.entities.find((e) => e.id === entityId);
  if (!entity) return [];
  return manifest.interactions.filter((inter) => {
    if (!inter.target) return false;
    const { kind, tags, ids } = inter.target;
    if (ids?.length && !ids.includes(entityId)) return false;
    if (kind?.length && !kind.includes(entity.kind)) return false;
    if (tags?.length && !entity.tags?.some((t) => tags.includes(t))) return false;
    return true;
  });
}

function getEvidenceForEntity(entityId: string) {
  return manifest.evidence.filter((ev) => ev.source_entity === entityId);
}

function getQuestionById(questionId: string) {
  return manifest.questions.find((q) => q.id === questionId);
}

function getCluesForEntity(entityId: string): string[] {
  return manifest.evidence
    .filter((ev) => ev.source_entity === entityId)
    .map((ev) => ev.description);
}

function getPersonEntityId(name: string): string | undefined {
  const entity = manifest.entities.find((e) => e.kind === "person" && e.name === name);
  return entity?.id;
}

function personNames(): string[] {
  return manifest.entities.filter((e) => e.kind === "person").map((e) => e.name);
}

function firstEntityId(): string {
  if (manifest.first_entity) return manifest.first_entity;
  const firstPerson = manifest.entities.find((e) => e.kind === "person");
  return firstPerson?.id ?? "";
}

function searchableEntities() {
  return manifest.entities.filter((e) => e.kind === "place" && e.tags?.includes("can-search"));
}

function redactFact(fact: FactDef, revealedFacts: string[]) {
  if (fact.visibility === "public") {
    return { id: fact.id, statement: fact.statement, visibility: fact.visibility, time: fact.time };
  }
  if (revealedFacts.includes(fact.id)) {
    return { id: fact.id, statement: fact.statement, visibility: "revealed" as const, time: fact.time };
  }
  return null;
}

function buildPublicManifest(revealedFacts: string[], discoveredEvidence: string[]): PublicCaseManifest {
  const redactedEvidence = manifest.evidence
    .filter((ev) => ev.starts_discovered || discoveredEvidence.includes(ev.id))
    .map(({ reveals, contradicts, metadata, ...safe }) => safe);

  return {
    $schema: manifest.$schema,
    format: manifest.format,
    packaging: manifest.packaging,
    title: manifest.title,
    description: manifest.description,
    progression: manifest.progression,
    entities: manifest.entities.map((e) => ({
      id: e.id,
      kind: e.kind,
      name: e.name,
      tags: e.tags,
      description: e.description,
      starts_hidden: e.starts_hidden,
    })),
    facts: manifest.facts
      .map((f) => redactFact(f, revealedFacts))
      .filter((f): f is NonNullable<typeof f> => f !== null),
    evidence: redactedEvidence,
    interactions: manifest.interactions.map(({ reveals, ...safe }) => safe),
    questions: manifest.questions.map((q) => {
      const { answer, rubric, ...safe } = q;
      return safe;
    }),
    resolution: manifest.resolution,
    panels: manifest.panels,
    first_entity: manifest.first_entity,
  };
}

export const repository = {
  manifest,
  buildPublicManifest,
  getEntityScript,
  getEntitySecret,
  getEntityById,
  getEntityByName,
  getEntitiesByTags,
  getInteractionsForEntity,
  getEvidenceForEntity,
  getQuestionById,
  getCluesForEntity,
  getPersonEntityId,
  personNames,
  firstEntityId,
  searchableEntities,
} as const;
