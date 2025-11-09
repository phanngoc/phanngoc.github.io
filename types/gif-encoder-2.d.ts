declare module 'gif-encoder-2' {
  import { Readable } from 'stream';
  
  export default class GIFEncoder {
    constructor(width: number, height: number);
    setRepeat(repeat: number): void;
    setDelay(delay: number): void;
    setQuality(quality: number): void;
    setTransparent(color: number | null): void;
    addFrame(ctx: any): void;
    finish(): void;
    start(): void;
    createReadStream(): Readable;
    out: {
      getData(): Buffer;
    };
  }
}

