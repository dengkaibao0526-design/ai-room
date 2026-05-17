"use client";

import { useState } from "react";

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadData() {
    setLoading(true);
    setError("");
    setData(null);

    try {
      const res = await fetch(
        `/api/admin/stats?password=${encodeURIComponent(password)}`
      );

      const json = await res.json();

      if (!res.ok || !json.ok) {
        setError(json.error || "后台读取失败");
        return;
      }

      setData(json);
    } catch (err) {
      setError("页面出错了，刷新再试一次");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={page}>
      <h1>小KB 后台</h1>

      <div style={loginBox}>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="输入后台密码"
          style={input}
        />

        <button onClick={loadData} style={button}>
          {loading ? "加载中..." : "查看数据"}
        </button>
      </div>

      {error && <p style={{ color: "#ff6b6b" }}>{error}</p >}

      {data && (
        <>
          <div style={grid}>
            <Card title="总用户" value={data.stats?.totalUsers ?? 0} />
            <Card title="总消息" value={data.stats?.totalMessages ?? 0} />
            <Card title="今日消息" value={data.stats?.todayMessages ?? 0} />
            <Card title="在线人数" value={data.stats?.onlineUsers ?? 0} />
          </div>

          <h2 style={{ marginTop: 34 }}>最近聊天</h2>

          <div style={logList}>
            {(data.logs || []).map((item) => (
              <div key={item.id} style={logCard}>
                <p style={time}>{item.created_at}</p >

                <p>
                  <b>用户：</b>
                  {item.user_message}
                </p >

                <p>
                  <b>小KB：</b>
                  {item.ai_reply}
                </p >
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}

function Card({ title, value }) {
  return (
    <div style={card}>
      <p style={{ margin: 0, opacity: 0.65 }}>{title}</p >
      <h2 style={{ margin: "8px 0 0" }}>{value}</h2>
    </div>
  );
}

const page = {
  minHeight: "100vh",
  height: "auto",
  overflowY: "auto",
  background: "#05030a",
  color: "white",
  padding: 24,
  paddingBottom: 90,
  fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
};

const loginBox = {
  display: "flex",
  gap: 10,
  marginTop: 20,
  marginBottom: 24,
};

const input = {
  flex: 1,
  minWidth: 0,
  padding: 12,
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.15)",
  background: "#111827",
  color: "white",
};

const button = {
  padding: "12px 16px",
  borderRadius: 12,
  border: 0,
  background: "#8b5cf6",
  color: "white",
  fontWeight: 700,
  whiteSpace: "nowrap",
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: 12,
};

const card = {
  padding: 16,
  borderRadius: 16,
  background: "rgba(139,92,246,0.18)",
  border: "1px solid rgba(255,255,255,0.1)",
};

const logList = {
  display: "grid",
  gap: 14,
  paddingBottom: 60,
};

const logCard = {
  padding: 16,
  borderRadius: 16,
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.1)",
  lineHeight: 1.6,
  wordBreak: "break-word",
};

const time = {
  opacity: 0.55,
  fontSize: 12,
};
