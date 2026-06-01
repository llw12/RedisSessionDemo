const express = require('express');
const session = require('express-session');
// 引入 connect-redis 并获取 RedisStore
const { RedisStore } = require('connect-redis');
// 引入 redis 客户端创建函数
const { createClient } = require('redis');

const app = express();

// 1. 初始化 Redis 客户端
const redisClient = createClient({
    url: 'redis://127.0.0.1:6379' // 默认连接本地 Redis
});

// 监听 Redis 连接错误
redisClient.on('error', (err) => console.log('Redis Client Error', err));

// 连接到 Redis
redisClient.connect().catch(console.error);

// 2. 初始化 RedisStore
const redisStore = new RedisStore({
    client: redisClient,
    prefix: 'myapp_session:', // 存入 Redis 的键名前缀，方便区分
});

// 3. 配置 Session 中间件
app.use(session({
    store: redisStore,             // 指定将 Session 存入刚刚配置的 RedisStore
    secret: 'my_super_secret_key', // 用于签名 session ID 的秘钥（生产环境应使用环境变量）
    resave: false,                 // 如果 session 没有被修改，是否重新保存
    saveUninitialized: false,      // 是否保存未初始化的 session
    cookie: { 
        secure: false,             // 本地开发用 HTTP，设为 false；线上如果是 HTTPS 请设为 true
        maxAge: 1000 * 60 * 60     // 设置 cookie 过期时间为 1 小时
    }
}));

// 4. 定义路由逻辑
app.get('/', (req, res) => {
    // // 确保 req.session.params 是一个对象
    // if (!req.session.params) {
    //     req.session.params = {};
    // }

    // 获取 URL 中的 querystring 参数（例如 /?name=Tom&age=25）
    const queryArgs = req.query;

    console.log('Received query parameters:', queryArgs);

    // 如果请求带有参数，将其合并（缓存）到 Session 中
    if (Object.keys(queryArgs).length > 0) {
        req.session.params = { 
            ...req.session.params, 
            ...queryArgs 
        };
    }

    // 以 JSON 形式将当前 Session 中缓存的所有参数打印到前台
    res.json(req.session.params);
});

// 5. 启动服务器
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});