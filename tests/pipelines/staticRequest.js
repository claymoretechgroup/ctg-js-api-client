// ══════════════════════════════════════════════════════════════
// CTGAPIClient — Static request()
// ══════════════════════════════════════════════════════════════

// :: OBJECT -> PROMISE(VOID)
export default async function run({ CTGTest, CTGTestConsoleFormatter, CTGAPIClient, CTGAPIClientError, BASE_URL, config, collector }) {
    let state;

    state = await CTGTest.init("static request GET")
        .stage("execute", (state) => { state.subject = CTGAPIClient.request("GET", `${BASE_URL}/echo`); return state; })
        .assert("status 200", (state) => state.subject.status, 200)
        .assert("ok true", (state) => state.subject.ok, true)
        .assert("method GET", (state) => state.subject.body.method, "GET")
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.name, status: state.status });

    state = await CTGTest.init("static request POST with body")
        .stage("execute", (state) => { state.subject = CTGAPIClient.request("POST", `${BASE_URL}/echo`, { key: "value" }); return state; })
        .assert("method POST", (state) => state.subject.body.method, "POST")
        .assert("body sent", (state) => state.subject.body.body.key, "value")
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.name, status: state.status });

    state = await CTGTest.init("static request with query params")
        .stage("execute", (state) => { state.subject = CTGAPIClient.request("GET", `${BASE_URL}/echo`, {}, { page: "1", limit: "10" }); return state; })
        .assert("page param", (state) => state.subject.body.params.page, "1")
        .assert("limit param", (state) => state.subject.body.params.limit, "10")
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.name, status: state.status });

    state = await CTGTest.init("static request with headers")
        .stage("execute", (state) => { state.subject = CTGAPIClient.request("GET", `${BASE_URL}/echo`, {}, {}, { "X-Custom": "test" }); return state; })
        .assert("header sent", (state) => state.subject.body.headers["x-custom"], "test")
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.name, status: state.status });

    state = await CTGTest.init("static request case-insensitive method")
        .stage("execute", (state) => { state.subject = CTGAPIClient.request("post", `${BASE_URL}/echo`, { test: true }); return state; })
        .assert("method uppercased", (state) => state.subject.body.method, "POST")
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.name, status: state.status });

    state = await CTGTest.init("static request empty method throws INVALID_METHOD")
        .stage("attempt", async (state) => {
            try { await CTGAPIClient.request("", `${BASE_URL}/echo`); state.subject = "no throw"; return state; }
            catch (e) { state.subject = e instanceof CTGAPIClientError && e.type === "INVALID_METHOD" ? "threw" : "wrong error"; return state; }
        })
        .assert("threw", (state) => state.subject, "threw")
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.name, status: state.status });

    state = await CTGTest.init("static request invalid method throws INVALID_METHOD")
        .stage("attempt", async (state) => {
            try { await CTGAPIClient.request("BOGUS", `${BASE_URL}/echo`); state.subject = "no throw"; return state; }
            catch (e) { state.subject = e instanceof CTGAPIClientError && e.type === "INVALID_METHOD" ? "threw" : "wrong error"; return state; }
        })
        .assert("threw", (state) => state.subject, "threw")
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.name, status: state.status });

    state = await CTGTest.init("static request HEAD valid")
        .stage("execute", (state) => { state.subject = CTGAPIClient.request("HEAD", `${BASE_URL}/echo`); return state; })
        .assert("status 200", (state) => state.subject.status, 200)
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.name, status: state.status });

    state = await CTGTest.init("static request OPTIONS valid")
        .stage("execute", (state) => { state.subject = CTGAPIClient.request("OPTIONS", `${BASE_URL}/echo`); return state; })
        .assert("status 200", (state) => state.subject.status, 200)
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.name, status: state.status });

    state = await CTGTest.init("static request invalid header name throws INVALID_HEADER")
        .stage("attempt", async (state) => {
            try { await CTGAPIClient.request("GET", `${BASE_URL}/echo`, {}, {}, { "Bad Name": "value" }); state.subject = "no throw"; return state; }
            catch (e) { state.subject = e instanceof CTGAPIClientError && e.type === "INVALID_HEADER" ? "threw" : "wrong error"; return state; }
        })
        .assert("threw", (state) => state.subject, "threw")
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.name, status: state.status });

    state = await CTGTest.init("static request CRLF in header name throws INVALID_HEADER")
        .stage("attempt", async (state) => {
            try { await CTGAPIClient.request("GET", `${BASE_URL}/echo`, {}, {}, { "Name\r\n": "value" }); state.subject = "no throw"; return state; }
            catch (e) { state.subject = e instanceof CTGAPIClientError && e.type === "INVALID_HEADER" ? "threw" : "wrong error"; return state; }
        })
        .assert("threw", (state) => state.subject, "threw")
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.name, status: state.status });

    state = await CTGTest.init("static request CRLF stripped from header values")
        .stage("execute", (state) => {
            state.subject = CTGAPIClient.request("GET", `${BASE_URL}/echo`, {}, {}, {
                "X-Test": "safe\r\nX-Injected: evil"
            });
            return state;
        })
        .assert("no injection", (state) => !state.subject.body.headers["x-test"].includes("\n"), true)
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.name, status: state.status });

    state = await CTGTest.init("static request Content-Type auto-set for JSON")
        .stage("execute", (state) => { state.subject = CTGAPIClient.request("POST", `${BASE_URL}/echo`, { data: "test" }); return state; })
        .assert("content-type json", (state) => state.subject.body.headers["content-type"], "application/json")
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.name, status: state.status });

    state = await CTGTest.init("static request explicit content-type not duplicated")
        .stage("execute", (state) => {
            state.subject = CTGAPIClient.request("POST", `${BASE_URL}/echo`, { data: "test" }, {}, {
                "content-type": "text/plain"
            });
            return state;
        })
        .assert("caller content-type preserved", (state) => state.subject.body.headers["content-type"], "text/plain")
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.name, status: state.status });

    state = await CTGTest.init("static request default User-Agent sent")
        .stage("execute", (state) => { state.subject = CTGAPIClient.request("GET", `${BASE_URL}/echo`); return state; })
        .assert("has user-agent", (state) => state.subject.body.headers["user-agent"].includes("CTGAPIClient"), true)
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.name, status: state.status });

    state = await CTGTest.init("static request nested file in array throws INVALID_BODY")
        .stage("attempt", async (state) => {
            try {
                await CTGAPIClient.request("POST", `${BASE_URL}/echo`, {
                    files: [new Blob(["data"])]
                });
                state.subject = "no throw";
                return state;
            } catch (e) { state.subject = e instanceof CTGAPIClientError && e.type === "INVALID_BODY" ? "threw" : `wrong: ${e.type}`; return state; }
        })
        .assert("threw INVALID_BODY", (state) => state.subject, "threw")
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.name, status: state.status });

    state = await CTGTest.init("static request body ignored for GET")
        .stage("execute", (state) => { state.subject = CTGAPIClient.request("GET", `${BASE_URL}/echo`, { ignored: true }); return state; })
        .assert("no body sent", (state) => state.subject.body.body === "" || state.subject.body.body === null || state.subject.body.body === undefined, true)
        .assert("no content-type", (state) => state.subject.body.headers["content-type"] === undefined, true)
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.name, status: state.status });

    state = await CTGTest.init("static request body ignored for DELETE")
        .stage("execute", (state) => { state.subject = CTGAPIClient.request("DELETE", `${BASE_URL}/echo`, { ignored: true }); return state; })
        .assert("no body sent", (state) => state.subject.body.body === "" || state.subject.body.body === null || state.subject.body.body === undefined, true)
        .assert("no content-type", (state) => state.subject.body.headers["content-type"] === undefined, true)
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.name, status: state.status });

    state = await CTGTest.init("static request query params with existing ?")
        .stage("execute", (state) => { state.subject = CTGAPIClient.request("GET", `${BASE_URL}/echo?existing=1`, {}, { added: "2" }); return state; })
        .assert("existing param", (state) => state.subject.body.params.existing, "1")
        .assert("added param", (state) => state.subject.body.params.added, "2")
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.name, status: state.status });

    state = await CTGTest.init("static request array param serialized as comma string")
        .stage("execute", (state) => { state.subject = CTGAPIClient.request("GET", `${BASE_URL}/echo`, {}, { tags: [1, 2, 3] }); return state; })
        .assert("array flattened", (state) => state.subject.body.params.tags, "1,2,3")
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.name, status: state.status });

    state = await CTGTest.init("static request nested object param serialized as string")
        .stage("execute", (state) => { state.subject = CTGAPIClient.request("GET", `${BASE_URL}/echo`, {}, { filter: { active: true } }); return state; })
        .assert("object stringified", (state) => state.subject.body.params.filter, "[object Object]")
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.name, status: state.status });
}
