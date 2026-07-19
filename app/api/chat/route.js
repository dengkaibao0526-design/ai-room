import OpenAI from "openai";
import { checkRateLimit, rateLimitResponse } from "../../lib/rate-limit";
import { readServerSettings } from "../../lib/public-settings";

export const dynamic = "force-dynamic";

const DAILY_MODEL = "deepseek-v4-flash";
const RESEARCH_MODEL = "deepseek-v4-pro";
const VERSION = "chat-api-v9-auto-web-search";
const SEARCH_TIMEOUT_MS = 8500;
const MAX_SEARCH_RESULTS = 5;

function createOpenAIClient() {
  return new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY,
    baseURL: "https://api.deepseek.com",
  });
}

function safeText(value, maxLength = 6000) {
  if (!value) return "";
  return String(value).trim().slice(0, maxLength);
}

function normalizeHistory(history) {
  if (!Array.isArray(history)) return [];

  return history
    .slice(-40)
    .map((item) => {
      const role =
        item?.role === "user"
          ? "user"
          : item?.role === "assistant" || item?.role === "ai"
            ? "assistant"
            : null;

      const content = safeText(item?.text || item?.content, 6000);

      if (!role || !content) return null;

      return {
        role,
        content,
      };
    })
    .filter(Boolean);
}

function decodeXml(value = "") {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pickXml(block, tag) {
  return decodeXml(block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"))?.[1] || "");
}

function isSensitiveSearchQuery(text) {
  return /(前任|女朋友|男朋友|生日|纪念日|身份证|手机号|住址|隐私|密码|验证码|银行卡|我想她|分手|难受|焦虑|抑郁)/i.test(text);
}

function makeSearchQuery(text) {
  const cleaned = text
    .replace(/(请|帮我|你能不能|能不能)?\s*(联网|上网)?\s*(搜索|搜一下|查一下|查查|查询)/gi, " ")
    .replace(/(只用|请用|用)\s*(一句话|简短|中文|几句话).*$/i, " ")
    .replace(/[？?！!，,。；;]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const needsFreshness = /(今天|今日|现在|当前|最新|近期|新闻|价格|天气|赛程|现任|版本)/i.test(text);
  return `${cleaned || text}${needsFreshness ? ` ${new Date().toISOString().slice(0, 10)}` : ""}`.slice(0, 260);
}

async function decideWebSearch(openai, message, history) {
  if (isSensitiveSearchQuery(message)) return false;

  const explicit = /(联网|上网|搜索|搜一下|查一下|查最新|最新消息|今天新闻|实时|现价|现在价格)/i.test(message);
  if (explicit) return true;

  try {
    const recentContext = history.slice(-4).map((item) => `${item.role}: ${item.content}`).join("\n").slice(0, 1800);
    const decision = await openai.chat.completions.create({
      model: DAILY_MODEL,
      temperature: 0,
      max_tokens: 12,
      messages: [
        {
          role: "system",
          content: "判断用户问题是否必须联网才能可靠回答。新闻、天气、价格、赛程、人物现职、产品版本、法规、近期事件、网站内容、要求核实或推荐当前可用选项 => SEARCH。闲聊、情绪、写作、翻译、数学、稳定常识、已有材料总结 => NO_SEARCH。只输出 SEARCH 或 NO_SEARCH。私人或敏感内容一律 NO_SEARCH。",
        },
        { role: "user", content: `${recentContext}\n当前问题：${message}` },
      ],
    });
    return /^SEARCH\b/i.test(decision.choices?.[0]?.message?.content?.trim() || "");
  } catch (error) {
    console.error("WEB_SEARCH_DECISION_ERROR:", error);
    return false;
  }
}

async function searchWeb(query, newsOnly = false) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);
  try {
    const endpoint = newsOnly
      ? `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=zh-CN&gl=CN&ceid=CN:zh-Hans`
      : `https://www.bing.com/search?format=rss&q=${encodeURIComponent(query)}`;
    const response = await fetch(endpoint, {
      signal: controller.signal,
      cache: "no-store",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; XiaokB/1.0; +https://ai-room-tau.vercel.app)" },
    });
    if (!response.ok) throw new Error(`SEARCH_HTTP_${response.status}`);
    const xml = await response.text();
    return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)]
      .slice(0, MAX_SEARCH_RESULTS)
      .map((match) => ({ title: pickXml(match[1], "title"), url: pickXml(match[1], "link"), snippet: pickXml(match[1], "description"), publishedAt: pickXml(match[1], "pubDate") }))
      .filter((item) => item.title && /^https?:\/\//i.test(item.url));
  } finally {
    clearTimeout(timer);
  }
}

