
import { execSync } from 'node:child_process';
import path from 'node:path';

import { compile } from "@starbeam-dev/compile";
import copy from 'rollup-plugin-copy'

const config = compile(import.meta);

const monorepoRoot = execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' }).trim();

const rootChangelog = path.join(monorepoRoot, 'CHANGELOG.md');

 
const includeChangelog = copy({ 
  targets: [
    {
      src: rootChangelog,
      dest: '.',
    }
  ],
});

// eslint-disable-next-line @typescript-eslint/no-unsafe-call
config[0].plugins.push(includeChangelog);

export default config;
