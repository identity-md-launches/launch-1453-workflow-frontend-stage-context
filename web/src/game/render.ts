import type { Effects, Run } from "../lib/types";
export const palette = {
  ink: "#0b141b",
  water: "#102a37",
  waterLight: "#173c49",
  road: "#24313a",
  roadEdge: "#52606a",
  ivory: "#ece8d9",
  charcoal: "#26343b",
  core: "#ff8545",
  cyan: "#6ce0e8",
  magenta: "#c56aa8",
  red: "#ff5a68",
  amber: "#e5b57b",
};
const poly = (
  c: CanvasRenderingContext2D,
  points: number[],
  fill: string,
  stroke?: string,
  width = 1,
) => {
  c.beginPath();
  c.moveTo(points[0], points[1]);
  for (let i = 2; i < points.length; i += 2) c.lineTo(points[i], points[i + 1]);
  c.closePath();
  c.fillStyle = fill;
  c.fill();
  if (stroke) {
    c.strokeStyle = stroke;
    c.lineWidth = width;
    c.stroke();
  }
};
const rect = (
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
) => {
  c.fillStyle = fill;
  c.fillRect(x, y, w, h);
};
const line = (
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  x2: number,
  y2: number,
  color: string,
  width = 1,
) => {
  c.strokeStyle = color;
  c.lineWidth = width;
  c.beginPath();
  c.moveTo(x, y);
  c.lineTo(x2, y2);
  c.stroke();
};
const glow = (
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
) => {
  const grad = c.createRadialGradient(x, y, 0, x, y, radius);
  grad.addColorStop(0, color);
  grad.addColorStop(1, `${color.slice(0, 7)}00`);
  c.fillStyle = grad;
  c.fillRect(x - radius, y - radius, radius * 2, radius * 2);
};
export function rig(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale = 1,
  bank = 0,
  time = 0,
  effects = true,
  damaged = false,
  corePulse = 0,
) {
  c.save();
  c.translate(x, y);
  c.scale(scale, scale);
  c.transform(1, bank * 0.05, bank * 0.11, 1, 0, 0);
  // The silhouette is shared by the playable rig, title scene and cover.
  poly(
    c,
    [-28, -16, -14, -36, 14, -36, 28, -16, 29, 26, 16, 34, -16, 34, -29, 26],
    "#06101670",
  );
  c.translate(0, -5);
  if (effects) {
    glow(c, -20, 33, 25, "#63dfed66");
    glow(c, 20, 33, 25, "#63dfed66");
  }
  const tail = effects ? 12 + (Math.sin(time * 32) + 1) * 7 : 10;
  poly(c, [-24, 25, -16, 25, -19, 40 + tail, -21, 37 + tail], palette.cyan);
  poly(c, [16, 25, 24, 25, 21, 40 + tail, 19, 37 + tail], palette.cyan);
  poly(
    c,
    [-28, -12, -21, -26, -15, -19, -15, 29, -25, 26, -29, 12],
    "#151f27",
    "#7b8584",
    1,
  );
  poly(
    c,
    [28, -12, 21, -26, 15, -19, 15, 29, 25, 26, 29, 12],
    "#151f27",
    "#7b8584",
    1,
  );
  rect(c, -27, -6, 9, 15, "#8d9692");
  rect(c, 18, -6, 9, 15, "#8d9692");
  line(c, -24, -4, -24, 8, palette.ivory, 2);
  line(c, 24, -4, 24, 8, palette.ivory, 2);
  poly(
    c,
    [-18, -24, -10, -35, 10, -35, 18, -24, 17, 23, 10, 31, -10, 31, -17, 23],
    damaged ? "#ffabb1" : palette.ivory,
    "#fcf8e8",
    0.8,
  );
  poly(c, [-11, -23, 11, -23, 13, -7, -13, -7], "#0f222e");
  poly(c, [-9, -20, 8, -20, 10, -10, -11, -10], "#28505d");
  line(c, -9, -20, 8, -20, "#99c3c5", 1);
  rect(c, -11, -3, 22, 24, palette.charcoal);
  poly(c, [-7, 0, 7, 0, 9, 14, 4, 19, -4, 19, -9, 14], palette.core);
  poly(c, [-4, 1, 4, 1, 5, 12, -5, 12], "#ffd29b");
  line(c, -11, 23, 11, 23, "#465053", 2);
  line(c, -15, -26, -12, -30, palette.cyan, 2);
  line(c, 15, -26, 12, -30, palette.cyan, 2);
  rect(c, -12, 25, 5, 4, palette.red);
  rect(c, 7, 25, 5, 4, palette.red);
  if (effects)
    glow(
      c,
      0,
      10,
      21 + corePulse * 20,
      corePulse > 0 ? "#ff854588" : "#ff854533",
    );
  c.restore();
}
export function drone(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale = 1,
  time = 0,
  effects = true,
) {
  c.save();
  c.translate(x, y);
  c.scale(scale, scale);
  poly(
    c,
    [
      -24, -11, -13, -23, 0, -14, 13, -23, 24, -11, 17, 11, 6, 23, -6, 23, -17,
      11,
    ],
    "#06121b",
    "#72858a",
    1.2,
  );
  poly(c, [-24, -11, -8, -5, -11, 13, -17, 11], "#283a45");
  poly(c, [24, -11, 8, -5, 11, 13, 17, 11], "#283a45");
  poly(c, [-6, -13, 6, -13, 11, 7, 0, 16, -11, 7], "#14212a", "#546675", 0.8);
  rect(c, -18, -5, 9, 4, palette.red);
  rect(c, 9, -5, 9, 4, palette.red);
  line(c, 0, 9, 0, 16, "#ffa0a6", 3);
  line(c, -14, -18, -10, -14, palette.ivory, 1);
  line(c, 14, -18, 10, -14, palette.ivory, 1);
  if (effects) {
    glow(c, -15, -2, 11, "#ff52683b");
    glow(c, 15, -2, 11, "#ff52683b");
  }
  c.globalAlpha = 0.6;
  line(c, -17, -25, -17, -31 - Math.sin(time * 15) * 3, palette.red, 2);
  line(c, 17, -25, 17, -31 - Math.sin(time * 15) * 3, palette.red, 2);
  c.restore();
}
function building(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  seed: number,
  stage: number,
) {
  rect(c, x + 15, y + 20, w, h, "#050f1680");
  poly(
    c,
    [
      x,
      y,
      x + w,
      y,
      x + w + 12,
      y + 12,
      x + w + 12,
      y + h + 12,
      x + 12,
      y + h + 12,
      x,
      y + h,
    ],
    "#15252f",
    "#2a424c",
  );
  rect(c, x, y, w, h, "#1d303b");
  rect(c, x + 6, y + 6, w - 12, h - 12, "#142730");
  for (let row = 0; row < 5; row++)
    for (let col = 0; col < Math.floor(w / 14) - 1; col++) {
      if ((row * 7 + col * 3 + seed) % 4 === 0)
        rect(
          c,
          x + 13 + col * 14,
          y + 15 + row * 22,
          5,
          9,
          stage === 1 ? "#926281" : "#6d7973",
        );
    }
  rect(c, x + w * 0.25, y + h * 0.44, w * 0.43, h * 0.27, "#253b43");
  line(c, x + 5, y + 5, x + w - 5, y + 5, "#4e6870", 2);
  if (seed % 3 === 0) {
    const col = stage === 1 ? palette.magenta : palette.cyan;
    rect(c, x + w - 8, y + 12, 7, h - 24, col);
    rect(c, x + w + 7, y + 17, 4, h - 20, `${col}22`);
  }
}
export function district(
  c: CanvasRenderingContext2D,
  time: number,
  stage: number,
  effects: Effects,
  bounds = { left: -1000, right: 2000, top: -200, bottom: 1500 },
) {
  const t = effects.motion ? time : 0,
    scroll = t * (stage === 2 ? 220 : 175);
  rect(
    c,
    bounds.left,
    bounds.top,
    bounds.right - bounds.left,
    bounds.bottom - bounds.top,
    palette.water,
  );
  for (let i = 0; i < 40; i++) {
    const y = ((i * 53 + scroll * 0.35) % 1700) - 300;
    const x =
      bounds.left + ((i * 277) % Math.max(1, bounds.right - bounds.left));
    line(c, x, y, x + 40 + (i % 5) * 16, y, "#37607435", 2);
  }
  // Road deck: the surface is decoration; only drones cause damage.
  rect(c, -49, bounds.top + 22, 1100, bounds.bottom - bounds.top, "#030c1599");
  rect(c, -26, bounds.top, 1052, bounds.bottom - bounds.top, "#50606a");
  rect(c, -13, bounds.top, 1026, bounds.bottom - bounds.top, palette.road);
  rect(
    c,
    3,
    bounds.top,
    994,
    bounds.bottom - bounds.top,
    stage === 1 ? "#27313d" : stage === 2 ? "#28383c" : "#26353c",
  );
  for (let i = -2; i < 13; i++) {
    const y = i * 140 + (scroll % 140);
    line(c, 10, y, 990, y, "#71828a1f");
    rect(c, 15, y + 6, 12, 56, "#52636b");
    rect(c, 973, y + 6, 12, 56, "#52636b");
    for (let lane = 1; lane < 4; lane++)
      rect(c, lane * 250 - 2, y + 8, 4, 56, "#98a7a04a");
    line(c, -22, y - 10, -22, y + 65, "#b9c2b2", 3);
    line(c, 1022, y - 10, 1022, y + 65, "#b9c2b2", 3);
    if (!effects.reduced) {
      line(c, 120, y + 74, 210, y + 74, "#ffffff05", 30);
      line(c, 625, y + 115, 730, y + 115, "#6ce0e80b", 18);
    }
    if (i % 2 === 0) {
      for (const x of [-43, 1043]) {
        rect(c, x - 6, y, 12, 70, "#3d535c");
        rect(c, x - 4, y, 8, 12, palette.amber);
        if (!effects.reduced) glow(c, x, y + 8, 55, "#e5b57b18");
        line(c, x, y + 40, x + (x < 0 ? -35 : 35), y + 40, "#304950", 8);
      }
    }
  }
  for (let i = -1; i < 7; i++) {
    const y = i * 260 + ((scroll * 0.65) % 260);
    building(c, -270 - (i % 2) * 50, y, 145 + (i % 2) * 30, 180, i + 10, stage);
    building(c, 1150 + (i % 2) * 90, y + 50, 130, 140, i + 7, stage);
    for (let r = 0; r < 5; r++) {
      rect(c, -250 + r * 22, y + 190 + r * 5, 7, 30 + r * 5, "#67d1d51a");
      rect(c, 1170 + r * 22, y + 210 + r * 4, 6, 45, "#d273b720");
    }
    if (stage === 1 && i % 2 === 0) {
      c.save();
      c.translate(i % 4 === 0 ? -173 : 1090, y + 20);
      c.rotate(i % 4 === 0 ? -0.02 : 0.02);
      rect(c, -24, -9, 98, 66, "#071721");
      rect(c, -19, -4, 88, 56, "#462943");
      c.fillStyle = "#e6a9cf";
      c.font = '600 14px "Barlow Condensed", sans-serif';
      c.textAlign = "center";
      c.fillText("NEON", 25, 20);
      c.fillText("HARBOR", 25, 37);
      c.restore();
    }
  }
  if (stage === 1) {
    for (let i = -1; i < 7; i++) {
      const y = i * 245 + ((scroll * 0.65) % 245);
      building(c, -126, y, 85, 195, i + 30, stage);
      building(c, 1041, y + 95, 85, 190, i + 33, stage);
    }
  }
  // An elevated train passes behind the roadway, never over threats.
  if (!effects.reduced) {
    const trainY = ((t * 65) % 1800) - 300;
    for (let i = 0; i < 5; i++) {
      rect(c, -430, trainY + i * 92, 50, 80, "#728886");
      rect(c, -422, trainY + 7 + i * 92, 34, 54, "#233d48");
      rect(c, -419, trainY + 11 + i * 92, 28, 5, palette.amber);
    }
    for (let i = 0; i < 22; i++) {
      const x = ((i * 127) % 1800) - 350,
        y = ((i * 73 + scroll * 0.75) % 1400) - 150;
      line(c, x, y, x - 8, y + 27, "#c9e3e416");
    }
  }
  if (stage === 2) {
    for (let i = 0; i < 5; i++) {
      const y = i * 280 + (scroll % 280);
      line(c, -80, y, 0, y + 35, palette.cyan, 3);
      line(c, 1080, y, 1000, y + 35, palette.cyan, 3);
    }
  }
}
export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  kind: "shard" | "core";
};
export class SceneRenderer {
  particles: Particle[] = [];
  lastScore = 0;
  lastHp = 3;
  lastX = 500;
  bank = 0;
  hitAt = -10;
  scoreAt = -10;
  observe(before: Run, after: Run, t: number, reduced: boolean) {
    if (after.score > before.score) {
      this.scoreAt = t;
      for (const enemy of before.enemies.filter((e) => e.hit))
        this.burst(enemy.x, enemy.y, t, reduced);
    }
    if (after.hp < before.hp) {
      this.hitAt = t;
      this.burst(after.x, after.y, t, reduced, true);
    }
    this.bank +=
      (Math.max(-1, Math.min(1, (after.x - before.x) / 8)) - this.bank) * 0.6;
    this.lastScore = after.score;
    this.lastHp = after.hp;
    this.lastX = before.x;
  }
  burst(x: number, y: number, t: number, reduced: boolean, damage = false) {
    for (let i = 0; i < (reduced ? 3 : 13); i++) {
      const a = i * 2.399 + t;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * (45 + i * 9),
        vy: Math.sin(a) * (45 + i * 9),
        life: 0.45 + (i % 3) * 0.12,
        max: 0.7,
        color: damage ? palette.red : i % 3 === 0 ? palette.cyan : palette.core,
        kind: "shard",
      });
    }
    if (!damage)
      this.particles.push({
        x,
        y,
        vx: 0,
        vy: 0,
        life: 0.65,
        max: 0.65,
        color: palette.core,
        kind: "core",
      });
    this.particles = this.particles.slice(-100);
  }
  draw(
    c: CanvasRenderingContext2D,
    w: number,
    h: number,
    run: Run,
    t: number,
    dt: number,
    effects: Effects,
    alpha = 1,
    previous?: Run,
  ) {
    c.clearRect(0, 0, w, h);
    const scale = Math.min(w / 1200, h / 1000),
      ox = (w - 1000 * scale) / 2,
      oy = (h - 1000 * scale) / 2;
    c.save();
    c.translate(ox, oy);
    c.scale(scale, scale);
    const stage = Math.min(2, Math.floor(run.tick / 600));
    district(c, run.tick / 30, stage, effects, {
      left: -ox / scale,
      right: (w - ox) / scale,
      top: -oy / scale,
      bottom: (h - oy) / scale,
    });
    // Interpolation never changes the verified collision state.
    for (const shot of run.shots) {
      const y = shot.y + (1 - alpha) * 24;
      rect(c, shot.x - 3, y - 11, 6, 24, palette.cyan);
      rect(c, shot.x - 1, y - 12, 2, 18, "#f2fff7");
    }
    for (const e of run.enemies)
      drone(c, e.x, e.y - e.speed * (1 - alpha), 1, t, !effects.reduced);
    const x = previous ? previous.x + (run.x - previous.x) * alpha : run.x,
      y = previous ? previous.y + (run.y - previous.y) * alpha : run.y;
    const damage = t - this.hitAt < 0.16;
    if (run.invulnerable) {
      c.strokeStyle = palette.cyan;
      c.lineWidth = 3;
      c.beginPath();
      c.arc(
        x,
        y,
        43,
        -Math.PI / 2,
        -Math.PI / 2 + (Math.PI * 2 * run.invulnerable) / 45,
      );
      c.stroke();
      c.globalAlpha = effects.reduced ? 1 : 0.64 + Math.sin(t * 18) * 0.2;
    }
    rig(
      c,
      x,
      y,
      1,
      effects.motion ? this.bank : 0,
      t,
      !effects.reduced,
      damage,
      Math.max(0, 1 - (t - this.scoreAt) / 0.3),
    );
    c.globalAlpha = 1;
    for (const p of this.particles) {
      p.life -= dt;
      if (p.life <= 0) continue;
      c.globalAlpha = Math.min(1, p.life / 0.22);
      if (p.kind === "core") {
        const f = 1 - p.life / p.max,
          px = p.x + (950 - p.x) * f * f,
          py = p.y + (0 - p.y) * f;
        poly(c, [px, py - 8, px + 6, py, px, py + 8, px - 6, py], p.color);
      } else {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        poly(c, [p.x, p.y - 4, p.x + 3, p.y + 2, p.x - 3, p.y + 4], p.color);
      }
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    c.globalAlpha = 1;
    c.restore();
  }
}
export function drawHero(
  c: CanvasRenderingContext2D,
  w: number,
  h: number,
  time: number,
  motion = true,
  mode: "hero" | "cover" | "result" = "hero",
) {
  c.clearRect(0, 0, w, h);
  rect(c, 0, 0, w, h, palette.ink);
  const scale = Math.max(w / 1400, h / 740);
  c.save();
  c.translate((w - 1400 * scale) * 0.8, (h - 740 * scale) * 0.5);
  c.scale(scale, scale);
  c.save();
  c.translate(980, 350);
  c.rotate(-0.38);
  c.scale(0.68, 0.68);
  c.translate(-500, -500);
  district(
    c,
    time,
    mode === "result" ? 2 : 0,
    { motion, reduced: false, muted: true },
    { left: -2000, right: 2400, top: -1500, bottom: 2200 },
  );
  for (let i = 0; i < 20; i++) {
    const x = ((i * 83) % 1400) - 200,
      y = ((i * 193 + time * (motion ? 450 : 0)) % 1900) - 350;
    line(c, x, y, x, y + 80 + i * 2, "#d0f1eb16", 2);
  }
  // Broader art direction uses precisely the same rig and drone shapes as play.
  glow(c, 560, 610, 220, "#ff854538");
  for (let i = 0; i < 9; i++)
    line(
      c,
      482 + i * 18,
      645 + (i % 3) * 10,
      480 + i * 18,
      790 + i * 9,
      "#ff854518",
      9,
    );
  rig(c, 535, 540, 3.8, -0.45, time, true);
  if (mode !== "result") {
    drone(c, 170, 220, 2.55, time);
    drone(c, 820, 680, 2.6, time);
    drone(c, 700, -40, 1.8, time);
  } else {
    line(c, 140, 160, 860, 160, palette.cyan, 8);
    line(c, 140, 160, 140, 300, palette.cyan, 8);
    line(c, 860, 160, 860, 300, palette.cyan, 8);
  }
  line(c, 534, 210, 534, 265, palette.cyan, 7);
  line(c, 534, 120, 534, 154, palette.cyan, 5);
  c.restore();
  const g = c.createLinearGradient(0, 0, 1400, 0);
  g.addColorStop(0, "#0b141b");
  g.addColorStop(0.25, "#0b141bf7");
  g.addColorStop(0.49, "#0b141b70");
  g.addColorStop(0.7, "#0b141b00");
  c.fillStyle = g;
  c.fillRect(0, 0, 1400, 740);
  const shade = c.createLinearGradient(0, 0, 0, 740);
  shade.addColorStop(0, "#0b141b00");
  shade.addColorStop(0.68, "#0b141b00");
  shade.addColorStop(1, "#0b141bf2");
  c.fillStyle = shade;
  c.fillRect(0, 0, 1400, 740);
  if (mode === "cover") {
    c.fillStyle = palette.core;
    c.font = '600 23px "DM Sans", sans-serif';
    c.fillText("NEON HARBOR / AFTER DARK", 70, 116);
    c.save();
    c.translate(65, 0);
    c.transform(1, 0, -0.065, 1, 0, 0);
    c.fillStyle = palette.ivory;
    c.font = '800 152px "Barlow Condensed", sans-serif';
    c.fillText("SKYLINE", 0, 289);
    c.fillText("HEIST", 0, 419);
    rect(c, 7, 440, 340, 8, palette.core);
    c.restore();
    c.fillStyle = palette.ivory;
    c.font = '600 23px "DM Sans", sans-serif';
    c.fillText("SIXTY SECONDS. ONE WAY OUT.", 72, 520);
    c.strokeStyle = "#61727a";
    c.lineWidth = 1;
    c.strokeRect(22, 22, 1356, 696);
  }
  c.restore();
}
