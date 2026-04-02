// Self-tests for ctg-js-api-client — error class + HTTP client
//
// Uses ctg-js-test pipelines for all tests.
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

// ── Config ───────────────────────────────────────────────────

const config = { output: "console", timeout: 0 };

// ══════════════════════════════════════════════════════════════
// CTGAPIClientError — Construction
// ══════════════════════════════════════════════════════════════

await CTGTest.init("construct with type name")
    .stage("create", () => new CTGAPIClientError("TIMEOUT", "timed out", { url: "/test" }))
    .assert("code is 1001", (e) => e.code, 1001)
    .assert("type is TIMEOUT", (e) => e.type, "TIMEOUT")
    .assert("msg is set", (e) => e.msg, "timed out")
    .assert("data url", (e) => e.data.url, "/test")
    .assert("name is CTGAPIClientError", (e) => e.name, "CTGAPIClientError")
    .assert("is Error instance", (e) => e instanceof Error, true)
    .start(null, config);

await CTGTest.init("construct with integer code")
    .stage("create", () => new CTGAPIClientError(1000, "refused"))
    .assert("type is CONNECTION_FAILED", (e) => e.type, "CONNECTION_FAILED")
    .assert("code is 1000", (e) => e.code, 1000)
    .assert("msg is refused", (e) => e.msg, "refused")
    .start(null, config);

await CTGTest.init("construct defaults msg to type name")
    .stage("create", () => new CTGAPIClientError("DNS_FAILED"))
    .assert("msg is type name", (e) => e.msg, "DNS_FAILED")
    .assert("data is null", (e) => e.data, null)
    .start(null, config);

await CTGTest.init("construct unknown type throws TypeError")
    .stage("attempt", () => {
        try { new CTGAPIClientError("BOGUS"); return "no throw"; }
        catch (e) { return e instanceof TypeError ? "threw TypeError" : "wrong error"; }
    })
    .assert("threw", (r) => r, "threw TypeError")
    .start(null, config);

await CTGTest.init("construct unknown code throws TypeError")
    .stage("attempt", () => {
        try { new CTGAPIClientError(9999); return "no throw"; }
        catch (e) { return e instanceof TypeError ? "threw TypeError" : "wrong error"; }
    })
    .assert("threw", (r) => r, "threw TypeError")
    .start(null, config);

// ══════════════════════════════════════════════════════════════
// CTGAPIClientError — Lookup
// ══════════════════════════════════════════════════════════════

await CTGTest.init("lookup name to code")
    .assert("TIMEOUT -> 1001", () => CTGAPIClientError.lookup("TIMEOUT"), 1001)
    .start(null, config);

await CTGTest.init("lookup code to name")
    .assert("1001 -> TIMEOUT", () => CTGAPIClientError.lookup(1001), "TIMEOUT")
    .start(null, config);

await CTGTest.init("lookup unknown string returns null")
    .assert("returns null", () => CTGAPIClientError.lookup("BOGUS"), null)
    .start(null, config);

await CTGTest.init("lookup unknown integer returns null")
    .assert("returns null", () => CTGAPIClientError.lookup(9999), null)
    .start(null, config);

await CTGTest.init("lookup all error codes")
    .stage("collect", () => [
        CTGAPIClientError.lookup("CONNECTION_FAILED"),
        CTGAPIClientError.lookup("TIMEOUT"),
        CTGAPIClientError.lookup("DNS_FAILED"),
        CTGAPIClientError.lookup("SSL_ERROR"),
        CTGAPIClientError.lookup("REQUEST_FAILED"),
        CTGAPIClientError.lookup("INVALID_URL"),
        CTGAPIClientError.lookup("INVALID_METHOD"),
        CTGAPIClientError.lookup("INVALID_BODY"),
        CTGAPIClientError.lookup("INVALID_HEADER"),
        CTGAPIClientError.lookup("HTTP_ERROR"),
    ])
    .assert("all codes correct", (r) => JSON.stringify(r),
        JSON.stringify([1000, 1001, 1002, 1003, 2000, 3000, 3001, 3002, 3003, 4000]))
    .start(null, config);

// ══════════════════════════════════════════════════════════════
// CTGAPIClientError — on/otherwise
// ══════════════════════════════════════════════════════════════

await CTGTest.init("on matches type name")
    .stage("handle", () => {
        let matched = false;
        new CTGAPIClientError("TIMEOUT").on("TIMEOUT", () => { matched = true; });
        return matched;
    })
    .assert("handler called", (r) => r, true)
    .start(null, config);

await CTGTest.init("on matches by integer code")
    .stage("handle", () => {
        let matched = false;
        new CTGAPIClientError("TIMEOUT").on(1001, () => { matched = true; });
        return matched;
    })
    .assert("handler called", (r) => r, true)
    .start(null, config);

await CTGTest.init("on short circuits after first match")
    .stage("handle", () => {
        let first = false, second = false;
        new CTGAPIClientError("TIMEOUT")
            .on("TIMEOUT", () => { first = true; })
            .on("TIMEOUT", () => { second = true; });
        return { first, second };
    })
    .assert("first called", (r) => r.first, true)
    .assert("second not called", (r) => r.second, false)
    .start(null, config);

await CTGTest.init("on skips non-matching type")
    .stage("handle", () => {
        let matched = false;
        new CTGAPIClientError("TIMEOUT").on("DNS_FAILED", () => { matched = true; });
        return matched;
    })
    .assert("handler not called", (r) => r, false)
    .start(null, config);

await CTGTest.init("on returns self for chaining")
    .stage("check", () => {
        const e = new CTGAPIClientError("TIMEOUT");
        return e.on("DNS_FAILED", () => {}) === e;
    })
    .assert("returns self", (r) => r, true)
    .start(null, config);

await CTGTest.init("otherwise called when no on matched")
    .stage("handle", () => {
        let called = false;
        new CTGAPIClientError("TIMEOUT")
            .on("DNS_FAILED", () => {})
            .otherwise(() => { called = true; });
        return called;
    })
    .assert("otherwise called", (r) => r, true)
    .start(null, config);

await CTGTest.init("otherwise not called when on matched")
    .stage("handle", () => {
        let called = false;
        new CTGAPIClientError("TIMEOUT")
            .on("TIMEOUT", () => {})
            .otherwise(() => { called = true; });
        return called;
    })
    .assert("otherwise not called", (r) => r, false)
    .start(null, config);

await CTGTest.init("on unknown string type throws TypeError")
    .stage("attempt", () => {
        try {
            new CTGAPIClientError("TIMEOUT").on("NONEXISTENT", () => {});
            return "no throw";
        } catch (e) { return e instanceof TypeError ? "threw" : "wrong error"; }
    })
    .assert("threw", (r) => r, "threw")
    .start(null, config);

