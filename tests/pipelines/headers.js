import { writeFileSync, unlinkSync, mkdtempSync } from "node:fs"; // File ops for upload tests
import { join } from "node:path"; // Path utils
import { tmpdir } from "node:os"; // Temp directory

// ══════════════════════════════════════════════════════════════
// Authentication
// ══════════════════════════════════════════════════════════════

// :: OBJECT -> PROMISE(VOID)
export default async function run({ CTGTest, CTGTestConsoleFormatter, CTGAPIClient, CTGAPIClientError, BASE_URL, config, collector }) {
    let state;

    state = await CTGTest.init("auth no token returns 401")
        .stage("execute", (state) => { state.subject = CTGAPIClient.init(BASE_URL).GET("/auth"); return state; })
        .assert("status 401", (state) => state.subject.status, 401)
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.name, status: state.status });

    state = await CTGTest.init("auth wrong token returns 403")
        .stage("execute", (state) => { state.subject = CTGAPIClient.init(BASE_URL).setToken("wrong-token").GET("/auth"); return state; })
        .assert("status 403", (state) => state.subject.status, 403)
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.name, status: state.status });

    state = await CTGTest.init("auth valid token returns 200")
        .stage("execute", (state) => { state.subject = CTGAPIClient.init(BASE_URL).setToken("test-jwt-token-12345").GET("/auth"); return state; })
        .assert("status 200", (state) => state.subject.status, 200)
        .assert("authenticated", (state) => state.subject.body.authenticated, true)
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.name, status: state.status });

    state = await CTGTest.init("auth token persists across requests")
        .stage("execute", async (state) => {
            const client = CTGAPIClient.init(BASE_URL).setToken("test-jwt-token-12345");
            const r1 = await client.GET("/auth");
            const r2 = await client.GET("/auth");
            state.subject = { s1: r1.status, s2: r2.status };
            return state;
        })
        .assert("first ok", (state) => state.subject.s1, 200)
        .assert("second ok", (state) => state.subject.s2, 200)
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.name, status: state.status });

    state = await CTGTest.init("auth clearToken removes auth")
        .stage("execute", async (state) => {
            const client = CTGAPIClient.init(BASE_URL).setToken("test-jwt-token-12345");
            const r1 = await client.GET("/auth");
            client.clearToken();
            const r2 = await client.GET("/auth");
            state.subject = { s1: r1.status, s2: r2.status };
            return state;
        })
        .assert("before clear", (state) => state.subject.s1, 200)
        .assert("after clear", (state) => state.subject.s2, 401)
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.name, status: state.status });

    state = await CTGTest.init("auth getToken lifecycle")
        .stage("check", (state) => {
            const client = CTGAPIClient.init(BASE_URL);
            const before = client.getToken();
            client.setToken("abc");
            const during = client.getToken();
            client.clearToken();
            const after = client.getToken();
            state.subject = { before, during, after };
            return state;
        })
        .assert("before null", (state) => state.subject.before, null)
        .assert("during set", (state) => state.subject.during, "abc")
        .assert("after null", (state) => state.subject.after, null)
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.name, status: state.status });

    state = await CTGTest.init("auth token sent with POST")
        .stage("execute", (state) => { state.subject = CTGAPIClient.init(BASE_URL).setToken("test-jwt-token-12345").POST("/auth", { data: "test" }); return state; })
        .assert("authenticated", (state) => state.subject.body.authenticated, true)
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.name, status: state.status });

    state = await CTGTest.init("auth per-request Authorization overrides token")
        .stage("execute", (state) => {
            state.subject = CTGAPIClient.init(BASE_URL).setToken("test-jwt-token-12345")
                .GET("/echo", {}, { "Authorization": "Basic xyz" });
            return state;
        })
        .assert("override applied", (state) => state.subject.body.headers["authorization"], "Basic xyz")
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.name, status: state.status });

    // ══════════════════════════════════════════════════════════════
    // Header Management
    // ══════════════════════════════════════════════════════════════

    state = await CTGTest.init("headers setHeader sends custom header")
        .stage("execute", (state) => { state.subject = CTGAPIClient.init(BASE_URL).setHeader("X-Custom", "test-value").GET("/echo"); return state; })
        .assert("header sent", (state) => state.subject.body.headers["x-custom"], "test-value")
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.name, status: state.status });

    state = await CTGTest.init("headers setHeaders sends multiple")
        .stage("execute", (state) => {
            state.subject = CTGAPIClient.init(BASE_URL)
                .setHeaders({ "X-First": "one", "X-Second": "two" }).GET("/echo");
            return state;
        })
        .assert("first", (state) => state.subject.body.headers["x-first"], "one")
        .assert("second", (state) => state.subject.body.headers["x-second"], "two")
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.name, status: state.status });

    state = await CTGTest.init("headers removeHeader removes header")
        .stage("execute", (state) => {
            state.subject = CTGAPIClient.init(BASE_URL)
                .setHeader("X-Remove-Me", "present").removeHeader("X-Remove-Me").GET("/echo");
            return state;
        })
        .assert("removed", (state) => state.subject.body.headers["x-remove-me"] === undefined, true)
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.name, status: state.status });

    state = await CTGTest.init("headers case-insensitive overwrite")
        .stage("execute", (state) => {
            state.subject = CTGAPIClient.init(BASE_URL)
                .setHeader("X-Custom", "first").setHeader("x-custom", "second").GET("/echo");
            return state;
        })
        .assert("second wins", (state) => state.subject.body.headers["x-custom"], "second")
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.name, status: state.status });

    state = await CTGTest.init("headers case-insensitive remove")
        .stage("execute", (state) => {
            state.subject = CTGAPIClient.init(BASE_URL)
                .setHeader("X-Custom", "value").removeHeader("x-custom").GET("/echo");
            return state;
        })
        .assert("removed", (state) => state.subject.body.headers["x-custom"] === undefined, true)
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.name, status: state.status });

    state = await CTGTest.init("headers default Authorization overrides automatic token")
        .stage("execute", (state) => {
            state.subject = CTGAPIClient.init(BASE_URL)
                .setToken("test-jwt-token-12345").setHeader("Authorization", "Basic xyz").GET("/echo");
            return state;
        })
        .assert("default wins", (state) => state.subject.body.headers["authorization"], "Basic xyz")
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.name, status: state.status });

    // ── Per-Request Header Merge ─────────────────────────────────

    state = await CTGTest.init("per-request headers override default for one call")
        .stage("execute", async (state) => {
            const client = CTGAPIClient.init(BASE_URL).setHeader("X-Default", "default");
            const r1 = await client.GET("/echo", {}, { "X-Default": "override" });
            const r2 = await client.GET("/echo");
            state.subject = { first: r1.body.headers["x-default"], second: r2.body.headers["x-default"] };
            return state;
        })
        .assert("override", (state) => state.subject.first, "override")
        .assert("reverts", (state) => state.subject.second, "default")
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.name, status: state.status });

    state = await CTGTest.init("per-request headers supplement defaults")
        .stage("execute", (state) => {
            state.subject = CTGAPIClient.init(BASE_URL)
                .setHeader("X-Default", "keep").GET("/echo", {}, { "X-Extra": "added" });
            return state;
        })
        .assert("default kept", (state) => state.subject.body.headers["x-default"], "keep")
        .assert("extra added", (state) => state.subject.body.headers["x-extra"], "added")
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.name, status: state.status });

    state = await CTGTest.init("per-request headers do not persist")
        .stage("execute", async (state) => {
            const client = CTGAPIClient.init(BASE_URL);
            await client.GET("/echo", {}, { "X-Temp": "once" });
            const r = await client.GET("/echo");
            state.subject = r.body.headers["x-temp"];
            return state;
        })
        .assert("not persisted", (state) => state.subject === undefined, true)
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.name, status: state.status });

    // ══════════════════════════════════════════════════════════════
    // File Upload
    // ══════════════════════════════════════════════════════════════

    state = await CTGTest.init("upload file via path")
        .stage("execute", async (state) => {
            const tmpDir = mkdtempSync(join(tmpdir(), "ctg-test-"));
            const filePath = join(tmpDir, "test.txt");
            writeFileSync(filePath, "hello world");
            try {
                state.subject = await CTGAPIClient.init(BASE_URL).upload("/upload", filePath);
                return state;
            } finally { unlinkSync(filePath); }
        })
        .assert("status 200", (state) => state.subject.status, 200)
        .assert("file received", (state) => state.subject.body.files.file !== undefined, true)
        .assert("filename", (state) => state.subject.body.files.file.name, "test.txt")
        .assert("has size", (state) => state.subject.body.files.file.size > 0, true)
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.name, status: state.status });

    state = await CTGTest.init("upload custom field name")
        .stage("execute", async (state) => {
            const tmpDir = mkdtempSync(join(tmpdir(), "ctg-test-"));
            const filePath = join(tmpDir, "photo.jpg");
            writeFileSync(filePath, "fake image");
            try {
                state.subject = await CTGAPIClient.init(BASE_URL).upload("/upload", filePath, {}, "avatar");
                return state;
            } finally { unlinkSync(filePath); }
        })
        .assert("field name", (state) => state.subject.body.files.avatar !== undefined, true)
        .assert("filename", (state) => state.subject.body.files.avatar.name, "photo.jpg")
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.name, status: state.status });

    state = await CTGTest.init("upload with additional fields")
        .stage("execute", async (state) => {
            const tmpDir = mkdtempSync(join(tmpdir(), "ctg-test-"));
            const filePath = join(tmpDir, "doc.pdf");
            writeFileSync(filePath, "pdf content");
            try {
                state.subject = await CTGAPIClient.init(BASE_URL).upload("/upload", filePath, { title: "My Doc", category: "reports" });
                return state;
            } finally { unlinkSync(filePath); }
        })
        .assert("file received", (state) => state.subject.body.files.file !== undefined, true)
        .assert("title field", (state) => state.subject.body.fields.title, "My Doc")
        .assert("category field", (state) => state.subject.body.fields.category, "reports")
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.name, status: state.status });

    state = await CTGTest.init("upload Buffer source")
        .stage("execute", (state) => { state.subject = CTGAPIClient.init(BASE_URL).upload("/upload", Buffer.from("buffer content")); return state; })
        .assert("status 200", (state) => state.subject.status, 200)
        .assert("file received", (state) => state.subject.body.files.file !== undefined, true)
        .assert("has size", (state) => state.subject.body.files.file.size > 0, true)
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.name, status: state.status });

    state = await CTGTest.init("upload missing file throws REQUEST_FAILED")
        .stage("attempt", async (state) => {
            try { await CTGAPIClient.init(BASE_URL).upload("/upload", "/nonexistent/file.txt"); state.subject = "no throw"; return state; }
            catch (e) { state.subject = e instanceof CTGAPIClientError && e.type === "REQUEST_FAILED" ? "threw" : "wrong error"; return state; }
        })
        .assert("threw", (state) => state.subject, "threw")
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.name, status: state.status });

    state = await CTGTest.init("upload cancellation via opts.signal")
        .stage("attempt", async (state) => {
            const tmpDir = mkdtempSync(join(tmpdir(), "ctg-test-"));
            const filePath = join(tmpDir, "cancel.txt");
            writeFileSync(filePath, "cancel me");
            const controller = new AbortController();
            controller.abort();
            try {
                await CTGAPIClient.init(BASE_URL).upload("/upload", filePath, {}, "file", { signal: controller.signal });
                state.subject = "no throw";
                return state;
            } catch (e) {
                state.subject = e instanceof CTGAPIClientError && e.type === "REQUEST_FAILED" ? "threw" : "wrong error";
                return state;
            } finally { unlinkSync(filePath); }
        })
        .assert("threw", (state) => state.subject, "threw")
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.name, status: state.status });

    state = await CTGTest.init("upload cancellation in-flight abort")
        .stage("attempt", async (state) => {
            const tmpDir = mkdtempSync(join(tmpdir(), "ctg-test-"));
            const filePath = join(tmpDir, "inflight.txt");
            writeFileSync(filePath, "inflight data");
            const controller = new AbortController();
            setTimeout(() => controller.abort(), 50);
            try {
                // Upload to /slow endpoint so request is in-flight when abort fires
                await CTGAPIClient.init(BASE_URL).upload("/slow", filePath, { delay: "5000" }, "file", { signal: controller.signal });
                state.subject = "no throw";
                return state;
            } catch (e) {
                state.subject = e instanceof CTGAPIClientError && e.type === "REQUEST_FAILED" ? "threw" : `wrong: ${e.type}`;
                return state;
            } finally { unlinkSync(filePath); }
        })
        .assert("threw REQUEST_FAILED", (state) => state.subject, "threw")
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.name, status: state.status });

    state = await CTGTest.init("upload multipart content-type set")
        .stage("execute", async (state) => {
            const tmpDir = mkdtempSync(join(tmpdir(), "ctg-test-"));
            const filePath = join(tmpDir, "test.txt");
            writeFileSync(filePath, "file data");
            try {
                state.subject = await CTGAPIClient.init(BASE_URL).upload("/echo", filePath);
                return state;
            } finally { unlinkSync(filePath); }
        })
        .assert("multipart content-type", (state) => state.subject.body.headers["content-type"].includes("multipart/form-data"), true)
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ name: state.name, status: state.status });
}
