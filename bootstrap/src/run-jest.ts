#!/usr/bin/env node

import sh from "shell-escape-tag";
import shell from "shelljs";

shell.env.NODE_OPTIONS = "--experimental-vm-modules --no-warnings";

const args = sh.escape(...process.argv.slice(2));
const command = sh`node ./node_modules/jest/bin/jest.js --runInBand --watchAll=false --colors ${args}`;

console.log(command);

shell.exec(command);
