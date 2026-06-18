import { describe, expect, it } from "vitest";
import {
  PAYMENT_STATUSES,
  buildPaymentEvent,
  verifySession
} from "../src/client";

describe("SignalPay shared contracts", () => {
  it("verifies service sessions for a specific audience", () => {
    const principal = verifySession({
      token: "sp_live_payments_reader",
      audience: "payments-api"
    });

    expect(principal).toEqual({
      subject: "payments_reader",
      audience: "payments-api",
      scopes: ["payments:read"]
    });
  });

  it("rejects sessions that do not target the requested audience", () => {
    expect(() =>
      verifySession({
        token: "sp_live_payments_reader",
        audience: "settlement-worker"
      })
    ).toThrow(/audience/);
  });

  it("keeps the payment status contract stable for consumers", () => {
    expect(PAYMENT_STATUSES).toEqual([
      "pending",
      "authorized",
      "captured",
      "failed"
    ]);
  });

  it("builds payment events with the current customer identifier shape", () => {
    const event = buildPaymentEvent({
      paymentId: "pay_9x8",
      customerId: "cus_123",
      amount: 1299,
      currency: "USD",
      status: "authorized"
    });

    expect(event).toMatchObject({
      type: "payment.authorized",
      paymentId: "pay_9x8",
      customerId: "cus_123",
      amount: 1299,
      currency: "USD",
      status: "authorized"
    });
    expect(event.occurredAt).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
    );
  });
});
