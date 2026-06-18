import fs from "node:fs";

const schema = JSON.parse(
  fs.readFileSync(new URL("../schemas/payment-event.schema.json", import.meta.url))
);
const openApi = fs.readFileSync(
  new URL("../openapi/payments.yaml", import.meta.url),
  "utf8"
);
const openApiLines = openApi.split(/\r?\n/);

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

function indentationOf(line) {
  return line.match(/^\s*/)?.[0].length ?? 0;
}

function normalizeYamlKey(line) {
  return line.trim().replace(/:$/, "").replace(/^["']|["']$/g, "");
}

function normalizeYamlValue(value) {
  return value.trim().replace(/^["']|["']$/g, "");
}

function blockLinesWithin(lines, header) {
  const start = lines.findIndex((line) => normalizeYamlKey(line) === header);

  if (start === -1) {
    return [];
  }

  const startIndent = indentationOf(lines[start]);
  const end = lines.findIndex(
    (line, index) =>
      index > start && line.trim() !== "" && indentationOf(line) <= startIndent
  );

  return lines.slice(start, end === -1 ? lines.length : end);
}

function openApiSchemaLines(schemaName) {
  const lines = blockLinesWithin(openApiLines, schemaName);

  if (lines.length === 0) {
    throw new Error(`openapi/payments.yaml must define ${schemaName}`);
  }

  return lines;
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
    values.push(normalizeYamlValue(trimmed.slice(2)));
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
    fields.push(normalizeYamlValue(trimmed.slice(2)));
  }

  return fields;
}

function openApiResponseCodes(path, method) {
  const pathLines = blockLinesWithin(openApiLines, path);
  const methodLines = blockLinesWithin(pathLines, method);
  const responseLines = blockLinesWithin(methodLines, "responses");

  if (responseLines.length === 0) {
    throw new Error(
      `openapi/payments.yaml ${method.toUpperCase()} ${path} must define responses`
    );
  }

  return responseLines
    .map((line) => normalizeYamlKey(line))
    .filter((key) => /^\d{3}$/.test(key));
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

if (openApiRequiredFields("Payment").includes("review")) {
  throw new Error("openapi/payments.yaml Payment must not require review for every status");
}

console.log("payment event schema validated");
