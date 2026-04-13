// ══════════════════════════════════════════════════════════════
// CTGAPIClientError — on/otherwise
// ══════════════════════════════════════════════════════════════

// :: OBJECT -> PROMISE(VOID)
export default async function run({ CTGTest, P, CTGTestConsoleFormatter, CTGAPIClient, CTGAPIClientError, BASE_URL, config, collector }) {
    let state;

    state = await CTGTest.init("on matches type name")
        .stage("handle", (state) => {
            let matched = false;
            new CTGAPIClientError("TIMEOUT").on("TIMEOUT", () => { matched = true; });
            return matched;
        })
        .assert("handler called", (state) => state.subject, P.equals(true))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("on matches by integer code")
        .stage("handle", (state) => {
            let matched = false;
            new CTGAPIClientError("TIMEOUT").on(1001, () => { matched = true; });
            return matched;
        })
        .assert("handler called", (state) => state.subject, P.equals(true))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("on short circuits after first match")
        .stage("handle", (state) => {
            let first = false, second = false;
            new CTGAPIClientError("TIMEOUT")
                .on("TIMEOUT", () => { first = true; })
                .on("TIMEOUT", () => { second = true; });
            return { first, second };
        })
        .assert("first called", (state) => state.subject.first, P.equals(true))
        .assert("second not called", (state) => state.subject.second, P.equals(false))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("on skips non-matching type")
        .stage("handle", (state) => {
            let matched = false;
            new CTGAPIClientError("TIMEOUT").on("DNS_FAILED", () => { matched = true; });
            return matched;
        })
        .assert("handler not called", (state) => state.subject, P.equals(false))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("on returns self for chaining")
        .stage("check", (state) => {
            const e = new CTGAPIClientError("TIMEOUT");
            return e.on("DNS_FAILED", () => {}) === e;
        })
        .assert("returns self", (state) => state.subject, P.equals(true))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("otherwise called when no on matched")
        .stage("handle", (state) => {
            let called = false;
            new CTGAPIClientError("TIMEOUT")
                .on("DNS_FAILED", () => {})
                .otherwise(() => { called = true; });
            return called;
        })
        .assert("otherwise called", (state) => state.subject, P.equals(true))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("otherwise not called when on matched")
        .stage("handle", (state) => {
            let called = false;
            new CTGAPIClientError("TIMEOUT")
                .on("TIMEOUT", () => {})
                .otherwise(() => { called = true; });
            return called;
        })
        .assert("otherwise not called", (state) => state.subject, P.equals(false))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("on unknown string type throws TypeError")
        .stage("attempt", (state) => {
            try {
                new CTGAPIClientError("TIMEOUT").on("NONEXISTENT", () => {});
                return "no throw";
            } catch (e) { return e instanceof TypeError ? "threw" : "wrong error"; }
        })
        .assert("threw", (state) => state.subject, P.equals("threw"))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("on unknown integer code throws TypeError")
        .stage("attempt", (state) => {
            try {
                new CTGAPIClientError("TIMEOUT").on(99999, () => {});
                return "no throw";
            } catch (e) { return e instanceof TypeError ? "threw" : "wrong error"; }
        })
        .assert("threw", (state) => state.subject, P.equals("threw"))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    // ══════════════════════════════════════════════════════════════
    // CTGAPIClientError — HTTP_ERROR Pattern
    // ══════════════════════════════════════════════════════════════

    state = await CTGTest.init("HTTP_ERROR construct with response data")
        .stage("create", (state) => {
            return new CTGAPIClientError("HTTP_ERROR", "Status: 404", {
                status: 404, ok: false, body: { error: "Not found" }
            });
        })
        .assert("type", (state) => state.subject.type, P.equals("HTTP_ERROR"))
        .assert("code", (state) => state.subject.code, P.equals(4000))
        .assert("data status", (state) => state.subject.data.status, P.equals(404))
        .assert("data ok", (state) => state.subject.data.ok, P.equals(false))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("HTTP_ERROR chainable with transport errors")
        .stage("handle", (state) => {
            let result = "unhandled";
            new CTGAPIClientError("HTTP_ERROR", "404", { status: 404 })
                .on("TIMEOUT", () => { result = "timeout"; })
                .on("HTTP_ERROR", () => { result = "http_error"; })
                .otherwise(() => { result = "other"; });
            return result;
        })
        .assert("http handler fired", (state) => state.subject, P.equals("http_error"))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });
}