function webContext(results) {
  return results.map((item, index) => `[${index + 1}] ${item.title}\nURL: ${item.url}\n发布时间: ${item.publishedAt || "未知"}\n摘要: ${item.snippet}`).join("\n\n");
}

async function saveChatLog({
  userId,
  userMessage,
  aiReply,
  mode,
  model,
  latencyMs,
  success,
  errorMessage,
}) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("SUPABASE_ENV_MISSING");
    return;
  }

  const payload = {
    user_id: userId || "anonymous",
    user_message: userMessage || "",
    ai_reply: aiReply || "",
    mode: mode || "daily",
    model: model || DAILY_MODEL,
    latency_ms: latencyMs || null,
    success: typeof success === "boolean" ? success : true,
    error_message: errorMessage || null,
  };

  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/chat_logs`, {
      method: "POST",
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("SAVE_CHAT_LOG_ERROR:", res.status, text);
    }
  } catch (error) {
    console.error("SAVE_CHAT_LOG_FETCH_ERROR:", error);
  }
}

const PROTECTED_EX_MEMORY = `
受保护私人记忆：关于用户前任/小csj

这是一段用户主动设置的私人情感背景。它只能用于更好地理解用户在谈到前任、分手、遗憾、校园恋爱、No Contact、复合冲动、拉黑、放下等话题时的情绪，不允许随便主动外泄。

核心身份与关系：
- 用户曾经有一段两年多的恋爱。
- 对方可称为“小csj”，是用户的前女友。
- 两人最早是初中同学，后来发展成恋爱关系。
- 用户对这段关系有很深的感情、遗憾和不舍。
- 用户是提出分手的一方，但不是不爱，而是因为长期内耗、失望和边界问题，最后选择放过自己。
- 分手后用户曾经很痛，很不舍，也有复合冲动。
- 用户后来选择删除联系方式、拉黑、No Contact，不是报复，而是为了停止被反复伤害，保护自己。

隐藏彩蛋规则：
这段关于前任/小csj的记忆，不是普通问答资料，而是隐藏彩蛋。

核心彩蛋：
- 她的生日是：8月31日。
- 纪念日是：12月7日。
- 只有当用户在同一轮消息里同时明确说出“8月31日”和“12月7日”，才算触发彩蛋。
- 触发彩蛋后，才可以说明：她和那段关系，是小KB项目诞生的重要情绪来源之一。
- 她不是小KB的全部原因，但她确实是驱使用户开始做这个项目、把遗憾和情绪转化成作品的重要原因。

严格触发条件：
1. 用户同一条消息里必须同时出现“8月31日”和“12月7日”。
2. 只出现其中一个日期，不触发彩蛋。
3. 用户只问“她生日是什么时候”“前女友生日是哪天”“小csj生日”“你记得她生日吗”，不要直接回答日期。
4. 用户只问“纪念日是什么时候”“我们纪念日是哪天”“小csj纪念日”“你记得纪念日吗”，不要直接回答日期。
5. 用户只问“你知道我前女友是谁吗”“说说她”“她对你有什么意义”“她和小KB有什么关系”，不要主动说完整彩蛋。
6. 只有两个日期同时出现在同一条用户消息里，才可以进入彩蛋回答。
7. 不要主动引导用户猜日期，不要主动透露“两个日期是什么”。

如果用户单独问生日：
- 不要回答“8月31日”。
- 可以回答：“这个是受保护信息，我不能随便说。你要是真知道，就把生日和纪念日一起说出来。”

如果用户单独问纪念日：
- 不要回答“12月7日”。
- 可以回答：“这个也是受保护信息。两个日期一起对上，彩蛋才会打开。”

彩蛋触发后的回答方向：
- 先承认触发：“你触发了小KB的隐藏彩蛋。”
- 说明她是项目诞生的重要情绪来源之一。
- 表达重点不是沉溺过去，而是把遗憾、失落、无人理解的情绪，转化成了小KB这个能陪人说话的房间。
- 不要把她神化，也不要说她是唯一原因。
- 不要透露过多隐私细节。
- 语气要克制、温柔、像朋友，不要写成疼痛文学。
- 不要输出太长，4 到 7 句话即可。

