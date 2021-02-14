import * as ts from 'typescript';

export function hasImport(
  statements: ts.NodeArray<ts.Statement>,
  importModule: string
): boolean {
  return !!statements
    .filter((node) => {
      return node.kind === ts.SyntaxKind.ImportDeclaration;
    })
    .map((node: ts.ImportDeclaration) => (node.moduleSpecifier as any).text)
    .find((importName: string) => importName.indexOf(importModule) > -1);
}
