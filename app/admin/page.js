"use client";

import { useEffect, useMemo, useState } from "react";

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [data, setData] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadData(inputPassword) {
    const finalPassword = inputPassword || password;

    if (!finalPassword) {
      setError("请输入后台密码");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/stats", {
        method: "GET",
        cache: "no-store",
        headers: {
          "x-admin-password": finalPassword,
        },
      });

      const text = await res.text();

      let json;
      try {
        json = JSON.parse(text);
      } catch {
        throw new Error("后台接口返回的不是 JSON");
      }

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "后台读取失败");
      }

      setData(json);
      localStorage.setItem("xiaokb_admin_password", finalPassword);
    } catch (err) {
      console.error("ADMIN_PAGE_ERROR:", err);
      setError(err.message || "页面出错了，刷新再试一次");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const savedPassword = localStorage.getItem("xiaokb_admin_password");

    if (savedPassword) {
      setPassword(savedPassword);
      loadData(savedPassword);
    }
  }, []);

  const stats = data?.stats || {};
  const users = Array.isArray(data?.users) ? data.users : [];
  const logs = Array.isArray(data?.logs) ? data.logs : [];
  const keywords = Array.isArray(data?.keywords) ? data.keywords : [];
  const topics = Array.isArray(data?.topics) ? data.topics : [];

  const selectedUser = users.find((user) => user.user_id === selectedUserId);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchUser =
        selectedUserId === "all" || log.user_id === selectedUserId;

      const keyword = searchText.trim().toLowerCase();

      const matchSearch =
        !keyword ||
        String(log.user_message || "").toLowerCase().includes(keyword) ||
        String(log.ai_reply || "").toLowerCase().includes(keyword) ||
        String(log.user_id || "").toLowerCase().includes(keyword);

      return matchUser && matchSearch;
    });
  }, [logs, selectedUserId, searchText]);

  return (
    <main style={styles.page}>
      <section style={styles.hero}>
        <div>
          <div style={styles.badge}>XIAOKB ADMIN · V4</div>
          <h1 style={styles.title}>小KB 后台</h1>
          <p style={styles.subtitle}>
            数据总览、用户分组、关键词分析、话题分类、最近聊天记录
          </p >
        </div>

        <button
          style={styles.refreshButton}
          onClick={() => loadData(password)}
          disabled={loading}
        >
          {loading ? "刷新中..." : "刷新数据"}
        </button>
      </section>

      <section style={styles.loginCard}>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="输入后台密码"
          style={styles.input}
          type="password"
        />

        <button
          onClick={() => loadData(password)}
          style={styles.mainButton}
          disabled={loading}
        >
          {loading ? "加载中..." : "查看数据"}
        </button>
      </section>

      {error && <div style={styles.errorBox}>{error}</div>}

      {data && (
        <>
          <section style={styles.statsGrid}>
            <StatCard
              title="总用户"
              value={stats.totalUsers ?? 0}
              note="进入过网站的浏览器数量"
            />
            <StatCard
              title="在线人数"
              value={stats.onlineUsers ?? 0}
              note="最近 5 分钟活跃"
            />
            <StatCard
              title="总消息"
              value={stats.totalMessages ?? 0}
              note="数据库全部聊天数"
            />
            <StatCard
              title="今日消息"
              value={stats.todayMessages ?? 0}
              note="北京时间今日"
            />
            <StatCard
              title="今日活跃用户"
              value={stats.todayActiveUsers ?? 0}
              note="今天来过的人"
            />
            <StatCard
              title="分析消息数"
              value={stats.analyzedMessages ?? 0}
              note="本页分析最近消息"
            />
          </section>

          <section style={styles.metaCard}>
            <span>接口版本：{data.version || "-"}</span>
            <span>时区：{data.timezone || "Asia/Shanghai"}</span>
            <span>{data.onlineRule || "最近 5 分钟有心跳的用户算在线"}</span>
          </section>

          <section style={styles.dashboardGrid}>
            <div style={styles.panel}>
              <div style={styles.panelHeader}>
                <h2>用户分组</h2>
                <span>{users.length} 个用户</span>
              </div>

              <div style={styles.userList}>
                <button
                  style={{
                    ...styles.userCard,
                    ...(selectedUserId === "all" ? styles.activeUserCard : {}),
                  }}
                  onClick={() => setSelectedUserId("all")}
                >
                  <div style={styles.userTop}>
                    <strong>全部用户</strong>
                    <span style={styles.userCount}>{logs.length} 条</span>
                  </div>
                  <p style={styles.userDesc}>查看所有人的聊天记录</p >
                </button>

                {users.map((user) => (
                  <button
                    key={user.user_id}
                    style={{
                      ...styles.userCard,
                      ...(selectedUserId === user.user_id
                        ? styles.activeUserCard
                        : {}),
                    }}
                    onClick={() => setSelectedUserId(user.user_id)}
                  >
                    <div style={styles.userTop}>
                      <strong>{shortUserId(user.user_id)}</strong>
                      <span
                        style={{
                          ...styles.statusPill,
                          background: user.online
                            ? "rgba(34,197,94,0.16)"
                            : "rgba(148,163,184,0.14)",
                          color: user.online ? "#86efac" : "#cbd5e1",
                        }}
                      >
                        {user.online ? "在线" : "离线"}
                      </span>
                    </div>

                    <p style={styles.userDesc}>
                      {user.messageCount} 条消息 · 主要话题：
                      {user.mainTopic || "暂无"}
                    </p >

                    <p style={styles.userTime}>
                      最近活跃：
                      {user.lastSeenBeijing || user.lastMessageAtBeijing || "暂无"}
                    </p >

                    {user.lastMessage && (
                      <p style={styles.lastMessage}>“{user.lastMessage}”</p >
                    )}
                  </button>
                ))}
              </div>
            </div>
            <div style={styles.sideStack}>
              <div style={styles.panel}>
                <div style={styles.panelHeader}>
                  <h2>热门话题</h2>
                  <span>{topics.length} 类</span>
                </div>

                {topics.length === 0 ? (
                  <EmptyText text="暂无话题数据" />
                ) : (
                  <div style={styles.topicList}>
                    {topics.slice(0, 8).map((topic) => (
                      <div key={topic.name} style={styles.topicRow}>
                        <span>{topic.name}</span>
                        <strong>{topic.count}</strong>
                      </div>
                    ))}
                  </div>
                )}
              </div>
               <div style={styles.panel}>
                <div style={styles.panelHeader}>
                  <h2>关键词</h2>
                  <span>Top 30</span>
                </div>

                {keywords.length === 0 ? (
                  <EmptyText text="多聊几句后会出现关键词" />
                ) : (
                  <div style={styles.keywordWrap}>
                    {keywords.slice(0, 30).map((item) => (
                      <span key={item.word} style={styles.keyword}>
                        {item.word} · {item.count}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          {selectedUser && (
            <section style={styles.panel}>
              <div style={styles.panelHeader}>
                <h2>用户详情</h2>
                <span>{shortUserId(selectedUser.user_id)}</span>
              </div>

              <div style={styles.userDetailGrid}>
                <DetailItem label="用户 ID" value={selectedUser.user_id} />
                <DetailItem label="消息数" value={selectedUser.messageCount} />
                <DetailItem
                  label="在线状态"
                  value={selectedUser.online ? "在线" : "离线"}
                />
                <DetailItem
                  label="最后活跃"
                  value={
                    selectedUser.lastSeenBeijing ||
                    selectedUser.lastMessageAtBeijing ||
                    "暂无"
                  }
                />
                <DetailItem
                  label="主要话题"
                  value={selectedUser.mainTopic || "暂无"}
                />
                <DetailItem
                  label="最后发言"
                  value={selectedUser.lastMessage || "暂无"}
                />
              </div>
            </section>
          )}

          <section style={styles.panel}>
            <div style={styles.panelHeader}>
              <div>
                <h2>最近聊天</h2>
                <p style={styles.panelSub}>
                  当前显示 {filteredLogs.length} 条，时间已按北京时间展示
                </p >
              </div>

              <input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="搜索用户、消息、回复..."
                style={styles.searchInput}
              />
            </div>

            {filteredLogs.length === 0 ? (
              <EmptyText text="暂无匹配聊天记录" />
            ) : (
              <div style={styles.logList}>
                {filteredLogs.map((log, index) => (
                  <div key={log.id || index} style={styles.logCard}>
                    <div style={styles.logTop}>
                      <span>
                        {log.created_at_beijing ||
                          formatBeijingTime(log.created_at)}
                      </span>
                      <span>{shortUserId(log.user_id)}</span>
                    </div>

                    <div style={styles.topicTags}>
                      {(log.topics || []).map((topic) => (
                        <span key={topic} style={styles.topicTag}>
                          {topic}
                        </span>
                      ))}
                    </div>

                    <p style={styles.messageLine}>
                      <b>用户：</b>
                      {log.user_message || "空消息"}
                    </p >

                    <p style={styles.messageLine}>
                      <b>小KB：</b>
                      {log.ai_reply || "空回复"}
                    </p >
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}

function StatCard({ title, value, note }) {
  return (
    <div style={styles.statCard}>
      <p style={styles.statTitle}>{title}</p >
      <h2 style={styles.statValue}>{value}</h2>
      <p style={styles.statNote}>{note}</p >
    </div>
  );
}

function DetailItem({ label, value }) {
  return (
    <div style={styles.detailItem}>
      <p>{label}</p >
      <strong>{value}</strong>
    </div>
  );
}

function EmptyText({ text }) {
  return <p style={styles.empty}>{text}</p >;
}

function shortUserId(value) {
  if (!value) return "anonymous";

  const text = String(value);

  if (text === "anonymous") return "anonymous";

  if (text.length <= 12) return text;

  return `${text.slice(0, 6)}...${text.slice(-4)}`;
}

function formatBeijingTime(value) {
  if (!value) return "暂无时间";

  try {
    return new Intl.DateTimeFormat("zh-CN", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(new Date(value));
  } catch {
    return String(value);
  }
}

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top left, rgba(139,92,246,0.28), transparent 34%), #05030a",
    color: "white",
    padding: 24,
    paddingBottom: 90,
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  hero: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
    marginBottom: 22,
  },
  badge: {
    display: "inline-flex",
    padding: "6px 10px",
    borderRadius: 999,
    background: "rgba(139,92,246,0.18)",
    border: "1px solid rgba(167,139,250,0.25)",
    color: "#c4b5fd",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 42,
    margin: "16px 0 8px",
    lineHeight: 1.05,
  },
  subtitle: {
    margin: 0,
    color: "rgba(255,255,255,0.62)",
    lineHeight: 1.5,
  },
  refreshButton: {
    padding: "12px 16px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.08)",
    color: "white",
    fontWeight: 800,
    whiteSpace: "nowrap",
  },
    loginCard: {
    display: "flex",
    gap: 12,
    marginBottom: 22,
  },
  input: {
    flex: 1,
    minWidth: 0,
    padding: "14px 16px",
    borderRadius: 16,
    border: "1px solid rgba(148,163,184,0.35)",
    background: "rgba(15,23,42,0.92)",
    color: "white",
    fontSize: 16,
    outline: "none",
  },
  mainButton: {
    padding: "14px 20px",
    borderRadius: 16,
    border: 0,
    background: "linear-gradient(135deg, #8b5cf6, #7c3aed)",
    color: "white",
    fontWeight: 900,
    fontSize: 15,
    whiteSpace: "nowrap",
  },
  errorBox: {
    padding: 14,
    borderRadius: 16,
    marginBottom: 18,
    background: "rgba(239,68,68,0.12)",
    border: "1px solid rgba(248,113,113,0.28)",
    color: "#fecaca",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    padding: 18,
    borderRadius: 22,
    background: "rgba(39,22,71,0.78)",
    border: "1px solid rgba(167,139,250,0.18)",
    boxShadow: "0 18px 45px rgba(0,0,0,0.18)",
  },
  statTitle: {
    margin: 0,
    color: "rgba(255,255,255,0.6)",
    fontSize: 15,
  },
  statValue: {
    margin: "10px 0 4px",
    fontSize: 34,
    lineHeight: 1,
  },
  statNote: {
    margin: 0,
    color: "rgba(255,255,255,0.42)",
    fontSize: 12,
    lineHeight: 1.4,
  },
  metaCard: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 18,
    padding: 14,
    borderRadius: 18,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "rgba(255,255,255,0.62)",
    fontSize: 13,
  },
  dashboardGrid: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 16,
    marginBottom: 16,
  },
  sideStack: {
    display: "grid",
    gap: 16,
  },
  panel: {
    padding: 18,
    borderRadius: 24,
    marginBottom: 16,
    background: "rgba(18,18,24,0.92)",
    border: "1px solid rgba(255,255,255,0.1)",
    boxShadow: "0 18px 60px rgba(0,0,0,0.22)",
  },
  panelHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 14,
  },
  panelSub: {
    margin: "4px 0 0",
    color: "rgba(255,255,255,0.45)",
    fontSize: 13,
  },
  userList: {
    display: "grid",
    gap: 10,
  },
  userCard: {
    width: "100%",
    textAlign: "left",
    padding: 14,
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.045)",
    color: "white",
  },
  activeUserCard: {
    background: "rgba(139,92,246,0.22)",
    border: "1px solid rgba(167,139,250,0.38)",
  },
  userTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  userCount: {
    color: "#c4b5fd",
    fontSize: 13,
  },
  userDesc: {
    margin: "8px 0 0",
    color: "rgba(255,255,255,0.62)",
    fontSize: 13,
    lineHeight: 1.45,
  },
  userTime: {
    margin: "6px 0 0",
    color: "rgba(255,255,255,0.38)",
    fontSize: 12,
  },
  lastMessage: {
    margin: "8px 0 0",
    color: "rgba(255,255,255,0.82)",
    fontSize: 13,
    lineHeight: 1.45,
  },
  statusPill: {
    padding: "4px 8px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800,
  },
  topicList: {
    display: "grid",
    gap: 10,
  },
  topicRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "11px 12px",
    borderRadius: 14,
    background: "rgba(255,255,255,0.055)",
    color: "rgba(255,255,255,0.82)",
  },
  keywordWrap: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },
  keyword: {
    padding: "7px 10px",
    borderRadius: 999,
    background: "rgba(139,92,246,0.16)",
    border: "1px solid rgba(167,139,250,0.18)",
    color: "#ddd6fe",
    fontSize: 13,
  },
  userDetailGrid: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 10,
  },
  detailItem: {
    padding: 14,
    borderRadius: 16,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.07)",
    wordBreak: "break-word",
  },
  searchInput: {
    width: 210,
    maxWidth: "45vw",
    padding: "10px 12px",
    borderRadius: 14,
    border: "1px solid rgba(148,163,184,0.3)",
    background: "rgba(15,23,42,0.9)",
    color: "white",
    outline: "none",
  },
  logList: {
    display: "grid",
    gap: 14,
  },
  logCard: {
    padding: 16,
    borderRadius: 20,
    background: "rgba(255,255,255,0.055)",
    border: "1px solid rgba(255,255,255,0.1)",
    lineHeight: 1.65,
    wordBreak: "break-word",
  },
  logTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    color: "rgba(255,255,255,0.45)",
    fontSize: 12,
    marginBottom: 10,
  },
  topicTags: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 10,
  },
  topicTag: {
    padding: "4px 8px",
    borderRadius: 999,
    background: "rgba(34,197,94,0.12)",
    color: "#bbf7d0",
    fontSize: 12,
  },
  messageLine: {
    margin: "10px 0 0",
    color: "rgba(255,255,255,0.9)",
  },
  empty: {
    margin: 0,
    color: "rgba(255,255,255,0.48)",
  },
};
