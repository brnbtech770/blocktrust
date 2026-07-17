/**
 * Empaquette l'extension TrustScan pour le Chrome Web Store.
 * Usage : npm run extension:pack
 */
import { cpSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { execSync } from "node:child_process";
import { join, resolve } from "node:path";

const root = resolve(process.cwd(), "extension");
const manifestPath = join(root, "manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as { version: string };
const version = manifest.version;
const folderName = `blocktrust-trustscan-${version}`;
const stagingDir = join(root, "dist", folderName);
const zipName = `${folderName}.zip`;
const zipDist = join(root, "dist", zipName);
const zipRoot = join(root, zipName);

const COPY_DIRS = ["background", "content", "popup", "icons"] as const;

function main(): void {
  rmSync(stagingDir, { recursive: true, force: true });
  mkdirSync(stagingDir, { recursive: true });

  cpSync(manifestPath, join(stagingDir, "manifest.json"));

  for (const dir of COPY_DIRS) {
    cpSync(join(root, dir), join(stagingDir, dir), { recursive: true });
  }

  rmSync(zipDist, { force: true });
  rmSync(zipRoot, { force: true });

  execSync(`cd "${stagingDir}" && zip -r "${zipDist}" . -x "*.DS_Store"`, {
    stdio: "inherit",
  });
  cpSync(zipDist, zipRoot);

  console.log(`\n✅ Extension v${version} empaquetée :`);
  console.log(`   • ${zipDist}`);
  console.log(`   • ${zipRoot}`);
  console.log("\n→ Chrome Web Store : Developer Dashboard → TrustScan → Package → Upload");
}

main();