await CTGTest.init("on unknown integer code throws TypeError")
    .stage("attempt", () => {
        try {
            new CTGAPIClientError("TIMEOUT").on(99999, () => {});
            return "no throw";
        } catch (e) { return e instanceof TypeError ? "threw" : "wrong error"; }
    })
    .assert("threw", (r) => r, "threw")
    .start(null, config);

// ══════════════════════════════════════════════════════════════
// CTGAPIClientError — HTTP_ERROR Pattern
// ══════════════════════════════════════════════════════════════

await CTGTest.init("HTTP_ERROR construct with response data")
    .stage("create", () => new CTGAPIClientError("HTTP_ERROR", "Status: 404", {
        status: 404, ok: false, body: { error: "Not found" }
    }))
    .assert("type", (e) => e.type, "HTTP_ERROR")
    .assert("code", (e) => e.code, 4000)
    .assert("data status", (e) => e.data.status, 404)
    .assert("data ok", (e) => e.data.ok, false)
    .start(null, config);

await CTGTest.init("HTTP_ERROR chainable with transport errors")
    .stage("handle", () => {
        let result = "unhandled";
        new CTGAPIClientError("HTTP_ERROR", "404", { status: 404 })
            .on("TIMEOUT", () => { result = "timeout"; })
            .on("HTTP_ERROR", () => { result = "http_error"; })
            .otherwise(() => { result = "other"; });
        return result;
    })
    .assert("http handler fired", (r) => r, "http_error")
    .start(null, config);

// ══════════════════════════════════════════════════════════════
// CTGAPIClient — Construction
// ══════════════════════════════════════════════════════════════

await CTGTest.init("init static factory")
    .stage("create", () => CTGAPIClient.init(BASE_URL))
    .assert("returns instance", (c) => c instanceof CTGAPIClient, true)
    .start(null, config);

await CTGTest.init("init with config")
    .stage("create", () => CTGAPIClient.init(BASE_URL, { timeout: 5, headers: { "X-Custom": "value" } }))
    .assert("timeout set", (c) => c.timeout, 5)
    .start(null, config);

await CTGTest.init("init strips trailing slash")
    .stage("create", () => CTGAPIClient.init(BASE_URL + "/"))
    .assert("no trailing slash", (c) => c.baseUrl, BASE_URL)
    .start(null, config);

// ── Timeout Validation ───────────────────────────────────────

await CTGTest.init("timeout zero throws TypeError")
    .stage("attempt", () => {
        try { CTGAPIClient.init(BASE_URL, { timeout: 0 }); return "no throw"; }
        catch (e) { return e instanceof TypeError ? "threw" : "wrong error"; }
    })
    .assert("threw", (r) => r, "threw")
    .start(null, config);

await CTGTest.init("timeout negative throws TypeError")
    .stage("attempt", () => {
        try { CTGAPIClient.init(BASE_URL, { timeout: -1 }); return "no throw"; }
        catch (e) { return e instanceof TypeError ? "threw" : "wrong error"; }
    })
    .assert("threw", (r) => r, "threw")
    .start(null, config);

await CTGTest.init("timeout non-number throws TypeError")
    .stage("attempt", () => {
        try { CTGAPIClient.init(BASE_URL, { timeout: "fast" }); return "no throw"; }
        catch (e) { return e instanceof TypeError ? "threw" : "wrong error"; }
    })
    .assert("threw", (r) => r, "threw")
    .start(null, config);

await CTGTest.init("timeout NaN throws TypeError")
    .stage("attempt", () => {
        try { CTGAPIClient.init(BASE_URL, { timeout: NaN }); return "no throw"; }
        catch (e) { return e instanceof TypeError ? "threw" : "wrong error"; }
    })
    .assert("threw", (r) => r, "threw")
    .start(null, config);

await CTGTest.init("timeout Infinity throws TypeError")
    .stage("attempt", () => {
        try { CTGAPIClient.init(BASE_URL, { timeout: Infinity }); return "no throw"; }
        catch (e) { return e instanceof TypeError ? "threw" : "wrong error"; }
    })
    .assert("threw", (r) => r, "threw")
    .start(null, config);

await CTGTest.init("timeout float accepted")
    .stage("create", () => CTGAPIClient.init(BASE_URL, { timeout: 1.5 }))
    .assert("timeout preserved", (c) => c.timeout, 1.5)
    .start(null, config);

await CTGTest.init("static request timeout zero throws TypeError")
    .stage("attempt", async () => {
        try { await CTGAPIClient.request("GET", `${BASE_URL}/echo`, {}, {}, {}, 0); return "no throw"; }
        catch (e) { return e instanceof TypeError ? "threw" : "wrong error"; }
    })
    .assert("threw", (r) => r, "threw")
    .start(null, config);

await CTGTest.init("static request timeout negative throws TypeError")
    .stage("attempt", async () => {
        try { await CTGAPIClient.request("GET", `${BASE_URL}/echo`, {}, {}, {}, -5); return "no throw"; }
        catch (e) { return e instanceof TypeError ? "threw" : "wrong error"; }
    })
    .assert("threw", (r) => r, "threw")
    .start(null, config);

await CTGTest.init("static request timeout non-number throws TypeError")
    .stage("attempt", async () => {
        try { await CTGAPIClient.request("GET", `${BASE_URL}/echo`, {}, {}, {}, "fast"); return "no throw"; }
        catch (e) { return e instanceof TypeError ? "threw" : "wrong error"; }
    })
    .assert("threw", (r) => r, "threw")
    .start(null, config);

await CTGTest.init("static request timeout NaN throws TypeError")
    .stage("attempt", async () => {
        try { await CTGAPIClient.request("GET", `${BASE_URL}/echo`, {}, {}, {}, NaN); return "no throw"; }
        catch (e) { return e instanceof TypeError ? "threw" : "wrong error"; }
    })
    .assert("threw", (r) => r, "threw")
    .start(null, config);

await CTGTest.init("static request timeout Infinity throws TypeError")
    .stage("attempt", async () => {
        try { await CTGAPIClient.request("GET", `${BASE_URL}/echo`, {}, {}, {}, Infinity); return "no throw"; }
        catch (e) { return e instanceof TypeError ? "threw" : "wrong error"; }
    })
    .assert("threw", (r) => r, "threw")
    .start(null, config);

// ══════════════════════════════════════════════════════════════
// CTGAPIClient — Static request()
// ══════════════════════════════════════════════════════════════

await CTGTest.init("static request GET")
    .stage("execute", () => CTGAPIClient.request("GET", `${BASE_URL}/echo`))
    .assert("status 200", (r) => r.status, 200)
    .assert("ok true", (r) => r.ok, true)
    .assert("method GET", (r) => r.body.method, "GET")
    .start(null, config);

await CTGTest.init("static request POST with body")
    .stage("execute", () => CTGAPIClient.request("POST", `${BASE_URL}/echo`, { key: "value" }))
    .assert("method POST", (r) => r.body.method, "POST")
    .assert("body sent", (r) => r.body.body.key, "value")
    .start(null, config);

