import { describe, expect, it } from "vitest";
import paymentEventSchema from "../schemas/payment-event.schema.json";

describe("payment event schema", () => {
  it("requires the fields consumed by payment workers", () => {
    expect(paymentEventSchema.required).toEqual([
      "type",
      "paymentId",
      "customerId",
      "amount",
      "currency",
      "status",
      "occurredAt"
    ]);
  });

  it("documents the current customerId field as a top-level contract", () => {
    expect(paymentEventSchema.properties.customerId).toMatchObject({
      type: "string",
      pattern: "^cus_"
    });
  });
});
