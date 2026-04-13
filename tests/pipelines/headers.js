import { writeFileSync, unlinkSync, mkdtempSync } from "node:fs"; // File ops for upload tests
import { join } from "node:path"; // Path utils
import { tmpdir } from "node:os"; // Temp directory

// ══════════════════════════════════════════════════════════════
// Authentication
// ══════════════════════════════════════════════════════════════

// :: OBJECT -> PROMISE(VOID)
export default async function run({ CTGTest, P, CTGTestConsoleFormatter, CTGAPIClient, CTGAPIClientError, BASE_URL, config, collector }) {
    let state;

    state = await CTGTest.init("auth no token returns 401")
        .stage("execute", (state) => CTGAPIClient.init(BASE_URL).GET("/auth"))
        .assert("status 401", (state) => state.subject.status, P.equals(401))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("auth wrong token returns 403")
        .stage("execute", (state) => CTGAPIClient.init(BASE_URL).setToken("wrong-token").GET("/auth"))
        .assert("status 403", (state) => state.subject.status, P.equals(403))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("auth valid token returns 200")
        .stage("execute", (state) => CTGAPIClient.init(BASE_URL).setToken("test-jwt-token-12345").GET("/auth"))
        .assert("status 200", (state) => state.subject.status, P.equals(200))
        .assert("authenticated", (state) => state.subject.body.authenticated, P.equals(true))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("auth token persists across requests")
        .stage("execute", async (state) => {
            const client = CTGAPIClient.init(BASE_URL).setToken("test-jwt-token-12345");
            const r1 = await client.GET("/auth");
            const r2 = await client.GET("/auth");
            return { s1: r1.status, s2: r2.status };
        })
        .assert("first ok", (state) => state.subject.s1, P.equals(200))
        .assert("second ok", (state) => state.subject.s2, P.equals(200))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("auth clearToken removes auth")
        .stage("execute", async (state) => {
            const client = CTGAPIClient.init(BASE_URL).setToken("test-jwt-token-12345");
            const r1 = await client.GET("/auth");
            client.clearToken();
            const r2 = await client.GET("/auth");
            return { s1: r1.status, s2: r2.status };
        })
        .assert("before clear", (state) => state.subject.s1, P.equals(200))
        .assert("after clear", (state) => state.subject.s2, P.equals(401))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("auth getToken lifecycle")
        .stage("check", (state) => {
            const client = CTGAPIClient.init(BASE_URL);
            const before = client.getToken();
            client.setToken("abc");
            const during = client.getToken();
            client.clearToken();
            const after = client.getToken();
            return { before, during, after };
        })
        .assert("before null", (state) => state.subject.before, P.equals(null))
        .assert("during set", (state) => state.subject.during, P.equals("abc"))
        .assert("after null", (state) => state.subject.after, P.equals(null))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("auth token sent with POST")
        .stage("execute", (state) => CTGAPIClient.init(BASE_URL).setToken("test-jwt-token-12345").POST("/auth", { data: "test" }))
        .assert("authenticated", (state) => state.subject.body.authenticated, P.equals(true))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("auth per-request Authorization overrides token")
        .stage("execute", (state) => {
            return CTGAPIClient.init(BASE_URL).setToken("test-jwt-token-12345")
                .GET("/echo", {}, { "Authorization": "Basic xyz" });
        })
        .assert("override applied", (state) => state.subject.body.headers["authorization"], P.equals("Basic xyz"))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    // ══════════════════════════════════════════════════════════════
    // Header Management
    // ══════════════════════════════════════════════════════════════

    state = await CTGTest.init("headers setHeader sends custom header")
        .stage("execute", (state) => CTGAPIClient.init(BASE_URL).setHeader("X-Custom", "test-value").GET("/echo"))
        .assert("header sent", (state) => state.subject.body.headers["x-custom"], P.equals("test-value"))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("headers setHeaders sends multiple")
        .stage("execute", (state) => {
            return CTGAPIClient.init(BASE_URL)
                .setHeaders({ "X-First": "one", "X-Second": "two" }).GET("/echo");
        })
        .assert("first", (state) => state.subject.body.headers["x-first"], P.equals("one"))
        .assert("second", (state) => state.subject.body.headers["x-second"], P.equals("two"))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("headers removeHeader removes header")
        .stage("execute", (state) => {
            return CTGAPIClient.init(BASE_URL)
                .setHeader("X-Remove-Me", "present").removeHeader("X-Remove-Me").GET("/echo");
        })
        .assert("removed", (state) => state.subject.body.headers["x-remove-me"] === undefined, P.equals(true))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("headers case-insensitive overwrite")
        .stage("execute", (state) => {
            return CTGAPIClient.init(BASE_URL)
                .setHeader("X-Custom", "first").setHeader("x-custom", "second").GET("/echo");
        })
        .assert("second wins", (state) => state.subject.body.headers["x-custom"], P.equals("second"))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("headers case-insensitive remove")
        .stage("execute", (state) => {
            return CTGAPIClient.init(BASE_URL)
                .setHeader("X-Custom", "value").removeHeader("x-custom").GET("/echo");
        })
        .assert("removed", (state) => state.subject.body.headers["x-custom"] === undefined, P.equals(true))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("headers default Authorization overrides automatic token")
        .stage("execute", (state) => {
            return CTGAPIClient.init(BASE_URL)
                .setToken("test-jwt-token-12345").setHeader("Authorization", "Basic xyz").GET("/echo");
        })
        .assert("default wins", (state) => state.subject.body.headers["authorization"], P.equals("Basic xyz"))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    // ── Per-Request Header Merge ─────────────────────────────────

    state = await CTGTest.init("per-request headers override default for one call")
        .stage("execute", async (state) => {
            const client = CTGAPIClient.init(BASE_URL).setHeader("X-Default", "default");
            const r1 = await client.GET("/echo", {}, { "X-Default": "override" });
            const r2 = await client.GET("/echo");
            return { first: r1.body.headers["x-default"], second: r2.body.headers["x-default"] };
        })
        .assert("override", (state) => state.subject.first, P.equals("override"))
        .assert("reverts", (state) => state.subject.second, P.equals("default"))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("per-request headers supplement defaults")
        .stage("execute", (state) => {
            return CTGAPIClient.init(BASE_URL)
                .setHeader("X-Default", "keep").GET("/echo", {}, { "X-Extra": "added" });
        })
        .assert("default kept", (state) => state.subject.body.headers["x-default"], P.equals("keep"))
        .assert("extra added", (state) => state.subject.body.headers["x-extra"], P.equals("added"))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("per-request headers do not persist")
        .stage("execute", async (state) => {
            const client = CTGAPIClient.init(BASE_URL);
            await client.GET("/echo", {}, { "X-Temp": "once" });
            const r = await client.GET("/echo");
            return r.body.headers["x-temp"];
        })
        .assert("not persisted", (state) => state.subject === undefined, P.equals(true))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    // ══════════════════════════════════════════════════════════════
    // File Upload
    // ══════════════════════════════════════════════════════════════

    state = await CTGTest.init("upload file via path")
        .stage("execute", async (state) => {
            const tmpDir = mkdtempSync(join(tmpdir(), "ctg-test-"));
            const filePath = join(tmpDir, "test.txt");
            writeFileSync(filePath, "hello world");
            try {
                return await CTGAPIClient.init(BASE_URL).upload("/upload", filePath);
            } finally { unlinkSync(filePath); }
        })
        .assert("status 200", (state) => state.subject.status, P.equals(200))
        .assert("file received", (state) => state.subject.body.files.file !== undefined, P.equals(true))
        .assert("filename", (state) => state.subject.body.files.file.name, P.equals("test.txt"))
        .assert("has size", (state) => state.subject.body.files.file.size > 0, P.equals(true))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("upload custom field name")
        .stage("execute", async (state) => {
            const tmpDir = mkdtempSync(join(tmpdir(), "ctg-test-"));
            const filePath = join(tmpDir, "photo.jpg");
            writeFileSync(filePath, "fake image");
            try {
                return await CTGAPIClient.init(BASE_URL).upload("/upload", filePath, {}, "avatar");
            } finally { unlinkSync(filePath); }
        })
        .assert("field name", (state) => state.subject.body.files.avatar !== undefined, P.equals(true))
        .assert("filename", (state) => state.subject.body.files.avatar.name, P.equals("photo.jpg"))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("upload with additional fields")
        .stage("execute", async (state) => {
            const tmpDir = mkdtempSync(join(tmpdir(), "ctg-test-"));
            const filePath = join(tmpDir, "doc.pdf");
            writeFileSync(filePath, "pdf content");
            try {
                return await CTGAPIClient.init(BASE_URL).upload("/upload", filePath, { title: "My Doc", category: "reports" });
            } finally { unlinkSync(filePath); }
        })
        .assert("file received", (state) => state.subject.body.files.file !== undefined, P.equals(true))
        .assert("title field", (state) => state.subject.body.fields.title, P.equals("My Doc"))
        .assert("category field", (state) => state.subject.body.fields.category, P.equals("reports"))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("upload Buffer source")
        .stage("execute", (state) => CTGAPIClient.init(BASE_URL).upload("/upload", Buffer.from("buffer content")))
        .assert("status 200", (state) => state.subject.status, P.equals(200))
        .assert("file received", (state) => state.subject.body.files.file !== undefined, P.equals(true))
        .assert("has size", (state) => state.subject.body.files.file.size > 0, P.equals(true))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("upload missing file throws REQUEST_FAILED")
        .stage("attempt", async (state) => {
            try { await CTGAPIClient.init(BASE_URL).upload("/upload", "/nonexistent/file.txt"); return "no throw"; }
            catch (e) { return e instanceof CTGAPIClientError && e.type === "REQUEST_FAILED" ? "threw" : "wrong error"; }
        })
        .assert("threw", (state) => state.subject, P.equals("threw"))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("upload cancellation via opts.signal")
        .stage("attempt", async (state) => {
            const tmpDir = mkdtempSync(join(tmpdir(), "ctg-test-"));
            const filePath = join(tmpDir, "cancel.txt");
            writeFileSync(filePath, "cancel me");
            const controller = new AbortController();
            controller.abort();
            try {
                await CTGAPIClient.init(BASE_URL).upload("/upload", filePath, {}, "file", { signal: controller.signal });
                return "no throw";
            } catch (e) {
                return e instanceof CTGAPIClientError && e.type === "REQUEST_FAILED" ? "threw" : "wrong error";
            } finally { unlinkSync(filePath); }
        })
        .assert("threw", (state) => state.subject, P.equals("threw"))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

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
                return "no throw";
            } catch (e) {
                return e instanceof CTGAPIClientError && e.type === "REQUEST_FAILED" ? "threw" : `wrong: ${e.type}`;
            } finally { unlinkSync(filePath); }
        })
        .assert("threw REQUEST_FAILED", (state) => state.subject, P.equals("threw"))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });

    state = await CTGTest.init("upload multipart content-type set")
        .stage("execute", async (state) => {
            const tmpDir = mkdtempSync(join(tmpdir(), "ctg-test-"));
            const filePath = join(tmpDir, "test.txt");
            writeFileSync(filePath, "file data");
            try {
                return await CTGAPIClient.init(BASE_URL).upload("/echo", filePath);
            } finally { unlinkSync(filePath); }
        })
        .assert("multipart content-type", (state) => state.subject.body.headers["content-type"].includes("multipart/form-data"), P.equals(true))
        .start(null, config);
    process.stdout.write(CTGTestConsoleFormatter.format(state) + "\n");
    collector.push({ label: state.label, status: state.status });
}
