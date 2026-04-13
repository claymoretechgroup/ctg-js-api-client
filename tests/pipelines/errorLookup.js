// ══════════════════════════════════════════════════════════════
// CTGAPIClientError — Lookup
// ══════════════════════════════════════════════════════════════

// :: OBJECT -> PROMISE(VOID)
export default async function run({ CTGTest, P, CTGTestConsoleFormatter, CTGAPIClient, CTGAPIClientError, BASE_URL, config, collector }) {
    let state;

    state = await CTGTest.init("lookup name to code")
        .assert("TIMEOUT -> 1001", (state) => CTGAPIClientError.lookup("TIMEOUT"), P.equals(1001))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("lookup code to name")
        .assert("1001 -> TIMEOUT", (state) => CTGAPIClientError.lookup(1001), P.equals("TIMEOUT"))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("lookup unknown string returns null")
        .assert("returns null", (state) => CTGAPIClientError.lookup("BOGUS"), P.equals(null))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("lookup unknown integer returns null")
        .assert("returns null", (state) => CTGAPIClientError.lookup(9999), P.equals(null))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("lookup all error codes")
        .stage("collect", (state) => {
            return [
                CTGAPIClientError.lookup("CONNECTION_FAILED"),
                CTGAPIClientError.lookup("TIMEOUT"),
                CTGAPIClientError.lookup("DNS_FAILED"),
                CTGAPIClientError.lookup("SSL_ERROR"),
                CTGAPIClientError.lookup("REQUEST_FAILED"),
                CTGAPIClientError.lookup("INVALID_URL"),
                CTGAPIClientError.lookup("INVALID_METHOD"),
                CTGAPIClientError.lookup("INVALID_BODY"),
                CTGAPIClientError.lookup("INVALID_HEADER"),
                CTGAPIClientError.lookup("HTTP_ERROR"),
            ];
        })
        .assert("all codes correct", (state) => JSON.stringify(state.subject),
            P.equals(JSON.stringify([1000, 1001, 1002, 1003, 2000, 3000, 3001, 3002, 3003, 4000])))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });
}
