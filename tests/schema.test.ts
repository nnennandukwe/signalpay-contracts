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

  it("allows review context on payment events", () => {
    expect(paymentEventSchema.properties.status.enum).toContain("under_review");
    expect(paymentEventSchema.properties.review).toEqual({
      $ref: "#/$defs/paymentReviewHold"
    });
  });

  it("documents manual review reason values", () => {
    expect(paymentEventSchema.$defs.paymentReviewReason.enum).toEqual([
      "velocity_check",
      "manual_kyc",
      "sanctions_review"
    ]);
  });
});
