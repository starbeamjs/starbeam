import shell from "shelljs";

const FLAGS = process.argv.slice(2);

if (FLAGS.includes("--bootstrap")) {
  shell.exec("node ./scripts/bootstrap.js");
}

if (!FLAGS.includes("--no-packages")) {
  shell.exec("node ./bootstrap/dist/starbeam.js");
}
