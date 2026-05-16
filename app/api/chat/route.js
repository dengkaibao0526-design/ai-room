import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST(req) {
  try {
    const body = await req.json();

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: body.messages
    });

    return Response.json({
      reply: completion.choices[0].message.content
    });
  } catch (error) {
    return Response.json({
      reply: "AI 暂时无法回应。"
    });
  }
}
