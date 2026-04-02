# CTG JS API Client — Implementation Spec

**Source:** `design-docs/api-client-design-doc.md`
**Language:** JavaScript (ESM, Node.js)
**Code Style:** `ctg-project-proc/code-styles/js-code-style.md`

---

## Design Doc Divergences

This spec intentionally diverges from the design doc in the following areas:

### Async-Native

**Design doc says:** "Sync-first, async-adaptable"

**This spec says:** All HTTP methods return `Promise`. Node.js `fetch` is inherently
async. There is no synchronous HTTP in Node.js without blocking the event loop, so
async is the only correct approach. The behavioral contracts (validation order, error
classification, header merging) apply identically — the difference is only in the
return type wrapper.

### Access Modifiers

**JS code style says:** Use `#` prefix for private methods.

**This spec says:** Use `_` underscore prefix for all non-public methods and fields,
consistent with `ctg-js-test`. ES2022 `#private` fields complicate subclassing and
introduce version constraints. This is a spec-level decision that does not change the
shared JS code style guide.

### File References

**Design doc says:** Support file path, byte array/blob, and readable stream.

**This spec says:** Support `string` (file path — read via `node:fs`), `Buffer`,
`Blob`, and `ReadableStream`. File paths are resolved to `Blob` before adding to
`FormData`. This covers all design doc forms using Node.js native types.

### Error Lookup Return

**Design doc says:** `lookup` returns `null` if not found.

**This spec says:** `lookup` returns `null` if not found (matches design doc). This
differs from `ctg-js-test`'s `CTGTestError.lookup` which throws `TypeError` on unknown
keys. The API client design doc explicitly specifies null-return semantics.

---

## File Layout

```
ctg-js-api-client/
├── src/
│   ├── CTGAPIClient.js           # HTTP client class
│   └── CTGAPIClientError.js      # Typed error class with on/otherwise
├── tests/
│   └── SelfTest.js               # Self-tests (ctg-js-test pipelines)
├── docs/
│   └── spec.md                   # This file
└── package.json
```

### package.json

```json
{
    "name": "ctg-js-api-client",
    "version": "1.0.0",
    "description": "Minimal HTTP API client for Node.js with typed errors and zero dependencies",
    "type": "module",
    "exports": {
        ".": "./src/CTGAPIClient.js",
        "./error": "./src/CTGAPIClientError.js"
    },
    "bin": {}
}
```

- **`"type": "module"`** — all `.js` files are ESM
- **`"exports"`** — two entry points: client class and error class
- **Minimum Node.js version:** 19.7+ (native `fetch`, `FormData`, `Blob`, `Headers.getSetCookie()`)
- **No external dependencies.** Only Node.js built-ins (`node:fs`, `node:path`, `node:url`).

---

## Class: CTGAPIClientError

**File:** `src/CTGAPIClientError.js`
**Design doc ref:** Error System

Extends `Error`. Typed exception with bidirectional name/code lookup and chainable
`on`/`otherwise` handlers.

### Static Fields

```javascript
static TYPES = {
    // 1xxx — Transport
    CONNECTION_FAILED: 1000,
    TIMEOUT:           1001,
    DNS_FAILED:        1002,
    SSL_ERROR:         1003,
    // 2xxx — Request/Response
    REQUEST_FAILED:    2000,
    // 3xxx — Validation
    INVALID_URL:       3000,
    INVALID_METHOD:    3001,
    INVALID_BODY:      3002,
    INVALID_HEADER:    3003,
    // 4xxx — HTTP (caller-initiated)
    HTTP_ERROR:        4000
};
```

### Constructor

```javascript
// CONSTRUCTOR :: STRING|INT, STRING?, * -> this
// Accepts type name or numeric code. Resolves both via bidirectional lookup.
// Unknown types or codes throw a native TypeError immediately.
// If msg is not provided, defaults to the resolved type name.
constructor(typeOrCode, msg, data)
```

- `typeOrCode` — string type name (e.g., `"TIMEOUT"`) or integer code (e.g., `1001`)
- `msg` — optional message; defaults to the resolved type name
- `data` — optional arbitrary context data; defaults to `null`

