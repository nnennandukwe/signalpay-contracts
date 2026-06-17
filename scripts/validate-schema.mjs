import fs from "node:fs";

const schema = JSON.parse(
  fs.readFileSync(new URL("../schemas/payment-event.schema.json", import.meta.url))
);

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

console.log("payment event schema validated");
