// ══════════════════════════════════════════════════════════════
// Private IP Blocking
// ══════════════════════════════════════════════════════════════

// :: OBJECT -> PROMISE(VOID)
export default async function run({ CTGTest, CTGTestConsoleFormatter, CTGAPIClient, CTGAPIClientError, BASE_URL, config, collector }) {
    let state;

    state = await CTGTest.init("private IP blocked when SSRF configured")
        .stage("attempt", async (state) => {
            try {
                await CTGAPIClient.init("http://127.0.0.1", { allowed_hosts: ["api.example.com"] }).GET("/echo");
                state.subject = "no throw";
                return state;
            } catch (e) { state.subject = e instanceof CTGAPIClientError && e.type === "INVALID_URL" ? "threw" : `wrong: ${e.type}`; return state; }
        })
        .assert("threw INVALID_URL", (state) => state.subject, "threw")
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.name, status: state.status });

    state = await CTGTest.init("private IP 10.x blocked when block_private_ips true")
        .stage("attempt", async (state) => {
            try {
                await CTGAPIClient.init("http://10.0.0.1", { block_private_ips: true }).GET("/echo");
                state.subject = "no throw";
                return state;
            } catch (e) { state.subject = e instanceof CTGAPIClientError && e.type === "INVALID_URL" ? "threw" : `wrong: ${e.type}`; return state; }
        })
        .assert("threw INVALID_URL", (state) => state.subject, "threw")
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.name, status: state.status });

    state = await CTGTest.init("private IP 192.168.x blocked")
        .stage("attempt", async (state) => {
            try {
                await CTGAPIClient.init("http://192.168.1.1", { block_private_ips: true }).GET("/echo");
                state.subject = "no throw";
                return state;
            } catch (e) { state.subject = e instanceof CTGAPIClientError && e.type === "INVALID_URL" ? "threw" : `wrong: ${e.type}`; return state; }
        })
        .assert("threw INVALID_URL", (state) => state.subject, "threw")
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.name, status: state.status });

    state = await CTGTest.init("private IP 172.16.x blocked")
        .stage("attempt", async (state) => {
            try {
                await CTGAPIClient.init("http://172.16.0.1", { block_private_ips: true }).GET("/echo");
                state.subject = "no throw";
                return state;
            } catch (e) { state.subject = e instanceof CTGAPIClientError && e.type === "INVALID_URL" ? "threw" : `wrong: ${e.type}`; return state; }
        })
        .assert("threw INVALID_URL", (state) => state.subject, "threw")
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.name, status: state.status });

    state = await CTGTest.init("private IP 169.254.x link-local blocked")
        .stage("attempt", async (state) => {
            try {
                await CTGAPIClient.init("http://169.254.1.1", { block_private_ips: true }).GET("/echo");
                state.subject = "no throw";
                return state;
            } catch (e) { state.subject = e instanceof CTGAPIClientError && e.type === "INVALID_URL" ? "threw" : `wrong: ${e.type}`; return state; }
        })
        .assert("threw INVALID_URL", (state) => state.subject, "threw")
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.name, status: state.status });

    state = await CTGTest.init("IPv6 loopback blocked")
        .stage("attempt", async (state) => {
            try {
                await CTGAPIClient.init("http://[::1]", { block_private_ips: true }).GET("/echo");
                state.subject = "no throw";
                return state;
            } catch (e) { state.subject = e instanceof CTGAPIClientError && e.type === "INVALID_URL" ? "threw" : `wrong: ${e.type}`; return state; }
        })
        .assert("threw INVALID_URL", (state) => state.subject, "threw")
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.name, status: state.status });

    state = await CTGTest.init("IPv6 link-local fe90 blocked (fe80::/10 range)")
        .stage("attempt", async (state) => {
            try {
                await CTGAPIClient.init("http://[fe90::1]", { block_private_ips: true }).GET("/echo");
                state.subject = "no throw";
                return state;
            } catch (e) { state.subject = e instanceof CTGAPIClientError && e.type === "INVALID_URL" ? "threw" : `wrong: ${e.type}`; return state; }
        })
        .assert("threw INVALID_URL", (state) => state.subject, "threw")
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.name, status: state.status });

    state = await CTGTest.init("IPv6 link-local febf blocked (fe80::/10 range)")
        .stage("attempt", async (state) => {
            try {
                await CTGAPIClient.init("http://[febf::1]", { block_private_ips: true }).GET("/echo");
                state.subject = "no throw";
                return state;
            } catch (e) { state.subject = e instanceof CTGAPIClientError && e.type === "INVALID_URL" ? "threw" : `wrong: ${e.type}`; return state; }
        })
        .assert("threw INVALID_URL", (state) => state.subject, "threw")
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.name, status: state.status });

    state = await CTGTest.init("IPv4-mapped IPv6 loopback blocked")
        .stage("attempt", async (state) => {
            try {
                await CTGAPIClient.init("http://[::ffff:127.0.0.1]", { block_private_ips: true }).GET("/echo");
                state.subject = "no throw";
                return state;
            } catch (e) { state.subject = e instanceof CTGAPIClientError && e.type === "INVALID_URL" ? "threw" : `wrong: ${e.type}`; return state; }
        })
        .assert("threw INVALID_URL", (state) => state.subject, "threw")
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.name, status: state.status });

    state = await CTGTest.init("IPv4-mapped IPv6 private 10.x blocked")
        .stage("attempt", async (state) => {
            try {
                await CTGAPIClient.init("http://[::ffff:10.0.0.1]", { block_private_ips: true }).GET("/echo");
                state.subject = "no throw";
                return state;
            } catch (e) { state.subject = e instanceof CTGAPIClientError && e.type === "INVALID_URL" ? "threw" : `wrong: ${e.type}`; return state; }
        })
        .assert("threw INVALID_URL", (state) => state.subject, "threw")
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.name, status: state.status });

    state = await CTGTest.init("IPv4-mapped IPv6 hex form loopback blocked (::ffff:7f00:1)")
        .stage("attempt", async (state) => {
            try {
                await CTGAPIClient.init("http://[::ffff:7f00:1]", { block_private_ips: true }).GET("/echo");
                state.subject = "no throw";
                return state;
            } catch (e) { state.subject = e instanceof CTGAPIClientError && e.type === "INVALID_URL" ? "threw" : `wrong: ${e.type}`; return state; }
        })
        .assert("threw INVALID_URL", (state) => state.subject, "threw")
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.name, status: state.status });

    state = await CTGTest.init("IPv4-mapped IPv6 hex form 10.x blocked (::ffff:a00:1)")
        .stage("attempt", async (state) => {
            try {
                await CTGAPIClient.init("http://[::ffff:a00:1]", { block_private_ips: true }).GET("/echo");
                state.subject = "no throw";
                return state;
            } catch (e) { state.subject = e instanceof CTGAPIClientError && e.type === "INVALID_URL" ? "threw" : `wrong: ${e.type}`; return state; }
        })
        .assert("threw INVALID_URL", (state) => state.subject, "threw")
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.name, status: state.status });

    state = await CTGTest.init("max_response_bytes zero throws TypeError")
        .stage("attempt", (state) => {
            try { CTGAPIClient.init(BASE_URL, { max_response_bytes: 0 }); state.subject = "no throw"; return state; }
            catch (e) { state.subject = e instanceof TypeError ? "threw" : "wrong error"; return state; }
        })
        .assert("threw", (state) => state.subject, "threw")
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.name, status: state.status });

    state = await CTGTest.init("max_response_bytes negative throws TypeError")
        .stage("attempt", (state) => {
            try { CTGAPIClient.init(BASE_URL, { max_response_bytes: -1 }); state.subject = "no throw"; return state; }
            catch (e) { state.subject = e instanceof TypeError ? "threw" : "wrong error"; return state; }
        })
        .assert("threw", (state) => state.subject, "threw")
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.name, status: state.status });

    state = await CTGTest.init("max_response_bytes float throws TypeError")
        .stage("attempt", (state) => {
            try { CTGAPIClient.init(BASE_URL, { max_response_bytes: 1.5 }); state.subject = "no throw"; return state; }
            catch (e) { state.subject = e instanceof TypeError ? "threw" : "wrong error"; return state; }
        })
        .assert("threw", (state) => state.subject, "threw")
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.name, status: state.status });

    state = await CTGTest.init("private IPs not blocked when no SSRF config")
        .stage("execute", (state) => { state.subject = CTGAPIClient.init(BASE_URL).GET("/echo"); return state; })
        .assert("status 200", (state) => state.subject.status, 200)
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.name, status: state.status });

    // ══════════════════════════════════════════════════════════════
    // IDN / Punycode Normalization
    // ══════════════════════════════════════════════════════════════

    state = await CTGTest.init("IDN hostname normalized to punycode for allowlist check")
        .stage("attempt", async (state) => {
            // Cyrillic "а" in "аpi" — punycode is "xn--pi-8ta"
            try {
                await CTGAPIClient.init("http://\u0430pi.example.com", {
                    allowed_hosts: ["api.example.com"]
                }).GET("/echo");
                state.subject = "no throw";
                return state;
            } catch (e) {
                // Should reject because punycode form doesn't match "api.example.com"
                state.subject = e instanceof CTGAPIClientError && e.type === "INVALID_URL" ? "threw" : `wrong: ${e.type}`;
                return state;
            }
        })
        .assert("threw INVALID_URL", (state) => state.subject, "threw")
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.name, status: state.status });

    // ══════════════════════════════════════════════════════════════
    // HTTP_ERROR (Caller-Initiated)
    // ══════════════════════════════════════════════════════════════

    state = await CTGTest.init("HTTP_ERROR caller throws on non-ok")
        .stage("execute", async (state) => {
            const r = await CTGAPIClient.init(BASE_URL).GET("/status", { code: "404" });
            try {
                if (!r.ok) throw new CTGAPIClientError("HTTP_ERROR", `Status: ${r.status}`, r);
                state.subject = null;
                return state;
            } catch (e) { state.subject = { type: e.type, status: e.data.status }; return state; }
        })
        .assert("type", (state) => state.subject.type, "HTTP_ERROR")
        .assert("status in data", (state) => state.subject.status, 404)
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.name, status: state.status });

    state = await CTGTest.init("HTTP_ERROR chainable with transport errors")
        .stage("handle", async (state) => {
            const r = await CTGAPIClient.init(BASE_URL).GET("/status", { code: "404" });
            let result = "unhandled";
            try {
                if (!r.ok) throw new CTGAPIClientError("HTTP_ERROR", `Status: ${r.status}`, r);
            } catch (e) {
                e.on("TIMEOUT", () => { result = "timeout"; })
                 .on("HTTP_ERROR", () => { result = "http_error"; })
                 .otherwise(() => { result = "other"; });
            }
            state.subject = result;
            return state;
        })
        .assert("http handler", (state) => state.subject, "http_error")
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.name, status: state.status });

    // ══════════════════════════════════════════════════════════════
    // SSRF Allowlist
    // ══════════════════════════════════════════════════════════════

    state = await CTGTest.init("ssrf disallowed host throws INVALID_URL")
        .stage("attempt", async (state) => {
            try { await CTGAPIClient.init(BASE_URL, { allowed_hosts: ["api.example.com"] }).GET("/echo"); state.subject = "no throw"; return state; }
            catch (e) { state.subject = e instanceof CTGAPIClientError && e.type === "INVALID_URL" ? "threw" : "wrong error"; return state; }
        })
        .assert("threw", (state) => state.subject, "threw")
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.name, status: state.status });

    state = await CTGTest.init("ssrf disallowed scheme throws INVALID_URL")
        .stage("attempt", async (state) => {
            try { await CTGAPIClient.init(BASE_URL, { allowed_schemes: ["https"] }).GET("/echo"); state.subject = "no throw"; return state; }
            catch (e) { state.subject = e instanceof CTGAPIClientError && e.type === "INVALID_URL" ? "threw" : "wrong error"; return state; }
        })
        .assert("threw", (state) => state.subject, "threw")
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.name, status: state.status });

    state = await CTGTest.init("ssrf allowed host succeeds")
        .stage("execute", (state) => {
            state.subject = CTGAPIClient.init(BASE_URL, {
                allowed_hosts: ["127.0.0.1"], block_private_ips: false
            }).GET("/echo");
            return state;
        })
        .assert("status 200", (state) => state.subject.status, 200)
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.name, status: state.status });

    // ══════════════════════════════════════════════════════════════
    // Max Response Bytes
    // ══════════════════════════════════════════════════════════════

    state = await CTGTest.init("max response exceeds limit throws REQUEST_FAILED")
        .stage("attempt", async (state) => {
            try { await CTGAPIClient.init(BASE_URL, { max_response_bytes: 1 }).GET("/large", { size: "1024" }); state.subject = "no throw"; return state; }
            catch (e) { state.subject = e instanceof CTGAPIClientError && e.type === "REQUEST_FAILED" ? "threw" : "wrong error"; return state; }
        })
        .assert("threw", (state) => state.subject, "threw")
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.name, status: state.status });

    state = await CTGTest.init("max response under limit succeeds")
        .stage("execute", (state) => { state.subject = CTGAPIClient.init(BASE_URL, { max_response_bytes: 1048576 }).GET("/large", { size: "100" }); return state; })
        .assert("status 200", (state) => state.subject.status, 200)
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.name, status: state.status });

    // ══════════════════════════════════════════════════════════════
    // Redirect Policy
    // ══════════════════════════════════════════════════════════════

    state = await CTGTest.init("redirect 302 not followed Location present")
        .stage("execute", (state) => { state.subject = CTGAPIClient.init(BASE_URL).GET("/redirect"); return state; })
        .assert("status 302", (state) => state.subject.status, 302)
        .assert("not ok", (state) => state.subject.ok, false)
        .assert("has location", (state) => typeof state.subject.headers["location"], "string")
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.name, status: state.status });
}
