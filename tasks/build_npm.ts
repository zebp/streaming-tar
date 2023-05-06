import {
  build,
  BuildOptions,
  emptyDir,
} from "https://deno.land/x/dnt@0.34.0/mod.ts";

const version = Deno.env.get("VERSION");
if (!version) {
  throw new Error("VERSION environment variable must be set");
}

const config = {
  entryPoints: ["./mod.ts"],
  outDir: "./npm",
  shims: {},
  package: {
    name: "streaming-tar",
    version,
    author: "Zeb Piasecki <zeb@zebulon.dev>",
    description:
      "A pure-TypeScript streaming Tar parser for Web-compatible JavaScript runtimes.",
    license: "MIT",
    repository: {
      type: "git",
      url: "git+https://github.com/zebp/streaming-tar.git",
    },
    bugs: {
      url: "https://github.com/zebp/streaming-tar/issues",
    },
  },
  compilerOptions: {
    target: "Latest",
    lib: ["dom", "es2020"],
  },
} satisfies BuildOptions;

// Do a test build to make sure everything is working
console.log("\nBuilding package for testing...\n");
await emptyDir("./npm");
await build({
  ...config,
  shims: {
    deno: true,
  },
  typeCheck: false,
});

// Do the real build
console.log("\nBuilding package for distribution...\n");
await emptyDir("./npm");
await build({ ...config, test: false });

await Deno.copyFile("./LICENSE", "./npm/LICENSE");
await Deno.copyFile("./README.md", "./npm/README.md");
