"use client";

import { useEffect, useRef, useState } from "react";
import "./zero.css";

const MAP = [
  "1111111111111111",
  "1000000000000001",
  "1000010001000001",
  "1000010001000001",
  "1000000000000001",
  "1000001110000001",
  "1000000000000001",
  "1001000000010001",
  "1001000000010001",
  "1000000000000001",
  "1000011001100001",
  "1000000000000001",
  "1000000100000001",
  "1000000100000001",
  "1000000000000001",
  "1111111111111111",
];

const TWO_PI = Math.PI * 2;
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const angleWrap = (a) => ((a % TWO_PI) + TWO_PI) % TWO_PI;

function castRay(px, py, angle, maxDistance = 24) {
  const sin = Math.sin(angle);
  const cos = Math.cos(angle);
  let dist = 0.02;
  while (dist < maxDistance) {
    const x = px + cos * dist;
    const y = py + sin * dist;
    const mx = Math.floor(x);
    const my = Math.floor(y);
    if (MAP[my]?.[mx] === "1") return { dist, x, y, mx, my };
    dist += 0.025;
  }
  return { dist: maxDistance, x: px + cos * maxDistance, y: py + sin * maxDistance };
}

export default function KBZeroPage() {
  const canvasRef = useRef(null);
  const gameRef = useRef(null);
  const [locked, setLocked] = useState(false);
  const [hud, setHud] = useState({ ammo: 30, reserve: 120, hp: 100, kills: 0, fps: 0, state: "STANDBY" });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });

    const game = {
      x: 3.5,
      y: 3.5,
      yaw: 0,
      pitch: 0,
      vx: 0,
      vy: 0,
      bob: 0,
      recoil: 0,
      recoilVel: 0,
      ads: 0,
      adsTarget: 0,
      ammo: 30,
      reserve: 120,
      hp: 100,
      kills: 0,
      reloadUntil: 0,
      lastShot: 0,
      muzzle: 0,
      hitFlash: 0,
      headshot: 0,
      keys: new Set(),
      fps: 0,
      fpsAccum: 0,
      fpsFrames: 0,
      fpsStamp: performance.now(),
      enemies: [
        { x: 11.5, y: 3.5, hp: 100, alive: true, respawn: 0, phase: 0.3 },
        { x: 7.5, y: 8.5, hp: 100, alive: true, respawn: 0, phase: 1.5 },
        { x: 12.5, y: 12.5, hp: 100, alive: true, respawn: 0, phase: 2.7 },
        { x: 3.5, y: 12.5, hp: 100, alive: true, respawn: 0, phase: 4.1 },
      ],
      running: true,
      lastTime: performance.now(),
    };
    gameRef.current = game;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.max(1, Math.floor(innerWidth * dpr));
      canvas.height = Math.max(1, Math.floor(innerHeight * dpr));
      canvas.style.width = `${innerWidth}px`;
      canvas.style.height = `${innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function free(x, y) {
      const r = 0.22;
      return [
        [x - r, y - r], [x + r, y - r], [x - r, y + r], [x + r, y + r],
      ].every(([px, py]) => MAP[Math.floor(py)]?.[Math.floor(px)] !== "1");
    }

    function fire(now) {
      if (document.pointerLockElement !== canvas) return;
      if (now < game.reloadUntil || now - game.lastShot < 92) return;
      if (game.ammo <= 0) {
        reload(now);
        return;
      }
      game.lastShot = now;
      game.ammo -= 1;
      game.muzzle = 1;
      game.recoilVel += game.ads > 0.65 ? 1.6 : 2.35;

      const spread = game.ads > 0.65 ? 0.0035 : 0.011;
      const shotAngle = game.yaw + (Math.random() - 0.5) * spread;
      let best = null;
      for (const enemy of game.enemies) {
        if (!enemy.alive) continue;
        const dx = enemy.x - game.x;
        const dy = enemy.y - game.y;
        const dist = Math.hypot(dx, dy);
        const ea = Math.atan2(dy, dx);
        let delta = ((ea - shotAngle + Math.PI) % TWO_PI) - Math.PI;
        const hitRadius = Math.atan2(0.24, dist);
        if (Math.abs(delta) <= hitRadius) {
          const wall = castRay(game.x, game.y, shotAngle, dist + 0.2);
          if (wall.dist + 0.08 < dist) continue;
          if (!best || dist < best.dist) best = { enemy, dist, delta, hitRadius };
        }
      }

      if (best) {
        const head = Math.abs(best.delta) < best.hitRadius * 0.34 && Math.abs(game.pitch) < 0.08;
        best.enemy.hp -= head ? 100 : 36;
        game.hitFlash = 1;
        game.headshot = head ? 1 : 0;
        if (best.enemy.hp <= 0) {
          best.enemy.alive = false;
          best.enemy.respawn = now + 2200;
          game.kills += 1;
        }
      }
    }

    function reload(now = performance.now()) {
      if (game.ammo >= 30 || game.reserve <= 0 || now < game.reloadUntil) return;
      game.reloadUntil = now + 1380;
    }

    const onKeyDown = (e) => {
      game.keys.add(e.code);
      if (e.code === "KeyR") reload();
      if (e.code === "Escape") document.exitPointerLock?.();
    };
    const onKeyUp = (e) => game.keys.delete(e.code);
    const onMouseMove = (e) => {
      if (document.pointerLockElement !== canvas) return;
      const sens = game.ads > 0.65 ? 0.00115 : 0.00175;
      game.yaw = angleWrap(game.yaw + e.movementX * sens);
      game.pitch = clamp(game.pitch + e.movementY * sens, -0.72, 0.72);
    };
    const onMouseDown = (e) => {
      if (document.pointerLockElement !== canvas) {
        canvas.requestPointerLock();
        return;
      }
      if (e.button === 0) fire(performance.now());
      if (e.button === 2) game.adsTarget = 1;
    };
    const onMouseUp = (e) => { if (e.button === 2) game.adsTarget = 0; };
    const onLockChange = () => setLocked(document.pointerLockElement === canvas);
    const onContext = (e) => e.preventDefault();

    window.addEventListener("resize", resize);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("mouseup", onMouseUp);
    document.addEventListener("pointerlockchange", onLockChange);
    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("contextmenu", onContext);
    resize();

    function update(dt, now) {
      const k = game.keys;
      const sprint = k.has("ShiftLeft") || k.has("ShiftRight");
      const speed = sprint ? 4.7 : 3.35;
      let forward = 0;
      let strafe = 0;
      if (k.has("KeyW")) forward += 1;
      if (k.has("KeyS")) forward -= 1;
      if (k.has("KeyD")) strafe += 1;
      if (k.has("KeyA")) strafe -= 1;
      const len = Math.hypot(forward, strafe) || 1;
      forward /= len;
      strafe /= len;
      const tx = (Math.cos(game.yaw) * forward + Math.cos(game.yaw + Math.PI / 2) * strafe) * speed;
      const ty = (Math.sin(game.yaw) * forward + Math.sin(game.yaw + Math.PI / 2) * strafe) * speed;
      const accel = 1 - Math.exp(-dt * 14);
      game.vx += (tx - game.vx) * accel;
      game.vy += (ty - game.vy) * accel;
      const nx = game.x + game.vx * dt;
      const ny = game.y + game.vy * dt;
      if (free(nx, game.y)) game.x = nx; else game.vx *= 0.15;
      if (free(game.x, ny)) game.y = ny; else game.vy *= 0.15;
      const moveMag = Math.hypot(game.vx, game.vy);
      game.bob += dt * (5.8 + moveMag * 1.35);

      game.ads += (game.adsTarget - game.ads) * (1 - Math.exp(-dt * 18));
      game.recoilVel += (-game.recoil * 70 - game.recoilVel * 15) * dt;
      game.recoil += game.recoilVel * dt;
      game.muzzle *= Math.exp(-dt * 28);
      game.hitFlash *= Math.exp(-dt * 24);
      game.headshot *= Math.exp(-dt * 8);

      if (game.reloadUntil && now >= game.reloadUntil) {
        const need = 30 - game.ammo;
        const moved = Math.min(need, game.reserve);
        game.ammo += moved;
        game.reserve -= moved;
        game.reloadUntil = 0;
      }
      for (const enemy of game.enemies) {
        if (!enemy.alive && now >= enemy.respawn) {
          enemy.alive = true;
          enemy.hp = 100;
        }
      }
    }

    function draw(now) {
      const w = innerWidth;
      const h = innerHeight;
      const horizon = h * 0.5 + game.pitch * h * 0.38 + game.recoil * h * 0.045;
      const fov = (72 - game.ads * 25) * Math.PI / 180;
      ctx.fillStyle = "#06050b";
      ctx.fillRect(0, 0, w, h);

      const sky = ctx.createLinearGradient(0, 0, 0, horizon);
      sky.addColorStop(0, "#090613");
      sky.addColorStop(0.72, "#151022");
      sky.addColorStop(1, "#25183c");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, Math.max(0, horizon));

      const floor = ctx.createLinearGradient(0, horizon, 0, h);
      floor.addColorStop(0, "#171120");
      floor.addColorStop(1, "#050507");
      ctx.fillStyle = floor;
      ctx.fillRect(0, Math.max(0, horizon), w, h - horizon);

      const columnWidth = Math.max(1, w / Math.min(w, 900));
      for (let sx = 0; sx < w; sx += columnWidth) {
        const cam = sx / w - 0.5;
        const angle = game.yaw + cam * fov;
        const ray = castRay(game.x, game.y, angle);
        const corrected = ray.dist * Math.cos(angle - game.yaw);
        const wallHeight = Math.min(h * 1.8, h / Math.max(0.08, corrected));
        const top = horizon - wallHeight * 0.5;
        const edge = Math.min(ray.x % 1, ray.y % 1);
        const shade = clamp(1 - corrected / 18, 0.14, 0.95);
        const purple = Math.floor(36 + shade * 72 + edge * 12);
        ctx.fillStyle = `rgb(${purple * 0.54},${purple * 0.38},${purple})`;
        ctx.fillRect(sx, top, columnWidth + 0.6, wallHeight);
      }

      const renderEnemies = game.enemies
        .filter((e) => e.alive)
        .map((e) => {
          const dx = e.x - game.x;
          const dy = e.y - game.y;
          const dist = Math.hypot(dx, dy);
          let delta = ((Math.atan2(dy, dx) - game.yaw + Math.PI) % TWO_PI) - Math.PI;
          return { e, dist, delta };
        })
        .filter(({ delta }) => Math.abs(delta) < fov * 0.65)
        .sort((a, b) => b.dist - a.dist);

      for (const { e, dist, delta } of renderEnemies) {
        const wall = castRay(game.x, game.y, game.yaw + delta, dist + 0.2);
        if (wall.dist + 0.08 < dist) continue;
        const scale = h / Math.max(0.2, dist);
        const ex = w * 0.5 + (delta / fov) * w;
        const ey = horizon + Math.sin(now * 0.002 + e.phase) * scale * 0.025;
        const r = scale * 0.24;
        ctx.save();
        ctx.translate(ex, ey);
        const glow = ctx.createRadialGradient(0, 0, r * 0.1, 0, 0, r * 1.7);
        glow.addColorStop(0, "rgba(221,197,255,.95)");
        glow.addColorStop(0.32, "rgba(162,91,255,.86)");
        glow.addColorStop(0.72, "rgba(98,42,204,.22)");
        glow.addColorStop(1, "rgba(98,42,204,0)");
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(0, 0, r * 1.7, 0, TWO_PI); ctx.fill();
        ctx.strokeStyle = "rgba(219,198,255,.82)";
        ctx.lineWidth = Math.max(1, r * 0.055);
        ctx.beginPath(); ctx.ellipse(0, 0, r * 0.95, r * 0.35, now * 0.001 + e.phase, 0, TWO_PI); ctx.stroke();
        ctx.rotate(-now * 0.0007 - e.phase);
        ctx.beginPath(); ctx.ellipse(0, 0, r * 0.72, r * 0.23, 1.1, 0, TWO_PI); ctx.stroke();
        ctx.fillStyle = "#7d4cff";
        ctx.beginPath(); ctx.arc(0, 0, r * 0.42, 0, TWO_PI); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,.85)";
        ctx.beginPath(); ctx.arc(-r * 0.12, -r * 0.13, r * 0.08, 0, TWO_PI); ctx.fill();
        ctx.restore();
      }

      const speed = Math.hypot(game.vx, game.vy);
      const bobY = Math.sin(game.bob) * Math.min(7, speed * 1.4);
      const bobX = Math.cos(game.bob * 0.5) * Math.min(5, speed * 0.8);
      const gunX = w * 0.71 + bobX + game.ads * (w * 0.5 - w * 0.71);
      const gunY = h * 0.77 + bobY + game.recoil * 24 + game.ads * 20;
      ctx.save();
      ctx.translate(gunX, gunY);
      ctx.rotate(-0.09 - game.recoil * 0.05);
      const gunGrad = ctx.createLinearGradient(-120, -50, 120, 70);
      gunGrad.addColorStop(0, "#14111d");
      gunGrad.addColorStop(0.55, "#33204d");
      gunGrad.addColorStop(1, "#8155ef");
      ctx.fillStyle = gunGrad;
      ctx.beginPath();
      ctx.moveTo(-86, 42); ctx.lineTo(-40, -22); ctx.lineTo(72, -34); ctx.lineTo(132, -7); ctx.lineTo(108, 23); ctx.lineTo(22, 34); ctx.lineTo(-22, 68); ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(221,197,255,.78)";
      ctx.fillRect(18, -25, 72, 4);
      ctx.fillStyle = "#08070c";
      ctx.fillRect(102, -17, 54, 16);
      if (game.muzzle > 0.05) {
        ctx.globalAlpha = clamp(game.muzzle, 0, 1);
        const flash = ctx.createRadialGradient(158, -9, 0, 158, -9, 70);
        flash.addColorStop(0, "#fff"); flash.addColorStop(0.18, "#d9b4ff"); flash.addColorStop(1, "rgba(138,75,255,0)");
        ctx.fillStyle = flash; ctx.beginPath(); ctx.arc(158, -9, 70, 0, TWO_PI); ctx.fill();
      }
      ctx.restore();

      const cx = w / 2;
      const cy = h / 2;
      const gap = 7 + game.ads * 3 + Math.hypot(game.vx, game.vy) * 0.8;
      ctx.strokeStyle = game.hitFlash > 0.15 ? "rgba(255,255,255,.96)" : "rgba(221,201,255,.78)";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(cx - gap - 9, cy); ctx.lineTo(cx - gap, cy);
      ctx.moveTo(cx + gap, cy); ctx.lineTo(cx + gap + 9, cy);
      ctx.moveTo(cx, cy - gap - 9); ctx.lineTo(cx, cy - gap);
      ctx.moveTo(cx, cy + gap); ctx.lineTo(cx, cy + gap + 9);
      ctx.stroke();
      if (game.hitFlash > 0.1) {
        ctx.strokeStyle = game.headshot > 0.1 ? "#fff" : "#caa8ff";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx - 12, cy - 12); ctx.lineTo(cx - 4, cy - 4);
        ctx.moveTo(cx + 12, cy - 12); ctx.lineTo(cx + 4, cy - 4);
        ctx.moveTo(cx - 12, cy + 12); ctx.lineTo(cx - 4, cy + 4);
        ctx.moveTo(cx + 12, cy + 12); ctx.lineTo(cx + 4, cy + 4);
        ctx.stroke();
      }

      game.fpsFrames += 1;
      game.fpsAccum += now - game.lastTime;
      if (now - game.fpsStamp > 500) {
        game.fps = Math.round(game.fpsFrames * 1000 / (now - game.fpsStamp));
        game.fpsFrames = 0;
        game.fpsStamp = now;
        setHud({
          ammo: game.ammo,
          reserve: game.reserve,
          hp: game.hp,
          kills: game.kills,
          fps: game.fps,
          state: now < game.reloadUntil ? "RELOADING" : game.ads > 0.65 ? "ADS" : "SYNC",
        });
      }
    }

    let raf = 0;
    function loop(now) {
      if (!game.running) return;
      const dt = clamp((now - game.lastTime) / 1000, 0, 0.032);
      game.lastTime = now;
      update(dt, now);
      draw(now);
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    return () => {
      game.running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("pointerlockchange", onLockChange);
      canvas.removeEventListener("mousedown", onMouseDown);
      canvas.removeEventListener("contextmenu", onContext);
    };
  }, []);

  return (
    <main className="zeroShell">
      <canvas ref={canvasRef} className="zeroCanvas" aria-label="KB ZERO FPS training field" />
      <a className="zeroBack" href="/">← 小KB</a>
      <div className="zeroBrand"><b>KB // ZERO</b><span>CORE TRAINING PROTOCOL</span></div>
      <div className="zeroTopHud"><span>HP {hud.hp}</span><span>SYNC {hud.kills.toString().padStart(2, "0")}</span><span>{hud.fps} FPS</span></div>
      <div className="zeroAmmo"><strong>{hud.ammo.toString().padStart(2, "0")}</strong><span>/ {hud.reserve}</span><small>{hud.state}</small></div>
      {!locked && (
        <button className="zeroStart" type="button" onClick={() => canvasRef.current?.requestPointerLock()}>
          <span>KB // ZERO</span>
          <strong>进入训练场</strong>
          <small>WASD 移动 · 鼠标视角 · 左键开火 · 右键瞄准 · R 换弹 · Shift 冲刺</small>
        </button>
      )}
      <div className="zeroVignette" aria-hidden="true" />
    </main>
  );
}
