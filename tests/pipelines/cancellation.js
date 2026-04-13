// ══════════════════════════════════════════════════════════════
// Caller Cancellation
// ══════════════════════════════════════════════════════════════

// :: OBJECT -> PROMISE(VOID)
export default async function run({ CTGTest, P, CTGTestConsoleFormatter, CTGAPIClient, CTGAPIClientError, BASE_URL, config, collector }) {
    let state;

    state = await CTGTest.init("cancellation AbortSignal cancels request")
        .stage("attempt", async (state) => {
            const controller = new AbortController();
            setTimeout(() => controller.abort(), 50);
            try {
                await CTGAPIClient.init(BASE_URL).GET("/slow", { delay: "5000" }, {}, { signal: controller.signal });
                return "no throw";
            } catch (e) { return e instanceof CTGAPIClientError && e.type === "REQUEST_FAILED" ? "threw" : `wrong: ${e.type}`; }
        })
        .assert("threw REQUEST_FAILED", (state) => state.subject, P.equals("threw"))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.label, status: state.status });

    state = await CTGTest.init("cancellation pre-aborted signal fails immediately")
        .stage("attempt", async (state) => {
            const controller = new AbortController();
            controller.abort();
            try {
                await CTGAPIClient.init(BASE_URL).GET("/echo", {}, {}, { signal: controller.signal });
                return "no throw";
            } catch (e) { return e instanceof CTGAPIClientError && e.type === "REQUEST_FAILED" ? "threw" : `wrong: ${e.type}`; }
        })
        .assert("threw REQUEST_FAILED", (state) => state.subject, P.equals("threw"))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.label, status: state.status });

    state = await CTGTest.init("cancellation static request with signal")
        .stage("attempt", async (state) => {
            const controller = new AbortController();
            setTimeout(() => controller.abort(), 50);
            try {
                await CTGAPIClient.request("GET", `${BASE_URL}/slow?delay=5000`, {}, {}, {}, 30, { signal: controller.signal });
                return "no throw";
            } catch (e) { return e instanceof CTGAPIClientError && e.type === "REQUEST_FAILED" ? "threw" : `wrong: ${e.type}`; }
        })
        .assert("threw REQUEST_FAILED", (state) => state.subject, P.equals("threw"))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.label, status: state.status });

    state = await CTGTest.init("cancellation timeout fires before caller abort -> TIMEOUT")
        .stage("attempt", async (state) => {
            const controller = new AbortController();
            setTimeout(() => controller.abort(), 200);
            try {
                await CTGAPIClient.request("GET", `${BASE_URL}/slow?delay=5000`, {}, {}, {}, 0.05, { signal: controller.signal });
                return "no throw";
            } catch (e) { return e instanceof CTGAPIClientError && e.type === "TIMEOUT" ? "threw" : `wrong: ${e.type}`; }
        })
        .assert("threw TIMEOUT", (state) => state.subject, P.equals("threw"))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.label, status: state.status });

    state = await CTGTest.init("cancellation caller abort fires before timeout -> REQUEST_FAILED")
        .stage("attempt", async (state) => {
            const controller = new AbortController();
            setTimeout(() => controller.abort(), 50);
            try {
                await CTGAPIClient.request("GET", `${BASE_URL}/slow?delay=5000`, {}, {}, {}, 30, { signal: controller.signal });
                return "no throw";
            } catch (e) { return e instanceof CTGAPIClientError && e.type === "REQUEST_FAILED" ? "threw" : `wrong: ${e.type}`; }
        })
        .assert("threw REQUEST_FAILED", (state) => state.subject, P.equals("threw"))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.label, status: state.status });
}
