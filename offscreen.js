/* 离屏文档：只干一件事 —— 把传进来的文本写进剪贴板。
 * 因为它是真实的 DOM 环境，扩展又拥有 clipboardWrite 权限，
 * 所以 document.execCommand('copy') 不需要用户手势也能成功。
 */

async function copyText(text) {
  // 首选标准剪贴板 API
  try {
    await navigator.clipboard.writeText(text);
    return { ok: true };
  } catch (e) {
    /* 离屏文档通常没有焦点，会抛 NotAllowedError，继续走下面的兜底 */
  }

  // 兜底：临时 textarea + execCommand
  const active = document.activeElement;
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.cssText =
    'position:fixed;top:0;left:0;width:1px;height:1px;padding:0;border:0;outline:0;box-shadow:none;background:transparent;opacity:0;';
  document.body.appendChild(area);
  area.focus();
  area.select();
  area.setSelectionRange(0, text.length);

  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch (e) {
    ok = false;
  }

  area.remove();
  if (active && typeof active.focus === 'function') active.focus();

  return ok ? { ok: true } : { ok: false, error: 'execCommand copy returned false' };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || message.target !== 'offscreen' || message.type !== 'copy') return;

  copyText(String(message.text))
    .then(sendResponse)
    .catch((err) => sendResponse({ ok: false, error: String((err && err.message) || err) }));

  return true; // 保持消息通道，等异步结果
});
