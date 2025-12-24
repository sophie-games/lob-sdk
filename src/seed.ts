class Xorshift32 {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed >>> 0;
  }

  private next(): number {
    let x = this.seed;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.seed = x >>> 0;
    return this.seed;
  }

  random(): number {
    return this.next() / 0x100000000;
  }
}

export const randomSeeded = (seed: number) => {
  const xorshift = new Xorshift32(seed);
  return () => xorshift.random();
};

export function generateRandomSeed(): number {
  const maxSeedValue = 0xffffffff; // 32-bit unsigned integer maximum value
  return Math.floor(Math.random() * maxSeedValue);
}

export function deriveSeed(baseSeed: number, index: number): number {
  const xorshift = new Xorshift32(baseSeed);

  // Advance the generator 'index' times to get the derived seed
  for (let i = 0; i < index; i++) {
    xorshift.random();
  }

  // Return the derived seed
  return Math.floor(xorshift.random() * 0xffffffff); // Adjust the range as needed
}
