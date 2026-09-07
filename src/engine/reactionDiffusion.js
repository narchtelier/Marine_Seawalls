/**
 * 2D Turing Gray-Scott Reaction-Diffusion Solver for Meandroid Brain Coral Valleys
 *
 * du/dt = Du * lap(u) - u*v^2 + F*(1 - u)
 * dv/dt = Dv * lap(v) + u*v^2 - (F + k)*v
 */

export class GrayScottSolver {
  constructor(size = 128, feed = 0.035, kill = 0.065, Du = 0.16, Dv = 0.08) {
    this.size = size;
    this.feed = feed;
    this.kill = kill;
    this.Du = Du;
    this.Dv = Dv;

    this.u = new Float32Array(size * size);
    this.v = new Float32Array(size * size);
    this.uNext = new Float32Array(size * size);
    this.vNext = new Float32Array(size * size);

    this.reset();
  }

  reset() {
    const { size, u, v } = this;
    u.fill(1.0);
    v.fill(0.0);

    // Seed multiple organic meander spots
    const center = Math.floor(size / 2);
    for (let i = 0; i < 8; i++) {
      const sx = Math.floor(center + (Math.random() - 0.5) * (size * 0.5));
      const sy = Math.floor(center + (Math.random() - 0.5) * (size * 0.5));
      const r = Math.floor(size * 0.08);

      for (let y = sy - r; y <= sy + r; y++) {
        for (let x = sx - r; x <= sx + r; x++) {
          if (x >= 0 && x < size && y >= 0 && y < size) {
            const idx = y * size + x;
            v[idx] = 1.0;
            u[idx] = 0.5;
          }
        }
      }
    }
  }

  step(iterations = 8) {
    const { size, feed, kill, Du, Dv, u, v, uNext, vNext } = this;

    for (let it = 0; it < iterations; it++) {
      for (let y = 0; y < size; y++) {
        const ym = ((y - 1 + size) % size) * size;
        const y0 = y * size;
        const yp = ((y + 1) % size) * size;

        for (let x = 0; x < size; x++) {
          const xm = (x - 1 + size) % size;
          const xp = (x + 1) % size;
          const idx = y0 + x;

          // 9-point discrete 2D Laplacian operator
          const lapU =
            0.05 * (u[ym + xm] + u[ym + xp] + u[yp + xm] + u[yp + xp]) +
            0.20 * (u[ym + x] + u[yp + x] + u[y0 + xm] + u[y0 + xp]) -
            1.00 * u[idx];

          const lapV =
            0.05 * (v[ym + xm] + v[ym + xp] + v[yp + xm] + v[yp + xp]) +
            0.20 * (v[ym + x] + v[yp + x] + v[y0 + xm] + v[y0 + xp]) -
            1.00 * v[idx];

          const uvv = u[idx] * v[idx] * v[idx];
          uNext[idx] = Math.max(0, Math.min(1, u[idx] + (Du * lapU - uvv + feed * (1.0 - u[idx]))));
          vNext[idx] = Math.max(0, Math.min(1, v[idx] + (Dv * lapV + uvv - (feed + kill) * v[idx])));
        }
      }

      u.set(uNext);
      v.set(vNext);
    }
  }

  sample(uCoord, vCoord) {
    const x = Math.floor(((uCoord % 1.0 + 1.0) % 1.0) * this.size);
    const y = Math.floor(((vCoord % 1.0 + 1.0) % 1.0) * this.size);
    return this.v[y * this.size + x];
  }
}
