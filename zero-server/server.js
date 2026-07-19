import http from "node:http";
import { WebSocketServer } from "ws";

const PORT = Number(process.env.PORT || 10000);
const HOST = "0.0.0.0";
const TICK_RATE = 20;
const TICK_MS = 1000 / TICK_RATE;
const MAX_PLAYERS_PER_ROOM = 2;
const SCORE_LIMIT = 10;
const RESPAWN_MS = 2500;
const ROOM_TTL_MS = 30_000;

const rooms = new Map();
const clients = new Map();
let nextClientId = 1;
let nextRoomId = 1;

function now() {
  return Date.now();
}

function makeId(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}_${now().toString(36)}`;
}

function safeSend(ws, payload) {
  if (ws.readyState !== ws.OPEN) return;
  ws.send(JSON.stringify(payload));
}

function broadcast(room, payload) {
  for (const player of room.players.values()) {
    safeSend(player.ws, payload);
  }
}

function publicPlayer(player) {
  return {
    id: player.id,
    slot: player.slot,
    name: player.name,
    hp: player.hp,
    alive: player.alive,
    score: player.score,
    deaths: player.deaths,
    x: player.x,
    y: player.y,
    yaw: player.yaw,
    pitch: player.pitch,
    weapon: player.weapon,
    lastShotAt: player.lastShotAt,
    respawnAt: player.respawnAt,
  };
}

function roomSnapshot(room) {
  return {
    type: "snapshot",
    serverTime: now(),
    roomId: room.id,
    status: room.status,
    startsAt: room.startsAt,
    scoreLimit: SCORE_LIMIT,
    queue: room.queue,
    players: [...room.players.values()].map(publicPlayer),
  };
}

function createPlayer(ws, name = "KB Pilot") {
  return {
    id: `p${nextClientId++}`,
    ws,
    name: String(name || "KB Pilot").slice(0, 20),
    roomId: null,
    slot: 0,
    hp: 100,
    alive: true,
    score: 0,
    deaths: 0,
    x: 2.5,
    y: 2.5,
    yaw: 0,
    pitch: 0,
    weapon: 0,
    ready: false,
    lastShotAt: 0,
    respawnAt: 0,
    lastSeen: now(),
  };
}

function normalizeQueue(value) {
  return ["quick", "rookie", "ranked"].includes(value) ? value : "quick";
}

function createRoom(queue = "quick") {
  const id = `room_${nextRoomId++}`;
  const room = {
    id,
    status: "waiting",
    startsAt: null,
    createdAt: now(),
    updatedAt: now(),
    queue: normalizeQueue(queue),
    players: new Map(),
  };
  rooms.set(id, room);
  return room;
}

function findOpenRoom(queue = "quick") {
  const normalizedQueue = normalizeQueue(queue);
  for (const room of rooms.values()) {
    if (room.queue === normalizedQueue && room.status === "waiting" && room.players.size < MAX_PLAYERS_PER_ROOM) return room;
  }
  return createRoom(normalizedQueue);
}

function addPlayerToRoom(player, room) {
  player.roomId = room.id;
  player.slot = room.players.size + 1;
  player.x = player.slot === 1 ? 2.5 : 13.5;
  player.y = player.slot === 1 ? 2.5 : 13.5;
  player.yaw = player.slot === 1 ? 0 : Math.PI;
  player.pitch = 0;
  room.players.set(player.id, player);
  room.updatedAt = now();

  safeSend(player.ws, {
    type: "joined",
    playerId: player.id,
    slot: player.slot,
    roomId: room.id,
    tickRate: TICK_RATE,
    scoreLimit: SCORE_LIMIT,
    queue: room.queue,
  });

  broadcast(room, {
    type: "room_update",
    roomId: room.id,
    status: room.status,
    queue: room.queue,
    players: [...room.players.values()].map(publicPlayer),
  });

  if (room.players.size === MAX_PLAYERS_PER_ROOM) {
    room.status = "countdown";
    room.startsAt = now() + 3000;
    broadcast(room, { type: "countdown", startsAt: room.startsAt });
  }
}

function leaveRoom(player) {
  if (!player.roomId) return;
  const room = rooms.get(player.roomId);
  if (!room) return;

  room.players.delete(player.id);
  room.updatedAt = now();
  broadcast(room, { type: "player_left", playerId: player.id });

  player.roomId = null;
  player.ready = false;

  if (room.players.size === 0) {
    rooms.delete(room.id);
    return;
  }

  room.status = "waiting";
  room.startsAt = null;
  for (const remaining of room.players.values()) {
    remaining.slot = 1;
    remaining.hp = 100;
    remaining.alive = true;
    remaining.score = 0;
    remaining.deaths = 0;
    remaining.x = 2.5;
    remaining.y = 2.5;
    remaining.yaw = 0;
    remaining.pitch = 0;
  }
  broadcast(room, roomSnapshot(room));
}

function startRoom(room) {
  room.status = "playing";
  room.startsAt = null;
  room.updatedAt = now();
  for (const player of room.players.values()) {
    player.hp = 100;
    player.alive = true;
    player.score = 0;
    player.deaths = 0;
    player.respawnAt = 0;
  }
  broadcast(room, { type: "match_start", serverTime: now(), scoreLimit: SCORE_LIMIT });
}

function finishRoom(room, winner) {
  room.status = "finished";
  room.updatedAt = now();
  broadcast(room, {
    type: "match_end",
    winnerId: winner?.id || null,
    players: [...room.players.values()].map(publicPlayer),
  });
}

function handleState(player, data) {
  const room = rooms.get(player.roomId);
  if (!room || room.status !== "playing" || !player.alive) return;

  player.lastSeen = now();
  player.x = clampNumber(data.x, 0.5, 15.5, player.x);
  player.y = clampNumber(data.y, 0.5, 15.5, player.y);
  player.yaw = clampNumber(data.yaw, -1000, 1000, player.yaw);
  player.pitch = clampNumber(data.pitch, -1.2, 1.2, player.pitch);
  player.weapon = data.weapon === 1 ? 1 : 0;
}

function handleShoot(player, data) {
  const room = rooms.get(player.roomId);
  if (!room || room.status !== "playing" || !player.alive) return;

  const t = now();
  const minInterval = player.weapon === 1 ? 250 : 85;
  if (t - player.lastShotAt < minInterval) return;
  player.lastShotAt = t;

  const target = [...room.players.values()].find((p) => p.id !== player.id);
  if (!target || !target.alive) {
    broadcast(room, { type: "shot", playerId: player.id, weapon: player.weapon, hit: false, serverTime: t });
    return;
  }

  const damage = clampNumber(data.damage, 0, 80, player.weapon === 1 ? 72 : 34);
  const hit = data.hit === true;

  if (!hit) {
    broadcast(room, { type: "shot", playerId: player.id, weapon: player.weapon, hit: false, serverTime: t });
    return;
  }

  target.hp = Math.max(0, target.hp - damage);
  broadcast(room, {
    type: "shot",
    playerId: player.id,
    targetId: target.id,
    weapon: player.weapon,
    hit: true,
    damage,
    targetHp: target.hp,
    serverTime: t,
  });

  if (target.hp <= 0) {
    target.alive = false;
    target.deaths += 1;
    target.respawnAt = t + RESPAWN_MS;
    player.score += 1;

    broadcast(room, {
      type: "kill",
      killerId: player.id,
      victimId: target.id,
      scores: [...room.players.values()].map((p) => ({ id: p.id, score: p.score, deaths: p.deaths })),
      respawnAt: target.respawnAt,
    });

    if (player.score >= SCORE_LIMIT) finishRoom(room, player);
  }
}

function clampNumber(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function handleMessage(player, raw) {
  let data;
  try {
    data = JSON.parse(raw.toString());
  } catch {
    safeSend(player.ws, { type: "error", message: "Invalid JSON" });
    return;
  }

  if (data.type === "ping") {
    safeSend(player.ws, { type: "pong", serverTime: now() });
    return;
  }

  if (data.type === "matchmake") {
    if (player.roomId) leaveRoom(player);
    player.name = String(data.name || player.name).slice(0, 20);
    addPlayerToRoom(player, findOpenRoom(data.queue));
    return;
  }

  if (data.type === "leave") {
    leaveRoom(player);
    return;
  }

  if (data.type === "state") {
    handleState(player, data);
    return;
  }

  if (data.type === "shoot") {
    handleShoot(player, data);
    return;
  }

  safeSend(player.ws, { type: "error", message: `Unknown message type: ${data.type}` });
}

const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, service: "xiaokb-zero-server", rooms: rooms.size, clients: clients.size }));
    return;
  }

  res.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
  res.end("KB ZERO 1v1 WebSocket server is running. Use /health for status.\n");
});

const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  const player = createPlayer(ws);
  clients.set(player.id, player);

  safeSend(ws, {
    type: "hello",
    playerId: player.id,
    serverTime: now(),
    protocol: "kb-zero-1v1-v1",
  });

  ws.on("message", (raw) => handleMessage(player, raw));
  ws.on("close", () => {
    leaveRoom(player);
    clients.delete(player.id);
  });
  ws.on("error", () => {
    leaveRoom(player);
    clients.delete(player.id);
  });
});

setInterval(() => {
  const t = now();
  for (const room of rooms.values()) {
    if (room.status === "countdown" && room.startsAt && t >= room.startsAt) {
      startRoom(room);
    }

    if (room.status === "playing") {
      for (const player of room.players.values()) {
        if (!player.alive && player.respawnAt && t >= player.respawnAt) {
          player.hp = 100;
          player.alive = true;
          player.respawnAt = 0;
          player.x = player.slot === 1 ? 2.5 : 13.5;
          player.y = player.slot === 1 ? 2.5 : 13.5;
          player.yaw = player.slot === 1 ? 0 : Math.PI;
          player.pitch = 0;
          broadcast(room, { type: "respawn", playerId: player.id, player: publicPlayer(player) });
        }
      }
      broadcast(room, roomSnapshot(room));
    }

    if (room.status !== "playing" && room.players.size === 0 && t - room.updatedAt > ROOM_TTL_MS) {
      rooms.delete(room.id);
    }
  }
}, TICK_MS);

server.listen(PORT, HOST, () => {
  console.log(`KB ZERO 1v1 server listening on http://${HOST}:${PORT}`);
});
