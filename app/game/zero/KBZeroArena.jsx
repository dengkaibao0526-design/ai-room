"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const SERVER_WS = "wss://xiaokb-zero-server.onrender.com";
const MAP = [
  "1111111111111111", "1000000000000001", "1000000100000001", "1001100000110001",
  "1000000000000001", "1000011001100001", "1000000000000001", "1001000000010001",
  "1001000000010001", "1000000000000001", "1000011001100001", "1000000000000001",
  "1000000100000001", "1000000000000001", "1000000000000001", "1111111111111111",
];
const FIXED_DT = 1 / 120;
const PLAYER_RADIUS = 0.22;
const SENS_KEY = "xiaokb_zero_sensitivity_v5";
const DEFAULT_SENS = { mouse: 1, touch: 1, gyro: 1, ads: 0.68 };
const WEAPONS = [
  { id: "VX-01", mode: "AUTO", mag: 30, interval: 0.092, damage: 34, spread: 0.010, adsSpread: 0.0025, recoil: 0.31, pitch: 128 },
  { id: "K-9", mode: "PRECISION", mag: 12, interval: 0.265, damage: 72, spread: 0.0045, adsSpread: 0.0008, recoil: 0.52, pitch: 82 },
];
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const angleDelta = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const degreeDelta = (a, b) => ((a - b + 540) % 360) - 180;
const orientationAngle = () => ((screen.orientation?.angle ?? window.orientation ?? 0) % 360 + 360) % 360;
const isWall = (x, y) => {
  const ix = Math.floor(x), iy = Math.floor(y);
  return iy < 0 || ix < 0 || iy >= MAP.length || ix >= MAP[0].length || MAP[iy][ix] === "1";
};
const canStand = (x, y) => !isWall(x - PLAYER_RADIUS, y - PLAYER_RADIUS) && !isWall(x + PLAYER_RADIUS, y - PLAYER_RADIUS) && !isWall(x - PLAYER_RADIUS, y + PLAYER_RADIUS) && !isWall(x + PLAYER_RADIUS, y + PLAYER_RADIUS);
const loadSens = () => { try { return { ...DEFAULT_SENS, ...JSON.parse(localStorage.getItem(SENS_KEY) || "{}") }; } catch { return DEFAULT_SENS; } };
const saveSens = (v) => { try { localStorage.setItem(SENS_KEY, JSON.stringify(v)); } catch {} };

function castRay(px, py, angle) {
  const dx = Math.cos(angle), dy = Math.sin(angle);
  let mapX = Math.floor(px), mapY = Math.floor(py);
  const deltaX = Math.abs(1 / (dx || 0.00001)), deltaY = Math.abs(1 / (dy || 0.00001));
  const stepX = dx < 0 ? -1 : 1, stepY = dy < 0 ? -1 : 1;
  let sideX = dx < 0 ? (px - mapX) * deltaX : (mapX + 1 - px) * deltaX;
  let sideY = dy < 0 ? (py - mapY) * deltaY : (mapY + 1 - py) * deltaY;
  let side = 0, distance = 24;
  for (let i = 0; i < 64; i += 1) {
    if (sideX < sideY) { sideX += deltaX; mapX += stepX; side = 0; }
    else { sideY += deltaY; mapY += stepY; side = 1; }
    if (mapY < 0 || mapX < 0 || mapY >= MAP.length || mapX >= MAP[0].length || MAP[mapY][mapX] === "1") { distance = side === 0 ? sideX - deltaX : sideY - deltaY; break; }
  }
  return { distance: Math.min(distance, 24), side };
}

function makeAudio() {
  let ctx;
  const tone = (f, d, g, type = "sine", sweep = 0) => {
    ctx ||= new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    const t = ctx.currentTime, o = ctx.createOscillator(), a = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(Math.max(20, f), t);
    if (sweep) o.frequency.exponentialRampToValueAtTime(Math.max(20, f + sweep), t + d);
    a.gain.setValueAtTime(g, t); a.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(a).connect(ctx.destination); o.start(t); o.stop(t + d);
  };
  return { unlock: () => tone(260, .04, .001), shot: (w) => { tone(w.pitch, .065, .12, "sawtooth", -70); tone(w.pitch * 2.35, .035, .045, "square", -120); }, hit: () => tone(680, .05, .05, "sine", 180), kill: () => tone(330, .14, .06, "triangle", 420), reload: () => tone(140, .08, .035, "triangle", 60), swap: () => tone(310, .06, .035, "sine", 150) };
}

