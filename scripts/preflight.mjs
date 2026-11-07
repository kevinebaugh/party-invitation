// Runs before `npm run deploy`. Catches the setup steps people most often skip, with plain-English help.
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const wrangler = fs.readFileSync(path.join(root, "wrangler.jsonc"), "utf8");
let bad = false;

if (wrangler.includes("REPLACE_WITH_YOUR_D1_ID")) {
  bad = true;
  console.error(`
Setup isn't finished: wrangler.jsonc still has the placeholder database id.

  1. npx wrangler login                      (once; opens your browser)
  2. npx wrangler d1 create party-rsvps      (prints a database_id)
     If Wrangler offers to add the binding to your config, answer "no".
  3. Paste that database_id into wrangler.jsonc, replacing REPLACE_WITH_YOUR_D1_ID
  4. npm run db:migrate
  5. npx wrangler secret put ADMIN_PASSPHRASE
  6. npm run deploy

See "Put it online" in the README.
`);
}

const file = ["event.config.local.json", "event.config.json"].map((f) => path.join(root, f)).find((f) => fs.existsSync(f));
try {
  const c = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!c.siteUrl) {
    console.log(`
Note: "siteUrl" is empty. That's fine for your first deploy. Wrangler will print your site's address
(https://...workers.dev). Copy it into "siteUrl" in ${path.basename(file)} and run \`npm run deploy\` once more,
so link previews (iMessage, etc.) show your picture. Do this before you send the invitation.
`);
  }
} catch { /* the build step reports config problems */ }

process.exit(bad ? 1 : 0);
