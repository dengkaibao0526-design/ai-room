"use client";

import { useEffect, useState } from "react";

export default function AdminPage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    async function load() {
      const res = await fetch(
        "/api/admin/stats?password=123456"
      );

      const json = await res.json();

      setData(json);
    }

    load();
  }, []);

  if (!data) {
    return (
      <div style={{
        color: "white",
        padding: 40
      }}>
        加载中...
      </div>
    );
  }

  return (
    <div
      style={{
        background: "#0f172a",
        minHeight: "100vh",
        color: "white",
        padding: 30,
        fontFamily: "Arial"
      }}
    >
      <h1>AI后台</h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3,1fr)",
          gap: 20,
          marginTop: 30
        }}
      >
        <div style={card}>
          <h2>总用户</h2>
          <p>{data.stats.totalUsers}</p >
        </div>

        <div style={card}>
          <h2>总消息</h2>
          <p>{data.stats.totalMessages}</p >
        </div>

        <div style={card}>
          <h2>今日消息</h2>
          <p>{data.stats.todayMessages}</p >
        </div>
      </div>

      <h2 style={{ marginTop: 50 }}>
        聊天记录
      </h2>

      <div style={{ marginTop: 20 }}>
        {data.logs.map((item) => (
          <div
            key={item.id}
            style={{
              background: "#1e293b",
              padding: 20,
              borderRadius: 12,
              marginBottom: 20
            }}
          >
            <p>
              <b>用户：</b>
              {item.user_message}
            </p >

            <p style={{ marginTop: 10 }}>
              <b>AI：</b>
              {item.ai_reply}
            </p >

            <p
              style={{
                marginTop: 10,
                opacity: 0.6,
                fontSize: 12
              }}
            >
              {item.created_at}
            </p >
          </div>
        ))}
      </div>
    </div>
  );
}

const card = {
  background: "#1e293b",
  padding: 20,
  borderRadius: 12
};
