// Self-tests for ctg-js-api-client — error class + HTTP client
//
// Uses ctg-js-test as the test framework.
// Starts an embedded node:http server for HTTP integration tests.
// Server is always stopped on exit (pass, fail, or error).

import { writeFileSync, unlinkSync, mkdtempSync } from "node:fs"; // File ops for upload tests
import { join } from "node:path"; // Path utils
import { tmpdir } from "node:os"; // Temp directory

import CTGTest from "../../ctg-js-test/src/CTGTest.js"; // Test framework
import { startServer, stopServer } from "./server.js"; // Test HTTP server

// These will be implemented — import paths for what we're testing
import CTGAPIClient from "../src/CTGAPIClient.js"; // HTTP client
import CTGAPIClientError from "../src/CTGAPIClientError.js"; // Typed errors

// ── Server Lifecycle ─────────────────────────────────────────

let testServer;
let BASE_URL;

try {
    const { server, baseUrl } = await startServer();
    testServer = server;
    BASE_URL = baseUrl;
    process.stdout.write(`Test server started at ${BASE_URL}\n\n`);
} catch (err) {
    process.stdout.write(`Failed to start test server: ${err.message}\n`);
    process.exit(1);
}

// ── Test Harness ─────────────────────────────────────────────

process.stdout.write("=== ctg-js-api-client Self Test ===\n\n");

let allPassed = true;

// :: STRING, (() -> PROMISE(BOOL|STRING)) -> PROMISE(VOID)
// Runs a single test, reporting PASS/FAIL/ERROR.
async function selfTest(label, fn) {
    try {
        const result = await fn();
        if (result === true) {
            process.stdout.write(`  PASS  ${label}\n`);
        } else {
            process.stdout.write(`  FAIL  ${label}\n`);
            if (typeof result === "string") {
                process.stdout.write(`        ${result}\n`);
            }
            allPassed = false;
        }
    } catch (e) {
        process.stdout.write(`  ERROR ${label}\n`);
        process.stdout.write(`        ${e.constructor.name}: ${e.message}\n`);
        allPassed = false;
    }
}

// ══════════════════════════════════════════════════════════════
// CTGAPIClientError Tests
// ══════════════════════════════════════════════════════════════

// ── Construction ─────────────────────────────────────────────

await selfTest("error: construct with type name", async () => {
    const e = new CTGAPIClientError("TIMEOUT", "request timed out", { url: "/test" });
    return e.type === "TIMEOUT"
        && e.code === 1001
        && e.msg === "request timed out"
        && e.data.url === "/test"
        && e.name === "CTGAPIClientError"
        && e.message === "request timed out"
        && e instanceof Error;
});

await selfTest("error: construct with integer code", async () => {
    const e = new CTGAPIClientError(1000, "connection lost");
    return e.type === "CONNECTION_FAILED"
        && e.code === 1000
        && e.msg === "connection lost";
});

await selfTest("error: default msg to type name", async () => {
    const e = new CTGAPIClientError("DNS_FAILED");
    return e.msg === "DNS_FAILED"
        && e.data === null;
});

await selfTest("error: unknown type throws TypeError", async () => {
    try {
        new CTGAPIClientError("BOGUS");
        return "no throw";
    } catch (e) {
        return e instanceof TypeError;
    }
});

await selfTest("error: unknown code throws TypeError", async () => {
    try {
        new CTGAPIClientError(9999);
        return "no throw";
    } catch (e) {
        return e instanceof TypeError;
    }
});

// ── Lookup ───────────────────────────────────────────────────

await selfTest("lookup: name to code", async () =>
    CTGAPIClientError.lookup("TIMEOUT") === 1001
);

await selfTest("lookup: code to name", async () =>
    CTGAPIClientError.lookup(1001) === "TIMEOUT"
);

await selfTest("lookup: unknown string returns null", async () =>
    CTGAPIClientError.lookup("BOGUS") === null
);

await selfTest("lookup: unknown integer returns null", async () =>
    CTGAPIClientError.lookup(9999) === null
);

await selfTest("lookup: all error codes", async () => {
    return CTGAPIClientError.lookup("CONNECTION_FAILED") === 1000
        && CTGAPIClientError.lookup("TIMEOUT") === 1001
        && CTGAPIClientError.lookup("DNS_FAILED") === 1002
        && CTGAPIClientError.lookup("SSL_ERROR") === 1003
        && CTGAPIClientError.lookup("REQUEST_FAILED") === 2000
        && CTGAPIClientError.lookup("INVALID_URL") === 3000
        && CTGAPIClientError.lookup("INVALID_METHOD") === 3001
        && CTGAPIClientError.lookup("INVALID_BODY") === 3002
        && CTGAPIClientError.lookup("INVALID_HEADER") === 3003
        && CTGAPIClientError.lookup("HTTP_ERROR") === 4000;
});

// ── on/otherwise Chaining ────────────────────────────────────

await selfTest("on: matches type name", async () => {
    let matched = false;
    const e = new CTGAPIClientError("TIMEOUT", "timed out");
    e.on("TIMEOUT", () => { matched = true; });
    return matched;
});

await selfTest("on: matches by integer code", async () => {
    let matched = false;
    const e = new CTGAPIClientError("TIMEOUT");
    e.on(1001, () => { matched = true; });
    return matched;
});

await selfTest("on: short circuits after first match", async () => {
    let first = false;
    let second = false;
    const e = new CTGAPIClientError("TIMEOUT");
    e.on("TIMEOUT", () => { first = true; })
     .on("TIMEOUT", () => { second = true; });
    return first && !second;
});

