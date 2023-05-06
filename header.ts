const textDecoder = new TextDecoder();

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
}