**Instance fields:**
- `_type` — resolved string type name
- `_code` — resolved numeric code
- `_msg` — message string
- `_data` — context data or `null`
- `_handled` — boolean, `false` initially; set to `true` when an `on()` handler matches

Sets `this.name` to `"CTGAPIClientError"` and `this.message` to the resolved `msg`
for native Error compatibility.

### Properties

```javascript
// GETTER :: VOID -> STRING
get type()

// GETTER :: VOID -> INT
get code()

// GETTER :: VOID -> STRING
get msg()

// GETTER :: VOID -> *
get data()
```

### Instance Methods

```javascript
// :: STRING|INT, (ctgAPIClientError -> VOID) -> this
// If the error matches the given type AND no previous on() has matched,
// calls handler(this) and marks as handled. Returns self for chaining.
// NOTE: Unknown type names or codes throw TypeError immediately.
on(typeOrCode, handler)
```

```javascript
// :: (ctgAPIClientError -> VOID) -> VOID
// Calls handler(this) only if no prior on() matched.
otherwise(handler)
```

### Static Methods

```javascript
// :: STRING|INT -> INT|STRING|VOID
// Bidirectional lookup. String input returns code; integer input returns type name.
// Returns null if not found (does not throw).
static lookup(key)
```

### Language-Specific Decisions

- **Design doc:** "extends the language's native exception/error type" → extends `Error`
- **Design doc:** "Unknown types or codes throw immediately as a native argument error" → constructor throws `TypeError`
- **Design doc:** `lookup` returns null if not found → matches design doc (unlike CTGTestError which throws)
- **Design doc:** `on` with unknown type "throws immediately" → throws `TypeError`
- `_handled` field tracks whether any `on()` has matched; `otherwise` checks this flag
- `on()` returns `this` for chaining; `otherwise()` returns `void`

---

## Class: CTGAPIClient

**File:** `src/CTGAPIClient.js`
**Design doc ref:** Construction, Execution Primitive, Instance HTTP Methods, File Upload, Token Management, Header Management

### Static Fields

```javascript
static VALID_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]);

static HEADER_NAME_REGEX = /^[a-zA-Z0-9!#$%&'*+\-.^_`|~]+$/;

static DEFAULT_TIMEOUT = 30;

static USER_AGENT = "CTGAPIClient/1.0";
```

### Instance Fields

```javascript
_baseUrl        // STRING — API root URL (trailing slash stripped)
_timeout        // INT — request timeout in seconds (default: 30)
_headers        // OBJECT — default headers map
_token          // STRING|VOID — bearer token or null
_allowedSchemes // [STRING]|VOID — SSRF allowlist for schemes (optional)
_allowedHosts   // [STRING]|VOID — SSRF allowlist for hosts (optional)
_maxResponseBytes // INT|VOID — response size limit (optional)
```

### Constructor

```javascript
// CONSTRUCTOR :: STRING, OBJECT? -> this
// Creates a client with base URL and optional config.
// Config keys: timeout, headers, allowed_schemes, allowed_hosts, max_response_bytes
// NOTE: Trailing slash is stripped from baseUrl.
constructor(baseUrl, config = {})
```

#### Timeout Validation

The `timeout` parameter (both in constructor config and static `request()`) follows
these rules:

- Must be `typeof === "number"` and finite. Non-number types throw `TypeError`.
- Value `0` is **not allowed** — a zero timeout would abort every request immediately.
  Throws `TypeError("timeout must be a positive number")`.
- Negative values throw `TypeError("timeout must be a positive number")`.
- Float values are accepted as-is (not truncated). `fetch` timeout is set to
  `Math.round(timeout * 1000)` milliseconds internally.
- Default is `30` (seconds).

**Error type choice:** Timeout validation uses native `TypeError` (not a typed
`CTGAPIClientError`) because the design doc's error types cover HTTP/transport/request
concerns, not constructor argument validation. This is consistent with the design doc's
"unknown types or codes throw immediately as a native argument error" pattern from the
error constructor. All tests should expect `TypeError` for invalid timeout values.

### Properties

```javascript
// GETTER :: VOID -> STRING
get baseUrl()

