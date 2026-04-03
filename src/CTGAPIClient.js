import { existsSync, readFileSync } from "node:fs"; // File operations for upload
import { basename } from "node:path"; // Path utils for filename extraction

import CTGAPIClientError from "./CTGAPIClientError.js"; // Typed error class

// Minimal HTTP API client with typed errors, token management, and security hardening
export default class CTGAPIClient {

    /* Static Fields */

    static VALID_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]);

    static HEADER_NAME_REGEX = /^[a-zA-Z0-9!#$%&'*+\-.^_`|~]+$/;

    static DEFAULT_TIMEOUT = 30;

    static USER_AGENT = "CTGAPIClient/1.0";

    static METHODS_WITH_BODY = new Set(["POST", "PUT", "PATCH"]);

    static PRIVATE_IP_PATTERNS = [
        /^127\./,                         // 127.0.0.0/8 loopback
        /^10\./,                          // 10.0.0.0/8 private
        /^172\.(1[6-9]|2\d|3[01])\./,    // 172.16.0.0/12 private
        /^192\.168\./,                    // 192.168.0.0/16 private
        /^169\.254\./,                    // 169.254.0.0/16 link-local
        /^0\.0\.0\.0$/,                   // unspecified
    ];

    static PRIVATE_IPV6 = new Set(["::1", "::", "0:0:0:0:0:0:0:1", "0:0:0:0:0:0:0:0"]);

    // CONSTRUCTOR :: STRING, OBJECT? -> this
    // Creates a client with base URL and optional config.
    // Config keys: timeout, headers, allowed_schemes, allowed_hosts, max_response_bytes, block_private_ips
    // NOTE: Trailing slash is stripped from baseUrl.
    constructor(baseUrl, config = {}) {
        if (typeof baseUrl !== "string") {
            throw new TypeError("baseUrl must be a string");
        }
        this._baseUrl = baseUrl.replace(/\/+$/, "");
        this._timeout = config.timeout !== undefined ? config.timeout : CTGAPIClient.DEFAULT_TIMEOUT;
        this._headers = config.headers ? { ...config.headers } : {};
        this._token = null;
        this._allowedSchemes = CTGAPIClient._validateStringArray(config.allowed_schemes, "allowed_schemes");
        this._allowedHosts = CTGAPIClient._validateStringArray(config.allowed_hosts, "allowed_hosts");
        this._maxResponseBytes = CTGAPIClient._validatePositiveInt(config.max_response_bytes, "max_response_bytes");
        if (config.block_private_ips !== undefined && typeof config.block_private_ips !== "boolean") {
            throw new TypeError("block_private_ips must be a boolean");
        }
        this._blockPrivateIPs = config.block_private_ips !== undefined
            ? config.block_private_ips
            : (this._allowedSchemes !== null || this._allowedHosts !== null);

        CTGAPIClient._validateTimeout(this._timeout);
    }

    /**
     *
     * Properties
     *
     */

    // GETTER :: VOID -> STRING
    get baseUrl() { return this._baseUrl; }

    // GETTER :: VOID -> NUMBER
    get timeout() { return this._timeout; }

    /**
     *
     * Instance Methods
     *
     */

    // :: STRING -> this
    // Sets bearer token for all subsequent instance requests. Chainable.
    setToken(token) {
        this._token = token;
        return this;
    }

    // :: VOID -> this
    // Removes the current bearer token. Chainable.
    clearToken() {
        this._token = null;
        return this;
    }

    // :: VOID -> STRING|NULL
    // Returns the current bearer token or null.
    getToken() {
        return this._token;
    }

    // :: STRING, STRING -> this
    // Sets a single default header. Case-insensitive overwrite. Chainable.
    setHeader(name, value) {
        this._removeHeaderKey(name);
        this._headers[name] = value;
        return this;
    }

    // :: OBJECT -> this
    // Sets multiple default headers at once. Case-insensitive overwrite per key. Chainable.
    setHeaders(headers) {
        for (const [name, value] of Object.entries(headers)) {
            this.setHeader(name, value);
        }
        return this;
    }

    // :: STRING -> this
    // Removes a default header by name. Case-insensitive match. Chainable.
    removeHeader(name) {
        this._removeHeaderKey(name);
        return this;
    }

    // :: STRING, OBJECT?, OBJECT?, OBJECT? -> PROMISE(OBJECT)
    // Instance GET request. No body.
    async GET(path, params = {}, headers = {}, opts = {}) {
        return this._instanceRequest("GET", path, {}, params, headers, opts);
    }

    // :: STRING, OBJECT?, OBJECT?, OBJECT?, OBJECT? -> PROMISE(OBJECT)
    // Instance POST request with optional body.
    async POST(path, body = {}, params = {}, headers = {}, opts = {}) {
        return this._instanceRequest("POST", path, body, params, headers, opts);
    }

    // :: STRING, OBJECT?, OBJECT?, OBJECT?, OBJECT? -> PROMISE(OBJECT)
    // Instance PUT request with optional body.
    async PUT(path, body = {}, params = {}, headers = {}, opts = {}) {
        return this._instanceRequest("PUT", path, body, params, headers, opts);
    }

    // :: STRING, OBJECT?, OBJECT?, OBJECT?, OBJECT? -> PROMISE(OBJECT)
    // Instance PATCH request with optional body.
    async PATCH(path, body = {}, params = {}, headers = {}, opts = {}) {
        return this._instanceRequest("PATCH", path, body, params, headers, opts);
    }

    // :: STRING, OBJECT?, OBJECT?, OBJECT? -> PROMISE(OBJECT)
    // Instance DELETE request. No body.
    async DELETE(path, params = {}, headers = {}, opts = {}) {
        return this._instanceRequest("DELETE", path, {}, params, headers, opts);
    }

    // :: STRING, STRING|Buffer|Blob|ReadableStream, OBJECT?, STRING?, OBJECT? -> PROMISE(OBJECT)
    // Uploads a file via multipart POST.
    // NOTE: String file paths are resolved and read via node:fs. Missing files throw REQUEST_FAILED.
    async upload(path, fileSource, fields = {}, fieldName = "file", opts = {}) {
        let blob;
        let filename = "upload";

        if (typeof fileSource === "string") {
            if (!existsSync(fileSource)) {
                throw new CTGAPIClientError("REQUEST_FAILED", `File not found: ${fileSource}`);
            }
            const buffer = readFileSync(fileSource);
            filename = basename(fileSource);
            blob = new Blob([buffer]);
        } else if (Buffer.isBuffer(fileSource)) {
            blob = new Blob([fileSource]);
        } else if (fileSource instanceof Blob) {
            blob = fileSource;
        } else if (fileSource instanceof ReadableStream) {
            blob = await new Response(fileSource).blob();
        } else {
            throw new CTGAPIClientError("REQUEST_FAILED", "Unsupported file source type");
        }

        const formData = new FormData();
        formData.set(fieldName, blob, filename);
        for (const [key, value] of Object.entries(fields)) {
            formData.set(key, value);
        }

        return this.POST(path, formData, {}, {}, opts);
    }

    /**
     *
     * Private Methods
     *
     */

    // :: STRING, STRING, OBJECT, OBJECT, OBJECT, OBJECT -> PROMISE(OBJECT)
    // Builds URL, merges headers, checks SSRF, delegates to static request().
    async _instanceRequest(method, path, body, params, headers, opts) {
        const url = this._buildUrl(path);
        const merged = this._mergeHeaders(headers);
        this._checkSsrf(url);
        return CTGAPIClient.request(method, url, body, params, merged, this._timeout, {
            maxResponseBytes: this._maxResponseBytes,
            signal: opts.signal
        });
    }

    // :: STRING -> STRING
    // Builds full URL from baseUrl + path with slash normalization.
    _buildUrl(path) {
        const stripped = path.replace(/^\/+/, "");
        return `${this._baseUrl}/${stripped}`;
    }

    // :: OBJECT -> OBJECT
    // Merges three header layers: automatic < default < per-request.
    _mergeHeaders(perRequest) {
        const merged = {};

        // Layer 1: automatic (lowest priority)
        merged["User-Agent"] = CTGAPIClient.USER_AGENT;
        if (this._token !== null) {
            merged["Authorization"] = `Bearer ${this._token}`;
        }

        // Layer 2: default headers
        for (const [name, value] of Object.entries(this._headers)) {
            CTGAPIClient._setHeaderCaseInsensitive(merged, name, value);
        }

        // Layer 3: per-request (highest priority)
        for (const [name, value] of Object.entries(perRequest)) {
            CTGAPIClient._setHeaderCaseInsensitive(merged, name, value);
        }

        return merged;
    }

    // :: STRING -> VOID
    // Validates URL against SSRF rules. Throws INVALID_URL if blocked.
    _checkSsrf(url) {
        const parsed = new URL(url);

        // Reject embedded credentials
        if (parsed.username || parsed.password) {
            throw new CTGAPIClientError("INVALID_URL", "URLs with embedded credentials are not allowed");
        }

        // Scheme allowlist
        if (this._allowedSchemes !== null) {
            const scheme = parsed.protocol.replace(/:$/, "");
            if (!this._allowedSchemes.includes(scheme)) {
                throw new CTGAPIClientError("INVALID_URL", "Blocked by SSRF allowlist");
            }
        }

        // Host allowlist (punycode-normalized via URL parser)
        if (this._allowedHosts !== null) {
            if (!this._allowedHosts.includes(parsed.hostname)) {
                throw new CTGAPIClientError("INVALID_URL", "Blocked by SSRF allowlist");
            }
        }

        // Private IP blocking
        if (this._blockPrivateIPs) {
            CTGAPIClient._rejectPrivateIP(parsed.hostname);
        }
    }

    // :: STRING -> VOID
    // Removes a header key from _headers by case-insensitive match.
    _removeHeaderKey(name) {
        const lower = name.toLowerCase();
        for (const key of Object.keys(this._headers)) {
            if (key.toLowerCase() === lower) {
                delete this._headers[key];
            }
        }
    }

    /**
     *
     * Static Methods
     *
     */

    // Static Factory Method :: STRING, OBJECT? -> ctgAPIClient
    // Creates a new client instance. Uses new this(...) for late-bound construction.
    static init(baseUrl, config = {}) {
        return new this(baseUrl, config);
    }

    // :: STRING, STRING, OBJECT?, OBJECT?, OBJECT?, NUMBER?, OBJECT? -> PROMISE(OBJECT)
    // Stateless HTTP execution primitive. Everything delegates to this.
    static async request(method, url, body = {}, params = {}, headers = {}, timeout = 30, opts = {}) {
        // 1. Validate method
        const upperMethod = (typeof method === "string" ? method.trim() : "").toUpperCase();
        if (!CTGAPIClient.VALID_METHODS.has(upperMethod)) {
            throw new CTGAPIClientError("INVALID_METHOD", `Invalid HTTP method: ${method}`);
        }

        // Validate timeout
        CTGAPIClient._validateTimeout(timeout);

        // 2. Reject URL credentials
        let parsedUrl;
        try {
            parsedUrl = new URL(url);
        } catch {
            throw new CTGAPIClientError("INVALID_URL", `Invalid URL: ${CTGAPIClient._redactUrl(url)}`);
        }
        if (parsedUrl.username || parsedUrl.password) {
            throw new CTGAPIClientError("INVALID_URL", "URLs with embedded credentials are not allowed");
        }

        // 3. Append query parameters
        if (params && Object.keys(params).length > 0) {
            const searchParams = new URLSearchParams(params).toString();
            const separator = url.includes("?") ? "&" : "?";
            url = url + separator + searchParams;
        }

        // 4. Detect multipart
        const isFormData = body instanceof FormData;
        const hasBody = CTGAPIClient.METHODS_WITH_BODY.has(upperMethod);

        if (!isFormData && hasBody && body && typeof body === "object") {
            CTGAPIClient._rejectNestedFiles(body, 0);
            const hasFile = Object.values(body).some((v) => CTGAPIClient._isFileRef(v));
            if (hasFile) {
                const formData = new FormData();
                for (const [key, value] of Object.entries(body)) {
                    formData.set(key, value);
                }
                body = formData;
            }
        }

        const isMultipart = body instanceof FormData;

        // 5. Auto-set headers
        if (!CTGAPIClient._hasHeader(headers, "User-Agent")) {
            headers = { "User-Agent": CTGAPIClient.USER_AGENT, ...headers };
        }
        if (hasBody && !isMultipart && body && Object.keys(body).length > 0) {
            if (!CTGAPIClient._hasHeader(headers, "Content-Type")) {
                headers = { "Content-Type": "application/json", ...headers };
            }
        }

        // 6. Validate header names
        for (const name of Object.keys(headers)) {
            if (!CTGAPIClient.HEADER_NAME_REGEX.test(name)) {
                throw new CTGAPIClientError("INVALID_HEADER", `Invalid header name: ${name}`);
            }
        }

        // 7. Sanitize header values
        const sanitizedHeaders = {};
        for (const [name, value] of Object.entries(headers)) {
            sanitizedHeaders[name] = String(value).replace(/[\r\n\0]/g, "");
        }

        // 8. Encode body
        let encodedBody;
        if (hasBody) {
            if (isMultipart) {
                encodedBody = body;
            } else if (body && Object.keys(body).length > 0) {
                try {
                    encodedBody = JSON.stringify(body);
                } catch (err) {
                    throw new CTGAPIClientError("INVALID_BODY", `JSON encoding failed: ${err.message}`);
                }
            }
        }

        // 9. Build fetch options
        let timedOut = false;
        const controller = new AbortController();
        const timer = setTimeout(() => { timedOut = true; controller.abort(); }, Math.round(timeout * 1000));

        if (opts.signal) {
            if (opts.signal.aborted) {
                clearTimeout(timer);
                controller.abort();
            } else {
                opts.signal.addEventListener("abort", () => controller.abort(), { once: true });
            }
        }

        const fetchOpts = {
            method: upperMethod,
            headers: sanitizedHeaders,
            redirect: "manual",
            signal: controller.signal
        };

        if (encodedBody !== undefined) {
            fetchOpts.body = encodedBody;
        }

        // 10. Execute fetch
        let response;
        let bodyText;
        try {
            response = await fetch(url, fetchOpts);

            // Early reject: check Content-Length before reading body
            if (opts.maxResponseBytes) {
                const cl = parseInt(response.headers.get("content-length"), 10);
                if (!Number.isNaN(cl) && cl > opts.maxResponseBytes) {
                    clearTimeout(timer);
                    throw new CTGAPIClientError("REQUEST_FAILED", "Response exceeds max size");
                }
            }

            bodyText = await response.text();
            clearTimeout(timer);

            // Post-read size check
            if (opts.maxResponseBytes && Buffer.byteLength(bodyText) > opts.maxResponseBytes) {
                throw new CTGAPIClientError("REQUEST_FAILED", "Response exceeds max size");
            }
        } catch (err) {
            clearTimeout(timer);
            if (err instanceof CTGAPIClientError) throw err;
            throw CTGAPIClient._classifyError(err, url, upperMethod, timedOut);
        }

        // 11. Parse response
        const parsedHeaders = CTGAPIClient._parseHeaders(response);
        let parsedBody;
        if (bodyText === "") {
            parsedBody = "";
        } else {
            try {
                parsedBody = JSON.parse(bodyText);
            } catch {
                parsedBody = bodyText;
            }
        }

        // 12. Return response structure
        return {
            status: response.status,
            ok: response.status >= 200 && response.status < 300,
            headers: parsedHeaders,
            body: parsedBody
        };
    }

    // :: NUMBER -> VOID
    // Validates timeout is a positive finite number. Throws TypeError if invalid.
    static _validateTimeout(timeout) {
        if (typeof timeout !== "number" || !Number.isFinite(timeout) || timeout <= 0) {
            throw new TypeError("timeout must be a positive number");
        }
    }

    // :: [STRING]|VOID, STRING -> [STRING]|VOID
    // Validates that a config value is null/undefined or an array of strings.
    // NOTE: Throws TypeError if value is present but not an array of strings.
    static _validateStringArray(value, name) {
        if (value === undefined || value === null) return null;
        if (!Array.isArray(value)) {
            throw new TypeError(`${name} must be an array of strings`);
        }
        for (const item of value) {
            if (typeof item !== "string") {
                throw new TypeError(`${name} must contain only strings`);
            }
        }
        return value;
    }

    // :: NUMBER|VOID, STRING -> NUMBER|VOID
    // Validates that a config value is null/undefined or a positive integer.
    static _validatePositiveInt(value, name) {
        if (value === undefined || value === null) return null;
        if (typeof value !== "number" || !Number.isFinite(value) || value <= 0 || value !== Math.trunc(value)) {
            throw new TypeError(`${name} must be a positive integer`);
        }
        return value;
    }

    // :: Error, STRING, STRING, BOOL -> ctgAPIClientError
    // Classifies a fetch error into a typed CTGAPIClientError.
    static _classifyError(err, url, method, timedOut) {
        const redactedUrl = CTGAPIClient._redactUrl(url);
        const data = { url: redactedUrl, method, code: err.cause?.code || null };

        if (err.name === "AbortError") {
            if (timedOut) {
                return new CTGAPIClientError("TIMEOUT", `Request timed out: ${redactedUrl}`, data);
            }
            return new CTGAPIClientError("REQUEST_FAILED", `Request cancelled: ${redactedUrl}`, data);
        }

        const causeCode = err.cause?.code;

        if (causeCode === "ECONNREFUSED" || causeCode === "ECONNRESET") {
            return new CTGAPIClientError("CONNECTION_FAILED", `Connection failed: ${redactedUrl}`, data);
        }

        if (causeCode === "ENOTFOUND") {
            return new CTGAPIClientError("DNS_FAILED", `DNS resolution failed: ${redactedUrl}`, data);
        }

        if (causeCode && (causeCode.startsWith("ERR_TLS") || causeCode === "UNABLE_TO_VERIFY_LEAF_SIGNATURE")) {
            return new CTGAPIClientError("SSL_ERROR", `SSL error: ${redactedUrl}`, data);
        }

        if (err.message && (err.message.includes("SSL") || err.message.includes("certificate"))) {
            return new CTGAPIClientError("SSL_ERROR", `SSL error: ${redactedUrl}`, data);
        }

        if (err.message && err.message.includes("Invalid URL")) {
            return new CTGAPIClientError("INVALID_URL", `Invalid URL: ${redactedUrl}`, data);
        }

        if (causeCode === "UND_ERR_CONNECT_TIMEOUT") {
            return new CTGAPIClientError("TIMEOUT", `Request timed out: ${redactedUrl}`, data);
        }

        return new CTGAPIClientError("REQUEST_FAILED", `Request failed: ${redactedUrl}`, data);
    }

    // :: Response -> OBJECT
    // Parses fetch response headers into a lowercase-keyed map.
    // NOTE: set-cookie collected as array via getSetCookie().
    static _parseHeaders(response) {
        const headers = {};

        response.headers.forEach((value, name) => {
            const lower = name.toLowerCase();
            if (lower === "set-cookie") return; // handled separately
            if (lower in headers) {
                headers[lower] = headers[lower] + ", " + value;
            } else {
                headers[lower] = value;
            }
        });

        // set-cookie: use getSetCookie() for correct multiple value handling
        if (typeof response.headers.getSetCookie === "function") {
            const cookies = response.headers.getSetCookie();
            if (cookies.length > 0) {
                headers["set-cookie"] = cookies;
            }
        }

        return headers;
    }

    // :: OBJECT, STRING -> BOOL
    // Case-insensitive check for a header name in a headers map.
    static _hasHeader(headers, name) {
        const lower = name.toLowerCase();
        for (const key of Object.keys(headers)) {
            if (key.toLowerCase() === lower) return true;
        }
        return false;
    }

    // :: OBJECT, STRING, STRING -> VOID
    // Sets a header in a map with case-insensitive key replacement.
    static _setHeaderCaseInsensitive(headers, name, value) {
        const lower = name.toLowerCase();
        for (const key of Object.keys(headers)) {
            if (key.toLowerCase() === lower) {
                delete headers[key];
            }
        }
        headers[name] = value;
    }

    // :: * -> BOOL
    // Checks if a value is a file reference (Blob, Buffer, ReadableStream).
    static _isFileRef(value) {
        return value instanceof Blob
            || Buffer.isBuffer(value)
            || value instanceof ReadableStream;
    }

    // :: OBJECT, INT? -> VOID
    // Recursively checks for nested file references. Throws INVALID_BODY if found at depth > 0.
    static _rejectNestedFiles(body, depth = 0, seen) {
        if (!seen) seen = new WeakSet();
        if (seen.has(body)) {
            throw new CTGAPIClientError("INVALID_BODY", "Circular reference detected in request body");
        }
        seen.add(body);
        const values = Array.isArray(body) ? body : Object.values(body);
        for (const value of values) {
            if (depth > 0 && CTGAPIClient._isFileRef(value)) {
                throw new CTGAPIClientError("INVALID_BODY", "File references must be top-level body values");
            }
            if (value && typeof value === "object" && !CTGAPIClient._isFileRef(value)) {
                CTGAPIClient._rejectNestedFiles(value, depth + 1, seen);
            }
        }
    }

    // :: STRING -> VOID
    // Rejects private/link-local/loopback IP addresses. Throws INVALID_URL.
    static _rejectPrivateIP(hostname) {
        // Strip IPv6 brackets
        const host = hostname.replace(/^\[/, "").replace(/\]$/, "");

        // IPv4 patterns
        for (const pattern of CTGAPIClient.PRIVATE_IP_PATTERNS) {
            if (pattern.test(host)) {
                throw new CTGAPIClientError("INVALID_URL", "Private/internal addresses are blocked");
            }
        }

        // IPv6 exact matches and prefix checks
        const normalized = host.toLowerCase();
        if (CTGAPIClient.PRIVATE_IPV6.has(normalized)) {
            throw new CTGAPIClientError("INVALID_URL", "Private/internal addresses are blocked");
        }

        // fd00::/8 (unique local)
        if (normalized.startsWith("fd")) {
            throw new CTGAPIClientError("INVALID_URL", "Private/internal addresses are blocked");
        }

        // fe80::/10 (link-local) — covers fe80 through febf
        if (/^fe[89ab]/.test(normalized)) {
            throw new CTGAPIClientError("INVALID_URL", "Private/internal addresses are blocked");
        }

        // IPv4-mapped IPv6 — dotted-quad form (::ffff:127.0.0.1)
        const mappedDotted = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
        if (mappedDotted) {
            for (const pattern of CTGAPIClient.PRIVATE_IP_PATTERNS) {
                if (pattern.test(mappedDotted[1])) {
                    throw new CTGAPIClientError("INVALID_URL", "Private/internal addresses are blocked");
                }
            }
        }

        // IPv4-mapped IPv6 — hex form (::ffff:7f00:1 = 127.0.0.1)
        const mappedHex = normalized.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
        if (mappedHex) {
            const hi = parseInt(mappedHex[1], 16);
            const lo = parseInt(mappedHex[2], 16);
            const ipv4 = `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
            for (const pattern of CTGAPIClient.PRIVATE_IP_PATTERNS) {
                if (pattern.test(ipv4)) {
                    throw new CTGAPIClientError("INVALID_URL", "Private/internal addresses are blocked");
                }
            }
        }
    }

    // :: STRING -> STRING
    // Redacts credentials from a URL string for safe inclusion in error data.
    static _redactUrl(url) {
        try {
            const parsed = new URL(url);
            if (parsed.username || parsed.password) {
                parsed.username = "***";
                parsed.password = "***";
                return parsed.toString();
            }
            return url;
        } catch {
            return url;
        }
    }
}
