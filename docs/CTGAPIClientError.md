# CTGAPIClientError

Typed error class extending `Error` with bidirectional name/code lookup and chainable `on`/`otherwise` handlers. All transport and validation errors thrown by `CTGAPIClient` are instances of this class.

### Properties

| Property | Type | Description |
|----------|------|-------------|
| _type | STRING | Resolved error type name (e.g., `"TIMEOUT"`) |
| _code | INT | Resolved numeric error code (e.g., `1001`) |
| _msg | STRING | Error message (defaults to type name if not provided) |
| _data | * | Arbitrary context data or `null` |
| _handled | BOOL | Whether an `on()` handler has matched |
| name | STRING | Always `"CTGAPIClientError"` (for native Error compatibility) |
| message | STRING | Same as `_msg` (for native Error compatibility) |

### Error Codes

| Code | Type | Category | Description |
|------|------|----------|-------------|
| 1000 | CONNECTION_FAILED | Transport | Connection refused or reset |
| 1001 | TIMEOUT | Transport | Request timed out |
| 1002 | DNS_FAILED | Transport | DNS resolution failed |
| 1003 | SSL_ERROR | Transport | TLS/SSL error |
| 2000 | REQUEST_FAILED | Request | General request failure, file not found, cancelled |
| 3000 | INVALID_URL | Validation | Malformed URL, SSRF blocked, embedded credentials |
| 3001 | INVALID_METHOD | Validation | HTTP method not in allowlist |
| 3002 | INVALID_BODY | Validation | JSON encoding failed, nested file references |
| 3003 | INVALID_HEADER | Validation | Header name contains invalid characters |
| 4000 | HTTP_ERROR | HTTP | Caller-initiated — never thrown by the library |

---

### CONSTRUCTOR :: STRING|INT, STRING?, * -> ctgAPIClientError

Creates a typed error from a type name or numeric code. Resolves both directions via the `TYPES` map. If `msg` is not provided, defaults to the type name. Unknown types or codes throw a native `TypeError`.

```javascript
throw new CTGAPIClientError("TIMEOUT", "Request timed out", { url: "/api/users", method: "GET" });
throw new CTGAPIClientError(3001, "BOGUS is not a valid method");
```

---

### ctgAPIClientError.on :: STRING|INT, (ctgAPIClientError -> VOID) -> this

If the error matches the given type **and** no previous `on` has matched, calls `handler(this)` and marks as handled. Returns `self` for chaining. Unknown type names or codes throw `TypeError`.

```javascript
error
    .on("TIMEOUT", (e) => retryLater())
    .on("CONNECTION_FAILED", (e) => useCache())
    .on("HTTP_ERROR", (e) => handleStatus(e.data.status))
    .otherwise((e) => logUnexpected(e));
```

---

### ctgAPIClientError.otherwise :: (ctgAPIClientError -> VOID) -> VOID

Calls `handler(this)` only if no prior `on()` matched.

---

### CTGAPIClientError.lookup :: STRING|INT -> INT|STRING|NULL

Static bidirectional lookup. String input returns the numeric code. Integer input returns the type name. Returns `null` if not found (does not throw).

```javascript
CTGAPIClientError.lookup("TIMEOUT");  // 1001
CTGAPIClientError.lookup(1001);       // "TIMEOUT"
CTGAPIClientError.lookup("BOGUS");    // null
```
