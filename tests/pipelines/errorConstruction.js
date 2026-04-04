// ══════════════════════════════════════════════════════════════
// CTGAPIClientError — Construction
// ══════════════════════════════════════════════════════════════

// :: OBJECT -> PROMISE(VOID)
export default async function run({ CTGTest, CTGTestConsoleFormatter, CTGAPIClient, CTGAPIClientError, BASE_URL, config, collector }) {
    let state;

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
}
