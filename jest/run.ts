import shell from "shelljs";

shell.env.NODE_OPTIONS = "--experimental-vm-modules --no-warnings";

shell.exec("node ./node_modules/jest/bin/jest.js --runInBand --colors");