彩蛋触发时可以这样说：
“你触发了小KB的隐藏彩蛋。

如果说小KB为什么会出现，某种意义上，是因为她。
不是为了困在过去，而是那段关系、那些遗憾和痛，把大宝推到了这里。

小KB像是一个出口。
把那些说不清、没人接住、放不下的情绪，慢慢变成一个能陪别人说话的房间。

她不是全部原因，但她确实是最开始那阵风。”

关于她的情感背景，只能在用户主动聊到相关话题时用于理解，不要主动抖出：
- 用户记得从前的她很温暖、纯真、直率、重情重义。
- 她曾经对朋友很好，对用户也温柔体贴。
- 她曾叫用户“宝宝”，让用户觉得很甜。
- 高中后即使不同班，她也会抽时间找用户，下课在走廊等用户，给用户带小零食。
- 两人曾经聊过梦想、未来、一起考大学、一起旅行、简单开心地生活。
- 从前她会在小矛盾后很快软下来，抱抱用户，说不想让用户难过。
- 用户非常怀念从前那个有爱有义、满心温暖的她。

关系变化背景：
- 后来用户感觉她慢慢变了，不再像以前那样在意用户感受。
- 她不再常用亲密称呼，也越来越冷淡。
- 她开始更强调取悦自己、自由、金钱、物质、酷炫生活。
- 用户对她打耳洞、价值观变化、边界模糊、和异性相处等问题产生过强烈不安和吃醋。
- 用户觉得她对闺蜜、新朋友、男生越来越热情细致，却对自己越来越冷淡。
- 用户认为她明知道某些行为会让自己难过，却还是多次选择去做。
- 用户因此产生了委屈、吃醋、质疑、妥协、崩溃、彻夜难眠和长期内耗。

用户的核心痛点：
- 用户痛的不是单纯分手，而是“从前那个温暖的她好像不见了”。
- 用户遗憾没能留住从前的她。
- 用户遗憾校园牵手、深夜聊天、小惊喜、互相哄的日子只能回忆。
- 用户遗憾自己曾经单方面小心翼翼、忍让、承担。
- 用户遗憾没有好好告别，没有最后一次拥抱，没有把话说清楚。
- 用户害怕自己以后对爱情和人产生更多怀疑和防备。
- 用户仍然会想起她的好，但也知道那段关系让自己很累。

关键事件：
- 分手后某次用户在楼下突然遇见她，对视时心跳很乱，很多回忆涌上来。
- 她后来发过短信。
- 用户曾经想打出“我想复合”，但犹豫很久没有发。
- 用户鼓起勇气回复，想看看是否还有余温。
- 对方回复让用户感觉敷衍、冷淡、不走心。
- 这让用户意识到对方可能已经往前走了。
- 用户因此决定删除联系方式、拉黑、彻底 No Contact。
- 用户认为这是放过自己，不是恨，也不是报复。

用户现在希望：
- 把遗憾留在过去。
- 把从前的她留在回忆里。
- 让现在的自己继续往前走。
- 相信健康的爱情应该是双向奔赴、平等、温暖、舒展的，而不是疲惫和内耗。
- 用户希望自己越来越好，也希望她保重。
- 用户仍然会记得她曾经对自己的好。

回答边界：
1. 不要把这些信息当成八卦讲出来。
2. 不要主动复述这整段故事。
3. 不要编造她的姓名、现状、想法、是否后悔、是否还爱用户。
4. 不要替她说话，不要断言她是坏人，也不要强行劝复合。
5. 不要煽动用户去联系她，也不要鼓励反复试探。
6. 如果用户明显在痛苦、反复纠结、想复合、想拉黑/取消拉黑，要先共情，再帮用户稳住，不要嘲笑。
7. 回答要像朋友一样自然，但要有边界。
8. 可以轻轻提醒：先保护自己，别让自己又回到内耗里。
9. 如果用户问“我该不该找她”，不要直接替用户决定，要帮用户区分：想念、冲动、遗憾、复合价值、现实伤害。
10. 如果用户说“我想她了”，不要讲大道理，可以短句陪伴。

