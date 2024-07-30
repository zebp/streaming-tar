import {
  assert,
  assertEquals,
  assertFalse,
} from "https://deno.land/std@0.186.0/testing/asserts.ts";
import { Buffer } from "https://deno.land/std@0.186.0/io/buffer.ts";
import { Tar } from "https://deno.land/std@0.186.0/archive/tar.ts";
import { readableStreamFromReader } from "https://deno.land/std@0.186.0/streams/mod.ts";

import { entries } from "./mod.ts";

async function tarStream(
  ...contents: (string | Uint8Array)[]
): Promise<ReadableStream<Uint8Array>> {
  const encoder = new TextEncoder();
  const archive = new Tar();

  for (let i = 0; i < contents.length; i++) {
    const content = contents[i];

    if (typeof content === "string") {
      const bytes = encoder.encode(content);
      await archive.append(`file${i}`, {
        reader: new Buffer(bytes),
        contentSize: bytes.length,
        type: "file",
      });
    } else {
      await archive.append(`file${i}`, {
        reader: new Buffer(content),
        contentSize: content.length,
        type: "file",
      });
    }
  }

  return readableStreamFromReader(archive.getReader());
}

Deno.test("single of block size", async () => {
  const text = "a".repeat(512);
  const stream = await tarStream(text);
  const entriesIter = entries(stream)[Symbol.asyncIterator]();
  let result = await entriesIter.next();
  assertFalse(result.done);
  assertEquals(result.value.name, "file0");
  assertEquals(result.value.fileSize, 512);
  assertEquals(result.value.type, "file");
  assertEquals(await result.value.text(), text);

  result = await entriesIter.next();
  assert(result.done);
});

Deno.test("single smaller than block", async () => {
  const text = "a".repeat(100);
  const stream = await tarStream(text);
  const entriesIter = entries(stream)[Symbol.asyncIterator]();
  let result = await entriesIter.next();
  assertFalse(result.done);
  assertEquals(result.value.name, "file0");
  assertEquals(result.value.fileSize, 100);
  assertEquals(result.value.type, "file");
  assertEquals(await result.value.text(), text);

  result = await entriesIter.next();
  assert(result.done);
});

Deno.test("single larger than block", async () => {
  const text = "a".repeat(5000);
  const stream = await tarStream(text);
  const entriesIter = entries(stream)[Symbol.asyncIterator]();
  let result = await entriesIter.next();
  assertFalse(result.done);
  assertEquals(result.value.name, "file0");
  assertEquals(result.value.fileSize, 5000);
  assertEquals(result.value.type, "file");
  assertEquals(await result.value.text(), text);

  result = await entriesIter.next();
  assert(result.done);
});

Deno.test("multiple entries same sizes", async () => {
  const length = 2000;

  const stream = await tarStream(
    "a".repeat(length),
    "b".repeat(length),
    "c".repeat(length),
  );
  const entriesIter = entries(stream)[Symbol.asyncIterator]();
  let result = await entriesIter.next();
  assertFalse(result.done);
  assertEquals(result.value.name, "file0");
  assertEquals(result.value.fileSize, length);
  assertEquals(result.value.type, "file");
  assertEquals(await result.value.text(), "a".repeat(length));

  result = await entriesIter.next();
  assertFalse(result.done);
  assertEquals(result.value.name, "file1");
  assertEquals(result.value.fileSize, length);
  assertEquals(result.value.type, "file");
  assertEquals(await result.value.text(), "b".repeat(length));

  result = await entriesIter.next();
  assertFalse(result.done);
  assertEquals(result.value.name, "file2");
  assertEquals(result.value.fileSize, length);
  assertEquals(result.value.type, "file");
  assertEquals(await result.value.text(), "c".repeat(length));

  result = await entriesIter.next();
  assert(result.done);
});

Deno.test("multiple entries varying sizes", async () => {
  const stream = await tarStream(
    "a".repeat(31252),
    "b".repeat(1217863),
    "c".repeat(63123),
  );
  const entriesIter = entries(stream)[Symbol.asyncIterator]();
  let result = await entriesIter.next();
  assertFalse(result.done);
  assertEquals(result.value.name, "file0");
  assertEquals(result.value.fileSize, 31252);
  assertEquals(result.value.type, "file");
  assertEquals(await result.value.text(), "a".repeat(31252));

  result = await entriesIter.next();
  assertFalse(result.done);
  assertEquals(result.value.name, "file1");
  assertEquals(result.value.fileSize, 1217863);
  assertEquals(result.value.type, "file");
  assertEquals(await result.value.text(), "b".repeat(1217863));

  result = await entriesIter.next();
  assertFalse(result.done);
  assertEquals(result.value.name, "file2");
  assertEquals(result.value.fileSize, 63123);
  assertEquals(result.value.type, "file");
  assertEquals(await result.value.text(), "c".repeat(63123));

  result = await entriesIter.next();
  assert(result.done);
});