await selfTest("on: skips non-matching type", async () => {
    let matched = false;
    const e = new CTGAPIClientError("TIMEOUT");
    e.on("DNS_FAILED", () => { matched = true; });
    return !matched;
});

await selfTest("on: returns self for chaining", async () => {
    const e = new CTGAPIClientError("TIMEOUT");
    const result = e.on("DNS_FAILED", () => {});
    return result === e;
});

await selfTest("otherwise: called when no on matched", async () => {
    let called = false;
    const e = new CTGAPIClientError("TIMEOUT");
    e.on("DNS_FAILED", () => {})
     .otherwise(() => { called = true; });
    return called;
});

await selfTest("otherwise: not called when on matched", async () => {
    let called = false;
    const e = new CTGAPIClientError("TIMEOUT");
    e.on("TIMEOUT", () => {})
     .otherwise(() => { called = true; });
    return !called;
});

await selfTest("on: unknown string type throws TypeError", async () => {
    try {
        const e = new CTGAPIClientError("TIMEOUT");
        e.on("NONEXISTENT", () => {});
        return "no throw";
    } catch (err) {
        return err instanceof TypeError;
    }
});

await selfTest("on: unknown integer code throws TypeError", async () => {
    try {
        const e = new CTGAPIClientError("TIMEOUT");
        e.on(99999, () => {});
        return "no throw";
    } catch (err) {
        return err instanceof TypeError;
    }
});

// ── HTTP_ERROR Pattern ───────────────────────────────────────

await selfTest("HTTP_ERROR: construct with response data", async () => {
    const response = { status: 404, ok: false, body: { error: "Not found" } };
    const e = new CTGAPIClientError("HTTP_ERROR", "Status: 404", response);
    return e.type === "HTTP_ERROR"
        && e.code === 4000
        && e.data.status === 404
        && e.data.ok === false;
});

await selfTest("HTTP_ERROR: chainable with transport errors", async () => {
    let httpHandled = false;
    const e = new CTGAPIClientError("HTTP_ERROR", "404", { status: 404 });
    e.on("TIMEOUT", () => {})
     .on("HTTP_ERROR", () => { httpHandled = true; })
     .otherwise(() => {});
    return httpHandled;
});

// ══════════════════════════════════════════════════════════════
// CTGAPIClient — Construction
// ══════════════════════════════════════════════════════════════

await selfTest("init: static factory returns instance", async () => {
    const client = CTGAPIClient.init(BASE_URL);
    return client instanceof CTGAPIClient;
});

await selfTest("init: with config", async () => {
    const client = CTGAPIClient.init(BASE_URL, {
        timeout: 5,
        headers: { "X-Custom": "value" }
    });
    return client.timeout === 5;
});

await selfTest("init: strips trailing slash from baseUrl", async () => {
    const client = CTGAPIClient.init(BASE_URL + "/");
    return client.baseUrl === BASE_URL;
});

// ── Timeout Validation ───────────────────────────────────────

await selfTest("timeout: zero throws TypeError", async () => {
    try {
        CTGAPIClient.init(BASE_URL, { timeout: 0 });
        return "no throw";
    } catch (e) {
        return e instanceof TypeError;
    }
});

await selfTest("timeout: negative throws TypeError", async () => {
    try {
        CTGAPIClient.init(BASE_URL, { timeout: -1 });
        return "no throw";
    } catch (e) {
        return e instanceof TypeError;
    }
});

await selfTest("timeout: non-number throws TypeError", async () => {
    try {
        CTGAPIClient.init(BASE_URL, { timeout: "fast" });
        return "no throw";
    } catch (e) {
        return e instanceof TypeError;
    }
});

await selfTest("timeout: float accepted", async () => {
    const client = CTGAPIClient.init(BASE_URL, { timeout: 1.5 });
    return client.timeout === 1.5;
});

await selfTest("timeout: static request zero throws TypeError", async () => {
    try {
        await CTGAPIClient.request("GET", `${BASE_URL}/echo`, {}, {}, {}, 0);
        return "no throw";
    } catch (e) {
        return e instanceof TypeError;
    }
});

await selfTest("timeout: static request negative throws TypeError", async () => {
    try {
        await CTGAPIClient.request("GET", `${BASE_URL}/echo`, {}, {}, {}, -5);
        return "no throw";
    } catch (e) {
        return e instanceof TypeError;
    }
});

await selfTest("timeout: static request non-number throws TypeError", async () => {
    try {
        await CTGAPIClient.request("GET", `${BASE_URL}/echo`, {}, {}, {}, "fast");
        return "no throw";
    } catch (e) {
        return e instanceof TypeError;
    }
});

// ══════════════════════════════════════════════════════════════
// CTGAPIClient — Static request()
// ══════════════════════════════════════════════════════════════

await selfTest("static request: GET with full URL", async () => {
    const r = await CTGAPIClient.request("GET", `${BASE_URL}/echo`);
    return r.status === 200
        && r.ok === true
        && r.body.method === "GET";
});

await selfTest("static request: POST with body", async () => {
    const r = await CTGAPIClient.request("POST", `${BASE_URL}/echo`, { key: "value" });
    return r.status === 200
        && r.body.method === "POST"
        && r.body.body.key === "value";
});

await selfTest("static request: with query params", async () => {
    const r = await CTGAPIClient.request("GET", `${BASE_URL}/echo`, {}, { page: "1", limit: "10" });
    return r.body.params.page === "1"
        && r.body.params.limit === "10";
});

