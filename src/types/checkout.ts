export type CheckoutTheme = 'light' | 'dark' | 'auto';

export interface ProductDetails {
  id: string;
  name: string;
  description: string;
  amount: number; // in cents or currency unit
  currency: string;
  image?: string;
  badge?: string;
}

export interface DodoCheckoutConfig {
  productId: string;
  productName?: string;
  productDescription?: string;
  amount?: number; // e.g. 2900 ($29.00)
  currency?: string;
  theme?: CheckoutTheme;
  customerEmail?: string;
  allowDiscountCode?: boolean;
  
  // Callbacks required by assignment brief
  onSuccess: (data: { sessionId: string }) => void;
  onClose: (data: { reason: 'user_cancelled' | 'payment_completed' | 'error' }) => void;
  onError: (data: { code: string; message: string }) => void;
}

export interface SDKOpenOptions extends DodoCheckoutConfig {
  // Optional custom checkout URL (defaults to window.location.origin + '/checkout.html')
  checkoutUrl?: string;
}

// Security & Communication Messages
export type DodoSDKMessageType =
  | 'DODO_CHECKOUT_INIT'
  | 'DODO_CHECKOUT_READY'
  | 'DODO_CHECKOUT_PROCESSING'
  | 'DODO_CHECKOUT_SUCCESS'
  | 'DODO_CHECKOUT_ERROR'
  | 'DODO_CHECKOUT_CLOSE'
  | 'DODO_CHECKOUT_RESIZE'
  | 'DODO_CONFIRM_CLOSE_REQ'
  | 'DODO_CONFIRM_CLOSE_RESP';

export interface DodoSDKMessage {
  type: DodoSDKMessageType;
  sessionId?: string;
  nonce?: string;
  payload?: any;
  code?: string;
  message?: string;
  reason?: 'user_cancelled' | 'payment_completed' | 'error';
  height?: number;
}

export interface LoggedEvent {
  id: string;
  timestamp: string;
  direction: 'FROM_IFRAME' | 'TO_IFRAME';
  type: string;
  data: any;
  status: 'info' | 'success' | 'warning' | 'error';
}
