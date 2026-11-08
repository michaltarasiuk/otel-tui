import bindingsPackage from "@duckdb/node-bindings/package.json" with { type: "json" };
import type { BunPlugin } from "bun";
import dedent from "dedent";

const [platform = process.platform, arch = process.arch, outfileArg] = process.argv.slice(2);
const outfile = outfileArg ?? `dist/otel-tui-${platform}-${arch}`;

const DUCKDB_LIBRARIES: Record<string, string> = {
  darwin: "libduckdb.dylib",
  linux: "libduckdb.so",
  win32: "duckdb.dll",
};

const DUCKDB_BINDINGS = /^@duckdb\/node-bindings$/;

function extractedDuckdbBinding(platformArch: string, library: string) {
  const bindings = `@duckdb/node-bindings-${platformArch}`;
  return dedent`
    const { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } = require("node:fs");
    const { join } = require("node:path");
    const { homedir } = require("node:os");

    const embeddedBinding = require("${bindings}/duckdb.node");
    const embeddedLibrary = require("${bindings}/${library}");
    const cache = process.env.XDG_CACHE_HOME || join(homedir(), ".cache");
    const directory = join(cache, "otel-tui", "duckdb-${bindingsPackage.version}");

    function extract(source, name) {
      const target = join(directory, name);
      if (!existsSync(target)) {
        const partial = target + "." + process.pid;
        writeFileSync(partial, readFileSync(source));
        renameSync(partial, target);
      }
      return target;
    }

    mkdirSync(directory, { recursive: true });
    extract(embeddedLibrary, "${library}");
    module.exports = require(extract(embeddedBinding, "duckdb.node"));
  `;
}

function duckdbBinding(platform: string, arch: string): BunPlugin {
  const library = DUCKDB_LIBRARIES[platform];
  if (library === undefined) {
    throw new Error(`No DuckDB library name for platform ${platform}`);
  }
  return {
    name: "duckdb-binding",
    setup(build) {
      build.onResolve({ filter: DUCKDB_BINDINGS }, () => ({
        path: `${platform}-${arch}`,
        namespace: "duckdb-binding",
      }));
      build.onLoad({ filter: /.*/, namespace: "duckdb-binding" }, ({ path }) => ({
        contents: extractedDuckdbBinding(path, library),
        loader: "js",
        resolveDir: process.cwd(),
      }));
    },
  };
}

const result = await Bun.build({
  entrypoints: ["src/main.ts"],
  compile: { target: `bun-${platform}-${arch}` as Bun.Build.CompileTarget, outfile },
  minify: true,
  loader: { ".node": "file", ".dylib": "file", ".so": "file", ".dll": "file" },
  plugins: [duckdbBinding(platform, arch)],
  ...(platform === "linux"
    ? { define: { "process.env.OPENTUI_LIBC": JSON.stringify("glibc") } }
    : {}),
});

if (!result.success) {
  for (const log of result.logs) {
    console.error(log);
  }
  process.exit(1);
}
console.log(`Built ${outfile}`);