await selfTest("static request: with headers", async () => {
    const r = await CTGAPIClient.request("GET", `${BASE_URL}/echo`, {}, {}, { "X-Custom": "test" });
    return r.body.headers["x-custom"] === "test";
});

await selfTest("static request: case-insensitive method", async () => {
    const r = await CTGAPIClient.request("post", `${BASE_URL}/echo`, { test: true });
    return r.body.method === "POST";
});

await selfTest("static request: empty method throws INVALID_METHOD", async () => {
    try {
        await CTGAPIClient.request("", `${BASE_URL}/echo`);
        return "no throw";
    } catch (e) {
        return e instanceof CTGAPIClientError && e.type === "INVALID_METHOD";
    }
});

await selfTest("static request: invalid method throws INVALID_METHOD", async () => {
    try {
        await CTGAPIClient.request("BOGUS", `${BASE_URL}/echo`);
        return "no throw";
    } catch (e) {
        return e instanceof CTGAPIClientError && e.type === "INVALID_METHOD";
    }
});

await selfTest("static request: HEAD is valid method", async () => {
    const r = await CTGAPIClient.request("HEAD", `${BASE_URL}/echo`);
    return r.status === 200;
});

await selfTest("static request: OPTIONS is valid method", async () => {
    const r = await CTGAPIClient.request("OPTIONS", `${BASE_URL}/echo`);
    return r.status === 200;
});

await selfTest("static request: invalid header name throws INVALID_HEADER", async () => {
    try {
        await CTGAPIClient.request("GET", `${BASE_URL}/echo`, {}, {}, { "Bad Name": "value" });
        return "no throw";
    } catch (e) {
        return e instanceof CTGAPIClientError && e.type === "INVALID_HEADER";
    }
});

await selfTest("static request: CRLF in header name throws INVALID_HEADER", async () => {
    try {
        await CTGAPIClient.request("GET", `${BASE_URL}/echo`, {}, {}, { "Name\r\n": "value" });
        return "no throw";
    } catch (e) {
        return e instanceof CTGAPIClientError && e.type === "INVALID_HEADER";
    }
});

await selfTest("static request: CRLF stripped from header values", async () => {
    const r = await CTGAPIClient.request("GET", `${BASE_URL}/echo`, {}, {}, {
        "X-Test": "safe\r\nX-Injected: evil"
    });
    // The value should have \r\n stripped, so no injection
    const val = r.body.headers["x-test"];
    return typeof val === "string" && !val.includes("\n");
});

await selfTest("static request: Content-Type auto-set for JSON body", async () => {
    const r = await CTGAPIClient.request("POST", `${BASE_URL}/echo`, { data: "test" });
    return r.body.headers["content-type"] === "application/json";
});

await selfTest("static request: explicit content-type not duplicated", async () => {
    const r = await CTGAPIClient.request("POST", `${BASE_URL}/echo`, { data: "test" }, {}, {
        "content-type": "text/plain"
    });
    return r.body.headers["content-type"] === "text/plain";
});

await selfTest("static request: default User-Agent header sent", async () => {
    const r = await CTGAPIClient.request("GET", `${BASE_URL}/echo`);
    return r.body.headers["user-agent"] !== undefined
        && r.body.headers["user-agent"].includes("CTGAPIClient");
});

await selfTest("static request: body ignored for GET", async () => {
    const r = await CTGAPIClient.request("GET", `${BASE_URL}/echo`, { ignored: true });
    // Body not sent: echo body should be empty string (no JSON), no auto Content-Type
    return r.status === 200
        && r.body.method === "GET"
        && (r.body.body === "" || r.body.body === null || r.body.body === undefined)
        && r.body.headers["content-type"] === undefined;
});

await selfTest("static request: body ignored for DELETE", async () => {
    const r = await CTGAPIClient.request("DELETE", `${BASE_URL}/echo`, { ignored: true });
    return r.status === 200
        && r.body.method === "DELETE"
        && (r.body.body === "" || r.body.body === null || r.body.body === undefined)
        && r.body.headers["content-type"] === undefined;
});

await selfTest("static request: query params appended to URL with existing ?", async () => {
    const r = await CTGAPIClient.request("GET", `${BASE_URL}/echo?existing=1`, {}, { added: "2" });
    return r.body.params.existing === "1"
        && r.body.params.added === "2";
});

await selfTest("static request: array param serialized as comma string", async () => {
    const r = await CTGAPIClient.request("GET", `${BASE_URL}/echo`, {}, { tags: [1, 2, 3] });
    // URLSearchParams flattens arrays via toString(), producing "1,2,3"
    return r.body.params.tags === "1,2,3";
});

await selfTest("static request: nested object param serialized as string", async () => {
    const r = await CTGAPIClient.request("GET", `${BASE_URL}/echo`, {}, { filter: { active: true } });
    // URLSearchParams calls toString() on objects, producing "[object Object]"
    return r.body.params.filter === "[object Object]";
});

// ══════════════════════════════════════════════════════════════
// CTGAPIClient — Instance HTTP Methods
// ══════════════════════════════════════════════════════════════

await selfTest("GET: basic request", async () => {
    const client = CTGAPIClient.init(BASE_URL);
    const r = await client.GET("/echo");
    return r.status === 200
        && r.ok === true
        && r.body.method === "GET";
});

