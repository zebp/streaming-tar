export class Deferred<T> {
  promise: Promise<T>;
  resolve!: (value: T) => void;

  constructor() {
    this.promise = new Promise((r) => this.resolve = r);
  }
}
