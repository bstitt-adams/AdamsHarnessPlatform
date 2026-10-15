import ts from "typescript";
import {
  ModuleDefinition,
  validateModuleDefinition,
} from "@/lib/modules/contract";
import { getFileContent } from "@/lib/integrations/github";

type LiteralResult =
  | { ok: true; value: unknown }
  | { ok: false; reason: string };

function literalFromExpression(expr: ts.Expression): LiteralResult {
  if (ts.isStringLiteral(expr) || ts.isNoSubstitutionTemplateLiteral(expr)) {
    return { ok: true, value: expr.text };
  }
  if (ts.isNumericLiteral(expr)) {
    const value = Number(expr.text);
    if (!Number.isFinite(value)) {
      return { ok: false, reason: "Invalid numeric literal." };
    }
    return { ok: true, value };
  }
  if (expr.kind === ts.SyntaxKind.TrueKeyword) return { ok: true, value: true };
  if (expr.kind === ts.SyntaxKind.FalseKeyword) return { ok: true, value: false };
  if (expr.kind === ts.SyntaxKind.NullKeyword) return { ok: true, value: null };
  if (
    ts.isPrefixUnaryExpression(expr) &&
    expr.operator === ts.SyntaxKind.MinusToken &&
    ts.isNumericLiteral(expr.operand)
  ) {
    const value = -Number(expr.operand.text);
    if (!Number.isFinite(value)) {
      return { ok: false, reason: "Invalid numeric literal." };
    }
    return { ok: true, value };
  }
  if (ts.isArrayLiteralExpression(expr)) {
    const items: unknown[] = [];
    for (const element of expr.elements) {
      if (ts.isSpreadElement(element) || ts.isOmittedExpression(element)) {
        return { ok: false, reason: "Spread/hole array elements not allowed." };
      }
      const item = literalFromExpression(element);
      if (!item.ok) return item;
      items.push(item.value);
    }
    return { ok: true, value: items };
  }
  if (ts.isObjectLiteralExpression(expr)) {
    const obj: Record<string, unknown> = {};
    for (const prop of expr.properties) {
      if (!ts.isPropertyAssignment(prop)) {
        return { ok: false, reason: "Only plain property assignments allowed." };
      }
      if (ts.isComputedPropertyName(prop.name)) {
        return { ok: false, reason: "Computed property names not allowed." };
      }
      if (!ts.isIdentifier(prop.name) && !ts.isStringLiteral(prop.name)) {
        return { ok: false, reason: "Unsupported property name." };
      }
      const value = literalFromExpression(prop.initializer);
      if (!value.ok) return value;
      obj[prop.name.text] = value.value;
    }
    return { ok: true, value: obj };
  }
  return { ok: false, reason: "Only literal values are allowed in definition." };
}

function parseSource(source: string, fileName: string): ts.SourceFile | null {
  const sf = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const diagnostics = (
    sf as ts.SourceFile & { parseDiagnostics?: ts.Diagnostic[] }
  ).parseDiagnostics;
  if (
    diagnostics &&
    diagnostics.some((d) => d.category === ts.DiagnosticCategory.Error)
  ) {
    return null;
  }
  return sf;
}