await CTGTest.init("static request with query params")
    .stage("execute", () => CTGAPIClient.request("GET", `${BASE_URL}/echo`, {}, { page: "1", limit: "10" }))
    .assert("page param", (r) => r.body.params.page, "1")
    .assert("limit param", (r) => r.body.params.limit, "10")
    .start(null, config);

await CTGTest.init("static request with headers")
    .stage("execute", () => CTGAPIClient.request("GET", `${BASE_URL}/echo`, {}, {}, { "X-Custom": "test" }))
    .assert("header sent", (r) => r.body.headers["x-custom"], "test")
    .start(null, config);

await CTGTest.init("static request case-insensitive method")
    .stage("execute", () => CTGAPIClient.request("post", `${BASE_URL}/echo`, { test: true }))
    .assert("method uppercased", (r) => r.body.method, "POST")
    .start(null, config);

await CTGTest.init("static request empty method throws INVALID_METHOD")
    .stage("attempt", async () => {
        try { await CTGAPIClient.request("", `${BASE_URL}/echo`); return "no throw"; }
        catch (e) { return e instanceof CTGAPIClientError && e.type === "INVALID_METHOD" ? "threw" : "wrong error"; }
    })
    .assert("threw", (r) => r, "threw")
    .start(null, config);

await CTGTest.init("static request invalid method throws INVALID_METHOD")
    .stage("attempt", async () => {
        try { await CTGAPIClient.request("BOGUS", `${BASE_URL}/echo`); return "no throw"; }
        catch (e) { return e instanceof CTGAPIClientError && e.type === "INVALID_METHOD" ? "threw" : "wrong error"; }
    })
    .assert("threw", (r) => r, "threw")
    .start(null, config);

await CTGTest.init("static request HEAD valid")
    .stage("execute", () => CTGAPIClient.request("HEAD", `${BASE_URL}/echo`))
    .assert("status 200", (r) => r.status, 200)
    .start(null, config);

await CTGTest.init("static request OPTIONS valid")
    .stage("execute", () => CTGAPIClient.request("OPTIONS", `${BASE_URL}/echo`))
    .assert("status 200", (r) => r.status, 200)
    .start(null, config);

await CTGTest.init("static request invalid header name throws INVALID_HEADER")
    .stage("attempt", async () => {
        try { await CTGAPIClient.request("GET", `${BASE_URL}/echo`, {}, {}, { "Bad Name": "value" }); return "no throw"; }
        catch (e) { return e instanceof CTGAPIClientError && e.type === "INVALID_HEADER" ? "threw" : "wrong error"; }
    })
    .assert("threw", (r) => r, "threw")
    .start(null, config);

await CTGTest.init("static request CRLF in header name throws INVALID_HEADER")
    .stage("attempt", async () => {
        try { await CTGAPIClient.request("GET", `${BASE_URL}/echo`, {}, {}, { "Name\r\n": "value" }); return "no throw"; }
        catch (e) { return e instanceof CTGAPIClientError && e.type === "INVALID_HEADER" ? "threw" : "wrong error"; }
    })
    .assert("threw", (r) => r, "threw")
    .start(null, config);

await CTGTest.init("static request CRLF stripped from header values")
    .stage("execute", () => CTGAPIClient.request("GET", `${BASE_URL}/echo`, {}, {}, {
        "X-Test": "safe\r\nX-Injected: evil"
    }))
    .assert("no injection", (r) => !r.body.headers["x-test"].includes("\n"), true)
    .start(null, config);

await CTGTest.init("static request Content-Type auto-set for JSON")
    .stage("execute", () => CTGAPIClient.request("POST", `${BASE_URL}/echo`, { data: "test" }))
    .assert("content-type json", (r) => r.body.headers["content-type"], "application/json")
    .start(null, config);

await CTGTest.init("static request explicit content-type not duplicated")
    .stage("execute", () => CTGAPIClient.request("POST", `${BASE_URL}/echo`, { data: "test" }, {}, {
        "content-type": "text/plain"
    }))
    .assert("caller content-type preserved", (r) => r.body.headers["content-type"], "text/plain")
    .start(null, config);

await CTGTest.init("static request default User-Agent sent")
    .stage("execute", () => CTGAPIClient.request("GET", `${BASE_URL}/echo`))
    .assert("has user-agent", (r) => r.body.headers["user-agent"].includes("CTGAPIClient"), true)
    .start(null, config);

await CTGTest.init("static request body ignored for GET")
    .stage("execute", () => CTGAPIClient.request("GET", `${BASE_URL}/echo`, { ignored: true }))
    .assert("no body sent", (r) => r.body.body === "" || r.body.body === null || r.body.body === undefined, true)
    .assert("no content-type", (r) => r.body.headers["content-type"] === undefined, true)
    .start(null, config);

await CTGTest.init("static request body ignored for DELETE")
    .stage("execute", () => CTGAPIClient.request("DELETE", `${BASE_URL}/echo`, { ignored: true }))
    .assert("no body sent", (r) => r.body.body === "" || r.body.body === null || r.body.body === undefined, true)
    .assert("no content-type", (r) => r.body.headers["content-type"] === undefined, true)
    .start(null, config);

await CTGTest.init("static request query params with existing ?")
    .stage("execute", () => CTGAPIClient.request("GET", `${BASE_URL}/echo?existing=1`, {}, { added: "2" }))
    .assert("existing param", (r) => r.body.params.existing, "1")
    .assert("added param", (r) => r.body.params.added, "2")
    .start(null, config);

await CTGTest.init("static request array param serialized as comma string")
    .stage("execute", () => CTGAPIClient.request("GET", `${BASE_URL}/echo`, {}, { tags: [1, 2, 3] }))
    .assert("array flattened", (r) => r.body.params.tags, "1,2,3")
    .start(null, config);

await CTGTest.init("static request nested object param serialized as string")
    .stage("execute", () => CTGAPIClient.request("GET", `${BASE_URL}/echo`, {}, { filter: { active: true } }))
    .assert("object stringified", (r) => r.body.params.filter, "[object Object]")
    .start(null, config);

// ══════════════════════════════════════════════════════════════
// CTGAPIClient — Instance HTTP Methods
// ══════════════════════════════════════════════════════════════

await CTGTest.init("GET basic")
    .stage("execute", () => CTGAPIClient.init(BASE_URL).GET("/echo"))
    .assert("status 200", (r) => r.status, 200)
    .assert("ok", (r) => r.ok, true)
    .assert("method", (r) => r.body.method, "GET")
    .start(null, config);

await CTGTest.init("GET with query params")
    .stage("execute", () => CTGAPIClient.init(BASE_URL).GET("/echo", { role: "admin", active: "true" }))
    .assert("role param", (r) => r.body.params.role, "admin")
    .assert("active param", (r) => r.body.params.active, "true")
    .start(null, config);

