# CTGAPIClient

Minimal HTTP API client built on native `fetch`. Instance methods manage base URL, default headers, and bearer token state. All HTTP communication flows through the static `request()` primitive.

### Properties

| Property | Type | Description |
|----------|------|-------------|
| _baseUrl | STRING | API root URL (trailing slash stripped) |
| _timeout | NUMBER | Request timeout in seconds |
| _headers | OBJECT | Default headers map (case-insensitive overwrite) |
| _token | STRING\|NULL | Bearer token or null |
| _allowedSchemes | [STRING]\|NULL | SSRF scheme allowlist |
| _allowedHosts | [STRING]\|NULL | SSRF host allowlist |
| _maxResponseBytes | INT\|NULL | Response size limit |
| _blockPrivateIPs | BOOL | Private/loopback IP blocking |

---

### CTGAPIClient.init :: STRING, OBJECT? -> ctgAPIClient

Creates a new client instance. Uses late-bound construction (`new this(...)`) so subclasses inherit correctly. Config keys: `timeout`, `headers`, `allowed_schemes`, `allowed_hosts`, `max_response_bytes`, `block_private_ips`.

```javascript
const api = CTGAPIClient.init("https://api.example.com", {
    timeout: 10,
    headers: { "Accept": "application/json" }
});
```

---

### CONSTRUCTOR :: STRING, OBJECT? -> ctgAPIClient

Stores base URL (trailing slash stripped), validates timeout, validates SSRF config arrays, and sets defaults. Use `CTGAPIClient.init()` instead of calling the constructor directly.

---

### ctgAPIClient.setToken :: STRING -> this

Sets bearer token for all subsequent instance requests. Injected as `Authorization: Bearer {token}` in the automatic header layer (lowest priority). Chainable.

```javascript
api.setToken(jwtToken);
```

---

### ctgAPIClient.clearToken :: VOID -> this

Removes the current bearer token. Chainable.

---

### ctgAPIClient.getToken :: VOID -> STRING|NULL

Returns the current bearer token or null.

---

### ctgAPIClient.setHeader :: STRING, STRING -> this

Sets a single default header for all subsequent requests. Case-insensitive overwrite — `setHeader("X-Custom", "a")` followed by `setHeader("x-custom", "b")` results in one header. Chainable.

```javascript
api.setHeader("X-Api-Version", "2.0");
```

---

### ctgAPIClient.setHeaders :: OBJECT -> this

Sets multiple default headers at once. Case-insensitive overwrite per key. Chainable.

---

### ctgAPIClient.removeHeader :: STRING -> this

Removes a default header by name. Case-insensitive match. Chainable.

---

### ctgAPIClient.GET :: STRING, OBJECT?, OBJECT?, OBJECT? -> PROMISE(OBJECT)

Instance GET request. No body. Params, per-request headers, and opts (with optional `signal` for cancellation) are all optional.

```javascript
const response = await api.GET("/users", { page: "1" }, { "X-Extra": "value" });
```

---

### ctgAPIClient.POST :: STRING, OBJECT?, OBJECT?, OBJECT?, OBJECT? -> PROMISE(OBJECT)

Instance POST request with optional JSON body, query params, per-request headers, and opts.

```javascript
const response = await api.POST("/users", { name: "Alice" });
```

---

### ctgAPIClient.PUT :: STRING, OBJECT?, OBJECT?, OBJECT?, OBJECT? -> PROMISE(OBJECT)

Instance PUT request with optional body, query params, per-request headers, and opts.

---

### ctgAPIClient.PATCH :: STRING, OBJECT?, OBJECT?, OBJECT?, OBJECT? -> PROMISE(OBJECT)

Instance PATCH request with optional body, query params, per-request headers, and opts.

---

### ctgAPIClient.DELETE :: STRING, OBJECT?, OBJECT?, OBJECT? -> PROMISE(OBJECT)

Instance DELETE request. No body. Params, per-request headers, and opts are optional.

---

### ctgAPIClient.upload :: STRING, STRING|Buffer|Blob|ReadableStream, OBJECT?, STRING?, OBJECT? -> PROMISE(OBJECT)

Uploads a file via multipart POST. Accepts file path (string), Buffer, Blob, or Web ReadableStream. Additional form fields and custom field name are optional. Opts supports `signal` for cancellation.

```javascript
const response = await api.upload("/documents", "./report.pdf", {
    title: "Q4 Report"
}, "attachment");
```

---

### CTGAPIClient.request :: STRING, STRING, OBJECT?, OBJECT?, OBJECT?, NUMBER?, OBJECT? -> PROMISE(OBJECT)

Static, stateless HTTP execution primitive. Everything delegates to this. Validates method, rejects URL credentials, appends query params, detects multipart, auto-sets headers, validates header names, sanitizes header values, encodes body, executes fetch with timeout, classifies transport errors, parses response.

Returns: `{ status: INT, ok: BOOL, headers: OBJECT, body: * }`

```javascript
const response = await CTGAPIClient.request("POST", "https://api.example.com/data", {
    key: "value"
}, {}, { "Authorization": "Bearer token" }, 10);
```
