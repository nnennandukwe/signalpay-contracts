export const PAYMENT_STATUSES = [
  "pending",
  "authorized",
  "under_review",
  "captured",
  "failed"
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

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
};

export type PaymentEvent = PaymentEventInput & {
  type: `payment.${PaymentStatus}`;
  occurredAt: string;
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

export function buildPaymentEvent(input: PaymentEventInput): PaymentEvent {
  return {
    type: `payment.${input.status}`,
    paymentId: input.paymentId,
    customerId: input.customerId,
    amount: input.amount,
    currency: input.currency,
    status: input.status,
    occurredAt: new Date().toISOString()
  };
}
