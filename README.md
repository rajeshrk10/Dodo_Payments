# Dodo Payments - Tiny Embeddable Checkout SDK & App

A lightweight, secure, embeddable checkout solution built for **Dodo Payments**. Designed with zero host page card exposure, isolated iframe sandboxing, strict `postMessage` cross-domain security, edge-case state machine, and a merchant demo store featuring a live event inspector.

---

## Quick Start (How to Run)

### Prerequisites
- Node.js >= 18.x
- npm >= 9.x

### Installation & Local Development

```bash
# 1. Install dependencies
npm install

# 2. Start the unified development server
npm run dev
```

Open your browser to [http://localhost:3000](http://localhost:3000).

- **Demo Store Application**: `http://localhost:3000/index.html` (or `http://localhost:3000/`)
- **Checkout Iframe App**: `http://localhost:3000/checkout.html`

---

## Architecture & How the Pieces Talk to Each Other

The project is structured into three main layers:

```
+-----------------------------------------------------------------------------------+
| Host Merchant Page (Demo Store)                                                   |
|                                                                                   |
|  [ Buy Now ] ---------> DodoCheckout.open({ productId, theme, ... })              |
|                                |                                                  |
|                                v                                                  |
|                        Creates Modal Overlay & <iframe>                           |
|                                |                                                  |
|   +----------------------------|----------------------------------------------+   |
|   | Sandboxed Iframe           v                                              |   |
|   | (Checkout Web App)                                                        |   |
|   |  - Form state & card brand auto-detection                                 |   |
|   |  - Luhn algorithm & expiry date validation                                |   |
|   |  - Payment simulation engine (Test cards)                                 |   |
|   |                                                                           |   |
|   |  postMessage({ type: 'DODO_CHECKOUT_SUCCESS', sessionId })                |   |
|   +----------------------------|----------------------------------------------+   |
|                                | (Validated targetOrigin & Session Nonce)         |
|                                v                                                  |
|  DodoCheckout Callbacks <------+                                                  |
|   - onSuccess({ sessionId })                                                      |
|   - onError({ code, message })                                                    |
|   - onClose({ reason })                                                           |
|                                                                                   |
|  Live Merchant Debug Console (Inspector Log)                                      |
+-----------------------------------------------------------------------------------+
```

### Communication Protocol

1. **SDK Initialization (`DodoCheckout.open(config)`)**:
   - The SDK dynamically appends a modal backdrop overlay to the merchant's DOM with an isolated `<iframe>` pointing to the checkout application.
   - Generates a single-use session nonce (`nonce_...`).

2. **Iframe Handshake (`DODO_CHECKOUT_READY` -> `DODO_CHECKOUT_INIT`)**:
   - As soon as the iframe loads, it emits `DODO_CHECKOUT_READY` to `window.parent`.
   - The SDK receives this and sends `DODO_CHECKOUT_INIT` with the session nonce, product details, theme, and prefilled customer email.

3. **Strict Origin & Schema Verification**:
   - Every `postMessage` is filtered by target origin and validated against typed message schemas (`DODO_CHECKOUT_SUCCESS`, `DODO_CHECKOUT_ERROR`, `DODO_CHECKOUT_CLOSE`).
   - **Zero Card Data Leakage**: Raw card numbers, CVC, and expiry dates are processed purely inside the iframe's isolated origin and **never** transmitted back across postMessage to the merchant host DOM.

4. **Event Bus & Callback Dispatch**:
   - Upon payment resolution, the SDK calls the developer's registered callbacks:
     - `onSuccess({ sessionId })`
     - `onError({ code, message })`
     - `onClose({ reason })`

---

## Test Card Simulation Engine

| Card Number | Behavior & Outcome | Notes |
| :--- | :--- | :--- |
| `4242 4242 4242 4242` | **Success** | Immediately authorizes payment, triggers confetti animation, and returns `sessionId`. |
| `4000 0000 0000 0002` | **Declines** | Rejects payment with `CARD_DECLINED` error banner and fires `onError` callback. |
| `4000 0000 0000 0341` | **Stateful Retry** | **Attempt 1**: Fails with bank connection timeout. <br/> **Attempt 2**: Succeeds authorization on retry within same session. |

---

## Two Technical Decisions Went Back & Forth On

### 1. Iframe Overlay vs. Shadow DOM / Web Components
- **Initial Thought**: Building the checkout form inside a Web Component / Shadow DOM would eliminate iframe overhead and provide smoother host integration.
- **The Call**: **Chose Isolated Iframe Overlay.**
- **Why**: PCI-DSS compliance and card security mandate strict isolation. In a Shadow DOM setup, malicious JavaScript running on the merchant host page (e.g. compromised analytics or browser extensions) could access input elements, attach keyloggers, or inspect memory. Sandboxed iframe isolation guarantees that sensitive card data remains entirely out of reach of the merchant DOM.

### 2. PostMessage Communication: One-Way Callback Emission vs. Bidirectional State Machine
- **Initial Thought**: Emit simple one-way fire-and-forget events (`payment_success`, `payment_failed`) from iframe to host.
- **The Call**: **Chose Bidirectional Handshake Protocol with Nonce Checks & Dynamic Resizing.**
- **Why**: Payment flows have complex intermediate states (e.g., resizing based on dynamic error banners, user confirming early modal dismissal while payment is `processing`, stateful retry card attempts). A bidirectional protocol ensures the host SDK can manage modal lifecycle safety (preventing accidental backdrop clicks during processing) while keeping the host DOM informed without exposing raw state.

---

## What I'd Explore Next

1. **Passkeys & WebAuthn / Apple Pay Integration**:
   - Support device-native biometric authentication (`PublicKeyCredential`) for 1-click zero-friction checkout.
2. **Server-Side Webhook Verification & Cryptographic Signatures**:
   - Implement HMAC-SHA256 signature verification (`dodo-signature`) so merchants verify checkout events on their backend before granting digital fulfillment.
3. **Zero-Knowledge Tokenization (PCI-DSS SAQ-A Compliance)**:
   - Integrate client-side card tokenization so actual card numbers are converted into single-use tokens (`tok_...`) before reaching payment processors.
4. **Offline Service Worker Queue & Progressive Web App Support**:
   - Queue pending payment authorization requests during spotty network connectivity and auto-retry upon reconnection.

---

## Project Structure

```
dodo-checkout/
├── index.html                   # Merchant Demo Store Entry
├── checkout.html                # Sandboxed Checkout Iframe App Entry
├── vite.config.ts               # Multi-page build configuration
├── tsconfig.json                # Strict TypeScript configuration
├── src/
│   ├── types/
│   │   └── checkout.ts          # Type definitions for SDK, messages & events
│   ├── utils/
│   │   └── cardUtils.ts         # Luhn validation, brand detection, formatting
│   ├── sdk/
│   │   └── dodo-checkout-sdk.ts # Main DodoCheckout SDK implementation
│   ├── checkout/
│   │   ├── CheckoutApp.tsx      # React Checkout Web Application
│   │   └── main.tsx             # Entry script for checkout iframe
│   └── demo/
│       ├── DemoStore.tsx        # Merchant Demo Store with live inspector
│       └── main.tsx             # Entry script for demo store
└── README.md                    # Project documentation
```