await CTGTest.init("GET with per-request headers")
    .stage("execute", () => CTGAPIClient.init(BASE_URL).GET("/echo", {}, { "X-Request-Only": "yes" }))
    .assert("header sent", (r) => r.body.headers["x-request-only"], "yes")
    .start(null, config);

await CTGTest.init("GET JSON endpoint")
    .stage("execute", () => CTGAPIClient.init(BASE_URL).GET("/json"))
    .assert("is array", (r) => Array.isArray(r.body.users), true)
    .assert("count", (r) => r.body.users.length, 3)
    .assert("first user", (r) => r.body.users[0].name, "Alice")
    .start(null, config);

await CTGTest.init("POST JSON body")
    .stage("execute", () => CTGAPIClient.init(BASE_URL).POST("/echo", { name: "test" }))
    .assert("method", (r) => r.body.method, "POST")
    .assert("body", (r) => r.body.body.name, "test")
    .start(null, config);

await CTGTest.init("POST with query params and body")
    .stage("execute", () => CTGAPIClient.init(BASE_URL).POST("/echo", { data: "x" }, { page: "2" }))
    .assert("body", (r) => r.body.body.data, "x")
    .assert("param", (r) => r.body.params.page, "2")
    .start(null, config);

await CTGTest.init("PUT JSON body")
    .stage("execute", () => CTGAPIClient.init(BASE_URL).PUT("/echo", { updated: true }))
    .assert("method", (r) => r.body.method, "PUT")
    .assert("body", (r) => r.body.body.updated, true)
    .start(null, config);

await CTGTest.init("PATCH JSON body")
    .stage("execute", () => CTGAPIClient.init(BASE_URL).PATCH("/echo", { field: "value" }))
    .assert("method", (r) => r.body.method, "PATCH")
    .assert("body", (r) => r.body.body.field, "value")
    .start(null, config);

await CTGTest.init("DELETE basic")
    .stage("execute", () => CTGAPIClient.init(BASE_URL).DELETE("/echo"))
    .assert("method", (r) => r.body.method, "DELETE")
    .start(null, config);

await CTGTest.init("DELETE with query params")
    .stage("execute", () => CTGAPIClient.init(BASE_URL).DELETE("/echo", { id: "42" }))
    .assert("param", (r) => r.body.params.id, "42")
    .start(null, config);

// ══════════════════════════════════════════════════════════════
// Response Structure
// ══════════════════════════════════════════════════════════════

await CTGTest.init("response has all required keys")
    .stage("execute", () => CTGAPIClient.init(BASE_URL).GET("/echo"))
    .assert("has status", (r) => typeof r.status, "number")
    .assert("has ok", (r) => typeof r.ok, "boolean")
    .assert("has headers", (r) => typeof r.headers, "object")
    .assert("has body", (r) => "body" in r, true)
    .start(null, config);

// ── Status Codes ─────────────────────────────────────────────

await CTGTest.init("status 200 ok")
    .stage("execute", () => CTGAPIClient.init(BASE_URL).GET("/status", { code: "200" }))
    .assert("status", (r) => r.status, 200)
    .assert("ok", (r) => r.ok, true)
    .start(null, config);

await CTGTest.init("status 201 ok")
    .stage("execute", () => CTGAPIClient.init(BASE_URL).GET("/status", { code: "201" }))
    .assert("status", (r) => r.status, 201)
    .assert("ok", (r) => r.ok, true)
    .start(null, config);

await CTGTest.init("status 400 not ok")
    .stage("execute", () => CTGAPIClient.init(BASE_URL).GET("/status", { code: "400" }))
    .assert("status", (r) => r.status, 400)
    .assert("not ok", (r) => r.ok, false)
    .start(null, config);

await CTGTest.init("status 404 not ok")
    .stage("execute", () => CTGAPIClient.init(BASE_URL).GET("/status", { code: "404" }))
    .assert("status", (r) => r.status, 404)
    .assert("not ok", (r) => r.ok, false)
    .start(null, config);

await CTGTest.init("status 500 not ok")
    .stage("execute", () => CTGAPIClient.init(BASE_URL).GET("/status", { code: "500" }))
    .assert("status", (r) => r.status, 500)
    .assert("not ok", (r) => r.ok, false)
    .start(null, config);

await CTGTest.init("status 302 not ok (redirect not followed)")
    .stage("execute", () => CTGAPIClient.init(BASE_URL).GET("/redirect"))
    .assert("status 302", (r) => r.status, 302)
    .assert("not ok", (r) => r.ok, false)
    .assert("location header", (r) => typeof r.headers["location"], "string")
    .start(null, config);

// ── Response Body Parsing ────────────────────────────────────

await CTGTest.init("response JSON body parsed")
    .stage("execute", () => CTGAPIClient.init(BASE_URL).GET("/json"))
    .assert("is object", (r) => typeof r.body, "object")
    .start(null, config);

await CTGTest.init("response non-JSON body returns raw string")
    .stage("execute", () => CTGAPIClient.init(BASE_URL).GET("/redirect"))
    .assert("is string", (r) => typeof r.body, "string")
    .assert("raw content", (r) => r.body, "redirecting")
    .start(null, config);

await CTGTest.init("response empty body returns empty string")
    .stage("execute", () => CTGAPIClient.init(BASE_URL).GET("/status", { code: "204" }))
    .assert("empty string", (r) => r.body, "")
    .start(null, config);

// ── Response Header Parsing ──────────────────────────────────

await CTGTest.init("response headers lowercase")
    .stage("execute", () => CTGAPIClient.init(BASE_URL).GET("/echo"))
    .assert("content-type lowercase", (r) => "content-type" in r.headers, true)
    .start(null, config);

await CTGTest.init("response duplicate headers comma-joined")
    .stage("execute", () => CTGAPIClient.init(BASE_URL).GET("/headers"))
    .assert("x-duplicate joined", (r) =>
        typeof r.headers["x-duplicate"] === "string"
        && r.headers["x-duplicate"].includes("value1")
        && r.headers["x-duplicate"].includes("value2"), true)
    .start(null, config);

await CTGTest.init("response set-cookie collected as array")
    .stage("execute", () => CTGAPIClient.init(BASE_URL).GET("/headers"))
    .assert("is array", (r) => Array.isArray(r.headers["set-cookie"]), true)
    .assert("count", (r) => r.headers["set-cookie"].length, 2)
    .assert("session cookie", (r) => r.headers["set-cookie"][0].includes("session=abc"), true)
    .assert("theme cookie", (r) => r.headers["set-cookie"][1].includes("theme=dark"), true)
    .start(null, config);

// ══════════════════════════════════════════════════════════════
// Authentication
// ══════════════════════════════════════════════════════════════

await CTGTest.init("auth no token returns 401")
    .stage("execute", () => CTGAPIClient.init(BASE_URL).GET("/auth"))
    .assert("status 401", (r) => r.status, 401)
    .start(null, config);

