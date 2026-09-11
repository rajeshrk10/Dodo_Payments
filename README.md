# Dodo Payments — Tiny Embeddable Checkout

A TypeScript demo of a tiny embeddable checkout for Dodo Payments. The project contains three pieces: a merchant demo site, an SDK module that opens the checkout, and a hosted checkout application that runs inside an iframe.

The implementation focuses on a short, trustworthy payment flow, clear callback behavior, required fake-payment scenarios, loading and error states, and protection against duplicate checkout requests.

## Quick Start

### Prerequisites

- Node.js 18 or later

- npm 9 or later

### Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

- Demo store: `http://localhost:3000/`

- Checkout application: `http://localhost:3000/checkout.html`

### Production build

```bash
npm run build
```

The build runs TypeScript compilation followed by the Vite production build.

## Live Demo

- [Live demo store](https://dodo-payment.vercel.app/)

- [Hosted checkout application](https://dodo-payment.vercel.app/checkout.html)

- [Source repository](https://github.com/rajeshrk10/Dodo_Payments)

## SDK Usage

The SDK exposes a small `DodoCheckout.open()` API with the callback shape requested in the assignment:

```
DodoCheckout.open({
  productId: "prod_123",
  onSuccess: ({ sessionId }) => {
    console.log("Payment succeeded:", sessionId);
  },
  onClose: ({ reason }) => {
    console.log("Checkout closed:", reason);
  },
  onError: ({ code, message }) => {
    console.error("Payment failed:", code, message);
  },
});
```

The demo supplies additional optional values such as the product name, amount, currency, and prefilled customer email:

```
DodoCheckout.open({
  productId: product.id,
  productName: product.name,
  amount: product.priceCents,
  currency: product.currency,
  customerEmail: "alex.developer@example.com",
  onSuccess: ({ sessionId }) => {
    // Update the merchant order state.
  },
  onError: ({ code, message }) => {
    // Show a payment failure message.
  },
  onClose: ({ reason }) => {
    // Record how the checkout ended.
  },
});
```

The SDK also exposes `DodoCheckout.onEvent()` for the demo event inspector. This is a development/debugging facility rather than a required payment callback.

## Architecture

The project is organized into three layers:

```
Merchant demo page
  └─ Buy Now
      └─ DodoCheckout.open(config)
          └─ Creates modal overlay and checkout iframe
              └─ Checkout app renders product, email, card, and Pay form
                  └─ Sends typed checkout messages to the host
                      └─ SDK dispatches onSuccess, onError, and onClose
```

### How the pieces communicate

1. The demo page calls `DodoCheckout.open(config)`.

1. The SDK creates a modal overlay containing the checkout iframe.

1. The checkout iframe sends `DODO_CHECKOUT_READY` to the host.

1. The SDK responds with `DODO_CHECKOUT_INIT`, including product details, customer email, and a generated session nonce.

1. The customer completes the form inside the checkout iframe.

1. The checkout sends a success, error, processing, close, or resize message to the SDK.

1. The SDK dispatches the registered merchant callbacks.

1. The demo displays SDK communication events in its event inspector.

The checkout app processes card values inside the iframe and does not include raw card number, expiry, or CVC values in merchant callbacks or the demo event log. The merchant receives only the result data needed for the integration, such as `sessionId`, error code/message, or close reason.

## Callback Contract

The SDK calls the registered callbacks using these shapes:

```
onSuccess({ sessionId: string });
onError({ code: string, message: string });
onClose({ reason: "user_cancelled" | "payment_completed" | "error" });
```

The demo tracks these callback outcomes in the header metrics:

- Successful payments

- Payment errors

- Checkout closes

Callback functions are protected with `try/catch` inside the SDK so a merchant callback exception does not break checkout cleanup.

## Required Test Cards

| Card number | Expected behavior |
| --- | --- |
| `4242 4242 4242 4242` | Succeeds immediately and returns a generated `sessionId`. |
| `4000 0000 0000 0002` | Declines with `CARD_DECLINED`, keeps the checkout open, and allows another attempt. |
| `4000 0000 0000 0341` | Fails with a retryable bank timeout on the first attempt, then succeeds on retry within the same checkout session. |

The demo shows these cards in a test-card panel with click-to-copy behavior.

## Duplicate Buy-Click Handling

The checkout uses a modal overlay, so the first Buy click normally covers the merchant page. To make rapid physical double-click behavior deterministic and demonstrable, the demo uses a **500 ms debounce window**:

- A single Buy click waits 500 ms and then opens one checkout.

- A second click within the 500 ms window cancels the pending open and opens exactly one checkout.

- The SDK receives `duplicateOpenHandled: true` for that flow.

- The event inspector records `DodoCheckout.open_duplicate_handled`.

- The checkout shows a customer-facing reassurance below the Pay button:

> Only one payment session is active. You won’t be charged twice.

The SDK also has an independent active-overlay guard. If `DodoCheckout.open()` is called while another checkout is already open, the second request is ignored and the SDK emits `DodoCheckout.open_ignored`. This protects integrations that issue duplicate calls programmatically.

The two protections serve different purposes:

1. The demo’s 500 ms window makes a rapid physical Buy-button double-click observable.

1. The SDK’s active-overlay guard prevents multiple checkout instances from being created by any integration.

## Checkout States

The checkout handles the following states:

- **Idle:** Form fields are editable and Pay is available.

- **Processing:** A simulated banking delay is shown and the form is disabled.

- **Success:** A confirmation screen displays the generated session ID before the modal closes.

- **Error:** A specific error message is shown and the customer can retry.

- **Close:** ESC, the close button, or a safe backdrop click closes the checkout and reports a close reason.

The form also validates email, card number, expiry date, and CVC before starting payment simulation. Card brand detection, card-number formatting, expiry formatting, loading animation, error animation, and success animation are included.

## Security Boundary and Current Scope

The checkout form is hosted in an iframe so card fields are kept separate from the merchant page’s normal DOM and are not returned through merchant callbacks or the demo event log.

This assignment implementation uses `postMessage` for communication and generates a per-checkout nonce for the initialization handshake. The current demo is served from a single Vercel origin and uses wildcard `postMessage` targets for simplicity. Full production hardening would additionally:

- Host the checkout on a dedicated checkout origin.

- Use explicit `targetOrigin` values instead of `"*"`.

- Validate `event.origin` and `event.source` for every incoming message.

- Validate the nonce on every message, not only during initialization.

- Add server-side payment authorization and webhook verification.

- Publish the SDK as a standalone browser bundle or npm package.

Therefore, this repository demonstrates the requested frontend assignment flow; it is not presented as production-ready payment infrastructure.

## Design Decisions

### 1. Modal iframe instead of an inline form

An iframe modal keeps the customer on the merchant page while giving the checkout its own UI and form boundary. The modal also makes the checkout feel like a focused payment step rather than another section of the product page.

The trade-off is that the merchant Buy button is covered after the first click. The 500 ms debounce window and SDK active-overlay guard make rapid and programmatic duplicate requests safe and observable.

### 2. Typed message protocol instead of direct DOM coupling

The merchant page and checkout communicate through named messages such as `DODO_CHECKOUT_INIT`, `DODO_CHECKOUT_PROCESSING`, `DODO_CHECKOUT_SUCCESS`, `DODO_CHECKOUT_ERROR`, and `DODO_CHECKOUT_CLOSE`. This keeps the host integration small and prevents the merchant page from depending on the checkout’s internal React state.

## What I Would Explore Next

1. Add a dedicated checkout origin with explicit origin and nonce validation.

1. Publish the SDK as a standalone npm package and browser bundle.

1. Add server-side payment authorization, webhook verification, and signed event delivery.

1. Add tokenization so the frontend never handles a raw payment credential beyond the hosted payment boundary.

1. Add production accessibility review, automated end-to-end tests, and network-failure simulations.

1. Explore passkeys, Apple Pay, and other accelerated payment methods.

## Project Structure

```
Dodo_Payments/
├── index.html                         # Merchant demo entry
├── checkout.html                      # Checkout iframe entry
├── vite.config.ts                     # Vite multi-page configuration
├── package.json                        # Scripts and dependencies
├── src/
│   ├── types/
│   │   └── checkout.ts                # SDK and message types
│   ├── utils/
│   │   └── cardUtils.ts               # Card formatting and validation
│   ├── sdk/
│   │   └── dodo-checkout-sdk.ts       # Checkout SDK implementation
│   ├── checkout/
│   │   ├── CheckoutApp.tsx            # Hosted checkout UI and simulation
│   │   └── main.tsx                   # Checkout entry script
│   ├── demo/
│   │   ├── DemoStore.tsx              # Merchant demo and event inspector
│   │   └── main.tsx                   # Demo entry script
│   └── index.css                      # Global styles and animations
└── README.md                          # Project documentation
```

## Submission Checklist

- Live demo link: [https://dodo-payment.vercel.app/](https://dodo-payment.vercel.app/)

- Source code: [GitHub repository](https://github.com/rajeshrk10/Dodo_Payments)

- Local setup and build instructions: included above

- SDK, checkout, and demo communication model: included above

- Two design decisions: included above

- Future exploration: included above

- Required test cards: included above

## License and Assignment Scope

This project was built as a frontend engineering assignment demonstration. The payment flow is intentionally simulated in the browser and does not connect to a real payment processor or production payment backend.