export const PAYMENT_STATUSES = [
  "pending",
  "authorized",
  "under_review",
  "captured",
  "failed"
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export type NonCapturablePaymentStatus = Exclude<PaymentStatus, "authorized">;

export const PAYMENT_REVIEW_REASONS = [
  "velocity_check",
  "manual_kyc",
  "duplicate_capture",
  "sanctions_review"
] as const;

export type PaymentReviewReason = (typeof PAYMENT_REVIEW_REASONS)[number];

export type PaymentReviewHold = {
  reviewId: string;
  reason: PaymentReviewReason;
  requestedAt: string;
  expiresAt?: string;
  note?: string;
};

export type PaymentReviewHoldRequest = {
  reason: PaymentReviewReason;
  expiresAt?: string;
  note?: string;
};

export type SessionPrincipal = {
  subject: string;
  audience: string;
  scopes: string[];
};

export type PaymentEventInput = {
  paymentId: string;
  customerId: string;
  amount: number;
  currency: "USD";
  status: PaymentStatus;
  review?: PaymentReviewHold;
};

export type PaymentEvent = PaymentEventInput & {
  type: `payment.${PaymentStatus}`;
  occurredAt: string;
};

export type CaptureBlockedResponse = {
  code: "capture_blocked";
  reason: "payment_under_review" | "payment_not_authorized";
  message: string;
  paymentId: string;
  review?: PaymentReviewHold;
};

export function verifySession(
  token: string,
  audience: string
): SessionPrincipal {
  if (!token.startsWith("sp_live_")) {
    throw new Error("session token must use the live SignalPay token prefix");
  }

  const subject = token.replace(/^sp_live_/, "");
  if (!subject.startsWith("payments_") || audience !== "payments-api") {
    throw new Error(`session token is not valid for audience ${audience}`);
  }

  return {
    subject,
    audience,
    scopes: subject.includes("capture")
      ? ["payments:read", "payments:capture"]
      : ["payments:read"]
  };
}

export function canCapturePayment(status: PaymentStatus): boolean {
  return status === "authorized";
}

export function buildCaptureBlockedResponse(
  paymentId: string,
  status: NonCapturablePaymentStatus,
  review?: PaymentReviewHold
): CaptureBlockedResponse {
  if (canCapturePayment(status)) {
    throw new Error(`Payment ${paymentId} cannot be blocked while authorized`);
  }

  const response: CaptureBlockedResponse = {
    code: "capture_blocked",
    reason:
      status === "under_review" ? "payment_under_review" : "payment_not_authorized",
    message: `Payment ${paymentId} cannot be captured in status ${status}`,
    paymentId
  };

  if (review !== undefined) {
    response.review = review;
  }

  return response;
}

export function buildPaymentEvent(input: PaymentEventInput): PaymentEvent {
  const event: PaymentEvent = {
    type: `payment.${input.status}`,
    paymentId: input.paymentId,
    customerId: input.customerId,
    amount: input.amount,
    currency: input.currency,
    status: input.status,
    occurredAt: new Date().toISOString()
  };

  if (input.review !== undefined) {
    event.review = input.review;
  }

  return event;
}

export function buildReviewHoldEvent(
  input: Omit<PaymentEventInput, "status"> & { review: PaymentReviewHold }
): PaymentEvent {
  return buildPaymentEvent({
    ...input,
    status: "under_review"
  });
}