// GETTER :: VOID -> INT
get timeout()
```

### Instance Methods — Token Management

```javascript
// :: STRING -> this
// Sets bearer token for all subsequent instance requests. Chainable.
setToken(token)

// :: VOID -> this
// Removes the current bearer token. Chainable.
clearToken()

// :: VOID -> STRING|NULL
// Returns the current bearer token or null.
getToken()
```

### Instance Methods — Header Management

All header management methods use **case-insensitive** key matching. Internally,
`_headers` is stored as a plain object with the original casing of the most recent
`setHeader`/`setHeaders` call. Lookups for overwrite and removal are done by
lowercasing both the stored key and the input key. This means
`setHeader("X-Custom", "a")` followed by `setHeader("x-custom", "b")` results in
one header, not two.

```javascript
// :: STRING, STRING -> this
// Sets a single default header. Case-insensitive overwrite. Chainable.
setHeader(name, value)

// :: OBJECT -> this
// Sets multiple default headers at once. Case-insensitive overwrite per key. Chainable.
setHeaders(headers)

// :: STRING -> this
// Removes a default header by name. Case-insensitive match. Chainable.
removeHeader(name)
```

### Instance Methods — HTTP

```javascript
// :: STRING, OBJECT?, OBJECT?, OBJECT? -> PROMISE(OBJECT)
// Instance GET request. No body. opts: { signal: AbortSignal? }
async GET(path, params = {}, headers = {}, opts = {})

// :: STRING, OBJECT?, OBJECT?, OBJECT?, OBJECT? -> PROMISE(OBJECT)
// Instance POST request with optional body. opts: { signal: AbortSignal? }
async POST(path, body = {}, params = {}, headers = {}, opts = {})

// :: STRING, OBJECT?, OBJECT?, OBJECT?, OBJECT? -> PROMISE(OBJECT)
// Instance PUT request with optional body. opts: { signal: AbortSignal? }
async PUT(path, body = {}, params = {}, headers = {}, opts = {})

// :: STRING, OBJECT?, OBJECT?, OBJECT?, OBJECT? -> PROMISE(OBJECT)
// Instance PATCH request with optional body. opts: { signal: AbortSignal? }
async PATCH(path, body = {}, params = {}, headers = {}, opts = {})

