/*
Node script to patch the "types" path in lib-jitsi-meet's package.json

usage: node fix-ljm.ts [path to lib-jitsi-meet node package directory]
*/

import { copyFileSync, readFileSync, writeFileSync } from "node:fs";

// parse path to package.json from commandline or hardcoded
let package_path;
if (process.argv[2]) {
  package_path = process.argv[2];
} else {
  package_path = "./node_modules/lib-jitsi-meet/";
}
package_path += "/package.json"

// read json file into javascript object
const package_json: string = readFileSync(package_path).toString();
let package_: any = JSON.parse(package_json);

// if no types are declared
if (!package_.types) {
  // backup file
  const backup_path: string = `${package_path}.old`;
  copyFileSync(package_path, backup_path);

  // inject types into package.json and write
  package_.types = "./types/index.d.ts";
  writeFileSync(package_path, JSON.stringify(package_, null, 2));
}
