import * as esbuild from "esbuild";
import * as fs from "node:fs";

const manifest = JSON.parse(fs.readFileSync("manifest.json", "utf8"));
const logoSvg = fs.readFileSync("media/logo.svg", "utf8");
const logoMarkup = logoSvg
  .replace(/<\?xml[^>]*>\s*/u, "")
  .replace(/<!--[\s\S]*?-->\s*/u, "")
  .replace("<svg ", '<svg overflow="visible" ');
const production = process.argv.includes("--production");

await esbuild.build({
  entryPoints: ["src/extension.ts"],
  outfile: manifest.entry,
  bundle: true,
  format: "cjs",
  platform: "node",
  define: {
    __REPEAT_IT_BUILD_VERSION__: JSON.stringify(manifest.version),
    __REPEAT_IT_LOGO_MARKUP__: JSON.stringify(logoMarkup),
  },
  loader: {
    ".html": "text",
  },
  sourcesContent: false,
  logLevel: "info",
  minify: production,
  sourcemap: !production,
});
