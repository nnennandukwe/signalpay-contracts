from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Literal, TypedDict

PaymentStatus = Literal["pending", "authorized", "under_review", "captured", "failed"]
PaymentReviewReason = Literal[
    "velocity_check",
    "manual_kyc",
    "duplicate_capture",
    "sanctions_review",
]


class PaymentReviewHoldRequired(TypedDict):
    reviewId: str
    reason: PaymentReviewReason
    requestedAt: str


class PaymentReviewHold(PaymentReviewHoldRequired, total=False):
    expiresAt: str


@dataclass(frozen=True)
class SessionPrincipal:
    subject: str
    audience: Literal["payments-api"]
    scopes: tuple[str, ...]


class PaymentEvent(TypedDict):
    type: str
    paymentId: str
    customerId: str
    amount: int
    currency: Literal["USD"]
    status: PaymentStatus
    occurredAt: str


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
) -> PaymentEvent:
    return {
        "type": f"payment.{status}",
        "paymentId": payment_id,
        "customerId": customer_id,
        "amount": amount,
        "currency": currency,
        "status": status,
        "occurredAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
    }
