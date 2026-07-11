import OpenAI from "openai";
import { checkRateLimit, rateLimitResponse } from "../../../lib/rate-limit";

export const dynamic = "force-dynamic";

function createOpenAIClient() {
  return new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY,
    baseURL: "https://api.deepseek.com",
  });
}

const MODEL = "deepseek-v4-flash";
const VERSION = "copywriter-api-pro-v1";

function safeText(value, maxLength = 5000) {
  if (!value) return "";
  return String(value).trim().slice(0, maxLength);
}

function getStylePrompt(style) {
  const map = {
    natural: `
自然朋友圈风格。
像真人随手发的，不刻意，不端着，不营销。
语言要松弛，有生活感。
不要像 AI 总结，不要像广告文案。
`,

    kb: `
小KB风格。
干净、温和、少年感、长沙夜感、情绪稳定。
像朋友帮忙想出来的句子。
短一点，自然一点，不油腻，不爹味。
`,

    premium: `
高级感风格。
克制、简洁、有质感。
不要堆高级词，不要矫情，不要空。
像审美不错的人随手发出来的。
`,

    funny: `
轻松搞笑风格。
可以有一点幽默，一点反差，一点生活废话感。
不要尬，不要烂梗，不要用太多网络热词。
`,

    cool: `
有点拽但不油的风格。
克制、轻微自信、有边界感。
不要装逼，不要攻击别人，不要太用力。
`,

    icebear: `
白熊 Ice Bear 风格。
冷静寡言、温柔可靠、话少但细节到位。
句子短，语气稳，可以有一点反差萌。
不要啰嗦，不要油腻。
`,

    romantic: `
暧昧/恋爱风格。
自然、有分寸、轻轻表达在意。
不要舔，不要土味，不要太满，不要让人尴尬。
像朋友圈里刚刚好的暗示。
`,

    birthday: `
生日祝福风格。
真诚、自然、有记忆点。
不要模板化，不要老套，不要“愿你往后余生”这种泛滥表达。
像朋友认真写的。
`,

    xiaohongshu: `
小红书风格。
标题有吸引力，正文有分享感。
但不要营销号，不要过度种草，不要假精致。
要像真实生活分享。
`,

    comment: `
评论区回复风格。
短、准、自然。
像朋友在评论区回一句，不要像正式文案。
可以幽默，可以温柔，但别过界。
`,
  };

  return map[style] || map.natural;
}

function getPlatformPrompt(platform) {
  const map = {
    moments: "平台：微信朋友圈。要求自然、像真人、适合熟人关系里出现。",
    xiaohongshu:
      "平台：小红书。要求有标题感、分享感，但不要营销号，适合公开发布。",
    qq: "平台：QQ空间。可以更轻松、更有学生感、更随意一点。",
    comment: "场景：评论区。要求短句、自然、像朋友回复。",
    caption: "场景：图片配文。要求短、氛围感强，适合搭配照片。",
    blessing: "场景：祝福文案。要求真诚、自然、有温度，不模板。",
  };

  return map[platform] || map.moments;
}

function getLengthPrompt(length) {
  const map = {
    tiny: "长度：极短。每条 8 到 18 个字左右。",
    short: "长度：短。每条 1 到 2 句话。",
    medium: "长度：中等。每条 2 到 4 句话。",
    long: "长度：稍长。每条 4 到 6 句话，但不能啰嗦。",
  };

  return map[length] || map.medium;
}

function getIntensityPrompt(intensity) {
  const map = {
    low: "情绪强度：低调克制。不要太外露。",
    normal: "情绪强度：正常自然。不要过淡，也不要过满。",
    high: "情绪强度：稍微明显一点。可以更有情绪，但别矫情。",
    meme: "情绪强度：有梗一点。可以轻松幽默，但不要尬。",
  };

  return map[intensity] || map.normal;
}

function getEmojiPrompt(emojiMode) {
  const map = {
    none: "不要使用 emoji。",
    light: "可以少量使用 emoji，但最多 1 个，不要花。",
    more: "可以适当使用 emoji，但不要超过 3 个。",
  };

  return map[emojiMode] || map.none;
}