export default function KBZeroArena() {
  const canvasRef = useRef(null), engineRef = useRef(null), audioRef = useRef(null), wsRef = useRef(null), gyroBaseRef = useRef(null), gyroEnabledRef = useRef(false);
  const [mobile, setMobile] = useState(false), [started, setStarted] = useState(false), [mode, setMode] = useState("solo"), [settingsOpen, setSettingsOpen] = useState(false), [gyroActive, setGyroActive] = useState(false);
  const [sens, setSens] = useState(DEFAULT_SENS), [matchOpen, setMatchOpen] = useState(false), [matchStatus, setMatchStatus] = useState("idle"), [notice, setNotice] = useState("连接服务器开始 1v1。"), [playerId, setPlayerId] = useState(null), [players, setPlayers] = useState([]), [roomId, setRoomId] = useState(null);
  const [hud, setHud] = useState({ ammo: 30, reserve: 120, hp: 100, score: 0, kills: 0, deaths: 0, fps: 0, weapon: 0, reloading: false });
  const scoreText = useMemo(() => { const me = players.find((p) => p.id === playerId), other = players.find((p) => p.id !== playerId); return `${me?.score ?? 0} : ${other?.score ?? 0}`; }, [players, playerId]);

  useEffect(() => {
    const saved = loadSens(); setSens(saved);
    const isMobile = matchMedia("(pointer: coarse)").matches || innerWidth < 860; setMobile(isMobile);
    const canvas = canvasRef.current, ctx = canvas?.getContext("2d", { alpha: false, desynchronized: true }); if (!canvas || !ctx) return undefined;
    document.body.style.overflow = "hidden"; canvas.tabIndex = 0;
    const keys = new Set(), audio = makeAudio(); audioRef.current = audio;
    const state = { running: true, started: false, mode: "solo", px: 1.5, py: 1.5, angle: 0, pitch: 0, vx: 0, vy: 0, recoil: 0, recoilVel: 0, bob: 0, muzzle: 0, hitFlash: 0, hp: 100, score: 0, kills: 0, deaths: 0, weapon: 0, ammo: [30, 12], reserve: [120, 48], reloadTimer: 0, nextShot: 0, fireHeld: false, ads: false, mobileMove: { x: 0, y: 0 }, sens: saved, now: 0, last: performance.now(), accumulator: 0, fpsFrames: 0, fpsClock: performance.now(), fps: 0, lastHud: 0, lastNet: 0, remote: null, localId: null, enemies: [{ x: 8.5, y: 2.8, hp: 100, alive: true }, { x: 12.4, y: 5.6, hp: 100, alive: true }, { x: 5.6, y: 9.2, hp: 100, alive: true }] };
    engineRef.current = state;
    window.__kbZeroEngine = state;
    const weapon = () => WEAPONS[state.weapon];
    const resize = () => { const dpr = Math.min(devicePixelRatio || 1, isMobile ? 1.35 : 1.75); canvas.width = Math.floor(innerWidth * dpr); canvas.height = Math.floor(innerHeight * dpr); canvas.style.width = `${innerWidth}px`; canvas.style.height = `${innerHeight}px`; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    const beginReload = () => { const w = weapon(); if (state.reloadTimer > 0 || state.ammo[state.weapon] === w.mag || state.reserve[state.weapon] <= 0) return; state.reloadTimer = state.weapon ? 1.16 : 1.42; audio.reload(); };
    const swap = (index = (state.weapon + 1) % 2) => { state.weapon = clamp(index, 0, 1); state.fireHeld = false; audio.swap(); };
    const shoot = () => {
      const w = weapon(); if (!state.started || state.reloadTimer > 0 || state.now < state.nextShot) return;
      if (state.ammo[state.weapon] <= 0) { beginReload(); return; }
      state.nextShot = state.now + w.interval; state.ammo[state.weapon] -= 1; state.muzzle = 1; state.recoilVel += state.ads ? w.recoil * .68 : w.recoil; audio.shot(w);
      const spread = state.ads ? w.adsSpread : w.spread, shotAngle = state.angle + (Math.random() - .5) * spread, wallDist = castRay(state.px, state.py, shotAngle).distance;
      if (state.mode === "pvp") {
        const target = state.remote; let hit = false;
        if (target?.alive) { const dx = target.x - state.px, dy = target.y - state.py, dist = Math.hypot(dx, dy), delta = Math.abs(angleDelta(Math.atan2(dy, dx), shotAngle)); hit = dist < wallDist + .1 && delta < Math.atan2(.42, dist); }
        if (hit) { state.hitFlash = 1; audio.hit(); }
        const ws = wsRef.current; if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "shoot", hit, damage: w.damage }));
        return;
      }
      let best;
      for (const e of state.enemies) { if (!e.alive) continue; const dx = e.x - state.px, dy = e.y - state.py, dist = Math.hypot(dx, dy), delta = Math.abs(angleDelta(Math.atan2(dy, dx), shotAngle)); if (dist < wallDist + .1 && delta < Math.atan2(.34, dist) && (!best || dist < best.dist)) best = { e, dist }; }
      if (best) { best.e.hp -= w.damage; state.hitFlash = 1; audio.hit(); state.score += 15; if (best.e.hp <= 0) { best.e.alive = false; state.kills += 1; state.score += 100; audio.kill(); setTimeout(() => { best.e.hp = 100; best.e.alive = true; }, 2500); } }
    };
    const fixedUpdate = (dt) => {
      if (!state.started) return;
      const f = (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0) - (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0) - state.mobileMove.y;
      const s = (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) - (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0) + state.mobileMove.x;
      const forward = clamp(f, -1, 1), strafe = clamp(s, -1, 1), sprint = (keys.has("ShiftLeft") || keys.has("ShiftRight")) && forward > 0 && !state.ads, speed = (sprint ? 5.7 : state.ads ? 2.2 : 3.8) * .9, len = Math.hypot(forward, strafe) || 1;
      const tvx = (Math.cos(state.angle) * forward + Math.cos(state.angle + Math.PI / 2) * strafe) / len * speed, tvy = (Math.sin(state.angle) * forward + Math.sin(state.angle + Math.PI / 2) * strafe) / len * speed;
      state.vx += (tvx - state.vx) * Math.min(1, 18 * dt); state.vy += (tvy - state.vy) * Math.min(1, 18 * dt);
      const nx = state.px + state.vx * dt, ny = state.py + state.vy * dt; if (canStand(nx, state.py)) state.px = nx; else state.vx = 0; if (canStand(state.px, ny)) state.py = ny; else state.vy = 0;
      state.bob += Math.hypot(state.vx, state.vy) * dt * 2.2; state.recoilVel += -state.recoil * 42 * dt; state.recoilVel *= Math.exp(-12 * dt); state.recoil += state.recoilVel * dt; state.recoil = clamp(state.recoil, -.012, .14); state.muzzle *= Math.exp(-35 * dt); state.hitFlash *= Math.exp(-20 * dt);
      if (state.reloadTimer > 0) { state.reloadTimer -= dt; if (state.reloadTimer <= 0) { const w = weapon(), n = Math.min(w.mag - state.ammo[state.weapon], state.reserve[state.weapon]); state.ammo[state.weapon] += n; state.reserve[state.weapon] -= n; } }
      if (state.fireHeld) shoot();
      if (state.mode === "solo") for (const e of state.enemies) { if (!e.alive) continue; const dx = state.px - e.x, dy = state.py - e.y, d = Math.hypot(dx, dy); if (d > 3.2 && d < 9.8) { const ex = e.x + dx / d * .54 * dt, ey = e.y + dy / d * .54 * dt; if (!isWall(ex, e.y)) e.x = ex; if (!isWall(e.x, ey)) e.y = ey; } }
      if (state.mode === "pvp" && state.now - state.lastNet > .05) { state.lastNet = state.now; const ws = wsRef.current; if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "state", x: state.px, y: state.py, yaw: state.angle, pitch: state.pitch, weapon: state.weapon })); }
    };
    const drawTarget = (target, horizon, fov, pvp = false) => {
      if (!target?.alive) return; const dx = target.x - state.px, dy = target.y - state.py, distance = Math.hypot(dx, dy), delta = angleDelta(Math.atan2(dy, dx), state.angle); if (Math.abs(delta) >= fov * .65 || castRay(state.px, state.py, state.angle + delta).distance + .08 < distance) return;
      const h = innerHeight, w = innerWidth, scale = h / Math.max(.2, distance), x = w * .5 + (delta / fov) * w, y = horizon, radius = scale * (pvp ? .30 : .24);
      ctx.save(); ctx.translate(x, y); ctx.shadowBlur = pvp ? 38 : 24; ctx.shadowColor = pvp ? "rgba(90,190,255,.95)" : "rgba(158,91,255,.9)"; ctx.fillStyle = pvp ? "#61c6ff" : "#7d4cff"; ctx.beginPath(); ctx.arc(0, 0, radius * .42, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = pvp ? "rgba(86,184,255,.42)" : "rgba(164,91,255,.35)"; ctx.fillRect(-radius * .28, radius * .35, radius * .56, radius * 1.35); ctx.restore();
    };
    const draw = () => {
      const w = innerWidth, h = innerHeight, horizon = h * .5 + state.pitch * h + state.recoil * h * 1.25, moveSpeed = Math.hypot(state.vx, state.vy), fov = (state.ads ? .72 : 1) * Math.PI / 2.9;
      ctx.fillStyle = "#05040a"; ctx.fillRect(0, 0, w, h); const sky = ctx.createLinearGradient(0, 0, 0, horizon); sky.addColorStop(0, "#07050f"); sky.addColorStop(.72, "#141020"); sky.addColorStop(1, "#2a1744"); ctx.fillStyle = sky; ctx.fillRect(0, 0, w, Math.max(0, horizon)); const floor = ctx.createLinearGradient(0, horizon, 0, h); floor.addColorStop(0, "#181020"); floor.addColorStop(1, "#040406"); ctx.fillStyle = floor; ctx.fillRect(0, Math.max(0, horizon), w, h - horizon);
      const columns = Math.min(900, Math.max(320, Math.floor(w * .72))), cw = w / columns; for (let i = 0; i < columns; i += 1) { const sx = i * cw, a = state.angle + (i / columns - .5) * fov, ray = castRay(state.px, state.py, a), corrected = ray.distance * Math.cos(a - state.angle), wh = Math.min(h * 1.8, h / Math.max(.08, corrected)), top = horizon - wh * .5, shade = clamp(1 - corrected / 18, .13, .95) * (ray.side ? .82 : 1), purple = Math.floor(38 + shade * 82); ctx.fillStyle = `rgb(${Math.floor(purple * .52)},${Math.floor(purple * .35)},${purple})`; ctx.fillRect(sx, top, cw + .8, wh); }
      if (state.mode === "pvp") drawTarget(state.remote, horizon, fov, true); else state.enemies.forEach((e) => drawTarget(e, horizon, fov, false));
      const bobY = Math.sin(state.bob) * Math.min(7, moveSpeed * 1.35), bobX = Math.cos(state.bob * .5) * Math.min(5, moveSpeed * .8), ads = state.ads ? 1 : 0, baseGX = state.weapon === 0 ? w * .71 : w * .68, gunX = baseGX + bobX + ads * (w * .5 - baseGX), gunY = h * .77 + bobY + state.muzzle * 8 + ads * 20;
      ctx.save(); ctx.translate(gunX, gunY); ctx.rotate(-.09 - state.recoil * .12); const gg = ctx.createLinearGradient(-120, -50, 120, 70); gg.addColorStop(0, "#121018"); gg.addColorStop(.55, state.weapon ? "#1f2c4e" : "#33204d"); gg.addColorStop(1, state.weapon ? "#6aa7ff" : "#8155ef"); ctx.fillStyle = gg; ctx.beginPath(); ctx.moveTo(-86, 42); ctx.lineTo(-40, -22); ctx.lineTo(92, -30); ctx.lineTo(148, -5); ctx.lineTo(108, 23); ctx.lineTo(22, 34); ctx.lineTo(-22, 68); ctx.closePath(); ctx.fill(); ctx.restore();
      const cx = w / 2, cy = h / 2, gap = 7 + moveSpeed * .8; ctx.strokeStyle = state.hitFlash > .15 ? "#fff" : "rgba(221,201,255,.8)"; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(cx-gap-9,cy); ctx.lineTo(cx-gap,cy); ctx.moveTo(cx+gap,cy); ctx.lineTo(cx+gap+9,cy); ctx.moveTo(cx,cy-gap-9); ctx.lineTo(cx,cy-gap); ctx.moveTo(cx,cy+gap); ctx.lineTo(cx,cy+gap+9); ctx.stroke();
      state.fpsFrames += 1; if (performance.now() - state.fpsClock > 500) { state.fps = Math.round(state.fpsFrames * 1000 / (performance.now() - state.fpsClock)); state.fpsFrames = 0; state.fpsClock = performance.now(); }
      if (state.now - state.lastHud > .08) { state.lastHud = state.now; setHud({ ammo: state.ammo[state.weapon], reserve: state.reserve[state.weapon], hp: state.hp, score: state.score, kills: state.kills, deaths: state.deaths, fps: state.fps, weapon: state.weapon, reloading: state.reloadTimer > 0 }); }
    };
    const onGyro = (e) => {
      if (!gyroEnabledRef.current || !state.started) return;
      const alpha = Number.isFinite(e.alpha) ? e.alpha : null, beta = Number(e.beta), gamma = Number(e.gamma);
      if (!Number.isFinite(beta) || !Number.isFinite(gamma)) return;
      if (!gyroBaseRef.current) gyroBaseRef.current = { alpha: alpha ?? 0, beta, gamma, angle: orientationAngle(), baseYaw: state.angle, basePitch: state.pitch };
      const base = gyroBaseRef.current, screenAngle = orientationAngle();
      const yawRel = alpha == null ? -degreeDelta(gamma, base.gamma) : -degreeDelta(alpha, base.alpha);
      let pitchRel = degreeDelta(beta, base.beta);
      if (screenAngle === 90) pitchRel = degreeDelta(gamma, base.gamma);
      else if (screenAngle === 270) pitchRel = -degreeDelta(gamma, base.gamma);
      const scale = .0062 * state.sens.gyro * (state.ads ? state.sens.ads : 1);
      state.angle = base.baseYaw + clamp(yawRel, -38, 38) * scale;
      state.pitch = clamp(base.basePitch - clamp(pitchRel, -30, 30) * scale * .82, -.19, .19);
    };
    const onKeyDown = (e) => { if (["KeyW","KeyA","KeyS","KeyD","ArrowUp","ArrowDown","ArrowLeft","ArrowRight","ShiftLeft","ShiftRight","KeyR","KeyQ","Digit1","Digit2"].includes(e.code)) e.preventDefault(); keys.add(e.code); if (e.code === "KeyR") beginReload(); if (e.code === "KeyQ") swap(); if (e.code === "Digit1") swap(0); if (e.code === "Digit2") swap(1); };
    const onKeyUp = (e) => keys.delete(e.code), onMouseMove = (e) => { if (document.pointerLockElement !== canvas) return; const s = (state.ads ? .00105 * state.sens.ads : .0017) * state.sens.mouse; state.angle += e.movementX * s; state.pitch = clamp(state.pitch - e.movementY * s, -.19, .19); }, onMouseDown = (e) => { if (!state.started) return; if (document.pointerLockElement !== canvas) { canvas.requestPointerLock?.(); return; } if (e.button === 0) { state.fireHeld = true; shoot(); } if (e.button === 2) state.ads = true; }, onMouseUp = (e) => { if (e.button === 0) state.fireHeld = false; if (e.button === 2) state.ads = false; };
    document.addEventListener("keydown", onKeyDown, true); document.addEventListener("keyup", onKeyUp, true); addEventListener("mousemove", onMouseMove); addEventListener("mousedown", onMouseDown); addEventListener("mouseup", onMouseUp); addEventListener("deviceorientation", onGyro, true); addEventListener("resize", resize); canvas.addEventListener("contextmenu", (e) => e.preventDefault()); resize();
    const frame = (ts) => { if (!state.running) return; const dt = Math.min(.05, (ts - state.last) / 1000); state.last = ts; state.now = ts / 1000; state.accumulator = Math.min(.15, state.accumulator + dt); while (state.accumulator >= FIXED_DT) { fixedUpdate(FIXED_DT); state.accumulator -= FIXED_DT; } draw(); requestAnimationFrame(frame); }; requestAnimationFrame(frame);
    return () => { state.running = false; document.body.style.overflow = ""; if (window.__kbZeroEngine === state) delete window.__kbZeroEngine; document.removeEventListener("keydown", onKeyDown, true); document.removeEventListener("keyup", onKeyUp, true); removeEventListener("mousemove", onMouseMove); removeEventListener("mousedown", onMouseDown); removeEventListener("mouseup", onMouseUp); removeEventListener("deviceorientation", onGyro, true); removeEventListener("resize", resize); try { wsRef.current?.close(); } catch {} };
  }, []);

  const updateSens = (key, value) => { const next = { ...sens, [key]: Number(value) }; setSens(next); saveSens(next); if (engineRef.current) engineRef.current.sens = next; };
  const enterFullscreen = async () => { try { if (!document.fullscreenElement) await (canvasRef.current?.parentElement || document.documentElement).requestFullscreen?.({ navigationUI: "hide" }); } catch {} try { await screen.orientation?.lock?.("landscape"); } catch {} };
  const resetGyroCenter = () => { gyroBaseRef.current = null; };
  const startLocal = async () => { const s = engineRef.current; if (!s) return; audioRef.current?.unlock(); s.started = true; s.mode = "solo"; setMode("solo"); setStarted(true); await enterFullscreen(); resetGyroCenter(); canvasRef.current?.focus({ preventScroll: true }); if (!mobile) canvasRef.current?.requestPointerLock?.(); };
  const enableGyro = async () => { try { if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function" && await DeviceOrientationEvent.requestPermission() !== "granted") return; gyroBaseRef.current = null; gyroEnabledRef.current = true; setGyroActive(true); await enterFullscreen(); } catch {} };
  const disableGyro = () => { gyroEnabledRef.current = false; gyroBaseRef.current = null; setGyroActive(false); };
  const connectAndMatch = () => {
    setMatchOpen(true); setMatchStatus("matching"); setNotice("正在连接 1v1 服务器…"); try { wsRef.current?.close(); } catch {}
    const ws = new WebSocket(SERVER_WS); wsRef.current = ws;
    ws.onopen = () => { setNotice("服务器已连接，自动匹配中…"); ws.send(JSON.stringify({ type: "matchmake", name: "KB Pilot" })); };
    ws.onmessage = async (event) => { let d; try { d = JSON.parse(event.data); } catch { return; }
      if (d.type === "hello") setPlayerId(d.playerId);
      if (d.type === "joined") { setPlayerId(d.playerId); setRoomId(d.roomId); if (engineRef.current) engineRef.current.localId = d.playerId; setNotice(d.slot === 1 ? "已进入房间，等待对手。" : "已匹配，准备开始。"); }
      if (d.type === "room_update" || d.type === "snapshot") { const list = d.players || []; setPlayers(list); const me = list.find((p) => p.id === (engineRef.current?.localId || playerId)), other = list.find((p) => p.id !== (engineRef.current?.localId || playerId)); if (engineRef.current) { if (me) { engineRef.current.hp = me.hp; if (Math.hypot(engineRef.current.px - me.x, engineRef.current.py - me.y) > 3) { engineRef.current.px = me.x; engineRef.current.py = me.y; engineRef.current.angle = me.yaw; engineRef.current.pitch = me.pitch; } engineRef.current.kills = me.score; engineRef.current.deaths = me.deaths; } engineRef.current.remote = other || null; } if (d.status) setMatchStatus(d.status); if (d.status === "playing") await enterPvP(); }
      if (d.type === "countdown") { setMatchStatus("countdown"); setNotice("对手已加入，3 秒后进入实战。"); }
      if (d.type === "match_start") await enterPvP();
      if (d.type === "shot" && d.targetId === engineRef.current?.localId && d.hit) { if (engineRef.current) engineRef.current.hp = d.targetHp; }
      if (d.type === "kill") { setNotice(d.killerId === engineRef.current?.localId ? "你击败了对手" : "你被击败，等待复活"); audioRef.current?.kill(); }
      if (d.type === "respawn" && d.playerId === engineRef.current?.localId && engineRef.current) { engineRef.current.px = d.player.x; engineRef.current.py = d.player.y; engineRef.current.angle = d.player.yaw; engineRef.current.pitch = 0; engineRef.current.hp = 100; resetGyroCenter(); }
      if (d.type === "match_end") { setPlayers(d.players || []); setMatchStatus("finished"); setMatchOpen(true); setNotice(d.winnerId === engineRef.current?.localId ? "胜利" : "失败"); if (engineRef.current) engineRef.current.started = false; setStarted(false); }
    };
    ws.onerror = () => { setMatchStatus("error"); setNotice("服务器连接失败，请重试。Render 免费实例冷启动时可能需要几十秒。 "); };
    ws.onclose = () => setMatchStatus((v) => v === "finished" ? v : "idle");
  };
  const enterPvP = async () => { const s = engineRef.current; if (s) { s.mode = "pvp"; s.started = true; s.enemies.forEach((e) => { e.alive = false; }); } setMode("pvp"); setStarted(true); setMatchStatus("playing"); setMatchOpen(false); setNotice("1v1 实战中"); audioRef.current?.unlock(); await enterFullscreen(); resetGyroCenter(); if (!mobile) canvasRef.current?.requestPointerLock?.(); };
  const leaveMatch = () => { try { wsRef.current?.send(JSON.stringify({ type: "leave" })); wsRef.current?.close(); } catch {} const s = engineRef.current; if (s) { s.mode = "solo"; s.remote = null; } setMode("solo"); setMatchStatus("idle"); setPlayers([]); setRoomId(null); setMatchOpen(false); };
  const mobileLook = (dx, dy) => { const s = engineRef.current; if (!s) return; const base = .0042 * s.sens.touch * (s.ads ? s.sens.ads : 1); s.angle += dx * base; s.pitch = clamp(s.pitch - dy * base * .72, -.19, .19); };
  const setMobileMove = (x, y) => { if (engineRef.current) engineRef.current.mobileMove = { x, y }; };
  const fireMobile = (active) => { const s = engineRef.current; if (s) { s.fireHeld = active; audioRef.current?.unlock(); } };
  const adsMobile = (active) => { if (engineRef.current) engineRef.current.ads = active; };
  const reloadMobile = () => { const s = engineRef.current; if (!s) return; const w = WEAPONS[s.weapon]; if (s.reloadTimer <= 0 && s.ammo[s.weapon] < w.mag && s.reserve[s.weapon] > 0) { s.reloadTimer = s.weapon ? 1.16 : 1.42; audioRef.current?.reload(); } };
  const swapMobile = () => { const s = engineRef.current; if (s) { s.weapon = (s.weapon + 1) % 2; s.fireHeld = false; audioRef.current?.swap(); } };
  const currentWeapon = WEAPONS[hud.weapon];

  return <main className={`zeroShell${started ? " isPlaying" : ""}`}>
    <canvas ref={canvasRef} className="zeroCanvas" onClick={() => started && !mobile && canvasRef.current?.requestPointerLock?.()} />
    {!started && <a className="zeroBack" href="/">← 小KB</a>}
    <button className="zeroSettingsToggle" type="button" onClick={() => setSettingsOpen((v) => !v)}>SENS</button>
    {mobile && started && <button type="button" onClick={gyroActive ? disableGyro : enableGyro} style={{ position:"absolute", right:92, top:22, zIndex:10, color:"#fff", background:"rgba(8,6,14,.62)", border:"1px solid rgba(255,255,255,.12)", borderRadius:999, padding:"9px 13px" }}>{gyroActive ? "GYRO ON" : "GYRO"}</button>}
    {mobile && started && gyroActive && <button type="button" onClick={resetGyroCenter} style={{ position:"absolute", right:188, top:22, zIndex:10, color:"#fff", background:"rgba(8,6,14,.62)", border:"1px solid rgba(255,255,255,.12)", borderRadius:999, padding:"9px 13px" }}>校准</button>}
    {settingsOpen && <div className="zeroSensPanel"><strong>灵敏度</strong><Sens label="鼠标" value={sens.mouse} min=.35 max={2.2} onChange={(v) => updateSens("mouse", v)} /><Sens label="触摸视角" value={sens.touch} min=.35 max={2.6} onChange={(v) => updateSens("touch", v)} /><Sens label="陀螺仪" value={sens.gyro} min=.2 max={3} onChange={(v) => updateSens("gyro", v)} /><Sens label="开镜" value={sens.ads} min=.35 max={1.2} onChange={(v) => updateSens("ads", v)} /></div>}
    <div className="zeroLandscapeHint">请旋转手机进入横屏<br />若竖屏锁定，也可以继续操作</div>
    <div className="zeroTopHud"><span>KB // ZERO {mode === "pvp" ? "1V1" : "SOLO"}</span><em>{hud.fps || "—"} FPS</em></div>
    <div style={{ position:"absolute", left:"50%", top:58, transform:"translateX(-50%)", zIndex:7, padding:"7px 12px", border:"1px solid rgba(214,189,255,.12)", borderRadius:999, background:"rgba(8,6,14,.48)", fontSize:11, letterSpacing:".14em" }}>{mode === "pvp" ? scoreText : `KB ${hud.kills} : ${hud.deaths} CORE`}</div>
    <div className="zeroHealth"><i style={{ width:`${hud.hp}%` }} /><span>{hud.hp}</span></div>
    <div className="zeroScore"><small>SCORE</small><strong>{String(hud.score).padStart(6,"0")}</strong></div>
    <div className={`zeroAmmo${hud.reloading ? " isReloading" : ""}`}><strong>{hud.ammo}</strong><span>/ {hud.reserve}</span><small>{hud.reloading ? "RECALIBRATING" : `${currentWeapon.id} // ${currentWeapon.mode}`}</small></div>
    <div className="zeroWeaponSlots"><span className={hud.weapon === 0 ? "active" : ""}>1&nbsp; VX-01</span><span className={hud.weapon === 1 ? "active" : ""}>2&nbsp; K-9</span></div>
    {!started && <section className="zeroIntro"><span>KB LAB // COMBAT</span><h1>KB // ZERO</h1><p>单人训练或直接进入真实 1v1。匹配成功后会自动进入实战画面，不再卡在匹配面板。</p><button type="button" onClick={startLocal}>进入训练场</button><button type="button" onClick={connectAndMatch} style={{ marginLeft:10 }}>开始 1v1 匹配</button><small>{mobile ? "横屏 · 四指键位 · GYRO 当前姿态校准 · SENS 独立陀螺仪灵敏度" : "WASD · 鼠标视角 · 左键开火 · 右键开镜"}</small></section>}
    {matchOpen && <section style={{ position:"absolute", right:24, top:70, zIndex:30, width:300, padding:18, border:"1px solid rgba(210,185,255,.16)", borderRadius:18, background:"rgba(8,6,14,.94)", backdropFilter:"blur(22px)" }}><strong>KB ZERO 1v1</strong><p style={{ color:"rgba(230,220,248,.62)", fontSize:12, lineHeight:1.6 }}>{notice}</p><div style={{ fontSize:28, fontWeight:700 }}>{scoreText}</div><small>{roomId ? `ROOM ${roomId}` : matchStatus}</small><div style={{ display:"flex", gap:8, marginTop:14 }}><button type="button" onClick={connectAndMatch}>重新匹配</button><button type="button" onClick={enterPvP} disabled={matchStatus !== "playing" && matchStatus !== "countdown"}>进入对战</button><button type="button" onClick={leaveMatch}>离开</button></div></section>}
    {started && mobile && <MobileControls onMove={setMobileMove} onLook={mobileLook} onFire={fireMobile} onAds={adsMobile} onReload={reloadMobile} onSwap={swapMobile} />}
  </main>;
}

function Sens({ label, value, min, max, onChange }) { return <label>{label}<input type="range" min={min} max={max} step="0.05" value={value} onChange={(e) => onChange(e.target.value)} /><em>{Number(value).toFixed(2)}</em></label>; }
function MobileControls({ onMove, onLook, onFire, onAds, onReload, onSwap }) {
  const move = useRef({ id:null, ox:0, oy:0 }), look = useRef({ id:null, x:0, y:0 }); const stop = (e) => { e.preventDefault(); e.stopPropagation(); };
  const ms = (e) => { stop(e); const t=e.changedTouches[0]; move.current={id:t.identifier,ox:t.clientX,oy:t.clientY}; }, mm = (e) => { stop(e); const s=move.current,t=Array.from(e.changedTouches).find((x)=>x.identifier===s.id); if(t) onMove(clamp((t.clientX-s.ox)/56,-1,1),clamp((t.clientY-s.oy)/56,-1,1)); }, me = (e) => { stop(e); onMove(0,0); move.current={id:null,ox:0,oy:0}; };
  const ls = (e) => { stop(e); const t=e.changedTouches[0]; look.current={id:t.identifier,x:t.clientX,y:t.clientY}; }, lm = (e) => { stop(e); const s=look.current,t=Array.from(e.changedTouches).find((x)=>x.identifier===s.id); if(t){onLook(t.clientX-s.x,t.clientY-s.y);s.x=t.clientX;s.y=t.clientY;} };
  return <div className="zeroMobileControls"><div className="zeroMovePad" onTouchStart={ms} onTouchMove={mm} onTouchEnd={me} onTouchCancel={me}><i /></div><div className="zeroLookPad" onTouchStart={ls} onTouchMove={lm}/><button className="zeroFire zeroFireLeft" onTouchStart={(e)=>{stop(e);onFire(true)}} onTouchEnd={(e)=>{stop(e);onFire(false)}}>FIRE</button><button className="zeroFire zeroFireRight" onTouchStart={(e)=>{stop(e);onFire(true)}} onTouchEnd={(e)=>{stop(e);onFire(false)}}>FIRE</button><button className="zeroAds" onTouchStart={(e)=>{stop(e);onAds(true)}} onTouchEnd={(e)=>{stop(e);onAds(false)}}>ADS</button><button className="zeroReload" onClick={onReload}>R</button><button className="zeroSwap" onClick={onSwap}>SWAP</button></div>;
}