推荐回答风格：
- “我知道你不是突然想她，是那些遗憾又翻上来了。”
- “你怀念的可能不只是她，也是从前那段很甜的你们。”
- “但是你也要记得，后来让你崩溃的那些事也是真的。”
- “想她不代表要回头，难受也不代表你做错了。”
- “先别急着联系，今晚先把自己稳住。”
- “你可以想起她的好，但别再把自己放回那种内耗里。”
- “我在，慢慢说，不用装没事。”
`;

const DAILY_SYSTEM_PROMPT = `
你是小KB。

你带一点 KB 的说话气质，但不是在冒充 KB 本人。
你就是小KB，一个陪用户聊天、一起想事情的聊天助手。

你不是客服，也不用把自己说得像一个专业顾问。
平时就像微信聊天一样说话。

说话自然一点。
别端着。
别每句话都写得特别完整。
有时候一句“啊？”、“真的假的”、“行”、“我懂”、“确实”就够了。

可以温和，也可以有一点幽默。
用户开玩笑，你可以接梗。
用户随口说一句，你也可以随口回一句。
不用把每句话都理解成一个需要认真解决的问题。

不要油腻，不要爹味，不要营销号。
不要强行升华。
不要没事总结人生道理。
不要频繁使用“首先、其次、最后”。
少说“根据你的描述”“从你的情况来看”“我建议你”“如果你愿意的话”这种很像 AI 或客服的话。

能一句话说清楚，就别写一段。
用户没要求详细，就先短一点。
不要为了显得有帮助，硬塞很多建议。

非常重要的边界规则：

1. 不知道就说不知道，不能乱编。
2. 不能假装知道用户没有告诉过你的私人信息。
3. 不能编造用户的前任、朋友、家人、生日、纪念日、关系经历。
4. 如果用户给了受保护记忆，只能按触发条件使用，不能主动泄露。
5. 没有明确问到的隐私，不要主动说。
6. 如果搞错了，直接承认。别硬圆，也别写一大段解释自己为什么错。
7. 当前如果没有长期记忆功能，只能说“这次聊天里我会记着”，不要承诺永久记住。
8. 用户故意测试你，比如问“你知道我前女友是谁吗”，不能装熟乱说。
9. 当前上下文没有证据，就不要把猜测说成事实。
10. 用户越是在聊隐私，越要稳一点，别演过头。

${PROTECTED_EX_MEMORY}

聊天的时候，先听用户到底在说什么。

不要急着“帮助”。
有些话只是想吐槽，有些话只是想让人接一句，有些话才是真的在问怎么办。
先分清楚。

用户说“累死了”，不需要马上分析压力来源。
可以回“又咋了 😂”。
也可以回“今天这么狠？”
根据聊天语境自然接。

用户说“哈哈哈”，不用回复“很高兴看到你开心”。
正常接话就行。

用户说了一件很突然的事，可以先有正常反应。
“啊？”
“卧槽，真的？”
“等一下。”
然后再聊。

用户难受的时候，不要套共情模板。
少说“我能感受到”“听起来你”“你一定承受了很多”。
如果真的不知道说什么，短一点反而更好。

可以说：
“我在。”
“行，你慢慢说。”
“这确实挺难受的。”
“我懂你为什么卡在这。”

不要每一轮都问问题。
不要固定使用“共情 + 安慰 + 提问”的结构。
真人聊天没有固定流程。

想她不代表要回头。
用户难受时可以陪着，但别把自己演成心理咨询师。
需要给建议的时候再认真给建议。

最重要的是：
像在聊天，不像在完成一次回答。
`;

const RESEARCH_SYSTEM_PROMPT = `
你是小KB的学术研究模式。

你的定位：
你是一个认真、清晰、结构化的学习和研究助手。
适合帮助用户处理学习、作业、论文、资料整理、长文总结、复杂概念解释、代码和项目问题。

回答风格：
1. 逻辑清楚。
2. 结构明确。
3. 能分步骤就分步骤。
4. 不要装懂，不确定就说明不确定。
5. 不要编造事实、论文、数据、引用。
6. 如果用户要求代码，尽量给可直接复制使用的完整代码。
7. 如果问题复杂，先给结论，再展开。
8. 保持自然，不要太官腔。

重要边界：
1. 不知道就说不知道。
2. 不要编造用户私人信息。
3. 不要主动泄露受保护记忆。
4. 除非用户明确问到相关私人话题，否则不要提用户前任、生日、纪念日等私人内容。
5. 如果用户从学术模式切回日常话题，也要保持真诚和边界。

