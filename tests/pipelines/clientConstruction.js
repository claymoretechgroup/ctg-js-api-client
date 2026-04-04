// ══════════════════════════════════════════════════════════════
// CTGAPIClient — Construction
// ══════════════════════════════════════════════════════════════

// :: OBJECT -> PROMISE(VOID)
export default async function run({ CTGTest, CTGTestConsoleFormatter, CTGAPIClient, CTGAPIClientError, BASE_URL, config, collector }) {
    let state;

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
}
