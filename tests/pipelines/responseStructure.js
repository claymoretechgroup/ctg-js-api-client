// ══════════════════════════════════════════════════════════════
// Response Structure
// ══════════════════════════════════════════════════════════════

// :: OBJECT -> PROMISE(VOID)
export default async function run({ CTGTest, CTGTestConsoleFormatter, CTGAPIClient, CTGAPIClientError, BASE_URL, config, collector }) {
    let state;

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
}
