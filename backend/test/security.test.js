const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const http = require("http");
const net = require("net");
const crypto = require("crypto");

const TEST_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "eduflow-security-"));
process.env.DATA_DIR = path.join(TEST_DIR, "data");
process.env.UPLOAD_DIR = path.join(TEST_DIR, "uploads");

const app = require("../src/app");
const store = require("../src/data/store");
const { attachMessagesWebSocket } = require("../src/realtime/messagesSocket");
const { UPLOAD_DIR, DATA_DIR } = require("../src/utils/config");

let server;
let baseUrl;
let port;

async function call(method, url, { token, body, form, headers = {} } = {}) {
  const response = await fetch(baseUrl + url, {
    method,
    headers: {
      ...(form ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: form || (body ? JSON.stringify(body) : undefined),
  });
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (_error) {
    data = text;
  }
  return { status: response.status, data };
}

async function login(username, password) {
  const { status, data } = await call("POST", "/api/auth/login", { body: { username, password } });
  return status === 200 ? data.token : null;
}

function pdfForm(fields = {}, fileName = "doc.pdf", content = "%PDF-1.4\n%test\n") {
  const form = new FormData();
  Object.entries(fields).forEach(([key, value]) => form.append(key, value));
  form.append("file", new Blob([content], { type: "application/pdf" }), fileName);
  return form;
}

function listUploads() {
  return fs.existsSync(UPLOAD_DIR) ? fs.readdirSync(UPLOAD_DIR).filter((name) => name !== "avatars") : [];
}

/** Minimal WebSocket client that can split a frame across TCP writes. */
function openRawSocket(token) {
  return new Promise((resolve, reject) => {
    const socket = net.connect(port, "127.0.0.1");
    const key = crypto.randomBytes(16).toString("base64");
    const received = [];
    let buffer = Buffer.alloc(0);
    let upgraded = false;

    socket.on("data", (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      if (!upgraded) {
        const end = buffer.indexOf("\r\n\r\n");
        if (end === -1) return;
        const head = buffer.subarray(0, end).toString();
        if (!head.includes(" 101 ")) {
          reject(new Error(head));
          return;
        }
        upgraded = true;
        buffer = buffer.subarray(end + 4);
        resolve({ socket, received, sendSplit });
      }
      while (buffer.length >= 2) {
        let length = buffer[1] & 0x7f;
        let offset = 2;
        if (length === 126) {
          length = buffer.readUInt16BE(2);
          offset = 4;
        }
        if (buffer.length < offset + length) break;
        received.push({ opcode: buffer[0] & 0x0f, payload: buffer.subarray(offset, offset + length) });
        buffer = buffer.subarray(offset + length);
      }
    });
    socket.on("error", reject);
    socket.write(
      `GET /api/messages/ws?token=${encodeURIComponent(token)} HTTP/1.1\r\nHost: localhost\r\n` +
        `Upgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 13\r\n\r\n`
    );

    async function sendSplit(object, parts = 3) {
      const payload = Buffer.from(JSON.stringify(object));
      const mask = crypto.randomBytes(4);
      const masked = Buffer.from(payload.map((byte, index) => byte ^ mask[index % 4]));
      let header;
      if (payload.length < 126) {
        header = Buffer.from([0x81, 0x80 | payload.length]);
      } else {
        header = Buffer.alloc(4);
        header[0] = 0x81;
        header[1] = 0x80 | 126;
        header.writeUInt16BE(payload.length, 2);
      }
      const frame = Buffer.concat([header, mask, masked]);
      const size = Math.ceil(frame.length / parts);
      for (let index = 0; index < frame.length; index += size) {
        socket.write(frame.subarray(index, index + size));
        await new Promise((r) => setTimeout(r, 30));
      }
    }
  });
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

before(async () => {
  server = http.createServer(app);
  attachMessagesWebSocket(server);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
});

after(async () => {
  server.closeAllConnections?.();
  await new Promise((resolve) => server.close(resolve));
  store.closeStorage();
  fs.rmSync(TEST_DIR, { recursive: true, force: true });
});

test("1. official PDF: only director/admin and only for approved documents", async () => {
  const teacher = await login("teacher", "teacher123");
  const director = await login("director", "director123");
  const created = await call("POST", "/api/documents", { token: teacher, form: pdfForm({ title: "Буйрук", category: "orders" }) });
  assert.equal(created.status, 201);
  const id = created.data.document.id;

  assert.equal((await call("POST", `/api/documents/${id}/generate-pdf`, { token: teacher })).status, 403);
  assert.equal((await call("POST", `/api/documents/${id}/generate-pdf`, { token: director })).status, 400, "draft");

  await call("PATCH", `/api/documents/${id}/status`, { token: teacher, body: { status: "submitted" } });
  await call("PATCH", `/api/documents/${id}/status`, { token: director, body: { status: "pending" } });
  const approved = await call("PATCH", `/api/documents/${id}/status`, { token: director, body: { status: "approved" } });
  assert.equal(approved.status, 200);
  assert.equal(approved.data.document.isOfficial, true, "approval issues the official PDF");
});

test("PDF font with Kyrgyz Cyrillic is bundled, so Linux servers do not fall back to transliteration", async () => {
  const fontkit = require("@pdf-lib/fontkit");
  const { getPdfFontCandidates } = require("../src/utils/pdfFonts");
  const [bundledFont] = getPdfFontCandidates();

  assert.ok(fs.existsSync(bundledFont), "bundled font is in the repository");
  const font = fontkit.create(fs.readFileSync(bundledFont));
  for (const letter of "АаӨөҮүҢңЖж") {
    assert.ok(font.hasGlyphForCodePoint(letter.codePointAt(0)), `glyph for ${letter}`);
  }
});

test("2. a blocked user's open WebSocket is closed and cannot post", async () => {
  const admin = await login("admin", "admin123");
  const hr = await login("hr", "hr123456");
  const client = await openRawSocket(hr);
  await wait(50);

  const block = await call("PUT", "/api/users/user-hr", { token: admin, body: { status: "blocked" } });
  assert.equal(block.status, 200);

  await client.sendSplit({ type: "chat:send", chatScope: "global", text: "блоктон кийин" });
  await wait(200);
  assert.ok(client.received.some((frame) => frame.opcode === 0x8), "server closed the socket");
  const messages = store.readDb().messages.filter((message) => message.text === "блоктон кийин");
  assert.equal(messages.length, 0);
  client.socket.destroy();

  await call("PUT", "/api/users/user-hr", { token: admin, body: { status: "active" } });
});

test("12. a WebSocket frame split across TCP packets is still delivered", async () => {
  const teacher = await login("teacher", "teacher123");
  const client = await openRawSocket(teacher);
  await wait(50);
  const text = "узун кабар ".repeat(400);
  await client.sendSplit({ type: "chat:send", chatScope: "global", text }, 5);
  await wait(300);
  const replies = client.received
    .filter((frame) => frame.opcode === 0x1)
    .map((frame) => JSON.parse(frame.payload.toString()));
  assert.ok(replies.some((reply) => reply.type === "chat:message" && reply.message.text === text.trim()));
  client.socket.destroy();
});

test("11. message text must be a string within limits", async () => {
  const teacher = await login("teacher", "teacher123");
  const body = { audienceType: "global" };
  assert.equal((await call("POST", "/api/messages", { token: teacher, body: { ...body, text: { a: 1 } } })).status, 400);
  assert.equal((await call("POST", "/api/messages", { token: teacher, body: { ...body, text: "x".repeat(5001) } })).status, 400);
  assert.equal((await call("POST", "/api/messages", { token: teacher, body: { ...body, text: "Салам" } })).status, 201);
});

test("13. private messages are visible only to their participants", async () => {
  const admin = await login("admin", "admin123");
  const director = await login("director", "director123");
  const teacher = await login("teacher", "teacher123");
  const sent = await call("POST", "/api/messages", { token: teacher, body: { receiverId: "user-academic", text: "жеке" } });
  const id = sent.data.messages[0].id;
  assert.equal((await call("GET", `/api/messages/${id}`, { token: admin })).status, 403);
  assert.equal((await call("GET", `/api/messages/${id}`, { token: director })).status, 403);
  assert.equal((await call("GET", `/api/messages/${id}`, { token: teacher })).status, 200);
});

test("3. audit CSV neutralises spreadsheet formulas", async () => {
  await call("POST", "/api/auth/login", { body: { username: "=HYPERLINK(\"http://evil\")", password: "x" } });
  const admin = await login("admin", "admin123");
  const csv = await call("GET", "/api/audit-logs/export.csv", { token: admin });
  assert.equal(csv.status, 200);
  // Login identifiers are stored lower-cased.
  assert.ok(!/(^|[;,\n])"?=hyperlink/i.test(csv.data), "no cell starts with a formula");
  assert.ok(/'=hyperlink/i.test(csv.data));
});

test("4. letterhead template is stored in the data folder and must be a valid PDF", async () => {
  const admin = await login("admin", "admin123");
  const bad = new FormData();
  bad.append("template", new Blob(["not a pdf"], { type: "application/pdf" }), "t.pdf");
  assert.equal((await call("POST", "/api/documents/letterhead-template", { token: admin, form: bad })).status, 400);
  await wait(100);

  const templateDir = path.join(DATA_DIR, "letterhead");
  assert.deepEqual(fs.existsSync(templateDir) ? fs.readdirSync(templateDir) : [], [], "rejected upload removed");

  const { PDFDocument } = require("pdf-lib");
  const pdf = await PDFDocument.create();
  pdf.addPage();
  const good = new FormData();
  good.append("template", new Blob([await pdf.save()], { type: "application/pdf" }), "t.pdf");
  assert.equal((await call("POST", "/api/documents/letterhead-template", { token: admin, form: good })).status, 200);
  assert.deepEqual(fs.readdirSync(templateDir), ["letterhead-template.pdf"]);
});

test("6. uploads without permission never reach the disk", async () => {
  const admin = await login("admin", "admin123");
  const teacher = await login("teacher", "teacher123");
  const academic = await login("academic", "academic123");
  const created = await call("POST", "/api/documents", { token: admin, form: pdfForm({ title: "Админдики", category: "orders" }) });
  const before = listUploads().length;

  const attempt = await call("POST", `/api/documents/${created.data.document.id}/files`, { token: teacher, form: pdfForm() });
  assert.equal(attempt.status, 403);
  const editAttempt = await call("PUT", "/api/requests/req-seed-1", { token: academic, form: pdfForm({}, "a.pdf") });
  assert.equal(editAttempt.status, 403);
  const invalid = await call("POST", "/api/documents", { token: teacher, form: pdfForm({ category: "nonsense" }) });
  assert.equal(invalid.status, 400);

  await wait(100);
  assert.equal(listUploads().length, before);
});

test("7. deleting a document removes its files; authors cannot delete approved documents", async () => {
  const teacher = await login("teacher", "teacher123");
  const director = await login("director", "director123");
  const admin = await login("admin", "admin123");

  const draft = await call("POST", "/api/documents", { token: teacher, form: pdfForm({ title: "Долбоор", category: "orders" }) });
  const draftId = draft.data.document.id;
  await call("POST", `/api/documents/${draftId}/files`, { token: teacher, form: pdfForm({}, "extra.pdf") });
  const draftFiles = (await call("GET", `/api/documents/${draftId}`, { token: teacher })).data.document.files.map((file) =>
    path.basename(file.filePath)
  );
  assert.equal((await call("DELETE", `/api/documents/${draftId}`, { token: teacher })).status, 200);
  await wait(100);
  draftFiles.forEach((name) => assert.ok(!fs.existsSync(path.join(UPLOAD_DIR, name)), name));

  const doc = await call("POST", "/api/documents", { token: teacher, form: pdfForm({ title: "Бекитилет", category: "orders", status: "submitted" }) });
  const id = doc.data.document.id;
  await call("PATCH", `/api/documents/${id}/status`, { token: director, body: { status: "pending" } });
  await call("PATCH", `/api/documents/${id}/status`, { token: director, body: { status: "approved" } });
  assert.equal((await call("DELETE", `/api/documents/${id}`, { token: teacher })).status, 403);
  assert.equal((await call("DELETE", `/api/documents/${id}`, { token: admin })).status, 200);
});

test("8. audit log ignores a forged X-Forwarded-For when no proxy is trusted", async () => {
  await call("POST", "/api/auth/login", {
    body: { username: "teacher", password: "teacher123" },
    headers: { "X-Forwarded-For": "6.6.6.6" },
  });
  const entry = store.readDb().auditLogs.find((log) => log.action === "Тутумга кирди");
  assert.notEqual(entry.ipAddress, "6.6.6.6");
});

test("9. login does not reveal account status without the right password", async () => {
  await call("POST", "/api/auth/register", {
    body: {
      fullName: "Жаңы Кызматкер",
      email: "new@college.kg",
      phone: "1",
      position: "Окутуучу",
      departmentId: "teaching",
      roleCode: "TEACHER",
      username: "pending.user",
      password: "Password1",
      confirmPassword: "Password1",
    },
  });
  assert.equal((await call("POST", "/api/auth/login", { body: { username: "pending.user", password: "wrong-pass" } })).status, 401);
  assert.equal((await call("POST", "/api/auth/login", { body: { username: "pending.user", password: "Password1" } })).status, 403);
});

test("10. registration requires at least 8 characters", async () => {
  const response = await call("POST", "/api/auth/register", {
    body: {
      fullName: "Кыска",
      email: "short@college.kg",
      phone: "1",
      position: "x",
      departmentId: "teaching",
      roleCode: "TEACHER",
      username: "short.pass",
      password: "1234567",
      confirmPassword: "1234567",
    },
  });
  assert.equal(response.status, 400);
});

test("14. changing a password signs out other sessions but keeps the current one", async () => {
  const oldToken = await login("academic", "academic123");
  const otherSession = await login("academic", "academic123");
  await wait(1100); // token "iat" has one-second precision
  const change = await call("PUT", "/api/users/me/password", {
    token: oldToken,
    body: { currentPassword: "academic123", newPassword: "NewPass2026", confirmPassword: "NewPass2026" },
  });
  assert.equal(change.status, 200);
  assert.ok(change.data.token);

  assert.equal((await call("GET", "/api/users/me", { token: otherSession })).status, 401);
  assert.equal((await call("GET", "/api/users/me", { token: change.data.token })).status, 200);
});

test("10. too many failed logins are rate limited", async () => {
  let lastStatus = 0;
  for (let attempt = 0; attempt < 12; attempt += 1) {
    lastStatus = (await call("POST", "/api/auth/login", { body: { username: "director", password: "wrong" } })).status;
  }
  assert.equal(lastStatus, 429);
});
