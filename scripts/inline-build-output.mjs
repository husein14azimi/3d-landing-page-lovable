import fs from "fs";
import path from "path";

const distDir = "dist/client";
const assetsDir = path.join(distDir, "assets");
const htmlPath = path.join(distDir, "index.html");

if (!fs.existsSync(assetsDir)) {
  throw new Error(`Missing assets directory: ${assetsDir}`);
}

let html = fs.readFileSync(htmlPath, "utf8");
const assetFiles = fs.readdirSync(assetsDir);

const cssFiles = assetFiles.filter((f) => f.endsWith(".css"));
const jsFiles = assetFiles.filter((f) => f.endsWith(".js"));

// Identify the entry script referenced by index.html (e.g. index-<hash>.js)
const entryScriptMatch = html.match(
  /<script\b[^>]*\bsrc="(?:\/?\.\/)?assets\/([^"]+\.js)"[^>]*><\/script>/
);
if (!entryScriptMatch) {
  throw new Error("Could not find entry <script src=...assets/*.js> in index.html");
}
const entryJsName = entryScriptMatch[1];

// Read all JS and CSS files
const cssContents = new Map(
  cssFiles.map((name) => [name, fs.readFileSync(path.join(assetsDir, name), "utf8")])
);
const jsContents = new Map(
  jsFiles.map((name) => [name, fs.readFileSync(path.join(assetsDir, name), "utf8")])
);

const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Neutralize new URL("styles-*.css", import.meta.url).href in JS chunks because CSS is inlined in <style>
for (const [jsName, code] of jsContents) {
  let updated = code;
  for (const cssName of cssFiles) {
    const cssUrlPattern = new RegExp(
      `new URL\\((["'\`])${escapeRegExp(cssName)}\\1,import\\.meta\\.url\\)\\.href`,
      "g"
    );
    updated = updated.replace(cssUrlPattern, () => `"data:text/css,"`);
  }
  jsContents.set(jsName, updated);
}

// Inline non-entry JS chunks as data-URL dynamic imports (topological / multi-pass for nested chunks)
const nonEntryJsNames = jsFiles.filter((name) => name !== entryJsName);
const dataUrls = new Map();

// Build data URLs iteratively so if a non-entry chunk imports another, it gets resolved too
for (let pass = 0; pass <= nonEntryJsNames.length; pass++) {
  for (const name of nonEntryJsNames) {
    let code = jsContents.get(name);
    for (const [depName, depUrl] of dataUrls) {
      // Replace dynamic import() calls referencing the dependency chunk
      const dynPattern = new RegExp(
        `import\\((["'\`])(?:\\.\\/)?${escapeRegExp(depName)}\\1\\)`,
        "g"
      );
      code = code.replace(dynPattern, () => `import("${depUrl}")`);
      // Replace static import ... from "./chunk.js" referencing the dependency chunk
      const staticPattern = new RegExp(
        `from\\s*(["'\`])(?:\\.\\/)?${escapeRegExp(depName)}\\1`,
        "g"
      );
      code = code.replace(staticPattern, () => `from("${depUrl}")`);
    }
    jsContents.set(name, code);
    const b64 = Buffer.from(code, "utf8").toString("base64");
    dataUrls.set(name, `data:text/javascript;base64,${b64}`);
  }
}

// Replace dynamic imports AND static imports in the entry JS chunk
let entryJs = jsContents.get(entryJsName);
for (const [depName, depUrl] of dataUrls) {
  // Dynamic import() calls
  const dynPattern = new RegExp(
    `import\\((["'\`])(?:\\.\\/)?${escapeRegExp(depName)}\\1\\)`,
    "g"
  );
  entryJs = entryJs.replace(dynPattern, () => `import("${depUrl}")`);
  // Static import ... from "..." statements
  const staticPattern = new RegExp(
    `from\\s*(["'\`])(?:\\.\\/)?${escapeRegExp(depName)}\\1`,
    "g"
  );
  entryJs = entryJs.replace(staticPattern, () => `from("${depUrl}")`);
}

// Escape </script and </style so HTML parser never terminates tags prematurely
const safeEntryJs = entryJs.replace(/<\/script/gi, "<\\/script");

// Inline CSS <link rel="stylesheet" ...> tags using replacer functions ($-safe)
for (const [cssName, css] of cssContents) {
  const safeCss = css.replace(/<\/style/gi, "<\\/style");
  const linkPattern = new RegExp(
    `<link\\b[^>]*rel="stylesheet"[^>]*href="(?:\\/?\\.\\/)?assets\\/${escapeRegExp(cssName)}"[^>]*\\/?>`,
    "g"
  );
  html = html.replace(linkPattern, () => `<style>${safeCss}</style>`);
}

// Remove modulepreload links to local assets
html = html.replace(
  /<link\b[^>]*rel="modulepreload"[^>]*href="(?:\/?\.\/)?assets\/[^"]+"[^>]*\/?>/g,
  ""
);

// Clear preloads and scripts in TanStack Start's inline $_TSR.router manifest
// so hydration does not try to inject /./assets/*.js or modulepreload links.
html = html.replace(
  /preloads:\$R\[\d+\]=\[[^\]]*\]/g,
  "preloads:[]"
);
html = html.replace(
  /scripts:\$R\[\d+\]=\[\$R\[\d+\]=\{attrs:\$R\[\d+\]=\{type:"module",async:!0,src:"[^"]*assets\/[^"]+"\}\}\]/g,
  "scripts:[]"
);

// Inline the entry script using a replacer function ($-safe!)
html = html.replace(
  /<script\b[^>]*\bsrc="(?:\/?\.\/)?assets\/[^"]+\.js"[^>]*><\/script>/,
  () => `<script type="module">${safeEntryJs}</script>`
);

// Sanity check: no remaining references to assets/ in HTML
const remainingAssetRefs = html.match(/(?:\/?\.\/)?assets\/[^\s"'<>]+/g);
if (remainingAssetRefs) {
  throw new Error(
    `Found un-inlined asset references in index.html: ${remainingAssetRefs.join(", ")}`
  );
}

fs.writeFileSync(htmlPath, html);
fs.rmSync(assetsDir, { recursive: true, force: true });

const sizeKb = (Buffer.byteLength(html, "utf8") / 1024).toFixed(1);
console.log(
  `Inlined ${cssFiles.length} CSS and ${jsFiles.length} JS asset(s) into ${htmlPath} (${sizeKb} kB)`
);