// :: STRING, OBJECT?, OBJECT?, OBJECT? -> PROMISE(OBJECT)
// Instance DELETE request. No body. opts: { signal: AbortSignal? }
async DELETE(path, params = {}, headers = {}, opts = {})
```

All instance methods:
1. Build full URL via `_buildUrl(path)`
2. Merge headers via `_mergeHeaders(perRequestHeaders)`
3. Check SSRF allowlists via `_checkSsrf(url)` (if configured)
4. Delegate to `CTGAPIClient.request(method, url, body, params, mergedHeaders, this._timeout, { maxResponseBytes: this._maxResponseBytes, signal: opts.signal })`

### Instance Methods — File Upload

```javascript
// :: STRING, STRING|Buffer|Blob|ReadableStream, OBJECT?, STRING?, OBJECT? -> PROMISE(OBJECT)
// Uploads a file via multipart POST.
// fileSource: file path (string), Buffer, Blob, or ReadableStream
// fields: optional additional form fields
// fieldName: form field name for the file (default: "file")
// opts: { signal: AbortSignal? } — forwarded to POST for cancellation support
// NOTE: String file paths are resolved and read via node:fs. Missing files throw REQUEST_FAILED.
async upload(path, fileSource, fields = {}, fieldName = "file", opts = {})
```

Internally:
1. If `fileSource` is a string (file path):
   - Check existence via `fs.existsSync`. If missing, throw `CTGAPIClientError("REQUEST_FAILED", ...)`
   - Read file into `Buffer` via `fs.readFileSync`
   - Determine filename from path via `path.basename`
   - Create `Blob` from buffer
   - NOTE: Uses sync fs calls. Acceptable for typical upload sizes. For very
     large files, callers should pre-read into a Buffer or Blob and pass that.
2. If `fileSource` is a `Buffer`:
   - Create `Blob` from buffer
   - Use `"upload"` as default filename
3. If `fileSource` is a `Blob`:
   - Use directly
   - Use `"upload"` as default filename
4. If `fileSource` is a Web `ReadableStream`:
   - Wrap in `new Response(stream).blob()` to collect into Blob
   - Use `"upload"` as default filename
   - NOTE: This is the Web Streams API `ReadableStream`, not Node.js
     `stream.Readable`. Callers with Node.js streams should convert via
     `stream.Readable.toWeb(nodeStream)` before passing.
   - WARNING: This fully buffers the stream into memory. For very large files,
     callers should pre-buffer into a `Blob` or `Buffer` with size awareness.
     This tradeoff is intentional — `FormData.set()` requires a `Blob`, and
     streaming multipart upload is out of scope per the design doc.
5. Build `FormData`:
   - `formData.set(fieldName, blob, filename)`
   - Add each field from `fields` map
6. Delegate to `POST(path, formData, {}, {}, opts)` — FormData is passed as the body,
   `opts.signal` forwarded for cancellation support

The multipart detection in `request` recognizes `FormData` instances and skips
JSON encoding.

### Static Methods

```javascript
// Static Factory Method :: STRING, OBJECT? -> ctgAPIClient
// Creates a new client instance. Uses new this(...) for late-bound construction.
static init(baseUrl, config = {})
```

```javascript
// :: STRING, STRING, OBJECT?, OBJECT?, OBJECT?, INT?, OBJECT? -> PROMISE(OBJECT)
// Stateless HTTP execution primitive. Everything delegates to this.
// method: HTTP method string (validated against allowlist)
// url: full URL (not a path)
// body: request body as map or FormData (default: {})
// params: query parameters as map (default: {})
// headers: request headers as map (default: {})
// timeout: timeout in seconds (default: 30)
// opts: optional extensions { maxResponseBytes: INT?, signal: AbortSignal? }
static async request(method, url, body = {}, params = {}, headers = {}, timeout = 30, opts = {})
```

#### `request` Execution Steps

1. **Validate method** — trim, uppercase, check against `VALID_METHODS`. Invalid
   throws `CTGAPIClientError("INVALID_METHOD")`.

2. **Append query parameters** — if `params` is non-empty, build query string and
   append with `?` or `&` separator. Uses `new URLSearchParams(params).toString()`
   for encoding. **Serialization behavior:** `URLSearchParams` flattens values to
   strings via `.toString()`. Arrays are not natively supported — `{ tags: [1, 2] }`
   becomes `tags=1%2C2` (comma-encoded), not `tags=1&tags=2`. Nested objects become
   `[object Object]`. Callers who need array or nested object params must pre-serialize
   them (e.g., `{ tags: "1,2" }` or repeated keys via manual query string building).
   Callers requiring specific array or nested object serialization formats should
   build the query string manually and append it to the path before calling.

3. **Detect multipart** — check if `body` is a `FormData` instance. If not `FormData`,
   check top-level values for `Blob`, `Buffer`, or `ReadableStream` references. If
   found, build a `FormData` from the body map. Nested file references (non-top-level)
   are rejected with `CTGAPIClientError("INVALID_BODY")`.

4. **Auto-set headers** — if body is non-empty, not multipart, and no `Content-Type`
   header is present (case-insensitive check), set `Content-Type: application/json`.
   If no `User-Agent` header is present, set `User-Agent: CTGAPIClient/1.0`.

5. **Validate header names** — each header name must match
   `/^[a-zA-Z0-9!#$%&'*+\-.^_`|~]+$/` (RFC 7230 token characters). Invalid names
   throw `CTGAPIClientError("INVALID_HEADER")`.

6. **Sanitize header values** — strip `\r`, `\n`, and `\0` from all header values.
   No error thrown — silent removal.

7. **Encode body** — for `POST`, `PUT`, `PATCH`:
   - If `FormData`: pass directly to `fetch` (it sets its own Content-Type with boundary)
   - Otherwise: `JSON.stringify(body)`. If encoding fails, throw
     `CTGAPIClientError("INVALID_BODY")`.
   - For `GET`, `DELETE`, `HEAD`, `OPTIONS`: body is **silently ignored** — no
     encoding, no Content-Type auto-set, no error thrown. The `body` parameter in
     the fetch options is set to `undefined`. This is intentional: callers may pass
     a body map that gets ignored for these methods without causing an error.

8. **Build fetch options:**
   ```javascript
   {
       method: method,
       headers: headerEntries,
       body: encodedBody,       // undefined for GET/DELETE/HEAD/OPTIONS
       redirect: "manual",      // do not follow redirects
       signal: abortSignal      // from AbortController with timeout
   }
   ```

9. **Execute fetch** with `AbortController` for timeout. The timeout covers the
   **entire request lifecycle** — connection, TLS, request send, and full response
   body receipt. The timer is only cleared after the body has been fully read:
   ```javascript
   let timedOut = false;
   const controller = new AbortController();
   const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeout * 1000);
   // Caller cancellation: if opts.signal is provided, forward its abort
   if (opts.signal) {
       opts.signal.addEventListener("abort", () => controller.abort(), { once: true });
   }
   try {
       const response = await fetch(url, options);
       // Early reject: check Content-Length before reading body
       if (opts.maxResponseBytes) {
           const cl = parseInt(response.headers.get("content-length"), 10);
           if (!Number.isNaN(cl) && cl > opts.maxResponseBytes) {
               throw new CTGAPIClientError("REQUEST_FAILED", "Response exceeds max size");
           }
       }
       const bodyText = await response.text(); // still under timeout
       clearTimeout(timer);
       // Post-read size check (Content-Length may be absent or inaccurate)
       if (opts.maxResponseBytes && Buffer.byteLength(bodyText) > opts.maxResponseBytes) {
           throw new CTGAPIClientError("REQUEST_FAILED", "Response exceeds max size");
       }
       // parse response using bodyText and response.headers/status
   } catch (err) {
       clearTimeout(timer);
       // classify error (timedOut flag distinguishes timeout from caller abort)
   }
   ```

   **Caller cancellation:** The `opts.signal` parameter accepts an external
   `AbortSignal` for caller-initiated cancellation. When the caller's signal
   aborts, it triggers the internal controller's abort, which cancels the
   in-flight fetch. The resulting `AbortError` is classified as `REQUEST_FAILED`
   (not `TIMEOUT`) since it's caller-initiated, not a timeout. If no `opts.signal`
   is provided, only the internal timeout can abort the request.

   All instance HTTP methods (`GET`, `POST`, etc.) accept an `opts` parameter with
   an optional `signal` key, which is forwarded to the static `request()` call.
   The static `request()` method also accepts `opts.signal` directly. Both paths
   support caller-initiated cancellation per the design doc requirement.

   **Signal edge cases:**
   - **Pre-aborted signal:** If `opts.signal.aborted` is `true` at call time,
     the internal controller aborts immediately before `fetch` is called. The
     error is classified as `REQUEST_FAILED` (caller-initiated).
   - **Simultaneous timeout + caller abort:** If both fire near-simultaneously,
     the `timedOut` flag determines classification. Since `setTimeout` sets
     `timedOut = true` before calling `controller.abort()`, the flag is the
     authoritative signal. If the caller's abort listener fires first (before
     the timer callback), `timedOut` remains `false` → `REQUEST_FAILED`.

