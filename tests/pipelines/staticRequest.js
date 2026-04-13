// ══════════════════════════════════════════════════════════════
// CTGAPIClient — Static request()
// ══════════════════════════════════════════════════════════════

// :: OBJECT -> PROMISE(VOID)
export default async function run({ CTGTest, P, CTGTestConsoleFormatter, CTGAPIClient, CTGAPIClientError, BASE_URL, config, collector }) {
    let state;

    state = await CTGTest.init("static request GET")
        .stage("execute", (state) => CTGAPIClient.request("GET", `${BASE_URL}/echo`))
        .assert("status 200", (state) => state.subject.status, P.equals(200))
        .assert("ok true", (state) => state.subject.ok, P.equals(true))
        .assert("method GET", (state) => state.subject.body.method, P.equals("GET"))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("static request POST with body")
        .stage("execute", (state) => CTGAPIClient.request("POST", `${BASE_URL}/echo`, { key: "value" }))
        .assert("method POST", (state) => state.subject.body.method, P.equals("POST"))
        .assert("body sent", (state) => state.subject.body.body.key, P.equals("value"))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("static request with query params")
        .stage("execute", (state) => CTGAPIClient.request("GET", `${BASE_URL}/echo`, {}, { page: "1", limit: "10" }))
        .assert("page param", (state) => state.subject.body.params.page, P.equals("1"))
        .assert("limit param", (state) => state.subject.body.params.limit, P.equals("10"))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("static request with headers")
        .stage("execute", (state) => CTGAPIClient.request("GET", `${BASE_URL}/echo`, {}, {}, { "X-Custom": "test" }))
        .assert("header sent", (state) => state.subject.body.headers["x-custom"], P.equals("test"))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("static request case-insensitive method")
        .stage("execute", (state) => CTGAPIClient.request("post", `${BASE_URL}/echo`, { test: true }))
        .assert("method uppercased", (state) => state.subject.body.method, P.equals("POST"))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("static request empty method throws INVALID_METHOD")
        .stage("attempt", async (state) => {
            try { await CTGAPIClient.request("", `${BASE_URL}/echo`); return "no throw"; }
            catch (e) { return e instanceof CTGAPIClientError && e.type === "INVALID_METHOD" ? "threw" : "wrong error"; }
        })
        .assert("threw", (state) => state.subject, P.equals("threw"))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("static request invalid method throws INVALID_METHOD")
        .stage("attempt", async (state) => {
            try { await CTGAPIClient.request("BOGUS", `${BASE_URL}/echo`); return "no throw"; }
            catch (e) { return e instanceof CTGAPIClientError && e.type === "INVALID_METHOD" ? "threw" : "wrong error"; }
        })
        .assert("threw", (state) => state.subject, P.equals("threw"))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("static request HEAD valid")
        .stage("execute", (state) => CTGAPIClient.request("HEAD", `${BASE_URL}/echo`))
        .assert("status 200", (state) => state.subject.status, P.equals(200))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("static request OPTIONS valid")
        .stage("execute", (state) => CTGAPIClient.request("OPTIONS", `${BASE_URL}/echo`))
        .assert("status 200", (state) => state.subject.status, P.equals(200))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("static request invalid header name throws INVALID_HEADER")
        .stage("attempt", async (state) => {
            try { await CTGAPIClient.request("GET", `${BASE_URL}/echo`, {}, {}, { "Bad Name": "value" }); return "no throw"; }
            catch (e) { return e instanceof CTGAPIClientError && e.type === "INVALID_HEADER" ? "threw" : "wrong error"; }
        })
        .assert("threw", (state) => state.subject, P.equals("threw"))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("static request CRLF in header name throws INVALID_HEADER")
        .stage("attempt", async (state) => {
            try { await CTGAPIClient.request("GET", `${BASE_URL}/echo`, {}, {}, { "Name\r\n": "value" }); return "no throw"; }
            catch (e) { return e instanceof CTGAPIClientError && e.type === "INVALID_HEADER" ? "threw" : "wrong error"; }
        })
        .assert("threw", (state) => state.subject, P.equals("threw"))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("static request CRLF stripped from header values")
        .stage("execute", (state) => {
            return CTGAPIClient.request("GET", `${BASE_URL}/echo`, {}, {}, {
                "X-Test": "safe\r\nX-Injected: evil"
            });
        })
        .assert("no injection", (state) => !state.subject.body.headers["x-test"].includes("\n"), P.equals(true))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("static request Content-Type auto-set for JSON")
        .stage("execute", (state) => CTGAPIClient.request("POST", `${BASE_URL}/echo`, { data: "test" }))
        .assert("content-type json", (state) => state.subject.body.headers["content-type"], P.equals("application/json"))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("static request explicit content-type not duplicated")
        .stage("execute", (state) => {
            return CTGAPIClient.request("POST", `${BASE_URL}/echo`, { data: "test" }, {}, {
                "content-type": "text/plain"
            });
        })
        .assert("caller content-type preserved", (state) => state.subject.body.headers["content-type"], P.equals("text/plain"))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("static request default User-Agent sent")
        .stage("execute", (state) => CTGAPIClient.request("GET", `${BASE_URL}/echo`))
        .assert("has user-agent", (state) => state.subject.body.headers["user-agent"].includes("CTGAPIClient"), P.equals(true))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("static request nested file in array throws INVALID_BODY")
        .stage("attempt", async (state) => {
            try {
                await CTGAPIClient.request("POST", `${BASE_URL}/echo`, {
                    files: [new Blob(["data"])]
                });
                return "no throw";
            } catch (e) { return e instanceof CTGAPIClientError && e.type === "INVALID_BODY" ? "threw" : `wrong: ${e.type}`; }
        })
        .assert("threw INVALID_BODY", (state) => state.subject, P.equals("threw"))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("static request body ignored for GET")
        .stage("execute", (state) => CTGAPIClient.request("GET", `${BASE_URL}/echo`, { ignored: true }))
        .assert("no body sent", (state) => state.subject.body.body === "" || state.subject.body.body === null || state.subject.body.body === undefined, P.equals(true))
        .assert("no content-type", (state) => state.subject.body.headers["content-type"] === undefined, P.equals(true))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("static request body ignored for DELETE")
        .stage("execute", (state) => CTGAPIClient.request("DELETE", `${BASE_URL}/echo`, { ignored: true }))
        .assert("no body sent", (state) => state.subject.body.body === "" || state.subject.body.body === null || state.subject.body.body === undefined, P.equals(true))
        .assert("no content-type", (state) => state.subject.body.headers["content-type"] === undefined, P.equals(true))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("static request query params with existing ?")
        .stage("execute", (state) => CTGAPIClient.request("GET", `${BASE_URL}/echo?existing=1`, {}, { added: "2" }))
        .assert("existing param", (state) => state.subject.body.params.existing, P.equals("1"))
        .assert("added param", (state) => state.subject.body.params.added, P.equals("2"))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("static request array param serialized as comma string")
        .stage("execute", (state) => CTGAPIClient.request("GET", `${BASE_URL}/echo`, {}, { tags: [1, 2, 3] }))
        .assert("array flattened", (state) => state.subject.body.params.tags, P.equals("1,2,3"))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("static request nested object param serialized as string")
        .stage("execute", (state) => CTGAPIClient.request("GET", `${BASE_URL}/echo`, {}, { filter: { active: true } }))
        .assert("object stringified", (state) => state.subject.body.params.filter, P.equals("[object Object]"))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });
}
