// Self-tests for ctg-js-api-client — error class + HTTP client
//
// Uses ctg-js-test pipelines for all tests.
// Starts an embedded node:http server for HTTP integration tests.
// Server is always stopped on exit (pass, fail, or error).

import CTGTest from "ctg-js-test"; // Test framework
import CTGTestConsoleFormatter from "ctg-js-test/formatter/console";
import CTGTestResult from "ctg-js-test/result";
import { startServer, stopServer } from "./server.js"; // Test HTTP server

// These will be implemented — import paths for what we're testing
import CTGAPIClient from "../src/CTGAPIClient.js"; // HTTP client
import CTGAPIClientError from "../src/CTGAPIClientError.js"; // Typed errors

// Pipeline imports
import runErrorConstruction from "./pipelines/errorConstruction.js";
import runErrorLookup from "./pipelines/errorLookup.js";
import runErrorHandling from "./pipelines/errorHandling.js";
import runClientConstruction from "./pipelines/clientConstruction.js";
import runStaticRequest from "./pipelines/staticRequest.js";
import runInstanceMethods from "./pipelines/instanceMethods.js";
import runResponseStructure from "./pipelines/responseStructure.js";
import runHeaders from "./pipelines/headers.js";
import runUrlHandling from "./pipelines/urlHandling.js";
import runSecurity from "./pipelines/security.js";
import runCancellation from "./pipelines/cancellation.js";

// ── Server Lifecycle ─────────────────────────────────────────

let testServer;
let BASE_URL;

try {
    const { server, baseUrl } = await startServer();
    testServer = server;
    BASE_URL = baseUrl;
    process.stdout.write(`Test server started at ${BASE_URL}\n\n`);
} catch (err) {
    process.stdout.write(`Failed to start test server: ${err.message}\n`);
    process.exit(1);
}

// ── Config ───────────────────────────────────────────────────

const config = { timeout: 0 };
const collector = [];
const ctx = { CTGTest, CTGTestConsoleFormatter, CTGAPIClient, CTGAPIClientError, BASE_URL, config, collector };

try {
    await runErrorConstruction(ctx);
    await runErrorLookup(ctx);
    await runErrorHandling(ctx);
    await runClientConstruction(ctx);
    await runStaticRequest(ctx);
    await runInstanceMethods(ctx);
    await runResponseStructure(ctx);
    await runHeaders(ctx);
    await runUrlHandling(ctx);
    await runSecurity(ctx);
    await runCancellation(ctx);

    // ══════════════════════════════════════════════════════════════
    // Summary + Cleanup
    // ══════════════════════════════════════════════════════════════

    process.stdout.write("\n=== All tests complete ===\n");

} finally {
    await stopServer(testServer);
}

// Exit code driven by collector (runner semantics)
const failed = collector.some(
    (r) => r.status === CTGTestResult.STATUS.FAIL || r.status === CTGTestResult.STATUS.ERROR
);
process.exit(failed ? 1 : 0);