10. **Handle transport errors** — classify `fetch` errors (see Error Classification).

11. **Parse response** (using `bodyText` from step 9):
    - Status code from `response.status`
    - Headers from `response.headers` — iterate entries, lowercase keys, comma-join
      duplicates except `set-cookie` (collected as array)
    - Body: read as text, then attempt `JSON.parse`. If parse fails, keep raw string.
      Empty body → empty string.

12. **Return response structure:**
    ```javascript
    {
        status: number,         // HTTP status code
        ok: boolean,            // true if status 200-299
        headers: object,        // lowercase keys
        body: any               // parsed JSON or raw string
    }
    ```

### Private Methods

```javascript
// :: STRING -> STRING
// Builds full URL from baseUrl + path with slash normalization.
_buildUrl(path)
```

`baseUrl` has trailing slash stripped at construction. Path has leading slash stripped.
A single `/` separator is always inserted: `${this._baseUrl}/${strippedPath}`.

```javascript
// :: OBJECT -> OBJECT
// Merges three header layers: automatic < default < per-request.
_mergeHeaders(perRequest)
```

Priority order:
1. **Automatic** (lowest): `User-Agent: CTGAPIClient/1.0`, and if token is set,
   `Authorization: Bearer ${this._token}`
2. **Default**: `this._headers`
3. **Per-request** (highest): `perRequest` argument

