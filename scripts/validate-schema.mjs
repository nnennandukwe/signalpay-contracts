import fs from "node:fs";
import { parse } from "yaml";

const schema = JSON.parse(
  fs.readFileSync(new URL("../schemas/payment-event.schema.json", import.meta.url))
);
const openApi = parse(
  fs.readFileSync(new URL("../openapi/payments.yaml", import.meta.url), "utf8")
);

const expectedStatuses = [
  "pending",
  "authorized",
  "under_review",
  "captured",
  "failed"
];
const expectedReviewReasons = [
  "velocity_check",
  "manual_kyc",
  "duplicate_capture",
  "sanctions_review"
];
const expectedEventTypes = expectedStatuses.map((status) => `payment.${status}`);

function assertArrayEqual(actual, expected, label) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `${label} must be ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
    );
  }
}

function assertArrayIncludes(actual, expectedValue, label) {
  if (!actual.includes(expectedValue)) {
    throw new Error(
      `${label} must include ${expectedValue}, got ${JSON.stringify(actual)}`
    );
  }
}

function openApiSchema(schemaName) {
  const targetSchema = openApi?.components?.schemas?.[schemaName];

  if (targetSchema === undefined) {
    throw new Error(`openapi/payments.yaml must define ${schemaName}`);
  }

  return targetSchema;
}

function openApiEnumValues(schemaName) {
  const values = openApiSchema(schemaName).enum;

  if (!Array.isArray(values)) {
    throw new Error(`openapi/payments.yaml ${schemaName} must declare an enum`);
  }

  return values;
}

function openApiRequiredFields(schemaName) {
  return openApiSchema(schemaName).required ?? [];
}

function openApiResponseCodes(path, method) {
  const responses = openApi?.paths?.[path]?.[method]?.responses;

  if (responses === undefined) {
    throw new Error(
      `openapi/payments.yaml ${method.toUpperCase()} ${path} must define responses`
    );
  }

  return Object.keys(responses);
}

const required = new Set(schema.required ?? []);
for (const field of [
  "type",
  "paymentId",
  "customerId",
  "amount",
  "currency",
  "status",
  "occurredAt"
]) {
  if (!required.has(field)) {
    throw new Error(`payment-event.schema.json must require ${field}`);
  }
}

if (schema.properties?.customerId?.pattern !== "^cus_") {
  throw new Error("customerId must remain a top-level customer reference");
}

assertArrayEqual(
  schema.properties?.status?.enum,
  expectedStatuses,
  "payment-event.schema.json status enum"
);
assertArrayEqual(
  schema.properties?.type?.enum,
  expectedEventTypes,
  "payment-event.schema.json type enum"
);
assertArrayEqual(
  schema.$defs?.paymentReviewReason?.enum,
  expectedReviewReasons,
  "payment-event.schema.json payment review reason enum"
);
assertArrayEqual(
  openApiEnumValues("PaymentStatus"),
  expectedStatuses,
  "openapi/payments.yaml PaymentStatus enum"
);
assertArrayEqual(
  openApiEnumValues("PaymentReviewReason"),
  expectedReviewReasons,
  "openapi/payments.yaml PaymentReviewReason enum"
);
assertArrayEqual(
  openApiRequiredFields("CaptureBlockedResponse"),
  ["code", "reason", "message", "paymentId"],
  "openapi/payments.yaml CaptureBlockedResponse required fields"
);
assertArrayIncludes(
  openApiResponseCodes("/payments/{paymentId}/capture", "post"),
  "409",
  "openapi/payments.yaml capture response codes"
);
assertArrayEqual(
  openApiRequiredFields("PaymentReviewHoldResponse"),
  ["payment"],
  "openapi/payments.yaml PaymentReviewHoldResponse required fields"
);

if (openApiRequiredFields("Payment").includes("review")) {
  throw new Error("openapi/payments.yaml Payment must not require review for every status");
}

console.log("payment event schema validated");
