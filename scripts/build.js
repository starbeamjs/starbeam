import shell from "shelljs";

shell.exec("node ./scripts/bootstrap.js");
shell.exec("node ./bootstrap/dist/starbeam.js");
