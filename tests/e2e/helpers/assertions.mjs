import assert from "node:assert/strict";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

export function isUUID(val) {
  return typeof val === "string" && UUID_REGEX.test(val);
}

export function isISODate(val) {
  return typeof val === "string" && (ISO_DATE_REGEX.test(val) || !isNaN(Date.parse(val)));
}

/**
 * Validates that an API response conforms strictly to the standard Health Response contract.
 * @see PROJECT.md § Interface Contracts
 */
export function validateHealthResponseContract(body) {
  assert.ok(body, "Response body must not be null or undefined");
  assert.strictEqual(typeof body, "object", "Response body must be a JSON object");
  assert.strictEqual(body.success, true, "Response.success must be strictly true");

  // data block
  assert.ok(body.data, "Response must include a data object");
  assert.strictEqual(typeof body.data, "object", "Response.data must be an object");
  assert.strictEqual(body.data.status, "ok", "Response.data.status must be 'ok'");
  assert.strictEqual(typeof body.data.uptime, "number", "Response.data.uptime must be a number");
  assert.ok(body.data.uptime >= 0, "Response.data.uptime must be non-negative");
  assert.strictEqual(typeof body.data.version, "string", "Response.data.version must be a string");
  assert.strictEqual(typeof body.data.database, "string", "Response.data.database must be a string status");

  // meta block
  assert.ok(body.meta, "Response must include a meta object");
  assert.strictEqual(typeof body.meta, "object", "Response.meta must be an object");
  assert.ok(isISODate(body.meta.timestamp), `Response.meta.timestamp must be valid ISO date string: received '${body.meta.timestamp}'`);
  assert.ok(isUUID(body.meta.requestId), `Response.meta.requestId must be valid UUID: received '${body.meta.requestId}'`);
}

/**
 * Validates that an API error response conforms strictly to the api-standards.md error envelope.
 */
export function validateErrorEnvelope(body, expectedCode = null) {
  assert.ok(body, "Response body must not be null or undefined");
  assert.strictEqual(body.success, false, "Response.success must be strictly false");
  assert.ok(body.error, "Response must include an error object");
  assert.strictEqual(typeof body.error.code, "string", "Response.error.code must be a string");
  if (expectedCode) {
    assert.strictEqual(body.error.code, expectedCode, `Response.error.code must match ${expectedCode}`);
  }
  assert.strictEqual(typeof body.error.message, "string", "Response.error.message must be a string");
  assert.ok(body.error.requestId, "Response.error must include a requestId");
}
