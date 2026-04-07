const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
if (pkg.pnpm && pkg.pnpm.patchedDependencies) {
  delete pkg.pnpm.patchedDependencies;
}
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));