await selfTest("GET: with query parameters", async () => {
    const client = CTGAPIClient.init(BASE_URL);
    const r = await client.GET("/echo", { role: "admin", active: "true" });
    return r.body.params.role === "admin"
        && r.body.params.active === "true";
});

await selfTest("GET: with per-request headers", async () => {
    const client = CTGAPIClient.init(BASE_URL);
    const r = await client.GET("/echo", {}, { "X-Request-Only": "yes" });
    return r.body.headers["x-request-only"] === "yes";
});

await selfTest("GET: JSON endpoint", async () => {
    const client = CTGAPIClient.init(BASE_URL);
    const r = await client.GET("/json");
    return Array.isArray(r.body.users)
        && r.body.users.length === 3
        && r.body.users[0].name === "Alice";
});

await selfTest("POST: JSON body", async () => {
    const client = CTGAPIClient.init(BASE_URL);
    const r = await client.POST("/echo", { name: "test" });
    return r.body.method === "POST"
        && r.body.body.name === "test";
});

await selfTest("POST: with query params and body", async () => {
    const client = CTGAPIClient.init(BASE_URL);
    const r = await client.POST("/echo", { data: "x" }, { page: "2" });
    return r.body.body.data === "x"
        && r.body.params.page === "2";
});

await selfTest("PUT: JSON body", async () => {
    const client = CTGAPIClient.init(BASE_URL);
    const r = await client.PUT("/echo", { updated: true });
    return r.body.method === "PUT"
        && r.body.body.updated === true;
});

await selfTest("PATCH: JSON body", async () => {
    const client = CTGAPIClient.init(BASE_URL);
    const r = await client.PATCH("/echo", { field: "value" });
    return r.body.method === "PATCH"
        && r.body.body.field === "value";
});

await selfTest("DELETE: basic", async () => {
    const client = CTGAPIClient.init(BASE_URL);
    const r = await client.DELETE("/echo");
    return r.body.method === "DELETE";
});

await selfTest("DELETE: with query params", async () => {
    const client = CTGAPIClient.init(BASE_URL);
    const r = await client.DELETE("/echo", { id: "42" });
    return r.body.params.id === "42";
});

// ══════════════════════════════════════════════════════════════
// Response Structure
// ══════════════════════════════════════════════════════════════

await selfTest("response: has all required keys", async () => {
    const client = CTGAPIClient.init(BASE_URL);
    const r = await client.GET("/echo");
    return "status" in r
        && "ok" in r
        && "headers" in r
        && "body" in r
        && typeof r.status === "number"
        && typeof r.ok === "boolean"
        && typeof r.headers === "object";
});

// ── Status Codes ─────────────────────────────────────────────

await selfTest("status: 200 is ok", async () => {
    const client = CTGAPIClient.init(BASE_URL);
    const r = await client.GET("/status", { code: "200" });
    return r.status === 200 && r.ok === true;
});

await selfTest("status: 201 is ok", async () => {
    const client = CTGAPIClient.init(BASE_URL);
    const r = await client.GET("/status", { code: "201" });
    return r.status === 201 && r.ok === true;
});

await selfTest("status: 400 is not ok", async () => {
    const client = CTGAPIClient.init(BASE_URL);
    const r = await client.GET("/status", { code: "400" });
    return r.status === 400 && r.ok === false;
});

await selfTest("status: 401 is not ok", async () => {
    const client = CTGAPIClient.init(BASE_URL);
    const r = await client.GET("/status", { code: "401" });
    return r.status === 401 && r.ok === false;
});

await selfTest("status: 404 is not ok", async () => {
    const client = CTGAPIClient.init(BASE_URL);
    const r = await client.GET("/status", { code: "404" });
    return r.status === 404 && r.ok === false;
});

await selfTest("status: 500 is not ok", async () => {
    const client = CTGAPIClient.init(BASE_URL);
    const r = await client.GET("/status", { code: "500" });
    return r.status === 500 && r.ok === false;
});

await selfTest("status: 301 is not ok (redirect not followed)", async () => {
    const client = CTGAPIClient.init(BASE_URL);
    const r = await client.GET("/redirect");
    return r.status === 302
        && r.ok === false
        && r.headers["location"] !== undefined;
});

// ── Response Body Parsing ────────────────────────────────────

await selfTest("response: JSON body parsed", async () => {
    const client = CTGAPIClient.init(BASE_URL);
    const r = await client.GET("/json");
    return typeof r.body === "object" && r.body !== null;
});

await selfTest("response: non-JSON body returns raw string", async () => {
    const client = CTGAPIClient.init(BASE_URL);
    const r = await client.GET("/redirect");
    // redirect returns text/plain "redirecting"
    return typeof r.body === "string" && r.body === "redirecting";
});

await selfTest("response: empty body returns empty string", async () => {
    const client = CTGAPIClient.init(BASE_URL);
    const r = await client.GET("/status", { code: "204" });
    return r.body === "";
});

// ── Response Header Parsing ──────────────────────────────────

await selfTest("response: headers are lowercase keyed", async () => {
    const client = CTGAPIClient.init(BASE_URL);
    const r = await client.GET("/echo");
    return "content-type" in r.headers;
});

await selfTest("response: duplicate headers comma-joined", async () => {
    const client = CTGAPIClient.init(BASE_URL);
    const r = await client.GET("/headers");
    return typeof r.headers["x-duplicate"] === "string"
        && r.headers["x-duplicate"].includes("value1")
        && r.headers["x-duplicate"].includes("value2");
});