await CTGTest.init("auth wrong token returns 403")
    .stage("execute", () => CTGAPIClient.init(BASE_URL).setToken("wrong-token").GET("/auth"))
    .assert("status 403", (r) => r.status, 403)
    .start(null, config);

await CTGTest.init("auth valid token returns 200")
    .stage("execute", () => CTGAPIClient.init(BASE_URL).setToken("test-jwt-token-12345").GET("/auth"))
    .assert("status 200", (r) => r.status, 200)
    .assert("authenticated", (r) => r.body.authenticated, true)
    .start(null, config);

await CTGTest.init("auth token persists across requests")
    .stage("execute", async () => {
        const client = CTGAPIClient.init(BASE_URL).setToken("test-jwt-token-12345");
        const r1 = await client.GET("/auth");
        const r2 = await client.GET("/auth");
        return { s1: r1.status, s2: r2.status };
    })
    .assert("first ok", (r) => r.s1, 200)
    .assert("second ok", (r) => r.s2, 200)
    .start(null, config);

await CTGTest.init("auth clearToken removes auth")
    .stage("execute", async () => {
        const client = CTGAPIClient.init(BASE_URL).setToken("test-jwt-token-12345");
        const r1 = await client.GET("/auth");
        client.clearToken();
        const r2 = await client.GET("/auth");
        return { s1: r1.status, s2: r2.status };
    })
    .assert("before clear", (r) => r.s1, 200)
    .assert("after clear", (r) => r.s2, 401)
    .start(null, config);

await CTGTest.init("auth getToken lifecycle")
    .stage("check", () => {
        const client = CTGAPIClient.init(BASE_URL);
        const before = client.getToken();
        client.setToken("abc");
        const during = client.getToken();
        client.clearToken();
        const after = client.getToken();
        return { before, during, after };
    })
    .assert("before null", (r) => r.before, null)
    .assert("during set", (r) => r.during, "abc")
    .assert("after null", (r) => r.after, null)
    .start(null, config);

await CTGTest.init("auth token sent with POST")
    .stage("execute", () => CTGAPIClient.init(BASE_URL).setToken("test-jwt-token-12345").POST("/auth", { data: "test" }))
    .assert("authenticated", (r) => r.body.authenticated, true)
    .start(null, config);

await CTGTest.init("auth per-request Authorization overrides token")
    .stage("execute", () => CTGAPIClient.init(BASE_URL).setToken("test-jwt-token-12345")
        .GET("/echo", {}, { "Authorization": "Basic xyz" }))
    .assert("override applied", (r) => r.body.headers["authorization"], "Basic xyz")
    .start(null, config);

// ══════════════════════════════════════════════════════════════
// Header Management
// ══════════════════════════════════════════════════════════════

await CTGTest.init("headers setHeader sends custom header")
    .stage("execute", () => CTGAPIClient.init(BASE_URL).setHeader("X-Custom", "test-value").GET("/echo"))
    .assert("header sent", (r) => r.body.headers["x-custom"], "test-value")
    .start(null, config);

await CTGTest.init("headers setHeaders sends multiple")
    .stage("execute", () => CTGAPIClient.init(BASE_URL)
        .setHeaders({ "X-First": "one", "X-Second": "two" }).GET("/echo"))
    .assert("first", (r) => r.body.headers["x-first"], "one")
    .assert("second", (r) => r.body.headers["x-second"], "two")
    .start(null, config);

await CTGTest.init("headers removeHeader removes header")
    .stage("execute", () => CTGAPIClient.init(BASE_URL)
        .setHeader("X-Remove-Me", "present").removeHeader("X-Remove-Me").GET("/echo"))
    .assert("removed", (r) => r.body.headers["x-remove-me"] === undefined, true)
    .start(null, config);

await CTGTest.init("headers case-insensitive overwrite")
    .stage("execute", () => CTGAPIClient.init(BASE_URL)
        .setHeader("X-Custom", "first").setHeader("x-custom", "second").GET("/echo"))
    .assert("second wins", (r) => r.body.headers["x-custom"], "second")
    .start(null, config);

await CTGTest.init("headers case-insensitive remove")
    .stage("execute", () => CTGAPIClient.init(BASE_URL)
        .setHeader("X-Custom", "value").removeHeader("x-custom").GET("/echo"))
    .assert("removed", (r) => r.body.headers["x-custom"] === undefined, true)
    .start(null, config);

await CTGTest.init("headers default Authorization overrides automatic token")
    .stage("execute", () => CTGAPIClient.init(BASE_URL)
        .setToken("test-jwt-token-12345").setHeader("Authorization", "Basic xyz").GET("/echo"))
    .assert("default wins", (r) => r.body.headers["authorization"], "Basic xyz")
    .start(null, config);

// ── Per-Request Header Merge ─────────────────────────────────

await CTGTest.init("per-request headers override default for one call")
    .stage("execute", async () => {
        const client = CTGAPIClient.init(BASE_URL).setHeader("X-Default", "default");
        const r1 = await client.GET("/echo", {}, { "X-Default": "override" });
        const r2 = await client.GET("/echo");
        return { first: r1.body.headers["x-default"], second: r2.body.headers["x-default"] };
    })
    .assert("override", (r) => r.first, "override")
    .assert("reverts", (r) => r.second, "default")
    .start(null, config);

await CTGTest.init("per-request headers supplement defaults")
    .stage("execute", () => CTGAPIClient.init(BASE_URL)
        .setHeader("X-Default", "keep").GET("/echo", {}, { "X-Extra": "added" }))
    .assert("default kept", (r) => r.body.headers["x-default"], "keep")
    .assert("extra added", (r) => r.body.headers["x-extra"], "added")
    .start(null, config);

await CTGTest.init("per-request headers do not persist")
    .stage("execute", async () => {
        const client = CTGAPIClient.init(BASE_URL);
        await client.GET("/echo", {}, { "X-Temp": "once" });
        const r = await client.GET("/echo");
        return r.body.headers["x-temp"];
    })
    .assert("not persisted", (r) => r === undefined, true)
    .start(null, config);

// ══════════════════════════════════════════════════════════════
// File Upload
// ══════════════════════════════════════════════════════════════

await CTGTest.init("upload file via path")
    .stage("execute", async () => {
        const tmpDir = mkdtempSync(join(tmpdir(), "ctg-test-"));
        const filePath = join(tmpDir, "test.txt");
        writeFileSync(filePath, "hello world");
        try {
            return await CTGAPIClient.init(BASE_URL).upload("/upload", filePath);
        } finally { unlinkSync(filePath); }
    })
    .assert("status 200", (r) => r.status, 200)
    .assert("file received", (r) => r.body.files.file !== undefined, true)
    .assert("filename", (r) => r.body.files.file.name, "test.txt")
    .assert("has size", (r) => r.body.files.file.size > 0, true)
    .start(null, config);

