// ══════════════════════════════════════════════════════════════
// CTGAPIClientError — Construction
// ══════════════════════════════════════════════════════════════

// :: OBJECT -> PROMISE(VOID)
export default async function run({ CTGTest, P, CTGTestConsoleFormatter, CTGAPIClient, CTGAPIClientError, BASE_URL, config, collector }) {
    let state;

    state = await CTGTest.init("construct with type name")
        .stage("create", (state) => new CTGAPIClientError("TIMEOUT", "timed out", { url: "/test" }))
        .assert("code is 1001", (state) => state.subject.code, P.equals(1001))
        .assert("type is TIMEOUT", (state) => state.subject.type, P.equals("TIMEOUT"))
        .assert("msg is set", (state) => state.subject.msg, P.equals("timed out"))
        .assert("data url", (state) => state.subject.data.url, P.equals("/test"))
        .assert("name is CTGAPIClientError", (state) => state.subject.name, P.equals("CTGAPIClientError"))
        .assert("is Error instance", (state) => state.subject instanceof Error, P.equals(true))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("construct with integer code")
        .stage("create", (state) => new CTGAPIClientError(1000, "refused"))
        .assert("type is CONNECTION_FAILED", (state) => state.subject.type, P.equals("CONNECTION_FAILED"))
        .assert("code is 1000", (state) => state.subject.code, P.equals(1000))
        .assert("msg is refused", (state) => state.subject.msg, P.equals("refused"))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("construct defaults msg to type name")
        .stage("create", (state) => new CTGAPIClientError("DNS_FAILED"))
        .assert("msg is type name", (state) => state.subject.msg, P.equals("DNS_FAILED"))
        .assert("data is null", (state) => state.subject.data, P.equals(null))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("construct unknown type throws TypeError")
        .stage("attempt", (state) => {
            try { new CTGAPIClientError("BOGUS"); return "no throw"; }
            catch (e) { return e instanceof TypeError ? "threw TypeError" : "wrong error"; }
        })
        .assert("threw", (state) => state.subject, P.equals("threw TypeError"))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("construct unknown code throws TypeError")
        .stage("attempt", (state) => {
            try { new CTGAPIClientError(9999); return "no throw"; }
            catch (e) { return e instanceof TypeError ? "threw TypeError" : "wrong error"; }
        })
        .assert("threw", (state) => state.subject, P.equals("threw TypeError"))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });
}
