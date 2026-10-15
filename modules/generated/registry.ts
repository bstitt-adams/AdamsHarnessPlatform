import type { ModuleDefinition } from "@/lib/modules/contract";

export const GENERATED_MODULES: ModuleDefinition[] = [];

export function getGeneratedModule(slug: string): ModuleDefinition | undefined {
  return GENERATED_MODULES.find((m) => m.slug === slug);
}
