// 把 icons/icon.svg 渲染成扩展需要的各个尺寸 PNG，并生成一张预览图。
// 用法：NODE_PATH=<managed node workspace>/node_modules node build/render-icons.mjs
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';

// 依赖装在受管的 node 工作区里，用 createRequire 从那里解析
const requireFromWorkspace = createRequire(
  'C:/Users/81505/.workbuddy/binaries/node/workspace/package.json'
);
const { Resvg } = requireFromWorkspace('@resvg/resvg-js');
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const svg = readFileSync(join(root, 'icons', 'icon.svg'), 'utf8');

const sizes = [16, 24, 32, 48, 128];
const pngs = {};

for (const size of sizes) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: size },
    background: 'rgba(0,0,0,0)'
  });
  const buf = resvg.render().asPng();
  const out = join(root, 'icons', `icon-${size}.png`);
  writeFileSync(out, buf);
  pngs[size] = buf.toString('base64');
  console.log(`icons/icon-${size}.png  ${buf.length} bytes`);
}

// ---- 预览图：模拟 Edge 浅色工具栏 ----
const img = (size, x, y, w) =>
  `<image x="${x}" y="${y}" width="${w}" height="${w}" href="data:image/png;base64,${pngs[size]}"/>`;

const sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420">
  <rect width="640" height="420" fill="#f2f2f2"/>
  <!-- 仿工具栏 -->
  <rect x="0" y="0" width="640" height="46" fill="#f7f7f7"/>
  <line x1="0" y1="46" x2="640" y2="46" stroke="#e2e2e2" stroke-width="1"/>
  <text x="24" y="29" font-family="Microsoft YaHei" font-size="13" fill="#636363">Edge 工具栏里的实际大小</text>
  ${img(16, 250, 15, 16)}
  ${img(24, 290, 11, 24)}
  ${img(32, 330, 7, 32)}
  <!-- 16px 放大 8 倍，检查最小尺寸下是否还能认出图形 -->
  <image x="380" y="3" width="128" height="128" href="data:image/png;base64,${pngs[16]}"/>
  <text x="380" y="146" font-family="Microsoft YaHei" font-size="11" fill="#9d9d9d">16px ×8</text>
  <line x1="24" y1="70" x2="616" y2="70" stroke="#e2e2e2" stroke-width="1"/>
  ${img(128, 40, 96, 128)}
  ${img(48, 210, 96, 48)}
  ${img(32, 210, 166, 32)}
  ${img(24, 210, 216, 24)}
  ${img(16, 210, 266, 16)}
  <text x="210" y="300" font-family="Microsoft YaHei" font-size="12" fill="#7f7f7f">48 / 32 / 24 / 16</text>
  <text x="40" y="252" font-family="Microsoft YaHei" font-size="12" fill="#7f7f7f">128</text>
  <!-- 深色工具栏上是否还看得清 -->
  <rect x="330" y="96" width="280" height="200" rx="10" fill="#2b2b2b"/>
  ${img(16, 360, 130, 16)}
  ${img(24, 400, 126, 24)}
  ${img(32, 440, 122, 32)}
  ${img(48, 490, 114, 48)}
  ${img(128, 420, 180, 100)}
</svg>`;

const preview = new Resvg(sheet, { fitTo: { mode: 'width', value: 640 } });
writeFileSync(join(root, 'build', 'preview.png'), preview.render().asPng());
console.log('build/preview.png');
