// ══════════════════════════════════════════════════════════════
// Response Structure
// ══════════════════════════════════════════════════════════════

// :: OBJECT -> PROMISE(VOID)
export default async function run({ CTGTest, P, CTGTestConsoleFormatter, CTGAPIClient, CTGAPIClientError, BASE_URL, config, collector }) {
    let state;

    state = await CTGTest.init("response has all required keys")
        .stage("execute", (state) => CTGAPIClient.init(BASE_URL).GET("/echo"))
        .assert("has status", (state) => typeof state.subject.status, P.equals("number"))
        .assert("has ok", (state) => typeof state.subject.ok, P.equals("boolean"))
        .assert("has headers", (state) => typeof state.subject.headers, P.equals("object"))
        .assert("has body", (state) => "body" in state.subject, P.equals(true))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    // ── Status Codes ─────────────────────────────────────────────

    state = await CTGTest.init("status 200 ok")
        .stage("execute", (state) => CTGAPIClient.init(BASE_URL).GET("/status", { code: "200" }))
        .assert("status", (state) => state.subject.status, P.equals(200))
        .assert("ok", (state) => state.subject.ok, P.equals(true))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("status 201 ok")
        .stage("execute", (state) => CTGAPIClient.init(BASE_URL).GET("/status", { code: "201" }))
        .assert("status", (state) => state.subject.status, P.equals(201))
        .assert("ok", (state) => state.subject.ok, P.equals(true))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("status 400 not ok")
        .stage("execute", (state) => CTGAPIClient.init(BASE_URL).GET("/status", { code: "400" }))
        .assert("status", (state) => state.subject.status, P.equals(400))
        .assert("not ok", (state) => state.subject.ok, P.equals(false))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("status 404 not ok")
        .stage("execute", (state) => CTGAPIClient.init(BASE_URL).GET("/status", { code: "404" }))
        .assert("status", (state) => state.subject.status, P.equals(404))
        .assert("not ok", (state) => state.subject.ok, P.equals(false))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("status 500 not ok")
        .stage("execute", (state) => CTGAPIClient.init(BASE_URL).GET("/status", { code: "500" }))
        .assert("status", (state) => state.subject.status, P.equals(500))
        .assert("not ok", (state) => state.subject.ok, P.equals(false))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("status 302 not ok (redirect not followed)")
        .stage("execute", (state) => CTGAPIClient.init(BASE_URL).GET("/redirect"))
        .assert("status 302", (state) => state.subject.status, P.equals(302))
        .assert("not ok", (state) => state.subject.ok, P.equals(false))
        .assert("location header", (state) => typeof state.subject.headers["location"], P.equals("string"))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    // ── Response Body Parsing ────────────────────────────────────

    state = await CTGTest.init("response JSON body parsed")
        .stage("execute", (state) => CTGAPIClient.init(BASE_URL).GET("/json"))
        .assert("is object", (state) => typeof state.subject.body, P.equals("object"))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("response non-JSON body returns raw string")
        .stage("execute", (state) => CTGAPIClient.init(BASE_URL).GET("/redirect"))
        .assert("is string", (state) => typeof state.subject.body, P.equals("string"))
        .assert("raw content", (state) => state.subject.body, P.equals("redirecting"))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("response empty body returns empty string")
        .stage("execute", (state) => CTGAPIClient.init(BASE_URL).GET("/status", { code: "204" }))
        .assert("empty string", (state) => state.subject.body, P.equals(""))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    // ── Response Header Parsing ──────────────────────────────────

    state = await CTGTest.init("response headers lowercase")
        .stage("execute", (state) => CTGAPIClient.init(BASE_URL).GET("/echo"))
        .assert("content-type lowercase", (state) => "content-type" in state.subject.headers, P.equals(true))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("response duplicate headers comma-joined")
        .stage("execute", (state) => CTGAPIClient.init(BASE_URL).GET("/headers"))
        .assert("x-duplicate joined", (state) =>
            typeof state.subject.headers["x-duplicate"] === "string"
            && state.subject.headers["x-duplicate"].includes("value1")
            && state.subject.headers["x-duplicate"].includes("value2"), P.equals(true))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("response set-cookie collected as array")
        .stage("execute", (state) => CTGAPIClient.init(BASE_URL).GET("/headers"))
        .assert("is array", (state) => Array.isArray(state.subject.headers["set-cookie"]), P.equals(true))
        .assert("count", (state) => state.subject.headers["set-cookie"].length, P.equals(2))
        .assert("session cookie", (state) => state.subject.headers["set-cookie"][0].includes("session=abc"), P.equals(true))
        .assert("theme cookie", (state) => state.subject.headers["set-cookie"][1].includes("theme=dark"), P.equals(true))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });
}