Merge is case-insensitive on key names — later layers overwrite earlier layers
using a normalized lowercase lookup, but the original casing of the winning key
is preserved.

```javascript
// :: STRING -> VOID
// Validates URL against allowed_schemes and allowed_hosts. Throws INVALID_URL if blocked.
_checkSsrf(url)
```

Parses URL via `new URL(url)`. Checks:
- If `_allowedSchemes` is set: `url.protocol` (without trailing `:`) must be in the list
- If `_allowedHosts` is set: `url.hostname` must be in the list
- Violations throw `CTGAPIClientError("INVALID_URL", "Blocked by SSRF allowlist")`

```javascript
// :: OBJECT, STRING -> BOOL
// Case-insensitive check for a header name in a headers map.
static _hasHeader(headers, name)
```

```javascript
// :: * -> BOOL
// Checks if a value is a file reference (Blob, Buffer, ReadableStream).
static _isFileRef(value)
```

```javascript
// :: OBJECT, INT? -> VOID
// Recursively checks for nested file references. Throws INVALID_BODY if found at depth > 0.
static _rejectNestedFiles(body, depth = 0)
```

---

## Error Classification

Maps `fetch` errors to typed `CTGAPIClientError` instances.

### Classification Strategy

```javascript
// Inside request() catch block:
static _classifyError(err, url, method)
```

| Condition | Error Type | Detection |
|-----------|-----------|-----------|
| `AbortError` from internal timeout | `TIMEOUT` | `err.name === "AbortError"` AND abort was triggered by the internal timer |
| `AbortError` from caller signal | `REQUEST_FAILED` | `err.name === "AbortError"` AND abort was triggered by `opts.signal` |
| Connection refused | `CONNECTION_FAILED` | `err.cause.code === "ECONNREFUSED"` |
| DNS resolution failed | `DNS_FAILED` | `err.cause.code === "ENOTFOUND"` |
| SSL/TLS error | `SSL_ERROR` | `err.cause.code` starts with `"ERR_TLS"` or `"UNABLE_TO_VERIFY"` or `err.message` contains `"SSL"` or `"certificate"` |
| Malformed URL | `INVALID_URL` | `err.message` contains `"Invalid URL"` or `TypeError` with URL context |
| All other transport errors | `REQUEST_FAILED` | Catch-all |

**Distinguishing timeout from caller abort:** The implementation tracks whether the
internal timer fired using a boolean flag (`timedOut = true` inside the `setTimeout`
callback). When an `AbortError` is caught, check this flag: if `true` → `TIMEOUT`;
if `false` → `REQUEST_FAILED` (caller-initiated cancellation).

**Error data includes:** `{ url, method, code: err.cause?.code }` — never includes
`Authorization` or `Cookie` header values.

### Node.js Fetch Error Structure

Node.js native `fetch` wraps transport errors in a `TypeError` with a `cause` property
containing the underlying system error. The `cause.code` is the most reliable signal
for classification:

- `ECONNREFUSED` → `CONNECTION_FAILED`
- `ENOTFOUND` → `DNS_FAILED`
- `ECONNRESET` → `CONNECTION_FAILED`
- `ERR_TLS_*` / `UNABLE_TO_VERIFY_LEAF_SIGNATURE` → `SSL_ERROR`
- `UND_ERR_CONNECT_TIMEOUT` → `TIMEOUT` (undici-specific)

The `AbortError` from `AbortController.abort()` is the primary timeout signal. The
undici-specific timeout code is a secondary check.

---

## Response Header Parsing

```javascript
// Inside request(), after fetch completes:
static _parseHeaders(fetchHeaders)
```

Iterates `response.headers.entries()`:
- All header names are lowercased
- Duplicate headers are comma-joined per RFC 7230
- Exception: `set-cookie` headers are collected as an array