function validateDefinitionSource(
  source: string,
  expectedSlug: string,
): { valid: true; definition: ModuleDefinition } | { valid: false; reason: string } {
  const sf = parseSource(source, "definition.ts");
  if (!sf) return { valid: false, reason: "definition.ts failed to parse." };

  const imports: ts.ImportDeclaration[] = [];
  const exports_: ts.VariableStatement[] = [];
  for (const statement of sf.statements) {
    if (ts.isImportDeclaration(statement)) {
      imports.push(statement);
    } else if (ts.isVariableStatement(statement)) {
      exports_.push(statement);
    } else {
      return {
        valid: false,
        reason: "definition.ts may only contain one import and one const export.",
      };
    }
  }
  if (imports.length !== 1) {
    return { valid: false, reason: "definition.ts must contain exactly one import." };
  }
  const imp = imports[0];
  if (
    !ts.isStringLiteral(imp.moduleSpecifier) ||
    imp.moduleSpecifier.text !== "@/lib/modules/contract" ||
    imp.importClause?.isTypeOnly ||
    imp.importClause?.name ||
    !imp.importClause?.namedBindings ||
    !ts.isNamedImports(imp.importClause.namedBindings)
  ) {
    return { valid: false, reason: "definition.ts must import validateModuleDefinition." };
  }
  const bindings = imp.importClause.namedBindings.elements;
  if (bindings.length !== 1 || bindings[0].name.text !== "validateModuleDefinition" || bindings[0].propertyName) {
    return { valid: false, reason: "definition.ts must import only validateModuleDefinition." };
  }

  if (exports_.length !== 1) {
    return { valid: false, reason: "definition.ts must contain exactly one export." };
  }
  const stmt = exports_[0];
  const isExported = stmt.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
  if (!isExported || stmt.declarationList.declarations.length !== 1) {
    return { valid: false, reason: "definition.ts must export a single const." };
  }
  if (!(stmt.declarationList.flags & ts.NodeFlags.Const)) {
    return { valid: false, reason: "definition.ts export must be const." };
  }
  const decl = stmt.declarationList.declarations[0];
  if (
    !ts.isIdentifier(decl.name) ||
    decl.name.text !== "definition" ||
    !decl.initializer ||
    decl.type ||
    !ts.isCallExpression(decl.initializer)
  ) {
    return {
      valid: false,
      reason: "definition.ts must be `export const definition = validateModuleDefinition({...})`.",
    };
  }
  const call = decl.initializer;
  if (
    !ts.isIdentifier(call.expression) ||
    call.expression.text !== "validateModuleDefinition" ||
    call.arguments.length !== 1 ||
    !ts.isObjectLiteralExpression(call.arguments[0])
  ) {
    return {
      valid: false,
      reason: "definition must be a single validateModuleDefinition({...}) call.",
    };
  }
  const literal = literalFromExpression(call.arguments[0]);
  if (!literal.ok) {
    return {
      valid: false,
      reason: (literal as { ok: false; reason: string }).reason,
    };
  }
  try {
    const definition = validateModuleDefinition(literal.value);
    if (definition.slug !== expectedSlug) {
      return { valid: false, reason: "definition slug does not match build slug." };
    }
    return { valid: true, definition };
  } catch (error) {
    return {
      valid: false,
      reason: error instanceof Error ? error.message : "Definition invalid.",
    };
  }
}

function validateIndexSource(source: string): { valid: true } | { valid: false; reason: string } {
  const sf = parseSource(source, "index.ts");
  if (!sf) return { valid: false, reason: "index.ts failed to parse." };
  if (sf.statements.length !== 1) {
    return { valid: false, reason: "index.ts must contain exactly one statement." };
  }
  const stmt = sf.statements[0];
  if (
    !ts.isExportDeclaration(stmt) ||
    !stmt.exportClause ||
    !ts.isNamedExports(stmt.exportClause) ||
    !stmt.moduleSpecifier ||
    !ts.isStringLiteral(stmt.moduleSpecifier) ||
    stmt.moduleSpecifier.text !== "./definition"
  ) {
    return {
      valid: false,
      reason: "index.ts must be `export { definition } from './definition'`.",
    };
  }
  const elements = stmt.exportClause.elements;
  if (
    elements.length !== 1 ||
    elements[0].name.text !== "definition" ||
    elements[0].propertyName !== undefined
  ) {
    return {
      valid: false,
      reason: "index.ts must re-export only `definition`.",
    };
  }
  return { valid: true };
}

const REGISTRY_IDENT = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

