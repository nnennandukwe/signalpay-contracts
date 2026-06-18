from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Literal, TypedDict, overload

import warnings

PaymentStatus = Literal["pending", "authorized", "captured", "failed"]


@dataclass(frozen=True)
class SessionPrincipal:
    subject: str
    audience: Literal["payments-api"]
    scopes: tuple[str, ...]


@dataclass(frozen=True)
class SessionVerificationRequest:
    token: str
    audience: str


class PaymentEvent(TypedDict):
    type: str
    paymentId: str
    customerId: str
    amount: int
    currency: Literal["USD"]
    status: PaymentStatus
    occurredAt: str


@overload
def verify_session(token: str, audience: str) -> SessionPrincipal: ...


@overload
def verify_session(request: SessionVerificationRequest) -> SessionPrincipal: ...


def verify_session(
    request_or_token: SessionVerificationRequest | str,
    audience: str | None = None,
) -> SessionPrincipal:
    """Verify a session token for a given audience.

    Supports both the new request-object form and the legacy positional form:

    - ``verify_session(SessionVerificationRequest(token=..., audience=...))``
    - ``verify_session(token, audience)`` (deprecated)

    Args:
        request_or_token: A :class:`SessionVerificationRequest` or the session token.
        audience: Audience string when using the legacy positional form.

    Returns:
        A :class:`SessionPrincipal` describing the verified session.

    Raises:
        ValueError: If the token is malformed or not valid for the audience.
        TypeError: If arguments are missing or invalid.
    """

    if isinstance(request_or_token, SessionVerificationRequest):
        token = request_or_token.token
        audience = request_or_token.audience
    else:
        token = request_or_token
        if audience is None:
            raise TypeError("verify_session() missing required argument: 'audience'")
        warnings.warn(
            "verify_session(token, audience) is deprecated; pass a SessionVerificationRequest instead",
            DeprecationWarning,
            stacklevel=2,
        )

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
