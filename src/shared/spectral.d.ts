// Types of spectral.js (MIT, Ronald van Wijnen): Kubelka-Munk pigment mixing; the package ships none.
declare module 'spectral.js' {
  export class Color {
    constructor(color: string | [number, number, number]);
    toString(): string;
  }
  export function mix(...colors: [Color, number][]): Color;
  export function palette(a: Color, b: Color, size: number): Color[];
}
