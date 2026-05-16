import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: "https://api.deepseek.com"
});

export async function POST(req) {
  try {
    const body = await req.json();

    const completion = await openai.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: "你是我的 AI 分身。说话轻松、直接、真诚，有少年感，不像客服，不油腻。"
        },
        {
          role: "user",
          content: body.message || ""
        }
      ]
    });

    return Response.json({
      reply: completion.choices[0].message.content
    });
  } catch (error) {
    return Response.json({
      reply: "连接失败：DeepSeek Key、余额或接口配置可能有问题。"
    });
  }
}
