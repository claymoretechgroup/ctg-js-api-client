// Typed error class with bidirectional lookup and chainable on/otherwise handlers
export default class CTGAPIClientError extends Error {

    /* Static Fields */

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

    // CONSTRUCTOR :: STRING|INT, STRING?, * -> this
    // Accepts type name or numeric code. Resolves both via bidirectional lookup.
    // NOTE: Unknown types or codes throw a native TypeError immediately.
    constructor(typeOrCode, msg, data) {
        const resolved = CTGAPIClientError._resolve(typeOrCode);
        const message = msg !== undefined && msg !== null ? msg : resolved.type;
        super(message);
        this._type = resolved.type;
        this._code = resolved.code;
        this._msg = message;
        this._data = data !== undefined ? data : null;
        this._handled = false;
        this.name = "CTGAPIClientError";
    }

    /**
     *
     * Properties
     *
     */

    // GETTER :: VOID -> STRING
    get type() { return this._type; }

    // GETTER :: VOID -> INT
    get code() { return this._code; }

    // GETTER :: VOID -> STRING
    get msg() { return this._msg; }

    // GETTER :: VOID -> *
    get data() { return this._data; }

    /**
     *
     * Instance Methods
     *
     */

    // :: STRING|INT, (ctgAPIClientError -> VOID) -> this
    // If the error matches the given type AND no previous on() has matched,
    // calls handler(this) and marks as handled. Returns self for chaining.
    // NOTE: Unknown type names or codes throw TypeError immediately.
    on(typeOrCode, handler) {
        const resolved = CTGAPIClientError._resolve(typeOrCode);
        if (!this._handled && this._code === resolved.code) {
            this._handled = true;
            handler(this);
        }
        return this;
    }

    // :: (ctgAPIClientError -> VOID) -> VOID
    // Calls handler(this) only if no prior on() matched.
    otherwise(handler) {
        if (!this._handled) {
            handler(this);
        }
    }

    /**
     *
     * Static Methods
     *
     */

    // :: STRING|INT -> INT|STRING|VOID
    // Bidirectional lookup. String input returns code; integer input returns type name.
    // NOTE: Returns null if not found (does not throw).
    static lookup(key) {
        if (typeof key === "string") {
            return key in CTGAPIClientError.TYPES ? CTGAPIClientError.TYPES[key] : null;
        }
        if (typeof key === "number") {
            for (const [name, code] of Object.entries(CTGAPIClientError.TYPES)) {
                if (code === key) return name;
            }
            return null;
        }
        return null;
    }

    // :: STRING|INT -> {type: STRING, code: INT}
    // Resolves type name and code from either direction.
    // NOTE: Throws TypeError for unknown types or codes.
    static _resolve(typeOrCode) {
        if (typeof typeOrCode === "string") {
            if (!(typeOrCode in CTGAPIClientError.TYPES)) {
                throw new TypeError(`Unknown error type: ${typeOrCode}`);
            }
            return { type: typeOrCode, code: CTGAPIClientError.TYPES[typeOrCode] };
        }
        if (typeof typeOrCode === "number") {
            for (const [name, code] of Object.entries(CTGAPIClientError.TYPES)) {
                if (code === typeOrCode) return { type: name, code };
            }
            throw new TypeError(`Unknown error code: ${typeOrCode}`);
        }
        throw new TypeError(`CTGAPIClientError expects string type or numeric code, got ${typeof typeOrCode}`);
    }
}
