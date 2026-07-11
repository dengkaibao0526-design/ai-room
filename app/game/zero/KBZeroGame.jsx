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

const FOV = Math.PI / 2.9;
const MAX_DIST = 24;
const FIXED_DT = 1 / 120;
const PLAYER_RADIUS = 0.22;
const MAG_SIZE = 30;

function wallAt(x, y) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  return iy < 0 || ix < 0 || iy >= MAP.length || ix >= MAP[0].length || MAP[iy][ix] === "1";
}

function canStand(x, y) {
  return !wallAt(x - PLAYER_RADIUS, y - PLAYER_RADIUS)
    && !wallAt(x + PLAYER_RADIUS, y - PLAYER_RADIUS)
    && !wallAt(x - PLAYER_RADIUS, y + PLAYER_RADIUS)
    && !wallAt(x + PLAYER_RADIUS, y + PLAYER_RADIUS);
}

function angleDelta(a, b) {
  return Math.atan2(Math.sin(a - b), Math.cos(a - b));
}

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
  let distance = 0;

  for (let i = 0; i < 64; i += 1) {
    if (sideX < sideY) {
      sideX += deltaX;
      mapX += stepX;
      side = 0;
    } else {
      sideY += deltaY;
      mapY += stepY;
      side = 1;
    }
    if (mapY < 0 || mapX < 0 || mapY >= MAP.length || mapX >= MAP[0].length || MAP[mapY][mapX] === "1") {
      distance = side === 0 ? sideX - deltaX : sideY - deltaY;
      break;
    }
  }

  const hitX = px + dx * distance;
  const hitY = py + dy * distance;
  const frac = side === 0 ? hitY - Math.floor(hitY) : hitX - Math.floor(hitX);
  return { distance: Math.min(distance || MAX_DIST, MAX_DIST), side, frac };
}

function haptic(ms = 18) {
  if (window.XiaoKBAndroid?.haptic) {
    window.XiaoKBAndroid.haptic("light");
    return;
  }
  navigator.vibrate?.(ms);
}

