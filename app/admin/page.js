"use client";

import { useEffect, useMemo, useState } from "react";

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [data, setData] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [activeTab, setActiveTab] = useState("logs");
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
        throw new Error("后台接口返回的不是 JSON，请检查 /api/admin/stats 是否报错。");
      }

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "后台读取失败");
      }

      setData(json);
      localStorage.setItem("xiaokb_admin_password", finalPassword);
    } catch (err) {
      console.error("ADMIN_PAGE_ERROR:", err);
      setError(err.message || "页面出错了，刷新再试一次");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("xiaokb_admin_password");
    setPassword("");
    setData(null);
    setSelectedUserId("all");
    setSearchText("");
    setError("");
  }

  useEffect(() => {
    const savedPassword = localStorage.getItem("xiaokb_admin_password");

    if (savedPassword) {
      setPassword(savedPassword);
      loadData(savedPassword);
    }
  }, []);

  const stats = data?.stats || {};
  const modes = data?.modes || {};
  const performance = data?.performance || {};

  const users = Array.isArray(data?.users) ? data.users : [];
  const logs = Array.isArray(data?.logs) ? data.logs : [];
  const keywords = Array.isArray(data?.keywords) ? data.keywords : [];
  const topics = Array.isArray(data?.topics) ? data.topics : [];
  const feedbacks = Array.isArray(data?.feedbacks) ? data.feedbacks : [];
  const models = Array.isArray(data?.models) ? data.models : [];

  const selectedUser = users.find((user) => user.user_id === selectedUserId);
  const onlineUsers = users.filter((user) => user.online);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchUser =
        selectedUserId === "all" || log.user_id === selectedUserId;

      const keyword = searchText.trim().toLowerCase();

      const matchSearch =
        !keyword ||
        String(log.user_message || "").toLowerCase().includes(keyword) ||
        String(log.ai_reply || "").toLowerCase().includes(keyword) ||
        String(log.user_id || "").toLowerCase().includes(keyword) ||
        String(log.mode || "").toLowerCase().includes(keyword) ||
        String(log.model || "").toLowerCase().includes(keyword);

      return matchUser && matchSearch;
    });
  }, [logs, selectedUserId, searchText]);

  return (
    <main style={styles.page}>
      <section style={styles.hero}>
        <div>
          <div style={styles.badge}>XIAOKB ADMIN · PREMIUM</div>

          <h1 style={styles.title}>小KB运营驾驶舱</h1>

          <p style={styles.subtitle}>
            聊天数据、在线状态、用户分组、模式占比、性能表现、关键词、话题和反馈。
          </p>
        </div>

        <div style={styles.heroActions}>
          {data && (
            <button style={styles.ghostButton} onClick={logout}>
              退出
            </button>
          )}

          <button
            style={styles.refreshButton}
            onClick={() => loadData(password)}
            disabled={loading}
          >
            {loading ? "刷新中..." : "刷新数据"}
          </button>
        </div>
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
              tone="green"
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
              tone="purple"
            />

            <StatCard
              title="今日活跃"
              value={stats.todayActiveUsers ?? 0}
              note="今天来过的人"
            />

            <StatCard
              title="分析消息"
              value={stats.analyzedMessages ?? 0}
              note="本页分析最近消息"
            />

            <StatCard
              title="总反馈"
              value={stats.totalFeedbacks ?? 0}
              note="用户提交的全部反馈"
            />

            <StatCard
              title="今日反馈"
              value={stats.todayFeedbacks ?? 0}
              note="北京时间今日反馈"
              tone="yellow"
            />

            <StatCard
              title="待处理"
              value={stats.openFeedbacks ?? 0}
              note="未关闭的反馈"
              tone="red"
            />
          </section>

          <section style={styles.metaCard}>
            <span>接口版本：{data.version || "-"}</span>
            <span>时区：{data.timezone || "Asia/Shanghai"}</span>
            <span>{data.onlineRule || "最近 5 分钟有心跳的用户算在线"}</span>
            <span>
              生成时间：
              {data.generated_at_beijing || formatBeijingTime(data.generated_at)}
            </span>
          </section>

          <section style={styles.insightGrid}>
            <div style={styles.panel}>
              <PanelHeader
                title="模式占比"
                desc="观察朋友们更常用日常聊天，还是学术研究。"
              />

              <div style={styles.modeGrid}>
                <ModeCard
                  title="日常聊天"
                  value={modes.daily ?? 0}
                  percent={modes.dailyPercent ?? 0}
                  note="daily"
                />

                <ModeCard
                  title="学术研究"
                  value={modes.research ?? 0}
                  percent={modes.researchPercent ?? 0}
                  note="research"
                />

                <ModeCard
                  title="未知模式"
                  value={modes.unknown ?? 0}
                  percent={modes.unknownPercent ?? 0}
                  note="老数据可能没有 mode 字段"
                />
              </div>
            </div>

            <div style={styles.panel}>
              <PanelHeader
                title="性能表现"
                desc="新版聊天接口写入 success / latency_ms 后会更准确。"
              />

              <div style={styles.detailGrid}>
                <DetailItem
                  label="成功率"
                  value={`${performance.successRate ?? 0}%`}
                />

                <DetailItem
                  label="成功数"
                  value={performance.successCount ?? 0}
                />

                <DetailItem
                  label="失败数"
                  value={performance.failedCount ?? 0}
                />

                <DetailItem
                  label="平均延迟"
                  value={formatLatency(performance.averageLatency)}
                />

                <DetailItem
                  label="最快"
                  value={formatLatency(performance.minLatency)}
                />

                <DetailItem
                  label="最慢"
                  value={formatLatency(performance.maxLatency)}
                />
              </div>
            </div>
          </section>

          <section style={styles.dashboardGrid}>
            <div style={styles.panel}>
              <PanelHeader
                title="用户分组"
                desc={`${users.length} 个用户，当前在线 ${onlineUsers.length} 个`}
              />

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

                  <p style={styles.userDesc}>查看所有人的聊天记录</p>
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
                          ...(user.online
                            ? styles.onlinePill
                            : styles.offlinePill),
                        }}
                      >
                        {user.online ? "在线" : "离线"}
                      </span>
                    </div>

                    <p style={styles.userDesc}>
                      {user.messageCount ?? 0} 条消息 · 主要话题：
                      {user.mainTopic || "暂无"}
                    </p>

                    <div style={styles.userMiniMeta}>
                      <span>{getModeLabel(user.preferredMode)}</span>
                      <span>日常 {user.dailyCount ?? 0}</span>
                      <span>学术 {user.researchCount ?? 0}</span>
                    </div>

                    <p style={styles.userTime}>
                      最近活跃：
                      {user.lastSeenBeijing ||
                        user.lastMessageAtBeijing ||
                        "暂无"}
                    </p>

                    {user.lastMessage && (
                      <p style={styles.lastMessage}>
                        “{truncate(user.lastMessage, 46)}”
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div style={styles.sideStack}>
              <div style={styles.panel}>
                <PanelHeader title="热门话题" desc="根据最近消息自动归类" />

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
                <PanelHeader title="模型统计" desc="查看实际调用过的模型" />

                {models.length === 0 ? (
                  <EmptyText text="暂无模型数据" />
                ) : (
                  <div style={styles.modelList}>
                    {models.slice(0, 8).map((model) => (
                      <div key={model.name} style={styles.modelRow}>
                        <span>{model.name || "unknown"}</span>
                        <strong>{model.count}</strong>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={styles.panel}>
                <PanelHeader title="关键词" desc="最近聊天高频词 Top 30" />

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
              <PanelHeader
                title="用户详情"
                desc={`当前查看：${shortUserId(selectedUser.user_id)}`}
              />

              <div style={styles.detailGrid}>
                <DetailItem label="用户 ID" value={selectedUser.user_id} />
                <DetailItem
                  label="消息数"
                  value={selectedUser.messageCount ?? 0}
                />
                <DetailItem
                  label="在线状态"
                  value={selectedUser.online ? "在线" : "离线"}
                />
                <DetailItem
                  label="偏好模式"
                  value={getModeLabel(selectedUser.preferredMode)}
                />
                <DetailItem
                  label="日常聊天"
                  value={selectedUser.dailyCount ?? 0}
                />
                <DetailItem
                  label="学术研究"
                  value={selectedUser.researchCount ?? 0}
                />
                <DetailItem
                  label="最近活跃"
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
              </div>
            </section>
          )}

          <section style={styles.panel}>
            <div style={styles.tabs}>
              <button
                style={{
                  ...styles.tabButton,
                  ...(activeTab === "logs" ? styles.activeTabButton : {}),
                }}
                onClick={() => setActiveTab("logs")}
              >
                最近聊天
              </button>

              <button
                style={{
                  ...styles.tabButton,
                  ...(activeTab === "feedbacks" ? styles.activeTabButton : {}),
                }}
                onClick={() => setActiveTab("feedbacks")}
              >
                用户反馈
              </button>
            </div>

            {activeTab === "logs" && (
              <>
                <div style={styles.searchRow}>
                  <input
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    placeholder="搜索用户消息、小KB回复、user_id、mode、model..."
                    style={styles.searchInput}
                  />

                  <span style={styles.searchCount}>
                    {filteredLogs.length} 条结果
                  </span>
                </div>

                <div style={styles.logList}>
                  {filteredLogs.length === 0 ? (
                    <EmptyText text="暂无聊天记录" />
                  ) : (
                    filteredLogs.map((log) => (
                      <article key={log.id} style={styles.logCard}>
                        <div style={styles.logMeta}>
                          <span>{log.created_at_beijing || formatBeijingTime(log.created_at)}</span>
                          <span>{shortUserId(log.user_id)}</span>
                          <span>{getModeLabel(log.mode)}</span>
                          <span>{log.model || "unknown model"}</span>
                          <span>{formatLatency(log.latency_ms)}</span>
                          <span>{getSuccessLabel(log.success)}</span>
                        </div>

                        <div style={styles.messageBlock}>
                          <div style={styles.messageLabel}>用户</div>
                          <p style={styles.messageText}>
                            {log.user_message || "暂无内容"}
                          </p>
                        </div>

                        <div style={styles.messageBlock}>
                          <div style={styles.messageLabel}>小KB</div>
                          <p style={styles.messageText}>
                            {log.ai_reply || "暂无回复"}
                          </p>
                        </div>

                        {Array.isArray(log.topics) && log.topics.length > 0 && (
                          <div style={styles.topicChips}>
                            {log.topics.map((topic) => (
                              <span key={topic}>{topic}</span>
                            ))}
                          </div>
                        )}
                      </article>
                    ))
                  )}
                </div>
              </>
            )}

            {activeTab === "feedbacks" && (
              <div style={styles.logList}>
                {feedbacks.length === 0 ? (
                  <EmptyText text="暂无反馈" />
                ) : (
                  feedbacks.map((item) => (
                    <article key={item.id} style={styles.logCard}>
                      <div style={styles.logMeta}>
                        <span>
                          {item.created_at_beijing ||
                            formatBeijingTime(item.created_at)}
                        </span>
                        <span>{item.typeLabel || item.type || "建议"}</span>
                        <span>{item.status || "open"}</span>
                        <span>{shortUserId(item.user_id)}</span>
                        <span>{item.page || "home"}</span>
                      </div>

                      <div style={styles.messageBlock}>
                        <div style={styles.messageLabel}>反馈内容</div>
                        <p style={styles.messageText}>
                          {item.content || "暂无内容"}
                        </p>
                      </div>

                      {item.contact && (
                        <div style={styles.messageBlock}>
                          <div style={styles.messageLabel}>联系方式</div>
                          <p style={styles.messageText}>{item.contact}</p>
                        </div>
                      )}
                    </article>
                  ))
                )}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}

function StatCard({ title, value, note, tone }) {
  const toneStyle =
    tone === "green"
      ? styles.greenTone
      : tone === "purple"
      ? styles.purpleTone
      : tone === "yellow"
      ? styles.yellowTone
      : tone === "red"
      ? styles.redTone
      : {};

  return (
    <div style={{ ...styles.statCard, ...toneStyle }}>
      <span style={styles.statTitle}>{title}</span>
      <strong style={styles.statValue}>{value}</strong>
      <em style={styles.statNote}>{note}</em>
    </div>
  );
}

function PanelHeader({ title, desc }) {
  return (
    <div style={styles.panelHeader}>
      <div>
        <h2 style={styles.panelTitle}>{title}</h2>
        {desc && <p style={styles.panelSub}>{desc}</p>}
      </div>
    </div>
  );
}

function ModeCard({ title, value, percent, note }) {
  return (
    <div style={styles.modeCard}>
      <div style={styles.modeTop}>
        <span>{title}</span>
        <strong>{percent}%</strong>
      </div>

      <div style={styles.modeBar}>
        <i style={{ ...styles.modeBarInner, width: `${percent}%` }} />
      </div>

      <p style={styles.modeNote}>
        {value} 条 · {note}
      </p>
    </div>
  );
}

function DetailItem({ label, value }) {
  return (
    <div style={styles.detailItem}>
      <span>{label}</span>
      <strong title={String(value ?? "")}>{value ?? "暂无"}</strong>
    </div>
  );
}

function EmptyText({ text }) {
  return <div style={styles.emptyText}>{text}</div>;
}

function shortUserId(value) {
  if (!value) return "anonymous";

  const text = String(value);

  if (text.length <= 14) return text;

  return `${text.slice(0, 7)}...${text.slice(-5)}`;
}

function truncate(value, max = 80) {
  const text = String(value || "");

  if (text.length <= max) return text;

  return `${text.slice(0, max)}...`;
}

function formatBeijingTime(value) {
  if (!value) return "暂无";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "暂无";

  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

function formatLatency(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) return "暂无";

  if (number < 1000) return `${number}ms`;

  return `${(number / 1000).toFixed(1)}s`;
}

function getModeLabel(mode) {
  if (mode === "daily") return "日常聊天";
  if (mode === "research") return "学术研究";
  if (mode === "unknown") return "未知模式";
  return mode || "未知模式";
}

function getSuccessLabel(value) {
  if (value === true) return "成功";
  if (value === false) return "失败";
  return "未知";
}

const styles = {
  page: {
    minHeight: "100vh",
    padding: 28,
    color: "white",
    background:
      "radial-gradient(circle at 20% 0%, rgba(139, 92, 246, 0.32), transparent 34%), radial-gradient(circle at 100% 20%, rgba(236, 72, 153, 0.18), transparent 32%), linear-gradient(135deg, #03020a 0%, #080516 48%, #10071f 100%)",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
  },

  hero: {
    width: "min(1180px, 100%)",
    margin: "0 auto 18px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 18,
  },

  badge: {
    width: "fit-content",
    padding: "7px 11px",
    borderRadius: 999,
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: "0.14em",
    color: "rgba(233, 213, 255, 0.94)",
    background: "rgba(139, 92, 246, 0.16)",
    border: "1px solid rgba(216, 180, 254, 0.18)",
  },

  title: {
    margin: "16px 0 0",
    fontSize: 42,
    lineHeight: 1,
    letterSpacing: "-0.065em",
  },

  subtitle: {
    margin: "12px 0 0",
    color: "rgba(226, 232, 240, 0.62)",
    fontSize: 14,
    lineHeight: 1.65,
  },

  heroActions: {
    display: "flex",
    gap: 10,
    flexShrink: 0,
  },

  refreshButton: {
    height: 46,
    padding: "0 17px",
    border: 0,
    borderRadius: 16,
    cursor: "pointer",
    color: "white",
    fontWeight: 900,
    background: "linear-gradient(135deg, #8b5cf6, #d946ef)",
    boxShadow: "0 18px 42px rgba(139, 92, 246, 0.28)",
  },

  ghostButton: {
    height: 46,
    padding: "0 17px",
    border: "1px solid rgba(255, 255, 255, 0.12)",
    borderRadius: 16,
    cursor: "pointer",
    color: "rgba(255, 255, 255, 0.82)",
    fontWeight: 850,
    background: "rgba(255, 255, 255, 0.07)",
  },

  loginCard: {
    width: "min(1180px, 100%)",
    margin: "0 auto 14px",
    display: "flex",
    gap: 10,
    padding: 14,
    borderRadius: 24,
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.045)), rgba(14, 11, 27, 0.78)",
    border: "1px solid rgba(255, 255, 255, 0.105)",
    backdropFilter: "blur(22px)",
  },

  input: {
    flex: 1,
    minWidth: 0,
    height: 48,
    padding: "0 15px",
    border: "1px solid rgba(255, 255, 255, 0.12)",
    borderRadius: 16,
    outline: "none",
    color: "white",
    background: "rgba(255, 255, 255, 0.07)",
  },

  mainButton: {
    height: 48,
    padding: "0 18px",
    border: 0,
    borderRadius: 16,
    cursor: "pointer",
    color: "white",
    fontWeight: 900,
    background: "linear-gradient(135deg, #8b5cf6, #d946ef)",
  },

  errorBox: {
    width: "min(1180px, 100%)",
    margin: "0 auto 14px",
    padding: 14,
    borderRadius: 16,
    color: "rgba(254, 202, 202, 0.96)",
    background: "rgba(239, 68, 68, 0.12)",
    border: "1px solid rgba(248, 113, 113, 0.18)",
    fontSize: 13,
  },

  statsGrid: {
    width: "min(1180px, 100%)",
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: 12,
  },

  statCard: {
    minHeight: 126,
    padding: 18,
    borderRadius: 24,
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.105), rgba(255,255,255,0.045)), rgba(14, 11, 27, 0.78)",
    border: "1px solid rgba(255, 255, 255, 0.105)",
    boxShadow:
      "0 22px 70px rgba(0,0,0,0.24), inset 0 1px 0 rgba(255,255,255,0.08)",
    backdropFilter: "blur(22px)",
  },

  greenTone: {
    boxShadow:
      "0 22px 70px rgba(0,0,0,0.24), 0 0 42px rgba(34, 197, 94, 0.16)",
  },

  purpleTone: {
    boxShadow:
      "0 22px 70px rgba(0,0,0,0.24), 0 0 42px rgba(139, 92, 246, 0.2)",
  },

  yellowTone: {
    boxShadow:
      "0 22px 70px rgba(0,0,0,0.24), 0 0 42px rgba(234, 179, 8, 0.13)",
  },

  redTone: {
    boxShadow:
      "0 22px 70px rgba(0,0,0,0.24), 0 0 42px rgba(239, 68, 68, 0.13)",
  },

  statTitle: {
    display: "block",
    fontSize: 12,
    color: "rgba(226, 232, 240, 0.55)",
  },

  statValue: {
    display: "block",
    marginTop: 13,
    fontSize: 34,
    lineHeight: 1,
    letterSpacing: "-0.055em",
  },

  statNote: {
    display: "block",
    marginTop: 11,
    fontSize: 11.5,
    fontStyle: "normal",
    color: "rgba(226, 232, 240, 0.38)",
  },

  metaCard: {
    width: "min(1180px, 100%)",
    margin: "14px auto 0",
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    padding: 14,
    borderRadius: 20,
    background: "rgba(255, 255, 255, 0.055)",
    border: "1px solid rgba(255, 255, 255, 0.085)",
  },

  insightGrid: {
    width: "min(1180px, 100%)",
    margin: "14px auto 0",
    display: "grid",
    gridTemplateColumns: "1.1fr 0.9fr",
    gap: 14,
  },

  dashboardGrid: {
    width: "min(1180px, 100%)",
    margin: "14px auto 0",
    display: "grid",
    gridTemplateColumns: "1.1fr 0.9fr",
    gap: 14,
  },

  panel: {
    width: "min(1180px, 100%)",
    margin: "14px auto 0",
    padding: 20,
    borderRadius: 26,
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.105), rgba(255,255,255,0.045)), rgba(14, 11, 27, 0.78)",
    border: "1px solid rgba(255, 255, 255, 0.105)",
    boxShadow:
      "0 22px 70px rgba(0,0,0,0.24), inset 0 1px 0 rgba(255,255,255,0.08)",
    backdropFilter: "blur(22px)",
  },

  panelHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 14,
    marginBottom: 16,
  },

  panelTitle: {
    margin: 0,
    fontSize: 20,
    letterSpacing: "-0.04em",
  },

  panelSub: {
    margin: "7px 0 0",
    color: "rgba(226, 232, 240, 0.55)",
    fontSize: 13,
    lineHeight: 1.5,
  },

  modeGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 10,
  },

  modeCard: {
    padding: 14,
    borderRadius: 18,
    background: "rgba(255,255,255,0.055)",
    border: "1px solid rgba(255,255,255,0.075)",
  },

  modeTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    fontSize: 13,
  },

  modeBar: {
    height: 9,
    marginTop: 13,
    overflow: "hidden",
    borderRadius: 999,
    background: "rgba(255,255,255,0.07)",
  },

  modeBarInner: {
    display: "block",
    height: "100%",
    borderRadius: 999,
    background: "linear-gradient(135deg, #8b5cf6, #ec4899)",
  },

  modeNote: {
    margin: "10px 0 0",
    fontSize: 12,
    color: "rgba(226,232,240,0.42)",
  },

  detailGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: 10,
  },

  detailItem: {
    minWidth: 0,
    padding: 13,
    borderRadius: 17,
    background: "rgba(255,255,255,0.055)",
    border: "1px solid rgba(255,255,255,0.075)",
  },

  sideStack: {
    display: "grid",
    gap: 14,
  },

  userList: {
    display: "grid",
    gap: 10,
    maxHeight: 720,
    overflow: "auto",
    paddingRight: 2,
  },

  userCard: {
    width: "100%",
    textAlign: "left",
    padding: 14,
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.075)",
    color: "white",
    background: "rgba(255,255,255,0.052)",
    cursor: "pointer",
  },

  activeUserCard: {
    border: "1px solid rgba(216,180,254,0.42)",
    background:
      "linear-gradient(135deg, rgba(139,92,246,0.24), rgba(236,72,153,0.10))",
  },

  userTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  userCount: {
    fontSize: 12,
    color: "rgba(226,232,240,0.55)",
  },

  userDesc: {
    margin: "8px 0 0",
    fontSize: 12.5,
    color: "rgba(226,232,240,0.62)",
    lineHeight: 1.5,
  },

  userMiniMeta: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 9,
  },

  userTime: {
    margin: "9px 0 0",
    fontSize: 11.5,
    color: "rgba(226,232,240,0.38)",
  },

  lastMessage: {
    margin: "9px 0 0",
    fontSize: 12,
    lineHeight: 1.5,
    color: "rgba(233,213,255,0.72)",
  },

  statusPill: {
    padding: "5px 8px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 900,
  },

  onlinePill: {
    color: "rgba(187,247,208,0.95)",
    background: "rgba(34,197,94,0.14)",
  },

  offlinePill: {
    color: "rgba(226,232,240,0.45)",
    background: "rgba(255,255,255,0.07)",
  },

  topicList: {
    display: "grid",
    gap: 8,
  },

  topicRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 15,
    background: "rgba(255,255,255,0.052)",
    border: "1px solid rgba(255,255,255,0.07)",
  },

  modelList: {
    display: "grid",
    gap: 8,
  },

  modelRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    padding: 12,
    borderRadius: 15,
    background: "rgba(255,255,255,0.052)",
    border: "1px solid rgba(255,255,255,0.07)",
  },

  keywordWrap: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },

  keyword: {
    padding: "7px 10px",
    borderRadius: 999,
    fontSize: 12,
    color: "rgba(233,213,255,0.88)",
    background: "rgba(139,92,246,0.14)",
    border: "1px solid rgba(216,180,254,0.16)",
  },

  tabs: {
    display: "inline-flex",
    padding: 4,
    marginBottom: 16,
    borderRadius: 18,
    background: "rgba(255,255,255,0.055)",
    border: "1px solid rgba(255,255,255,0.075)",
  },

  tabButton: {
    height: 38,
    padding: "0 16px",
    border: 0,
    borderRadius: 14,
    cursor: "pointer",
    color: "rgba(226,232,240,0.58)",
    background: "transparent",
    fontWeight: 900,
  },

  activeTabButton: {
    color: "white",
    background: "rgba(139,92,246,0.28)",
  },

  searchRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },

  searchInput: {
    flex: 1,
    minWidth: 0,
    height: 46,
    padding: "0 14px",
    border: "1px solid rgba(255,255,255,0.105)",
    borderRadius: 16,
    outline: "none",
    color: "white",
    background: "rgba(255,255,255,0.06)",
  },

  searchCount: {
    fontSize: 12,
    color: "rgba(226,232,240,0.48)",
  },

  logList: {
    display: "grid",
    gap: 10,
  },

  logCard: {
    padding: 15,
    borderRadius: 19,
    background: "rgba(255,255,255,0.052)",
    border: "1px solid rgba(255,255,255,0.075)",
  },

  logMeta: {
    display: "flex",
    flexWrap: "wrap",
    gap: 7,
    marginBottom: 12,
  },

  messageBlock: {
    marginTop: 10,
  },

  messageLabel: {
    marginBottom: 5,
    fontSize: 12,
    fontWeight: 900,
    color: "rgba(255,255,255,0.88)",
  },

  messageText: {
    margin: 0,
    fontSize: 13.5,
    lineHeight: 1.7,
    color: "rgba(226,232,240,0.72)",
    whiteSpace: "pre-wrap",
  },

  topicChips: {
    display: "flex",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 12,
  },

  emptyText: {
    padding: 22,
    borderRadius: 18,
    textAlign: "center",
    color: "rgba(226,232,240,0.42)",
    background: "rgba(255,255,255,0.045)",
  },
};
