// Keep the visible title, header and About marker consistent for device reports.
// CREW_BUILD_HTML also permits this gate to check an exported hub cabinet.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(process.env.CREW_BUILD_HTML || new URL('../crew-run/index.html',import.meta.url),'utf8');
const title=html.match(/<title>Piritori · Night Shift (C\.\d+(?:\.\d+)*)<\/title>/)?.[1];
const header=html.match(/<h1>NIGHT SHIFT <span>(C\.\d+(?:\.\d+)*)<\/span><\/h1>/)?.[1];
const about=html.match(/<summary>About this build \/ test fixtures<\/summary><p>(C\.\d+(?:\.\d+)*) —/)?.[1];
assert.ok(title,'Night Shift title must carry a build marker');
assert.equal(header,title,'visible header must match the page title');
assert.equal(about,title,'About this build must match the visible current build');
console.log(`${title} build identity contract passed`);
