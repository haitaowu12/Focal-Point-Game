import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = join(root, 'build/firebase');
rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });
for (const path of ['index.html', 'styles.css', 'src', 'README.md', 'LICENSE']) {
  cpSync(join(root, path), join(output, path), { recursive: true });
}
console.log('Public application staged in build/firebase/');
