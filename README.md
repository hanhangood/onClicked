# 复制当前网址（Edge 扩展）

点一下工具栏上的图标，当前标签页的网址就进了系统剪贴板。
没有弹窗、没有菜单、没有二次确认、没有快捷键、没有设置页 —— 点完就完事。

## 安装（30 秒）

1. 在 Edge 地址栏输入 `edge://extensions` 回车。
2. 左侧/左下角打开 **开发人员模式**（Developer mode）开关。
3. 点 **加载解压缩的扩展**（Load unpacked）。
4. 选择这个文件夹：`D:\install\work buddy\复制链接插件`
5. 安装完成后，点击工具栏上的拼图图标 🧩，找到 **复制当前网址**，点旁边的图钉把它固定到工具栏。

## 使用

在任意网页上点一下工具栏图标 → 网址已经在剪贴板里了，直接 `Ctrl+V` 粘贴即可。

- 复制成功：图标右下角会闪一个蓝色小对勾（约 1.2 秒后自动消失）。
- 页面不可读（如 `edge://settings`、Edge 加载项商店等浏览器内部页面）：闪一个红色 `!`，此时没有可复制的网址。

> 不想要那个小对勾、要绝对静默？打开 `background.js`，把第 12 行的
> `const SHOW_FEEDBACK = true;` 改成 `false`，然后在 `edge://extensions` 里点一下本扩展的刷新按钮。

## 它是怎么做到的

MV3 的 Service Worker 里没有 DOM，不能直接调剪贴板，所以走了一条两段式的路：

```
点击图标
  └─ background.js（Service Worker）
       ├─ 读取 tab.url（"tabs" 权限）
       └─ 交给 offscreen.html 里的离屏文档
            └─ 用 clipboardWrite 权限写入系统剪贴板（execCommand 兜底）
```

因为扩展拥有 `clipboardWrite` 权限，写入剪贴板不需要用户手势，也不需要页面里有焦点，
所以整个过程对用户是静默的。

## 文件说明

| 文件 | 作用 |
|---|---|
| `manifest.json` | 扩展清单；没有声明 `default_popup`，所以点图标不会弹窗 |
| `background.js` | 唯一的逻辑：点图标 → 取网址 → 写剪贴板 |
| `offscreen.html` / `offscreen.js` | 离屏文档，唯一职责是执行剪贴板写入 |
| `icons/icon.svg` | 图标矢量源文件（Smartisan 风格：蓝色渐变底板 + 极细描边 + 白色锁链） |
| `icons/icon-*.png` | 16 / 24 / 32 / 48 / 128 五个尺寸，已由 SVG 渲染好 |
| `build/render-icons.mjs` | 图标渲染脚本，改完 SVG 后可重新生成全部 PNG |
| `build/preview.png` | 各尺寸在浅色 / 深色工具栏上的效果预览 |

### 修改图标

改 `icons/icon.svg` 之后，在 `build` 目录里执行：

```bash
node render-icons.mjs
```

会把 `icons/icon-16/24/32/48/128.png` 和 `build/preview.png` 一起重新生成。

## 权限说明

| 权限 | 为什么需要 |
|---|---|
| `tabs` | 读取当前标签页的网址（没有它，`edge://` 等页面拿不到 url） |
| `clipboardWrite` | 写入系统剪贴板 |
| `offscreen` | 创建一个不显示的页面来执行剪贴板写入 |

不联网、不注入脚本、不读取页面内容、不收集任何数据，全部代码就在上面几个文件里。

## 设计约束（刻意保持的）

- 只有 `chrome.action.onClicked` 一个入口，没有 popup 页面，所以点图标**不可能**弹出任何界面。
- 没有 `commands`，所以不占用任何键盘快捷键。
- 没有 `options_page`、没有右键菜单、没有通知。
