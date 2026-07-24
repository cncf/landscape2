module.exports = ({ types }) => ({
  name: 'replace-vite-mode',
  visitor: {
    Program: {
      exit(path) {
        const requirements = [];
        path.get('body').forEach((statement) => {
          if (!statement.isImportDeclaration()) return;

          const properties = statement.node.specifiers
            .filter((specifier) => types.isImportSpecifier(specifier))
            .map((specifier) =>
              types.objectProperty(specifier.imported, specifier.local, false, specifier.imported === specifier.local)
            );
          requirements.push(
            types.variableDeclaration('const', [
              types.variableDeclarator(
                types.objectPattern(properties),
                types.callExpression(types.identifier('require'), [statement.node.source])
              ),
            ])
          );
          statement.remove();
        });
        path.unshiftContainer('body', requirements);
      },
    },
    MemberExpression(path) {
      const environment = path.node.object;
      if (
        !types.isIdentifier(path.node.property, { name: 'MODE' }) ||
        !types.isMemberExpression(environment) ||
        !types.isIdentifier(environment.property, { name: 'env' }) ||
        !types.isMetaProperty(environment.object) ||
        environment.object.meta.name !== 'import' ||
        environment.object.property.name !== 'meta'
      ) {
        return;
      }

      path.replaceWith(types.stringLiteral('test'));
    },
  },
});
