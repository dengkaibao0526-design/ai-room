export async function POST(req) {
  return Response.json({
    reply: "我收到你的消息了。现在 API 路由是通的。"
  });
}
