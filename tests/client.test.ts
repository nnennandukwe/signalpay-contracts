import { describe, expect, it } from "vitest";
import {
  PAYMENT_STATUSES,
  PAYMENT_REVIEW_REASONS,
  buildCaptureBlockedResponse,
  buildPaymentEvent,
  buildReviewHoldEvent,
  canCapturePayment,
  verifySession
} from "../src/client";

describe("SignalPay shared contracts", () => {
  it("verifies service sessions for a specific audience", () => {
    const principal = verifySession("sp_live_payments_reader", "payments-api");

    expect(principal).toEqual({
      subject: "payments_reader",
      audience: "payments-api",
      scopes: ["payments:read"]
    });
  });

  it("rejects sessions that do not target the requested audience", () => {
    expect(() =>
      verifySession("sp_live_payments_reader", "settlement-worker")
    ).toThrow(/audience/);
  });

  it("keeps the payment status contract stable for consumers", () => {
    expect(PAYMENT_STATUSES).toEqual([
      "pending",
      "authorized",
      "under_review",
      "captured",
      "failed"
    ]);
  });

  it("lists supported manual review reasons for operators", () => {
    expect(PAYMENT_REVIEW_REASONS).toEqual([
      "velocity_check",
      "manual_kyc",
      "duplicate_capture",
      "sanctions_review"
    ]);
  });

  it("checks basic capture eligibility states", () => {
    expect(canCapturePayment("authorized")).toBe(true);
    expect(canCapturePayment("pending")).toBe(false);
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

  it("builds review hold events with operator context", () => {
    const event = buildReviewHoldEvent({
      paymentId: "pay_9x8",
      customerId: "cus_123",
      amount: 1299,
      currency: "USD",
      review: {
        reviewId: "rev_velocity_1",
        reason: "velocity_check",
        requestedAt: "2026-06-18T16:00:00Z",
        note: "Velocity threshold exceeded"
      }
    });

    expect(event).toMatchObject({
      type: "payment.under_review",
      status: "under_review",
      review: {
        reviewId: "rev_velocity_1",
        reason: "velocity_check"
      }
    });
  });

  it("builds capture blocked responses for reviewed payments", () => {
    const response = buildCaptureBlockedResponse("pay_9x8", "under_review", {
      reviewId: "rev_velocity_1",
      reason: "velocity_check",
      requestedAt: "2026-06-18T16:00:00Z"
    });

    expect(response).toEqual({
      code: "capture_blocked",
      reason: "payment_under_review",
      message: "Payment pay_9x8 cannot be captured while under_review",
      review: {
        reviewId: "rev_velocity_1",
        reason: "velocity_check",
        requestedAt: "2026-06-18T16:00:00Z"
      }
    });
  });
});
