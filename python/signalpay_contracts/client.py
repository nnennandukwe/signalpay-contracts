from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Literal, Optional, TypedDict

PaymentStatus = Literal["pending", "authorized", "under_review", "captured", "failed"]
PaymentReviewReason = Literal[
    "velocity_check", "manual_kyc", "duplicate_capture", "sanctions_review"
]


class PaymentReviewHoldRequired(TypedDict):
    reviewId: str
    reason: PaymentReviewReason
    requestedAt: str


class PaymentReviewHold(PaymentReviewHoldRequired, total=False):
    expiresAt: str
    note: str


@dataclass(frozen=True)
class SessionPrincipal:
    subject: str
    audience: Literal["payments-api"]
    scopes: tuple[str, ...]


class PaymentEventRequired(TypedDict):
    type: str
    paymentId: str
    customerId: str
    amount: int
    currency: Literal["USD"]
    status: PaymentStatus
    occurredAt: str


class PaymentEvent(PaymentEventRequired, total=False):
    review: PaymentReviewHold


def verify_session(token: str, audience: Literal["payments-api"]) -> SessionPrincipal:
    if not token.startswith("sp_live_"):
        raise ValueError("session token must use the live SignalPay token prefix")

    subject = token.removeprefix("sp_live_")
    if not subject.startswith("payments_") or audience != "payments-api":
        raise ValueError(f"session token is not valid for audience {audience}")

    scopes = (
        ("payments:read", "payments:capture")
        if "capture" in subject
        else ("payments:read",)
    )
    return SessionPrincipal(subject=subject, audience=audience, scopes=scopes)


def build_payment_event(
    *,
    payment_id: str,
    customer_id: str,
    amount: int,
    currency: Literal["USD"],
    status: PaymentStatus,
    review: Optional[PaymentReviewHold] = None,
) -> PaymentEvent:
    """Build a payment lifecycle event payload.

    Args:
        payment_id: SignalPay payment identifier.
        customer_id: Customer identifier associated with the payment.
        amount: Amount in minor units.
        currency: Payment currency.
        status: Current payment status.
        review: Optional manual review hold details.

    Returns:
        The payment event dictionary.
    """
    event: PaymentEvent = {
        "type": f"payment.{status}",
        "paymentId": payment_id,
        "customerId": customer_id,
        "amount": amount,
        "currency": currency,
        "status": status,
        "occurredAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
    }
    if review is not None:
        event["review"] = review
    return event


def build_review_hold_event(
    *,
    payment_id: str,
    customer_id: str,
    amount: int,
    currency: Literal["USD"],
    review: PaymentReviewHold,
) -> PaymentEvent:
    """Build a payment event for placing a payment under manual review."""
    return build_payment_event(
        payment_id=payment_id,
        customer_id=customer_id,
        amount=amount,
        currency=currency,
        status="under_review",
        review=review,
    )
