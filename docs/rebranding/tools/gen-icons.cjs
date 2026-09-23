// JGAgent 应用图标再生成脚本（公司换 logo / 补尺寸时使用，不属于构建链）
//
// 用法（在任意临时目录准备 sharp，不动本仓库依赖）：
//   mkdir somewhere && cd somewhere && npm init -y && npm install sharp
//   node gen-icons.cjs <源图.png> <JGAgent仓库根目录> [圆角比例]
//
// 源图要求：正方形、≥1024x1024、满版背景（无透明角最佳）。
// 圆角比例：可选，默认 0.225（约 22.5%，接近 macOS/iOS 系统图标规格）；传 0 则输出直角方图。
// 产出：public/logo/icons、public/icon_512@2x.png、packages/desktop/build 全套图标与 DMG 背景、
//       packages/web/public/favicon.ico（均为透明圆角 PNG/ICO/ICNS）。
// 注意：favicon 的内嵌 base64（packages/web/index.html）需要另行手动替换。
const path = require("path");
const fs = require("fs");

const [, , sourceArg, rootArg, radiusArg] = process.argv;
if (!sourceArg || !rootArg) {
  console.error("用法: node gen-icons.cjs <源图.png> <JGAgent仓库根目录> [圆角比例，默认0.225]");
  process.exit(1);
}
const SRC = path.resolve(sourceArg);
const ROOT = path.resolve(rootArg);
const RADIUS_RATIO = Number(radiusArg ?? "0.225");
if (!Number.isFinite(RADIUS_RATIO) || RADIUS_RATIO < 0 || RADIUS_RATIO >= 0.5) {
  console.error("圆角比例必须是 [0, 0.5) 内的数字");
  process.exit(1);
}
if (!fs.existsSync(SRC)) {
  console.error(`源图不存在: ${SRC}`);
  process.exit(1);
}
// sharp 由脚本运行目录的 node_modules 解析（见头部安装说明）
const sharp = require("sharp");

const SIZES = [16, 24, 32, 48, 64, 128, 256, 512, 1024];
const pngCache = new Map();

async function png(size) {
  if (pngCache.has(size)) return pngCache.get(size);
  // 阶梯式减半再精缩，避免一次性大比例缩小的采样失真
  let buf = await sharp(SRC).png().toBuffer();
  const meta = await sharp(buf).metadata();
  let w = meta.width;
  while (Math.floor(w / 2) >= size * 2) {
    w = Math.floor(w / 2);
    buf = await sharp(buf).resize(w, w, { kernel: "cubic" }).png().toBuffer();
  }
  buf = await sharp(buf).resize(size, size, { kernel: "lanczos3" }).png().toBuffer();
  // 透明圆角：SVG 圆角矩形做 dest-in 遮罩，角部变透明、圆内保留
  if (RADIUS_RATIO > 0) {
    const radius = Math.max(1, Math.round(size * RADIUS_RATIO));
    const mask = Buffer.from(
      `<svg width="${size}" height="${size}"><rect x="0" y="0" width="${size}" height="${size}" rx="${radius}" ry="${radius}"/></svg>`,
    );
    buf = await sharp(buf).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
  }
  pngCache.set(size, buf);
  return buf;
}

// PNG-in-ICO 容器（Vista+ 原生支持，上游 ZCode 图标同为该结构）
function buildIco(entries) {
  const count = entries.length;
  let offset = 6 + 16 * count;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);
  const dir = Buffer.alloc(16 * count);
  entries.forEach((e, i) => {
    const base = i * 16;
    const b = e.size >= 256 ? 0 : e.size;
    dir.writeUInt8(b, base);
    dir.writeUInt8(b, base + 1);
    dir.writeUInt16LE(1, base + 4);
    dir.writeUInt16LE(32, base + 6);
    dir.writeUInt32LE(e.buf.length, base + 8);
    dir.writeUInt32LE(offset, base + 12);
    offset += e.buf.length;
  });
  return Buffer.concat([header, dir, ...entries.map((e) => e.buf)]);
}

