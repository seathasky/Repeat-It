import * as esbuild from "esbuild";
import * as fs from "node:fs";

const manifest = JSON.parse(fs.readFileSync("manifest.json", "utf8"));
const production = process.argv.includes("--production");

await esbuild.build({
  entryPoints: ["src/extension.ts"],
  outfile: manifest.entry,
  bundle: true,
  format: "cjs",
  platform: "node",
  define: {
    __REPEAT_IT_BUILD_VERSION__: JSON.stringify(manifest.version),
  },
  loader: {
    ".html": "text",
  },
  sourcesContent: false,
  logLevel: "info",
  minify: production,
  sourcemap: !production,
});
