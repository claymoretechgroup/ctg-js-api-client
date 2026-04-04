// CTGAPIClient - Instance HTTP Methods

// :: OBJECT -> PROMISE(VOID)
export default async function run({ CTGTest, CTGTestConsoleFormatter, CTGAPIClient, CTGAPIClientError, BASE_URL, config, collector }) {
    let state;

    state = await CTGTest.init("GET basic")
        .stage("execute", (state) => { state.subject = CTGAPIClient.init(BASE_URL).GET("/echo"); return state; })
        .assert("status 200", (state) => state.subject.status, 200)
        .assert("ok", (state) => state.subject.ok, true)
        .assert("method", (state) => state.subject.body.method, "GET")
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.name, status: state.status });

    state = await CTGTest.init("GET with query params")
        .stage("execute", (state) => { state.subject = CTGAPIClient.init(BASE_URL).GET("/echo", { role: "admin", active: "true" }); return state; })
        .assert("role param", (state) => state.subject.body.params.role, "admin")
        .assert("active param", (state) => state.subject.body.params.active, "true")
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.name, status: state.status });

    state = await CTGTest.init("GET with per-request headers")
        .stage("execute", (state) => { state.subject = CTGAPIClient.init(BASE_URL).GET("/echo", {}, { "X-Request-Only": "yes" }); return state; })
        .assert("header sent", (state) => state.subject.body.headers["x-request-only"], "yes")
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.name, status: state.status });

    state = await CTGTest.init("GET JSON endpoint")
        .stage("execute", (state) => { state.subject = CTGAPIClient.init(BASE_URL).GET("/json"); return state; })
        .assert("is array", (state) => Array.isArray(state.subject.body.users), true)
        .assert("count", (state) => state.subject.body.users.length, 3)
        .assert("first user", (state) => state.subject.body.users[0].name, "Alice")
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.name, status: state.status });

    state = await CTGTest.init("POST JSON body")
        .stage("execute", (state) => { state.subject = CTGAPIClient.init(BASE_URL).POST("/echo", { name: "test" }); return state; })
        .assert("method", (state) => state.subject.body.method, "POST")
        .assert("body", (state) => state.subject.body.body.name, "test")
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.name, status: state.status });

    state = await CTGTest.init("POST with query params and body")
        .stage("execute", (state) => { state.subject = CTGAPIClient.init(BASE_URL).POST("/echo", { data: "x" }, { page: "2" }); return state; })
        .assert("body", (state) => state.subject.body.body.data, "x")
        .assert("param", (state) => state.subject.body.params.page, "2")
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.name, status: state.status });

    state = await CTGTest.init("PUT JSON body")
        .stage("execute", (state) => { state.subject = CTGAPIClient.init(BASE_URL).PUT("/echo", { updated: true }); return state; })
        .assert("method", (state) => state.subject.body.method, "PUT")
        .assert("body", (state) => state.subject.body.body.updated, true)
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.name, status: state.status });

    state = await CTGTest.init("PATCH JSON body")
        .stage("execute", (state) => { state.subject = CTGAPIClient.init(BASE_URL).PATCH("/echo", { field: "value" }); return state; })
        .assert("method", (state) => state.subject.body.method, "PATCH")
        .assert("body", (state) => state.subject.body.body.field, "value")
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.name, status: state.status });

    state = await CTGTest.init("DELETE basic")
        .stage("execute", (state) => { state.subject = CTGAPIClient.init(BASE_URL).DELETE("/echo"); return state; })
        .assert("method", (state) => state.subject.body.method, "DELETE")
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.name, status: state.status });

    state = await CTGTest.init("DELETE with query params")
        .stage("execute", (state) => { state.subject = CTGAPIClient.init(BASE_URL).DELETE("/echo", { id: "42" }); return state; })
        .assert("param", (state) => state.subject.body.params.id, "42")
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.name, status: state.status });
}