export default function KBZeroGame() {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const [started, setStarted] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [hud, setHud] = useState({ ammo: 30, reserve: 120, hp: 100, score: 0, combo: 0, fps: 0, reloading: false });

  useEffect(() => {
    const isMobile = matchMedia("(pointer: coarse)").matches || innerWidth < 760;
    setMobile(isMobile);
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });
    const keys = new Set();
    const state = {
      running: true,
      started: false,
      px: 2.5,
      py: 2.5,
      angle: 0,
      pitch: 0,
      vx: 0,
      vy: 0,
      recoil: 0,
      recoilVel: 0,
      weaponKick: 0,
      weaponSide: 0,
      bob: 0,
      muzzle: 0,
      hitFlash: 0,
      damageFlash: 0,
      ammo: MAG_SIZE,
      reserve: 120,
      hp: 100,
      score: 0,
      combo: 0,
      comboTimer: 0,
      fireHeld: false,
      ads: false,
      reloadTimer: 0,
      nextShot: 0,
      now: 0,
      accumulator: 0,
      last: performance.now(),
      fpsFrames: 0,
      fpsClock: performance.now(),
      fps: 0,
      enemies: [
        { x: 8.5, y: 2.8, hp: 100, alive: true, phase: 0.2 },
        { x: 12.4, y: 5.6, hp: 100, alive: true, phase: 1.4 },
        { x: 5.6, y: 9.2, hp: 100, alive: true, phase: 2.1 },
        { x: 11.8, y: 12.4, hp: 100, alive: true, phase: 3.5 },
        { x: 3.5, y: 13.0, hp: 100, alive: true, phase: 4.4 },
      ],
      respawns: [],
      lastHud: 0,
    };
    engineRef.current = state;

    function resize() {
      const dpr = Math.min(devicePixelRatio || 1, mobile ? 1.5 : 2);
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    }
    resize();
    addEventListener("resize", resize);

    function beginReload() {
      if (state.reloadTimer > 0 || state.ammo === MAG_SIZE || state.reserve <= 0) return;
      state.reloadTimer = 1.45;
      haptic(14);
    }

    function shoot() {
      if (!state.started || state.reloadTimer > 0 || state.now < state.nextShot) return;
      if (state.ammo <= 0) {
        state.nextShot = state.now + 0.18;
        beginReload();
        return;
      }
      state.nextShot = state.now + 0.092;
      state.ammo -= 1;
      state.muzzle = 1;
      state.weaponKick = 1;
      state.weaponSide = (Math.random() - 0.5) * 0.9;
      state.recoilVel += state.ads ? 0.22 : 0.31;
      haptic(10);

      let best = null;
      const spread = state.ads ? 0.0025 : 0.010 + Math.hypot(state.vx, state.vy) * 0.0014;
      const shotAngle = state.angle + (Math.random() - 0.5) * spread;
      const wallDist = castRay(state.px, state.py, shotAngle).distance;
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
      if (best) {
        const head = Math.random() < Math.max(0.18, 0.55 - best.delta / best.threshold);
        best.enemy.hp -= head ? 100 : 34;
        state.hitFlash = head ? 1.7 : 1;
        if (best.enemy.hp <= 0) {
          best.enemy.alive = false;
          state.score += head ? 220 : 100;
          state.combo += 1;
          state.comboTimer = 2.8;
          state.respawns.push({ enemy: best.enemy, time: state.now + 2.2 + Math.random() * 1.8 });
          haptic(28);
        } else {
          state.score += head ? 40 : 15;
        }
      }
    }

    function fixedUpdate(dt) {
      if (!state.started) return;
      const forward = (keys.has("KeyW") ? 1 : 0) - (keys.has("KeyS") ? 1 : 0);
      const strafe = (keys.has("KeyD") ? 1 : 0) - (keys.has("KeyA") ? 1 : 0);
      const sprint = keys.has("ShiftLeft") && forward > 0 && !state.ads;
      const speed = sprint ? 5.6 : state.ads ? 2.25 : 3.75;
      const inputLen = Math.hypot(forward, strafe) || 1;
      const targetVX = (Math.cos(state.angle) * forward + Math.cos(state.angle + Math.PI / 2) * strafe) / inputLen * speed;
      const targetVY = (Math.sin(state.angle) * forward + Math.sin(state.angle + Math.PI / 2) * strafe) / inputLen * speed;
      const accel = forward || strafe ? 18 : 12;
      state.vx += (targetVX - state.vx) * Math.min(1, accel * dt);
      state.vy += (targetVY - state.vy) * Math.min(1, accel * dt);
      const nx = state.px + state.vx * dt;
      const ny = state.py + state.vy * dt;
      if (canStand(nx, state.py)) state.px = nx; else state.vx *= -0.08;
      if (canStand(state.px, ny)) state.py = ny; else state.vy *= -0.08;
      const moveSpeed = Math.hypot(state.vx, state.vy);
      state.bob += moveSpeed * dt * (sprint ? 2.65 : 2.15);

      state.recoilVel += -state.recoil * 42 * dt;
      state.recoilVel *= Math.exp(-12 * dt);
      state.recoil += state.recoilVel * dt;
      state.recoil = Math.max(-0.012, Math.min(0.12, state.recoil));
      state.weaponKick *= Math.exp(-18 * dt);
      state.weaponSide *= Math.exp(-16 * dt);
      state.muzzle *= Math.exp(-35 * dt);
      state.hitFlash *= Math.exp(-20 * dt);
      state.damageFlash *= Math.exp(-8 * dt);

      if (state.reloadTimer > 0) {
        state.reloadTimer -= dt;
        if (state.reloadTimer <= 0) {
          const need = MAG_SIZE - state.ammo;
          const loaded = Math.min(need, state.reserve);
          state.ammo += loaded;
          state.reserve -= loaded;
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
        if (dist > 3.4 && dist < 9.5) {
          const step = 0.5 * dt;
          const ex = enemy.x + dx / dist * step;
          const ey = enemy.y + dy / dist * step;
          if (!wallAt(ex, enemy.y)) enemy.x = ex;
          if (!wallAt(enemy.x, ey)) enemy.y = ey;
        }
        if (dist < 5.8 && Math.sin(enemy.phase * 2.3) > 0.996) {
          state.hp = Math.max(0, state.hp - 8);
          state.damageFlash = 1;
          haptic(20);
          if (state.hp <= 0) {
            state.hp = 100;
            state.px = 2.5;
            state.py = 2.5;
            state.vx = 0;
            state.vy = 0;
            state.combo = 0;
          }
        }
      }
      for (let i = state.respawns.length - 1; i >= 0; i -= 1) {
        const item = state.respawns[i];
        if (state.now >= item.time) {
          item.enemy.hp = 100;
          item.enemy.alive = true;
          state.respawns.splice(i, 1);
        }
      }
    }

    function draw() {
      const w = canvas.width;
      const h = canvas.height;
      const horizon = h * 0.5 + state.pitch * h + state.recoil * h * 1.4;
      const moveSpeed = Math.hypot(state.vx, state.vy);
      const bobY = Math.sin(state.bob * 5.3) * Math.min(1, moveSpeed / 3.5) * h * 0.004;
      const bobX = Math.cos(state.bob * 2.65) * Math.min(1, moveSpeed / 3.5) * w * 0.0025;

      const sky = ctx.createLinearGradient(0, 0, 0, horizon);
      sky.addColorStop(0, "#07050f");
      sky.addColorStop(0.72, "#100a1e");
      sky.addColorStop(1, "#1c1034");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, Math.max(0, horizon));
      const floor = ctx.createLinearGradient(0, horizon, 0, h);
      floor.addColorStop(0, "#17111f");
      floor.addColorStop(0.35, "#0b0910");
      floor.addColorStop(1, "#030305");
      ctx.fillStyle = floor;
      ctx.fillRect(0, horizon, w, h - horizon);

      const rays = Math.min(w, mobile ? 520 : 1100);
      const column = w / rays;
      const depth = new Float32Array(rays);
      for (let i = 0; i < rays; i += 1) {
        const cameraX = i / rays - 0.5;
        const rayAngle = state.angle + cameraX * FOV;
        const hit = castRay(state.px, state.py, rayAngle);
        const corrected = hit.distance * Math.cos(cameraX * FOV);
        depth[i] = corrected;
        const wallH = Math.min(h * 1.5, h / Math.max(0.12, corrected));
        const top = horizon - wallH / 2 + bobY;
        const shade = Math.max(0.12, 1 - corrected / MAX_DIST);
        const grid = Math.abs(hit.frac - 0.5) < 0.035 ? 1.32 : 1;
        const sideShade = hit.side ? 0.78 : 1;
        const r = Math.floor(48 * shade * grid * sideShade + 10);
        const g = Math.floor(25 * shade * sideShade + 7);
        const b = Math.floor(92 * shade * grid + 20);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(i * column, top, Math.ceil(column + 1), wallH);
        if (corrected < 8 && i % 10 === 0) {
          ctx.fillStyle = `rgba(178,128,255,${0.05 * shade})`;
          ctx.fillRect(i * column, top, Math.ceil(column), wallH);
        }
      }

      const sprites = state.enemies
        .filter((enemy) => enemy.alive)
        .map((enemy) => {
          const dx = enemy.x - state.px;
          const dy = enemy.y - state.py;
          return { enemy, dist: Math.hypot(dx, dy), rel: angleDelta(Math.atan2(dy, dx), state.angle) };
        })
        .filter((item) => Math.abs(item.rel) < FOV * 0.7)
        .sort((a, b) => b.dist - a.dist);

      for (const item of sprites) {
        const screenX = w * (0.5 + item.rel / FOV);
        const size = Math.min(h * 0.7, h / item.dist * 0.88);
        const rayIndex = Math.max(0, Math.min(rays - 1, Math.floor(screenX / w * rays)));
        if (item.dist > depth[rayIndex] + 0.25) continue;
        const y = horizon - size * 0.52 + bobY;
        const pulse = 0.5 + Math.sin(item.enemy.phase * 5) * 0.5;
        const glow = ctx.createRadialGradient(screenX, y + size * 0.45, 0, screenX, y + size * 0.45, size * 0.62);
        glow.addColorStop(0, `rgba(175,101,255,${0.35 + pulse * 0.18})`);
        glow.addColorStop(0.42, "rgba(103,45,202,.23)");
        glow.addColorStop(1, "rgba(51,20,95,0)");
        ctx.fillStyle = glow;
        ctx.fillRect(screenX - size, y - size * 0.2, size * 2, size * 1.6);
        ctx.strokeStyle = "rgba(214,177,255,.72)";
        ctx.lineWidth = Math.max(1, size * 0.025);
        ctx.beginPath();
        ctx.ellipse(screenX, y + size * 0.46, size * 0.22, size * 0.43, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "rgba(102,43,198,.75)";
        ctx.fill();
        ctx.fillStyle = "rgba(242,222,255,.9)";
        ctx.beginPath();
        ctx.arc(screenX, y + size * 0.27, size * 0.075, 0, Math.PI * 2);
        ctx.fill();
        const hpW = size * 0.46;
        ctx.fillStyle = "rgba(0,0,0,.5)";
        ctx.fillRect(screenX - hpW / 2, y - size * 0.03, hpW, 3 * devicePixelRatio);
        ctx.fillStyle = "rgba(176,112,255,.9)";
        ctx.fillRect(screenX - hpW / 2, y - size * 0.03, hpW * item.enemy.hp / 100, 3 * devicePixelRatio);
      }

      const gunW = Math.min(w * 0.38, h * 0.55);
      const gunH = gunW * 0.42;
      const kickY = state.weaponKick * gunH * 0.14;
      const gx = w * 0.5 + bobX + state.weaponSide * gunW * 0.035 - gunW * 0.08;
      const gy = h - gunH * 0.58 + Math.abs(Math.sin(state.bob * 5.3)) * Math.min(1, moveSpeed / 3.5) * gunH * 0.025 + kickY;
      ctx.save();
      ctx.translate(gx, gy);
      ctx.rotate(state.weaponSide * 0.025 - state.weaponKick * 0.018);
      const gunGrad = ctx.createLinearGradient(-gunW * 0.4, 0, gunW * 0.42, 0);
      gunGrad.addColorStop(0, "#18131f");
      gunGrad.addColorStop(0.55, "#3a2161");
      gunGrad.addColorStop(1, "#8e54e8");
      ctx.fillStyle = gunGrad;
      ctx.beginPath();
      ctx.roundRect(-gunW * 0.18, -gunH * 0.15, gunW * 0.58, gunH * 0.26, gunH * 0.06);
      ctx.fill();
      ctx.fillStyle = "rgba(222,190,255,.88)";
      ctx.fillRect(gunW * 0.28, -gunH * 0.09, gunW * 0.26, gunH * 0.065);
      ctx.fillStyle = "#15111a";
      ctx.beginPath();
      ctx.roundRect(-gunW * 0.04, gunH * 0.02, gunW * 0.13, gunH * 0.26, gunH * 0.04);
      ctx.fill();
      ctx.strokeStyle = "rgba(189,130,255,.55)";
      ctx.lineWidth = Math.max(1, gunW * 0.006);
      ctx.strokeRect(-gunW * 0.1, -gunH * 0.11, gunW * 0.32, gunH * 0.08);
      if (state.muzzle > 0.02) {
        const mx = gunW * 0.56;
        const my = -gunH * 0.055;
        const flash = gunH * (0.28 + state.muzzle * 0.34);
        const m = ctx.createRadialGradient(mx, my, 0, mx, my, flash);
        m.addColorStop(0, `rgba(255,255,255,${state.muzzle})`);
        m.addColorStop(0.18, `rgba(220,155,255,${state.muzzle * 0.95})`);
        m.addColorStop(0.58, `rgba(144,72,255,${state.muzzle * 0.55})`);
        m.addColorStop(1, "rgba(80,30,180,0)");
        ctx.fillStyle = m;
        ctx.fillRect(mx - flash, my - flash, flash * 2, flash * 2);
      }
      ctx.restore();

      const cx = w / 2;
      const cy = h / 2 + state.recoil * h * 0.5;
      const gap = (state.ads ? 4 : 8) * devicePixelRatio + moveSpeed * 0.7 * devicePixelRatio;
      const len = 7 * devicePixelRatio;
      ctx.strokeStyle = state.hitFlash > 0.08 ? "rgba(255,255,255,.96)" : "rgba(220,199,255,.8)";
      ctx.lineWidth = Math.max(1, devicePixelRatio);
      ctx.beginPath();
      ctx.moveTo(cx - gap - len, cy); ctx.lineTo(cx - gap, cy);
      ctx.moveTo(cx + gap, cy); ctx.lineTo(cx + gap + len, cy);
      ctx.moveTo(cx, cy - gap - len); ctx.lineTo(cx, cy - gap);
      ctx.moveTo(cx, cy + gap); ctx.lineTo(cx, cy + gap + len);
      ctx.stroke();
      if (state.hitFlash > 0.08) {
        ctx.strokeStyle = `rgba(200,145,255,${Math.min(1, state.hitFlash)})`;
        ctx.beginPath();
        ctx.moveTo(cx - gap * 1.8, cy - gap * 1.8); ctx.lineTo(cx - gap * 0.7, cy - gap * 0.7);
        ctx.moveTo(cx + gap * 1.8, cy - gap * 1.8); ctx.lineTo(cx + gap * 0.7, cy - gap * 0.7);
        ctx.stroke();
      }
      if (state.damageFlash > 0.02) {
        const vignette = ctx.createRadialGradient(cx, cy, h * 0.16, cx, cy, h * 0.72);
        vignette.addColorStop(0, "rgba(90,0,80,0)");
        vignette.addColorStop(1, `rgba(180,0,95,${state.damageFlash * 0.46})`);
        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, w, h);
      }
    }

    function frame(t) {
      if (!state.running) return;
      const rawDt = Math.min(0.05, (t - state.last) / 1000);
      state.last = t;
      state.now = t / 1000;
      state.accumulator += rawDt;
      while (state.accumulator >= FIXED_DT) {
        fixedUpdate(FIXED_DT);
        state.accumulator -= FIXED_DT;
      }
      draw();
      state.fpsFrames += 1;
      if (t - state.fpsClock >= 500) {
        state.fps = Math.round(state.fpsFrames * 1000 / (t - state.fpsClock));
        state.fpsFrames = 0;
        state.fpsClock = t;
      }
      if (t - state.lastHud > 90) {
        state.lastHud = t;
        setHud({ ammo: state.ammo, reserve: state.reserve, hp: state.hp, score: state.score, combo: state.combo, fps: state.fps, reloading: state.reloadTimer > 0 });
      }
      requestAnimationFrame(frame);
    }

    function onKeyDown(e) {
      keys.add(e.code);
      if (e.code === "KeyR") beginReload();
      if (e.code === "Escape" && document.pointerLockElement === canvas) document.exitPointerLock();
    }
    function onKeyUp(e) { keys.delete(e.code); }
    function onMouseMove(e) {
      if (document.pointerLockElement !== canvas || !state.started) return;
      const sens = state.ads ? 0.00105 : 0.00165;
      state.angle += e.movementX * sens;
      state.pitch = Math.max(-0.19, Math.min(0.19, state.pitch + e.movementY * sens * 0.72));
    }
    function onMouseDown(e) {
      if (!state.started) return;
      if (e.button === 0) { state.fireHeld = true; shoot(); }
      if (e.button === 2) state.ads = true;
    }
    function onMouseUp(e) {
      if (e.button === 0) state.fireHeld = false;
      if (e.button === 2) state.ads = false;
    }
    function onContextMenu(e) { e.preventDefault(); }
    function onBlur() { keys.clear(); state.fireHeld = false; state.ads = false; }

    addEventListener("keydown", onKeyDown);
    addEventListener("keyup", onKeyUp);
    addEventListener("mousemove", onMouseMove);
    addEventListener("mousedown", onMouseDown);
    addEventListener("mouseup", onMouseUp);
    addEventListener("blur", onBlur);
    canvas.addEventListener("contextmenu", onContextMenu);
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
  }, [mobile]);

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
    state.pitch = Math.max(-0.19, Math.min(0.19, state.pitch + dy * 0.003));
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
    if (!state || state.reloadTimer > 0 || state.ammo === MAG_SIZE || state.reserve <= 0) return;
    state.reloadTimer = 1.45;
  }

  return (
    <main className="zeroShell">
      <canvas ref={canvasRef} className="zeroCanvas" onClick={() => started && !mobile && canvasRef.current?.requestPointerLock?.()} />
      <a className="zeroBack" href="/">← 小KB</a>
      <div className="zeroTopHud"><span>KB // ZERO</span><em>{hud.fps || "—"} FPS</em></div>
      <div className="zeroHealth"><i style={{ width: `${hud.hp}%` }} /><span>{hud.hp}</span></div>
      <div className="zeroScore"><small>SCORE</small><strong>{String(hud.score).padStart(6, "0")}</strong>{hud.combo > 1 && <em>SYNC ×{hud.combo}</em>}</div>
      <div className={`zeroAmmo${hud.reloading ? " isReloading" : ""}`}><strong>{hud.ammo}</strong><span>/ {hud.reserve}</span><small>{hud.reloading ? "RECALIBRATING" : "VX-01 // AUTO"}</small></div>
      {!started && <section className="zeroIntro"><span>KB LAB EXPERIMENT 01</span><h1>KB // ZERO</h1><p>进入失控 Core 训练区。高刷新射击核心，命中、后坐力和移动全部实时演算。</p><button type="button" onClick={enterGame}>进入训练场</button><small>{mobile ? "左侧移动 · 右侧视角 · FIRE 开火" : "WASD 移动 · 鼠标视角 · 左键开火 · 右键开镜 · R 换弹 · Shift 冲刺"}</small></section>}
      {started && mobile && <MobileControls onMove={setMobileMove} onLook={mobileLook} onFire={fireMobile} onReload={reloadMobile} />}
    </main>
  );
}

