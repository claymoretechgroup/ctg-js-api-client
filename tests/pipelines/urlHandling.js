// ══════════════════════════════════════════════════════════════
// URL Normalization
// ══════════════════════════════════════════════════════════════

// :: OBJECT -> PROMISE(VOID)
export default async function run({ CTGTest, CTGTestConsoleFormatter, CTGAPIClient, CTGAPIClientError, BASE_URL, config, collector }) {
    let state;

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
}
