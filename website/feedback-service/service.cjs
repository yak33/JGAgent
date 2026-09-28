/**
 * JGAgent 反馈收集服务（零依赖，node:http 实现）。
 *
 * 客户端协议契约（packages/services/src/feedback/feedbackHttpClient.ts）：
 * - POST   /feedback/ticket                      创建工单，请求体 {title, device_mid, content{description,category,function,severity}, contact, environment}
 * - GET    /feedback/ticket?limit&offset          工单列表（最新在前）
 * - GET    /feedback/ticket/:id                   工单详情
 * - POST   /feedback/ticket/:id/message           追加回复
 * - POST   /feedback/attachment/upload-credential 附件上传凭证（返回指向本服务 /upload 的 OSS 形状凭证）
 * - POST   /feedback-upload                       附件二进制（multipart，取 file 部分）
 *
 * 管理端（经 nginx /feedback-admin 与 /feedback-api 反代进来，均需密钥）：
 * - GET    /admin                                  管理台页面
 * - GET    /admin/tickets?status&q&limit&offset   分页列表 + 状态计数
 * - GET    /admin/ticket/:id                       工单详情（含环境、附件、消息）
 * - POST   /admin/ticket/:id/status                改状态
 * - POST   /admin/ticket/:id/message               团队回复（sender_type=staff）
 * - POST   /admin/ticket/:id/delete                删除工单（清理垃圾数据）
 *
 * 所有成功响应使用 {code:0, data} 信封，与客户端 unwrapFeedbackResponse 匹配。
 * 存储：/data/db.json（工单与回复）+ /data/files/（附件），均在挂载卷上持久化。
 */

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const PORT = Number(process.env.PORT || 3300);
const DATA_DIR = process.env.DATA_DIR || "/app/data";
const DB_FILE = path.join(DATA_DIR, "db.json");
const FILES_DIR = path.join(DATA_DIR, "files");
const ADMIN_KEY = process.env.ADMIN_KEY || "";
const ADMIN_COOKIE = "jgadmin";
const MAX_BODY_BYTES = 2 * 1024 * 1024; // JSON 请求体上限
const MAX_UPLOAD_BYTES = 256 * 1024 * 1024; // 附件上限（内部工具足够）
const ADMIN_PAGE_SIZE = 20; // 管理台每页条数
const MAX_TICKETS = 5000; // 工单库上限，超出后丢弃最旧的
const MAX_MESSAGE_CHARS = 20000;
const MAX_TITLE_CHARS = 200;
const MAX_DESCRIPTION_CHARS = 20000;

// 工单状态是中文枚举，与客户端 mapFeedbackStatus 兼容。
const ADMIN_STATUSES = ["已提交", "已解决", "已拒绝"];

// 客户端 content.category 的取值（见 feedbackHttpClient.parseFeedbackTicketType）。
const CATEGORY_LABELS = {
  bug: "Bug",
  usage: "不会使用",
  feature: "建议",
  performance: "性能",
};

// 客户端 content.severity 的取值（见 feedbackHttpClient.parseFeedbackTicketSeverity）。
const SEVERITY_LABELS = {
  "P1-高": { label: "P1 完全不可用", tone: "high" },
  "P2-中": { label: "P2 影响使用", tone: "mid" },
  "P3-低": { label: "P3 小问题", tone: "low" },
};

function ensureStorage() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(FILES_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ tickets: [] }, null, 2));
  }
}

function readDb() {
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
  } catch {
    return { tickets: [] };
  }
}

/**
 * 写路径专用读取。readDb 解析失败时会退回空库，若写路径也用它，一次解析失败
 * 就会把整库覆盖成空数组且无法恢复。写之前一律走这里，让异常冒到请求处理层
 * 返回 500，宁可本次操作失败也不能丢数据。
 */
function readDbStrict() {
  const raw = fs.readFileSync(DB_FILE, "utf8");
  const db = JSON.parse(raw);
  if (!db || !Array.isArray(db.tickets)) {
    throw new Error("db.json 结构异常：缺少 tickets 数组");
  }
  return db;
}

function writeDb(db) {
  const tmp = DB_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_FILE);
}