// ICNS 容器：每块为「类型码 + 长度(BE) + PNG 数据」
function buildIcns(entries) {
  const chunks = entries.map((e) => {
    const head = Buffer.alloc(8);
    head.write(e.type, 0, "ascii");
    head.writeUInt32BE(8 + e.buf.length, 4);
    return Buffer.concat([head, e.buf]);
  });
  const total = 8 + chunks.reduce((s, c) => s + c.length, 0);
  const head = Buffer.alloc(8);
  head.write("icns", 0, "ascii");
  head.writeUInt32BE(total, 4);
  return Buffer.concat([head, ...chunks]);
}

// DMG 安装背景：浅灰底 + JGAgent 标 + 拖拽箭头（临时设计，设计师出图后可直接覆盖产物文件）
async function dmgBackground(scale) {
  const W = 540 * scale;
  const H = 380 * scale;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 540 380">
  <rect width="540" height="380" fill="#F5F5F5"/>
  <text x="270" y="105" font-family="Segoe UI, Arial, sans-serif" font-size="46" font-weight="700" fill="#4A4A4A" text-anchor="middle">JGAgent</text>
  <path d="M 150 165 C 205 265, 320 285, 395 238" fill="none" stroke="#B8B8B8" stroke-width="7" stroke-linecap="round"/>
  <polyline points="395,238 368,225 381,252" fill="none" stroke="#B8B8B8" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function main() {
  const pngDirs = [
    path.join(ROOT, "public/logo/icons"),
    path.join(ROOT, "packages/desktop/build/icons"),
  ];
  for (const size of SIZES) {
    const buf = await png(size);
    for (const dir of pngDirs) {
      fs.writeFileSync(path.join(dir, `${size}x${size}.png`), buf);
    }
  }

  const png1024 = await png(1024);
  fs.writeFileSync(path.join(ROOT, "public/icon_512@2x.png"), png1024);
  for (const f of ["icon.png", "icon_installer.png", "icon_windows.png"]) {
    fs.writeFileSync(path.join(ROOT, "packages/desktop/build", f), png1024);
  }

  const icoEntries = [];
  for (const s of [16, 24, 32, 48, 64, 128, 256]) icoEntries.push({ size: s, buf: await png(s) });
  const icoMain = buildIco(icoEntries);
  fs.writeFileSync(path.join(ROOT, "packages/desktop/build/icon.ico"), icoMain);
  fs.writeFileSync(path.join(ROOT, "public/logo/icons/icon.ico"), icoMain);
  fs.writeFileSync(
    path.join(ROOT, "packages/desktop/build/icon_installer.ico"),
    buildIco([{ size: 256, buf: await png(256) }]),
  );
  const faviconEntries = [];
  for (const s of [16, 32, 48, 64, 128, 256]) faviconEntries.push({ size: s, buf: await png(s) });
  fs.writeFileSync(path.join(ROOT, "packages/web/public/favicon.ico"), buildIco(faviconEntries));

  const icnsMap = [
    ["ic11", 32], ["ic12", 64], ["ic07", 128],
    ["ic13", 256], ["ic08", 256], ["ic14", 512], ["ic09", 512], ["ic10", 1024],
  ];
  const icnsEntries = [];
  for (const [t, s] of icnsMap) icnsEntries.push({ type: t, buf: await png(s) });
  const icns = buildIcns(icnsEntries);
  fs.writeFileSync(path.join(ROOT, "packages/desktop/build/icon.icns"), icns);
  fs.writeFileSync(path.join(ROOT, "packages/desktop/build/icon_installer.icns"), icns);
  fs.writeFileSync(path.join(ROOT, "public/logo/icons/icon.icns"), icns);

  fs.writeFileSync(path.join(ROOT, "packages/desktop/build/dmg_background.png"), await dmgBackground(1));
  fs.writeFileSync(path.join(ROOT, "packages/desktop/build/dmg_background@2x.png"), await dmgBackground(2));

  console.log("done: icons + favicon + dmg backgrounds");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
