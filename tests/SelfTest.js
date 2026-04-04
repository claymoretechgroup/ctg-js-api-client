// Self-tests for ctg-js-api-client — error class + HTTP client
//
// Uses ctg-js-test pipelines for all tests.
// Starts an embedded node:http server for HTTP integration tests.
// Server is always stopped on exit (pass, fail, or error).

import { writeFileSync, unlinkSync, mkdtempSync } from "node:fs"; // File ops for upload tests
import { join } from "node:path"; // Path utils
import { tmpdir } from "node:os"; // Temp directory

import CTGTest from "ctg-js-test"; // Test framework
import CTGTestConsoleFormatter from "ctg-js-test/formatter/console";
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

const config = { timeout: 0 };
const collector = [];
let state;

try {

// ══════════════════════════════════════════════════════════════
// CTGAPIClientError — Construction
// ══════════════════════════════════════════════════════════════

state = await CTGTest.init("construct with type name")
    .stage("create", (state) => { state.subject = new CTGAPIClientError("TIMEOUT", "timed out", { url: "/test" }); return state; })
    .assert("code is 1001", (state) => state.subject.code, 1001)
    .assert("type is TIMEOUT", (state) => state.subject.type, "TIMEOUT")
    .assert("msg is set", (state) => state.subject.msg, "timed out")
    .assert("data url", (state) => state.subject.data.url, "/test")
    .assert("name is CTGAPIClientError", (state) => state.subject.name, "CTGAPIClientError")
    .assert("is Error instance", (state) => state.subject instanceof Error, true)
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("construct with integer code")
    .stage("create", (state) => { state.subject = new CTGAPIClientError(1000, "refused"); return state; })
    .assert("type is CONNECTION_FAILED", (state) => state.subject.type, "CONNECTION_FAILED")
    .assert("code is 1000", (state) => state.subject.code, 1000)
    .assert("msg is refused", (state) => state.subject.msg, "refused")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("construct defaults msg to type name")
    .stage("create", (state) => { state.subject = new CTGAPIClientError("DNS_FAILED"); return state; })
    .assert("msg is type name", (state) => state.subject.msg, "DNS_FAILED")
    .assert("data is null", (state) => state.subject.data, null)
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("construct unknown type throws TypeError")
    .stage("attempt", (state) => {
        try { new CTGAPIClientError("BOGUS"); state.subject = "no throw"; return state; }
        catch (e) { state.subject = e instanceof TypeError ? "threw TypeError" : "wrong error"; return state; }
    })
    .assert("threw", (state) => state.subject, "threw TypeError")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("construct unknown code throws TypeError")
    .stage("attempt", (state) => {
        try { new CTGAPIClientError(9999); state.subject = "no throw"; return state; }
        catch (e) { state.subject = e instanceof TypeError ? "threw TypeError" : "wrong error"; return state; }
    })
    .assert("threw", (state) => state.subject, "threw TypeError")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

// ══════════════════════════════════════════════════════════════
// CTGAPIClientError — Lookup
// ══════════════════════════════════════════════════════════════

state = await CTGTest.init("lookup name to code")
    .assert("TIMEOUT -> 1001", (state) => CTGAPIClientError.lookup("TIMEOUT"), 1001)
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("lookup code to name")
    .assert("1001 -> TIMEOUT", (state) => CTGAPIClientError.lookup(1001), "TIMEOUT")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("lookup unknown string returns null")
    .assert("returns null", (state) => CTGAPIClientError.lookup("BOGUS"), null)
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("lookup unknown integer returns null")
    .assert("returns null", (state) => CTGAPIClientError.lookup(9999), null)
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("lookup all error codes")
    .stage("collect", (state) => {
        state.subject = [
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
        ];
        return state;
    })
    .assert("all codes correct", (state) => JSON.stringify(state.subject),
        JSON.stringify([1000, 1001, 1002, 1003, 2000, 3000, 3001, 3002, 3003, 4000]))
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

// ══════════════════════════════════════════════════════════════
// CTGAPIClientError — on/otherwise
// ══════════════════════════════════════════════════════════════

state = await CTGTest.init("on matches type name")
    .stage("handle", (state) => {
        let matched = false;
        new CTGAPIClientError("TIMEOUT").on("TIMEOUT", () => { matched = true; });
        state.subject = matched;
        return state;
    })
    .assert("handler called", (state) => state.subject, true)
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("on matches by integer code")
    .stage("handle", (state) => {
        let matched = false;
        new CTGAPIClientError("TIMEOUT").on(1001, () => { matched = true; });
        state.subject = matched;
        return state;
    })
    .assert("handler called", (state) => state.subject, true)
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("on short circuits after first match")
    .stage("handle", (state) => {
        let first = false, second = false;
        new CTGAPIClientError("TIMEOUT")
            .on("TIMEOUT", () => { first = true; })
            .on("TIMEOUT", () => { second = true; });
        state.subject = { first, second };
        return state;
    })
    .assert("first called", (state) => state.subject.first, true)
    .assert("second not called", (state) => state.subject.second, false)
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("on skips non-matching type")
    .stage("handle", (state) => {
        let matched = false;
        new CTGAPIClientError("TIMEOUT").on("DNS_FAILED", () => { matched = true; });
        state.subject = matched;
        return state;
    })
    .assert("handler not called", (state) => state.subject, false)
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("on returns self for chaining")
    .stage("check", (state) => {
        const e = new CTGAPIClientError("TIMEOUT");
        state.subject = e.on("DNS_FAILED", () => {}) === e;
        return state;
    })
    .assert("returns self", (state) => state.subject, true)
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("otherwise called when no on matched")
    .stage("handle", (state) => {
        let called = false;
        new CTGAPIClientError("TIMEOUT")
            .on("DNS_FAILED", () => {})
            .otherwise(() => { called = true; });
        state.subject = called;
        return state;
    })
    .assert("otherwise called", (state) => state.subject, true)
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("otherwise not called when on matched")
    .stage("handle", (state) => {
        let called = false;
        new CTGAPIClientError("TIMEOUT")
            .on("TIMEOUT", () => {})
            .otherwise(() => { called = true; });
        state.subject = called;
        return state;
    })
    .assert("otherwise not called", (state) => state.subject, false)
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("on unknown string type throws TypeError")
    .stage("attempt", (state) => {
        try {
            new CTGAPIClientError("TIMEOUT").on("NONEXISTENT", () => {});
            state.subject = "no throw";
            return state;
        } catch (e) { state.subject = e instanceof TypeError ? "threw" : "wrong error"; return state; }
    })
    .assert("threw", (state) => state.subject, "threw")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("on unknown integer code throws TypeError")
    .stage("attempt", (state) => {
        try {
            new CTGAPIClientError("TIMEOUT").on(99999, () => {});
            state.subject = "no throw";
            return state;
        } catch (e) { state.subject = e instanceof TypeError ? "threw" : "wrong error"; return state; }
    })
    .assert("threw", (state) => state.subject, "threw")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

// ══════════════════════════════════════════════════════════════
// CTGAPIClientError — HTTP_ERROR Pattern
// ══════════════════════════════════════════════════════════════

state = await CTGTest.init("HTTP_ERROR construct with response data")
    .stage("create", (state) => {
        state.subject = new CTGAPIClientError("HTTP_ERROR", "Status: 404", {
            status: 404, ok: false, body: { error: "Not found" }
        });
        return state;
    })
    .assert("type", (state) => state.subject.type, "HTTP_ERROR")
    .assert("code", (state) => state.subject.code, 4000)
    .assert("data status", (state) => state.subject.data.status, 404)
    .assert("data ok", (state) => state.subject.data.ok, false)
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("HTTP_ERROR chainable with transport errors")
    .stage("handle", (state) => {
        let result = "unhandled";
        new CTGAPIClientError("HTTP_ERROR", "404", { status: 404 })
            .on("TIMEOUT", () => { result = "timeout"; })
            .on("HTTP_ERROR", () => { result = "http_error"; })
            .otherwise(() => { result = "other"; });
        state.subject = result;
        return state;
    })
    .assert("http handler fired", (state) => state.subject, "http_error")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

// ══════════════════════════════════════════════════════════════
// CTGAPIClient — Construction
// ══════════════════════════════════════════════════════════════

state = await CTGTest.init("init static factory")
    .stage("create", (state) => { state.subject = CTGAPIClient.init(BASE_URL); return state; })
    .assert("returns instance", (state) => state.subject instanceof CTGAPIClient, true)
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("init with config")
    .stage("create", (state) => { state.subject = CTGAPIClient.init(BASE_URL, { timeout: 5, headers: { "X-Custom": "value" } }); return state; })
    .assert("timeout set", (state) => state.subject.timeout, 5)
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("init strips trailing slash")
    .stage("create", (state) => { state.subject = CTGAPIClient.init(BASE_URL + "/"); return state; })
    .assert("no trailing slash", (state) => state.subject.baseUrl, BASE_URL)
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

// ── Constructor Validation ────────────────────────────────────

state = await CTGTest.init("non-string baseUrl throws TypeError")
    .stage("attempt", (state) => {
        try { CTGAPIClient.init(123); state.subject = "no throw"; return state; }
        catch (e) { state.subject = e instanceof TypeError ? "threw" : "wrong error"; return state; }
    })
    .assert("threw", (state) => state.subject, "threw")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("allowed_hosts as string throws TypeError")
    .stage("attempt", (state) => {
        try { CTGAPIClient.init(BASE_URL, { allowed_hosts: "example.com" }); state.subject = "no throw"; return state; }
        catch (e) { state.subject = e instanceof TypeError ? "threw" : "wrong error"; return state; }
    })
    .assert("threw", (state) => state.subject, "threw")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("allowed_schemes as string throws TypeError")
    .stage("attempt", (state) => {
        try { CTGAPIClient.init(BASE_URL, { allowed_schemes: "https" }); state.subject = "no throw"; return state; }
        catch (e) { state.subject = e instanceof TypeError ? "threw" : "wrong error"; return state; }
    })
    .assert("threw", (state) => state.subject, "threw")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("allowed_hosts with non-string element throws TypeError")
    .stage("attempt", (state) => {
        try { CTGAPIClient.init(BASE_URL, { allowed_hosts: [123] }); state.subject = "no throw"; return state; }
        catch (e) { state.subject = e instanceof TypeError ? "threw" : "wrong error"; return state; }
    })
    .assert("threw", (state) => state.subject, "threw")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("block_private_ips non-boolean throws TypeError")
    .stage("attempt", (state) => {
        try { CTGAPIClient.init(BASE_URL, { block_private_ips: "false" }); state.subject = "no throw"; return state; }
        catch (e) { state.subject = e instanceof TypeError ? "threw" : "wrong error"; return state; }
    })
    .assert("threw", (state) => state.subject, "threw")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

// ── Timeout Validation ───────────────────────────────────────

state = await CTGTest.init("timeout zero throws TypeError")
    .stage("attempt", (state) => {
        try { CTGAPIClient.init(BASE_URL, { timeout: 0 }); state.subject = "no throw"; return state; }
        catch (e) { state.subject = e instanceof TypeError ? "threw" : "wrong error"; return state; }
    })
    .assert("threw", (state) => state.subject, "threw")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("timeout negative throws TypeError")
    .stage("attempt", (state) => {
        try { CTGAPIClient.init(BASE_URL, { timeout: -1 }); state.subject = "no throw"; return state; }
        catch (e) { state.subject = e instanceof TypeError ? "threw" : "wrong error"; return state; }
    })
    .assert("threw", (state) => state.subject, "threw")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("timeout non-number throws TypeError")
    .stage("attempt", (state) => {
        try { CTGAPIClient.init(BASE_URL, { timeout: "fast" }); state.subject = "no throw"; return state; }
        catch (e) { state.subject = e instanceof TypeError ? "threw" : "wrong error"; return state; }
    })
    .assert("threw", (state) => state.subject, "threw")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("timeout NaN throws TypeError")
    .stage("attempt", (state) => {
        try { CTGAPIClient.init(BASE_URL, { timeout: NaN }); state.subject = "no throw"; return state; }
        catch (e) { state.subject = e instanceof TypeError ? "threw" : "wrong error"; return state; }
    })
    .assert("threw", (state) => state.subject, "threw")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("timeout Infinity throws TypeError")
    .stage("attempt", (state) => {
        try { CTGAPIClient.init(BASE_URL, { timeout: Infinity }); state.subject = "no throw"; return state; }
        catch (e) { state.subject = e instanceof TypeError ? "threw" : "wrong error"; return state; }
    })
    .assert("threw", (state) => state.subject, "threw")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("timeout float accepted")
    .stage("create", (state) => { state.subject = CTGAPIClient.init(BASE_URL, { timeout: 1.5 }); return state; })
    .assert("timeout preserved", (state) => state.subject.timeout, 1.5)
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("static request timeout zero throws TypeError")
    .stage("attempt", async (state) => {
        try { await CTGAPIClient.request("GET", `${BASE_URL}/echo`, {}, {}, {}, 0); state.subject = "no throw"; return state; }
        catch (e) { state.subject = e instanceof TypeError ? "threw" : "wrong error"; return state; }
    })
    .assert("threw", (state) => state.subject, "threw")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("static request timeout negative throws TypeError")
    .stage("attempt", async (state) => {
        try { await CTGAPIClient.request("GET", `${BASE_URL}/echo`, {}, {}, {}, -5); state.subject = "no throw"; return state; }
        catch (e) { state.subject = e instanceof TypeError ? "threw" : "wrong error"; return state; }
    })
    .assert("threw", (state) => state.subject, "threw")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("static request timeout non-number throws TypeError")
    .stage("attempt", async (state) => {
        try { await CTGAPIClient.request("GET", `${BASE_URL}/echo`, {}, {}, {}, "fast"); state.subject = "no throw"; return state; }
        catch (e) { state.subject = e instanceof TypeError ? "threw" : "wrong error"; return state; }
    })
    .assert("threw", (state) => state.subject, "threw")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("static request timeout NaN throws TypeError")
    .stage("attempt", async (state) => {
        try { await CTGAPIClient.request("GET", `${BASE_URL}/echo`, {}, {}, {}, NaN); state.subject = "no throw"; return state; }
        catch (e) { state.subject = e instanceof TypeError ? "threw" : "wrong error"; return state; }
    })
    .assert("threw", (state) => state.subject, "threw")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("static request timeout Infinity throws TypeError")
    .stage("attempt", async (state) => {
        try { await CTGAPIClient.request("GET", `${BASE_URL}/echo`, {}, {}, {}, Infinity); state.subject = "no throw"; return state; }
        catch (e) { state.subject = e instanceof TypeError ? "threw" : "wrong error"; return state; }
    })
    .assert("threw", (state) => state.subject, "threw")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

// ══════════════════════════════════════════════════════════════
// CTGAPIClient — Static request()
// ══════════════════════════════════════════════════════════════

state = await CTGTest.init("static request GET")
    .stage("execute", (state) => { state.subject = CTGAPIClient.request("GET", `${BASE_URL}/echo`); return state; })
    .assert("status 200", (state) => state.subject.status, 200)
    .assert("ok true", (state) => state.subject.ok, true)
    .assert("method GET", (state) => state.subject.body.method, "GET")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("static request POST with body")
    .stage("execute", (state) => { state.subject = CTGAPIClient.request("POST", `${BASE_URL}/echo`, { key: "value" }); return state; })
    .assert("method POST", (state) => state.subject.body.method, "POST")
    .assert("body sent", (state) => state.subject.body.body.key, "value")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("static request with query params")
    .stage("execute", (state) => { state.subject = CTGAPIClient.request("GET", `${BASE_URL}/echo`, {}, { page: "1", limit: "10" }); return state; })
    .assert("page param", (state) => state.subject.body.params.page, "1")
    .assert("limit param", (state) => state.subject.body.params.limit, "10")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("static request with headers")
    .stage("execute", (state) => { state.subject = CTGAPIClient.request("GET", `${BASE_URL}/echo`, {}, {}, { "X-Custom": "test" }); return state; })
    .assert("header sent", (state) => state.subject.body.headers["x-custom"], "test")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("static request case-insensitive method")
    .stage("execute", (state) => { state.subject = CTGAPIClient.request("post", `${BASE_URL}/echo`, { test: true }); return state; })
    .assert("method uppercased", (state) => state.subject.body.method, "POST")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("static request empty method throws INVALID_METHOD")
    .stage("attempt", async (state) => {
        try { await CTGAPIClient.request("", `${BASE_URL}/echo`); state.subject = "no throw"; return state; }
        catch (e) { state.subject = e instanceof CTGAPIClientError && e.type === "INVALID_METHOD" ? "threw" : "wrong error"; return state; }
    })
    .assert("threw", (state) => state.subject, "threw")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("static request invalid method throws INVALID_METHOD")
    .stage("attempt", async (state) => {
        try { await CTGAPIClient.request("BOGUS", `${BASE_URL}/echo`); state.subject = "no throw"; return state; }
        catch (e) { state.subject = e instanceof CTGAPIClientError && e.type === "INVALID_METHOD" ? "threw" : "wrong error"; return state; }
    })
    .assert("threw", (state) => state.subject, "threw")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("static request HEAD valid")
    .stage("execute", (state) => { state.subject = CTGAPIClient.request("HEAD", `${BASE_URL}/echo`); return state; })
    .assert("status 200", (state) => state.subject.status, 200)
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("static request OPTIONS valid")
    .stage("execute", (state) => { state.subject = CTGAPIClient.request("OPTIONS", `${BASE_URL}/echo`); return state; })
    .assert("status 200", (state) => state.subject.status, 200)
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("static request invalid header name throws INVALID_HEADER")
    .stage("attempt", async (state) => {
        try { await CTGAPIClient.request("GET", `${BASE_URL}/echo`, {}, {}, { "Bad Name": "value" }); state.subject = "no throw"; return state; }
        catch (e) { state.subject = e instanceof CTGAPIClientError && e.type === "INVALID_HEADER" ? "threw" : "wrong error"; return state; }
    })
    .assert("threw", (state) => state.subject, "threw")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("static request CRLF in header name throws INVALID_HEADER")
    .stage("attempt", async (state) => {
        try { await CTGAPIClient.request("GET", `${BASE_URL}/echo`, {}, {}, { "Name\r\n": "value" }); state.subject = "no throw"; return state; }
        catch (e) { state.subject = e instanceof CTGAPIClientError && e.type === "INVALID_HEADER" ? "threw" : "wrong error"; return state; }
    })
    .assert("threw", (state) => state.subject, "threw")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("static request CRLF stripped from header values")
    .stage("execute", (state) => {
        state.subject = CTGAPIClient.request("GET", `${BASE_URL}/echo`, {}, {}, {
            "X-Test": "safe\r\nX-Injected: evil"
        });
        return state;
    })
    .assert("no injection", (state) => !state.subject.body.headers["x-test"].includes("\n"), true)
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("static request Content-Type auto-set for JSON")
    .stage("execute", (state) => { state.subject = CTGAPIClient.request("POST", `${BASE_URL}/echo`, { data: "test" }); return state; })
    .assert("content-type json", (state) => state.subject.body.headers["content-type"], "application/json")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("static request explicit content-type not duplicated")
    .stage("execute", (state) => {
        state.subject = CTGAPIClient.request("POST", `${BASE_URL}/echo`, { data: "test" }, {}, {
            "content-type": "text/plain"
        });
        return state;
    })
    .assert("caller content-type preserved", (state) => state.subject.body.headers["content-type"], "text/plain")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("static request default User-Agent sent")
    .stage("execute", (state) => { state.subject = CTGAPIClient.request("GET", `${BASE_URL}/echo`); return state; })
    .assert("has user-agent", (state) => state.subject.body.headers["user-agent"].includes("CTGAPIClient"), true)
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("static request nested file in array throws INVALID_BODY")
    .stage("attempt", async (state) => {
        try {
            await CTGAPIClient.request("POST", `${BASE_URL}/echo`, {
                files: [new Blob(["data"])]
            });
            state.subject = "no throw";
            return state;
        } catch (e) { state.subject = e instanceof CTGAPIClientError && e.type === "INVALID_BODY" ? "threw" : `wrong: ${e.type}`; return state; }
    })
    .assert("threw INVALID_BODY", (state) => state.subject, "threw")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("static request body ignored for GET")
    .stage("execute", (state) => { state.subject = CTGAPIClient.request("GET", `${BASE_URL}/echo`, { ignored: true }); return state; })
    .assert("no body sent", (state) => state.subject.body.body === "" || state.subject.body.body === null || state.subject.body.body === undefined, true)
    .assert("no content-type", (state) => state.subject.body.headers["content-type"] === undefined, true)
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("static request body ignored for DELETE")
    .stage("execute", (state) => { state.subject = CTGAPIClient.request("DELETE", `${BASE_URL}/echo`, { ignored: true }); return state; })
    .assert("no body sent", (state) => state.subject.body.body === "" || state.subject.body.body === null || state.subject.body.body === undefined, true)
    .assert("no content-type", (state) => state.subject.body.headers["content-type"] === undefined, true)
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("static request query params with existing ?")
    .stage("execute", (state) => { state.subject = CTGAPIClient.request("GET", `${BASE_URL}/echo?existing=1`, {}, { added: "2" }); return state; })
    .assert("existing param", (state) => state.subject.body.params.existing, "1")
    .assert("added param", (state) => state.subject.body.params.added, "2")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("static request array param serialized as comma string")
    .stage("execute", (state) => { state.subject = CTGAPIClient.request("GET", `${BASE_URL}/echo`, {}, { tags: [1, 2, 3] }); return state; })
    .assert("array flattened", (state) => state.subject.body.params.tags, "1,2,3")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("static request nested object param serialized as string")
    .stage("execute", (state) => { state.subject = CTGAPIClient.request("GET", `${BASE_URL}/echo`, {}, { filter: { active: true } }); return state; })
    .assert("object stringified", (state) => state.subject.body.params.filter, "[object Object]")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

// ══════════════════════════════════════════════════════════════
// CTGAPIClient — Instance HTTP Methods
// ══════════════════════════════════════════════════════════════

state = await CTGTest.init("GET basic")
    .stage("execute", (state) => { state.subject = CTGAPIClient.init(BASE_URL).GET("/echo"); return state; })
    .assert("status 200", (state) => state.subject.status, 200)
    .assert("ok", (state) => state.subject.ok, true)
    .assert("method", (state) => state.subject.body.method, "GET")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("GET with query params")
    .stage("execute", (state) => { state.subject = CTGAPIClient.init(BASE_URL).GET("/echo", { role: "admin", active: "true" }); return state; })
    .assert("role param", (state) => state.subject.body.params.role, "admin")
    .assert("active param", (state) => state.subject.body.params.active, "true")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("GET with per-request headers")
    .stage("execute", (state) => { state.subject = CTGAPIClient.init(BASE_URL).GET("/echo", {}, { "X-Request-Only": "yes" }); return state; })
    .assert("header sent", (state) => state.subject.body.headers["x-request-only"], "yes")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("GET JSON endpoint")
    .stage("execute", (state) => { state.subject = CTGAPIClient.init(BASE_URL).GET("/json"); return state; })
    .assert("is array", (state) => Array.isArray(state.subject.body.users), true)
    .assert("count", (state) => state.subject.body.users.length, 3)
    .assert("first user", (state) => state.subject.body.users[0].name, "Alice")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("POST JSON body")
    .stage("execute", (state) => { state.subject = CTGAPIClient.init(BASE_URL).POST("/echo", { name: "test" }); return state; })
    .assert("method", (state) => state.subject.body.method, "POST")
    .assert("body", (state) => state.subject.body.body.name, "test")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("POST with query params and body")
    .stage("execute", (state) => { state.subject = CTGAPIClient.init(BASE_URL).POST("/echo", { data: "x" }, { page: "2" }); return state; })
    .assert("body", (state) => state.subject.body.body.data, "x")
    .assert("param", (state) => state.subject.body.params.page, "2")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("PUT JSON body")
    .stage("execute", (state) => { state.subject = CTGAPIClient.init(BASE_URL).PUT("/echo", { updated: true }); return state; })
    .assert("method", (state) => state.subject.body.method, "PUT")
    .assert("body", (state) => state.subject.body.body.updated, true)
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("PATCH JSON body")
    .stage("execute", (state) => { state.subject = CTGAPIClient.init(BASE_URL).PATCH("/echo", { field: "value" }); return state; })
    .assert("method", (state) => state.subject.body.method, "PATCH")
    .assert("body", (state) => state.subject.body.body.field, "value")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("DELETE basic")
    .stage("execute", (state) => { state.subject = CTGAPIClient.init(BASE_URL).DELETE("/echo"); return state; })
    .assert("method", (state) => state.subject.body.method, "DELETE")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("DELETE with query params")
    .stage("execute", (state) => { state.subject = CTGAPIClient.init(BASE_URL).DELETE("/echo", { id: "42" }); return state; })
    .assert("param", (state) => state.subject.body.params.id, "42")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

// ══════════════════════════════════════════════════════════════
// Response Structure
// ══════════════════════════════════════════════════════════════

state = await CTGTest.init("response has all required keys")
    .stage("execute", (state) => { state.subject = CTGAPIClient.init(BASE_URL).GET("/echo"); return state; })
    .assert("has status", (state) => typeof state.subject.status, "number")
    .assert("has ok", (state) => typeof state.subject.ok, "boolean")
    .assert("has headers", (state) => typeof state.subject.headers, "object")
    .assert("has body", (state) => "body" in state.subject, true)
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

// ── Status Codes ─────────────────────────────────────────────

state = await CTGTest.init("status 200 ok")
    .stage("execute", (state) => { state.subject = CTGAPIClient.init(BASE_URL).GET("/status", { code: "200" }); return state; })
    .assert("status", (state) => state.subject.status, 200)
    .assert("ok", (state) => state.subject.ok, true)
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("status 201 ok")
    .stage("execute", (state) => { state.subject = CTGAPIClient.init(BASE_URL).GET("/status", { code: "201" }); return state; })
    .assert("status", (state) => state.subject.status, 201)
    .assert("ok", (state) => state.subject.ok, true)
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("status 400 not ok")
    .stage("execute", (state) => { state.subject = CTGAPIClient.init(BASE_URL).GET("/status", { code: "400" }); return state; })
    .assert("status", (state) => state.subject.status, 400)
    .assert("not ok", (state) => state.subject.ok, false)
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("status 404 not ok")
    .stage("execute", (state) => { state.subject = CTGAPIClient.init(BASE_URL).GET("/status", { code: "404" }); return state; })
    .assert("status", (state) => state.subject.status, 404)
    .assert("not ok", (state) => state.subject.ok, false)
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("status 500 not ok")
    .stage("execute", (state) => { state.subject = CTGAPIClient.init(BASE_URL).GET("/status", { code: "500" }); return state; })
    .assert("status", (state) => state.subject.status, 500)
    .assert("not ok", (state) => state.subject.ok, false)
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("status 302 not ok (redirect not followed)")
    .stage("execute", (state) => { state.subject = CTGAPIClient.init(BASE_URL).GET("/redirect"); return state; })
    .assert("status 302", (state) => state.subject.status, 302)
    .assert("not ok", (state) => state.subject.ok, false)
    .assert("location header", (state) => typeof state.subject.headers["location"], "string")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

// ── Response Body Parsing ────────────────────────────────────

state = await CTGTest.init("response JSON body parsed")
    .stage("execute", (state) => { state.subject = CTGAPIClient.init(BASE_URL).GET("/json"); return state; })
    .assert("is object", (state) => typeof state.subject.body, "object")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("response non-JSON body returns raw string")
    .stage("execute", (state) => { state.subject = CTGAPIClient.init(BASE_URL).GET("/redirect"); return state; })
    .assert("is string", (state) => typeof state.subject.body, "string")
    .assert("raw content", (state) => state.subject.body, "redirecting")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("response empty body returns empty string")
    .stage("execute", (state) => { state.subject = CTGAPIClient.init(BASE_URL).GET("/status", { code: "204" }); return state; })
    .assert("empty string", (state) => state.subject.body, "")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

// ── Response Header Parsing ──────────────────────────────────

state = await CTGTest.init("response headers lowercase")
    .stage("execute", (state) => { state.subject = CTGAPIClient.init(BASE_URL).GET("/echo"); return state; })
    .assert("content-type lowercase", (state) => "content-type" in state.subject.headers, true)
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("response duplicate headers comma-joined")
    .stage("execute", (state) => { state.subject = CTGAPIClient.init(BASE_URL).GET("/headers"); return state; })
    .assert("x-duplicate joined", (state) =>
        typeof state.subject.headers["x-duplicate"] === "string"
        && state.subject.headers["x-duplicate"].includes("value1")
        && state.subject.headers["x-duplicate"].includes("value2"), true)
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("response set-cookie collected as array")
    .stage("execute", (state) => { state.subject = CTGAPIClient.init(BASE_URL).GET("/headers"); return state; })
    .assert("is array", (state) => Array.isArray(state.subject.headers["set-cookie"]), true)
    .assert("count", (state) => state.subject.headers["set-cookie"].length, 2)
    .assert("session cookie", (state) => state.subject.headers["set-cookie"][0].includes("session=abc"), true)
    .assert("theme cookie", (state) => state.subject.headers["set-cookie"][1].includes("theme=dark"), true)
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

// ══════════════════════════════════════════════════════════════
// Authentication
// ══════════════════════════════════════════════════════════════

state = await CTGTest.init("auth no token returns 401")
    .stage("execute", (state) => { state.subject = CTGAPIClient.init(BASE_URL).GET("/auth"); return state; })
    .assert("status 401", (state) => state.subject.status, 401)
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("auth wrong token returns 403")
    .stage("execute", (state) => { state.subject = CTGAPIClient.init(BASE_URL).setToken("wrong-token").GET("/auth"); return state; })
    .assert("status 403", (state) => state.subject.status, 403)
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("auth valid token returns 200")
    .stage("execute", (state) => { state.subject = CTGAPIClient.init(BASE_URL).setToken("test-jwt-token-12345").GET("/auth"); return state; })
    .assert("status 200", (state) => state.subject.status, 200)
    .assert("authenticated", (state) => state.subject.body.authenticated, true)
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("auth token persists across requests")
    .stage("execute", async (state) => {
        const client = CTGAPIClient.init(BASE_URL).setToken("test-jwt-token-12345");
        const r1 = await client.GET("/auth");
        const r2 = await client.GET("/auth");
        state.subject = { s1: r1.status, s2: r2.status };
        return state;
    })
    .assert("first ok", (state) => state.subject.s1, 200)
    .assert("second ok", (state) => state.subject.s2, 200)
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("auth clearToken removes auth")
    .stage("execute", async (state) => {
        const client = CTGAPIClient.init(BASE_URL).setToken("test-jwt-token-12345");
        const r1 = await client.GET("/auth");
        client.clearToken();
        const r2 = await client.GET("/auth");
        state.subject = { s1: r1.status, s2: r2.status };
        return state;
    })
    .assert("before clear", (state) => state.subject.s1, 200)
    .assert("after clear", (state) => state.subject.s2, 401)
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("auth getToken lifecycle")
    .stage("check", (state) => {
        const client = CTGAPIClient.init(BASE_URL);
        const before = client.getToken();
        client.setToken("abc");
        const during = client.getToken();
        client.clearToken();
        const after = client.getToken();
        state.subject = { before, during, after };
        return state;
    })
    .assert("before null", (state) => state.subject.before, null)
    .assert("during set", (state) => state.subject.during, "abc")
    .assert("after null", (state) => state.subject.after, null)
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("auth token sent with POST")
    .stage("execute", (state) => { state.subject = CTGAPIClient.init(BASE_URL).setToken("test-jwt-token-12345").POST("/auth", { data: "test" }); return state; })
    .assert("authenticated", (state) => state.subject.body.authenticated, true)
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("auth per-request Authorization overrides token")
    .stage("execute", (state) => {
        state.subject = CTGAPIClient.init(BASE_URL).setToken("test-jwt-token-12345")
            .GET("/echo", {}, { "Authorization": "Basic xyz" });
        return state;
    })
    .assert("override applied", (state) => state.subject.body.headers["authorization"], "Basic xyz")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

// ══════════════════════════════════════════════════════════════
// Header Management
// ══════════════════════════════════════════════════════════════

state = await CTGTest.init("headers setHeader sends custom header")
    .stage("execute", (state) => { state.subject = CTGAPIClient.init(BASE_URL).setHeader("X-Custom", "test-value").GET("/echo"); return state; })
    .assert("header sent", (state) => state.subject.body.headers["x-custom"], "test-value")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("headers setHeaders sends multiple")
    .stage("execute", (state) => {
        state.subject = CTGAPIClient.init(BASE_URL)
            .setHeaders({ "X-First": "one", "X-Second": "two" }).GET("/echo");
        return state;
    })
    .assert("first", (state) => state.subject.body.headers["x-first"], "one")
    .assert("second", (state) => state.subject.body.headers["x-second"], "two")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("headers removeHeader removes header")
    .stage("execute", (state) => {
        state.subject = CTGAPIClient.init(BASE_URL)
            .setHeader("X-Remove-Me", "present").removeHeader("X-Remove-Me").GET("/echo");
        return state;
    })
    .assert("removed", (state) => state.subject.body.headers["x-remove-me"] === undefined, true)
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("headers case-insensitive overwrite")
    .stage("execute", (state) => {
        state.subject = CTGAPIClient.init(BASE_URL)
            .setHeader("X-Custom", "first").setHeader("x-custom", "second").GET("/echo");
        return state;
    })
    .assert("second wins", (state) => state.subject.body.headers["x-custom"], "second")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("headers case-insensitive remove")
    .stage("execute", (state) => {
        state.subject = CTGAPIClient.init(BASE_URL)
            .setHeader("X-Custom", "value").removeHeader("x-custom").GET("/echo");
        return state;
    })
    .assert("removed", (state) => state.subject.body.headers["x-custom"] === undefined, true)
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("headers default Authorization overrides automatic token")
    .stage("execute", (state) => {
        state.subject = CTGAPIClient.init(BASE_URL)
            .setToken("test-jwt-token-12345").setHeader("Authorization", "Basic xyz").GET("/echo");
        return state;
    })
    .assert("default wins", (state) => state.subject.body.headers["authorization"], "Basic xyz")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

// ── Per-Request Header Merge ─────────────────────────────────

state = await CTGTest.init("per-request headers override default for one call")
    .stage("execute", async (state) => {
        const client = CTGAPIClient.init(BASE_URL).setHeader("X-Default", "default");
        const r1 = await client.GET("/echo", {}, { "X-Default": "override" });
        const r2 = await client.GET("/echo");
        state.subject = { first: r1.body.headers["x-default"], second: r2.body.headers["x-default"] };
        return state;
    })
    .assert("override", (state) => state.subject.first, "override")
    .assert("reverts", (state) => state.subject.second, "default")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("per-request headers supplement defaults")
    .stage("execute", (state) => {
        state.subject = CTGAPIClient.init(BASE_URL)
            .setHeader("X-Default", "keep").GET("/echo", {}, { "X-Extra": "added" });
        return state;
    })
    .assert("default kept", (state) => state.subject.body.headers["x-default"], "keep")
    .assert("extra added", (state) => state.subject.body.headers["x-extra"], "added")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("per-request headers do not persist")
    .stage("execute", async (state) => {
        const client = CTGAPIClient.init(BASE_URL);
        await client.GET("/echo", {}, { "X-Temp": "once" });
        const r = await client.GET("/echo");
        state.subject = r.body.headers["x-temp"];
        return state;
    })
    .assert("not persisted", (state) => state.subject === undefined, true)
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

// ══════════════════════════════════════════════════════════════
// File Upload
// ══════════════════════════════════════════════════════════════

state = await CTGTest.init("upload file via path")
    .stage("execute", async (state) => {
        const tmpDir = mkdtempSync(join(tmpdir(), "ctg-test-"));
        const filePath = join(tmpDir, "test.txt");
        writeFileSync(filePath, "hello world");
        try {
            state.subject = await CTGAPIClient.init(BASE_URL).upload("/upload", filePath);
            return state;
        } finally { unlinkSync(filePath); }
    })
    .assert("status 200", (state) => state.subject.status, 200)
    .assert("file received", (state) => state.subject.body.files.file !== undefined, true)
    .assert("filename", (state) => state.subject.body.files.file.name, "test.txt")
    .assert("has size", (state) => state.subject.body.files.file.size > 0, true)
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("upload custom field name")
    .stage("execute", async (state) => {
        const tmpDir = mkdtempSync(join(tmpdir(), "ctg-test-"));
        const filePath = join(tmpDir, "photo.jpg");
        writeFileSync(filePath, "fake image");
        try {
            state.subject = await CTGAPIClient.init(BASE_URL).upload("/upload", filePath, {}, "avatar");
            return state;
        } finally { unlinkSync(filePath); }
    })
    .assert("field name", (state) => state.subject.body.files.avatar !== undefined, true)
    .assert("filename", (state) => state.subject.body.files.avatar.name, "photo.jpg")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("upload with additional fields")
    .stage("execute", async (state) => {
        const tmpDir = mkdtempSync(join(tmpdir(), "ctg-test-"));
        const filePath = join(tmpDir, "doc.pdf");
        writeFileSync(filePath, "pdf content");
        try {
            state.subject = await CTGAPIClient.init(BASE_URL).upload("/upload", filePath, { title: "My Doc", category: "reports" });
            return state;
        } finally { unlinkSync(filePath); }
    })
    .assert("file received", (state) => state.subject.body.files.file !== undefined, true)
    .assert("title field", (state) => state.subject.body.fields.title, "My Doc")
    .assert("category field", (state) => state.subject.body.fields.category, "reports")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("upload Buffer source")
    .stage("execute", (state) => { state.subject = CTGAPIClient.init(BASE_URL).upload("/upload", Buffer.from("buffer content")); return state; })
    .assert("status 200", (state) => state.subject.status, 200)
    .assert("file received", (state) => state.subject.body.files.file !== undefined, true)
    .assert("has size", (state) => state.subject.body.files.file.size > 0, true)
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("upload missing file throws REQUEST_FAILED")
    .stage("attempt", async (state) => {
        try { await CTGAPIClient.init(BASE_URL).upload("/upload", "/nonexistent/file.txt"); state.subject = "no throw"; return state; }
        catch (e) { state.subject = e instanceof CTGAPIClientError && e.type === "REQUEST_FAILED" ? "threw" : "wrong error"; return state; }
    })
    .assert("threw", (state) => state.subject, "threw")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("upload cancellation via opts.signal")
    .stage("attempt", async (state) => {
        const tmpDir = mkdtempSync(join(tmpdir(), "ctg-test-"));
        const filePath = join(tmpDir, "cancel.txt");
        writeFileSync(filePath, "cancel me");
        const controller = new AbortController();
        controller.abort();
        try {
            await CTGAPIClient.init(BASE_URL).upload("/upload", filePath, {}, "file", { signal: controller.signal });
            state.subject = "no throw";
            return state;
        } catch (e) {
            state.subject = e instanceof CTGAPIClientError && e.type === "REQUEST_FAILED" ? "threw" : "wrong error";
            return state;
        } finally { unlinkSync(filePath); }
    })
    .assert("threw", (state) => state.subject, "threw")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("upload cancellation in-flight abort")
    .stage("attempt", async (state) => {
        const tmpDir = mkdtempSync(join(tmpdir(), "ctg-test-"));
        const filePath = join(tmpDir, "inflight.txt");
        writeFileSync(filePath, "inflight data");
        const controller = new AbortController();
        setTimeout(() => controller.abort(), 50);
        try {
            // Upload to /slow endpoint so request is in-flight when abort fires
            await CTGAPIClient.init(BASE_URL).upload("/slow", filePath, { delay: "5000" }, "file", { signal: controller.signal });
            state.subject = "no throw";
            return state;
        } catch (e) {
            state.subject = e instanceof CTGAPIClientError && e.type === "REQUEST_FAILED" ? "threw" : `wrong: ${e.type}`;
            return state;
        } finally { unlinkSync(filePath); }
    })
    .assert("threw REQUEST_FAILED", (state) => state.subject, "threw")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("upload multipart content-type set")
    .stage("execute", async (state) => {
        const tmpDir = mkdtempSync(join(tmpdir(), "ctg-test-"));
        const filePath = join(tmpDir, "test.txt");
        writeFileSync(filePath, "file data");
        try {
            state.subject = await CTGAPIClient.init(BASE_URL).upload("/echo", filePath);
            return state;
        } finally { unlinkSync(filePath); }
    })
    .assert("multipart content-type", (state) => state.subject.body.headers["content-type"].includes("multipart/form-data"), true)
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

// ══════════════════════════════════════════════════════════════
// URL Normalization
// ══════════════════════════════════════════════════════════════

state = await CTGTest.init("URL trailing slash on base, leading slash on path")
    .stage("execute", (state) => { state.subject = CTGAPIClient.init(BASE_URL + "/").GET("/echo"); return state; })
    .assert("status 200", (state) => state.subject.status, 200)
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("URL no leading slash on path")
    .stage("execute", (state) => { state.subject = CTGAPIClient.init(BASE_URL).GET("echo"); return state; })
    .assert("status 200", (state) => state.subject.status, 200)
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

// ══════════════════════════════════════════════════════════════
// Transport Errors
// ══════════════════════════════════════════════════════════════

state = await CTGTest.init("error connection refused")
    .stage("attempt", async (state) => {
        try { await CTGAPIClient.init("http://127.0.0.1:19999").GET("/anything"); state.subject = "no throw"; return state; }
        catch (e) { state.subject = e instanceof CTGAPIClientError && e.type === "CONNECTION_FAILED" ? "threw" : `wrong: ${e.type}`; return state; }
    })
    .assert("threw CONNECTION_FAILED", (state) => state.subject, "threw")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("error connection refused via static request")
    .stage("attempt", async (state) => {
        try { await CTGAPIClient.request("GET", "http://127.0.0.1:19999/anything"); state.subject = "no throw"; return state; }
        catch (e) { state.subject = e instanceof CTGAPIClientError && e.type === "CONNECTION_FAILED" ? "threw" : `wrong: ${e.type}`; return state; }
    })
    .assert("threw", (state) => state.subject, "threw")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("error DNS failure")
    .stage("attempt", async (state) => {
        try { await CTGAPIClient.request("GET", "http://this-host-does-not-exist-ctg.invalid/path"); state.subject = "no throw"; return state; }
        catch (e) { state.subject = e instanceof CTGAPIClientError && (e.type === "DNS_FAILED" || e.type === "CONNECTION_FAILED") ? "threw" : `wrong: ${e.type}`; return state; }
    })
    .assert("threw", (state) => state.subject, "threw")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("error timeout")
    .stage("attempt", async (state) => {
        try { await CTGAPIClient.init(BASE_URL, { timeout: 0.1 }).GET("/slow", { delay: "5000" }); state.subject = "no throw"; return state; }
        catch (e) { state.subject = e instanceof CTGAPIClientError && e.type === "TIMEOUT" ? "threw" : `wrong: ${e.type}`; return state; }
    })
    .assert("threw TIMEOUT", (state) => state.subject, "threw")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

// ── Transport Error Data ─────────────────────────────────────

state = await CTGTest.init("transport error data contains url and method")
    .stage("attempt", async (state) => {
        try { await CTGAPIClient.request("GET", "http://127.0.0.1:19999/path"); state.subject = null; return state; }
        catch (e) { state.subject = e.data; return state; }
    })
    .assert("has url", (state) => typeof state.subject.url, "string")
    .assert("has method", (state) => typeof state.subject.method, "string")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("transport error data no auth headers")
    .stage("attempt", async (state) => {
        try {
            await CTGAPIClient.request("GET", "http://127.0.0.1:19999/path", {}, {}, {
                "Authorization": "Bearer secret", "Cookie": "session=abc"
            });
            state.subject = null;
            return state;
        } catch (e) { state.subject = JSON.stringify(e.data); return state; }
    })
    .assert("no secret", (state) => !state.subject.includes("secret"), true)
    .assert("no session", (state) => !state.subject.includes("session=abc"), true)
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

// ══════════════════════════════════════════════════════════════
// URL Credential Rejection
// ══════════════════════════════════════════════════════════════

state = await CTGTest.init("URL credentials in static request throws INVALID_URL")
    .stage("attempt", async (state) => {
        try { await CTGAPIClient.request("GET", "http://user:pass@127.0.0.1/path"); state.subject = "no throw"; return state; }
        catch (e) { state.subject = e instanceof CTGAPIClientError && e.type === "INVALID_URL" ? "threw" : `wrong: ${e.type}`; return state; }
    })
    .assert("threw INVALID_URL", (state) => state.subject, "threw")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("URL credentials in instance request throws INVALID_URL")
    .stage("attempt", async (state) => {
        try { await CTGAPIClient.init("http://user:pass@127.0.0.1").GET("/path"); state.subject = "no throw"; return state; }
        catch (e) { state.subject = e instanceof CTGAPIClientError && e.type === "INVALID_URL" ? "threw" : `wrong: ${e.type}`; return state; }
    })
    .assert("threw INVALID_URL", (state) => state.subject, "threw")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("URL credentials redacted by _redactUrl")
    .stage("redact", (state) => { state.subject = CTGAPIClient._redactUrl("http://user:pass@example.com/path"); return state; })
    .assert("no plaintext credentials", (state) => !state.subject.includes("user:pass"), true)
    .assert("has redaction markers", (state) => state.subject.includes("***"), true)
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

// ══════════════════════════════════════════════════════════════
// Header Null Byte Sanitization
// ══════════════════════════════════════════════════════════════

state = await CTGTest.init("header value null byte stripped")
    .stage("execute", (state) => {
        state.subject = CTGAPIClient.request("GET", `${BASE_URL}/echo`, {}, {}, {
            "X-Test": "before\0after"
        });
        return state;
    })
    .assert("null byte removed", (state) => state.subject.body.headers["x-test"], "beforeafter")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

// ══════════════════════════════════════════════════════════════
// Private IP Blocking
// ══════════════════════════════════════════════════════════════

state = await CTGTest.init("private IP blocked when SSRF configured")
    .stage("attempt", async (state) => {
        try {
            await CTGAPIClient.init("http://127.0.0.1", { allowed_hosts: ["api.example.com"] }).GET("/echo");
            state.subject = "no throw";
            return state;
        } catch (e) { state.subject = e instanceof CTGAPIClientError && e.type === "INVALID_URL" ? "threw" : `wrong: ${e.type}`; return state; }
    })
    .assert("threw INVALID_URL", (state) => state.subject, "threw")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("private IP 10.x blocked when block_private_ips true")
    .stage("attempt", async (state) => {
        try {
            await CTGAPIClient.init("http://10.0.0.1", { block_private_ips: true }).GET("/echo");
            state.subject = "no throw";
            return state;
        } catch (e) { state.subject = e instanceof CTGAPIClientError && e.type === "INVALID_URL" ? "threw" : `wrong: ${e.type}`; return state; }
    })
    .assert("threw INVALID_URL", (state) => state.subject, "threw")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("private IP 192.168.x blocked")
    .stage("attempt", async (state) => {
        try {
            await CTGAPIClient.init("http://192.168.1.1", { block_private_ips: true }).GET("/echo");
            state.subject = "no throw";
            return state;
        } catch (e) { state.subject = e instanceof CTGAPIClientError && e.type === "INVALID_URL" ? "threw" : `wrong: ${e.type}`; return state; }
    })
    .assert("threw INVALID_URL", (state) => state.subject, "threw")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("private IP 172.16.x blocked")
    .stage("attempt", async (state) => {
        try {
            await CTGAPIClient.init("http://172.16.0.1", { block_private_ips: true }).GET("/echo");
            state.subject = "no throw";
            return state;
        } catch (e) { state.subject = e instanceof CTGAPIClientError && e.type === "INVALID_URL" ? "threw" : `wrong: ${e.type}`; return state; }
    })
    .assert("threw INVALID_URL", (state) => state.subject, "threw")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("private IP 169.254.x link-local blocked")
    .stage("attempt", async (state) => {
        try {
            await CTGAPIClient.init("http://169.254.1.1", { block_private_ips: true }).GET("/echo");
            state.subject = "no throw";
            return state;
        } catch (e) { state.subject = e instanceof CTGAPIClientError && e.type === "INVALID_URL" ? "threw" : `wrong: ${e.type}`; return state; }
    })
    .assert("threw INVALID_URL", (state) => state.subject, "threw")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("IPv6 loopback blocked")
    .stage("attempt", async (state) => {
        try {
            await CTGAPIClient.init("http://[::1]", { block_private_ips: true }).GET("/echo");
            state.subject = "no throw";
            return state;
        } catch (e) { state.subject = e instanceof CTGAPIClientError && e.type === "INVALID_URL" ? "threw" : `wrong: ${e.type}`; return state; }
    })
    .assert("threw INVALID_URL", (state) => state.subject, "threw")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("IPv6 link-local fe90 blocked (fe80::/10 range)")
    .stage("attempt", async (state) => {
        try {
            await CTGAPIClient.init("http://[fe90::1]", { block_private_ips: true }).GET("/echo");
            state.subject = "no throw";
            return state;
        } catch (e) { state.subject = e instanceof CTGAPIClientError && e.type === "INVALID_URL" ? "threw" : `wrong: ${e.type}`; return state; }
    })
    .assert("threw INVALID_URL", (state) => state.subject, "threw")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("IPv6 link-local febf blocked (fe80::/10 range)")
    .stage("attempt", async (state) => {
        try {
            await CTGAPIClient.init("http://[febf::1]", { block_private_ips: true }).GET("/echo");
            state.subject = "no throw";
            return state;
        } catch (e) { state.subject = e instanceof CTGAPIClientError && e.type === "INVALID_URL" ? "threw" : `wrong: ${e.type}`; return state; }
    })
    .assert("threw INVALID_URL", (state) => state.subject, "threw")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("IPv4-mapped IPv6 loopback blocked")
    .stage("attempt", async (state) => {
        try {
            await CTGAPIClient.init("http://[::ffff:127.0.0.1]", { block_private_ips: true }).GET("/echo");
            state.subject = "no throw";
            return state;
        } catch (e) { state.subject = e instanceof CTGAPIClientError && e.type === "INVALID_URL" ? "threw" : `wrong: ${e.type}`; return state; }
    })
    .assert("threw INVALID_URL", (state) => state.subject, "threw")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("IPv4-mapped IPv6 private 10.x blocked")
    .stage("attempt", async (state) => {
        try {
            await CTGAPIClient.init("http://[::ffff:10.0.0.1]", { block_private_ips: true }).GET("/echo");
            state.subject = "no throw";
            return state;
        } catch (e) { state.subject = e instanceof CTGAPIClientError && e.type === "INVALID_URL" ? "threw" : `wrong: ${e.type}`; return state; }
    })
    .assert("threw INVALID_URL", (state) => state.subject, "threw")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("IPv4-mapped IPv6 hex form loopback blocked (::ffff:7f00:1)")
    .stage("attempt", async (state) => {
        try {
            await CTGAPIClient.init("http://[::ffff:7f00:1]", { block_private_ips: true }).GET("/echo");
            state.subject = "no throw";
            return state;
        } catch (e) { state.subject = e instanceof CTGAPIClientError && e.type === "INVALID_URL" ? "threw" : `wrong: ${e.type}`; return state; }
    })
    .assert("threw INVALID_URL", (state) => state.subject, "threw")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("IPv4-mapped IPv6 hex form 10.x blocked (::ffff:a00:1)")
    .stage("attempt", async (state) => {
        try {
            await CTGAPIClient.init("http://[::ffff:a00:1]", { block_private_ips: true }).GET("/echo");
            state.subject = "no throw";
            return state;
        } catch (e) { state.subject = e instanceof CTGAPIClientError && e.type === "INVALID_URL" ? "threw" : `wrong: ${e.type}`; return state; }
    })
    .assert("threw INVALID_URL", (state) => state.subject, "threw")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("max_response_bytes zero throws TypeError")
    .stage("attempt", (state) => {
        try { CTGAPIClient.init(BASE_URL, { max_response_bytes: 0 }); state.subject = "no throw"; return state; }
        catch (e) { state.subject = e instanceof TypeError ? "threw" : "wrong error"; return state; }
    })
    .assert("threw", (state) => state.subject, "threw")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("max_response_bytes negative throws TypeError")
    .stage("attempt", (state) => {
        try { CTGAPIClient.init(BASE_URL, { max_response_bytes: -1 }); state.subject = "no throw"; return state; }
        catch (e) { state.subject = e instanceof TypeError ? "threw" : "wrong error"; return state; }
    })
    .assert("threw", (state) => state.subject, "threw")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("max_response_bytes float throws TypeError")
    .stage("attempt", (state) => {
        try { CTGAPIClient.init(BASE_URL, { max_response_bytes: 1.5 }); state.subject = "no throw"; return state; }
        catch (e) { state.subject = e instanceof TypeError ? "threw" : "wrong error"; return state; }
    })
    .assert("threw", (state) => state.subject, "threw")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("private IPs not blocked when no SSRF config")
    .stage("execute", (state) => { state.subject = CTGAPIClient.init(BASE_URL).GET("/echo"); return state; })
    .assert("status 200", (state) => state.subject.status, 200)
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

// ══════════════════════════════════════════════════════════════
// IDN / Punycode Normalization
// ══════════════════════════════════════════════════════════════

state = await CTGTest.init("IDN hostname normalized to punycode for allowlist check")
    .stage("attempt", async (state) => {
        // Cyrillic "а" in "аpi" — punycode is "xn--pi-8ta"
        try {
            await CTGAPIClient.init("http://\u0430pi.example.com", {
                allowed_hosts: ["api.example.com"]
            }).GET("/echo");
            state.subject = "no throw";
            return state;
        } catch (e) {
            // Should reject because punycode form doesn't match "api.example.com"
            state.subject = e instanceof CTGAPIClientError && e.type === "INVALID_URL" ? "threw" : `wrong: ${e.type}`;
            return state;
        }
    })
    .assert("threw INVALID_URL", (state) => state.subject, "threw")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

// ══════════════════════════════════════════════════════════════
// HTTP_ERROR (Caller-Initiated)
// ══════════════════════════════════════════════════════════════

state = await CTGTest.init("HTTP_ERROR caller throws on non-ok")
    .stage("execute", async (state) => {
        const r = await CTGAPIClient.init(BASE_URL).GET("/status", { code: "404" });
        try {
            if (!r.ok) throw new CTGAPIClientError("HTTP_ERROR", `Status: ${r.status}`, r);
            state.subject = null;
            return state;
        } catch (e) { state.subject = { type: e.type, status: e.data.status }; return state; }
    })
    .assert("type", (state) => state.subject.type, "HTTP_ERROR")
    .assert("status in data", (state) => state.subject.status, 404)
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("HTTP_ERROR chainable with transport errors")
    .stage("handle", async (state) => {
        const r = await CTGAPIClient.init(BASE_URL).GET("/status", { code: "404" });
        let result = "unhandled";
        try {
            if (!r.ok) throw new CTGAPIClientError("HTTP_ERROR", `Status: ${r.status}`, r);
        } catch (e) {
            e.on("TIMEOUT", () => { result = "timeout"; })
             .on("HTTP_ERROR", () => { result = "http_error"; })
             .otherwise(() => { result = "other"; });
        }
        state.subject = result;
        return state;
    })
    .assert("http handler", (state) => state.subject, "http_error")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

// ══════════════════════════════════════════════════════════════
// SSRF Allowlist
// ══════════════════════════════════════════════════════════════

state = await CTGTest.init("ssrf disallowed host throws INVALID_URL")
    .stage("attempt", async (state) => {
        try { await CTGAPIClient.init(BASE_URL, { allowed_hosts: ["api.example.com"] }).GET("/echo"); state.subject = "no throw"; return state; }
        catch (e) { state.subject = e instanceof CTGAPIClientError && e.type === "INVALID_URL" ? "threw" : "wrong error"; return state; }
    })
    .assert("threw", (state) => state.subject, "threw")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("ssrf disallowed scheme throws INVALID_URL")
    .stage("attempt", async (state) => {
        try { await CTGAPIClient.init(BASE_URL, { allowed_schemes: ["https"] }).GET("/echo"); state.subject = "no throw"; return state; }
        catch (e) { state.subject = e instanceof CTGAPIClientError && e.type === "INVALID_URL" ? "threw" : "wrong error"; return state; }
    })
    .assert("threw", (state) => state.subject, "threw")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("ssrf allowed host succeeds")
    .stage("execute", (state) => {
        state.subject = CTGAPIClient.init(BASE_URL, {
            allowed_hosts: ["127.0.0.1"], block_private_ips: false
        }).GET("/echo");
        return state;
    })
    .assert("status 200", (state) => state.subject.status, 200)
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

// ══════════════════════════════════════════════════════════════
// Max Response Bytes
// ══════════════════════════════════════════════════════════════

state = await CTGTest.init("max response exceeds limit throws REQUEST_FAILED")
    .stage("attempt", async (state) => {
        try { await CTGAPIClient.init(BASE_URL, { max_response_bytes: 1 }).GET("/large", { size: "1024" }); state.subject = "no throw"; return state; }
        catch (e) { state.subject = e instanceof CTGAPIClientError && e.type === "REQUEST_FAILED" ? "threw" : "wrong error"; return state; }
    })
    .assert("threw", (state) => state.subject, "threw")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("max response under limit succeeds")
    .stage("execute", (state) => { state.subject = CTGAPIClient.init(BASE_URL, { max_response_bytes: 1048576 }).GET("/large", { size: "100" }); return state; })
    .assert("status 200", (state) => state.subject.status, 200)
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

// ══════════════════════════════════════════════════════════════
// Redirect Policy
// ══════════════════════════════════════════════════════════════

state = await CTGTest.init("redirect 302 not followed Location present")
    .stage("execute", (state) => { state.subject = CTGAPIClient.init(BASE_URL).GET("/redirect"); return state; })
    .assert("status 302", (state) => state.subject.status, 302)
    .assert("not ok", (state) => state.subject.ok, false)
    .assert("has location", (state) => typeof state.subject.headers["location"], "string")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

// ══════════════════════════════════════════════════════════════
// Caller Cancellation
// ══════════════════════════════════════════════════════════════

state = await CTGTest.init("cancellation AbortSignal cancels request")
    .stage("attempt", async (state) => {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), 50);
        try {
            await CTGAPIClient.init(BASE_URL).GET("/slow", { delay: "5000" }, {}, { signal: controller.signal });
            state.subject = "no throw";
            return state;
        } catch (e) { state.subject = e instanceof CTGAPIClientError && e.type === "REQUEST_FAILED" ? "threw" : `wrong: ${e.type}`; return state; }
    })
    .assert("threw REQUEST_FAILED", (state) => state.subject, "threw")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("cancellation pre-aborted signal fails immediately")
    .stage("attempt", async (state) => {
        const controller = new AbortController();
        controller.abort();
        try {
            await CTGAPIClient.init(BASE_URL).GET("/echo", {}, {}, { signal: controller.signal });
            state.subject = "no throw";
            return state;
        } catch (e) { state.subject = e instanceof CTGAPIClientError && e.type === "REQUEST_FAILED" ? "threw" : `wrong: ${e.type}`; return state; }
    })
    .assert("threw REQUEST_FAILED", (state) => state.subject, "threw")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("cancellation static request with signal")
    .stage("attempt", async (state) => {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), 50);
        try {
            await CTGAPIClient.request("GET", `${BASE_URL}/slow?delay=5000`, {}, {}, {}, 30, { signal: controller.signal });
            state.subject = "no throw";
            return state;
        } catch (e) { state.subject = e instanceof CTGAPIClientError && e.type === "REQUEST_FAILED" ? "threw" : `wrong: ${e.type}`; return state; }
    })
    .assert("threw REQUEST_FAILED", (state) => state.subject, "threw")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("cancellation timeout fires before caller abort -> TIMEOUT")
    .stage("attempt", async (state) => {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), 200);
        try {
            await CTGAPIClient.request("GET", `${BASE_URL}/slow?delay=5000`, {}, {}, {}, 0.05, { signal: controller.signal });
            state.subject = "no throw";
            return state;
        } catch (e) { state.subject = e instanceof CTGAPIClientError && e.type === "TIMEOUT" ? "threw" : `wrong: ${e.type}`; return state; }
    })
    .assert("threw TIMEOUT", (state) => state.subject, "threw")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

state = await CTGTest.init("cancellation caller abort fires before timeout -> REQUEST_FAILED")
    .stage("attempt", async (state) => {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), 50);
        try {
            await CTGAPIClient.request("GET", `${BASE_URL}/slow?delay=5000`, {}, {}, {}, 30, { signal: controller.signal });
            state.subject = "no throw";
            return state;
        } catch (e) { state.subject = e instanceof CTGAPIClientError && e.type === "REQUEST_FAILED" ? "threw" : `wrong: ${e.type}`; return state; }
    })
    .assert("threw REQUEST_FAILED", (state) => state.subject, "threw")
    .start(null, config);
process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
collector.push({ name: state.name, status: state.status });

// ══════════════════════════════════════════════════════════════
// Summary + Cleanup
// ══════════════════════════════════════════════════════════════

process.stdout.write("\n=== All tests complete ===\n");

} finally {
    await stopServer(testServer);
}

// Exit code driven by collector (runner semantics)
const failed = collector.some((r) => r.status === "fail" || r.status === "error");
process.exit(failed ? 1 : 0);
