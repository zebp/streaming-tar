<h1 align="center">streaming-tar</h1>

<p align="center">
  A pure-TypeScript streaming Tar parser for Web-compatible JavaScript runtimes.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/streaming-tar">
    <img src="https://img.shields.io/npm/v/streaming-tar?style=for-the-badge" alt="downloads" height="24">
  </a>
  <a href="https://www.npmjs.com/package/streaming-tar">
    <img src="https://img.shields.io/github/actions/workflow/status/zebp/streaming-tar/ci.yml?branch=main&style=for-the-badge" alt="npm version" height="24">
  </a>
  <a href="https://github.com/zebp/streaming-tar">
    <img src="https://img.shields.io/badge/license-MIT-green?style=for-the-badge" alt="MIT license" height="24">
  </a>
</p>

```ts
import * as tar from "streaming-tar";

const resp = await fetch("https://registry.npmjs.org/react/-/react-18.2.0.tgz");
const tarStream = resp.body.pipeThrough(new DecompressionStream("gzip"));

for await (const entry of tar.entries(tarStream)) {
  const contents = await entry.text();
  console.log(entry.name, contents);
}
```

## Features

- Streaming support
- Supports Node.js, Deno, Cloudflare Workers, and other Web-compatible
  JavaScript runtimes
- Zero dependencies
- Small footprint, less than 1KB minified and gzipped.

## Requirements

- A Web-compatible JavaScript runtime (Node.js, Deno, Bun, Cloudflare Workers,
  etc.)

## Installation

Via npm:

```sh
npm install streaming-tar
```

Via yarn:

```sh
yarn add streaming-tar
```

Via pnpm:

```sh
pnpm add streaming-tar
```

Via deno:

```ts
import * as tar from "https://deno.land/x/streaming_tar/mod.ts";
```
