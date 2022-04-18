#!/usr/bin/env node

import sh from "shell-escape-tag";
import shell from "shelljs";

// shell.env.NODE_OPTIONS = "";

const args = sh.escape(...process.argv.slice(2));
const command = sh`node --experimental-vm-modules --no-warnings ./node_modules/jest/bin/jest.js --runInBand --watchAll=false --colors ${args}`;

console.log(command);

shell.exec(command);
