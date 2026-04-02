# ctg-js-api-client

`ctg-js-api-client` is a minimal HTTP API client for Node.js. It wraps native `fetch` with JSON as the default content type, bearer token management, file uploads, configurable headers, and base URL prefixing. Responses are returned as structured objects with status, headers, and parsed body. Transport failures throw typed errors; HTTP 4xx/5xx responses return normally with `ok: false`.

**Key Features:**

* **One primitive**: Static `request()` handles all HTTP communication — instance methods add state on top
* **JSON by default**: Request bodies are encoded, response bodies are decoded automatically
* **Multipart when needed**: File references in the body auto-switch to `multipart/form-data`
* **Typed errors**: Transport failures (timeout, DNS, connection) throw with chainable `on`/`otherwise` handlers
* **Security hardened**: SSRF allowlists, private IP blocking, URL credential rejection, header sanitization
* **Zero dependencies**: Only Node.js built-ins

## Install

```
npm install ctg-js-api-client
```

Minimum Node.js version: 19.7+ (native `fetch`, `FormData`, `Headers.getSetCookie()`).

## Examples

### Basic GET

```javascript
import CTGAPIClient from "ctg-js-api-client";

const api = CTGAPIClient.init("https://api.example.com");
const response = await api.GET("/users");
// { status: 200, ok: true, headers: {...}, body: [...] }
```

### POST with JSON Body

```javascript
const response = await api.POST("/users", {
    name: "Alice",
    email: "alice@example.com"
});
```

### Bearer Token Authentication

```javascript
const api = CTGAPIClient.init("https://api.example.com")
    .setToken(jwtToken);

const response = await api.GET("/me");
// Authorization: Bearer <token> sent automatically
```

### Static One-Off Request

Use `request()` without creating an instance:

```javascript
const response = await CTGAPIClient.request(
    "GET",
    "https://api.example.com/health"
);
```

### Error Handling

Transport errors throw typed errors with chainable handlers:

```javascript
try {
    const response = await api.GET("/users");
    if (!response.ok) {
        throw new CTGAPIClientError("HTTP_ERROR", `Status: ${response.status}`, response);
    }
} catch (e) {
    e.on("TIMEOUT", (err) => retryLater())
     .on("HTTP_ERROR", (err) => handleHttpError(err.data))
     .otherwise((err) => logUnexpected(err));
}
```

### File Upload

```javascript
const response = await api.upload("/documents", "./report.pdf", {
    title: "Q4 Report",
    category: "finance"
});
```

### Custom Headers

```javascript
const api = CTGAPIClient.init("https://api.example.com")
    .setHeader("X-Api-Version", "2.0")
    .setHeaders({ "Accept-Language": "en", "X-Request-Source": "cli" });

// Per-request headers override defaults for one call only
const response = await api.GET("/users", {}, { "X-Api-Version": "3.0" });
```

### SSRF Protection

```javascript
const api = CTGAPIClient.init("https://api.example.com", {
    allowed_schemes: ["https"],
    allowed_hosts: ["api.example.com", "api.partner.com"],
    // block_private_ips auto-enabled when allowlists are set
});
```

### Cancellation

```javascript
const controller = new AbortController();
setTimeout(() => controller.abort(), 5000);

const response = await api.GET("/slow-endpoint", {}, {}, {
    signal: controller.signal
});
```

## Configuration

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `timeout` | number | `30` | Request timeout in seconds (must be > 0) |
| `headers` | object | `{}` | Default headers for all requests |
| `allowed_schemes` | string[] | `null` | SSRF scheme allowlist |
| `allowed_hosts` | string[] | `null` | SSRF host allowlist |
| `max_response_bytes` | number | `null` | Maximum response body size |
| `block_private_ips` | boolean | auto | Block private/loopback IPs (auto-enabled with allowlists) |

## Notice

`ctg-js-api-client` is under active development. The core API is stable. Security hardening and error classification may be refined.
