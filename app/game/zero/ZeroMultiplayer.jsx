"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const SERVER_WS = "wss://xiaokb-zero-server.onrender.com";
const WAKE_TIMEOUT_MS = 70_000;

function send(ws, payload) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return false;
  ws.send(JSON.stringify(payload));
  return true;
}

function label(status) {
  if (status === "connected") return "已连接";
  if (status === "matching") return "匹配中";
  if (status === "countdown") return "倒计时";
  if (status === "playing") return "1v1 对战中";
  if (status === "finished") return "比赛结束";
  if (status === "error") return "连接失败";
  return "未连接";
}

export default function ZeroMultiplayer() {
  const wsRef = useRef(null);
  const wakeWsRef = useRef(null);
  const stateTimerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("idle");
  const [playerId, setPlayerId] = useState(null);
  const [roomId, setRoomId] = useState(null);
  const [players, setPlayers] = useState([]);
  const [notice, setNotice] = useState("连接 1v1 服务器，等待另一名玩家加入。");
  const [winnerId, setWinnerId] = useState(null);

  const scoreText = useMemo(() => {
    const me = players.find((p) => p.id === playerId);
    const other = players.find((p) => p.id !== playerId);
    return `${me?.score ?? 0} : ${other?.score ?? 0}`;
  }, [players, playerId]);

  useEffect(() => () => {
    clearInterval(stateTimerRef.current);
    try { wsRef.current?.close(); } catch {}
    try { wakeWsRef.current?.close(); } catch {}
  }, []);

  function connectAndMatch() {
    setOpen(true);
    setStatus("matching");
    setNotice("正在连接 KB ZERO 1v1 服务器…免费实例休眠时首次连接可能需要约 50 秒。");
    setWinnerId(null);

    try { wsRef.current?.close(); } catch {}
    const ws = new WebSocket(SERVER_WS);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("connected");
      setNotice("服务器已连接，正在自动匹配…");
      send(ws, { type: "matchmake", name: "KB Pilot" });
    };

    ws.onmessage = (event) => {
      let data;
      try { data = JSON.parse(event.data); } catch { return; }

      if (data.type === "hello") {
        setPlayerId(data.playerId);
        return;
      }

      if (data.type === "joined") {
        setPlayerId(data.playerId);
        setRoomId(data.roomId);
        setStatus("matching");
        setNotice(data.slot === 1 ? "已进入房间，等待第二名玩家。" : "已加入 1v1 房间，准备倒计时。");
        startStateLoop(ws);
        return;
      }

      if (data.type === "room_update") {
        setRoomId(data.roomId);
        setPlayers(data.players || []);
        setStatus(data.status === "waiting" ? "matching" : data.status);
        return;
      }

      if (data.type === "countdown") {
        setStatus("countdown");
        setNotice("对手已加入，3 秒后开始。打开两个设备/窗口即可实测。");
        return;
      }

      if (data.type === "match_start") {
        setStatus("playing");
        setNotice("1v1 已开始。当前先完成联网匹配、比分和状态同步。下一步接入真实位置/射击判定。");
        return;
      }

      if (data.type === "snapshot") {
        setRoomId(data.roomId);
        setPlayers(data.players || []);
        if (data.status) setStatus(data.status);
        return;
      }

      if (data.type === "kill") {
        setNotice(data.killerId === playerId ? "你击败了对手。" : "你被对手击败。等待复活。");
        return;
      }

      if (data.type === "match_end") {
        setStatus("finished");
        setWinnerId(data.winnerId);
        setPlayers(data.players || []);
        setNotice(data.winnerId === playerId ? "胜利。" : "失败。再来一局。");
        clearInterval(stateTimerRef.current);
        return;
      }

      if (data.type === "player_left") {
        setNotice("对手离开，房间已回到等待状态。");
      }
    };

    ws.onerror = () => {
      setStatus("error");
      setNotice("WebSocket 连接失败。服务器可能仍在冷启动，请等待几秒后重新匹配。");
    };

    ws.onclose = () => {
      clearInterval(stateTimerRef.current);
      setStatus((s) => (s === "error" || s === "finished" ? s : "idle"));
    };
  }

  function startStateLoop(ws) {
    clearInterval(stateTimerRef.current);
    stateTimerRef.current = setInterval(() => {
      const t = performance.now() / 1000;
      send(ws, {
        type: "state",
        x: 1.5 + Math.cos(t) * 0.08,
        y: 1.5 + Math.sin(t) * 0.08,
        yaw: t % (Math.PI * 2),
        pitch: 0,
        weapon: 0,
      });
    }, 1000 / 12);
  }

  function leave() {
    send(wsRef.current, { type: "leave" });
    try { wsRef.current?.close(); } catch {}
    clearInterval(stateTimerRef.current);
    setStatus("idle");
    setPlayers([]);
    setRoomId(null);
    setNotice("已离开 1v1 房间。");
  }

  function wakeServer() {
    setOpen(true);
    setNotice("正在通过 WebSocket 唤醒 Render 服务器…免费实例冷启动最多可能需要约 50 秒。");
    try { wakeWsRef.current?.close(); } catch {}

    const probe = new WebSocket(SERVER_WS);
    wakeWsRef.current = probe;
    let answered = false;
    const timer = setTimeout(() => {
      if (answered) return;
      try { probe.close(); } catch {}
      setNotice("服务器唤醒超时。请直接点“开始匹配”再试一次；匹配连接也会自动唤醒服务器。");
    }, WAKE_TIMEOUT_MS);

    probe.onmessage = (event) => {
      let data;
      try { data = JSON.parse(event.data); } catch { return; }
      if (data.type !== "hello") return;
      answered = true;
      clearTimeout(timer);
      setNotice("服务器已在线，WebSocket 响应正常。现在可以开始匹配。");
      try { probe.close(); } catch {}
    };

    probe.onerror = () => {
      if (answered) return;
      setNotice("服务器正在启动或网络连接未建立。可以直接点“开始匹配”，它会继续尝试连接。");
    };

    probe.onclose = () => {
      if (!answered) return;
      clearTimeout(timer);
    };
  }

  return (
    <div className={`zeroMultiplayer${open ? " isOpen" : ""}`}>
      {!open && <button type="button" onClick={() => setOpen(true)}>1v1</button>}
      {open && (
        <section>
          <header>
            <strong>KB ZERO 1v1</strong>
            <button type="button" onClick={() => setOpen(false)}>×</button>
          </header>
          <div className="zeroMpStatus"><span>{label(status)}</span><em>{scoreText}</em></div>
          <p>{notice}</p>
          <small>{roomId ? `ROOM ${roomId}` : SERVER_WS}</small>
          <div className="zeroMpPlayers">
            {[0, 1].map((index) => {
              const p = players[index];
              return <div key={index} className={p?.id === playerId ? "me" : ""}><b>{p ? (p.id === playerId ? "你" : "对手") : "等待中"}</b><span>{p ? `${p.hp} HP · ${p.score} 分` : "—"}</span></div>;
            })}
          </div>
          <div className="zeroMpActions">
            <button type="button" onClick={connectAndMatch}>{status === "idle" || status === "error" || status === "finished" ? "开始匹配" : "重新匹配"}</button>
            <button type="button" onClick={wakeServer}>唤醒</button>
            <button type="button" onClick={leave}>离开</button>
          </div>
        </section>
      )}
    </div>
  );
}