function getAvoidPrompt(avoidText) {
  const base = `
绝对避雷：
- 不要像 AI。
- 不要营销号。
- 不要油腻。
- 不要土味情话。
- 不要过度煽情。
- 不要堆砌形容词。
- 不要用“生活不止眼前的苟且”这类老套句子。
- 不要“愿你...”开头的模板祝福。
- 不要像公众号标题党。
- 不要强行升华。
- 不要太装。
`;

  if (!avoidText) return base;

  return `${base}

用户额外不想要：
${avoidText}
`;
}

function buildSystemPrompt({
  style,
  platform,
  length,
  intensity,
  emojiMode,
  avoid,
}) {
  return `
你是“小KB文案工作台”，一个专门生成朋友圈、小红书、QQ空间、评论区文案的 AI。

你的核心能力不是写得华丽，而是写得像真人。
你要懂分寸，懂语气，懂“不油腻”，懂什么叫刚刚好。

你生成的文案要符合：
1. 自然。
2. 有人味。
3. 不像 AI。
4. 不像营销号。
5. 不尴尬。
6. 不爹味。
7. 不强行升华。
8. 不过度煽情。
9. 不要每条都很像。
10. 可以有一点小KB的松弛感。

${getPlatformPrompt(platform)}

${getStylePrompt(style)}

${getLengthPrompt(length)}

${getIntensityPrompt(intensity)}

${getEmojiPrompt(emojiMode)}

${getAvoidPrompt(avoid)}

输出要求：
你必须严格按照下面格式输出。

【推荐文案】
1.
2.
3.

【更短一点】
1.
2.
3.

【更有氛围感】
1.
2.
3.

【轻松一点】
1.
2.
3.

【评论区回复】
1.
2.
3.

【一句话标题】
1.
2.
3.

【配图建议】
1.
2.
3.

【小KB建议】
用一句话告诉用户，这组文案适合怎么发，哪个最稳。
`;
}

export async function POST(req) {
  const rateLimit = checkRateLimit(req, {
    name: "copywriter",
    limit: 10,
    windowMs: 60 * 1000,
  });

  if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

  try {
    const body = await req.json().catch(() => ({}));

    const content = safeText(body.content, 5000);
    const scene = safeText(body.scene, 500);
    const style = safeText(body.style, 40) || "natural";
    const platform = safeText(body.platform, 40) || "moments";
    const length = safeText(body.length, 40) || "medium";
    const intensity = safeText(body.intensity, 40) || "normal";
    const emojiMode = safeText(body.emojiMode, 40) || "none";
    const avoid = safeText(body.avoid, 1000);

    if (!content) {
      return Response.json(
        {
          ok: false,
          version: VERSION,
          error: "请输入要生成文案的内容",
        },
        { status: 400 }
      );
    }

    if (!process.env.DEEPSEEK_API_KEY && !process.env.OPENAI_API_KEY) {
      return Response.json(
        {
          ok: false,
          version: VERSION,
          error: "AI API Key 没有配置",
        },
        { status: 500 }
      );
    }

    const systemPrompt = buildSystemPrompt({
      style,
      platform,
      length,
      intensity,
      emojiMode,
      avoid,
    });

    const userPrompt = `
用户想生成文案。

原始内容：
${content}

使用场景补充：
${scene || "没有额外补充"}

请生成文案。
注意：不要解释你怎么写的，直接给结果。
`;

    const openai = createOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: MODEL,
      temperature: 0.86,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
    });

    const result =
      completion.choices?.[0]?.message?.content?.trim() ||
      "刚刚有点卡，重新生成一次试试。";

    return Response.json({
      ok: true,
      version: VERSION,
      result,
      meta: {
        style,
        platform,
        length,
        intensity,
        emojiMode,
      },
    });
  } catch (error) {
    console.error("COPYWRITER_API_PRO_ERROR:", error);

    return Response.json(
      {
        ok: false,
        version: VERSION,
        error: "文案生成失败",
        detail: String(error?.message || error),
      },
      { status: 500 }
    );
  }
}
