export const ALLOWED_GENERATED_FILE =
  /^modules\/generated\/(?:registry\.ts|[a-z0-9-]+\/(?:definition|index|definition\.test)\.ts)$/;

export function validateGeneratedFiles(
  files: string[],
  expectedSlug: string,
): { valid: true } | { valid: false; forbidden: string[] } {
  const prefix = `modules/generated/${expectedSlug}/`;
  const forbidden = files.filter(
    (file) =>
      !ALLOWED_GENERATED_FILE.test(file) ||
      (file !== "modules/generated/registry.ts" && !file.startsWith(prefix)),
  );
  return forbidden.length === 0
    ? { valid: true }
    : { valid: false, forbidden };
}
