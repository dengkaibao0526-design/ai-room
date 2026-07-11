# KB ZERO 1v1 Server

小KB ZERO 的第一版实时 1v1 WebSocket 服务器。

## 本地运行

```bash
cd zero-server
npm install
npm run dev
```

健康检查：

```bash
curl http://localhost:10000/health
```

WebSocket 地址：

```text
ws://localhost:10000
```

## Render 部署

在 Render 创建 Web Service 时填：

- Repository: `dengkaibao0526-design/ai-room`
- Root Directory: `zero-server`
- Build Command: `npm install`
- Start Command: `npm start`
- Environment: `Node`
- Plan: Free 或 Starter

部署成功后健康检查：

```text
https://你的-render服务名.onrender.com/health
```

前端连接时使用：

```text
wss://你的-render服务名.onrender.com
```

## 当前协议

客户端发：

```json
{ "type": "matchmake", "name": "spark" }
```

同步状态：

```json
{ "type": "state", "x": 2.5, "y": 2.5, "yaw": 0, "pitch": 0, "weapon": 0 }
```

开火：

```json
{ "type": "shoot", "hit": true, "damage": 34 }
```

服务端会广播：

- `hello`
- `joined`
- `room_update`
- `countdown`
- `match_start`
- `snapshot`
- `shot`
- `kill`
- `respawn`
- `match_end`
- `player_left`
