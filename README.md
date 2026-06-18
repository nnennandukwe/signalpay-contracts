# SignalPay Contracts

Shared API contracts, event schemas, client primitives, and workflow interfaces for SignalPay payment services.

SignalPay services use this repository as the source of truth for:

- payment API shapes in `openapi/payments.yaml`
- payment event payloads in `schemas/payment-event.schema.json`
- manual review hold metadata for payments requiring operator review
- TypeScript client primitives in `src/client.ts`
- Python client primitives in `python/signalpay_contracts/client.py`
- shared image publishing output names in `actions/publish-image/action.yml`

## Contract boundaries

The payment API and event contracts are consumed by independent services. Compatibility changes should preserve current field names and enum values until all consumers are migrated.

Current compatibility commitments:

- Payment events expose `customerId` as a top-level field.
- Payment statuses are `pending`, `authorized`, `captured`, and `failed`.
- Manual review holds expose `reviewId`, `reason`, and `requestedAt` when a payment requires operator review.
- The shared image publishing action exposes `image_digest` as its output.
- Service sessions are verified for the `payments-api` audience.

## Validation

```bash
npm install
npm test
npm run typecheck
npm run validate:schema
npm run build
```