function MobileControls({ onMove, onLook, onFire, onReload }) {
  const moveRef = useRef(null);
  const lookRef = useRef(null);
  const moveState = useRef({ id: null, ox: 0, oy: 0 });
  const lookState = useRef({ id: null, x: 0, y: 0 });

  function moveStart(e) {
    const t = e.changedTouches[0];
    moveState.current = { id: t.identifier, ox: t.clientX, oy: t.clientY };
  }
  function moveTouch(e) {
    const s = moveState.current;
    const t = Array.from(e.changedTouches).find((x) => x.identifier === s.id);
    if (!t) return;
    const dx = Math.max(-1, Math.min(1, (t.clientX - s.ox) / 52));
    const dy = Math.max(-1, Math.min(1, (t.clientY - s.oy) / 52));
    onMove(dx, dy);
  }
  function lookStart(e) {
    const t = e.changedTouches[0];
    lookState.current = { id: t.identifier, x: t.clientX, y: t.clientY };
  }
  function lookTouch(e) {
    const s = lookState.current;
    const t = Array.from(e.changedTouches).find((x) => x.identifier === s.id);
    if (!t) return;
    onLook(t.clientX - s.x, t.clientY - s.y);
    s.x = t.clientX;
    s.y = t.clientY;
  }

  return <div className="zeroMobileControls">
    <div ref={moveRef} className="zeroMovePad" onTouchStart={moveStart} onTouchMove={moveTouch}><i /></div>
    <div ref={lookRef} className="zeroLookPad" onTouchStart={lookStart} onTouchMove={lookTouch} />
    <button className="zeroFire" type="button" onTouchStart={() => onFire(true)} onTouchEnd={() => onFire(false)}>FIRE</button>
    <button className="zeroReload" type="button" onClick={onReload}>R</button>
  </div>;
}