**Node.js `fetch` header behavior:** The `Headers` object from Node.js native fetch
already lowercases names and comma-joins duplicates for most headers. However,
`headers.entries()` and `headers.forEach()` comma-join `set-cookie` values too,
which is incorrect for `set-cookie` (cookie values contain commas in date fields).

**Required approach:** Use `response.headers.getSetCookie()` which returns an array
of individual `Set-Cookie` values. This method is available in Node 19.7+ and is
the only reliable way to retrieve multiple `Set-Cookie` headers from the fetch API.

**Minimum version impact:** This raises the effective minimum from Node 18 to Node
19.7+ for correct `set-cookie` handling. Node 18 does not provide a reliable path
to individual `Set-Cookie` values through the fetch `Headers` API. Since the design
doc requires correct duplicate `set-cookie` handling as a conformance test, Node
19.7+ is the true minimum.

Update package.json minimum version documentation accordingly. The `"engines"` field
is documented but not enforced:

```json
"engines": { "node": ">=19.7.0" }
```

---

## Security Defaults

Per design doc Security Considerations:

1. **TLS certificate verification** — enabled by default (Node.js `fetch` default behavior).
   No option to disable.

2. **User-Agent** — `CTGAPIClient/1.0` set as automatic header (lowest priority, overridable).

3. **Redirect safety** — `redirect: "manual"` in fetch options. 3xx responses returned
   with `ok: false`.

4. **Proxy isolation** — Node.js native `fetch` does NOT honor `HTTP_PROXY`/`HTTPS_PROXY`
   environment variables by default. No additional configuration needed.

5. **SSRF allowlist** — optional `allowed_schemes` and `allowed_hosts` config. Validated
   in `_checkSsrf` before instance requests. Static `request()` does not validate
   (caller responsibility).

6. **Response size limit** — optional `max_response_bytes` config. Checked after
   response received.

7. **Error data redaction** — error data includes `url`, `method`, and error code.
   Never includes `Authorization` or `Cookie` header values.

---

## Conformance Test Traceability

Every conformance test case from the design doc maps to this implementation as follows:

| Design Doc Section | JS Mechanism |
|---|---|
| Construction | `constructor` + `static init` with config parsing |
| HTTP Method Validation | `VALID_METHODS` Set check in `request()` |
| Header Validation | `HEADER_NAME_REGEX` test in `request()` |
| Header Value Sanitization | `.replace(/[\r\n\0]/g, "")` in `request()` |
| Content-Type Auto-Detection | `_hasHeader` case-insensitive check |
| Body Encoding | `JSON.stringify` with try/catch for `INVALID_BODY` |
| Multipart Detection | `instanceof FormData` + `_isFileRef` top-level check |
| File Upload | `upload()` with path/Buffer/Blob/Stream support |
| Token Management | `_token` field + `Authorization: Bearer` in `_mergeHeaders` |
| Header Merge | `_mergeHeaders` three-layer priority |
| URL Construction | `_buildUrl` with slash normalization |
| Query Parameters | `URLSearchParams` encoding appended to URL |
| Response Structure | `{ status, ok, headers, body }` from parsed fetch response |
| Response Header Parsing | `_parseHeaders` with set-cookie array handling |
| Response Body Parsing | `JSON.parse` with raw string fallback |
| Transport Error Classification | `_classifyError` mapping fetch errors to typed errors |
| Redirect Policy | `redirect: "manual"` in fetch options |
| Error on/otherwise | `_handled` flag with chainable `on()` + `otherwise()` |
| Timeout | `AbortController` + `setTimeout` wrapping fetch |
| SSRF Allowlist | `_checkSsrf` with URL parsing |
| Response Size Limit | Byte length check after `response.text()` |
| Error Data Safety | `{ url, method, code }` — no auth/cookie headers |

---

## What This Spec Does NOT Add

Per design doc compatibility policy: "If a method or behavior is not in this document,
it does not exist."

- No cookie management (use headers directly)
- No request retry or backoff
- No rate limiting
- No response caching
- No streaming responses
- No WebSocket connections
- No OAuth flows (use `setToken` with externally obtained tokens)
- No request/response interceptors or middleware
- No automatic redirect following
- No TypeScript types or browser targets
- No proxy configuration (proxy env vars not honored per security policy)
