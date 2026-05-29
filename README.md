# wechat-clawbot

微信个人号平台适配器，基于 [alemonjs](https://github.com/lemonade-lab/alemonjs) 框架开发。

## 安装

```bash
yarn add @alemonjs/wechat-clawbot
```

## 配置

在项目根目录的 `alemon.config.yaml` 中添加：

```yaml
# 指定平台适配器
login: wechat-clawbot

# wechat-clawbot 配置
wechat-clawbot:
  # iLink API 基础 URL
  base_url: 'https://ilinkai.weixin.qq.com'
  # CDN 基础 URL
  cdn_base_url: 'https://novac2c.cdn.weixin.qq.com/c2c'
  # 存储目录（用于保存登录凭证）
  # storage_dir: '~/.alemonjs-wechat'
  # 日志级别: debug, info, warn, error
  log_level: 'info'
  # 二维码轮询间隔（毫秒）
  qr_poll_interval: 2000
  # API 超时时间（毫秒）
  api_timeout: 15000
  # 长轮询超时时间（毫秒）
  long_poll_timeout: 35000
  # 自动重新登录
  auto_relogin: true

# 主人用户 ID
master:
  - 'wx_your_user_id'
```

## 启动

```bash
yarn app
```

首次启动会显示微信登录二维码，使用微信扫码即可完成登录。

## 在 response 中使用

```ts
import { useValue } from '@alemonjs/wechat-clawbot'

export default (event) => {
  const [value] = useValue(event)
  // 处理消息...
}
```

## 许可证

MIT
