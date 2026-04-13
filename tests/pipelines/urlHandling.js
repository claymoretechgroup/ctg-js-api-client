// ══════════════════════════════════════════════════════════════
// URL Normalization
// ══════════════════════════════════════════════════════════════

// :: OBJECT -> PROMISE(VOID)
export default async function run({ CTGTest, P, CTGTestConsoleFormatter, CTGAPIClient, CTGAPIClientError, BASE_URL, config, collector }) {
    let state;

    state = await CTGTest.init("URL trailing slash on base, leading slash on path")
        .stage("execute", (state) => CTGAPIClient.init(BASE_URL + "/").GET("/echo"))
        .assert("status 200", (state) => state.subject.status, P.equals(200))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.label, status: state.status });

    state = await CTGTest.init("URL no leading slash on path")
        .stage("execute", (state) => CTGAPIClient.init(BASE_URL).GET("echo"))
        .assert("status 200", (state) => state.subject.status, P.equals(200))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.label, status: state.status });

    // ══════════════════════════════════════════════════════════════
    // Transport Errors
    // ══════════════════════════════════════════════════════════════

    state = await CTGTest.init("error connection refused")
        .stage("attempt", async (state) => {
            try { await CTGAPIClient.init("http://127.0.0.1:19999").GET("/anything"); return "no throw"; }
            catch (e) { return e instanceof CTGAPIClientError && e.type === "CONNECTION_FAILED" ? "threw" : `wrong: ${e.type}`; }
        })
        .assert("threw CONNECTION_FAILED", (state) => state.subject, P.equals("threw"))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.label, status: state.status });

    state = await CTGTest.init("error connection refused via static request")
        .stage("attempt", async (state) => {
            try { await CTGAPIClient.request("GET", "http://127.0.0.1:19999/anything"); return "no throw"; }
            catch (e) { return e instanceof CTGAPIClientError && e.type === "CONNECTION_FAILED" ? "threw" : `wrong: ${e.type}`; }
        })
        .assert("threw", (state) => state.subject, P.equals("threw"))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.label, status: state.status });

    state = await CTGTest.init("error DNS failure")
        .stage("attempt", async (state) => {
            try { await CTGAPIClient.request("GET", "http://this-host-does-not-exist-ctg.invalid/path"); return "no throw"; }
            catch (e) { return e instanceof CTGAPIClientError && (e.type === "DNS_FAILED" || e.type === "CONNECTION_FAILED") ? "threw" : `wrong: ${e.type}`; }
        })
        .assert("threw", (state) => state.subject, P.equals("threw"))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.label, status: state.status });

    state = await CTGTest.init("error timeout")
        .stage("attempt", async (state) => {
            try { await CTGAPIClient.init(BASE_URL, { timeout: 0.1 }).GET("/slow", { delay: "5000" }); return "no throw"; }
            catch (e) { return e instanceof CTGAPIClientError && e.type === "TIMEOUT" ? "threw" : `wrong: ${e.type}`; }
        })
        .assert("threw TIMEOUT", (state) => state.subject, P.equals("threw"))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.label, status: state.status });

    // ── Transport Error Data ─────────────────────────────────────

    state = await CTGTest.init("transport error data contains url and method")
        .stage("attempt", async (state) => {
            try { await CTGAPIClient.request("GET", "http://127.0.0.1:19999/path"); return null; }
            catch (e) { return e.data; }
        })
        .assert("has url", (state) => typeof state.subject.url, P.equals("string"))
        .assert("has method", (state) => typeof state.subject.method, P.equals("string"))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.label, status: state.status });

    state = await CTGTest.init("transport error data no auth headers")
        .stage("attempt", async (state) => {
            try {
                await CTGAPIClient.request("GET", "http://127.0.0.1:19999/path", {}, {}, {
                    "Authorization": "Bearer secret", "Cookie": "session=abc"
                });
                return null;
            } catch (e) { return JSON.stringify(e.data); }
        })
        .assert("no secret", (state) => !state.subject.includes("secret"), P.equals(true))
        .assert("no session", (state) => !state.subject.includes("session=abc"), P.equals(true))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.label, status: state.status });

    // ══════════════════════════════════════════════════════════════
    // URL Credential Rejection
    // ══════════════════════════════════════════════════════════════

    state = await CTGTest.init("URL credentials in static request throws INVALID_URL")
        .stage("attempt", async (state) => {
            try { await CTGAPIClient.request("GET", "http://user:pass@127.0.0.1/path"); return "no throw"; }
            catch (e) { return e instanceof CTGAPIClientError && e.type === "INVALID_URL" ? "threw" : `wrong: ${e.type}`; }
        })
        .assert("threw INVALID_URL", (state) => state.subject, P.equals("threw"))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.label, status: state.status });

    state = await CTGTest.init("URL credentials in instance request throws INVALID_URL")
        .stage("attempt", async (state) => {
            try { await CTGAPIClient.init("http://user:pass@127.0.0.1").GET("/path"); return "no throw"; }
            catch (e) { return e instanceof CTGAPIClientError && e.type === "INVALID_URL" ? "threw" : `wrong: ${e.type}`; }
        })
        .assert("threw INVALID_URL", (state) => state.subject, P.equals("threw"))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.label, status: state.status });

    state = await CTGTest.init("URL credentials redacted by _redactUrl")
        .stage("redact", (state) => CTGAPIClient._redactUrl("http://user:pass@example.com/path"))
        .assert("no plaintext credentials", (state) => !state.subject.includes("user:pass"), P.equals(true))
        .assert("has redaction markers", (state) => state.subject.includes("***"), P.equals(true))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.label, status: state.status });

    // ══════════════════════════════════════════════════════════════
    // Header Null Byte Sanitization
    // ══════════════════════════════════════════════════════════════

    state = await CTGTest.init("header value null byte stripped")
        .stage("execute", (state) => {
            return CTGAPIClient.request("GET", `${BASE_URL}/echo`, {}, {}, {
                "X-Test": "before\0after"
            });
        })
        .assert("null byte removed", (state) => state.subject.body.headers["x-test"], P.equals("beforeafter"))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.label, status: state.status });
}
