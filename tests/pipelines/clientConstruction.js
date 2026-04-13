// ══════════════════════════════════════════════════════════════
// CTGAPIClient — Construction
// ══════════════════════════════════════════════════════════════

// :: OBJECT -> PROMISE(VOID)
export default async function run({ CTGTest, P, CTGTestConsoleFormatter, CTGAPIClient, CTGAPIClientError, BASE_URL, config, collector }) {
    let state;

    state = await CTGTest.init("init static factory")
        .stage("create", (state) => CTGAPIClient.init(BASE_URL))
        .assert("returns instance", (state) => state.subject instanceof CTGAPIClient, P.equals(true))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("init with config")
        .stage("create", (state) => CTGAPIClient.init(BASE_URL, { timeout: 5, headers: { "X-Custom": "value" } }))
        .assert("timeout set", (state) => state.subject.timeout, P.equals(5))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("init strips trailing slash")
        .stage("create", (state) => CTGAPIClient.init(BASE_URL + "/"))
        .assert("no trailing slash", (state) => state.subject.baseUrl, P.equals(BASE_URL))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    // ── Constructor Validation ────────────────────────────────────

    state = await CTGTest.init("non-string baseUrl throws TypeError")
        .stage("attempt", (state) => {
            try { CTGAPIClient.init(123); return "no throw"; }
            catch (e) { return e instanceof TypeError ? "threw" : "wrong error"; }
        })
        .assert("threw", (state) => state.subject, P.equals("threw"))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("allowed_hosts as string throws TypeError")
        .stage("attempt", (state) => {
            try { CTGAPIClient.init(BASE_URL, { allowed_hosts: "example.com" }); return "no throw"; }
            catch (e) { return e instanceof TypeError ? "threw" : "wrong error"; }
        })
        .assert("threw", (state) => state.subject, P.equals("threw"))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("allowed_schemes as string throws TypeError")
        .stage("attempt", (state) => {
            try { CTGAPIClient.init(BASE_URL, { allowed_schemes: "https" }); return "no throw"; }
            catch (e) { return e instanceof TypeError ? "threw" : "wrong error"; }
        })
        .assert("threw", (state) => state.subject, P.equals("threw"))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("allowed_hosts with non-string element throws TypeError")
        .stage("attempt", (state) => {
            try { CTGAPIClient.init(BASE_URL, { allowed_hosts: [123] }); return "no throw"; }
            catch (e) { return e instanceof TypeError ? "threw" : "wrong error"; }
        })
        .assert("threw", (state) => state.subject, P.equals("threw"))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("block_private_ips non-boolean throws TypeError")
        .stage("attempt", (state) => {
            try { CTGAPIClient.init(BASE_URL, { block_private_ips: "false" }); return "no throw"; }
            catch (e) { return e instanceof TypeError ? "threw" : "wrong error"; }
        })
        .assert("threw", (state) => state.subject, P.equals("threw"))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    // ── Timeout Validation ───────────────────────────────────────

    state = await CTGTest.init("timeout zero throws TypeError")
        .stage("attempt", (state) => {
            try { CTGAPIClient.init(BASE_URL, { timeout: 0 }); return "no throw"; }
            catch (e) { return e instanceof TypeError ? "threw" : "wrong error"; }
        })
        .assert("threw", (state) => state.subject, P.equals("threw"))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("timeout negative throws TypeError")
        .stage("attempt", (state) => {
            try { CTGAPIClient.init(BASE_URL, { timeout: -1 }); return "no throw"; }
            catch (e) { return e instanceof TypeError ? "threw" : "wrong error"; }
        })
        .assert("threw", (state) => state.subject, P.equals("threw"))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("timeout non-number throws TypeError")
        .stage("attempt", (state) => {
            try { CTGAPIClient.init(BASE_URL, { timeout: "fast" }); return "no throw"; }
            catch (e) { return e instanceof TypeError ? "threw" : "wrong error"; }
        })
        .assert("threw", (state) => state.subject, P.equals("threw"))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("timeout NaN throws TypeError")
        .stage("attempt", (state) => {
            try { CTGAPIClient.init(BASE_URL, { timeout: NaN }); return "no throw"; }
            catch (e) { return e instanceof TypeError ? "threw" : "wrong error"; }
        })
        .assert("threw", (state) => state.subject, P.equals("threw"))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("timeout Infinity throws TypeError")
        .stage("attempt", (state) => {
            try { CTGAPIClient.init(BASE_URL, { timeout: Infinity }); return "no throw"; }
            catch (e) { return e instanceof TypeError ? "threw" : "wrong error"; }
        })
        .assert("threw", (state) => state.subject, P.equals("threw"))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("timeout float accepted")
        .stage("create", (state) => CTGAPIClient.init(BASE_URL, { timeout: 1.5 }))
        .assert("timeout preserved", (state) => state.subject.timeout, P.equals(1.5))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("static request timeout zero throws TypeError")
        .stage("attempt", async (state) => {
            try { await CTGAPIClient.request("GET", `${BASE_URL}/echo`, {}, {}, {}, 0); return "no throw"; }
            catch (e) { return e instanceof TypeError ? "threw" : "wrong error"; }
        })
        .assert("threw", (state) => state.subject, P.equals("threw"))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("static request timeout negative throws TypeError")
        .stage("attempt", async (state) => {
            try { await CTGAPIClient.request("GET", `${BASE_URL}/echo`, {}, {}, {}, -5); return "no throw"; }
            catch (e) { return e instanceof TypeError ? "threw" : "wrong error"; }
        })
        .assert("threw", (state) => state.subject, P.equals("threw"))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("static request timeout non-number throws TypeError")
        .stage("attempt", async (state) => {
            try { await CTGAPIClient.request("GET", `${BASE_URL}/echo`, {}, {}, {}, "fast"); return "no throw"; }
            catch (e) { return e instanceof TypeError ? "threw" : "wrong error"; }
        })
        .assert("threw", (state) => state.subject, P.equals("threw"))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("static request timeout NaN throws TypeError")
        .stage("attempt", async (state) => {
            try { await CTGAPIClient.request("GET", `${BASE_URL}/echo`, {}, {}, {}, NaN); return "no throw"; }
            catch (e) { return e instanceof TypeError ? "threw" : "wrong error"; }
        })
        .assert("threw", (state) => state.subject, P.equals("threw"))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("static request timeout Infinity throws TypeError")
        .stage("attempt", async (state) => {
            try { await CTGAPIClient.request("GET", `${BASE_URL}/echo`, {}, {}, {}, Infinity); return "no throw"; }
            catch (e) { return e instanceof TypeError ? "threw" : "wrong error"; }
        })
        .assert("threw", (state) => state.subject, P.equals("threw"))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });
}
