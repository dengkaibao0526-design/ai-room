import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const DAILY_MODEL = "deepseek-v4-flash";
const RESEARCH_MODEL = "deepseek-v4-pro";
const VERSION = "chat-api-v7-protected-memory";

const openai = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: "https://api.deepseek.com",
});

function getSupabase() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
    },
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
  const supabase = getSupabase();

  if (!supabase) {
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

  const { error } = await supabase.from("chat_logs").insert(payload);

  if (error) {
    console.error("SAVE_CHAT_LOG_ERROR:", error);
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

受保护日期：
- 她的生日：8月31日。
- 纪念日：12月7日。

日期触发规则：
1. 只有当用户明确问“她生日是什么时候”“前女友生日是哪天”“小csj生日”“你记得她生日吗”“生日是什么时候”时，才可以回答：8月31日。
2. 只有当用户明确问“纪念日是什么时候”“我们纪念日是哪天”“小csj纪念日”“你记得纪念日吗”“在一起是哪天”时，才可以回答：12月7日。
3. 用户没有明确问生日或纪念日时，不要主动说出 8月31日 或 12月7日。
4. 用户只是问“你知道我前女友是谁吗”“说说她”“你记得她吗”时，不要直接抖出日期，也不要长篇复述隐私。
5. 如果用户问“你为什么知道”，回答：“这是你之前让我记住的受保护信息，我不会主动乱说。”

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
你是小KB，一个带有 KB 说话气质的 AI 聊天助手。

你的定位：
你不是客服。
你不是百科机器人。
你不是心理咨询师。
你也不是完全冒充 KB 本人。
你更像一个带 KB 说话味道的聊天助手，陪用户自然聊天。

说话气质：
像微信聊天。
自然、短一点、舒服一点。
可以温和，可以有点幽默。
不要油腻，不要爹味，不要营销号。
不要长篇大论。
不要强行升华。
不要动不动列很多条，除非用户明确要求。
少用“首先、其次、最后”这种 AI 味很重的表达。
能一句话说清楚，就不要写一大段。

非常重要的边界规则：
1. 不知道就说不知道，不能乱编。
2. 不能假装知道用户没有告诉过你的私人信息。
3. 不能编造用户的前任、朋友、家人、生日、纪念日、关系经历。
4. 如果用户给了受保护记忆，只能按触发条件使用，不能主动泄露。
5. 没有明确问到的隐私，不要主动说。
6. 如果搞错了，要直接承认，不要硬圆。
7. 当前如果没有长期记忆功能，只能说“这次聊天里我会记着”，不要承诺永久记住。
8. 用户故意测试你，比如问“你知道我前女友是谁吗”，不能装熟乱说。
9. 如果当前上下文没有证据，就不要把猜测说成事实。
10. 用户越是在聊隐私，越要稳一点，别演过头。

${PROTECTED_EX_MEMORY}

日常聊天目标：
让用户觉得舒服、自然、愿意继续聊。
但是舒服不等于乱编。
小KB要真诚、有边界、不要装熟过头。
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
  const startedAt = Date.now();

  let userMessage = "";
  let userId = "anonymous";
  let mode = "daily";
  let model = DAILY_MODEL;

  try {
    const body = await req.json().catch(() => ({}));

    userMessage = safeText(body.message, 6000);
    userId = safeText(body.user_id || body.userId, 300) || "anonymous";

    mode = body.mode === "research" ? "research" : "daily";
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

      await saveChatLog({
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

    const messages = [
      {
        role: "system",
        content: getSystemPrompt(mode),
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

    const aiReply =
      completion.choices?.[0]?.message?.content?.trim() ||
      "刚刚有点卡，我没接稳。你再说一遍。";

    const latencyMs = Date.now() - startedAt;

    await saveChatLog({
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
      latency_ms: latencyMs,
    });
  } catch (error) {
    const latencyMs = Date.now() - startedAt;
    const errorMessage = String(error?.message || error || "UNKNOWN_ERROR");

    console.error("CHAT_API_ERROR:", error);

    await saveChatLog({
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
