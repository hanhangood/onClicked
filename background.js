/* 复制当前网址 —— 后台 Service Worker
 *
 * 唯一职责：工具栏图标被点击时，把当前活动标签页的 URL 写进系统剪贴板。
 * 说明：MV3 的 Service Worker 里没有 DOM，无法直接调用剪贴板接口，
 * 因此借一个「离屏文档」（offscreen document）当代理来完成写入。
 */

const OFFSCREEN_URL = 'offscreen.html';

/* 复制成功后图标右下角会短暂出现一个对勾徽标。
   如果你想要绝对静默（连这个都不用），把下面这行改成 false。 */
const SHOW_FEEDBACK = true;

const BADGE_BLUE = '#5b87eb';
const BADGE_RED = '#e5645a';

/* ---------- 离屏文档管理 ---------- */

let creating = null;

async function offscreenExists() {
  if (!chrome.runtime.getContexts) return false;
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [chrome.runtime.getURL(OFFSCREEN_URL)]
  });
  return contexts.length > 0;
}

async function ensureOffscreen() {
  if (await offscreenExists()) return;
  if (creating) {
    await creating;
    return;
  }
  creating = chrome.offscreen
    .createDocument({
      url: OFFSCREEN_URL,
      reasons: ['CLIPBOARD'],
      justification: '把当前标签页的网址写入系统剪贴板'
    })
    .catch((err) => {
      // 并发点击时可能重复创建，这属于正常情况，忽略即可
      if (!String(err && err.message).includes('Only a single offscreen')) throw err;
    })
    .finally(() => {
      creating = null;
    });
  await creating;
}

/* ---------- 真正写剪贴板 ---------- */

async function writeClipboard(text) {
  await ensureOffscreen();

  // 离屏文档刚创建的那一刻脚本可能还没就绪，失败就稍等重试，
  // 避免第一次点击失效。
  let lastError = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const reply = await chrome.runtime.sendMessage({
        target: 'offscreen',
        type: 'copy',
        text
      });
      if (reply && reply.ok === true) return;
      lastError = new Error((reply && reply.error) || '剪贴板写入失败');
    } catch (err) {
      lastError = err;
    }
    await new Promise((resolve) => setTimeout(resolve, 60 * (attempt + 1)));
  }
  throw lastError || new Error('剪贴板写入失败');
}

/* ---------- 徽标反馈 ---------- */

async function flashBadge(text, color) {
  if (!SHOW_FEEDBACK) return;
  try {
    await chrome.action.setBadgeBackgroundColor({ color });
    await chrome.action.setBadgeText({ text });
  } catch (e) {
    /* 忽略 */
  }
}

async function clearBadge() {
  try {
    await chrome.action.setBadgeText({ text: '' });
  } catch (e) {
    /* 忽略 */
  }
}

/* ---------- 点击图标 ---------- */

chrome.action.onClicked.addListener(async (tab) => {
  await clearBadge();

  // tab.url 只有在拿到该标签页的访问权限时才有值（受限页面为空）
  const url = tab && tab.url ? tab.url : '';
  if (!url) {
    await flashBadge('!', BADGE_RED);
    setTimeout(clearBadge, 1500);
    return;
  }

  try {
    await writeClipboard(url);
    await flashBadge('\u2713', BADGE_BLUE);
    setTimeout(clearBadge, 1200);
  } catch (e) {
    console.error('[复制当前网址]', e);
    await flashBadge('!', BADGE_RED);
    setTimeout(clearBadge, 1500);
  }
});

/* 浏览器启动 / 扩展更新时清掉可能残留的徽标 */
chrome.runtime.onStartup.addListener(clearBadge);
chrome.runtime.onInstalled.addListener(clearBadge);
