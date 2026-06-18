import fs from "node:fs";

const schema = JSON.parse(
  fs.readFileSync(new URL("../schemas/payment-event.schema.json", import.meta.url))
);
const openApi = fs.readFileSync(
  new URL("../openapi/payments.yaml", import.meta.url),
  "utf8"
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

function openApiSchemaLines(schemaName) {
  const lines = openApi.split(/\r?\n/);
  const start = lines.findIndex((line) => line === `    ${schemaName}:`);

  if (start === -1) {
    throw new Error(`openapi/payments.yaml must define ${schemaName}`);
  }

  const end = lines.findIndex(
    (line, index) => index > start && /^    [A-Za-z][A-Za-z0-9]*:$/.test(line)
  );

  return lines.slice(start, end === -1 ? lines.length : end);
}

function openApiEnumValues(schemaName) {
  const lines = openApiSchemaLines(schemaName);
  const enumStart = lines.findIndex((line) => line.trim() === "enum:");

  if (enumStart === -1) {
    throw new Error(`openapi/payments.yaml ${schemaName} must declare an enum`);
  }

  const values = [];
  for (const line of lines.slice(enumStart + 1)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("- ")) {
      break;
    }
    values.push(trimmed.slice(2));
  }

  return values;
}

function openApiRequiredFields(schemaName) {
  const lines = openApiSchemaLines(schemaName);
  const requiredStart = lines.findIndex((line) => line.trim() === "required:");

  if (requiredStart === -1) {
    return [];
  }

  const fields = [];
  for (const line of lines.slice(requiredStart + 1)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("- ")) {
      break;
    }
    fields.push(trimmed.slice(2));
  }

  return fields;
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

if (openApiRequiredFields("Payment").includes("review")) {
  throw new Error("openapi/payments.yaml Payment must not require review for every status");
}

console.log("payment event schema validated");
