// CTGAPIClient - Instance HTTP Methods

// :: OBJECT -> PROMISE(VOID)
export default async function run({ CTGTest, P, CTGTestConsoleFormatter, CTGAPIClient, CTGAPIClientError, BASE_URL, config, collector }) {
    let state;

    state = await CTGTest.init("GET basic")
        .stage("execute", (state) => CTGAPIClient.init(BASE_URL).GET("/echo"))
        .assert("status 200", (state) => state.subject.status, P.equals(200))
        .assert("ok", (state) => state.subject.ok, P.equals(true))
        .assert("method", (state) => state.subject.body.method, P.equals("GET"))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("GET with query params")
        .stage("execute", (state) => CTGAPIClient.init(BASE_URL).GET("/echo", { role: "admin", active: "true" }))
        .assert("role param", (state) => state.subject.body.params.role, P.equals("admin"))
        .assert("active param", (state) => state.subject.body.params.active, P.equals("true"))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("GET with per-request headers")
        .stage("execute", (state) => CTGAPIClient.init(BASE_URL).GET("/echo", {}, { "X-Request-Only": "yes" }))
        .assert("header sent", (state) => state.subject.body.headers["x-request-only"], P.equals("yes"))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("GET JSON endpoint")
        .stage("execute", (state) => CTGAPIClient.init(BASE_URL).GET("/json"))
        .assert("is array", (state) => Array.isArray(state.subject.body.users), P.equals(true))
        .assert("count", (state) => state.subject.body.users.length, P.equals(3))
        .assert("first user", (state) => state.subject.body.users[0].name, P.equals("Alice"))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("POST JSON body")
        .stage("execute", (state) => CTGAPIClient.init(BASE_URL).POST("/echo", { name: "test" }))
        .assert("method", (state) => state.subject.body.method, P.equals("POST"))
        .assert("body", (state) => state.subject.body.body.name, P.equals("test"))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("POST with query params and body")
        .stage("execute", (state) => CTGAPIClient.init(BASE_URL).POST("/echo", { data: "x" }, { page: "2" }))
        .assert("body", (state) => state.subject.body.body.data, P.equals("x"))
        .assert("param", (state) => state.subject.body.params.page, P.equals("2"))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("PUT JSON body")
        .stage("execute", (state) => CTGAPIClient.init(BASE_URL).PUT("/echo", { updated: true }))
        .assert("method", (state) => state.subject.body.method, P.equals("PUT"))
        .assert("body", (state) => state.subject.body.body.updated, P.equals(true))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("PATCH JSON body")
        .stage("execute", (state) => CTGAPIClient.init(BASE_URL).PATCH("/echo", { field: "value" }))
        .assert("method", (state) => state.subject.body.method, P.equals("PATCH"))
        .assert("body", (state) => state.subject.body.body.field, P.equals("value"))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("DELETE basic")
        .stage("execute", (state) => CTGAPIClient.init(BASE_URL).DELETE("/echo"))
        .assert("method", (state) => state.subject.body.method, P.equals("DELETE"))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("DELETE with query params")
        .stage("execute", (state) => CTGAPIClient.init(BASE_URL).DELETE("/echo", { id: "42" }))
        .assert("param", (state) => state.subject.body.params.id, P.equals("42"))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });
}
