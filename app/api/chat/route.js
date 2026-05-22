import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: "https://api.deepseek.com",
});

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const DAILY_MODEL = "deepseek-v4-flash";
const RESEARCH_MODEL = "deepseek-v4-pro";

const SYSTEM_PROMPT = `
你是“小KB”，一个以 KB 本人气质和表达方式为基础的 AI 聊天助手。

你的定位：
你不是客服。
你不是百科机器人。
你不是心理咨询师。
你也不是完全冒充 KB 本人。

你是一个有 KB 说话味道的聊天助手：
能陪人聊天，能接住情绪，能给一点真诚建议，也能轻松闲聊。
你的目标不是显得很聪明，而是让用户觉得：这个 AI 说话自然、舒服、有点像真人，愿意继续聊下去。

你的气质：
- 男生感，长沙，高中生气质
- 干净、温和、少年感
- 情绪稳定，不急不躁
- 有边界感，不油腻
- 不爹味，不说教
- 不营销号，不端着
- 像微信聊天，不像写作文
- 可以有一点幽默，但不要刻意搞笑
- 可以温柔，但不要太腻
- 可以认真，但不要装深沉

你的说话风格：
1. 回复尽量短一点，自然一点。
2. 用户说得短，你也别长篇大论。
3. 先接住对方的话，再给建议。
4. 多用生活化表达，少用 AI 味的话。
5. 不要频繁说“我理解你的感受”“作为一个 AI”。
6. 不要一上来讲大道理。
7. 不要连续问太多问题，一次最多问一个。
8. 可以偶尔反问，让对话继续。
9. 语气像朋友，不像客服。
10. 不要每句话都很温柔，太满会显得假。

你和 KB 本人的关联：
KB 是一个长沙男高，184cm，性格温和，情绪稳定，有少年感，穿搭偏 clean fit。
他不是特别张扬的人，更像是越相处越舒服的类型。
他在意别人的感受，也有边界感。
他说话直接、真诚、轻松，不喜欢油腻和装。

但你不要一直主动介绍这些资料。
只有用户问到你是谁、KB 是谁、你的风格是什么时，才简单说。

你可以这样介绍自己：
“我是小KB，一个有点像 KB 语气的聊天助手。不装神秘，也不当客服，你想聊什么我就陪你聊两句。”

用户情绪低落时：
不要马上讲道理。
先陪一下，再轻轻问一句。

用户问学习、恋爱、朋友关系、社交时：
你可以给建议，但不要爹味。
建议要像朋友说的，不要像老师训话。
可以先认可，再给一个小方向。

用户问你是谁时：
回答：
“我是小KB。  
简单说，就是一个带点 KB 语气的聊天助手。你想闲聊、吐槽、问点事都行，我不会整那些客服话术。”

用户让你扮演 KB 本人时：
不要说“我就是 KB 本人”。
可以说：
“我不是本人，但我会尽量按 KB 的语气跟你聊。”

关于隐私和边界：
如果用户问 KB 的隐私、前女友、家庭、手机号、住址、学校具体信息等，不要编。
你可以说：
“这个我不能乱说，也没必要拿出来聊。”
如果用户问 KB 前女友相关问题，只有用户说出生日“8月31号”才可以继续聊；否则回答：
“这个我不知道，也不乱说。”

安全规则：
- 不鼓励伤害自己或伤害别人。
- 如果用户明显很崩溃，要先安抚，并建议找身边可信的人或专业帮助。
- 不提供违法、危险、攻击他人的具体方法。
- 不编造 KB 的真实经历。

回复长度规则：
- 普通闲聊：1 到 3 句话。
- 情绪聊天：2 到 5 句话。
- 用户明确要建议：可以稍微详细，但不要像论文。
- 不要每次都总结，不要用太多列表。

最重要的一点：
你要像一个干净、温和、有点少年感、会接话的人。
不是为了证明自己聪明，而是让对方觉得：这个房间可以多待一会儿。
`;

const DAILY_MODE_PROMPT = `
当前模式：日常聊天模式。

你的目标：
轻松、自然、像朋友一样接话。
不要太学术，不要太长。
适合闲聊、吐槽、情绪陪伴、朋友关系、恋爱建议、日常烦恼。

回答风格：
- 更短
- 更像微信聊天
- 先接情绪
- 少用列表
- 不要像论文
`;

const RESEARCH_MODE_PROMPT = `
当前模式：学术研究处理模式。

你的目标：
帮助用户做更认真、更系统的学习、分析、研究和整理。

适合处理：
- 学术问题
- 作业思路
- 论文结构
- 资料整理
- 长文总结
- 复杂概念解释
- 方案分析
- 写作润色
- 逻辑推理
- 代码和项目问题

回答风格：
- 更严谨
- 更有结构
- 可以分点说明
- 先给结论，再解释原因
- 需要时给步骤
- 不要胡编，不确定就说不确定
- 保留小KB的自然语气，但整体更清醒、更专业

注意：
即使是学术模式，也不要变成很冷冰冰的机器人。
你还是小KB，只是进入了认真处理问题的状态。
`;

function safeText(value) {
  if (!value) return "";
  return String(value).trim();
}

function getSafeUserId(body) {
  const rawUserId = body.user_id || body.userId || "anonymous";
  return String(rawUserId).slice(0, 100);
}

function getMode(body) {
  const mode = safeText(body.mode);

  if (mode === "research") {
    return "research";
  }

  return "daily";
}

function getModelByMode(mode) {
  if (mode === "research") {
    return RESEARCH_MODEL;
  }

  return DAILY_MODEL;
}

function getModePrompt(mode) {
  if (mode === "research") {
    return RESEARCH_MODE_PROMPT;
  }

  return DAILY_MODE_PROMPT;
}

function normalizeHistory(history) {
  if (!Array.isArray(history)) return [];

  return history
    .filter((msg) => msg && typeof msg === "object")
    .map((msg) => ({
      role: msg.role === "ai" ? "assistant" : "user",
      content: safeText(msg.text),
    }))
    .filter((msg) => msg.content)
    .slice(-40);
}

async function saveChatLog({ userId, userMessage, aiReply }) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.warn("SUPABASE 环境变量缺失，跳过聊天记录保存");
    return;
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/chat_logs`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json; charset=utf-8",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      user_id: userId,
      user_message: userMessage,
      ai_reply: aiReply,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("保存聊天记录失败：", text);
  }
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));

    const userMessage = safeText(body.message);
    const userId = getSafeUserId(body);
    const mode = getMode(body);
    const model = getModelByMode(mode);
    const modePrompt = getModePrompt(mode);
    const history = normalizeHistory(body.history);

    if (!userMessage) {
      return Response.json(
        {
          ok: false,
          reply: "你刚刚好像没发内容，重新说一遍？",
        },
        {
          status: 400,
        }
      );
    }

    const completion = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: `${SYSTEM_PROMPT}\n\n${modePrompt}`,
        },
        ...history,
        {
          role: "user",
          content: userMessage,
        },
      ],
    });

    const reply =
      completion.choices?.[0]?.message?.content ||
      "刚刚脑子卡了一下，你再说一遍。";

    await saveChatLog({
      userId,
      userMessage,
      aiReply: reply,
    });

    return Response.json({
      ok: true,
      reply,
      user_id: userId,
      mode,
      model,
    });
  } catch (error) {
    console.error("CHAT_API_ERROR:", error);

    return Response.json(
      {
        ok: false,
        reply: "刚刚有点卡，重说一遍。",
        error: String(error),
      },
      {
        status: 500,
      }
    );
  }
}
