# Post-MVP payment gateway roadmap

Status: **DEFERRED — NOT PART OF PHASE 18**

This document preserves the original Phase 18 gateway idea without coupling it to catalogue onboarding or launch acceptance.

## Entry criteria

Do not select or implement a gateway until:

- manual Mobile Money and cash-on-delivery workflows have stable real operational evidence;
- the business has measured payment volume, failed-payment burden and reconciliation needs;
- a commercial-compatible deployment host and stable production webhook origin exist;
- the business has reviewed Côte d’Ivoire support, pricing, settlement currency/timing, merchant onboarding, refunds, disputes and support quality;
- legal/privacy/accounting responsibilities are understood;
- a non-production Supabase/staging environment exists for destructive webhook tests.

## Provider decision

Evaluate providers available to the business at decision time. Paystack and CinetPay are candidates, not pre-approved choices. Re-check current official documentation and commercial terms before choosing; do not rely on this roadmap for current prices or country/payment-method availability.

Record a decision matrix covering:

- Côte d’Ivoire merchant eligibility;
- supported Mobile Money networks and cards if needed;
- XOF handling;
- transaction and settlement fees;
- settlement timing and reconciliation exports;
- refund and dispute support;
- hosted-checkout accessibility/mobile quality;
- webhook signing, retries and event identifiers;
- sandbox quality;
- data residency/privacy and contractual review;
- operational support and outage fallback.

## Architectural constraints

- Implement through the existing `PaymentProvider` interface.
- Keep manual Mobile Money and COD as explicit fallbacks.
- Prefer hosted checkout; never collect or store card data, PINs, OTPs or CVVs.
- Create payment attempts server-side from authoritative order totals and currency.
- Treat browser redirects as customer navigation only, never proof of payment.
- Verify webhook signatures against the raw request body using server-only secrets.
- Validate merchant reference, order identity, integer XOF amount and currency.
- Process each provider event idempotently and tolerate delayed, duplicate and out-of-order delivery.
- Record immutable provider/payment history with safe bounded metadata.
- Never expose provider secrets or unrestricted payloads to clients, logs or admin DTOs.
- Reconcile uncertain payments through an authorized server-side provider lookup where supported.
- Preserve Phase 11 payment state rules and Phase 15 revenue double-count protection.

## Required lifecycle coverage

Test in sandbox/staging:

- checkout session creation;
- successful payment webhook;
- failed/cancelled/expired attempt;
- delayed webhook after redirect;
- duplicate webhook;
- out-of-order webhook;
- invalid signature;
- wrong amount/currency/reference;
- provider timeout and retry;
- admin reconciliation;
- refund initiation/result where supported;
- settlement reporting;
- manual fallback during provider outage.

Do not mark money received from a browser success page. Do not test real-money flows without an explicit controlled financial approval.

## Operational rollout

1. Select provider and complete legal/commercial review.
2. Add sandbox configuration using server-only secrets.
3. Implement provider adapter and webhook boundary.
4. Run unit, SQL/integration and destructive staging E2E.
5. Complete merchant production onboarding.
6. Configure production webhook URL and rotate production secrets.
7. Run a controlled low-value real payment and refund/reconciliation check if approved.
8. Enable for a limited scope while manual methods remain available.
9. Monitor failures, duplicates, reconciliation and settlement.
10. Expand only after stable evidence.

## Future plan changes

If Vercel, Supabase or the chosen provider plan changes, review:

- webhook runtime/timeouts and regional availability;
- secret/environment scopes;
- scheduler/reconciliation jobs;
- database capacity and backup guarantees;
- distributed rate limiting;
- log retention and PII scrubbing;
- staging isolation;
- provider event retention and replay procedures.

Document the chosen provider and exact verified behavior in a new approved phase. This roadmap is intentionally provider-neutral and creates no implementation commitment.
