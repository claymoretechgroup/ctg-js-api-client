// ══════════════════════════════════════════════════════════════
// CTGAPIClientError — on/otherwise
// ══════════════════════════════════════════════════════════════

// :: OBJECT -> PROMISE(VOID)
export default async function run({ CTGTest, CTGTestConsoleFormatter, CTGAPIClient, CTGAPIClientError, BASE_URL, config, collector }) {
    let state;

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
}
