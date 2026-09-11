import { DodoCheckoutConfig, DodoSDKMessage, LoggedEvent, SDKOpenOptions } from '../types/checkout';

type EventListenerFn = (event: LoggedEvent) => void;

class DodoCheckoutSDK {
  private activeIframe: HTMLIFrameElement | null = null;
  private activeOverlay: HTMLDivElement | null = null;
  private activeConfig: SDKOpenOptions | null = null;
  private currentNonce: string | null = null;
  private messageHandler: ((e: MessageEvent) => void) | null = null;
  private keydownHandler: ((e: KeyboardEvent) => void) | null = null;
  private eventListeners: Set<EventListenerFn> = new Set();
  private isProcessingPayment: boolean = false;

  /**
   * Subscribe to SDK debug events for the merchant live inspector console.
   */
  public onEvent(listener: EventListenerFn) {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  private emitEvent(direction: 'FROM_IFRAME' | 'TO_IFRAME', type: string, data: any, status: 'info' | 'success' | 'warning' | 'error' = 'info') {
    const event: LoggedEvent = {
      id: 'evt_' + Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString() + '.' + new Date().getMilliseconds().toString().padStart(3, '0'),
      direction,
      type,
      data,
      status,
    };
    this.eventListeners.forEach(listener => listener(event));
  }

  /**
   * Primary entry point: DodoCheckout.open(config)
   */
  public open(config: SDKOpenOptions): void {
    // Prevent duplicate modals
    if (this.activeOverlay) {
      const message = 'Checkout is already open. Duplicate open request ignored.';
      console.warn(`[DodoCheckout] ${message}`);
      this.emitEvent(
        'TO_IFRAME',
        'DodoCheckout.open_ignored',
        { reason: 'checkout_already_open' },
        'warning'
      );
      return;
    }

    this.activeConfig = config;
    this.currentNonce = 'nonce_' + Math.random().toString(36).substring(2, 11);
    this.isProcessingPayment = false;

    this.emitEvent('TO_IFRAME', 'DodoCheckout.open()', {
      productId: config.productId,
      amount: config.amount,
      currency: config.currency,
      nonce: this.currentNonce,
    }, 'info');

    if (config.duplicateOpenHandled) {
      this.emitEvent(
        'TO_IFRAME',
        'DodoCheckout.open_duplicate_handled',
        { reason: 'rapid_buy_click', action: 'opened_one_checkout' },
        'warning'
      );
    }

    // Create Modal Backdrop Overlay
    const overlay = document.createElement('div');
    overlay.id = 'dodo-checkout-overlay';
    overlay.className = 'fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md transition-opacity duration-300 opacity-0 ease-out';
    overlay.setAttribute('role', 'aria-modal');
    overlay.setAttribute('aria-modal', 'true');

    // Create Card Frame Wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'relative w-full max-w-[480px] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden transition-all transform scale-95 duration-300 ease-out';

    // Close button (top right of modal - inside the box)
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'absolute top-3 right-3 z-10 p-2 text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500';
    closeBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    `;
    closeBtn.title = "Close checkout";
    closeBtn.onclick = () => this.handleUserAttemptClose('user_cancelled');

    // Iframe Element
    const iframe = document.createElement('iframe');
    iframe.id = 'dodo-checkout-iframe';
    const checkoutTargetUrl = config.checkoutUrl || (window.location.origin + '/checkout.html');
    iframe.src = checkoutTargetUrl;
    iframe.className = 'w-full h-[620px] border-0 rounded-2xl bg-transparent shadow-inner';
    iframe.allow = 'payment';

    wrapper.appendChild(closeBtn);
    wrapper.appendChild(iframe);
    overlay.appendChild(wrapper);
    document.body.appendChild(overlay);

    this.activeOverlay = overlay;
    this.activeIframe = iframe;

    // Trigger open animation
    requestAnimationFrame(() => {
      overlay.classList.remove('opacity-0');
      wrapper.classList.remove('scale-95');
      wrapper.classList.add('scale-100');
    });

    // Listen to Iframe PostMessage events
    this.messageHandler = (event: MessageEvent) => this.handlePostMessage(event);
    window.addEventListener('message', this.messageHandler);

    // Keyboard listener for Escape & Focus Lock
    this.keydownHandler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        this.handleUserAttemptClose('user_cancelled');
      }
    };
    window.addEventListener('keydown', this.keydownHandler);

    // Backdrop click handler
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        this.handleUserAttemptClose('user_cancelled');
      }
    };
  }

  private handlePostMessage(event: MessageEvent): void {
    const data: DodoSDKMessage = event.data;
    if (!data || typeof data !== 'object' || !data.type || !data.type.startsWith('DODO_CHECKOUT_')) {
      return; // Ignore unrelated window messages
    }

    this.emitEvent('FROM_IFRAME', data.type, data, data.type.includes('ERROR') ? 'error' : data.type.includes('SUCCESS') ? 'success' : 'info');

    switch (data.type) {
      case 'DODO_CHECKOUT_READY': {
        // Send initial handshake with configuration to the iframe app
        if (this.activeIframe && this.activeIframe.contentWindow && this.activeConfig) {
          const initPayload: DodoSDKMessage = {
            type: 'DODO_CHECKOUT_INIT',
            nonce: this.currentNonce || undefined,
            payload: {
              productId: this.activeConfig.productId,
              productName: this.activeConfig.productName,
              productDescription: this.activeConfig.productDescription,
              amount: this.activeConfig.amount,
              currency: this.activeConfig.currency || 'USD',
              customerEmail: this.activeConfig.customerEmail,
              allowDiscountCode: this.activeConfig.allowDiscountCode,
              duplicateOpenHandled: this.activeConfig.duplicateOpenHandled,
            }
          };
          this.activeIframe.contentWindow.postMessage(initPayload, '*');
          this.emitEvent('TO_IFRAME', 'DODO_CHECKOUT_INIT', initPayload, 'info');
        }
        break;
      }

      case 'DODO_CHECKOUT_RESIZE': {
        if (this.activeIframe && data.height) {
          this.activeIframe.style.height = `${Math.max(500, Math.min(750, data.height))}px`;
        }
        break;
      }

      case 'DODO_CHECKOUT_SUCCESS': {
        this.isProcessingPayment = false;
        const sessionId = data.sessionId || 'sess_' + Math.random().toString(36).substring(2, 12);
        
        if (this.activeConfig?.onSuccess) {
          try {
            this.activeConfig.onSuccess({ sessionId });
          } catch (err) {
            console.error('[DodoCheckout] Error in onSuccess callback:', err);
          }
        }

        // Auto close after brief delay so user sees success confirmation checkmark
        setTimeout(() => {
          this.closeModal('payment_completed');
        }, 1800);
        break;
      }

      case 'DODO_CHECKOUT_PROCESSING': {
        this.isProcessingPayment = true;
        break;
      }

      case 'DODO_CHECKOUT_ERROR': {
        this.isProcessingPayment = false;
        const code = data.code || 'PAYMENT_FAILED';
        const message = data.message || 'Payment could not be processed.';

        if (this.activeConfig?.onError) {
          try {
            this.activeConfig.onError({ code, message });
          } catch (err) {
            console.error('[DodoCheckout] Error in onError callback:', err);
          }
        }
        break;
      }

      case 'DODO_CHECKOUT_CLOSE': {
        this.closeModal(data.reason || 'user_cancelled');
        break;
      }
    }
  }

  private handleUserAttemptClose(defaultReason: 'user_cancelled' | 'payment_completed' | 'error'): void {
    // If payment is currently processing inside the iframe, confirm with user
    if (this.isProcessingPayment) {
      const confirmClose = window.confirm('Payment is currently being processed. Are you sure you want to exit?');
      if (!confirmClose) return;
    }

    this.closeModal(defaultReason);
  }

  public closeModal(reason: 'user_cancelled' | 'payment_completed' | 'error' = 'user_cancelled'): void {
    if (!this.activeOverlay) return;

    // Clean up event listeners
    if (this.messageHandler) {
      window.removeEventListener('message', this.messageHandler);
      this.messageHandler = null;
    }
    if (this.keydownHandler) {
      window.removeEventListener('keydown', this.keydownHandler);
      this.keydownHandler = null;
    }

    // Trigger close transition
    this.activeOverlay.classList.add('opacity-0');
    const wrapper = this.activeOverlay.firstElementChild as HTMLElement;
    if (wrapper) {
      wrapper.classList.remove('scale-100');
      wrapper.classList.add('scale-95');
    }

    setTimeout(() => {
      if (this.activeOverlay && this.activeOverlay.parentNode) {
        this.activeOverlay.parentNode.removeChild(this.activeOverlay);
      }
      this.activeOverlay = null;
      this.activeIframe = null;

      if (this.activeConfig?.onClose) {
        try {
          this.activeConfig.onClose({ reason });
        } catch (err) {
          console.error('[DodoCheckout] Error in onClose callback:', err);
        }
      }

      this.emitEvent('TO_IFRAME', 'DodoCheckout.close()', { reason }, 'warning');
      this.activeConfig = null;
      this.isProcessingPayment = false;
    }, 250);
  }
}

export const DodoCheckout = new DodoCheckoutSDK();