await selfTest("response: set-cookie collected as array", async () => {
    const client = CTGAPIClient.init(BASE_URL);
    const r = await client.GET("/headers");
    return Array.isArray(r.headers["set-cookie"])
        && r.headers["set-cookie"].length === 2
        && r.headers["set-cookie"][0].includes("session=abc")
        && r.headers["set-cookie"][1].includes("theme=dark");
});

// ══════════════════════════════════════════════════════════════
// Authentication
// ══════════════════════════════════════════════════════════════

await selfTest("auth: no token returns 401", async () => {
    const client = CTGAPIClient.init(BASE_URL);
    const r = await client.GET("/auth");
    return r.status === 401;
});

await selfTest("auth: wrong token returns 403", async () => {
    const client = CTGAPIClient.init(BASE_URL).setToken("wrong-token");
    const r = await client.GET("/auth");
    return r.status === 403;
});

await selfTest("auth: valid token returns 200", async () => {
    const client = CTGAPIClient.init(BASE_URL).setToken("test-jwt-token-12345");
    const r = await client.GET("/auth");
    return r.status === 200
        && r.body.authenticated === true;
});

await selfTest("auth: token persists across requests", async () => {
    const client = CTGAPIClient.init(BASE_URL).setToken("test-jwt-token-12345");
    const r1 = await client.GET("/auth");
    const r2 = await client.GET("/auth");
    return r1.status === 200 && r2.status === 200;
});

await selfTest("auth: clearToken removes auth", async () => {
    const client = CTGAPIClient.init(BASE_URL).setToken("test-jwt-token-12345");
    const r1 = await client.GET("/auth");
    client.clearToken();
    const r2 = await client.GET("/auth");
    return r1.status === 200 && r2.status === 401;
});

await selfTest("auth: getToken returns current token", async () => {
    const client = CTGAPIClient.init(BASE_URL);
    const before = client.getToken();
    client.setToken("abc");
    const during = client.getToken();
    client.clearToken();
    const after = client.getToken();
    return before === null && during === "abc" && after === null;
});

await selfTest("auth: token sent with POST", async () => {
    const client = CTGAPIClient.init(BASE_URL).setToken("test-jwt-token-12345");
    const r = await client.POST("/auth", { data: "test" });
    return r.status === 200 && r.body.authenticated === true;
});

await selfTest("auth: per-request Authorization overrides token", async () => {
    const client = CTGAPIClient.init(BASE_URL).setToken("test-jwt-token-12345");
    const r = await client.GET("/echo", {}, { "Authorization": "Basic xyz" });
    return r.body.headers["authorization"] === "Basic xyz";
});

// ══════════════════════════════════════════════════════════════
// Header Management
// ══════════════════════════════════════════════════════════════

await selfTest("headers: setHeader sends custom header", async () => {
    const client = CTGAPIClient.init(BASE_URL).setHeader("X-Custom", "test-value");
    const r = await client.GET("/echo");
    return r.body.headers["x-custom"] === "test-value";
});

await selfTest("headers: setHeaders sends multiple", async () => {
    const client = CTGAPIClient.init(BASE_URL).setHeaders({
        "X-First": "one",
        "X-Second": "two"
    });
    const r = await client.GET("/echo");
    return r.body.headers["x-first"] === "one"
        && r.body.headers["x-second"] === "two";
});

await selfTest("headers: removeHeader removes header", async () => {
    const client = CTGAPIClient.init(BASE_URL)
        .setHeader("X-Remove-Me", "present")
        .removeHeader("X-Remove-Me");
    const r = await client.GET("/echo");
    return r.body.headers["x-remove-me"] === undefined;
});

await selfTest("headers: case-insensitive overwrite", async () => {
    const client = CTGAPIClient.init(BASE_URL)
        .setHeader("X-Custom", "first")
        .setHeader("x-custom", "second");
    const r = await client.GET("/echo");
    return r.body.headers["x-custom"] === "second";
});

await selfTest("headers: case-insensitive remove", async () => {
    const client = CTGAPIClient.init(BASE_URL)
        .setHeader("X-Custom", "value")
        .removeHeader("x-custom");
    const r = await client.GET("/echo");
    return r.body.headers["x-custom"] === undefined;
});

await selfTest("headers: default Authorization overrides automatic token", async () => {
    const client = CTGAPIClient.init(BASE_URL)
        .setToken("test-jwt-token-12345")
        .setHeader("Authorization", "Basic xyz");
    const r = await client.GET("/echo");
    return r.body.headers["authorization"] === "Basic xyz";
});

// ── Per-Request Header Merge ─────────────────────────────────

await selfTest("per-request headers: override default for one call", async () => {
    const client = CTGAPIClient.init(BASE_URL).setHeader("X-Default", "default");
    const r1 = await client.GET("/echo", {}, { "X-Default": "override" });
    const r2 = await client.GET("/echo");
    return r1.body.headers["x-default"] === "override"
        && r2.body.headers["x-default"] === "default";
});

await selfTest("per-request headers: supplement defaults", async () => {
    const client = CTGAPIClient.init(BASE_URL).setHeader("X-Default", "keep");
    const r = await client.GET("/echo", {}, { "X-Extra": "added" });
    return r.body.headers["x-default"] === "keep"
        && r.body.headers["x-extra"] === "added";
});

await selfTest("per-request headers: do not persist", async () => {
    const client = CTGAPIClient.init(BASE_URL);
    await client.GET("/echo", {}, { "X-Temp": "once" });
    const r = await client.GET("/echo");
    return r.body.headers["x-temp"] === undefined;
});

