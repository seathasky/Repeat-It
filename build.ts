import * as esbuild from "esbuild";
import * as fs from "node:fs";

const manifest = JSON.parse(fs.readFileSync("manifest.json", "utf8"));
const logoSvg = fs.readFileSync("media/logo.svg", "utf8");
const logoMarkup = logoSvg
  .replace(/<\?xml[^>]*>\s*/u, "")
  .replace(/<!--[\s\S]*?-->\s*/u, "")
  .replace("<svg ", '<svg overflow="visible" ');

function cleanDecorativeSvg(
  svg: string,
  className: string,
  options: { shouldUseCurrentColor?: boolean; viewBox?: string } = {},
) {
  const cleanedSvg = svg
    .replace(/<\?xml[^>]*>\s*/u, "")
    .replace(/<!DOCTYPE[\s\S]*?>\s*/u, "")
    .replace(/<!--[\s\S]*?-->\s*/gu, "")
    .replace(/<metadata\b[\s\S]*?<\/metadata>\s*/u, "")
    .replace(/<g\s+id="_0"[\s\S]*?<\/g>\s*<\/g>\s*/u, "");

  const coloredSvg = options.shouldUseCurrentColor
    ? cleanedSvg
      .replace(/fill="#000000"/gu, 'fill="currentColor"')
      .replace(/fill:\s*#250082/gu, "fill: currentColor")
    : cleanedSvg;
  const croppedSvg = options.viewBox
    ? coloredSvg.replace(/viewBox="[^"]+"/u, `viewBox="${options.viewBox}"`)
    : coloredSvg;

  return croppedSvg
    .replace("<svg", `<svg class="${className}" aria-hidden="true"`);
}

const autumnSvg = fs.readFileSync("media/autumn.svg", "utf8");
const autumnMarkup = cleanDecorativeSvg(autumnSvg, "autumn-svg");
const retroSvg = fs.readFileSync("media/retro.svg", "utf8");
const retroMarkup = cleanDecorativeSvg(retroSvg, "retro-svg");
const halloweenSvg = fs.readFileSync("media/halloween.svg", "utf8");
const halloweenMarkup = cleanDecorativeSvg(halloweenSvg, "jackolantern-svg", {
  shouldUseCurrentColor: true,
  viewBox: "15 315 260 255",
});
const snowflakeSvg = fs.readFileSync("media/snowflake.svg", "utf8");
const snowflakeMarkup = cleanDecorativeSvg(snowflakeSvg, "snowflake-svg", {
  shouldUseCurrentColor: true,
});
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
    __REPEAT_IT_AUTUMN_MARKUP__: JSON.stringify(autumnMarkup),
    __REPEAT_IT_HALLOWEEN_MARKUP__: JSON.stringify(halloweenMarkup),
    __REPEAT_IT_RETRO_MARKUP__: JSON.stringify(retroMarkup),
    __REPEAT_IT_SNOWFLAKE_MARKUP__: JSON.stringify(snowflakeMarkup),
  },
  loader: {
    ".css": "text",
    ".html": "text",
    ".js": "text",
  },
  sourcesContent: false,
  logLevel: "info",
  minify: production,
  sourcemap: !production,
});
