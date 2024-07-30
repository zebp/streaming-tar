import { Deferred } from "./deferred.ts";
import { EntryImpl } from "./entry.ts";
import { FileType, Header } from "./header.ts";

const initialChecksum = 8 * 32;

function computeChecksum(bytes: Uint8Array): number {
  let sum = initialChecksum;
  for (let i = 0; i < 512; i++) {
    if (i >= 148 && i < 156) {
      // Ignore checksum header
      continue;
    }
    sum += bytes[i];
  }
  return sum;
}

/**
 * A file in a Tar archive.
 */
export interface TarEntry {
  /**
   * The name of the file.
   */
  readonly name: string;
  /**
   * The size of the file in bytes.
   */
  readonly fileSize: number;
  /**
   * The type of file archived.
   */
  readonly type: FileType;
  /**
   * The contents of the file.
   */
  readonly body: ReadableStream<Uint8Array>;
  /**
   * Whether the body has been read or partially read.
   */
  readonly bodyUsed: boolean;
  /**
   * Skips the body of the file.
   */
  skip(): Promise<void>;
  /**
   * Reads the body of the file as an {@link ArrayBuffer}.
   */
  arrayBuffer(): Promise<ArrayBuffer>;
  /**
   * Reads the contents of the file and parses it as JSON.
   *
   * @param encoding The text encoding to use. Defaults to `"utf-8"`.
   */
  json<T>(encoding?: string): Promise<T>;
  /**
   * Reads the contents of the file as text.
   *
   * @param encoding The text encoding to use. Defaults to `"utf-8"`.
   */
  text(encoding?: string): Promise<string>;
}

/**
 * Iterates over files in a Tar archive.
 *
 * @param tarStream A stream of bytes containing a Tar archive.
 * @returns An async iterable of Tar entries.
 */
export async function* entries(
  tarStream: ReadableStream<Uint8Array>,
): AsyncIterable<TarEntry> {
  const reader = tarStream.getReader();
  const headerBytes = new Uint8Array(512);

  let headerBytesRead = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    let chunk = value!;

    while (chunk.length > 0) {
      const remainingHeaderBytes = 512 - headerBytesRead;
      const headerChunk = chunk.slice(0, remainingHeaderBytes);
      chunk = chunk.slice(remainingHeaderBytes);

      headerBytes.set(headerChunk, headerBytesRead);
      headerBytesRead += headerChunk.length;

      if (headerBytesRead === 512) {
        const header = new Header(headerBytes);

        if (computeChecksum(headerBytes) !== header.checksum) {
          return;
        }

        const { resolve, promise } = new Deferred<Uint8Array>();
        yield new EntryImpl(header, reader, chunk, resolve);

        if (header.fileSize > 0) {
          chunk = await promise;
        }

        headerBytesRead = 0;
      }
    }
  }
}
