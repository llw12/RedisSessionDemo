# RedisSessionDemo

一个基于 Express、express-session、connect-redis 和 Redis 的 Session 缓存示例项目。

本项目演示如何把浏览器 Session 存储到 Redis 中，并通过访问 URL query 参数的方式，把请求参数保存到当前用户的 Session 里。再次访问接口时，可以看到之前缓存到 Session 中的数据。

## 技术栈

- Node.js
- Express 5
- express-session
- connect-redis
- redis 官方 Node.js 客户端
- nodemon

项目依赖可以在 `package.json` 中查看，当前入口文件是 `index.js`，开发启动脚本是 `npm run dev`。 

## 功能说明

项目启动后会连接本地 Redis：

```js
redis://127.0.0.1:6379
```

Session 会被保存到 Redis 中，key 前缀为：

```text
myapp_session:
```

访问根路径 `/` 时，程序会读取 URL 中的 query 参数，并把这些参数合并保存到当前浏览器 Session 中。

例如第一次访问：

```text
http://localhost:3000/?name=Tom&age=25
```

Session 中会保存：

```json
{
  "name": "Tom",
  "age": "25"
}
```

再次访问：

```text
http://localhost:3000/?city=Beijing
```

Session 中会变成：

```json
{
  "name": "Tom",
  "age": "25",
  "city": "Beijing"
}
```

## 项目结构

```text
RedisSessionDemo/
├── index.js
├── package.json
├── package-lock.json
└── README.md
```

## 环境要求

请先安装：

- Node.js
- npm
- Redis

本项目默认 Redis 运行在：

```text
127.0.0.1:6379
```

## 安装依赖

在项目根目录执行：

```bash
npm install
```

## 启动 Redis

### Windows 本机 Redis

如果你已经在 Windows 本机安装 Redis，请确保 Redis 服务已启动，并监听：

```text
127.0.0.1:6379
```

### Docker 启动 Redis

也可以使用 Docker 启动一个 Redis 容器：

```bash
docker run -d --name redis-session-demo -p 6379:6379 redis:7-alpine
```

验证 Redis 是否可用：

```bash
redis-cli ping
```

如果返回：

```text
PONG
```

说明 Redis 已正常运行。

## 启动项目

开发模式启动：

```bash
npm run dev
```

启动成功后会看到：

```text
Server is running at http://localhost:3000
```

## 使用方法

### 1. 写入 Session 参数

浏览器访问：

```text
http://localhost:3000/?name=Tom&age=25
```

或者使用 curl：

```bash
curl "http://localhost:3000/?name=Tom&age=25"
```

返回：

```json
{
  "name": "Tom",
  "age": "25"
}
```

### 2. 继续追加参数

在同一个浏览器会话中访问：

```text
http://localhost:3000/?city=Beijing
```

返回：

```json
{
  "name": "Tom",
  "age": "25",
  "city": "Beijing"
}
```

这是因为项目会把新的 query 参数和原来的 `req.session.params` 合并。

### 3. 查看 Redis 中的 Session

进入 Redis CLI：

```bash
redis-cli
```

查看 Session key：

```redis
KEYS myapp_session:*
```

查看某个 Session 的内容：

```redis
GET myapp_session:你的session_id
```

注意：Redis 中保存的是 express-session 序列化后的 JSON 数据。

## 核心代码说明

### Redis 客户端

```js
const redisClient = createClient({
  url: 'redis://127.0.0.1:6379'
});
```

用于连接本地 Redis。

### RedisStore

```js
const redisStore = new RedisStore({
  client: redisClient,
  prefix: 'myapp_session:'
});
```

用于指定 Session 存储位置和 Redis key 前缀。

### Session 中间件

```js
app.use(session({
  store: redisStore,
  secret: 'my_super_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    maxAge: 1000 * 60 * 60
  }
}));
```

配置说明：

- `store`：指定 Session 存储到 Redis。
- `secret`：用于签名 session ID，生产环境应使用环境变量保存。
- `resave: false`：Session 未修改时不强制保存。
- `saveUninitialized: false`：未写入数据的 Session 不保存。
- `cookie.secure: false`：本地 HTTP 开发环境使用 false；生产 HTTPS 环境可设为 true。
- `cookie.maxAge`：Cookie 有效期，本项目设置为 1 小时。

### 参数缓存逻辑

```js
const queryArgs = req.query;

if (Object.keys(queryArgs).length > 0) {
  req.session.params = {
    ...req.session.params,
    ...queryArgs
  };
}

res.json(req.session.params);
```

这段逻辑会把 URL query 参数缓存到当前用户 Session 中。

## 常见问题

### 1. Redis 连接失败

如果控制台出现 Redis 连接错误，请检查：

```text
Redis 是否已经启动
Redis 是否监听 6379 端口
index.js 中的 Redis URL 是否正确
```

### 2. 每次访问 Session 都是新的

请检查浏览器是否禁用了 Cookie。express-session 需要通过 Cookie 保存 session ID。

如果使用 curl 测试，需要保存 Cookie，例如：

```bash
curl -c cookie.txt -b cookie.txt "http://localhost:3000/?name=Tom"
curl -c cookie.txt -b cookie.txt "http://localhost:3000/?age=25"
```

### 3. 生产环境注意事项

生产环境中建议：

- 使用环境变量保存 `secret`
- 不要把 Redis 地址和 secret 硬编码在代码里
- HTTPS 环境下设置 `cookie.secure = true`
- 根据业务需要配置 Redis 密码和访问控制
- 不要在生产环境使用 `KEYS *` 查询大量 key，可改用 `SCAN`

## package.json 脚本

```json
{
  "scripts": {
    "dev": "nodemon index.js"
  }
}
```

启动命令：

```bash
npm run dev
```

## License

ISC