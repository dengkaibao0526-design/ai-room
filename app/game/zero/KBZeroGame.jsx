"use client";

import { useEffect, useRef, useState } from "react";

const MAP = [
  "1111111111111111",
  "1000000000000001",
  "1011000110011001",
  "1000000000000001",
  "1000110001100001",
  "1000000000000001",
  "1010001000010101",
  "1000000000000001",
  "1001100000110001",
  "1000000000000001",
  "1010011001001001",
  "1000000000000001",
  "1000110001100001",
  "1000000000000001",
  "1000000000000001",
  "1111111111111111",
];

const FIXED_DT = 1 / 120;
const PLAYER_RADIUS = 0.22;
const TWO_PI = Math.PI * 2;
const WEAPONS = [
  { id: "VX-01", mode: "AUTO", mag: 30, interval: 0.092, damage: 34, spread: 0.010, adsSpread: 0.0025, recoil: 0.31, pitch: 128 },
  { id: "K-9", mode: "PRECISION", mag: 12, interval: 0.265, damage: 72, spread: 0.0045, adsSpread: 0.0008, recoil: 0.52, pitch: 82 },
];

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const angleDelta = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const wallAt = (x, y) => {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  return iy < 0 || ix < 0 || iy >= MAP.length || ix >= MAP[0].length || MAP[iy][ix] === "1";
};
const canStand = (x, y) => !wallAt(x - PLAYER_RADIUS, y - PLAYER_RADIUS)
  && !wallAt(x + PLAYER_RADIUS, y - PLAYER_RADIUS)
  && !wallAt(x - PLAYER_RADIUS, y + PLAYER_RADIUS)
  && !wallAt(x + PLAYER_RADIUS, y + PLAYER_RADIUS);

function castRay(px, py, angle) {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  let mapX = Math.floor(px);
  let mapY = Math.floor(py);
  const deltaX = Math.abs(1 / (dx || 0.00001));
  const deltaY = Math.abs(1 / (dy || 0.00001));
  const stepX = dx < 0 ? -1 : 1;
  const stepY = dy < 0 ? -1 : 1;
  let sideX = dx < 0 ? (px - mapX) * deltaX : (mapX + 1 - px) * deltaX;
  let sideY = dy < 0 ? (py - mapY) * deltaY : (mapY + 1 - py) * deltaY;
  let side = 0;
  let distance = 24;
  for (let i = 0; i < 64; i += 1) {
    if (sideX < sideY) { sideX += deltaX; mapX += stepX; side = 0; }
    else { sideY += deltaY; mapY += stepY; side = 1; }
    if (mapY < 0 || mapX < 0 || mapY >= MAP.length || mapX >= MAP[0].length || MAP[mapY][mapX] === "1") {
      distance = side === 0 ? sideX - deltaX : sideY - deltaY;
      break;
    }
  }
  return { distance: Math.min(distance, 24), side };
}

function haptic(ms = 16) {
  if (window.XiaoKBAndroid?.haptic) {
    window.XiaoKBAndroid.haptic(ms >= 24 ? "medium" : "light");
    return;
  }
  navigator.vibrate?.(ms);
}

function makeAudio() {
  let ctx = null;
  const get = () => {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  };
  const tone = (frequency, duration, gain, type = "sine", sweep = 0) => {
    const c = get();
    const t = c.currentTime;
    const osc = c.createOscillator();
    const amp = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, t);
    if (sweep) osc.frequency.exponentialRampToValueAtTime(Math.max(20, frequency + sweep), t + duration);
    amp.gain.setValueAtTime(gain, t);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(amp).connect(c.destination);
    osc.start(t);
    osc.stop(t + duration);
  };
  return {
    shot(weapon) {
      tone(weapon.pitch, 0.065, 0.12, "sawtooth", -70);
      tone(weapon.pitch * 2.4, 0.035, 0.045, "square", -120);
    },
    hit(head) { tone(head ? 920 : 560, 0.045, 0.05, "sine", head ? 280 : 80); },
    kill(combo) {
      tone(280 + combo * 18, 0.12, 0.055, "triangle", 420);
      setTimeout(() => tone(620 + combo * 12, 0.10, 0.035, "sine", 260), 45);
    },
    reload() { tone(140, 0.08, 0.035, "triangle", 60); },
    swap() { tone(310, 0.06, 0.035, "sine", 150); },
  };
}

