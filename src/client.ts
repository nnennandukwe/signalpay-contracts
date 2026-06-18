export const PAYMENT_STATUSES = [
  "pending",
  "authorized",
  "captured",
  "failed"
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export type SessionPrincipal = {
  subject: string;
  audience: string;
  scopes: string[];
};

export type SessionVerificationRequest = {
  token: string;
  audience: string;
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

/**
 * Verify a session token for a given audience.
 *
 * Supports both the new request-object form and the legacy positional form.
 */
export function verifySession(
  /** @deprecated Use verifySession({ token, audience }) instead. */
  token: string,
  audience: string
): SessionPrincipal;
export function verifySession(request: SessionVerificationRequest): SessionPrincipal;
export function verifySession(
  requestOrToken: SessionVerificationRequest | string,
  audience?: string
): SessionPrincipal {
  const { token, audience: normalizedAudience } =
    typeof requestOrToken === "string"
      ? { token: requestOrToken, audience }
      : requestOrToken;

  if (normalizedAudience == null) {
    throw new TypeError("verifySession() missing required argument: audience");
  }

  if (!token.startsWith("sp_live_")) {
    throw new Error("session token must use the live SignalPay token prefix");
  }

  const subject = token.replace(/^sp_live_/, "");
  if (!subject.startsWith("payments_") || normalizedAudience !== "payments-api") {
    throw new Error(
      `session token is not valid for audience ${normalizedAudience}`
    );
  }

  return {
    subject,
    audience: normalizedAudience,
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