// ══════════════════════════════════════════════════════════════
// File Upload
// ══════════════════════════════════════════════════════════════

await selfTest("upload: file via path", async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), "ctg-test-"));
    const filePath = join(tmpDir, "test.txt");
    writeFileSync(filePath, "hello world");
    try {
        const client = CTGAPIClient.init(BASE_URL);
        const r = await client.upload("/upload", filePath);
        return r.status === 200
            && r.body.files.file !== undefined
            && r.body.files.file.name === "test.txt"
            && r.body.files.file.size > 0;
    } finally {
        unlinkSync(filePath);
    }
});

await selfTest("upload: custom field name", async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), "ctg-test-"));
    const filePath = join(tmpDir, "photo.jpg");
    writeFileSync(filePath, "fake image data");
    try {
        const client = CTGAPIClient.init(BASE_URL);
        const r = await client.upload("/upload", filePath, {}, "avatar");
        return r.status === 200
            && r.body.files.avatar !== undefined
            && r.body.files.avatar.name === "photo.jpg";
    } finally {
        unlinkSync(filePath);
    }
});

await selfTest("upload: with additional fields", async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), "ctg-test-"));
    const filePath = join(tmpDir, "doc.pdf");
    writeFileSync(filePath, "pdf content");
    try {
        const client = CTGAPIClient.init(BASE_URL);
        const r = await client.upload("/upload", filePath, { title: "My Doc", category: "reports" });
        return r.status === 200
            && r.body.files.file !== undefined
            && r.body.fields.title === "My Doc"
            && r.body.fields.category === "reports";
    } finally {
        unlinkSync(filePath);
    }
});

await selfTest("upload: Buffer source", async () => {
    const client = CTGAPIClient.init(BASE_URL);
    const r = await client.upload("/upload", Buffer.from("buffer content"));
    return r.status === 200
        && r.body.files.file !== undefined
        && r.body.files.file.size > 0;
});

await selfTest("upload: missing file throws REQUEST_FAILED", async () => {
    try {
        const client = CTGAPIClient.init(BASE_URL);
        await client.upload("/upload", "/nonexistent/file.txt");
        return "no throw";
    } catch (e) {
        return e instanceof CTGAPIClientError && e.type === "REQUEST_FAILED";
    }
});

await selfTest("upload: cancellation via opts.signal", async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), "ctg-test-"));
    const filePath = join(tmpDir, "cancel.txt");
    writeFileSync(filePath, "cancel me");
    const controller = new AbortController();
    controller.abort(); // pre-aborted
    try {
        const client = CTGAPIClient.init(BASE_URL);
        await client.upload("/upload", filePath, {}, "file", { signal: controller.signal });
        return "no throw";
    } catch (e) {
        return e instanceof CTGAPIClientError && e.type === "REQUEST_FAILED";
    } finally {
        unlinkSync(filePath);
    }
});

// ══════════════════════════════════════════════════════════════
// URL Normalization
// ══════════════════════════════════════════════════════════════

await selfTest("URL: trailing slash on base, leading slash on path", async () => {
    const client = CTGAPIClient.init(BASE_URL + "/");
    const r = await client.GET("/echo");
    return r.status === 200;
});

await selfTest("URL: no leading slash on path", async () => {
    const client = CTGAPIClient.init(BASE_URL);
    const r = await client.GET("echo");
    return r.status === 200;
});

// ══════════════════════════════════════════════════════════════
// Transport Errors
// ══════════════════════════════════════════════════════════════

await selfTest("error: connection refused", async () => {
    try {
        const client = CTGAPIClient.init("http://127.0.0.1:19999");
        await client.GET("/anything");
        return "no throw";
    } catch (e) {
        return e instanceof CTGAPIClientError && e.type === "CONNECTION_FAILED";
    }
});

await selfTest("error: connection refused via static request", async () => {
    try {
        await CTGAPIClient.request("GET", "http://127.0.0.1:19999/anything");
        return "no throw";
    } catch (e) {
        return e instanceof CTGAPIClientError && e.type === "CONNECTION_FAILED";
    }
});

await selfTest("error: DNS failure", async () => {
    try {
        await CTGAPIClient.request("GET", "http://this-host-does-not-exist-ctg.invalid/path");
        return "no throw";
    } catch (e) {
        return e instanceof CTGAPIClientError
            && (e.type === "DNS_FAILED" || e.type === "CONNECTION_FAILED");
    }
});

await selfTest("error: timeout", async () => {
    try {
        const client = CTGAPIClient.init(BASE_URL, { timeout: 0.1 });
        await client.GET("/slow", { delay: "5000" });
        return "no throw";
    } catch (e) {
        return e instanceof CTGAPIClientError && e.type === "TIMEOUT";
    }
});

// ── Transport Error Data ─────────────────────────────────────

await selfTest("transport error: data contains url and method", async () => {
    try {
        await CTGAPIClient.request("GET", "http://127.0.0.1:19999/path");
        return "no throw";
    } catch (e) {
        return e instanceof CTGAPIClientError
            && e.data !== null
            && typeof e.data.url === "string"
            && typeof e.data.method === "string";
    }
});

await selfTest("transport error: data does not contain auth headers", async () => {
    try {
        await CTGAPIClient.request("GET", "http://127.0.0.1:19999/path", {}, {}, {
            "Authorization": "Bearer secret",
            "Cookie": "session=abc"
        });
        return "no throw";
    } catch (e) {
        const dataStr = JSON.stringify(e.data);
        return !dataStr.includes("secret") && !dataStr.includes("session=abc");
    }
});

