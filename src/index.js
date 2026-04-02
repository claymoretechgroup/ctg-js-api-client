// Package entry point — exports client and error classes
import CTGAPIClient from "./CTGAPIClient.js"; // HTTP client
import CTGAPIClientError from "./CTGAPIClientError.js"; // Typed error class

export { CTGAPIClient, CTGAPIClientError };
export default CTGAPIClient;
