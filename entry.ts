import { FileType, Header } from "./header.ts";

export class EntryImpl {
  #header;
  #reader: ReadableStreamDefaultReader<Uint8Array>;
  #whenDone;

  #buffered: Uint8Array | undefined;

  bodyUsed = false;

  constructor(
    header: Header,
    reader: ReadableStreamDefaultReader<Uint8Array>,
    buffered: Uint8Array,
    whenDone: (
      remaining: Uint8Array,
    ) => void,
  ) {
    this.#header = header;
    this.#reader = reader;
    this.#whenDone = whenDone;
    this.#buffered = buffered.length > 0 ? buffered : undefined;
  }

  get name(): string {
    return this.#header.name;
  }

  get fileSize(): number {
    return this.#header.fileSize;
  }

  get type(): FileType {
    return this.#header.type;
  }

  get #withinEntry(): ReadableStream<Uint8Array> {
    let remaining = Math.ceil(this.#header.fileSize / 512) * 512;

    return new ReadableStream({
      start: () => {
        if (this.bodyUsed) {
          throw new Error("Body already used");
        }

        this.bodyUsed = true;
      },
      pull: async (controller) => {
        if (remaining === 0) {
          controller.close();
          return;
        }

        let chunk: Uint8Array;

        if (this.#buffered) {
          chunk = this.#buffered;
          this.#buffered = undefined;
        } else {
          const result = await this.#reader.read();
          if (result.done) {
            controller.error(new Error("Unexpected end of stream"));
            return;
          }

          chunk = result.value;
        }

        const chunkWithinEntry = Math.min(remaining, chunk.length);
        controller.enqueue(chunk.slice(0, chunkWithinEntry));
        remaining -= chunkWithinEntry;

        if (remaining === 0) {
          this.#whenDone(chunk.slice(chunkWithinEntry));
          controller.close();
        }
      },
    });
  }

  get body(): ReadableStream<Uint8Array> {
    let remaining = this.#header.fileSize;
    const reader = this.#withinEntry.getReader();

    return new ReadableStream({
      pull: async (controller) => {
        if (remaining === 0) {
          controller.close();
          return;
        }

        const result = await reader.read();
        if (result.done) {
          controller.error(new Error("Unexpected end of stream"));
          return;
        }

        const chunk = result.value;
        const chunkWithinEntry = Math.min(remaining, chunk.length);
        controller.enqueue(chunk.slice(0, chunkWithinEntry));
        remaining -= chunkWithinEntry;

        if (remaining === 0) {
          // We've read the entirety of the file, but we still need to read until the next header.
          // deno-lint-ignore no-empty
          while (!(await reader.read()).done) {}

          controller.close();
        }
      },
    });
  }

  async skip() {
    const reader = this.#withinEntry.getReader();
    // deno-lint-ignore no-empty
    while (!(await reader.read()).done) {}
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    const reader = this.body.getReader();
    const buffer = new Uint8Array(this.#header.fileSize);
    let offset = 0;

    while (offset < buffer.length) {
      const result = await reader.read();
      if (result.done) {
        throw new Error("Unexpected end of stream");
      }

      buffer.set(result.value, offset);
      offset += result.value.length;
    }

    return buffer.buffer;
  }

  async json<T>(encoding = "utf-8"): Promise<T> {
    const text = await this.text(encoding);
    return JSON.parse(text);
  }

  async text(encoding = "utf-8"): Promise<string> {
    const bytes = await this.arrayBuffer();
    return new TextDecoder(encoding).decode(bytes);
  }
}