function extractRegistryShape(source: string):
  | {
      valid: true;
      imports: { slug: string; identifier: string }[];
      moduleIdentifiers: string[];
      hasGetGeneratedModule: boolean;
    }
  | { valid: false; reason: string } {
  const sf = parseSource(source, "registry.ts");
  if (!sf) return { valid: false, reason: "registry.ts failed to parse." };

  const imports: { slug: string; identifier: string }[] = [];
  const moduleIdentifiers: string[] = [];
  let generatedSeen = false;
  let getterSeen = false;

  for (const statement of sf.statements) {
    if (ts.isImportDeclaration(statement)) {
      const specifier = statement.moduleSpecifier;
      if (!ts.isStringLiteral(specifier)) {
        return { valid: false, reason: "registry.ts import must use string specifier." };
      }
      const clause = statement.importClause;
      if (specifier.text === "@/lib/modules/contract") {
        if (
          clause?.name ||
          !clause?.namedBindings ||
          !ts.isNamedImports(clause.namedBindings) ||
          clause.namedBindings.elements.length !== 1 ||
          clause.namedBindings.elements[0].name.text !== "ModuleDefinition"
        ) {
          return { valid: false, reason: "registry.ts contract import must be ModuleDefinition only." };
        }
        continue;
      }
      const match = /^\.\/([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(specifier.text);
      if (
        !match ||
        clause?.isTypeOnly ||
        clause?.name ||
        !clause?.namedBindings ||
        !ts.isNamedImports(clause.namedBindings) ||
        clause.namedBindings.elements.length !== 1
      ) {
        return { valid: false, reason: `registry.ts has forbidden import ${specifier.text}.` };
      }
      const element = clause.namedBindings.elements[0];
      if (
        !element.propertyName ||
        element.propertyName.text !== "definition" ||
        !REGISTRY_IDENT.test(element.name.text)
      ) {
        return { valid: false, reason: "registry.ts module import must alias `definition`." };
      }
      imports.push({ slug: match[1], identifier: element.name.text });
      continue;
    }
    if (ts.isVariableStatement(statement)) {
      const isExported = statement.modifiers?.some(
        (m) => m.kind === ts.SyntaxKind.ExportKeyword,
      );
      if (
        !isExported ||
        statement.declarationList.declarations.length !== 1 ||
        !(statement.declarationList.flags & ts.NodeFlags.Const)
      ) {
        return { valid: false, reason: "registry.ts allows only the exported const array." };
      }
      const decl = statement.declarationList.declarations[0];
      const isModuleDefinitionArray =
        decl.type &&
        ts.isArrayTypeNode(decl.type) &&
        ts.isTypeReferenceNode(decl.type.elementType) &&
        ts.isIdentifier(decl.type.elementType.typeName) &&
        decl.type.elementType.typeName.text === "ModuleDefinition";
      if (
        !ts.isIdentifier(decl.name) ||
        decl.name.text !== "GENERATED_MODULES" ||
        !isModuleDefinitionArray ||
        !decl.initializer ||
        !ts.isArrayLiteralExpression(decl.initializer)
      ) {
        return { valid: false, reason: "registry.ts must export `GENERATED_MODULES: ModuleDefinition[]`." };
      }
      for (const el of decl.initializer.elements) {
        if (!ts.isIdentifier(el) || !REGISTRY_IDENT.test(el.text)) {
          return { valid: false, reason: "GENERATED_MODULES may only contain identifiers." };
        }
        moduleIdentifiers.push(el.text);
      }
      generatedSeen = true;
      continue;
    }
    if (ts.isFunctionDeclaration(statement)) {
      const isExported = statement.modifiers?.some(
        (m) => m.kind === ts.SyntaxKind.ExportKeyword,
      );
      if (
        !isExported ||
        !statement.name ||
        statement.name.text !== "getGeneratedModule" ||
        statement.parameters.length !== 1 ||
        !statement.body
      ) {
        return { valid: false, reason: "registry.ts allows only getGeneratedModule." };
      }
      const param = statement.parameters[0];
      const paramIsString =
        param.type &&
        (param.type.kind === ts.SyntaxKind.StringKeyword ||
          (ts.isTypeReferenceNode(param.type) &&
            ts.isIdentifier(param.type.typeName) &&
            param.type.typeName.text === "String"));
      if (
        !ts.isIdentifier(param.name) ||
        param.name.text !== "slug" ||
        !paramIsString
      ) {
        return { valid: false, reason: "getGeneratedModule signature mismatch." };
      }
      let bodySafe = true;
      statement.body.forEachChild(function walk(node) {
        if (!bodySafe) return;
        if (
          ts.isCallExpression(node) &&
          !(ts.isPropertyAccessExpression(node.expression) &&
            ts.isIdentifier(node.expression.expression) &&
            node.expression.expression.text === "GENERATED_MODULES" &&
            node.expression.name.text === "find")
        ) {
          bodySafe = false;
          return;
        }
        if (ts.isAwaitExpression(node) || ts.isNewExpression(node)) {
          bodySafe = false;
          return;
        }
        node.forEachChild(walk);
      });
      if (!bodySafe) {
        return { valid: false, reason: "getGeneratedModule body contains forbidden expressions." };
      }
      getterSeen = true;
      continue;
    }
    return { valid: false, reason: "registry.ts contains a forbidden statement." };
  }

  if (!generatedSeen || !getterSeen) {
    return {
      valid: false,
      reason: "registry.ts must export GENERATED_MODULES and getGeneratedModule.",
    };
  }
  for (const id of moduleIdentifiers) {
    if (!imports.some((i) => i.identifier === id)) {
      return { valid: false, reason: `GENERATED_MODULES references unimported identifier ${id}.` };
    }
  }
  return {
    valid: true,
    imports,
    moduleIdentifiers,
    hasGetGeneratedModule: getterSeen,
  };
}

export function validateGeneratedSourceFiles(input: {
  slug: string;
  contents: Record<string, string>;
  baseRegistryContent?: string;
}): { valid: true; definition: ModuleDefinition } | { valid: false; reason: string } {
  const { slug, contents } = input;
  const definitionPath = `modules/generated/${slug}/definition.ts`;
  const indexPath = `modules/generated/${slug}/index.ts`;
  const registryPath = "modules/generated/registry.ts";
  const testPath = `modules/generated/${slug}/definition.test.ts`;

  for (const path of Object.keys(contents)) {
    if (![definitionPath, indexPath, registryPath, testPath].includes(path)) {
      return { valid: false, reason: `Unexpected file ${path}.` };
    }
  }
  if (contents[testPath] !== undefined) {
    return { valid: false, reason: "definition.test.ts is not permitted in this phase." };
  }
  if (
    contents[definitionPath] === undefined ||
    contents[indexPath] === undefined ||
    contents[registryPath] === undefined
  ) {
    return { valid: false, reason: "definition.ts, index.ts and registry.ts are required." };
  }

  const defResult = validateDefinitionSource(contents[definitionPath], slug);
  if (!defResult.valid) {
    return {
      valid: false,
      reason: (defResult as { valid: false; reason: string }).reason,
    };
  }

  const indexResult = validateIndexSource(contents[indexPath]);
  if (!indexResult.valid) {
    return {
      valid: false,
      reason: (indexResult as { valid: false; reason: string }).reason,
    };
  }

  const regResult = extractRegistryShape(contents[registryPath]);
  if (!regResult.valid) {
    return {
      valid: false,
      reason: (regResult as { valid: false; reason: string }).reason,
    };
  }

  const slugImports = regResult.imports.filter((i) => i.slug === slug);
  if (slugImports.length !== 1) {
    return { valid: false, reason: `registry.ts must import ./${slug} exactly once.` };
  }
  if (!regResult.moduleIdentifiers.includes(slugImports[0].identifier)) {
    return { valid: false, reason: "GENERATED_MODULES does not include the new module." };
  }

  if (input.baseRegistryContent !== undefined) {
    const baseResult = extractRegistryShape(input.baseRegistryContent);
    if (baseResult.valid) {
      for (const imp of baseResult.imports) {
        if (!regResult.imports.some((i) => i.slug === imp.slug && i.identifier === imp.identifier)) {
          return {
            valid: false,
            reason: `registry.ts removed existing module ${imp.slug}.`,
          };
        }
      }
      for (const ident of baseResult.moduleIdentifiers) {
        if (!regResult.moduleIdentifiers.includes(ident)) {
          return {
            valid: false,
            reason: "GENERATED_MODULES dropped an existing entry.",
          };
        }
      }
    }
  }

  return { valid: true, definition: defResult.definition };
}

export async function validateGeneratedSources(input: {
  slug: string;
  sha: string;
  baseRef: string;
  files: { filename: string; status: string }[];
}): Promise<{ valid: true; definition: ModuleDefinition } | { valid: false; reason: string }> {
  const contents: Record<string, string> = {};
  for (const file of input.files) {
    const content = await getFileContent(file.filename, input.sha);
    if (content === null) {
      return { valid: false, reason: `Could not read ${file.filename} at ${input.sha}.` };
    }
    contents[file.filename] = content;
  }
  const baseRegistry = await getFileContent(
    "modules/generated/registry.ts",
    input.baseRef,
  );
  return validateGeneratedSourceFiles({
    slug: input.slug,
    contents,
    baseRegistryContent: baseRegistry ?? undefined,
  });
}