// ══════════════════════════════════════════════════════════════
// HTTP_ERROR (Caller-Initiated)
// ══════════════════════════════════════════════════════════════

await selfTest("HTTP_ERROR: caller throws on non-ok response", async () => {
    const client = CTGAPIClient.init(BASE_URL);
    const r = await client.GET("/status", { code: "404" });
    try {
        if (!r.ok) {
            throw new CTGAPIClientError("HTTP_ERROR", `Status: ${r.status}`, r);
        }
        return "no throw";
    } catch (e) {
        return e instanceof CTGAPIClientError
            && e.type === "HTTP_ERROR"
            && e.data.status === 404;
    }
});

await selfTest("HTTP_ERROR: chainable with transport errors", async () => {
    let httpHandled = false;
    const client = CTGAPIClient.init(BASE_URL);
    const r = await client.GET("/status", { code: "404" });
    try {
        if (!r.ok) throw new CTGAPIClientError("HTTP_ERROR", `Status: ${r.status}`, r);
    } catch (e) {
        e.on("TIMEOUT", () => {})
         .on("HTTP_ERROR", () => { httpHandled = true; })
         .otherwise(() => {});
    }
    return httpHandled;
});

// ══════════════════════════════════════════════════════════════
// SSRF Allowlist
// ══════════════════════════════════════════════════════════════

await selfTest("ssrf: disallowed host throws INVALID_URL", async () => {
    try {
        const client = CTGAPIClient.init(BASE_URL, { allowed_hosts: ["api.example.com"] });
        await client.GET("/echo");
        return "no throw";
    } catch (e) {
        return e instanceof CTGAPIClientError && e.type === "INVALID_URL";
    }
});

await selfTest("ssrf: disallowed scheme throws INVALID_URL", async () => {
    try {
        const client = CTGAPIClient.init(BASE_URL, { allowed_schemes: ["https"] });
        await client.GET("/echo");
        return "no throw";
    } catch (e) {
        return e instanceof CTGAPIClientError && e.type === "INVALID_URL";
    }
});

await selfTest("ssrf: allowed host succeeds", async () => {
    const client = CTGAPIClient.init(BASE_URL, { allowed_hosts: ["127.0.0.1"] });
    const r = await client.GET("/echo");
    return r.status === 200;
});

// ══════════════════════════════════════════════════════════════
// Max Response Bytes
// ══════════════════════════════════════════════════════════════

await selfTest("max response: exceeds limit throws REQUEST_FAILED", async () => {
    try {
        const client = CTGAPIClient.init(BASE_URL, { max_response_bytes: 1 });
        await client.GET("/large", { size: "1024" });
        return "no throw";
    } catch (e) {
        return e instanceof CTGAPIClientError && e.type === "REQUEST_FAILED";
    }
});

await selfTest("max response: under limit succeeds", async () => {
    const client = CTGAPIClient.init(BASE_URL, { max_response_bytes: 1048576 });
    const r = await client.GET("/large", { size: "100" });
    return r.status === 200;
});

// ══════════════════════════════════════════════════════════════
// Redirect Policy
// ══════════════════════════════════════════════════════════════

await selfTest("redirect: 302 not followed, Location header present", async () => {
    const client = CTGAPIClient.init(BASE_URL);
    const r = await client.GET("/redirect");
    return r.status === 302
        && r.ok === false
        && typeof r.headers["location"] === "string";
});

// ══════════════════════════════════════════════════════════════
// Caller Cancellation
// ══════════════════════════════════════════════════════════════

await selfTest("cancellation: AbortSignal cancels request", async () => {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 50);
    try {
        const client = CTGAPIClient.init(BASE_URL);
        await client.GET("/slow", { delay: "5000" }, {}, { signal: controller.signal });
        return "no throw";
    } catch (e) {
        return e instanceof CTGAPIClientError && e.type === "REQUEST_FAILED";
    }
});

await selfTest("cancellation: pre-aborted signal fails immediately", async () => {
    const controller = new AbortController();
    controller.abort();
    try {
        const client = CTGAPIClient.init(BASE_URL);
        await client.GET("/echo", {}, {}, { signal: controller.signal });
        return "no throw";
    } catch (e) {
        return e instanceof CTGAPIClientError && e.type === "REQUEST_FAILED";
    }
});

await selfTest("cancellation: static request with signal", async () => {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 50);
    try {
        await CTGAPIClient.request("GET", `${BASE_URL}/slow?delay=5000`, {}, {}, {}, 30, {
            signal: controller.signal
        });
        return "no throw";
    } catch (e) {
        return e instanceof CTGAPIClientError && e.type === "REQUEST_FAILED";
    }
});

await selfTest("cancellation: timeout fires before caller abort → TIMEOUT", async () => {
    // Timeout at 50ms, caller abort at 200ms — timeout should win
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 200);
    try {
        await CTGAPIClient.request("GET", `${BASE_URL}/slow?delay=5000`, {}, {}, {}, 0.05, {
            signal: controller.signal
        });
        return "no throw";
    } catch (e) {
        return e instanceof CTGAPIClientError && e.type === "TIMEOUT";
    }
});

await selfTest("cancellation: caller abort fires before timeout → REQUEST_FAILED", async () => {
    // Caller abort at 50ms, timeout at 30s — caller should win
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 50);
    try {
        await CTGAPIClient.request("GET", `${BASE_URL}/slow?delay=5000`, {}, {}, {}, 30, {
            signal: controller.signal
        });
        return "no throw";
    } catch (e) {
        return e instanceof CTGAPIClientError && e.type === "REQUEST_FAILED";
    }
});

