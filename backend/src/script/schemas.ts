import { z } from "zod";

export const entityKindSchema = z.enum(["person", "place", "item", "document", "event", "concept"]);

const entityDefSchema = z.object({
  id: z.string(),
  kind: entityKindSchema,
  name: z.string(),
  aliases: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  portrait: z.string().optional(),
  description: z.string().optional(),
  secret: z.string().optional(),
  script: z.string().optional(),
  knowledge: z.array(z.string()).optional(),
  starts_hidden: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const truthValueSchema = z.enum(["true", "false", "unknown"]);
const visibilitySchema = z.enum(["public", "hidden", "revealed"]);

const factDefSchema = z.object({
  id: z.string(),
  statement: z.string(),
  truth: truthValueSchema,
  visibility: visibilitySchema,
  time: z.string().optional(),
  source_entity: z.string().optional(),
  revealed_by: z.array(z.string()).optional(),
  contradicts: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const evidenceDefSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  source_entity: z.string().optional(),
  reveals: z.array(z.string()).optional(),
  contradicts: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  starts_discovered: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const interactionTypeSchema = z.enum(["talk", "search", "inspect", "confront", "submit-resolution"]);

const interactionDefSchema = z.object({
  id: z.string(),
  type: interactionTypeSchema,
  title: z.string(),
  target: z.object({
    kind: z.array(entityKindSchema).optional(),
    tags: z.array(z.string()).optional(),
    ids: z.array(z.string()).optional(),
  }).optional(),
  requires: z.object({
    evidence: z.array(z.string()).optional(),
    facts: z.array(z.string()).optional(),
    entities: z.array(z.string()).optional(),
  }).optional(),
  cost: z.object({
    progress: z.number().optional(),
  }).optional(),
  reveals: z.object({
    evidence: z.array(z.string()).optional(),
    facts: z.array(z.string()).optional(),
    entities: z.array(z.string()).optional(),
  }).optional(),
  prompt: z.string().optional(),
  config: z.record(z.unknown()).optional(),
});

const questionTypeSchema = z.enum(["single-entity", "multi-entity", "choice", "text-rubric", "evidence-set"]);

const questionDefSchema = z.object({
  id: z.string(),
  type: questionTypeSchema,
  title: z.string(),
  description: z.string().optional(),
  required: z.boolean().optional(),
  options: z.array(z.object({
    id: z.string(),
    label: z.string(),
    description: z.string().optional(),
  })).optional(),
  answer: z.union([z.string(), z.array(z.string())]).optional(),
  rubric: z.array(z.string()).optional(),
  related_facts: z.array(z.string()).optional(),
  related_evidence: z.array(z.string()).optional(),
});

const resolutionDefSchema = z.object({
  type: z.literal("questionnaire"),
  required_questions: z.array(z.string()),
  pass_score: z.number().optional(),
  endings: z.object({
    perfect: z.string(),
    partial: z.string().optional(),
    failed: z.string(),
    timeout: z.string().optional(),
  }),
});

const progressionDefSchema = z.object({
  type: z.enum(["daily-rounds", "free"]),
  config: z.object({
    max: z.number().optional(),
    per_phase: z.number().optional(),
    labels: z.array(z.string()).optional(),
    transition_template: z.string().optional(),
  }).optional(),
});

const panelTypeSchema = z.enum(["entity-list", "interaction", "narrative", "case-file", "resolution", "settings"]);

const panelDefSchema = z.object({
  id: z.string(),
  type: panelTypeSchema,
  title: z.string(),
  icon: z.string(),
  width: z.enum(["1/2", "1/3", "1/4", "1/6"]),
  filter: z.object({
    kind: z.array(entityKindSchema).optional(),
    tags: z.array(z.string()).optional(),
  }).optional(),
  sections: z.array(z.string()).optional(),
  config: z.record(z.unknown()).optional(),
});

export const caseManifestV2Schema = z.object({
  $schema: z.string(),
  format: z.literal("detective-case-v2"),
  packaging: z.literal("standalone-json"),
  title: z.string(),
  description: z.string(),
  progression: progressionDefSchema,
  entities: z.array(entityDefSchema),
  facts: z.array(factDefSchema),
  evidence: z.array(evidenceDefSchema),
  interactions: z.array(interactionDefSchema),
  questions: z.array(questionDefSchema),
  resolution: resolutionDefSchema,
  panels: z.array(panelDefSchema),
  first_entity: z.string().optional(),
  prompts: z.record(z.string()),
});

export type CaseManifestV2 = z.infer<typeof caseManifestV2Schema>;