export default function KBZeroGame() {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const [started, setStarted] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [hud, setHud] = useState({ ammo: 30, reserve: 120, hp: 100, score: 0, combo: 0, fps: 0, reloading: false, weapon: 0 });
  const [feed, setFeed] = useState([]);
  const [banner, setBanner] = useState(null);

  useEffect(() => {
    const isMobile = matchMedia("(pointer: coarse)").matches || innerWidth < 760;
    setMobile(isMobile);
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });
    if (!ctx) return undefined;
    const keys = new Set();
    const audio = makeAudio();
    let feedId = 0;

    const state = {
      running: true, started: false, px: 2.5, py: 2.5, angle: 0, pitch: 0,
      vx: 0, vy: 0, recoil: 0, recoilVel: 0, weaponKick: 0, weaponSide: 0,
      bob: 0, muzzle: 0, hitFlash: 0, damageFlash: 0, hp: 100, score: 0,
      combo: 0, comboTimer: 0, fireHeld: false, ads: false, reloadTimer: 0,
      nextShot: 0, now: 0, accumulator: 0, last: performance.now(),
      fpsFrames: 0, fpsClock: performance.now(), fps: 0, weapon: 0,
      ammo: [30, 12], reserve: [120, 48], particles: [], hippos: [],
      enemies: [
        { x: 8.5, y: 2.8, hp: 100, alive: true, phase: 0.2, id: "CORE-01" },
        { x: 12.4, y: 5.6, hp: 100, alive: true, phase: 1.4, id: "CORE-02" },
        { x: 5.6, y: 9.2, hp: 100, alive: true, phase: 2.1, id: "CORE-03" },
        { x: 11.8, y: 12.4, hp: 100, alive: true, phase: 3.5, id: "CORE-04" },
        { x: 3.5, y: 13.0, hp: 100, alive: true, phase: 4.4, id: "CORE-05" },
      ],
      respawns: [], lastHud: 0,
    };
    engineRef.current = state;

    const weapon = () => WEAPONS[state.weapon];
    const burst = (x, y, count, strength = 1) => {
      for (let i = 0; i < count; i += 1) {
        const a = Math.random() * TWO_PI;
        const s = (70 + Math.random() * 250) * strength;
        state.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.35 + Math.random() * 0.5, max: 0.85, size: 1 + Math.random() * 4 });
      }
    };
    const pushFeed = (enemy, head) => {
      const id = ++feedId;
      setFeed((items) => [{ id, text: `${weapon().id}  ${head ? "HEAD FRACTURE" : "CORE FRACTURE"}  ${enemy.id}` }, ...items].slice(0, 4));
      setTimeout(() => setFeed((items) => items.filter((item) => item.id !== id)), 2600);
    };
    const announce = (head) => {
      const text = state.combo >= 3 ? `HIPPO SYNC ×${state.combo}` : head ? "HEAD FRACTURE" : "CORE FRACTURE";
      setBanner({ text, key: performance.now() });
      setTimeout(() => setBanner(null), 850);
    };
    const spawnHippo = (head) => {
      state.hippos.push({
        x: innerWidth * 0.5, y: innerHeight * 0.47,
        vx: (Math.random() - 0.5) * 180, vy: -180 - Math.random() * 120,
        spin: (Math.random() - 0.5) * 8, rot: 0, life: head ? 1.05 : 0.82,
        max: head ? 1.05 : 0.82, scale: head ? 1.55 : 1,
      });
      burst(innerWidth * 0.5, innerHeight * 0.47, head ? 44 : 30, head ? 1.35 : 1);
    };

    function resize() {
      const dpr = Math.min(devicePixelRatio || 1, isMobile ? 1.35 : 1.75);
      canvas.width = Math.max(1, Math.floor(innerWidth * dpr));
      canvas.height = Math.max(1, Math.floor(innerHeight * dpr));
      canvas.style.width = `${innerWidth}px`;
      canvas.style.height = `${innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function beginReload() {
      const w = weapon();
      if (state.reloadTimer > 0 || state.ammo[state.weapon] === w.mag || state.reserve[state.weapon] <= 0) return;
      state.reloadTimer = state.weapon === 0 ? 1.42 : 1.16;
      audio.reload();
      haptic(14);
    }

    function swapWeapon(index = (state.weapon + 1) % WEAPONS.length) {
      if (state.reloadTimer > 0) state.reloadTimer = 0;
      state.weapon = clamp(index, 0, WEAPONS.length - 1);
      state.fireHeld = false;
      state.weaponKick = 0.7;
      audio.swap();
      haptic(12);
    }

    function shoot() {
      const w = weapon();
      if (!state.started || state.reloadTimer > 0 || state.now < state.nextShot) return;
      if (state.ammo[state.weapon] <= 0) { state.nextShot = state.now + 0.16; beginReload(); return; }
      state.nextShot = state.now + w.interval;
      state.ammo[state.weapon] -= 1;
      state.muzzle = 1;
      state.weaponKick = 1;
      state.weaponSide = (Math.random() - 0.5) * (state.weapon ? 0.55 : 0.9);
      state.recoilVel += state.ads ? w.recoil * 0.68 : w.recoil;
      audio.shot(w);
      haptic(state.weapon ? 16 : 10);

      const spread = state.ads ? w.adsSpread : w.spread + Math.hypot(state.vx, state.vy) * 0.0012;
      const shotAngle = state.angle + (Math.random() - 0.5) * spread;
      const wallDist = castRay(state.px, state.py, shotAngle).distance;
      let best = null;
      for (const enemy of state.enemies) {
        if (!enemy.alive) continue;
        const dx = enemy.x - state.px;
        const dy = enemy.y - state.py;
        const dist = Math.hypot(dx, dy);
        if (dist >= wallDist + 0.1) continue;
        const delta = Math.abs(angleDelta(Math.atan2(dy, dx), shotAngle));
        const threshold = Math.atan2(0.34, dist);
        if (delta < threshold && (!best || dist < best.dist)) best = { enemy, dist, delta, threshold };
      }

      if (!best) {
        const impactX = innerWidth * 0.5 + (Math.random() - 0.5) * 14;
        const impactY = innerHeight * 0.5 + (Math.random() - 0.5) * 14;
        burst(impactX, impactY, 7, 0.35);
        return;
      }

      const head = best.delta < best.threshold * (state.ads ? 0.34 : 0.22) && Math.abs(state.pitch) < 0.13;
      best.enemy.hp -= head ? 100 : w.damage;
      state.hitFlash = head ? 1.7 : 1;
      burst(innerWidth * 0.5, innerHeight * 0.5, head ? 18 : 10, head ? 0.8 : 0.5);
      audio.hit(head);
      if (best.enemy.hp <= 0) {
        best.enemy.alive = false;
        state.score += head ? 240 : 110;
        state.combo += 1;
        state.comboTimer = 2.9;
        state.respawns.push({ enemy: best.enemy, time: state.now + 2.4 + Math.random() * 1.5 });
        spawnHippo(head);
        pushFeed(best.enemy, head);
        announce(head);
        audio.kill(state.combo);
        haptic(30);
      } else {
        state.score += head ? 45 : 15;
      }
    }

    function fixedUpdate(dt) {
      if (!state.started) return;
      const forward = (keys.has("KeyW") ? 1 : 0) - (keys.has("KeyS") ? 1 : 0);
      const strafe = (keys.has("KeyD") ? 1 : 0) - (keys.has("KeyA") ? 1 : 0);
      const sprint = (keys.has("ShiftLeft") || keys.has("ShiftRight")) && forward > 0 && !state.ads;
      const speed = sprint ? 5.7 : state.ads ? 2.2 : 3.8;
      const len = Math.hypot(forward, strafe) || 1;
      const tvx = (Math.cos(state.angle) * forward + Math.cos(state.angle + Math.PI / 2) * strafe) / len * speed;
      const tvy = (Math.sin(state.angle) * forward + Math.sin(state.angle + Math.PI / 2) * strafe) / len * speed;
      const accel = forward || strafe ? 18 : 12;
      state.vx += (tvx - state.vx) * Math.min(1, accel * dt);
      state.vy += (tvy - state.vy) * Math.min(1, accel * dt);
      const nx = state.px + state.vx * dt;
      const ny = state.py + state.vy * dt;
      if (canStand(nx, state.py)) state.px = nx; else state.vx *= -0.08;
      if (canStand(state.px, ny)) state.py = ny; else state.vy *= -0.08;
      state.bob += Math.hypot(state.vx, state.vy) * dt * (sprint ? 2.7 : 2.15);

      state.recoilVel += -state.recoil * 42 * dt;
      state.recoilVel *= Math.exp(-12 * dt);
      state.recoil += state.recoilVel * dt;
      state.recoil = clamp(state.recoil, -0.012, 0.14);
      state.weaponKick *= Math.exp(-18 * dt);
      state.weaponSide *= Math.exp(-16 * dt);
      state.muzzle *= Math.exp(-35 * dt);
      state.hitFlash *= Math.exp(-20 * dt);
      state.damageFlash *= Math.exp(-8 * dt);

      if (state.reloadTimer > 0) {
        state.reloadTimer -= dt;
        if (state.reloadTimer <= 0) {
          const w = weapon();
          const need = w.mag - state.ammo[state.weapon];
          const loaded = Math.min(need, state.reserve[state.weapon]);
          state.ammo[state.weapon] += loaded;
          state.reserve[state.weapon] -= loaded;
        }
      }
      if (state.comboTimer > 0) {
        state.comboTimer -= dt;
        if (state.comboTimer <= 0) state.combo = 0;
      }
      if (state.fireHeld) shoot();

      for (const enemy of state.enemies) {
        if (!enemy.alive) continue;
        enemy.phase += dt;
        const dx = state.px - enemy.x;
        const dy = state.py - enemy.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 3.2 && dist < 9.8) {
          const step = 0.54 * dt;
          const ex = enemy.x + dx / dist * step;
          const ey = enemy.y + dy / dist * step;
          if (!wallAt(ex, enemy.y)) enemy.x = ex;
          if (!wallAt(enemy.x, ey)) enemy.y = ey;
        }
        if (dist < 5.8 && Math.sin(enemy.phase * 2.5) > 0.997) {
          state.hp = Math.max(0, state.hp - 8);
          state.damageFlash = 1;
          haptic(20);
          if (state.hp <= 0) {
            state.hp = 100; state.px = 2.5; state.py = 2.5; state.vx = 0; state.vy = 0; state.combo = 0;
          }
        }
      }
      for (let i = state.respawns.length - 1; i >= 0; i -= 1) {
        const item = state.respawns[i];
        if (state.now >= item.time) {
          item.enemy.hp = 100; item.enemy.alive = true; state.respawns.splice(i, 1);
        }
      }
      for (let i = state.particles.length - 1; i >= 0; i -= 1) {
        const p = state.particles[i];
        p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= Math.exp(-3.5 * dt); p.vy *= Math.exp(-3.5 * dt);
        if (p.life <= 0) state.particles.splice(i, 1);
      }
      for (let i = state.hippos.length - 1; i >= 0; i -= 1) {
        const hippo = state.hippos[i];
        hippo.life -= dt; hippo.x += hippo.vx * dt; hippo.y += hippo.vy * dt; hippo.vy += 620 * dt; hippo.rot += hippo.spin * dt;
        if (hippo.life <= 0) state.hippos.splice(i, 1);
      }
    }

    function draw() {
      const w = innerWidth;
      const h = innerHeight;
      const horizon = h * 0.5 + state.pitch * h + state.recoil * h * 1.25;
      const moveSpeed = Math.hypot(state.vx, state.vy);
      const fov = (state.ads ? 0.72 : 1) * Math.PI / 2.9;

      ctx.fillStyle = "#05040a";
      ctx.fillRect(0, 0, w, h);
      const sky = ctx.createLinearGradient(0, 0, 0, horizon);
      sky.addColorStop(0, "#07050f"); sky.addColorStop(0.72, "#141020"); sky.addColorStop(1, "#2a1744");
      ctx.fillStyle = sky; ctx.fillRect(0, 0, w, Math.max(0, horizon));
      const floor = ctx.createLinearGradient(0, horizon, 0, h);
      floor.addColorStop(0, "#181020"); floor.addColorStop(1, "#040406");
      ctx.fillStyle = floor; ctx.fillRect(0, Math.max(0, horizon), w, h - horizon);

      const columns = Math.min(900, Math.max(320, Math.floor(w * 0.72)));
      const columnWidth = w / columns;
      for (let i = 0; i < columns; i += 1) {
        const sx = i * columnWidth;
        const cameraOffset = i / columns - 0.5;
        const angle = state.angle + cameraOffset * fov;
        const ray = castRay(state.px, state.py, angle);
        const corrected = ray.distance * Math.cos(angle - state.angle);
        const wallHeight = Math.min(h * 1.8, h / Math.max(0.08, corrected));
        const top = horizon - wallHeight * 0.5;
        const shade = clamp(1 - corrected / 18, 0.13, 0.95) * (ray.side ? 0.82 : 1);
        const purple = Math.floor(38 + shade * 82);
        ctx.fillStyle = `rgb(${Math.floor(purple * 0.52)},${Math.floor(purple * 0.35)},${purple})`;
        ctx.fillRect(sx, top, columnWidth + 0.8, wallHeight);
      }

      const visible = state.enemies.filter((enemy) => enemy.alive).map((enemy) => {
        const dx = enemy.x - state.px;
        const dy = enemy.y - state.py;
        const distance = Math.hypot(dx, dy);
        const delta = angleDelta(Math.atan2(dy, dx), state.angle);
        return { enemy, distance, delta };
      }).filter(({ delta }) => Math.abs(delta) < fov * 0.65).sort((a, b) => b.distance - a.distance);

      for (const { enemy, distance, delta } of visible) {
        if (castRay(state.px, state.py, state.angle + delta).distance + 0.08 < distance) continue;
        const scale = h / Math.max(0.2, distance);
        const x = w * 0.5 + (delta / fov) * w;
        const y = horizon + Math.sin(state.now * 2 + enemy.phase) * scale * 0.025;
        const radius = scale * 0.24;
        ctx.save(); ctx.translate(x, y);
        const glow = ctx.createRadialGradient(0, 0, radius * 0.08, 0, 0, radius * 1.75);
        glow.addColorStop(0, "rgba(236,220,255,.98)"); glow.addColorStop(0.28, "rgba(164,91,255,.9)"); glow.addColorStop(1, "rgba(95,36,210,0)");
        ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0, 0, radius * 1.75, 0, TWO_PI); ctx.fill();
        ctx.fillStyle = "#7d4cff"; ctx.beginPath(); ctx.arc(0, 0, radius * 0.42, 0, TWO_PI); ctx.fill();
        ctx.restore();
      }

      const bobY = Math.sin(state.bob) * Math.min(7, moveSpeed * 1.35);
      const bobX = Math.cos(state.bob * 0.5) * Math.min(5, moveSpeed * 0.8);
      const ads = state.ads ? 1 : 0;
      const baseGX = state.weapon === 0 ? w * 0.71 : w * 0.68;
      const gunX = baseGX + bobX + ads * (w * 0.5 - baseGX) + state.weaponSide * 8;
      const gunY = h * 0.77 + bobY + state.weaponKick * 16 + ads * 20;
      ctx.save(); ctx.translate(gunX, gunY); ctx.rotate(-0.09 - state.recoil * 0.12);
      const gunGradient = ctx.createLinearGradient(-120, -50, 120, 70);
      gunGradient.addColorStop(0, "#121018"); gunGradient.addColorStop(0.55, state.weapon ? "#1f2c4e" : "#33204d"); gunGradient.addColorStop(1, state.weapon ? "#6aa7ff" : "#8155ef");
      ctx.fillStyle = gunGradient;
      ctx.beginPath();
      if (state.weapon === 0) { ctx.moveTo(-86,42); ctx.lineTo(-40,-22); ctx.lineTo(72,-34); ctx.lineTo(132,-7); ctx.lineTo(108,23); ctx.lineTo(22,34); ctx.lineTo(-22,68); }
      else { ctx.moveTo(-102,38); ctx.lineTo(-54,-18); ctx.lineTo(92,-24); ctx.lineTo(148,-4); ctx.lineTo(118,18); ctx.lineTo(12,29); ctx.lineTo(-28,64); }
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = "rgba(226,211,255,.82)"; ctx.fillRect(18, -23, state.weapon ? 104 : 72, 4);
      ctx.fillStyle = "#07070b"; ctx.fillRect(state.weapon ? 116 : 102, -16, state.weapon ? 70 : 54, 15);
      if (state.muzzle > 0.05) {
        ctx.globalAlpha = clamp(state.muzzle, 0, 1);
        const fx = state.weapon ? 188 : 158;
        const flash = ctx.createRadialGradient(fx, -9, 0, fx, -9, 72);
        flash.addColorStop(0, "#fff"); flash.addColorStop(0.18, "#d9b4ff"); flash.addColorStop(1, "rgba(138,75,255,0)");
        ctx.fillStyle = flash; ctx.beginPath(); ctx.arc(fx, -9, 72, 0, TWO_PI); ctx.fill();
      }
      ctx.restore();

      const cx = w / 2;
      const cy = h / 2;
      const gap = 7 + (state.ads ? 4 : 0) + moveSpeed * 0.8;
      ctx.strokeStyle = state.hitFlash > 0.15 ? "rgba(255,255,255,.98)" : "rgba(221,201,255,.8)";
      ctx.lineWidth = 1.4; ctx.beginPath();
      ctx.moveTo(cx-gap-9,cy); ctx.lineTo(cx-gap,cy); ctx.moveTo(cx+gap,cy); ctx.lineTo(cx+gap+9,cy);
      ctx.moveTo(cx,cy-gap-9); ctx.lineTo(cx,cy-gap); ctx.moveTo(cx,cy+gap); ctx.lineTo(cx,cy+gap+9); ctx.stroke();

      for (const p of state.particles) {
        const alpha = clamp(p.life / p.max, 0, 1);
        ctx.fillStyle = `rgba(190,145,255,${alpha})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * alpha, 0, TWO_PI); ctx.fill();
      }
      for (const hippo of state.hippos) {
        const t = clamp(hippo.life / hippo.max, 0, 1);
        const pop = Math.sin((1 - t) * Math.PI) * 0.42 + 0.72;
        ctx.save(); ctx.translate(hippo.x, hippo.y); ctx.rotate(hippo.rot); ctx.globalAlpha = Math.min(1, t * 2.4);
        ctx.font = `${Math.round(76 * hippo.scale * pop)}px Apple Color Emoji, Segoe UI Emoji, sans-serif`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.shadowBlur = 28; ctx.shadowColor = "rgba(158,91,255,.9)";
        ctx.fillText("🦛", 0, 0);
        ctx.restore();
      }

      if (state.damageFlash > 0.03) {
        ctx.fillStyle = `rgba(160,55,255,${state.damageFlash * 0.12})`; ctx.fillRect(0, 0, w, h);
      }

      state.fpsFrames += 1;
      if (performance.now() - state.fpsClock > 500) {
        state.fps = Math.round(state.fpsFrames * 1000 / (performance.now() - state.fpsClock));
        state.fpsFrames = 0; state.fpsClock = performance.now();
      }
      if (state.now - state.lastHud > 0.08) {
        state.lastHud = state.now;
        setHud({
          ammo: state.ammo[state.weapon], reserve: state.reserve[state.weapon], hp: state.hp,
          score: state.score, combo: state.combo, fps: state.fps, reloading: state.reloadTimer > 0, weapon: state.weapon,
        });
      }
    }

    function onKeyDown(e) {
      keys.add(e.code);
      if (e.code === "KeyR") beginReload();
      if (e.code === "Digit1") swapWeapon(0);
      if (e.code === "Digit2") swapWeapon(1);
      if (e.code === "KeyQ") swapWeapon();
    }
    function onKeyUp(e) { keys.delete(e.code); }
    function onMouseMove(e) {
      if (document.pointerLockElement !== canvas) return;
      const sensitivity = state.ads ? 0.00105 : 0.0017;
      state.angle += e.movementX * sensitivity;
      state.pitch = clamp(state.pitch + e.movementY * sensitivity, -0.19, 0.19);
    }
    function onMouseDown(e) {
      if (!state.started) return;
      if (document.pointerLockElement !== canvas) { canvas.requestPointerLock?.(); return; }
      if (e.button === 0) { state.fireHeld = true; shoot(); }
      if (e.button === 2) state.ads = true;
    }
    function onMouseUp(e) {
      if (e.button === 0) state.fireHeld = false;
      if (e.button === 2) state.ads = false;
    }
    function onBlur() { state.fireHeld = false; state.ads = false; keys.clear(); }
    function onContextMenu(e) { e.preventDefault(); }

    addEventListener("resize", resize);
    addEventListener("keydown", onKeyDown);
    addEventListener("keyup", onKeyUp);
    addEventListener("mousemove", onMouseMove, { passive: true });
    addEventListener("mousedown", onMouseDown);
    addEventListener("mouseup", onMouseUp);
    addEventListener("blur", onBlur);
    canvas.addEventListener("contextmenu", onContextMenu);
    resize();

    function frame(ts) {
      if (!state.running) return;
      const dt = Math.min(0.05, (ts - state.last) / 1000);
      state.last = ts;
      state.now = ts / 1000;
      state.accumulator = Math.min(0.15, state.accumulator + dt);
      while (state.accumulator >= FIXED_DT) {
        fixedUpdate(FIXED_DT);
        state.accumulator -= FIXED_DT;
      }
      draw();
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    return () => {
      state.running = false;
      removeEventListener("resize", resize);
      removeEventListener("keydown", onKeyDown);
      removeEventListener("keyup", onKeyUp);
      removeEventListener("mousemove", onMouseMove);
      removeEventListener("mousedown", onMouseDown);
      removeEventListener("mouseup", onMouseUp);
      removeEventListener("blur", onBlur);
      canvas.removeEventListener("contextmenu", onContextMenu);
      engineRef.current = null;
    };
  }, []);

  function enterGame() {
    const state = engineRef.current;
    if (!state) return;
    state.started = true;
    setStarted(true);
    if (!mobile) canvasRef.current?.requestPointerLock?.();
  }
  function mobileLook(dx, dy) {
    const state = engineRef.current;
    if (!state) return;
    state.angle += dx * 0.0042;
    state.pitch = clamp(state.pitch + dy * 0.003, -0.19, 0.19);
  }
  function setMobileMove(x, y) {
    const state = engineRef.current;
    if (!state) return;
    state.vx += (Math.cos(state.angle) * -y + Math.cos(state.angle + Math.PI / 2) * x) * 0.48;
    state.vy += (Math.sin(state.angle) * -y + Math.sin(state.angle + Math.PI / 2) * x) * 0.48;
  }
  function fireMobile(active) {
    const state = engineRef.current;
    if (!state) return;
    state.fireHeld = active;
  }
  function reloadMobile() {
    const state = engineRef.current;
    if (!state || state.reloadTimer > 0) return;
    const w = WEAPONS[state.weapon];
    if (state.ammo[state.weapon] === w.mag || state.reserve[state.weapon] <= 0) return;
    state.reloadTimer = state.weapon === 0 ? 1.42 : 1.16;
  }
  function swapMobile() {
    const state = engineRef.current;
    if (!state) return;
    state.weapon = (state.weapon + 1) % WEAPONS.length;
    state.fireHeld = false;
  }

  const currentWeapon = WEAPONS[hud.weapon];
  return (
    <main className="zeroShell">
      <canvas ref={canvasRef} className="zeroCanvas" onClick={() => started && !mobile && canvasRef.current?.requestPointerLock?.()} />
      <a className="zeroBack" href="/">← 小KB</a>
      <div className="zeroTopHud"><span>KB // ZERO</span><em>{hud.fps || "—"} FPS</em></div>
      <div className="zeroHealth"><i style={{ width: `${hud.hp}%` }} /><span>{hud.hp}</span></div>
      <div className="zeroScore"><small>SCORE</small><strong>{String(hud.score).padStart(6, "0")}</strong>{hud.combo > 1 && <em>SYNC ×{hud.combo}</em>}</div>
      <div className="zeroKillFeed">{feed.map((item) => <span key={item.id}>{item.text}</span>)}</div>
      {banner && <div key={banner.key} className="zeroBanner">{banner.text}</div>}
      <div className={`zeroAmmo${hud.reloading ? " isReloading" : ""}`}><strong>{hud.ammo}</strong><span>/ {hud.reserve}</span><small>{hud.reloading ? "RECALIBRATING" : `${currentWeapon.id} // ${currentWeapon.mode}`}</small></div>
      <div className="zeroWeaponSlots"><span className={hud.weapon === 0 ? "active" : ""}>1&nbsp; VX-01</span><span className={hud.weapon === 1 ? "active" : ""}>2&nbsp; K-9</span></div>
      {!started && <section className="zeroIntro"><span>KB LAB EXPERIMENT 01</span><h1>KB // ZERO</h1><p>进入失控 Core 训练区。120Hz 战斗更新、双武器、Core 碎裂与隐藏河马击败签名。</p><button type="button" onClick={enterGame}>进入训练场</button><small>{mobile ? "左侧移动 · 右侧视角 · FIRE 开火 · SWAP 换枪" : "WASD 移动 · 鼠标视角 · 左键开火 · 右键开镜 · R 换弹 · 1/2 或 Q 换枪"}</small></section>}
      {started && mobile && <MobileControls onMove={setMobileMove} onLook={mobileLook} onFire={fireMobile} onReload={reloadMobile} onSwap={swapMobile} />}
    </main>
  );
}

