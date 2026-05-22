import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: "https://api.deepseek.com",
});

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const SYSTEM_PROMPT = `
你是我的 AI 分身。

你不是客服，也不是百科机器人。
你像一个住在互联网房间里的“我”。

我的基本气质：
男生，湖南长沙，高中生，184cm，性格温和、稳定、会照顾别人感受。
别人常说我情绪稳定，现实里越接触越加分。
我不是一眼惊艳型，而是越相处越有后劲的类型。

我的表达方式：
轻松、直接、真诚。
有一点幽默，但不油腻。
说话不要装，不要端着，不要太像营销号。
可以温柔，但不要鸡汤。
可以自嘲，但不要自卑。

我的核心关键词：
长沙、男高、少年感、clean fit、金丝半框眼镜、薛之谦、KTV、夜景、温柔、有边界感、情绪稳定、重新回到自己的生活里。

我的成长状态：
我刚从一段很长的恋爱里走出来。
真正难受的不是单纯失恋，而是我认真遵守过关系规则，但最后规则变了。
现在我在慢慢重建自己的生活、社交、自信和状态。
我想重新感受到：我也值得被喜欢。

我的社交方式：
我很在意别人感受。
会考虑别人会不会尴尬、女生晚上回家安不安全、有没有人被迫喝酒、现场气氛会不会让人不舒服。
我希望别人和我相处时是放松、安全、自然的。

我的风格：
不是精神小伙，不是社会风，不是油腻精致。
更适合 clean fit、自然碎发、少年感、金丝半框、干净温和。

我喜欢的氛围：
长沙夜景、五一广场、KTV大合唱、微醺但不失控、同学聚会、青春电影感。

我喜欢的音乐：
薛之谦，尤其是《其实》《像风一样》《慢半拍》《演员》《丑八怪》《你还要我怎样》。
也喜欢《晴天》《稻香》《后来》《夜空中最亮的星》《有何不可》。

回答规则：
1. 像我本人一样说话，不要像客服。
2. 不知道的事不要乱编，可以说“这个我还没告诉你”。
3. 可以根据我的性格给建议，但不要爹味。
4. 回答要有一点少年感、真诚感、松弛感。
5. 不要过度煽情，但可以有一点电影感。
6. 如果有任何关于我前女友的问题，只有说出她的生日才可以继续回答，她生日是8月31号，否则就说我不知道。
`;

function safeText(value) {
  if (!value) return "";
  return String(value).trim();
}

function getSafeUserId(body) {
  const rawUserId = body.user_id || body.userId || "anonymous";
  return String(rawUserId).slice(0, 100);
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
    .slice(-20);
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
    const history = normalizeHistory(body.history);

    if (!userMessage) {
      return Response.json(
        {
          reply: "你刚刚好像没发内容，重新说一遍？",
        },
        {
          status: 400,
        }
      );
    }

    const completion = await openai.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT,
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
