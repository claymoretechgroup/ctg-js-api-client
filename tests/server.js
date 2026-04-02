import { createServer } from "node:http"; // HTTP server for test endpoints

// Minimal test HTTP server providing mock API endpoints for ctg-js-api-client tests.
// Endpoints mirror the PHP test endpoints: echo, auth, status, headers, redirect, json, upload.

// :: VOID -> PROMISE({server: Server, port: INT, baseUrl: STRING})
// Starts the test server on a random available port. Returns server handle and base URL.
export async function startServer() {
    const server = createServer(handleRequest);

    await new Promise((resolve) => {
        server.listen(0, "127.0.0.1", resolve);
    });

    const port = server.address().port;
    const baseUrl = `http://127.0.0.1:${port}`;

    return { server, port, baseUrl };
}

// :: Server -> PROMISE(VOID)
// Stops the test server and waits for all connections to close.
export async function stopServer(server) {
    await new Promise((resolve, reject) => {
        server.close((err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

// :: IncomingMessage, ServerResponse -> VOID
// Routes incoming requests to the appropriate endpoint handler.
function handleRequest(req, res) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const path = url.pathname;

    switch (path) {
        case "/echo":    return handleEcho(req, res, url);
        case "/auth":    return handleAuth(req, res, url);
        case "/status":  return handleStatus(req, res, url);
        case "/headers": return handleHeaders(req, res, url);
        case "/redirect": return handleRedirect(req, res, url);
        case "/json":    return handleJson(req, res, url);
        case "/upload":  return handleUpload(req, res, url);
        case "/slow":    return handleSlow(req, res, url);
        case "/large":   return handleLarge(req, res, url);
        default:
            res.writeHead(404, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Not found", path }));
    }
}

// ── Endpoint Handlers ────────────────────────────────────────

// :: IncomingMessage, ServerResponse, URL -> VOID
// Echoes back the request method, headers, body, and query params.
async function handleEcho(req, res, url) {
    const body = await readBody(req);
    const params = Object.fromEntries(url.searchParams.entries());

    let parsedBody = body;
    try {
        parsedBody = JSON.parse(body);
    } catch {
        // keep raw string
    }

    const result = {
        method: req.method,
        headers: req.headers,
        body: parsedBody,
        params
    };

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(result));
}

// :: IncomingMessage, ServerResponse, URL -> VOID
// Validates bearer token authentication.
async function handleAuth(req, res, url) {
    const auth = req.headers["authorization"];

    if (!auth) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "No Authorization header" }));
        return;
    }

    if (!auth.startsWith("Bearer ")) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid auth scheme" }));
        return;
    }

    const token = auth.slice(7);
    if (token !== "test-jwt-token-12345") {
        res.writeHead(403, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid token" }));
        return;
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
        authenticated: true,
        token,
        method: req.method
    }));
}

// :: IncomingMessage, ServerResponse, URL -> VOID
// Returns the HTTP status code specified by ?code=N.
function handleStatus(req, res, url) {
    const code = parseInt(url.searchParams.get("code") || "200", 10);
    res.writeHead(code, { "Content-Type": "application/json" });
    if (code === 204) {
        res.end();
    } else {
        res.end(JSON.stringify({ status: code, message: `Status ${code}` }));
    }
}

// :: IncomingMessage, ServerResponse, URL -> VOID
// Returns duplicate headers and set-cookie array for header parsing tests.
function handleHeaders(req, res, url) {
    // Node http doesn't support duplicate headers via writeHead easily,
    // but we can use res.setHeader with an array for set-cookie
    res.setHeader("X-Duplicate", "value1, value2");
    res.setHeader("Set-Cookie", ["session=abc; Path=/", "theme=dark; Path=/"]);
    res.setHeader("Content-Type", "application/json");
    res.writeHead(200);
    res.end(JSON.stringify({ ok: true }));
}

// :: IncomingMessage, ServerResponse, URL -> VOID
// Returns a 302 redirect (client should NOT follow).
function handleRedirect(req, res, url) {
    res.writeHead(302, {
        "Location": "/echo",
        "Content-Type": "text/plain"
    });
    res.end("redirecting");
}

// :: IncomingMessage, ServerResponse, URL -> VOID
// Returns a fixed JSON response for JSON parsing tests.
function handleJson(req, res, url) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
        users: [
            { id: 1, name: "Alice", role: "admin", active: true },
            { id: 2, name: "Bob", role: "editor", active: true },
            { id: 3, name: "Charlie", role: "viewer", active: false }
        ]
    }));
}