// ══════════════════════════════════════════════════════════════
// Content-Type Behavior
// ══════════════════════════════════════════════════════════════

await selfTest("content-type: multipart body skips auto Content-Type", async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), "ctg-test-"));
    const filePath = join(tmpDir, "test.txt");
    writeFileSync(filePath, "file data");
    try {
        const client = CTGAPIClient.init(BASE_URL);
        const r = await client.upload("/echo", filePath);
        // Content-Type should be multipart/form-data with boundary, not application/json
        return r.body.headers["content-type"].includes("multipart/form-data");
    } finally {
        unlinkSync(filePath);
    }
});

// ══════════════════════════════════════════════════════════════
// Meta-Tests: CTGTest pipelines testing CTGAPIClient
// ══════════════════════════════════════════════════════════════

process.stdout.write("\n");
if (!allPassed) {
    process.stdout.write("Some tests FAILED.\n");
    await stopServer(testServer);
    process.exit(1);
}
process.stdout.write("All bootstrap tests passed.\n");

process.stdout.write("\n=== ctg-js-api-client Meta-Tests ===\n\n");

let metaPassed = true;
let metaTotal = 0;
let metaFailed = 0;

// :: STRING, ctgTest, *, STRING? -> PROMISE(VOID)
async function metaTest(label, test, subject, expectStatus = "pass") {
    metaTotal++;
    try {
        const r = await test.start(subject, { output: "return-json" });
        if (typeof r !== "object" || r === null) {
            process.stdout.write(`  FAIL  ${label}\n`);
            metaPassed = false;
            metaFailed++;
            return;
        }
        if (r.status === expectStatus) {
            process.stdout.write(`  PASS  ${label}\n`);
        } else {
            process.stdout.write(`  FAIL  ${label}\n`);
            process.stdout.write(`        expected status '${expectStatus}', got '${r.status}'\n`);
            for (const step of r.steps) {
                if (step.status !== "pass") {
                    process.stdout.write(`        step '${step.name}': ${step.message}\n`);
                }
            }
            metaPassed = false;
            metaFailed++;
        }
    } catch (e) {
        process.stdout.write(`  ERROR ${label}\n`);
        process.stdout.write(`        ${e.constructor.name}: ${e.message}\n`);
        metaPassed = false;
        metaFailed++;
    }
}

// ── Meta: GET → assert response shape ────────────────────────

await metaTest(
    "meta: GET returns valid response structure",
    CTGTest.init("meta GET shape")
        .stage("fetch", async () => {
            const client = CTGAPIClient.init(BASE_URL);
            return client.GET("/echo");
        })
        .assert("has status", (r) => typeof r.status, "number")
        .assert("has ok", (r) => typeof r.ok, "boolean")
        .assert("has headers", (r) => typeof r.headers, "object")
        .assert("has body", (r) => "body" in r, true),
    null
);

// ── Meta: POST → body echoed ─────────────────────────────────

await metaTest(
    "meta: POST sends and receives JSON body",
    CTGTest.init("meta POST body")
        .stage("post", async () => {
            const client = CTGAPIClient.init(BASE_URL);
            return client.POST("/echo", { name: "meta-test", value: 42 });
        })
        .assert("body name", (r) => r.body.body.name, "meta-test")
        .assert("body value", (r) => r.body.body.value, 42),
    null
);

// ── Meta: Token flow ─────────────────────────────────────────

await metaTest(
    "meta: auth token lifecycle",
    CTGTest.init("meta auth flow")
        .stage("create client", () => CTGAPIClient.init(BASE_URL))
        .assert("no token initially", (c) => c.getToken(), null)
        .stage("set token", (c) => { c.setToken("test-jwt-token-12345"); return c; })
        .assert("token set", (c) => c.getToken(), "test-jwt-token-12345")
        .stage("authenticate", async (c) => {
            const r = await c.GET("/auth");
            return { client: c, response: r };
        })
        .assert("auth succeeded", (ctx) => ctx.response.status, 200)
        .stage("clear token", (ctx) => { ctx.client.clearToken(); return ctx.client; })
        .assert("token cleared", (c) => c.getToken(), null),
    null
);

// ── Meta: Error handling ─────────────────────────────────────

await metaTest(
    "meta: error on/otherwise pattern",
    CTGTest.init("meta error chain")
        .stage("create error", () => new CTGAPIClientError("TIMEOUT", "timed out"))
        .stage("handle error", (e) => {
            let result = "unhandled";
            e.on("DNS_FAILED", () => { result = "dns"; })
             .on("TIMEOUT", () => { result = "timeout"; })
             .otherwise(() => { result = "other"; });
            return result;
        })
        .assert("correct handler fired", (result) => result, "timeout"),
    null
);

// ── Meta Summary ─────────────────────────────────────────────

const metaPassedCount = metaTotal - metaFailed;
process.stdout.write("\n");
process.stdout.write(`Meta-tests: ${metaPassedCount}/${metaTotal} passed.\n`);

if (!metaPassed) {
    process.stdout.write("Some meta-tests FAILED.\n");
    await stopServer(testServer);
    process.exit(1);
}
process.stdout.write("All meta-tests passed.\n");

// ── Final Summary ────────────────────────────────────────────

process.stdout.write("\n=== All tests passed (bootstrap + meta) ===\n");
await stopServer(testServer);
process.exit(0);