function findTicket(db, id) {
  return db.tickets.find((ticket) => ticket.ticket_id === id) || null;
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

function sendEnvelope(res, data) {
  sendJson(res, 200, { code: 0, data });
}

function readBody(req, maxBytes) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new Error("request body too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function readJsonBody(req) {
  return readBody(req, MAX_BODY_BYTES).then((buffer) => {
    try {
      return JSON.parse(buffer.toString("utf8") || "{}");
    } catch {
      throw new Error("invalid JSON body");
    }
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function checkAdminKey(url) {
  return ADMIN_KEY.length > 0 && url.searchParams.get("key") === ADMIN_KEY;
}

// 管理 cookie（登录后 30 天有效）：jgadmin=<ADMIN_KEY>
function getAdminCookie(req) {
  const cookies = req.headers.cookie || "";
  for (const pair of cookies.split(";")) {
    const trimmed = pair.trim();
    if (trimmed.startsWith(ADMIN_COOKIE + "=")) {
      return trimmed.slice(ADMIN_COOKIE.length + 1);
    }
  }
  return "";
}

function isAdminAuthorized(req, url) {
  return checkAdminKey(url) || getAdminCookie(req) === ADMIN_KEY;
}

function adminCookieHeader() {
  return ADMIN_COOKIE + "=" + ADMIN_KEY + "; Path=/; HttpOnly; Max-Age=2592000; SameSite=Lax";
}

// 从 multipart 体中提取带 filename 的文件部分（客户端表单里还混有 policy 等
// OSS 字段，必须按 Content-Disposition 的 filename 定位，而不是取第一个部分）。
// latin1 读写保证二进制字节一一对应。
function extractMultipartFile(body, contentType) {
  const boundaryMatch = /boundary=([^;]+)/i.exec(contentType || "");
  if (!boundaryMatch) return null;
  const boundary = "--" + boundaryMatch[1].trim().replace(/^"|"$/g, "");
  const text = body.toString("latin1");
  const boundaryIndex = [];
  let from = 0;
  while (true) {
    const at = text.indexOf(boundary, from);
    if (at < 0) break;
    boundaryIndex.push(at);
    from = at + boundary.length;
  }
  for (let i = 0; i < boundaryIndex.length; i += 1) {
    const partStart = boundaryIndex[i] + boundary.length;
    const partEnd = i + 1 < boundaryIndex.length ? boundaryIndex[i + 1] : text.length;
    const part = text.slice(partStart, partEnd);
    const headerEnd = part.indexOf("\r\n\r\n");
    if (headerEnd < 0) continue;
    const headers = part.slice(0, headerEnd);
    const filenameMatch = /filename="([^"]*)"/i.exec(headers);
    if (!filenameMatch) continue;
    // 数据结束位置：有下一个 boundary 时取到下一 boundary 前的 CRLF；
    // 最后一个部分（文件常在此）没有后续 boundary，取到 part 结尾并剥掉
    // 紧邻结束分隔符的 CRLF（2 字节）。
    const nextBoundary = part.indexOf("\r\n" + boundary, headerEnd + 4);
    const dataEnd = nextBoundary < 0 ? part.length - 2 : nextBoundary;
    if (dataEnd <= headerEnd + 4) continue;
    const data = Buffer.from(part.slice(headerEnd + 4, dataEnd), "latin1");
    if (data.length === 0) continue;
    return {
      filename: filenameMatch[1] || "attachment.bin",
      data,
    };
  }
  return null;
}

function createTicket(body, deviceMid) {
  const db = readDbStrict();
  const now = new Date().toISOString();
  const id = "fb-" + Date.now().toString(36) + "-" + crypto.randomBytes(3).toString("hex");
  const ticket = {
    ticket_id: id,
    title: String(body.title || "(无标题)").slice(0, MAX_TITLE_CHARS),
    // 状态统一中文枚举（与管理页筛选、客户端 mapFeedbackStatus 兼容）
    status: "已提交",
    created_at: now,
    updated_at: now,
    device_mid: deviceMid || null,
    content: {
      description: String(body.content?.description ?? "").slice(0, MAX_DESCRIPTION_CHARS),
      category: body.content?.category ?? null,
      function: body.content?.function ?? null,
      severity: body.content?.severity ?? null,
    },
    contact: body.contact ? String(body.contact).slice(0, 200) : null,
    environment: body.environment && typeof body.environment === "object" ? body.environment : {},
    attachments: [],
    messages: [],
  };
  db.tickets.unshift(ticket);
  db.tickets = db.tickets.slice(0, MAX_TICKETS);
  writeDb(db);
  return ticket;
}

// ---- 管理台数据整形 ----

function toSummary(ticket) {
  const messages = Array.isArray(ticket.messages) ? ticket.messages : [];
  const attachments = Array.isArray(ticket.attachments) ? ticket.attachments : [];
  const description = String(ticket.content?.description ?? "");
  return {
    ticket_id: ticket.ticket_id,
    title: ticket.title,
    status: ticket.status,
    created_at: ticket.created_at,
    updated_at: ticket.updated_at,
    category: ticket.content?.category ?? null,
    severity: ticket.content?.severity ?? null,
    contact: ticket.contact ?? null,
    // 列表只带描述首行，完整正文由详情接口给，避免一次性把全库塞进 HTML。
    preview: description.split("\n")[0].slice(0, 120),
    message_count: messages.length,
    has_staff_reply: messages.some((message) => message.sender_type === "staff"),
    attachment_count: attachments.length,
  };
}

function toDetail(ticket) {
  return {
    ...toSummary(ticket),
    description: String(ticket.content?.description ?? ""),
    function_name: ticket.content?.function ?? null,
    device_mid: ticket.device_mid ?? null,
    environment:
      ticket.environment && typeof ticket.environment === "object" ? ticket.environment : {},
    attachments: Array.isArray(ticket.attachments) ? ticket.attachments : [],
    messages: Array.isArray(ticket.messages) ? ticket.messages : [],
  };
}

// 状态计数与搜索都基于全量内存计算：库上限 5000 条，逐条扫描的成本远低于
// 为此再引入索引文件。
function summarizeForList(db, { status, query }) {
  const needle = query.trim().toLowerCase();
  const counts = { "": 0 };
  for (const value of ADMIN_STATUSES) counts[value] = 0;
  const matched = [];
  for (const ticket of db.tickets) {
    const ticketStatus = ADMIN_STATUSES.includes(ticket.status) ? ticket.status : "已提交";
    if (status && ticketStatus !== status) continue;
    if (needle) {
      const haystack = [
        ticket.ticket_id,
        ticket.title,
        ticket.contact,
        ticket.content?.category,
        ticket.content?.severity,
        ticket.content?.description,
      ]
        .map((value) => String(value ?? ""))
        .join("\n")
        .toLowerCase();
      if (!haystack.includes(needle)) continue;
    }
    counts[ticketStatus] = (counts[ticketStatus] || 0) + 1;
    matched.push(ticket);
  }
  counts[""] = matched.length;
  return { matched, counts };
}

// 管理台样式：沿用官网「暖调双主题 + 琥珀单一强调色」令牌，使内部页面
// 与对外站点同一套视觉语言。
const ADMIN_CSS = `
:root{color-scheme:light;--bg:#faf7f2;--surface:#fff;--surface-soft:#fbf8f2;--text:#1c1917;
--dim:#6e665c;--faint:#a39c8c;--line:rgba(70,58,40,.12);--amber:#e39e38;--amber-text:#a66e1a;
--on-amber:#1a1206;--add:#2e7d3b;--del:#bf4a42;--add-bg:rgba(46,125,59,.1);--del-bg:rgba(191,74,66,.09);
--amber-soft:rgba(184,120,41,.14);--shadow:0 1px 2px rgba(70,58,40,.05),0 10px 28px rgba(70,58,40,.08)}
[data-theme=dark]{color-scheme:dark;--bg:#0a0908;--surface:#121110;--surface-soft:#1c1a17;--text:#f4f1ec;
--dim:#a8a298;--faint:#6f6a62;--line:rgba(255,244,228,.09);--amber:#f0b35a;--amber-text:#f0b35a;
--on-amber:#1a1206;--add:#8fd694;--del:#f0908a;--add-bg:rgba(143,214,148,.08);--del-bg:rgba(240,144,138,.08);
--amber-soft:rgba(240,179,90,.14);--shadow:0 1px 2px rgba(0,0,0,.4),0 10px 28px rgba(0,0,0,.45)}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);
font-family:"Segoe UI Variable Text","SF Pro Text",-apple-system,"PingFang SC","Microsoft YaHei UI",system-ui,sans-serif;
font-size:14px;line-height:1.6;-webkit-font-smoothing:antialiased}
a{color:inherit}
button{font:inherit;color:inherit;cursor:pointer}
.wrap{max-width:1180px;margin:0 auto;padding:28px 20px 80px}
header{display:flex;align-items:center;gap:16px;flex-wrap:wrap;margin-bottom:22px}
h1{margin:0;font-size:20px;font-weight:650;letter-spacing:.01em}
.count{color:var(--faint);font-size:13px;font-variant-numeric:tabular-nums}
.spacer{flex:1}
.btn{border:1px solid var(--line);background:var(--surface);border-radius:8px;padding:7px 13px;font-size:13px;
transition:border-color .15s,background .15s}
.btn:hover{border-color:var(--amber);background:var(--amber-soft)}
.btn-primary{background:var(--amber);border-color:var(--amber);color:var(--on-amber);font-weight:600}
.btn-primary:hover{filter:brightness(1.06);background:var(--amber)}
.btn-danger{color:var(--del);border-color:transparent;background:var(--del-bg)}
.btn-danger:hover{border-color:var(--del)}
.search{border:1px solid var(--line);background:var(--surface);border-radius:8px;padding:7px 12px;font-size:13px;
min-width:230px;color:var(--text)}
.search::placeholder{color:var(--faint)}
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:18px}
.stat{border:1px solid var(--line);background:var(--surface);border-radius:10px;padding:12px 14px;text-align:left;
transition:border-color .15s,background .15s}
.stat:hover{border-color:var(--amber)}
.stat[aria-pressed=true]{border-color:var(--amber);background:var(--amber-soft)}
.stat-n{display:block;font-size:22px;font-weight:650;font-variant-numeric:tabular-nums;line-height:1.3}
.stat-l{display:block;font-size:12px;color:var(--dim)}
.stat.is-open .stat-n{color:var(--del)}
.stat.is-ok .stat-n{color:var(--add)}
.card{border:1px solid var(--line);background:var(--surface);border-radius:12px;overflow:hidden;box-shadow:var(--shadow)}
table{width:100%;border-collapse:collapse}
th,td{text-align:left;padding:11px 14px;font-size:13px;border-bottom:1px solid var(--line);vertical-align:middle}
th{background:var(--surface-soft);color:var(--dim);font-weight:600;font-size:12px;letter-spacing:.02em;white-space:nowrap}
tbody tr{cursor:pointer;transition:background .12s}
tbody tr:hover{background:var(--amber-soft)}
tbody tr:last-child td{border-bottom:0}
.cell-title{font-weight:550;max-width:420px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cell-sub{color:var(--faint);font-size:12px;font-family:ui-monospace,Consolas,monospace}
.cell-preview{color:var(--dim);max-width:340px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.nowrap{white-space:nowrap}
.badge{display:inline-block;padding:2px 9px;border-radius:999px;font-size:12px;font-weight:600;white-space:nowrap}
.b-open{background:var(--del-bg);color:var(--del)}
.b-ok{background:var(--add-bg);color:var(--add)}
.b-no{background:var(--surface-soft);color:var(--faint)}
.b-high{background:var(--del-bg);color:var(--del)}
.b-mid{background:var(--amber-soft);color:var(--amber-text)}
.b-low{background:var(--surface-soft);color:var(--faint)}
.dot-reply{display:inline-block;margin-left:6px;font-size:11px;color:var(--add)}
.pager{display:flex;align-items:center;gap:12px;justify-content:flex-end;padding:12px 14px;
border-top:1px solid var(--line);font-size:13px;color:var(--dim)}
.empty{padding:56px 20px;text-align:center;color:var(--faint)}
/* 详情抽屉：桌面端右侧面板，窄屏全屏覆盖 */
.scrim{position:fixed;inset:0;background:rgba(20,16,12,.42);opacity:0;pointer-events:none;transition:opacity .2s}
.scrim.on{opacity:1;pointer-events:auto}
.drawer{position:fixed;top:0;right:0;height:100%;width:min(520px,100%);background:var(--bg);
border-left:1px solid var(--line);box-shadow:var(--shadow);transform:translateX(100%);
transition:transform .22s cubic-bezier(.32,.72,0,1);display:flex;flex-direction:column;z-index:2}
.drawer.on{transform:none}
.d-head{display:flex;align-items:flex-start;gap:12px;padding:18px 20px 14px;border-bottom:1px solid var(--line)}
.d-title{margin:0;font-size:16px;font-weight:650;flex:1;overflow-wrap:anywhere}
.d-body{flex:1;overflow-y:auto;padding:18px 20px 24px}
.d-sec{margin-bottom:22px}
.d-lab{font-size:11px;letter-spacing:.08em;color:var(--faint);text-transform:uppercase;margin-bottom:7px}
.d-text{white-space:pre-wrap;overflow-wrap:anywhere;background:var(--surface);border:1px solid var(--line);
border-radius:9px;padding:11px 13px;font-size:13px}
.kv{display:grid;grid-template-columns:112px 1fr;gap:5px 12px;font-size:12.5px}
.kv dt{color:var(--faint);overflow-wrap:anywhere}
.kv dd{margin:0;overflow-wrap:anywhere;font-family:ui-monospace,Consolas,monospace;font-size:12px}
.msg{border:1px solid var(--line);border-radius:9px;padding:9px 12px;margin-bottom:8px;background:var(--surface)}
.msg.mine{background:var(--amber-soft);border-color:transparent}
.msg-head{display:flex;gap:8px;font-size:11.5px;color:var(--faint);margin-bottom:3px}
.msg-body{white-space:pre-wrap;overflow-wrap:anywhere;font-size:13px}
textarea{width:100%;min-height:78px;border:1px solid var(--line);background:var(--surface);border-radius:9px;
padding:10px 12px;font:inherit;font-size:13px;color:var(--text);resize:vertical}
textarea:focus{outline:none;border-color:var(--amber)}
.d-foot{border-top:1px solid var(--line);padding:12px 20px;display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.iconbtn{border:0;background:none;font-size:19px;line-height:1;color:var(--faint);padding:2px 6px;border-radius:6px}
.iconbtn:hover{color:var(--text);background:var(--surface-soft)}
#toast{position:fixed;left:50%;bottom:28px;transform:translate(-50%,14px);background:var(--text);color:var(--bg);
padding:9px 18px;border-radius:999px;font-size:13px;opacity:0;pointer-events:none;transition:.2s;z-index:9}
#toast.on{opacity:1;transform:translate(-50%,0)}
#toast.err{background:var(--del);color:#fff}
@media(max-width:860px){
 .stats{grid-template-columns:repeat(2,1fr)}
 th.hide-sm,td.hide-sm{display:none}
 .cell-title,.cell-preview{max-width:200px}
 .wrap{padding:18px 14px 60px}
}
`;

// 管理台脚本。刻意不引入任何构建产物：服务是零依赖单文件，页面自带脚本最省事。
// 渲染一律走 textContent（工单内容是用户输入，绝不拼进 innerHTML）。
// 反引号与 ${ 会被外层模板串吞掉，客户端脚本内一律用字符串拼接。
const ADMIN_JS = `
var STATUSES=['已提交','已解决','已拒绝'];
var CATS={bug:'Bug',usage:'不会使用',feature:'建议',performance:'性能'};
var SEV={'P1-高':{label:'P1 完全不可用',tone:'high'},'P2-中':{label:'P2 影响使用',tone:'mid'},'P3-低':{label:'P3 小问题',tone:'low'}};
var state={status:'',q:'',page:0,total:0,detail:null};
var listEl=document.getElementById('list'),bodyEl=document.getElementById('dbody'),
 titleEl=document.getElementById('dtitle'),footEl=document.getElementById('dfoot'),
 drawer=document.getElementById('drawer'),scrim=document.getElementById('scrim'),toastEl=document.getElementById('toast');

function api(path,opts){
 opts=opts||{};
 return fetch('/feedback-api'+path,Object.assign({credentials:'same-origin'},opts,{
  headers:Object.assign({'Content-Type':'application/json'},opts.headers||{})
 })).then(function(r){
  return r.json().catch(function(){return{}}).then(function(j){
   if(!r.ok)throw new Error((j&&(j.msg||j.message))||('HTTP '+r.status));
   return j;
  });
 });
}
function toast(text,isErr){
 toastEl.textContent=text;toastEl.className='on'+(isErr?' err':'');
 clearTimeout(toastEl._t);toastEl._t=setTimeout(function(){toastEl.className=''},2600);
}
function el(tag,cls,text){
 var n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined&&text!==null)n.textContent=String(text);return n;
}
function fmtTime(iso){
 if(!iso)return '';
 var d=new Date(iso);if(isNaN(d))return String(iso);
 var p=function(v){return v<10?'0'+v:String(v)};
 return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+' '+p(d.getHours())+':'+p(d.getMinutes());
}
function relTime(iso){
 var d=new Date(iso);if(isNaN(d))return '';
 var s=Math.floor((Date.now()-d.getTime())/1000);
 if(s<60)return '刚刚';
 if(s<3600)return Math.floor(s/60)+' 分钟前';
 if(s<86400)return Math.floor(s/3600)+' 小时前';
 if(s<86400*7)return Math.floor(s/86400)+' 天前';
 return fmtTime(iso);
}
function statusBadge(s){
 if(s==='已解决')return el('span','badge b-ok',s);
 if(s==='已拒绝')return el('span','badge b-no',s);
 return el('span','badge b-open',s);
}
function setStatusButtons(host,current){
 STATUSES.forEach(function(s){
  if(s===current)return;
  var b=el('button','btn',s);
  b.onclick=function(){ changeStatus(state.detail.ticket_id,s); };
  host.appendChild(b);
 });
}
function changeStatus(id,status){
 api('/admin/ticket/'+encodeURIComponent(id)+'/status',{method:'POST',body:JSON.stringify({status:status})})
 .then(function(){
  toast('已标记为「'+status+'」');
  if(state.detail&&state.detail.ticket_id===id){state.detail.status=status;renderDetail(state.detail);}
  load();
 }).catch(function(e){toast('操作失败：'+e.message,true)});
}
function removeTicket(id){
 if(!confirm('确定删除这条工单？删除后无法恢复。'))return;
 api('/admin/ticket/'+encodeURIComponent(id)+'/delete',{method:'POST'}).then(function(){
  toast('已删除');closeDrawer();load();
 }).catch(function(e){toast('删除失败：'+e.message,true)});
}
function copyId(id){
 var ta=document.createElement('textarea');ta.value=id;document.body.appendChild(ta);ta.select();
 var ok=false;try{ok=document.execCommand('copy')}catch(e){ok=false}
 document.body.removeChild(ta);
 toast(ok?'已复制工单 ID':'复制失败，请手动选择',!ok);
}
function openDrawer(id){
 drawer.classList.add('on');scrim.classList.add('on');
 bodyEl.textContent='加载中…';footEl.textContent='';titleEl.textContent='';
 api('/admin/ticket/'+encodeURIComponent(id)).then(function(t){
  state.detail=t;renderDetail(t);
 }).catch(function(e){
  bodyEl.textContent='';bodyEl.appendChild(el('div','empty','加载失败：'+e.message));closeDrawer();
 });
}
function closeDrawer(){
 drawer.classList.remove('on');scrim.classList.remove('on');state.detail=null;
}
function section(label){
 var s=el('section','d-sec');s.appendChild(el('div','d-lab',label));return s;
}
function renderDetail(t){
 titleEl.textContent='';titleEl.appendChild(document.createTextNode(t.title));
 bodyEl.textContent='';footEl.textContent='';
 var head=el('div','d-head-meta');head.style.cssText='display:flex;gap:8px;flex-wrap:wrap;align-items:center';
 head.appendChild(statusBadge(t.status));
 if(t.severity&&SEV[t.severity])head.appendChild(el('span','badge b-'+SEV[t.severity].tone,SEV[t.severity].label));
 if(t.category)head.appendChild(el('span','badge b-no',CATS[t.category]||t.category));
 bodyEl.appendChild(head);
 bodyEl.appendChild(el('div',null,' '));
 var meta=el('div','cell-sub',fmtTime(t.created_at)+' · 相对时间：'+relTime(t.created_at));
 bodyEl.appendChild(meta);
 var desc=section('问题描述');desc.appendChild(el('div','d-text',t.description||'（无描述）'));bodyEl.appendChild(desc);
 if(t.function_name){var fs=section('发生位置');fs.appendChild(el('div','d-text',t.function_name));bodyEl.appendChild(fs)}
 var metaSec=section('环境与来源');
 var kv=el('dl','kv');
 function addPair(k,v){if(!v)return;kv.appendChild(el('dt',null,k));kv.appendChild(el('dd',null,v))}
 addPair('联系方式',t.contact);
 addPair('设备标识',t.device_mid);
 addPair('工单 ID',t.ticket_id);
 var env=t.environment||{};
 Object.keys(env).sort().forEach(function(k){addPair(k,typeof env[k]==='object'?JSON.stringify(env[k]):env[k])});
 if(kv.childNodes.length)metaSec.appendChild(kv);else metaSec.appendChild(el('div','cell-preview','（无环境信息）'));
 bodyEl.appendChild(metaSec);
 if((t.attachments||[]).length){
  var as=section('附件（'+t.attachments.length+'）');
  t.attachments.forEach(function(a){as.appendChild(el('div','d-text',a.file_name||a.name||JSON.stringify(a)))});
  bodyEl.appendChild(as);
 }
 var ms=section('沟通记录（'+(t.messages||[]).length+'）');
 if(!(t.messages||[]).length)ms.appendChild(el('div','cell-preview','（暂无回复）'));
 (t.messages||[]).forEach(function(m){
  var box=el('div','msg'+(m.sender_type==='staff'?' mine':''));
  var h=el('div','msg-head');
  h.appendChild(el('span',null,m.sender_type==='staff'?'团队':'用户'));
  h.appendChild(el('span',null,fmtTime(m.created_at)));
  box.appendChild(h);box.appendChild(el('div','msg-body',(m.content&&m.content.text)||''));
  ms.appendChild(box);
 });
 bodyEl.appendChild(ms);
 var rs=section('团队回复');
 var ta=document.createElement('textarea');ta.placeholder='回复内容会显示在客户端的「我的工单」里';ta.id='reply';
 rs.appendChild(ta);
 var send=el('button','btn btn-primary','发送回复');send.style.marginTop='8px';
 send.onclick=function(){
  var text=ta.value.trim();if(!text){toast('回复内容不能为空',true);return}
  send.disabled=true;
  api('/admin/ticket/'+encodeURIComponent(t.ticket_id)+'/message',{method:'POST',body:JSON.stringify({text:text})})
  .then(function(){ta.value='';toast('回复已发送');return openDrawer(t.ticket_id)})
  .catch(function(e){toast('发送失败：'+e.message,true)})
  .then(function(){send.disabled=false});
 };
 rs.appendChild(send);bodyEl.appendChild(rs);
 var copyBtn=el('button','btn','复制 ID');copyBtn.onclick=function(){copyId(t.ticket_id)};
 footEl.appendChild(copyBtn);
 setStatusButtons(footEl,t.status);
 var del=el('button','btn btn-danger','删除工单');del.style.marginLeft='auto';
 del.onclick=function(){removeTicket(t.ticket_id)};
 footEl.appendChild(del);
}
function renderRow(t){
 var tr=document.createElement('tr');
 tr.onclick=function(){openDrawer(t.ticket_id)};
 function td(cls,node){var d=document.createElement('td');if(cls)d.className=cls;d.appendChild(node);tr.appendChild(d)}
 td('nowrap',el('span',null,relTime(t.created_at)));
 var title=el('div','cell-title',t.title);td('',title);
 var sub=el('div','cell-sub',t.ticket_id);title.appendChild(sub);
 if(t.has_staff_reply)title.appendChild(el('span','dot-reply','已回复'));
 td('hide-sm',el('span',null,t.category?(CATS[t.category]||t.category):'—'));
 if(t.severity&&SEV[t.severity])td('hide-sm nowrap',el('span','badge b-'+SEV[t.severity].tone,SEV[t.severity].label));
 else td('hide-sm nowrap',el('span','cell-preview','—'));
 td('hide-sm',el('span',null,t.contact||'—'));
 td('hide-sm',el('span','cell-preview',t.preview||'—'));
 td('nowrap',statusBadge(t.status));
 return tr;
}
function load(){
 var tb=document.getElementById('tbody');
 listEl.textContent='';
 api('/admin/tickets?status='+encodeURIComponent(state.status)+'&q='+encodeURIComponent(state.q)+'&limit=20&offset='+(state.page*20))
 .then(function(r){
  state.total=r.total;
  ['全部','已提交','已解决','已拒绝'].forEach(function(label){
   var v=label==='全部'?'':label;
   var box=document.querySelector('.stat[data-v="'+v+'"]');
   if(!box)return;
   box.querySelector('.stat-n').textContent=r.counts[v]||0;
   box.setAttribute('aria-pressed',String(state.status===v));
  });
  var pager=document.getElementById('pager');
  var pages=Math.max(1,Math.ceil(r.total/20));
  if(r.total===0){
   var e=document.createElement('tbody');var er=document.createElement('tr');
   var ec=document.createElement('td');ec.colSpan=7;ec.className='empty';
   ec.textContent=state.q||state.status?'没有符合条件的工单':'还没有收到工单';
   er.appendChild(ec);e.appendChild(er);listEl.appendChild(e);
  }else{
   var tb2=document.createElement('tbody');
   r.items.forEach(function(t){tb2.appendChild(renderRow(t))});
   listEl.appendChild(tb2);
  }
  pager.textContent='';
  pager.appendChild(el('span',null,'第 '+(state.page+1)+' / '+pages+' 页 · 共 '+r.total+' 条'));
  var prev=el('button','btn','上一页'),next=el('button','btn','下一页');
  prev.disabled=state.page<=0;next.disabled=state.page>=pages-1;
  prev.onclick=function(){state.page--;load()};
  next.onclick=function(){state.page++;load()};
  pager.appendChild(prev);pager.appendChild(next);
 }).catch(function(e){
  listEl.textContent='';var e2=document.createElement('tbody');var r2=document.createElement('tr');
  var c2=document.createElement('td');c2.colSpan=7;c2.className='empty';c2.textContent='加载失败：'+e.message;
  r2.appendChild(c2);e2.appendChild(r2);listEl.appendChild(e2);
 });
}
function syncUrl(){
 var p=new URLSearchParams();
 if(state.status)p.set('status',state.status);
 if(state.q)p.set('q',state.q);
 if(state.page)p.set('page',String(state.page));
 history.replaceState(null,'','/feedback-admin'+(p.toString()?'?'+p.toString():''));
}
function initTheme(){
 var saved=null;try{saved=localStorage.getItem('jgadmin-theme')}catch(e){}
 var t=saved||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');
 document.documentElement.setAttribute('data-theme',t);
 var btn=document.getElementById('themebtn');
 btn.textContent=t==='dark'?'☀ 浅色':'☾ 深色';
 btn.onclick=function(){
  var next=document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark';
  document.documentElement.setAttribute('data-theme',next);
  try{localStorage.setItem('jgadmin-theme',next)}catch(e){}
  btn.textContent=next==='dark'?'☀ 浅色':'☾ 深色';
 };
}
(function(){
 var p=new URLSearchParams(location.search);
 state.status=STATUSES.indexOf(p.get('status'))>=0?p.get('status'):'';
 state.q=p.get('q')||'';state.page=Math.max(0,Number(p.get('page')||0));
 document.getElementById('q').value=state.q;
 initTheme();
 var search=document.getElementById('q'),timer=null;
 search.oninput=function(){clearTimeout(timer);timer=setTimeout(function(){state.q=search.value.trim();state.page=0;syncUrl();load()},220)};
 document.querySelectorAll('.stat').forEach(function(box){
  box.onclick=function(){state.status=box.getAttribute('data-v');state.page=0;syncUrl();load()};
 });
 document.getElementById('refresh').onclick=function(){load();toast('已刷新')};
 document.getElementById('closebtn').onclick=closeDrawer;
 scrim.onclick=closeDrawer;
 document.addEventListener('keydown',function(e){if(e.key==='Escape')closeDrawer()});
 load();
})();
`;

function renderLoginPage(wrong) {
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>JGAgent 反馈管理</title>
<style>
*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
background:radial-gradient(900px 420px at 50% -120px,rgba(201,138,46,.14),transparent 70%),#faf7f2;
font-family:"Segoe UI Variable Text",-apple-system,"PingFang SC","Microsoft YaHei UI",system-ui,sans-serif}
form{background:#fff;border:1px solid rgba(70,58,40,.12);border-radius:14px;padding:32px;width:300px;
box-shadow:0 1px 2px rgba(70,58,40,.05),0 12px 32px rgba(70,58,40,.1)}
h2{margin:0 0 4px;font-size:17px;font-weight:650;color:#1c1917}
p.sub{margin:0 0 20px;font-size:12.5px;color:#a39c8c}
input{width:100%;border:1px solid rgba(70,58,40,.14);border-radius:9px;padding:10px 12px;font-size:14px;
margin-bottom:14px;background:#fbf8f2;color:#1c1917}
input:focus{outline:none;border-color:#e39e38}
button{width:100%;border:0;border-radius:9px;padding:10px;background:#e39e38;color:#1a1206;
font-size:14px;font-weight:600;cursor:pointer}
button:hover{filter:brightness(1.06)}
.err{color:#bf4a42;font-size:12.5px;margin:0 0 12px}
@media(prefers-color-scheme:dark){
 body{background:radial-gradient(900px 420px at 50% -120px,rgba(240,179,90,.1),transparent 70%),#0a0908}
 form{background:#121110;border-color:rgba(255,244,228,.09);box-shadow:0 10px 32px rgba(0,0,0,.45)}
 h2,input{color:#f4f1ec}p.sub{color:#6f6a62}input{background:#1c1a17;border-color:rgba(255,244,228,.12)}
 input:focus{border-color:#f0b35a}}
</style></head><body>
<form method="post" action="/feedback-admin/login">
<h2>JGAgent 反馈管理</h2><p class="sub">输入管理密钥继续</p>
${wrong ? '<p class="err">密钥错误，请重试</p>' : ""}
<input type="password" name="password" placeholder="管理密钥" autofocus>
<button type="submit">登录</button></form></body></html>`;
}

function renderAdminPage() {
  const statCard = (value, label, tone) =>
    `<button class="stat${tone ? " is-" + tone : ""}" data-v="${value}" aria-pressed="false">
      <span class="stat-n">–</span><span class="stat-l">${label}</span></button>`;
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>JGAgent 反馈管理</title>
<style>${ADMIN_CSS}</style></head><body>
<div class="wrap">
  <header>
    <div><h1>反馈管理</h1><span class="count" id="total"></span></div>
    <div class="spacer"></div>
    <input class="search" id="q" type="search" placeholder="搜索标题 / ID / 描述 / 联系方式">
    <button class="btn" id="refresh">刷新</button>
    <a class="btn" href="/feedback-api/admin/export" target="_blank" rel="noopener">导出 JSON</a>
    <button class="btn" id="themebtn">☾ 深色</button>
  </header>
  <div class="stats">
    ${statCard("", "全部")}
    ${statCard("已提交", "待处理", "open")}
    ${statCard("已解决", "已解决", "ok")}
    ${statCard("已拒绝", "不予解决")}
  </div>
  <div class="card">
    <div id="list"><table><thead><tr>
      <th>时间</th><th>标题</th><th class="hide-sm">类型</th><th class="hide-sm">级别</th>
      <th class="hide-sm">联系方式</th><th class="hide-sm">摘要</th><th>状态</th>
    </tr></thead></table></div>
    <div class="pager" id="pager"></div>
  </div>
</div>
<div class="scrim" id="scrim"></div>
<aside class="drawer" id="drawer">
  <div class="d-head">
    <h2 class="d-title" id="dtitle"></h2>
    <button class="iconbtn" id="closebtn" title="关闭">✕</button>
  </div>
  <div class="d-body" id="dbody"></div>
  <div class="d-foot" id="dfoot"></div>
</aside>
<div id="toast"></div>
<script>${ADMIN_JS}</script></body></html>`;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  // 允许部署时带 /feedback-api 前缀（nginx 也会剥掉），统一归一化。
  let pathname = url.pathname.replace(/^\/feedback-api(?=\/|$)/, "");
  try {
    ensureStorage();
  } catch (error) {
    sendJson(res, 500, { code: 500, msg: "storage init failed: " + String(error) });
    return;
  }

  try {
    // ---- 附件二进制上传（客户端按 oss.host 直传，落在 /feedback-upload）----
    if (pathname === "/upload" && req.method === "POST") {
      if (
        (req.headers["content-length"] ? Number(req.headers["content-length"]) : 0) >
        MAX_UPLOAD_BYTES
      ) {
        sendJson(res, 413, { code: 413, msg: "attachment too large" });
        return;
      }
      const body = await readBody(req, MAX_UPLOAD_BYTES);
      const file = extractMultipartFile(body, req.headers["content-type"]);
      if (!file) {
        sendJson(res, 400, { code: 400, msg: "no file part" });
        return;
      }
      const safeName = file.filename.replace(/[^\w.\-]+/g, "_").slice(-120);
      const stored = Date.now().toString(36) + "-" + safeName;
      fs.writeFileSync(path.join(FILES_DIR, stored), file.data);
      sendJson(res, 200, { ok: true, stored });
      return;
    }

    // ---- 管理台页面与登录 ----
    if (pathname === "/admin" || pathname === "/admin/login") {
      if (ADMIN_KEY.length === 0) {
        res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("feedback admin disabled");
        return;
      }
      if (pathname === "/admin/login" && req.method === "POST") {
        const form = await readBody(req, 4096);
        const password = new URLSearchParams(form.toString("utf8")).get("password") || "";
        if (password === ADMIN_KEY) {
          res.setHeader("Set-Cookie", adminCookieHeader());
        }
        res.writeHead(302, { Location: "/feedback-admin" });
        res.end();
        return;
      }
      // 带 ?key= 直达时补发 cookie：管理台的所有写操作都靠 cookie 鉴权，
      // 早期版本页面认 key、写接口只认 cookie，导致状态按钮必然 403。
      if (checkAdminKey(url) && getAdminCookie(req) !== ADMIN_KEY) {
        // 注意顺序：setHeader 必须在 writeHead 之前，否则抛 ERR_HTTP_HEADERS_SENT。
        res.setHeader("Set-Cookie", adminCookieHeader());
        res.writeHead(302, { Location: "/feedback-admin" });
        res.end();
        return;
      }
      if (!isAdminAuthorized(req, url)) {
        const wrong = url.searchParams.get("e") === "1";
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(renderLoginPage(wrong));
        return;
      }
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(renderAdminPage());
      return;
    }

    // ---- 管理端 API：一律需要鉴权 ----
    if (pathname.startsWith("/admin/")) {
      if (!isAdminAuthorized(req, url)) {
        sendJson(res, 403, { code: 403, msg: "forbidden" });
        return;
      }
      if (pathname === "/admin/export" && req.method === "GET") {
        sendJson(res, 200, readDb());
        return;
      }
      if (pathname === "/admin/tickets" && req.method === "GET") {
        const db = readDb();
        const status = url.searchParams.get("status") || "";
        const query = url.searchParams.get("q") || "";
        const limit = Math.max(
          1,
          Math.min(Number(url.searchParams.get("limit") ?? ADMIN_PAGE_SIZE), 100),
        );
        const offset = Math.max(0, Number(url.searchParams.get("offset") ?? 0));
        const { matched, counts } = summarizeForList(db, { status, query });
        sendJson(res, 200, {
          items: matched.slice(offset, offset + limit).map(toSummary),
          total: matched.length,
          counts,
        });
        return;
      }
      const adminTicketMatch = /^\/admin\/ticket\/([^/]+)(?:\/(status|message|delete))?$/.exec(
        pathname,
      );
      if (adminTicketMatch) {
        const id = decodeURIComponent(adminTicketMatch[1]);
        const action = adminTicketMatch[2];
        if (req.method === "GET" && !action) {
          const ticket = findTicket(readDb(), id);
          if (!ticket) {
            sendJson(res, 404, { code: 404, msg: "ticket not found: " + id });
            return;
          }
          sendJson(res, 200, toDetail(ticket));
          return;
        }
        if (req.method !== "POST") {
          sendJson(res, 405, { code: 405, msg: "method not allowed" });
          return;
        }
        const db = readDbStrict();
        const ticket = findTicket(db, id);
        if (!ticket) {
          sendJson(res, 404, { code: 404, msg: "ticket not found: " + id });
          return;
        }
        if (action === "status") {
          const body = await readJsonBody(req);
          if (!ADMIN_STATUSES.includes(body.status)) {
            sendJson(res, 400, { code: 400, msg: "invalid status: " + String(body.status) });
            return;
          }
          ticket.status = body.status;
          ticket.updated_at = new Date().toISOString();
          writeDb(db);
          sendEnvelope(res, { ticket_id: ticket.ticket_id, status: ticket.status });
          return;
        }
        if (action === "message") {
          // 团队回复用 sender_type=staff，客户端据此把回复渲染为官方口吻
          // （见 feedbackHttpClient 对 is_staff 的判定）。
          const body = await readJsonBody(req);
          const text = String(body.text ?? body.content?.text ?? "").trim();
          if (!text) {
            sendJson(res, 400, { code: 400, msg: "reply text is empty" });
            return;
          }
          const now = new Date().toISOString();
          const message = {
            message_id: "msg-" + crypto.randomBytes(5).toString("hex"),
            ticket_id: id,
            sender_type: "staff",
            content: { text: text.slice(0, MAX_MESSAGE_CHARS) },
            attachments: [],
            created_at: now,
          };
          if (!Array.isArray(ticket.messages)) ticket.messages = [];
          ticket.messages.push(message);
          ticket.updated_at = now;
          writeDb(db);
          sendEnvelope(res, message);
          return;
        }
        if (action === "delete") {
          db.tickets = db.tickets.filter((item) => item.ticket_id !== id);
          writeDb(db);
          sendEnvelope(res, { ticket_id: id, deleted: true });
          return;
        }
      }
      sendJson(res, 404, { code: 404, msg: "not found" });
      return;
    }

    // ---- 工单创建 ----
    if (pathname === "/feedback/ticket" && req.method === "POST") {
      const body = await readJsonBody(req);
      const ticket = createTicket(body, String(body.device_mid || ""));
      // 客户端把 epoch 秒/ISO 都归一化；这里返回 ISO。
      sendEnvelope(res, {
        ticket_id: ticket.ticket_id,
        status: "submitted",
        created_at: ticket.created_at,
        updated_at: ticket.updated_at,
      });
      return;
    }

    // ---- 工单列表 ----
    if (pathname === "/feedback/ticket" && req.method === "GET") {
      const db = readDb();
      const limit = Math.max(0, Math.min(Number(url.searchParams.get("limit") ?? 50), 200));
      const offset = Math.max(0, Number(url.searchParams.get("offset") ?? 0));
      const items = db.tickets.slice(offset, offset + limit).map((ticket) => ({
        ticket_id: ticket.ticket_id,
        title: ticket.title,
        status: ticket.status,
        created_at: ticket.created_at,
        updated_at: ticket.updated_at,
      }));
      sendEnvelope(res, { items });
      return;
    }

    // ---- 工单详情 / 回复：先匹配 /feedback/ticket/:id 前缀 ----
    const detailMatch = /^\/feedback\/ticket\/([^/]+)(\/message)?$/.exec(pathname);
    if (detailMatch) {
      const id = decodeURIComponent(detailMatch[1]);
      const db = readDb();
      const ticket = findTicket(db, id);
      if (req.method === "GET") {
        if (!ticket) {
          sendJson(res, 404, { code: 404, msg: "ticket not found" });
          return;
        }
        sendEnvelope(res, {
          ticket_id: ticket.ticket_id,
          title: ticket.title,
          status: ticket.status,
          created_at: ticket.created_at,
          updated_at: ticket.updated_at,
          content: ticket.content,
          environment: ticket.environment,
          attachments: ticket.attachments,
          messages: ticket.messages,
        });
        return;
      }
      if (req.method === "POST" && pathname.endsWith("/message")) {
        const body = await readJsonBody(req);
        const now = new Date().toISOString();
        const message = {
          message_id: "msg-" + crypto.randomBytes(5).toString("hex"),
          ticket_id: id,
          sender_type: "user",
          content: { text: String(body.content?.text ?? "").slice(0, MAX_MESSAGE_CHARS) },
          attachments: [],
          created_at: now,
        };
        ticket.messages.push(message);
        ticket.updated_at = now;
        writeDb(db);
        sendEnvelope(res, message);
        return;
      }
    }

    // ---- 附件上传凭证：返回指向本服务上传入口的 OSS 形状凭证（字段客户端会原样组装）----
    if (pathname === "/feedback/attachment/upload-credential" && req.method === "POST") {
      const body = await readJsonBody(req);
      const attachmentId = "att-" + crypto.randomBytes(6).toString("hex");
      sendEnvelope(res, {
        attachment_id: attachmentId,
        max_size: MAX_UPLOAD_BYTES,
        callback: { url: "", body: "", content_type: "" },
        oss: {
          host: "http://82.157.149.224/feedback-upload",
          path:
            "fb/" + String(body.ticket_id ?? "unknown") + "/" + String(body.file_name ?? "file"),
          policy: "",
          x_oss_signature: "",
          x_oss_signature_version: "",
          x_oss_credential: "",
          x_oss_security_token: "",
          x_oss_date: "",
        },
      });
      return;
    }

    sendJson(res, 404, { code: 404, msg: "not found" });
  } catch (error) {
    sendJson(res, 500, { code: 500, msg: String((error && error.message) || error) });
  }
});

server.listen(PORT, () => {
  // 监听所有接口：nginx 在另一容器里经 compose 网络反代到本服务；
  // 端口未对外发布（无 ports 映射），外部无法直达。
  console.log("[jgagent-feedback] listening on 0.0.0.0:" + PORT);
});
