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
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const wrap = (angle) => ((angle % TWO_PI) + TWO_PI) % TWO_PI;

function castRay(px, py, angle, maxDistance = 24) {
  const sin = Math.sin(angle);
  const cos = Math.cos(angle);
  for (let distance = 0.02; distance < maxDistance; distance += 0.025) {
    const x = px + cos * distance;
    const y = py + sin * distance;
    if (MAP[Math.floor(y)]?.[Math.floor(x)] === "1") return { distance, x, y };
  }
  return { distance: maxDistance, x: px + cos * maxDistance, y: py + sin * maxDistance };
}

export default function KBZeroPage() {
  const canvasRef = useRef(null);
  const [locked, setLocked] = useState(false);
  const [hud, setHud] = useState({ ammo: 30, reserve: 120, hp: 100, kills: 0, fps: 0, state: "STANDBY" });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });
    if (!ctx) return undefined;

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
      fpsFrames: 0,
      fpsStamp: performance.now(),
      lastTime: performance.now(),
      running: true,
      enemies: [
        { x: 11.5, y: 3.5, hp: 100, alive: true, respawn: 0, phase: 0.3 },
        { x: 7.5, y: 8.5, hp: 100, alive: true, respawn: 0, phase: 1.5 },
        { x: 12.5, y: 12.5, hp: 100, alive: true, respawn: 0, phase: 2.7 },
        { x: 3.5, y: 12.5, hp: 100, alive: true, respawn: 0, phase: 4.1 },
      ],
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.max(1, Math.floor(window.innerWidth * dpr));
      canvas.height = Math.max(1, Math.floor(window.innerHeight * dpr));
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const isFree = (x, y) => {
      const r = 0.22;
      return [[x-r,y-r],[x+r,y-r],[x-r,y+r],[x+r,y+r]].every(([px, py]) => MAP[Math.floor(py)]?.[Math.floor(px)] !== "1");
    };

    const reload = (now = performance.now()) => {
      if (game.ammo >= 30 || game.reserve <= 0 || now < game.reloadUntil) return;
      game.reloadUntil = now + 1380;
    };

    const fire = (now) => {
      if (document.pointerLockElement !== canvas || now < game.reloadUntil || now - game.lastShot < 92) return;
      if (game.ammo <= 0) return reload(now);
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
        const distance = Math.hypot(dx, dy);
        const enemyAngle = Math.atan2(dy, dx);
        const delta = ((enemyAngle - shotAngle + Math.PI) % TWO_PI) - Math.PI;
        const hitRadius = Math.atan2(0.24, distance);
        if (Math.abs(delta) > hitRadius) continue;
        if (castRay(game.x, game.y, shotAngle, distance + 0.2).distance + 0.08 < distance) continue;
        if (!best || distance < best.distance) best = { enemy, distance, delta, hitRadius };
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
    };

    const onKeyDown = (event) => {
      game.keys.add(event.code);
      if (event.code === "KeyR") reload();
    };
    const onKeyUp = (event) => game.keys.delete(event.code);
    const onMouseMove = (event) => {
      if (document.pointerLockElement !== canvas) return;
      const sensitivity = game.ads > 0.65 ? 0.00115 : 0.00175;
      game.yaw = wrap(game.yaw + event.movementX * sensitivity);
      game.pitch = clamp(game.pitch + event.movementY * sensitivity, -0.72, 0.72);
    };
    const onMouseDown = (event) => {
      if (document.pointerLockElement !== canvas) return canvas.requestPointerLock();
      if (event.button === 0) fire(performance.now());
      if (event.button === 2) game.adsTarget = 1;
    };
    const onMouseUp = (event) => { if (event.button === 2) game.adsTarget = 0; };
    const onLockChange = () => setLocked(document.pointerLockElement === canvas);
    const onContextMenu = (event) => event.preventDefault();

    window.addEventListener("resize", resize);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("mouseup", onMouseUp);
    document.addEventListener("pointerlockchange", onLockChange);
    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("contextmenu", onContextMenu);
    resize();

    const update = (dt, now) => {
      const sprint = game.keys.has("ShiftLeft") || game.keys.has("ShiftRight");
      const speed = sprint ? 4.7 : 3.35;
      let forward = (game.keys.has("KeyW") ? 1 : 0) - (game.keys.has("KeyS") ? 1 : 0);
      let strafe = (game.keys.has("KeyD") ? 1 : 0) - (game.keys.has("KeyA") ? 1 : 0);
      const length = Math.hypot(forward, strafe) || 1;
      forward /= length;
      strafe /= length;
      const targetX = (Math.cos(game.yaw) * forward + Math.cos(game.yaw + Math.PI / 2) * strafe) * speed;
      const targetY = (Math.sin(game.yaw) * forward + Math.sin(game.yaw + Math.PI / 2) * strafe) * speed;
      const accel = 1 - Math.exp(-dt * 14);
      game.vx += (targetX - game.vx) * accel;
      game.vy += (targetY - game.vy) * accel;
      const nextX = game.x + game.vx * dt;
      const nextY = game.y + game.vy * dt;
      if (isFree(nextX, game.y)) game.x = nextX; else game.vx *= 0.15;
      if (isFree(game.x, nextY)) game.y = nextY; else game.vy *= 0.15;
      game.bob += dt * (5.8 + Math.hypot(game.vx, game.vy) * 1.35);
      game.ads += (game.adsTarget - game.ads) * (1 - Math.exp(-dt * 18));
      game.recoilVel += (-game.recoil * 70 - game.recoilVel * 15) * dt;
      game.recoil += game.recoilVel * dt;
      game.muzzle *= Math.exp(-dt * 28);
      game.hitFlash *= Math.exp(-dt * 24);
      game.headshot *= Math.exp(-dt * 8);

      if (game.reloadUntil && now >= game.reloadUntil) {
        const moved = Math.min(30 - game.ammo, game.reserve);
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
    };

    const draw = (now) => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const horizon = h * 0.5 + game.pitch * h * 0.38 + game.recoil * h * 0.045;
      const fov = (72 - game.ads * 25) * Math.PI / 180;
      ctx.fillStyle = "#06050b";
      ctx.fillRect(0, 0, w, h);

      const sky = ctx.createLinearGradient(0, 0, 0, horizon);
      sky.addColorStop(0, "#090613"); sky.addColorStop(0.72, "#151022"); sky.addColorStop(1, "#25183c");
      ctx.fillStyle = sky; ctx.fillRect(0, 0, w, Math.max(0, horizon));
      const floor = ctx.createLinearGradient(0, horizon, 0, h);
      floor.addColorStop(0, "#171120"); floor.addColorStop(1, "#050507");
      ctx.fillStyle = floor; ctx.fillRect(0, Math.max(0, horizon), w, h - horizon);

      const columnWidth = Math.max(1, w / Math.min(w, 900));
      for (let sx = 0; sx < w; sx += columnWidth) {
        const cameraOffset = sx / w - 0.5;
        const angle = game.yaw + cameraOffset * fov;
        const ray = castRay(game.x, game.y, angle);
        const corrected = ray.distance * Math.cos(angle - game.yaw);
        const wallHeight = Math.min(h * 1.8, h / Math.max(0.08, corrected));
        const top = horizon - wallHeight * 0.5;
        const shade = clamp(1 - corrected / 18, 0.14, 0.95);
        const purple = Math.floor(36 + shade * 72);
        ctx.fillStyle = `rgb(${Math.floor(purple * 0.54)},${Math.floor(purple * 0.38)},${purple})`;
        ctx.fillRect(sx, top, columnWidth + 0.6, wallHeight);
      }

      const enemies = game.enemies.filter((enemy) => enemy.alive).map((enemy) => {
        const dx = enemy.x - game.x;
        const dy = enemy.y - game.y;
        const distance = Math.hypot(dx, dy);
        const delta = ((Math.atan2(dy, dx) - game.yaw + Math.PI) % TWO_PI) - Math.PI;
        return { enemy, distance, delta };
      }).filter(({ delta }) => Math.abs(delta) < fov * 0.65).sort((a, b) => b.distance - a.distance);

      for (const { enemy, distance, delta } of enemies) {
        if (castRay(game.x, game.y, game.yaw + delta, distance + 0.2).distance + 0.08 < distance) continue;
        const scale = h / Math.max(0.2, distance);
        const x = w * 0.5 + (delta / fov) * w;
        const y = horizon + Math.sin(now * 0.002 + enemy.phase) * scale * 0.025;
        const radius = scale * 0.24;
        ctx.save(); ctx.translate(x, y);
        const glow = ctx.createRadialGradient(0, 0, radius * 0.1, 0, 0, radius * 1.7);
        glow.addColorStop(0, "rgba(221,197,255,.95)"); glow.addColorStop(0.32, "rgba(162,91,255,.86)"); glow.addColorStop(1, "rgba(98,42,204,0)");
        ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0, 0, radius * 1.7, 0, TWO_PI); ctx.fill();
        ctx.strokeStyle = "rgba(219,198,255,.82)"; ctx.lineWidth = Math.max(1, radius * 0.055);
        ctx.beginPath(); ctx.ellipse(0, 0, radius * 0.95, radius * 0.35, now * 0.001 + enemy.phase, 0, TWO_PI); ctx.stroke();
        ctx.fillStyle = "#7d4cff"; ctx.beginPath(); ctx.arc(0, 0, radius * 0.42, 0, TWO_PI); ctx.fill();
        ctx.restore();
      }

      const moveSpeed = Math.hypot(game.vx, game.vy);
      const bobY = Math.sin(game.bob) * Math.min(7, moveSpeed * 1.4);
      const bobX = Math.cos(game.bob * 0.5) * Math.min(5, moveSpeed * 0.8);
      const gunX = w * 0.71 + bobX + game.ads * (w * 0.5 - w * 0.71);
      const gunY = h * 0.77 + bobY + game.recoil * 24 + game.ads * 20;
      ctx.save(); ctx.translate(gunX, gunY); ctx.rotate(-0.09 - game.recoil * 0.05);
      const gunGradient = ctx.createLinearGradient(-120, -50, 120, 70);
      gunGradient.addColorStop(0, "#14111d"); gunGradient.addColorStop(0.55, "#33204d"); gunGradient.addColorStop(1, "#8155ef");
      ctx.fillStyle = gunGradient; ctx.beginPath(); ctx.moveTo(-86,42); ctx.lineTo(-40,-22); ctx.lineTo(72,-34); ctx.lineTo(132,-7); ctx.lineTo(108,23); ctx.lineTo(22,34); ctx.lineTo(-22,68); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "rgba(221,197,255,.78)"; ctx.fillRect(18, -25, 72, 4);
      ctx.fillStyle = "#08070c"; ctx.fillRect(102, -17, 54, 16);
      if (game.muzzle > 0.05) {
        ctx.globalAlpha = clamp(game.muzzle, 0, 1);
        const flash = ctx.createRadialGradient(158, -9, 0, 158, -9, 70);
        flash.addColorStop(0, "#fff"); flash.addColorStop(0.18, "#d9b4ff"); flash.addColorStop(1, "rgba(138,75,255,0)");
        ctx.fillStyle = flash; ctx.beginPath(); ctx.arc(158, -9, 70, 0, TWO_PI); ctx.fill();
      }
      ctx.restore();

      const cx = w / 2;
      const cy = h / 2;
      const gap = 7 + game.ads * 3 + moveSpeed * 0.8;
      ctx.strokeStyle = game.hitFlash > 0.15 ? "rgba(255,255,255,.96)" : "rgba(221,201,255,.78)";
      ctx.lineWidth = 1.4; ctx.beginPath();
      ctx.moveTo(cx-gap-9,cy); ctx.lineTo(cx-gap,cy); ctx.moveTo(cx+gap,cy); ctx.lineTo(cx+gap+9,cy);
      ctx.moveTo(cx,cy-gap-9); ctx.lineTo(cx,cy-gap); ctx.moveTo(cx,cy+gap); ctx.lineTo(cx,cy+gap+9); ctx.stroke();

      game.fpsFrames += 1;
      if (now - game.fpsStamp > 500) {
        game.fps = Math.round(game.fpsFrames * 1000 / (now - game.fpsStamp));
        game.fpsFrames = 0;
        game.fpsStamp = now;
        setHud({ ammo: game.ammo, reserve: game.reserve, hp: game.hp, kills: game.kills, fps: game.fps, state: now < game.reloadUntil ? "RELOADING" : game.ads > 0.65 ? "ADS" : "SYNC" });
      }
    };

    let frame = 0;
    const loop = (now) => {
      if (!game.running) return;
      const dt = clamp((now - game.lastTime) / 1000, 0, 0.032);
      game.lastTime = now;
      update(dt, now);
      draw(now);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      game.running = false;
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("pointerlockchange", onLockChange);
      canvas.removeEventListener("mousedown", onMouseDown);
      canvas.removeEventListener("contextmenu", onContextMenu);
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
