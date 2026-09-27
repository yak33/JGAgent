/**
 * JGAgent 反馈收集服务（零依赖，node:http 实现）。
 *
 * 与桌面端 FeedbackHttpClient 的协议契约（packages/services/src/feedback/feedbackHttpClient.ts）：
 * - POST   /feedback/ticket                      创建工单，请求体 {title, device_mid, content{description,category,function,severity}, contact, environment}
 * - GET    /feedback/ticket?limit&offset          工单列表（最新在前）
 * - GET    /feedback/ticket/:id                   工单详情
 * - POST   /feedback/ticket/:id/message           追加回复
 * - POST   /feedback/attachment/upload-credential 附件上传凭证（返回指向本服务 /upload 的 OSS 形状凭证）
 * - POST   /feedback-upload                       附件二进制（multipart，取 file 部分）
 * - GET    /admin?key=KEY                         全部工单查看页（内部）
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
const MAX_BODY_BYTES = 2 * 1024 * 1024; // JSON 请求体上限
const MAX_UPLOAD_BYTES = 256 * 1024 * 1024; // 附件上限（内部工具足够）

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
    if (trimmed.startsWith("jgadmin=")) {
      return trimmed.slice("jgadmin=".length);
    }
  }
  return "";
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
  const db = readDb();
  const now = new Date().toISOString();
  const id = "fb-" + Date.now().toString(36) + "-" + crypto.randomBytes(3).toString("hex");
  const ticket = {
    ticket_id: id,
    title: String(body.title || "(无标题)").slice(0, 200),
    status: "submitted",
    created_at: now,
    updated_at: now,
    device_mid: deviceMid || null,
    content: {
      description: String(body.content?.description ?? "").slice(0, 20000),
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
  db.tickets = db.tickets.slice(0, 5000);
  writeDb(db);
  return ticket;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  // 允许部署时带 /feedback-api 前缀（nginx 也可选择剥掉），统一归一化。
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
      if ((req.headers["content-length"] ? Number(req.headers["content-length"]) : 0) > MAX_UPLOAD_BYTES) {
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

    // ---- 管理查看页（需登录：输入管理密钥换取 30 天 cookie）----
    if (pathname === "/admin" || pathname === "/admin/login") {
      const isLoginPost = pathname === "/admin/login" && req.method === "POST";
      if (isLoginPost) {
        const form = await readBody(req, 4096);
        const password = new URLSearchParams(form.toString("utf8")).get("password") || "";
        if (ADMIN_KEY.length > 0 && password === ADMIN_KEY) {
          res.setHeader(
            "Set-Cookie",
            `jgadmin=${ADMIN_KEY}; Path=/; HttpOnly; Max-Age=2592000; SameSite=Lax`,
          );
        }
        res.writeHead(302, { Location: "/feedback-admin" });
        res.end();
        return;
      }
      // 已通过 ?key= 或 cookie 授权则直接展示数据；否则渲染登录表单。
      const authorized = checkAdminKey(url) || getAdminCookie(req) === ADMIN_KEY;
      if (ADMIN_KEY.length === 0) {
        res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("feedback admin disabled");
        return;
      }
      if (!authorized) {
        const wrong = url.searchParams.get("e") === "1";
        const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>JGAgent 反馈管理登录</title>
        <style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f5f5f5}
        form{background:#fff;padding:32px;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,.08);width:280px}
        input{width:100%;box-sizing:border-box;padding:10px;margin:8px 0 16px;border:1px solid #ddd;border-radius:8px;font-size:14px}
        button{width:100%;padding:10px;border:0;border-radius:8px;background:#d97706;color:#fff;font-size:14px;cursor:pointer}
        .err{color:#c0392b;font-size:13px;margin:0 0 8px}</style>
        </head><body><form method="post" action="/feedback-admin/login">
        <h2 style="margin:0 0 16px;font-size:18px">JGAgent 反馈管理</h2>
        ${wrong ? '<p class="err">密钥错误，请重试</p>' : ""}
        <input type="password" name="password" placeholder="管理密钥" autofocus>
        <button type="submit">登录</button></form></body></html>`;
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(html);
        return;
      }
      const db = readDb();
      if (url.searchParams.get("format") === "json") {
        sendJson(res, 200, db);
        return;
      }
      const rows = db.tickets
        .map(
          (ticket) => `<tr>
        <td>${escapeHtml(ticket.created_at)}</td>
        <td>${escapeHtml(ticket.ticket_id)}</td>
        <td>${escapeHtml(ticket.title)}</td>
        <td>${escapeHtml(ticket.content?.category ?? "")}</td>
        <td>${escapeHtml(ticket.content?.severity ?? "")}</td>
        <td>${escapeHtml(ticket.contact ?? "")}</td>
        <td style="max-width:480px;white-space:pre-wrap;">${escapeHtml(ticket.content?.description ?? "")}</td>
      </tr>`,
        )
        .join("\n");
      const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>JGAgent 反馈收集</title>
      <style>body{font-family:system-ui,sans-serif;margin:24px;background:#fafafa}table{border-collapse:collapse;width:100%;background:#fff}td,th{border:1px solid #ddd;padding:8px;vertical-align:top;font-size:13px}th{background:#f0f0f0}</style>
      </head><body><h1>JGAgent 反馈收集（${db.tickets.length}）</h1>
      <p>JSON: <code>?format=json</code> · 共 ${db.tickets.length} 条</p>
      <table><tr><th>时间</th><th>ID</th><th>标题</th><th>类型</th><th>级别</th><th>联系方式</th><th>描述</th></tr>${rows}</table></body></html>`;
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(html);
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
          content: { text: String(body.content?.text ?? "").slice(0, 20000) },
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
          path: "fb/" + String(body.ticket_id ?? "unknown") + "/" + String(body.file_name ?? "file"),
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