// :: IncomingMessage, ServerResponse, URL -> VOID
// Handles multipart file upload. Parses form data and returns field/file info.
async function handleUpload(req, res, url) {
    const contentType = req.headers["content-type"] || "";

    if (!contentType.includes("multipart/form-data")) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Expected multipart/form-data" }));
        return;
    }

    const body = await readBodyBuffer(req);
    const boundary = extractBoundary(contentType);

    if (!boundary) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Missing boundary" }));
        return;
    }

    const parts = parseMultipart(body, boundary);
    const files = {};
    const fields = {};

    for (const part of parts) {
        if (part.filename) {
            files[part.name] = {
                name: part.filename,
                type: part.contentType || "application/octet-stream",
                size: part.data.length
            };
        } else {
            fields[part.name] = part.data.toString("utf-8");
        }
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ files, fields }));
}

// :: IncomingMessage, ServerResponse, URL -> VOID
// Delays response for timeout testing. ?delay=N in milliseconds.
function handleSlow(req, res, url) {
    const delay = parseInt(url.searchParams.get("delay") || "5000", 10);
    setTimeout(() => {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ delayed: true, delay }));
    }, delay);
}

// :: IncomingMessage, ServerResponse, URL -> VOID
// Returns a large response body for max_response_bytes testing. ?size=N bytes.
function handleLarge(req, res, url) {
    const size = parseInt(url.searchParams.get("size") || "1024", 10);
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("x".repeat(size));
}

// ── Helpers ──────────────────────────────────────────────────

// :: IncomingMessage -> PROMISE(STRING)
// Reads the full request body as a UTF-8 string.
function readBody(req) {
    return new Promise((resolve) => {
        const chunks = [];
        req.on("data", (chunk) => chunks.push(chunk));
        req.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    });
}

// :: IncomingMessage -> PROMISE(Buffer)
// Reads the full request body as a Buffer.
function readBodyBuffer(req) {
    return new Promise((resolve) => {
        const chunks = [];
        req.on("data", (chunk) => chunks.push(chunk));
        req.on("end", () => resolve(Buffer.concat(chunks)));
    });
}

// :: STRING -> STRING|VOID
// Extracts the multipart boundary from a Content-Type header.
function extractBoundary(contentType) {
    const match = contentType.match(/boundary=(?:"([^"]+)"|([^\s;]+))/);
    return match ? (match[1] || match[2]) : null;
}

// :: Buffer, STRING -> [OBJECT]
// Parses multipart form data into parts with name, filename, contentType, and data.
function parseMultipart(body, boundary) {
    const delimiter = Buffer.from(`--${boundary}`);
    const parts = [];
    let start = indexOf(body, delimiter, 0);

    if (start === -1) return parts;
    start += delimiter.length + 2; // skip delimiter + \r\n

    while (true) {
        const end = indexOf(body, delimiter, start);
        if (end === -1) break;

        const partData = body.subarray(start, end - 2); // strip trailing \r\n
        const headerEnd = indexOf(partData, Buffer.from("\r\n\r\n"), 0);

        if (headerEnd === -1) {
            start = end + delimiter.length + 2;
            continue;
        }

        const headerStr = partData.subarray(0, headerEnd).toString("utf-8");
        const data = partData.subarray(headerEnd + 4);

        const nameMatch = headerStr.match(/name="([^"]+)"/);
        const filenameMatch = headerStr.match(/filename="([^"]+)"/);
        const ctMatch = headerStr.match(/Content-Type:\s*(.+)/i);

        if (nameMatch) {
            parts.push({
                name: nameMatch[1],
                filename: filenameMatch ? filenameMatch[1] : null,
                contentType: ctMatch ? ctMatch[1].trim() : null,
                data
            });
        }

        start = end + delimiter.length;
        // Check for closing --
        if (body[start] === 0x2d && body[start + 1] === 0x2d) break;
        start += 2; // skip \r\n
    }

    return parts;
}

// :: Buffer, Buffer, INT -> INT
// Finds the index of needle in haystack starting from offset. Returns -1 if not found.
function indexOf(haystack, needle, offset) {
    for (let i = offset; i <= haystack.length - needle.length; i++) {
        let found = true;
        for (let j = 0; j < needle.length; j++) {
            if (haystack[i + j] !== needle[j]) {
                found = false;
                break;
            }
        }
        if (found) return i;
    }
    return -1;
}