await CTGTest.init("upload custom field name")
    .stage("execute", async () => {
        const tmpDir = mkdtempSync(join(tmpdir(), "ctg-test-"));
        const filePath = join(tmpDir, "photo.jpg");
        writeFileSync(filePath, "fake image");
        try {
            return await CTGAPIClient.init(BASE_URL).upload("/upload", filePath, {}, "avatar");
        } finally { unlinkSync(filePath); }
    })
    .assert("field name", (r) => r.body.files.avatar !== undefined, true)
    .assert("filename", (r) => r.body.files.avatar.name, "photo.jpg")
    .start(null, config);

await CTGTest.init("upload with additional fields")
    .stage("execute", async () => {
        const tmpDir = mkdtempSync(join(tmpdir(), "ctg-test-"));
        const filePath = join(tmpDir, "doc.pdf");
        writeFileSync(filePath, "pdf content");
        try {
            return await CTGAPIClient.init(BASE_URL).upload("/upload", filePath, { title: "My Doc", category: "reports" });
        } finally { unlinkSync(filePath); }
    })
    .assert("file received", (r) => r.body.files.file !== undefined, true)
    .assert("title field", (r) => r.body.fields.title, "My Doc")
    .assert("category field", (r) => r.body.fields.category, "reports")
    .start(null, config);

await CTGTest.init("upload Buffer source")
    .stage("execute", () => CTGAPIClient.init(BASE_URL).upload("/upload", Buffer.from("buffer content")))
    .assert("status 200", (r) => r.status, 200)
    .assert("file received", (r) => r.body.files.file !== undefined, true)
    .assert("has size", (r) => r.body.files.file.size > 0, true)
    .start(null, config);

await CTGTest.init("upload missing file throws REQUEST_FAILED")
    .stage("attempt", async () => {
        try { await CTGAPIClient.init(BASE_URL).upload("/upload", "/nonexistent/file.txt"); return "no throw"; }
        catch (e) { return e instanceof CTGAPIClientError && e.type === "REQUEST_FAILED" ? "threw" : "wrong error"; }
    })
    .assert("threw", (r) => r, "threw")
    .start(null, config);

await CTGTest.init("upload cancellation via opts.signal")
    .stage("attempt", async () => {
        const tmpDir = mkdtempSync(join(tmpdir(), "ctg-test-"));
        const filePath = join(tmpDir, "cancel.txt");
        writeFileSync(filePath, "cancel me");
        const controller = new AbortController();
        controller.abort();
        try {
            await CTGAPIClient.init(BASE_URL).upload("/upload", filePath, {}, "file", { signal: controller.signal });
            return "no throw";
        } catch (e) {
            return e instanceof CTGAPIClientError && e.type === "REQUEST_FAILED" ? "threw" : "wrong error";
        } finally { unlinkSync(filePath); }
    })
    .assert("threw", (r) => r, "threw")
    .start(null, config);

await CTGTest.init("upload cancellation in-flight abort")
    .stage("attempt", async () => {
        const tmpDir = mkdtempSync(join(tmpdir(), "ctg-test-"));
        const filePath = join(tmpDir, "inflight.txt");
        writeFileSync(filePath, "inflight data");
        const controller = new AbortController();
        setTimeout(() => controller.abort(), 50);
        try {
            // Upload to /slow endpoint so request is in-flight when abort fires
            await CTGAPIClient.init(BASE_URL).upload("/slow", filePath, { delay: "5000" }, "file", { signal: controller.signal });
            return "no throw";
        } catch (e) {
            return e instanceof CTGAPIClientError && e.type === "REQUEST_FAILED" ? "threw" : `wrong: ${e.type}`;
        } finally { unlinkSync(filePath); }
    })
    .assert("threw REQUEST_FAILED", (r) => r, "threw")
    .start(null, config);

await CTGTest.init("upload multipart content-type set")
    .stage("execute", async () => {
        const tmpDir = mkdtempSync(join(tmpdir(), "ctg-test-"));
        const filePath = join(tmpDir, "test.txt");
        writeFileSync(filePath, "file data");
        try {
            return await CTGAPIClient.init(BASE_URL).upload("/echo", filePath);
        } finally { unlinkSync(filePath); }
    })
    .assert("multipart content-type", (r) => r.body.headers["content-type"].includes("multipart/form-data"), true)
    .start(null, config);

// ══════════════════════════════════════════════════════════════
// URL Normalization
// ══════════════════════════════════════════════════════════════

await CTGTest.init("URL trailing slash on base, leading slash on path")
    .stage("execute", () => CTGAPIClient.init(BASE_URL + "/").GET("/echo"))
    .assert("status 200", (r) => r.status, 200)
    .start(null, config);

await CTGTest.init("URL no leading slash on path")
    .stage("execute", () => CTGAPIClient.init(BASE_URL).GET("echo"))
    .assert("status 200", (r) => r.status, 200)
    .start(null, config);

// ══════════════════════════════════════════════════════════════
// Transport Errors
// ══════════════════════════════════════════════════════════════

await CTGTest.init("error connection refused")
    .stage("attempt", async () => {
        try { await CTGAPIClient.init("http://127.0.0.1:19999").GET("/anything"); return "no throw"; }
        catch (e) { return e instanceof CTGAPIClientError && e.type === "CONNECTION_FAILED" ? "threw" : `wrong: ${e.type}`; }
    })
    .assert("threw CONNECTION_FAILED", (r) => r, "threw")
    .start(null, config);

await CTGTest.init("error connection refused via static request")
    .stage("attempt", async () => {
        try { await CTGAPIClient.request("GET", "http://127.0.0.1:19999/anything"); return "no throw"; }
        catch (e) { return e instanceof CTGAPIClientError && e.type === "CONNECTION_FAILED" ? "threw" : `wrong: ${e.type}`; }
    })
    .assert("threw", (r) => r, "threw")
    .start(null, config);

await CTGTest.init("error DNS failure")
    .stage("attempt", async () => {
        try { await CTGAPIClient.request("GET", "http://this-host-does-not-exist-ctg.invalid/path"); return "no throw"; }
        catch (e) { return e instanceof CTGAPIClientError && (e.type === "DNS_FAILED" || e.type === "CONNECTION_FAILED") ? "threw" : `wrong: ${e.type}`; }
    })
    .assert("threw", (r) => r, "threw")
    .start(null, config);

await CTGTest.init("error timeout")
    .stage("attempt", async () => {
        try { await CTGAPIClient.init(BASE_URL, { timeout: 0.1 }).GET("/slow", { delay: "5000" }); return "no throw"; }
        catch (e) { return e instanceof CTGAPIClientError && e.type === "TIMEOUT" ? "threw" : `wrong: ${e.type}`; }
    })
    .assert("threw TIMEOUT", (r) => r, "threw")
    .start(null, config);

// ── Transport Error Data ─────────────────────────────────────

