const textDecoder = new TextDecoder();

enum FileTypes {
  "file" = 0,
  "link" = 1,
  "symlink" = 2,
  "character-device" = 3,
  "block-device" = 4,
  "directory" = 5,
  "fifo" = 6,
  "contiguous-file" = 7,
}

export type FileType = keyof typeof FileTypes;

export class Header {
  #data: Uint8Array;

  constructor(data: Uint8Array) {
    this.#data = data;
  }

  get name(): string {
    const rawBytes = this.#data.slice(0, 100);

    let lastNonNul = 0;

    for (let i = 0; i < rawBytes.length; i++) {
      if (rawBytes[i] !== 0) {
        lastNonNul = i;
      } else {
        break;
      }
    }

    return textDecoder.decode(rawBytes.slice(0, lastNonNul + 1));
  }

  get fileSize(): number {
    const sizeBytes = this.#data.slice(124, 136);
    return parseInt(textDecoder.decode(sizeBytes), 8);
  }

  get checksum(): number {
    const checksumBytes = this.#data.slice(148, 156);
    return parseInt(textDecoder.decode(checksumBytes), 8);
  }

  get type(): FileType {
    const typeBytes = this.#data.slice(156, 157);
    const typeCode = parseInt(textDecoder.decode(typeBytes), 10);
    return FileTypes[typeCode] as FileType;
  }
}