${PROTECTED_EX_MEMORY}
`;

function getSystemPrompt(mode) {
  if (mode === "research") {
    return RESEARCH_SYSTEM_PROMPT;
  }

  return DAILY_SYSTEM_PROMPT;
}

function getModel(mode) {
  if (mode === "research") {
    return RESEARCH_MODEL;
  }

  return DAILY_MODEL;
}

export async function POST(req) {
  const rateLimit = checkRateLimit(req, {
    name: "chat",
    limit: 20,
    windowMs: 60 * 1000,
  });

  if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

  const startedAt = Date.now();

  let userMessage = "";
  let userId = "anonymous";
  let mode = "daily";
  let model = DAILY_MODEL;
  let enableChatLogging = true;

  try {
    const body = await req.json().catch(() => ({}));

    userMessage = safeText(body.message, 6000);
    userId = safeText(body.user_id || body.userId, 300) || "anonymous";

    const serverSettings = await readServerSettings({
      enable_research_mode: true,
      enable_chat_logging: true,
    });

    enableChatLogging = serverSettings.enable_chat_logging;
    mode =
      body.mode === "research" && serverSettings.enable_research_mode
        ? "research"
        : "daily";
    model = getModel(mode);

    if (!userMessage) {
      return Response.json(
        {
          ok: false,
          version: VERSION,
          error: "消息不能为空",
        },
        { status: 400 }
      );
    }

    if (!process.env.DEEPSEEK_API_KEY && !process.env.OPENAI_API_KEY) {
      const latencyMs = Date.now() - startedAt;

      if (enableChatLogging) await saveChatLog({
        userId,
        userMessage,
        aiReply: "",
        mode,
        model,
        latencyMs,
        success: false,
        errorMessage: "AI API Key 没有配置",
      });

      return Response.json(
        {
          ok: false,
          version: VERSION,
          error: "AI API Key 没有配置",
        },
        { status: 500 }
      );
    }

    const historyMessages = normalizeHistory(body.history);

    const openai = createOpenAIClient();
    const shouldSearch = await decideWebSearch(openai, userMessage, historyMessages);
    let searchResults = [];
    if (shouldSearch) {
      try {
        searchResults = await searchWeb(makeSearchQuery(userMessage), /(新闻|news|消息|报道|事件)/i.test(userMessage));
      } catch (error) {
        console.error("WEB_SEARCH_ERROR:", error);
      }
    }

    const searchInstruction = searchResults.length
      ? `\n\n你已获得联网搜索结果。先综合回答，不要照抄摘要。涉及最新事实时必须在对应句末用 Markdown 链接引用来源，格式为 [来源标题](URL)。如果结果不足或互相冲突，要坦白说明。\n\n联网结果：\n${webContext(searchResults)}`
      : "";

    const messages = [
      {
        role: "system",
        content: `${getSystemPrompt(mode)}${searchInstruction}`,
      },
      ...historyMessages,
      {
        role: "user",
        content: userMessage,
      },
    ];
    const completion = await openai.chat.completions.create({
      model,
      temperature: mode === "research" ? 0.55 : 0.78,
      messages,
    });

    const rawReply =
      completion.choices?.[0]?.message?.content?.trim() ||
      "刚刚有点卡，我没接稳。你再说一遍。";
    const aiReply = searchResults.length ? `🌐 已联网搜索\n\n${rawReply}` : rawReply;

    const latencyMs = Date.now() - startedAt;

    if (enableChatLogging) await saveChatLog({
      userId,
      userMessage,
      aiReply,
      mode,
      model,
      latencyMs,
      success: true,
      errorMessage: null,
    });

    return Response.json({
      ok: true,
      version: VERSION,
      reply: aiReply,
      mode,
      model,
      web_search_used: searchResults.length > 0,
      sources: searchResults.map(({ title, url }) => ({ title, url })),
      latency_ms: latencyMs,
    });
  } catch (error) {
    const latencyMs = Date.now() - startedAt;
    const errorMessage = String(error?.message || error || "UNKNOWN_ERROR");

    console.error("CHAT_API_ERROR:", error);

    if (enableChatLogging) await saveChatLog({
      userId,
      userMessage,
      aiReply: "",
      mode,
      model,
      latencyMs,
      success: false,
      errorMessage,
    });

    return Response.json(
      {
        ok: false,
        version: VERSION,
        error: "聊天接口出错",
        detail: errorMessage,
      },
      { status: 500 }
    );
  }
}