function MobileControls({ onMove, onLook, onFire, onReload, onSwap }) {
  const moveState = useRef({ id: null, ox: 0, oy: 0 });
  const lookState = useRef({ id: null, x: 0, y: 0 });
  function moveStart(e) { const t = e.changedTouches[0]; moveState.current = { id: t.identifier, ox: t.clientX, oy: t.clientY }; }
  function moveTouch(e) {
    const s = moveState.current;
    const t = Array.from(e.changedTouches).find((x) => x.identifier === s.id);
    if (!t) return;
    onMove(clamp((t.clientX - s.ox) / 52, -1, 1), clamp((t.clientY - s.oy) / 52, -1, 1));
  }
  function lookStart(e) { const t = e.changedTouches[0]; lookState.current = { id: t.identifier, x: t.clientX, y: t.clientY }; }
  function lookTouch(e) {
    const s = lookState.current;
    const t = Array.from(e.changedTouches).find((x) => x.identifier === s.id);
    if (!t) return;
    onLook(t.clientX - s.x, t.clientY - s.y); s.x = t.clientX; s.y = t.clientY;
  }
  return <div className="zeroMobileControls">
    <div className="zeroMovePad" onTouchStart={moveStart} onTouchMove={moveTouch}><i /></div>
    <div className="zeroLookPad" onTouchStart={lookStart} onTouchMove={lookTouch} />
    <button className="zeroFire" type="button" onTouchStart={() => onFire(true)} onTouchEnd={() => onFire(false)}>FIRE</button>
    <button className="zeroReload" type="button" onClick={onReload}>R</button>
    <button className="zeroSwap" type="button" onClick={onSwap}>SWAP</button>
  </div>;
}