await CTGTest.init("transport error data contains url and method")
    .stage("attempt", async () => {
        try { await CTGAPIClient.request("GET", "http://127.0.0.1:19999/path"); return null; }
        catch (e) { return e.data; }
    })
    .assert("has url", (d) => typeof d.url, "string")
    .assert("has method", (d) => typeof d.method, "string")
    .start(null, config);

await CTGTest.init("transport error data no auth headers")
    .stage("attempt", async () => {
        try {
            await CTGAPIClient.request("GET", "http://127.0.0.1:19999/path", {}, {}, {
                "Authorization": "Bearer secret", "Cookie": "session=abc"
            });
            return null;
        } catch (e) { return JSON.stringify(e.data); }
    })
    .assert("no secret", (s) => !s.includes("secret"), true)
    .assert("no session", (s) => !s.includes("session=abc"), true)
    .start(null, config);

// ══════════════════════════════════════════════════════════════
// URL Credential Rejection
// ══════════════════════════════════════════════════════════════

await CTGTest.init("URL credentials in static request throws INVALID_URL")
    .stage("attempt", async () => {
        try { await CTGAPIClient.request("GET", "http://user:pass@127.0.0.1/path"); return "no throw"; }
        catch (e) { return e instanceof CTGAPIClientError && e.type === "INVALID_URL" ? "threw" : `wrong: ${e.type}`; }
    })
    .assert("threw INVALID_URL", (r) => r, "threw")
    .start(null, config);

await CTGTest.init("URL credentials in instance request throws INVALID_URL")
    .stage("attempt", async () => {
        try { await CTGAPIClient.init("http://user:pass@127.0.0.1").GET("/path"); return "no throw"; }
        catch (e) { return e instanceof CTGAPIClientError && e.type === "INVALID_URL" ? "threw" : `wrong: ${e.type}`; }
    })
    .assert("threw INVALID_URL", (r) => r, "threw")
    .start(null, config);

await CTGTest.init("URL credentials redacted by _redactUrl")
    .stage("redact", () => CTGAPIClient._redactUrl("http://user:pass@example.com/path"))
    .assert("no plaintext credentials", (r) => !r.includes("user:pass"), true)
    .assert("has redaction markers", (r) => r.includes("***"), true)
    .start(null, config);

// ══════════════════════════════════════════════════════════════
// Header Null Byte Sanitization
// ══════════════════════════════════════════════════════════════

await CTGTest.init("header value null byte stripped")
    .stage("execute", () => CTGAPIClient.request("GET", `${BASE_URL}/echo`, {}, {}, {
        "X-Test": "before\0after"
    }))
    .assert("null byte removed", (r) => r.body.headers["x-test"], "beforeafter")
    .start(null, config);

// ══════════════════════════════════════════════════════════════
// Private IP Blocking
// ══════════════════════════════════════════════════════════════

await CTGTest.init("private IP blocked when SSRF configured")
    .stage("attempt", async () => {
        try {
            await CTGAPIClient.init("http://127.0.0.1", { allowed_hosts: ["api.example.com"] }).GET("/echo");
            return "no throw";
        } catch (e) { return e instanceof CTGAPIClientError && e.type === "INVALID_URL" ? "threw" : `wrong: ${e.type}`; }
    })
    .assert("threw INVALID_URL", (r) => r, "threw")
    .start(null, config);

await CTGTest.init("private IP 10.x blocked when block_private_ips true")
    .stage("attempt", async () => {
        try {
            await CTGAPIClient.init("http://10.0.0.1", { block_private_ips: true }).GET("/echo");
            return "no throw";
        } catch (e) { return e instanceof CTGAPIClientError && e.type === "INVALID_URL" ? "threw" : `wrong: ${e.type}`; }
    })
    .assert("threw INVALID_URL", (r) => r, "threw")
    .start(null, config);

await CTGTest.init("private IP 192.168.x blocked")
    .stage("attempt", async () => {
        try {
            await CTGAPIClient.init("http://192.168.1.1", { block_private_ips: true }).GET("/echo");
            return "no throw";
        } catch (e) { return e instanceof CTGAPIClientError && e.type === "INVALID_URL" ? "threw" : `wrong: ${e.type}`; }
    })
    .assert("threw INVALID_URL", (r) => r, "threw")
    .start(null, config);

await CTGTest.init("private IP 172.16.x blocked")
    .stage("attempt", async () => {
        try {
            await CTGAPIClient.init("http://172.16.0.1", { block_private_ips: true }).GET("/echo");
            return "no throw";
        } catch (e) { return e instanceof CTGAPIClientError && e.type === "INVALID_URL" ? "threw" : `wrong: ${e.type}`; }
    })
    .assert("threw INVALID_URL", (r) => r, "threw")
    .start(null, config);

await CTGTest.init("private IP 169.254.x link-local blocked")
    .stage("attempt", async () => {
        try {
            await CTGAPIClient.init("http://169.254.1.1", { block_private_ips: true }).GET("/echo");
            return "no throw";
        } catch (e) { return e instanceof CTGAPIClientError && e.type === "INVALID_URL" ? "threw" : `wrong: ${e.type}`; }
    })
    .assert("threw INVALID_URL", (r) => r, "threw")
    .start(null, config);

await CTGTest.init("IPv6 loopback blocked")
    .stage("attempt", async () => {
        try {
            await CTGAPIClient.init("http://[::1]", { block_private_ips: true }).GET("/echo");
            return "no throw";
        } catch (e) { return e instanceof CTGAPIClientError && e.type === "INVALID_URL" ? "threw" : `wrong: ${e.type}`; }
    })
    .assert("threw INVALID_URL", (r) => r, "threw")
    .start(null, config);

await CTGTest.init("private IPs not blocked when no SSRF config")
    .stage("execute", () => CTGAPIClient.init(BASE_URL).GET("/echo"))
    .assert("status 200", (r) => r.status, 200)
    .start(null, config);

// ══════════════════════════════════════════════════════════════
// IDN / Punycode Normalization
// ══════════════════════════════════════════════════════════════

await CTGTest.init("IDN hostname normalized to punycode for allowlist check")
    .stage("attempt", async () => {
        // Cyrillic "а" in "аpi" — punycode is "xn--pi-8ta"
        try {
            await CTGAPIClient.init("http://\u0430pi.example.com", {
                allowed_hosts: ["api.example.com"]
            }).GET("/echo");
            return "no throw";
        } catch (e) {
            // Should reject because punycode form doesn't match "api.example.com"
            return e instanceof CTGAPIClientError && e.type === "INVALID_URL" ? "threw" : `wrong: ${e.type}`;
        }
    })
    .assert("threw INVALID_URL", (r) => r, "threw")
    .start(null, config);

// ══════════════════════════════════════════════════════════════
// HTTP_ERROR (Caller-Initiated)
// ══════════════════════════════════════════════════════════════

