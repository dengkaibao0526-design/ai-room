"use client";

import { useEffect, useMemo, useState } from "react";

const NAV_ITEMS = [
  { key: "overview", label: "总览", desc: "运营大屏" },
  { key: "users", label: "用户", desc: "用户画像" },
  { key: "chats", label: "聊天", desc: "聊天审查" },
  { key: "feedbacks", label: "反馈", desc: "建议 Bug" },
  { key: "settings", label: "设置", desc: "功能开关" },
];

const SETTING_DESCRIPTION_MAP = {
  show_mbti: "是否显示 MBTI 小测试入口",
  show_copywriter: "是否显示文案工作台入口",
  show_feedback: "是否显示反馈按钮",
  enable_research_mode: "是否开启学术研究模式",
  show_intro_modal: "是否显示首次进入简介弹窗",
  enable_easter_egg: "是否开启隐藏彩蛋",
  enable_chat_logging: "是否记录聊天日志",
};

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [data, setData] = useState(null);
  const [view, setView] = useState("overview");
  const [selectedUserId, setSelectedUserId] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [modeFilter, setModeFilter] = useState("all");
  const [feedbackFilter, setFeedbackFilter] = useState("all");
  const [settings, setSettings] = useState([]);
  const [settingsLoading, setSettingsLoading] = useState(false);
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
        throw new Error("后台接口返回的不是 JSON，请检查 /api/admin/stats。");
      }

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "后台读取失败");
      }

      setData(json);
      localStorage.setItem("xiaokb_admin_password", finalPassword);
      await loadSettings(finalPassword);
    } catch (err) {
      console.error("ADMIN_PAGE_ERROR:", err);
      setError(err.message || "页面出错了，刷新再试一次");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  async function loadSettings(inputPassword) {
    const finalPassword = inputPassword || password;

    if (!finalPassword) return;

    try {
      const res = await fetch(`/api/admin/settings?t=${Date.now()}`, {
        method: "GET",
        cache: "no-store",
        headers: {
          "x-admin-password": finalPassword,
        },
      });

      const json = await res.json().catch(() => ({}));

      if (
        res.ok &&
        json.ok &&
        Array.isArray(json.settings) &&
        json.settings.length > 0
      ) {
        setSettings(json.settings);
        return;
      }

      const publicRes = await fetch(`/api/settings?t=${Date.now()}`, {
        method: "GET",
        cache: "no-store",
      });

      const publicJson = await publicRes.json().catch(() => ({}));

      if (publicJson?.ok && publicJson?.settings) {
        const fallbackSettings = Object.entries(publicJson.settings).map(
          ([key, value]) => ({
            key,
            value,
            description: SETTING_DESCRIPTION_MAP[key] || key,
            updated_at: publicJson.generated_at || new Date().toISOString(),
          })
        );

        setSettings(fallbackSettings);
        return;
      }

      throw new Error(json.error || "读取系统开关失败");
    } catch (err) {
      console.error("LOAD_SETTINGS_ERROR:", err);
      setError(err.message || "读取系统开关失败");
    }
  }

  function logout() {
    localStorage.removeItem("xiaokb_admin_password");
    setPassword("");
    setData(null);
    setView("overview");
    setSelectedUserId("all");
    setSearchText("");
    setModeFilter("all");
    setFeedbackFilter("all");
    setSettings([]);
    setError("");
  }

  async function updateFeedbackStatus(id, status) {
    if (!id) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/feedback-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify({
          id,
          status,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "更新反馈状态失败");
      }

      await loadData(password);
    } catch (err) {
      console.error("UPDATE_FEEDBACK_STATUS_ERROR:", err);
      setError(err.message || "更新反馈状态失败");
    } finally {
      setLoading(false);
    }
  }

  async function toggleSetting(key, currentValue) {
    if (!key || settingsLoading) return;

    const nextValue = !normalizeSettingValue(currentValue);

    setSettingsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify({
          key,
          value: nextValue,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || json.detail || "更新系统开关失败");
      }

      if (Array.isArray(json.settings) && json.settings.length > 0) {
        setSettings(json.settings);
      } else {
        await loadSettings(password);
      }
    } catch (err) {
      console.error("TOGGLE_SETTING_ERROR:", err);
      setError(err.message || "更新系统开关失败");
    } finally {
      setSettingsLoading(false);
    }
  }

  async function runAdminAction(action, payload = {}, confirmText = "") {
    if (!action || loading) return;

    if (confirmText) {
      const ok = window.confirm(confirmText);
      if (!ok) return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/action", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify({
          action,
          ...payload,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || json.detail || "后台操作失败");
      }

      await loadData(password);
    } catch (err) {
      console.error("ADMIN_ACTION_PAGE_ERROR:", err);
      setError(err.message || "后台操作失败");
    } finally {
      setLoading(false);
    }
  }

  function deleteLog(id) {
    runAdminAction(
      "delete_log",
      { id },
      "确定删除这条聊天记录吗？删除后不能恢复。"
    );
  }

  function deleteFeedback(id) {
    runAdminAction(
      "delete_feedback",
      { id },
      "确定删除这条反馈吗？删除后不能恢复。"
    );
  }

  function clearAnonymousLogs() {
    runAdminAction(
      "clear_anonymous_logs",
      {},
      "确定清理 anonymous 旧聊天记录吗？这个操作不能恢复。"
    );
  }

  function clearFailedLogs() {
    runAdminAction(
      "clear_failed_logs",
      {},
      "确定清理失败聊天记录吗？success=false 的记录会被删除。"
    );
  }

  function clearSelectedUserLogs() {
    if (!selectedUser || !selectedUser.user_id) return;

    runAdminAction(
      "clear_user_logs",
      { user_id: selectedUser.user_id },
      `确定删除用户 ${shortUserId(
        selectedUser.user_id
      )} 的全部聊天记录吗？这个操作不能恢复。`
    );
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
  const topics = Array.isArray(data?.topics) ? data.topics : [];
  const keywords = Array.isArray(data?.keywords) ? data.keywords : [];
  const feedbacks = Array.isArray(data?.feedbacks) ? data.feedbacks : [];
  const models = Array.isArray(data?.models) ? data.models : [];

  const onlineUsers = users.filter((user) => user.online);
  const selectedUser = users.find((user) => user.user_id === selectedUserId);

  const healthScore = useMemo(() => {
    const successRate =
      typeof performance.successRate === "number"
        ? performance.successRate
        : 100;

    const todayScore = stats.todayMessages ? 100 : 70;
    const onlineScore = stats.onlineUsers ? 100 : 75;

    return Math.round(
      successRate * 0.5 + todayScore * 0.25 + onlineScore * 0.25
    );
  }, [performance.successRate, stats.todayMessages, stats.onlineUsers]);

  const filteredLogs = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    return logs.filter((log) => {
      const matchUser =
        selectedUserId === "all" || log.user_id === selectedUserId;

      const matchMode =
        modeFilter === "all" || String(log.mode || "unknown") === modeFilter;

      const matchSearch =
        !keyword ||
        String(log.user_message || "").toLowerCase().includes(keyword) ||
        String(log.ai_reply || "").toLowerCase().includes(keyword) ||
        String(log.user_id || "").toLowerCase().includes(keyword) ||
        String(log.mode || "").toLowerCase().includes(keyword) ||
        String(log.model || "").toLowerCase().includes(keyword);

      return matchUser && matchMode && matchSearch;
    });
  }, [logs, selectedUserId, searchText, modeFilter]);

  const filteredFeedbacks = useMemo(() => {
    return feedbacks.filter((item) => {
      if (feedbackFilter === "all") return true;
      return String(item.type || "suggestion") === feedbackFilter;
    });
  }, [feedbacks, feedbackFilter]);

  if (!data) {
    return (
      <main className="adminV7">
        <div className="loginShell">
          <section className="loginCard">
            <div className="loginOrb"></div>

            <div className="brandPill">XIAOKB ADMIN · V7</div>

            <h1>小KB运营控制台</h1>

            <p>
              输入后台密码后查看聊天、用户、在线状态、模式占比、性能表现、用户反馈和系统开关。
            </p>

            <div className="loginForm">
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") loadData(password);
                }}
                placeholder="输入 ADMIN_PASSWORD"
                type="password"
              />

              <button onClick={() => loadData(password)} disabled={loading}>
                {loading ? "进入中..." : "进入后台"}
              </button>
            </div>

            {error && <div className="errorBox">{error}</div>}

            <div className="loginHint">
              V7 控制台 · 运营大屏 · 用户画像 · 聊天审查 · 反馈中心 · 系统开关
            </div>
          </section>
        </div>

        <AdminStyles />
      </main>
    );
  }

  return (
    <main className="adminV7">
      <aside className="sideNav">
        <div className="sideBrand">
          <div className="brandLogo">KB</div>

          <div>
            <strong>小KB后台</strong>
            <span>Admin V7</span>
          </div>
        </div>

        <nav className="navList">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              className={view === item.key ? "activeNav" : ""}
              onClick={() => setView(item.key)}
            >
              <span>{item.label}</span>
              <em>{item.desc}</em>
            </button>
          ))}
        </nav>

        <div className="sideStatus">
          <span>当前在线</span>
          <strong>{stats.onlineUsers ?? 0}</strong>
          <p>{data.onlineRule || "最近 5 分钟有心跳算在线"}</p>
        </div>

        <button className="logoutBtn" onClick={logout}>
          退出后台
        </button>
      </aside>

      <section className="adminMain">
        <header className="topBar">
          <div>
            <div className="brandPill">XIAOKB OPERATIONS</div>
            <h1>{getViewTitle(view)}</h1>
            <p>
              生成时间：
              {data.generated_at_beijing || formatBeijingTime(data.generated_at)}
            </p>
          </div>

          <button
            className="softBtn"
            onClick={() => loadData(password)}
            disabled={loading}
          >
            {loading ? "刷新中..." : "刷新数据"}
          </button>
        </header>

        {error && <div className="errorBox">{error}</div>}

        {view === "overview" && (
          <>
            <section className="heroGrid">
              <div className="commandCard">
                <div className="commandTop">
                  <div>
                    <span className="tinyLabel">ROOM HEALTH</span>
                    <h2>{healthScore}</h2>
                    <p>综合运行状态</p>
                  </div>

                  <div className="healthRing">
                    <span>{healthScore}%</span>
                  </div>
                </div>

                <div className="commandBottom">
                  <MetricMini label="总用户" value={stats.totalUsers ?? 0} />
                  <MetricMini label="总消息" value={stats.totalMessages ?? 0} />
                  <MetricMini
                    label="今日消息"
                    value={stats.todayMessages ?? 0}
                  />
                  <MetricMini
                    label="待处理反馈"
                    value={stats.openFeedbacks ?? 0}
                  />
                </div>
              </div>

              <div className="liveCard">
                <span className="tinyLabel">LIVE NOW</span>
                <h2>{stats.onlineUsers ?? 0}</h2>
                <p>当前在线用户</p>

                <div className="onlineStrip">
                  {onlineUsers.length === 0 && <em>暂无在线用户</em>}

                  {onlineUsers.slice(0, 8).map((user) => (
                    <span key={user.user_id}>{shortUserId(user.user_id)}</span>
                  ))}
                </div>
              </div>
            </section>

            <section className="statsGrid">
              <StatCard
                title="总用户"
                value={stats.totalUsers ?? 0}
                note="进入过网站的浏览器"
              />
              <StatCard
                title="在线人数"
                value={stats.onlineUsers ?? 0}
                note="最近 5 分钟活跃"
                glow
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
                title="今日活跃"
                value={stats.todayActiveUsers ?? 0}
                note="今天来过的人"
              />
              <StatCard
                title="分析消息"
                value={stats.analyzedMessages ?? 0}
                note="本页分析样本"
              />
              <StatCard
                title="总反馈"
                value={stats.totalFeedbacks ?? 0}
                note="建议和 Bug"
              />
              <StatCard
                title="今日反馈"
                value={stats.todayFeedbacks ?? 0}
                note="北京时间今日"
              />
            </section>

            <section className="twoGrid">
              <Panel title="模式占比" desc="判断朋友们更爱陪聊，还是学术处理。">
                <div className="modeCards">
                  <ModeCard
                    title="日常聊天"
                    value={modes.daily ?? 0}
                    percent={modes.dailyPercent ?? 0}
                  />
                  <ModeCard
                    title="学术研究"
                    value={modes.research ?? 0}
                    percent={modes.researchPercent ?? 0}
                  />
                  <ModeCard
                    title="未知模式"
                    value={modes.unknown ?? 0}
                    percent={modes.unknownPercent ?? 0}
                  />
                </div>
              </Panel>

              <Panel
                title="性能表现"
                desc="需要 chat 接口写入 latency_ms / success 后更准确。"
              >
                <div className="detailGrid">
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
              </Panel>
            </section>

            <section className="threeGrid">
              <Panel title="热门话题" desc="根据最近聊天自动归类。">
                <RankList items={topics.slice(0, 8)} empty="暂无话题数据" />
              </Panel>

              <Panel title="模型统计" desc="查看最近实际调用过的模型。">
                <RankList items={models.slice(0, 8)} empty="暂无模型数据" />
              </Panel>

              <Panel title="关键词" desc="最近聊天高频词。">
                {keywords.length === 0 ? (
                  <Empty text="多聊几句后会出现关键词" />
                ) : (
                  <div className="keywordCloud">
                    {keywords.slice(0, 30).map((item) => (
                      <span key={item.word}>
                        {item.word} · {item.count}
                      </span>
                    ))}
                  </div>
                )}
              </Panel>
            </section>
          </>
        )}

        {view === "users" && (
          <section className="twoGrid usersLayout">
            <Panel
              title="用户列表"
              desc={`${users.length} 个用户，在线 ${onlineUsers.length} 个。`}
            >
              <div className="userList">
                <button
                  className={
                    selectedUserId === "all"
                      ? "userCard activeUser"
                      : "userCard"
                  }
                  onClick={() => setSelectedUserId("all")}
                >
                  <div>
                    <strong>全部用户</strong>
                    <span>{logs.length} 条聊天</span>
                  </div>

                  <p>查看全部聊天记录</p>
                </button>

                {users.map((user) => (
                  <button
                    key={user.user_id}
                    className={
                      selectedUserId === user.user_id
                        ? "userCard activeUser"
                        : "userCard"
                    }
                    onClick={() => setSelectedUserId(user.user_id)}
                  >
                    <div>
                      <strong>{shortUserId(user.user_id)}</strong>

                      <span className={user.online ? "onlineTag" : "offlineTag"}>
                        {user.online ? "在线" : "离线"}
                      </span>
                    </div>

                    <p>
                      {user.messageCount ?? 0} 条 · 主话题：
                      {user.mainTopic || "暂无"}
                    </p>

                    <em>
                      偏好：{getModeLabel(user.preferredMode)} · 日常{" "}
                      {user.dailyCount ?? 0} · 学术 {user.researchCount ?? 0}
                    </em>
                  </button>
                ))}
              </div>
            </Panel>

            <Panel
              title="用户画像"
              desc={
                selectedUser
                  ? `当前查看：${shortUserId(selectedUser.user_id)}`
                  : "选择左侧用户查看画像。"
              }
            >
              {!selectedUser ? (
                <Empty text="当前是全部用户视图，选择一个用户查看详情。" />
              ) : (
                <>
                  <div className="detailGrid">
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

                  <div className="userDangerBox">
                    <button onClick={clearSelectedUserLogs} disabled={loading}>
                      删除该用户全部聊天记录
                    </button>
                  </div>

                  <div className="recentMiniList">
                    {(selectedUser.recentMessages || [])
                      .slice(0, 6)
                      .map((msg) => (
                        <article key={msg.id}>
                          <span>
                            {msg.created_at_beijing ||
                              formatBeijingTime(msg.created_at)}
                          </span>
                          <p>{msg.user_message || "暂无内容"}</p>
                        </article>
                      ))}
                  </div>
                </>
              )}
            </Panel>
          </section>
        )}

        {view === "chats" && (
          <Panel title="聊天记录" desc="可以按用户、模式、关键词筛选最近消息。">
            <div className="filterBar">
              <input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="搜索用户消息、小KB回复、user_id、mode、model..."
              />

              <select
                value={modeFilter}
                onChange={(e) => setModeFilter(e.target.value)}
              >
                <option value="all">全部模式</option>
                <option value="daily">日常聊天</option>
                <option value="research">学术研究</option>
                <option value="unknown">未知模式</option>
              </select>

              <span>{filteredLogs.length} 条结果</span>
            </div>

            <div className="dangerBar">
              <button onClick={clearAnonymousLogs} disabled={loading}>
                清理 anonymous 旧记录
              </button>

              <button onClick={clearFailedLogs} disabled={loading}>
                清理失败记录
              </button>

              {selectedUser && selectedUserId !== "all" && (
                <button onClick={clearSelectedUserLogs} disabled={loading}>
                  删除当前用户全部聊天
                </button>
              )}
            </div>

            <div className="logList">
              {filteredLogs.length === 0 ? (
                <Empty text="暂无聊天记录" />
              ) : (
                filteredLogs.map((log) => (
                  <article className="logCard" key={log.id}>
                    <div className="logMeta logMetaWithAction">
                      <div>
                        <span>
                          {log.created_at_beijing ||
                            formatBeijingTime(log.created_at)}
                        </span>
                        <span>{shortUserId(log.user_id)}</span>
                        <span>{getModeLabel(log.mode)}</span>
                        <span>{log.model || "unknown model"}</span>
                        <span>{formatLatency(log.latency_ms)}</span>
                        <span>{getSuccessLabel(log.success)}</span>
                      </div>

                      <button
                        className="miniDangerBtn"
                        onClick={() => deleteLog(log.id)}
                        disabled={loading}
                      >
                        删除
                      </button>
                    </div>

                    <div className="messagePair">
                      <div>
                        <strong>用户</strong>
                        <p>{log.user_message || "暂无内容"}</p>
                      </div>

                      <div>
                        <strong>小KB</strong>
                        <p>{log.ai_reply || "暂无回复"}</p>
                      </div>
                    </div>

                    {Array.isArray(log.topics) && log.topics.length > 0 && (
                      <div className="chipRow">
                        {log.topics.map((topic) => (
                          <span key={topic}>{topic}</span>
                        ))}
                      </div>
                    )}
                  </article>
                ))
              )}
            </div>
          </Panel>
        )}

        {view === "feedbacks" && (
          <Panel title="反馈中心" desc="集中查看用户提交的建议、功能需求和 Bug。">
            <div className="filterBar">
              <select
                value={feedbackFilter}
                onChange={(e) => setFeedbackFilter(e.target.value)}
              >
                <option value="all">全部反馈</option>
                <option value="suggestion">建议</option>
                <option value="feature">想要的功能</option>
                <option value="bug">Bug</option>
              </select>

              <span>{filteredFeedbacks.length} 条反馈</span>
            </div>

            <div className="logList">
              {filteredFeedbacks.length === 0 ? (
                <Empty text="暂无反馈" />
              ) : (
                filteredFeedbacks.map((item) => (
                  <article className="logCard" key={item.id}>
                    <div className="logMeta">
                      <span>
                        {item.created_at_beijing ||
                          formatBeijingTime(item.created_at)}
                      </span>
                      <span>{item.typeLabel || getFeedbackLabel(item.type)}</span>
                      <span>{getFeedbackStatusLabel(item.status)}</span>
                      <span>{shortUserId(item.user_id)}</span>
                      <span>{item.page || "home"}</span>
                    </div>

                    <div className="messagePair single">
                      <div>
                        <strong>反馈内容</strong>
                        <p>{item.content || "暂无内容"}</p>
                      </div>
                    </div>

                    {item.contact && (
                      <div className="contactBox">联系方式：{item.contact}</div>
                    )}

                    <div className="feedbackActions">
                      {item.status !== "done" && (
                        <button
                          onClick={() => updateFeedbackStatus(item.id, "done")}
                          disabled={loading}
                        >
                          标记已处理
                        </button>
                      )}

                      {item.status !== "ignored" && (
                        <button
                          onClick={() =>
                            updateFeedbackStatus(item.id, "ignored")
                          }
                          disabled={loading}
                        >
                          暂不处理
                        </button>
                      )}

                      {item.status !== "open" && (
                        <button
                          onClick={() => updateFeedbackStatus(item.id, "open")}
                          disabled={loading}
                        >
                          重新打开
                        </button>
                      )}

                      <button
                        className="dangerActionBtn"
                        onClick={() => deleteFeedback(item.id)}
                        disabled={loading}
                      >
                        删除反馈
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </Panel>
        )}

        {view === "settings" && (
          <Panel title="系统开关" desc="控制小KB前台功能显示和后台行为。">
            <div className="settingsGrid">
              {settings.length === 0 ? (
                <Empty text="暂无开关数据，请确认 app_settings 表已初始化。" />
              ) : (
                settings.map((item) => {
                  const settingValue = normalizeSettingValue(item.value);

                  return (
                    <article className="settingCard" key={item.key}>
                      <div>
                        <strong>{getSettingLabel(item.key)}</strong>
                        <span>{item.description || item.key}</span>
                        <em>Key：{item.key}</em>
                      </div>

                      <button
                        className={
                          settingValue ? "switchBtn switchOn" : "switchBtn"
                        }
                        onClick={() => toggleSetting(item.key, settingValue)}
                        disabled={settingsLoading}
                      >
                        <i></i>
                        <span>{settingValue ? "已开启" : "已关闭"}</span>
                      </button>
                    </article>
                  );
                })
              )}
            </div>

            <div className="settingsNotice">
              当前已经可以修改数据库开关。首页会读取这些开关，用来控制
              MBTI、文案工作台、反馈按钮、学术模式、首次弹窗和隐藏彩蛋。
            </div>
          </Panel>
        )}
      </section>

      <AdminStyles />
    </main>
  );
}

function StatCard({ title, value, note, glow }) {
  return (
    <div className={glow ? "statCard glowStat" : "statCard"}>
      <span>{title}</span>
      <strong>{value}</strong>
      <em>{note}</em>
    </div>
  );
}

function MetricMini({ label, value }) {
  return (
    <div className="metricMini">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Panel({ title, desc, children }) {
  return (
    <section className="panel">
      <div className="panelHead">
        <div>
          <h2>{title}</h2>
          {desc && <p>{desc}</p>}
        </div>
      </div>

      {children}
    </section>
  );
}

function ModeCard({ title, value, percent }) {
  return (
    <div className="modeCard">
      <div className="modeTop">
        <span>{title}</span>
        <strong>{percent}%</strong>
      </div>

      <div className="modeBar">
        <i style={{ width: `${percent}%` }} />
      </div>

      <p>{value} 条记录</p>
    </div>
  );
}

function DetailItem({ label, value }) {
  return (
    <div className="detailItem">
      <span>{label}</span>
      <strong title={String(value ?? "")}>{value ?? "暂无"}</strong>
    </div>
  );
}

function RankList({ items, empty }) {
  if (!items.length) {
    return <Empty text={empty} />;
  }

  return (
    <div className="rankList">
      {items.map((item, index) => (
        <div className="rankRow" key={item.name || item.word || index}>
          <span>
            #{index + 1} {item.name || item.word || "unknown"}
          </span>
          <strong>{item.count}</strong>
        </div>
      ))}
    </div>
  );
}

function Empty({ text }) {
  return <div className="empty">{text}</div>;
}

function getViewTitle(view) {
  if (view === "users") return "用户洞察";
  if (view === "chats") return "聊天审查";
  if (view === "feedbacks") return "反馈中心";
  if (view === "settings") return "系统开关";
  return "运营总览";
}

function shortUserId(value) {
  if (!value) return "anonymous";

  const text = String(value);

  if (text.length <= 14) return text;

  return `${text.slice(0, 7)}...${text.slice(-5)}`;
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

function getFeedbackLabel(type) {
  if (type === "feature") return "想要的功能";
  if (type === "bug") return "Bug";
  return "建议";
}

function getFeedbackStatusLabel(status) {
  if (status === "done") return "已处理";
  if (status === "ignored") return "暂不处理";
  return "未处理";
}

function normalizeSettingValue(value) {
  if (value === true) return true;
  if (value === false) return false;
  if (value === "true") return true;
  if (value === "false") return false;

  if (value && typeof value === "object") {
    if (value.value === true || value.value === "true") return true;
    if (value.value === false || value.value === "false") return false;
  }

  return Boolean(value);
}

function getSettingLabel(key) {
  const map = {
    show_mbti: "显示 MBTI 小测试入口",
    show_copywriter: "显示文案工作台入口",
    show_feedback: "显示反馈按钮",
    enable_research_mode: "开启学术研究模式",
    show_intro_modal: "显示首次进入简介弹窗",
    enable_easter_egg: "开启隐藏彩蛋",
    enable_chat_logging: "记录聊天日志",
  };

  return map[key] || key;
}

function AdminStyles() {
  return (
    <style jsx global>{`
      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
      }

      .adminV7 {
        min-height: 100vh;
        color: white;
        background:
          radial-gradient(circle at 18% 0%, rgba(139, 92, 246, 0.34), transparent 34%),
          radial-gradient(circle at 100% 24%, rgba(236, 72, 153, 0.16), transparent 32%),
          linear-gradient(135deg, #03020a 0%, #080516 46%, #10071f 100%);
        font-family:
          -apple-system,
          BlinkMacSystemFont,
          "Segoe UI",
          "PingFang SC",
          "Microsoft YaHei",
          sans-serif;
      }

      .loginShell {
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 22px;
      }

      .loginCard {
        position: relative;
        width: min(480px, 100%);
        overflow: hidden;
        padding: 30px;
        border-radius: 34px;
        background:
          linear-gradient(180deg, rgba(255, 255, 255, 0.13), rgba(255, 255, 255, 0.045)),
          rgba(13, 10, 27, 0.86);
        border: 1px solid rgba(255, 255, 255, 0.13);
        box-shadow:
          0 34px 120px rgba(0, 0, 0, 0.58),
          0 0 80px rgba(139, 92, 246, 0.16);
        backdrop-filter: blur(26px);
      }

      .loginOrb {
        position: absolute;
        width: 220px;
        height: 220px;
        right: -70px;
        top: -80px;
        border-radius: 999px;
        background: rgba(168, 85, 247, 0.28);
        filter: blur(18px);
      }

      .brandPill {
        position: relative;
        z-index: 1;
        width: fit-content;
        padding: 7px 11px;
        border-radius: 999px;
        font-size: 10px;
        font-weight: 900;
        letter-spacing: 0.14em;
        color: rgba(233, 213, 255, 0.95);
        background: rgba(139, 92, 246, 0.16);
        border: 1px solid rgba(216, 180, 254, 0.18);
      }

      .loginCard h1 {
        position: relative;
        z-index: 1;
        margin: 18px 0 0;
        font-size: 40px;
        line-height: 1;
        letter-spacing: -0.07em;
      }

      .loginCard p {
        position: relative;
        z-index: 1;
        margin: 13px 0 0;
        color: rgba(226, 232, 240, 0.64);
        font-size: 14px;
        line-height: 1.7;
      }

      .loginForm {
        position: relative;
        z-index: 1;
        display: flex;
        gap: 10px;
        margin-top: 24px;
      }

      .loginForm input,
      .filterBar input,
      .filterBar select {
        min-width: 0;
        height: 48px;
        padding: 0 14px;
        border-radius: 16px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        outline: none;
        color: white;
        background: rgba(255, 255, 255, 0.07);
      }

      .loginForm input {
        flex: 1;
      }

      .loginForm button,
      .softBtn,
      .logoutBtn {
        height: 48px;
        padding: 0 17px;
        border: 0;
        border-radius: 16px;
        cursor: pointer;
        color: white;
        font-weight: 900;
        background: linear-gradient(135deg, #8b5cf6, #d946ef);
        box-shadow: 0 18px 42px rgba(139, 92, 246, 0.26);
      }

      .loginForm button:disabled,
      .softBtn:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }

      .loginHint {
        position: relative;
        z-index: 1;
        margin-top: 14px;
        font-size: 12px;
        color: rgba(226, 232, 240, 0.42);
      }

      .errorBox {
        width: min(1180px, 100%);
        margin: 0 auto 14px;
        padding: 14px;
        border-radius: 16px;
        color: rgba(254, 202, 202, 0.96);
        background: rgba(239, 68, 68, 0.12);
        border: 1px solid rgba(248, 113, 113, 0.18);
        font-size: 13px;
      }

      .sideNav {
        position: fixed;
        left: 18px;
        top: 18px;
        bottom: 18px;
        width: 246px;
        padding: 18px;
        border-radius: 30px;
        background:
          linear-gradient(180deg, rgba(255, 255, 255, 0.105), rgba(255, 255, 255, 0.045)),
          rgba(10, 8, 22, 0.78);
        border: 1px solid rgba(255, 255, 255, 0.105);
        box-shadow: 0 24px 80px rgba(0, 0, 0, 0.34);
        backdrop-filter: blur(24px);
      }

      .sideBrand {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 22px;
      }

      .brandLogo {
        width: 48px;
        height: 48px;
        display: grid;
        place-items: center;
        border-radius: 18px;
        font-weight: 950;
        background: linear-gradient(135deg, #8b5cf6, #ec4899);
        box-shadow: 0 16px 36px rgba(139, 92, 246, 0.34);
      }

      .sideBrand strong {
        display: block;
        font-size: 16px;
      }

      .sideBrand span {
        display: block;
        margin-top: 3px;
        font-size: 12px;
        color: rgba(226, 232, 240, 0.46);
      }

      .navList {
        display: grid;
        gap: 8px;
      }

      .navList button {
        width: 100%;
        padding: 13px;
        border: 1px solid rgba(255, 255, 255, 0.07);
        border-radius: 18px;
        cursor: pointer;
        text-align: left;
        color: white;
        background: rgba(255, 255, 255, 0.045);
      }

      .navList button span {
        display: block;
        font-weight: 900;
      }

      .navList button em {
        display: block;
        margin-top: 4px;
        font-style: normal;
        font-size: 12px;
        color: rgba(226, 232, 240, 0.42);
      }

      .navList .activeNav {
        background:
          radial-gradient(circle at 20% 0%, rgba(216, 180, 254, 0.22), transparent 40%),
          linear-gradient(135deg, rgba(139, 92, 246, 0.32), rgba(236, 72, 153, 0.12));
        border-color: rgba(216, 180, 254, 0.28);
      }

      .sideStatus {
        margin-top: 16px;
        padding: 15px;
        border-radius: 20px;
        background: rgba(255, 255, 255, 0.055);
        border: 1px solid rgba(255, 255, 255, 0.075);
      }

      .sideStatus span {
        font-size: 12px;
        color: rgba(226, 232, 240, 0.5);
      }

      .sideStatus strong {
        display: block;
        margin-top: 8px;
        font-size: 34px;
        line-height: 1;
      }

      .sideStatus p {
        margin: 8px 0 0;
        font-size: 11.5px;
        line-height: 1.5;
        color: rgba(226, 232, 240, 0.4);
      }

      .logoutBtn {
        position: absolute;
        left: 18px;
        right: 18px;
        bottom: 18px;
        background: rgba(255, 255, 255, 0.075);
        box-shadow: none;
      }

      .adminMain {
        min-height: 100vh;
        padding: 26px 28px 40px 292px;
      }

      .topBar {
        width: min(1180px, 100%);
        margin: 0 auto 18px;
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 18px;
      }

      .topBar h1 {
        margin: 16px 0 0;
        font-size: 42px;
        line-height: 1;
        letter-spacing: -0.07em;
      }

      .topBar p {
        margin: 10px 0 0;
        color: rgba(226, 232, 240, 0.55);
        font-size: 13px;
      }

      .heroGrid,
      .twoGrid,
      .threeGrid,
      .statsGrid,
      .panel {
        width: min(1180px, 100%);
        margin-left: auto;
        margin-right: auto;
      }

      .heroGrid {
        display: grid;
        grid-template-columns: 1.35fr 0.65fr;
        gap: 14px;
      }

      .commandCard,
      .liveCard,
      .statCard,
      .panel {
        border-radius: 28px;
        background:
          linear-gradient(180deg, rgba(255, 255, 255, 0.105), rgba(255, 255, 255, 0.045)),
          rgba(14, 11, 27, 0.76);
        border: 1px solid rgba(255, 255, 255, 0.105);
        box-shadow:
          0 22px 70px rgba(0, 0, 0, 0.24),
          inset 0 1px 0 rgba(255, 255, 255, 0.08);
        backdrop-filter: blur(22px);
      }

      .commandCard,
      .liveCard {
        padding: 22px;
      }

      .commandTop {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 18px;
      }

      .tinyLabel {
        font-size: 10px;
        font-weight: 900;
        letter-spacing: 0.14em;
        color: rgba(216, 180, 254, 0.86);
      }

      .commandTop h2,
      .liveCard h2 {
        margin: 10px 0 0;
        font-size: 64px;
        line-height: 0.9;
        letter-spacing: -0.075em;
      }

      .commandTop p,
      .liveCard p {
        margin: 10px 0 0;
        color: rgba(226, 232, 240, 0.5);
      }

      .healthRing {
        width: 118px;
        height: 118px;
        display: grid;
        place-items: center;
        border-radius: 999px;
        background:
          radial-gradient(circle at center, rgba(14, 11, 27, 0.95) 57%, transparent 58%),
          conic-gradient(#a78bfa, #ec4899, #7c3aed, #a78bfa);
        box-shadow: 0 0 40px rgba(139, 92, 246, 0.22);
      }

      .healthRing span {
        font-weight: 950;
      }

      .commandBottom {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 10px;
        margin-top: 22px;
      }

      .metricMini,
      .detailItem,
      .modeCard,
      .rankRow,
      .userCard,
      .logCard {
        background: rgba(255, 255, 255, 0.052);
        border: 1px solid rgba(255, 255, 255, 0.075);
      }

      .metricMini {
        padding: 13px;
        border-radius: 18px;
      }

      .metricMini span,
      .detailItem span {
        display: block;
        font-size: 12px;
        color: rgba(226, 232, 240, 0.5);
      }

      .metricMini strong,
      .detailItem strong {
        display: block;
        margin-top: 7px;
        font-size: 20px;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .onlineStrip {
        display: flex;
        flex-wrap: wrap;
        gap: 7px;
        margin-top: 18px;
      }

      .onlineStrip span,
      .onlineStrip em,
      .chipRow span,
      .logMeta span {
        padding: 6px 9px;
        border-radius: 999px;
        font-size: 11px;
        font-style: normal;
        color: rgba(226, 232, 240, 0.62);
        background: rgba(255, 255, 255, 0.07);
      }

      .statsGrid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 12px;
        margin-top: 14px;
      }

      .statCard {
        min-height: 126px;
        padding: 18px;
      }

      .glowStat {
        box-shadow:
          0 22px 70px rgba(0, 0, 0, 0.24),
          0 0 44px rgba(139, 92, 246, 0.2),
          inset 0 1px 0 rgba(255, 255, 255, 0.08);
      }

      .statCard span {
        display: block;
        font-size: 12px;
        color: rgba(226, 232, 240, 0.55);
      }

      .statCard strong {
        display: block;
        margin-top: 13px;
        font-size: 34px;
        line-height: 1;
        letter-spacing: -0.055em;
      }

      .statCard em {
        display: block;
        margin-top: 11px;
        font-size: 11.5px;
        font-style: normal;
        color: rgba(226, 232, 240, 0.38);
      }

      .twoGrid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 14px;
        margin-top: 14px;
      }

      .threeGrid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 14px;
        margin-top: 14px;
      }

      .panel {
        padding: 20px;
        margin-top: 14px;
      }

      .twoGrid .panel,
      .threeGrid .panel {
        width: 100%;
        margin-top: 0;
      }

      .panelHead {
        display: flex;
        justify-content: space-between;
        gap: 14px;
        margin-bottom: 16px;
      }

      .panelHead h2 {
        margin: 0;
        font-size: 20px;
        letter-spacing: -0.04em;
      }

      .panelHead p {
        margin: 7px 0 0;
        color: rgba(226, 232, 240, 0.52);
        font-size: 13px;
        line-height: 1.5;
      }

      .modeCards {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 10px;
      }

      .modeCard {
        padding: 14px;
        border-radius: 18px;
      }

      .modeTop {
        display: flex;
        justify-content: space-between;
        gap: 10px;
      }

      .modeTop span {
        font-size: 13px;
        color: rgba(226, 232, 240, 0.66);
      }

      .modeTop strong {
        font-size: 20px;
      }

      .modeBar {
        height: 9px;
        margin-top: 14px;
        overflow: hidden;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.07);
      }

      .modeBar i {
        display: block;
        height: 100%;
        border-radius: inherit;
        background: linear-gradient(135deg, #8b5cf6, #ec4899);
      }

      .modeCard p {
        margin: 10px 0 0;
        font-size: 12px;
        color: rgba(226, 232, 240, 0.42);
      }

      .detailGrid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 10px;
      }

      .detailItem {
        min-width: 0;
        padding: 13px;
        border-radius: 17px;
      }

      .rankList {
        display: grid;
        gap: 8px;
      }

      .rankRow {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        padding: 12px;
        border-radius: 16px;
      }

      .rankRow span {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: rgba(226, 232, 240, 0.68);
      }

      .keywordCloud {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .keywordCloud span {
        padding: 7px 10px;
        border-radius: 999px;
        font-size: 12px;
        color: rgba(233, 213, 255, 0.88);
        background: rgba(139, 92, 246, 0.14);
        border: 1px solid rgba(216, 180, 254, 0.16);
      }

      .usersLayout {
        grid-template-columns: 0.9fr 1.1fr;
      }

      .userList {
        display: grid;
        gap: 10px;
        max-height: calc(100vh - 210px);
        overflow: auto;
        padding-right: 2px;
      }

      .userCard {
        width: 100%;
        padding: 14px;
        border-radius: 18px;
        cursor: pointer;
        text-align: left;
        color: white;
      }

      .activeUser {
        border-color: rgba(216, 180, 254, 0.42);
        background:
          radial-gradient(circle at 15% 0%, rgba(216, 180, 254, 0.18), transparent 36%),
          linear-gradient(135deg, rgba(139, 92, 246, 0.25), rgba(236, 72, 153, 0.1));
      }

      .userCard div {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
      }

      .userCard p {
        margin: 8px 0 0;
        font-size: 12.5px;
        color: rgba(226, 232, 240, 0.62);
        line-height: 1.5;
      }

      .userCard em {
        display: block;
        margin-top: 9px;
        font-style: normal;
        font-size: 11.5px;
        color: rgba(226, 232, 240, 0.38);
      }

      .onlineTag,
      .offlineTag {
        padding: 5px 8px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 900;
      }

      .onlineTag {
        color: rgba(187, 247, 208, 0.95);
        background: rgba(34, 197, 94, 0.14);
      }

      .offlineTag {
        color: rgba(226, 232, 240, 0.45);
        background: rgba(255, 255, 255, 0.07);
      }

      .recentMiniList {
        display: grid;
        gap: 10px;
        margin-top: 14px;
      }

      .recentMiniList article {
        padding: 13px;
        border-radius: 17px;
        background: rgba(255, 255, 255, 0.052);
        border: 1px solid rgba(255, 255, 255, 0.075);
      }

      .recentMiniList span {
        font-size: 11px;
        color: rgba(226, 232, 240, 0.42);
      }

      .recentMiniList p {
        margin: 7px 0 0;
        font-size: 13px;
        line-height: 1.55;
        color: rgba(226, 232, 240, 0.72);
      }

      .userDangerBox {
        margin-top: 14px;
        padding: 12px;
        border-radius: 18px;
        background: rgba(239, 68, 68, 0.075);
        border: 1px solid rgba(248, 113, 113, 0.12);
      }

      .userDangerBox button {
        height: 36px;
        padding: 0 13px;
        border-radius: 999px;
        cursor: pointer;
        color: rgba(254, 202, 202, 0.96);
        font-size: 12px;
        font-weight: 900;
        background: rgba(239, 68, 68, 0.12);
        border: 1px solid rgba(248, 113, 113, 0.18);
      }

      .filterBar {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 14px;
      }

      .filterBar input {
        flex: 1;
      }

      .filterBar span {
        font-size: 12px;
        color: rgba(226, 232, 240, 0.46);
        white-space: nowrap;
      }

      .dangerBar {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin: -4px 0 14px;
        padding: 12px;
        border-radius: 18px;
        background: rgba(239, 68, 68, 0.075);
        border: 1px solid rgba(248, 113, 113, 0.12);
      }

      .dangerBar button,
      .miniDangerBtn,
      .dangerActionBtn {
        height: 34px;
        padding: 0 12px;
        border-radius: 999px;
        cursor: pointer;
        color: rgba(254, 202, 202, 0.96);
        font-size: 12px;
        font-weight: 900;
        background: rgba(239, 68, 68, 0.12);
        border: 1px solid rgba(248, 113, 113, 0.18);
      }

      .dangerBar button:hover,
      .miniDangerBtn:hover,
      .dangerActionBtn:hover,
      .userDangerBox button:hover {
        background: rgba(239, 68, 68, 0.2);
        border-color: rgba(248, 113, 113, 0.28);
      }

      .dangerBar button:disabled,
      .miniDangerBtn:disabled,
      .dangerActionBtn:disabled,
      .userDangerBox button:disabled {
        opacity: 0.52;
        cursor: not-allowed;
      }

      .logList {
        display: grid;
        gap: 10px;
      }

      .logCard {
        padding: 16px;
        border-radius: 20px;
      }

      .logMeta {
        display: flex;
        flex-wrap: wrap;
        gap: 7px;
        margin-bottom: 12px;
      }

      .logMetaWithAction {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
      }

      .logMetaWithAction > div {
        display: flex;
        flex-wrap: wrap;
        gap: 7px;
      }

      .messagePair {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }

      .messagePair.single {
        grid-template-columns: 1fr;
      }

      .messagePair div {
        min-width: 0;
        padding: 13px;
        border-radius: 17px;
        background: rgba(255, 255, 255, 0.04);
      }

      .messagePair strong {
        display: block;
        margin-bottom: 6px;
        font-size: 12px;
      }

      .messagePair p {
        margin: 0;
        white-space: pre-wrap;
        font-size: 13.5px;
        line-height: 1.68;
        color: rgba(226, 232, 240, 0.72);
      }

      .chipRow {
        display: flex;
        flex-wrap: wrap;
        gap: 7px;
        margin-top: 12px;
      }

      .contactBox {
        margin-top: 12px;
        padding: 12px;
        border-radius: 16px;
        color: rgba(233, 213, 255, 0.78);
        background: rgba(139, 92, 246, 0.1);
        border: 1px solid rgba(216, 180, 254, 0.14);
        font-size: 13px;
      }

      .feedbackActions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 12px;
      }

      .feedbackActions button {
        height: 34px;
        padding: 0 12px;
        border-radius: 999px;
        cursor: pointer;
        color: rgba(255, 255, 255, 0.92);
        font-size: 12px;
        font-weight: 900;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.1);
      }

      .feedbackActions button:hover {
        background: rgba(139, 92, 246, 0.22);
        border-color: rgba(216, 180, 254, 0.24);
      }

      .feedbackActions button:disabled {
        opacity: 0.52;
        cursor: not-allowed;
      }

      .feedbackActions .dangerActionBtn {
        color: rgba(254, 202, 202, 0.96);
        background: rgba(239, 68, 68, 0.12);
        border: 1px solid rgba(248, 113, 113, 0.18);
      }

      .settingsGrid {
        display: grid;
        gap: 12px;
      }

      .settingCard {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding: 16px;
        border-radius: 20px;
        background: rgba(255, 255, 255, 0.052);
        border: 1px solid rgba(255, 255, 255, 0.075);
      }

      .settingCard strong {
        display: block;
        font-size: 15px;
      }

      .settingCard span {
        display: block;
        margin-top: 6px;
        color: rgba(226, 232, 240, 0.58);
        font-size: 12.5px;
        line-height: 1.45;
      }

      .settingCard em {
        display: block;
        margin-top: 7px;
        color: rgba(226, 232, 240, 0.34);
        font-size: 11px;
        font-style: normal;
      }

      .switchBtn {
        position: relative;
        flex: 0 0 auto;
        width: 112px;
        height: 44px;
        border: 0;
        border-radius: 999px;
        cursor: pointer;
        color: rgba(255, 255, 255, 0.72);
        font-size: 12px;
        font-weight: 900;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.1);
        transition:
          background 0.18s ease,
          border-color 0.18s ease,
          opacity 0.18s ease;
      }

      .switchBtn i {
        position: absolute;
        left: 5px;
        top: 5px;
        width: 32px;
        height: 32px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.82);
        box-shadow: 0 8px 18px rgba(0, 0, 0, 0.24);
        transition: transform 0.18s ease;
      }

      .switchBtn span {
        position: relative;
        z-index: 1;
        display: block;
        padding-left: 26px;
      }

      .switchOn {
        color: white;
        background: linear-gradient(135deg, #8b5cf6, #ec4899);
        border-color: rgba(216, 180, 254, 0.28);
        box-shadow: 0 14px 34px rgba(139, 92, 246, 0.22);
      }

      .switchOn i {
        transform: translateX(70px);
      }

      .switchOn span {
        padding-left: 0;
        padding-right: 26px;
      }

      .switchBtn:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }

      .settingsNotice {
        margin-top: 14px;
        padding: 13px;
        border-radius: 17px;
        color: rgba(233, 213, 255, 0.72);
        background: rgba(139, 92, 246, 0.1);
        border: 1px solid rgba(216, 180, 254, 0.14);
        font-size: 12.5px;
        line-height: 1.6;
      }

      .empty {
        padding: 22px;
        border-radius: 18px;
        text-align: center;
        color: rgba(226, 232, 240, 0.42);
        background: rgba(255, 255, 255, 0.045);
      }

      @media (max-width: 1100px) {
        .sideNav {
          position: relative;
          left: auto;
          top: auto;
          bottom: auto;
          width: min(1180px, calc(100% - 28px));
          margin: 14px auto 0;
        }

        .logoutBtn {
          position: static;
          width: 100%;
          margin-top: 14px;
        }

        .adminMain {
          padding: 18px 14px 36px;
        }

        .navList {
          grid-template-columns: repeat(5, 1fr);
        }

        .sideStatus {
          display: none;
        }
      }

      @media (max-width: 880px) {
        .heroGrid,
        .twoGrid,
        .threeGrid,
        .usersLayout {
          grid-template-columns: 1fr;
        }

        .statsGrid {
          grid-template-columns: repeat(2, 1fr);
        }

        .modeCards,
        .detailGrid,
        .commandBottom {
          grid-template-columns: repeat(2, 1fr);
        }

        .messagePair {
          grid-template-columns: 1fr;
        }

        .topBar {
          align-items: flex-start;
          flex-direction: column;
        }
      }

      @media (max-width: 560px) {
        .navList {
          grid-template-columns: repeat(2, 1fr);
        }

        .statsGrid,
        .modeCards,
        .detailGrid,
        .commandBottom {
          grid-template-columns: 1fr;
        }

        .loginForm,
        .filterBar {
          flex-direction: column;
          align-items: stretch;
        }

        .loginForm button,
        .filterBar select {
          width: 100%;
        }

        .topBar h1,
        .loginCard h1 {
          font-size: 34px;
        }

        .healthRing {
          display: none;
        }

        .settingCard {
          align-items: flex-start;
          flex-direction: column;
        }

        .logMetaWithAction {
          align-items: flex-start;
          flex-direction: column;
        }
      }
    `}</style>
  );
}
