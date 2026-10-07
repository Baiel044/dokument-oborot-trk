const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const http = require("http");

const TEST_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "eduflow-users-"));
process.env.DATA_DIR = path.join(TEST_DIR, "data");
process.env.UPLOAD_DIR = path.join(TEST_DIR, "uploads");

const app = require("../src/app");
const store = require("../src/data/store");

let server;
let baseUrl;

async function call(method, url, { token, body } = {}) {
  const response = await fetch(baseUrl + url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, data: await response.json() };
}

async function login(username, password) {
  const { status, data } = await call("POST", "/api/auth/login", { body: { username, password } });
  return status === 200 ? data.token : null;
}

const validUser = {
  fullName: "Асанова Айгүл",
  username: "aigul.asanova",
  email: "Aigul@College.kg",
  password: "Secret2026",
  phone: "+996 700 000 000",
  position: "Бухгалтер",
  roleCode: "ACCOUNTANT",
  departmentId: "accounting",
};

before(async () => {
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  store.closeStorage();
  fs.rmSync(TEST_DIR, { recursive: true, force: true });
});

test("admin creates an active user who can log in immediately", async () => {
  const admin = await login("admin", "admin123");
  const { status, data } = await call("POST", "/api/users", { token: admin, body: validUser });

  assert.equal(status, 201);
  assert.equal(data.user.status, "active");
  assert.equal(data.user.roleCode, "ACCOUNTANT");
  assert.equal(data.user.email, "aigul@college.kg");
  assert.equal(data.user.passwordHash, undefined, "password hash is never returned");

  assert.ok(await login("aigul.asanova", "Secret2026"), "new user logs in with the given password");
  assert.ok(await login("aigul@college.kg", "Secret2026"), "new user logs in with email too");
});

test("admin can create users with any role, including director and admin", async () => {
  const admin = await login("admin", "admin123");
  for (const [index, roleCode] of ["DIRECTOR", "ADMIN", "TEACHER", "HR", "ACADEMIC_OFFICE"].entries()) {
    const { status } = await call("POST", "/api/users", {
      token: admin,
      body: { ...validUser, username: `role.user${index}`, email: `role${index}@college.kg`, roleCode },
    });
    assert.equal(status, 201, roleCode);
  }
});

test("rejects duplicates and invalid input", async () => {
  const admin = await login("admin", "admin123");
  const cases = [
    [{ ...validUser, email: "other@college.kg" }, 409], // same username
    [{ ...validUser, username: "other.user" }, 409], // same email
    [{ ...validUser, username: "x1", email: "x1@college.kg", password: "short" }, 400],
    [{ ...validUser, username: "x2", email: "not-an-email" }, 400],
    [{ ...validUser, username: "x3", email: "x3@college.kg", roleCode: "SUPERUSER" }, 400],
    [{ ...validUser, username: "x4", email: "x4@college.kg", departmentId: "space" }, 400],
    [{ ...validUser, username: "bad name!", email: "x5@college.kg" }, 400],
  ];

  for (const [body, expected] of cases) {
    const { status } = await call("POST", "/api/users", { token: admin, body });
    assert.equal(status, expected, JSON.stringify(body));
  }
});

test("only administrators can create users", async () => {
  const director = await login("director", "director123");
  const teacher = await login("teacher", "teacher123");
  const body = { ...validUser, username: "nope", email: "nope@college.kg" };

  assert.equal((await call("POST", "/api/users", { token: director, body })).status, 403);
  assert.equal((await call("POST", "/api/users", { token: teacher, body })).status, 403);
  assert.equal((await call("POST", "/api/users", { body })).status, 401);
});

test("editing a user rejects unknown roles", async () => {
  const admin = await login("admin", "admin123");
  const { status } = await call("PUT", "/api/users/user-teacher", { token: admin, body: { roleCode: "GOD" } });
  assert.equal(status, 400);
});