await CTGTest.init("HTTP_ERROR caller throws on non-ok")
    .stage("execute", async () => {
        const r = await CTGAPIClient.init(BASE_URL).GET("/status", { code: "404" });
        try {
            if (!r.ok) throw new CTGAPIClientError("HTTP_ERROR", `Status: ${r.status}`, r);
            return null;
        } catch (e) { return { type: e.type, status: e.data.status }; }
    })
    .assert("type", (r) => r.type, "HTTP_ERROR")
    .assert("status in data", (r) => r.status, 404)
    .start(null, config);

await CTGTest.init("HTTP_ERROR chainable with transport errors")
    .stage("handle", async () => {
        const r = await CTGAPIClient.init(BASE_URL).GET("/status", { code: "404" });
        let result = "unhandled";
        try {
            if (!r.ok) throw new CTGAPIClientError("HTTP_ERROR", `Status: ${r.status}`, r);
        } catch (e) {
            e.on("TIMEOUT", () => { result = "timeout"; })
             .on("HTTP_ERROR", () => { result = "http_error"; })
             .otherwise(() => { result = "other"; });
        }
        return result;
    })
    .assert("http handler", (r) => r, "http_error")
    .start(null, config);

// ══════════════════════════════════════════════════════════════
// SSRF Allowlist
// ══════════════════════════════════════════════════════════════

await CTGTest.init("ssrf disallowed host throws INVALID_URL")
    .stage("attempt", async () => {
        try { await CTGAPIClient.init(BASE_URL, { allowed_hosts: ["api.example.com"] }).GET("/echo"); return "no throw"; }
        catch (e) { return e instanceof CTGAPIClientError && e.type === "INVALID_URL" ? "threw" : "wrong error"; }
    })
    .assert("threw", (r) => r, "threw")
    .start(null, config);

await CTGTest.init("ssrf disallowed scheme throws INVALID_URL")
    .stage("attempt", async () => {
        try { await CTGAPIClient.init(BASE_URL, { allowed_schemes: ["https"] }).GET("/echo"); return "no throw"; }
        catch (e) { return e instanceof CTGAPIClientError && e.type === "INVALID_URL" ? "threw" : "wrong error"; }
    })
    .assert("threw", (r) => r, "threw")
    .start(null, config);

await CTGTest.init("ssrf allowed host succeeds")
    .stage("execute", () => CTGAPIClient.init(BASE_URL, {
        allowed_hosts: ["127.0.0.1"], block_private_ips: false
    }).GET("/echo"))
    .assert("status 200", (r) => r.status, 200)
    .start(null, config);

// ══════════════════════════════════════════════════════════════
// Max Response Bytes
// ══════════════════════════════════════════════════════════════

await CTGTest.init("max response exceeds limit throws REQUEST_FAILED")
    .stage("attempt", async () => {
        try { await CTGAPIClient.init(BASE_URL, { max_response_bytes: 1 }).GET("/large", { size: "1024" }); return "no throw"; }
        catch (e) { return e instanceof CTGAPIClientError && e.type === "REQUEST_FAILED" ? "threw" : "wrong error"; }
    })
    .assert("threw", (r) => r, "threw")
    .start(null, config);

await CTGTest.init("max response under limit succeeds")
    .stage("execute", () => CTGAPIClient.init(BASE_URL, { max_response_bytes: 1048576 }).GET("/large", { size: "100" }))
    .assert("status 200", (r) => r.status, 200)
    .start(null, config);

// ══════════════════════════════════════════════════════════════
// Redirect Policy
// ══════════════════════════════════════════════════════════════

await CTGTest.init("redirect 302 not followed Location present")
    .stage("execute", () => CTGAPIClient.init(BASE_URL).GET("/redirect"))
    .assert("status 302", (r) => r.status, 302)
    .assert("not ok", (r) => r.ok, false)
    .assert("has location", (r) => typeof r.headers["location"], "string")
    .start(null, config);

// ══════════════════════════════════════════════════════════════
// Caller Cancellation
// ══════════════════════════════════════════════════════════════

await CTGTest.init("cancellation AbortSignal cancels request")
    .stage("attempt", async () => {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), 50);
        try {
            await CTGAPIClient.init(BASE_URL).GET("/slow", { delay: "5000" }, {}, { signal: controller.signal });
            return "no throw";
        } catch (e) { return e instanceof CTGAPIClientError && e.type === "REQUEST_FAILED" ? "threw" : `wrong: ${e.type}`; }
    })
    .assert("threw REQUEST_FAILED", (r) => r, "threw")
    .start(null, config);

await CTGTest.init("cancellation pre-aborted signal fails immediately")
    .stage("attempt", async () => {
        const controller = new AbortController();
        controller.abort();
        try {
            await CTGAPIClient.init(BASE_URL).GET("/echo", {}, {}, { signal: controller.signal });
            return "no throw";
        } catch (e) { return e instanceof CTGAPIClientError && e.type === "REQUEST_FAILED" ? "threw" : `wrong: ${e.type}`; }
    })
    .assert("threw REQUEST_FAILED", (r) => r, "threw")
    .start(null, config);

await CTGTest.init("cancellation static request with signal")
    .stage("attempt", async () => {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), 50);
        try {
            await CTGAPIClient.request("GET", `${BASE_URL}/slow?delay=5000`, {}, {}, {}, 30, { signal: controller.signal });
            return "no throw";
        } catch (e) { return e instanceof CTGAPIClientError && e.type === "REQUEST_FAILED" ? "threw" : `wrong: ${e.type}`; }
    })
    .assert("threw REQUEST_FAILED", (r) => r, "threw")
    .start(null, config);

await CTGTest.init("cancellation timeout fires before caller abort -> TIMEOUT")
    .stage("attempt", async () => {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), 200);
        try {
            await CTGAPIClient.request("GET", `${BASE_URL}/slow?delay=5000`, {}, {}, {}, 0.05, { signal: controller.signal });
            return "no throw";
        } catch (e) { return e instanceof CTGAPIClientError && e.type === "TIMEOUT" ? "threw" : `wrong: ${e.type}`; }
    })
    .assert("threw TIMEOUT", (r) => r, "threw")
    .start(null, config);

await CTGTest.init("cancellation caller abort fires before timeout -> REQUEST_FAILED")
    .stage("attempt", async () => {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), 50);
        try {
            await CTGAPIClient.request("GET", `${BASE_URL}/slow?delay=5000`, {}, {}, {}, 30, { signal: controller.signal });
            return "no throw";
        } catch (e) { return e instanceof CTGAPIClientError && e.type === "REQUEST_FAILED" ? "threw" : `wrong: ${e.type}`; }
    })
    .assert("threw REQUEST_FAILED", (r) => r, "threw")
    .start(null, config);

// ══════════════════════════════════════════════════════════════
// Summary + Cleanup
// ══════════════════════════════════════════════════════════════

process.stdout.write("\n=== All tests complete ===\n");
await stopServer(testServer);

// Exit code driven by CTGTest._results (runner semantics)
const failed = CTGTest._results.some((r) => r.status === "fail" || r.status === "error");
process.exit(failed ? 1 : 0);
