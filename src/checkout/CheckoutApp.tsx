import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  ShieldCheck,
  CreditCard,
  Lock,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  ArrowRight,
  HelpCircle,
  Cpu,
} from 'lucide-react';
import { DodoSDKMessage, ProductDetails } from '../types/checkout';
import {
  detectCardBrand,
  formatCardNumber,
  formatExpiry,
  validateLuhn,
  validateExpiry,
  TEST_CARDS,
} from '../utils/cardUtils';

const DEFAULT_PRODUCT: ProductDetails = {
  id: 'prod_dodo_pro',
  name: 'Dodo Payments Pro',
  description: 'Secure payment checkout',
  amount: 4900,
  currency: 'USD',
};

export default function CheckoutApp() {
  const [product, setProduct] = useState<ProductDetails>(DEFAULT_PRODUCT);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [email, setEmail] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');

  // States
  const [status, setStatus] = useState<'IDLE' | 'PROCESSING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  
  // Stateful retry tracker for card 4000 0000 0000 0341
  const [retryCardAttempts, setRetryCardAttempts] = useState<number>(0);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const cardBrandInfo = detectCardBrand(cardNumber);

  // Initialize postMessage Handshake with Host SDK
  useEffect(() => {
    // Notify parent host SDK that iframe is ready
    window.parent.postMessage({ type: 'DODO_CHECKOUT_READY' } as DodoSDKMessage, '*');

    const handleParentMessage = (event: MessageEvent) => {
      const data: DodoSDKMessage = event.data;
      if (!data || data.type !== 'DODO_CHECKOUT_INIT') return;

      if (data.payload) {
        if (data.payload.productName || data.payload.amount) {
          setProduct({
            id: data.payload.productId || 'prod_custom',
            name: data.payload.productName || 'Custom Purchase',
            description: data.payload.productDescription || 'Secure payment checkout',
            amount: data.payload.amount || 2900,
            currency: data.payload.currency || 'USD',
          });
        }
        if (data.payload.customerEmail) {
          setEmail(data.payload.customerEmail);
        }
        if (data.payload.theme) {
          setTheme(data.payload.theme);
        }
      }
    };

    window.addEventListener('message', handleParentMessage);
    return () => window.removeEventListener('message', handleParentMessage);
  }, []);

  // Listen for Escape key pressed inside iframe inputs/document
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        window.parent.postMessage({ type: 'DODO_CHECKOUT_CLOSE', reason: 'user_cancelled' } as DodoSDKMessage, '*');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Post height resizing to parent SDK if needed
  useEffect(() => {
    const height = document.documentElement.scrollHeight;
    window.parent.postMessage({ type: 'DODO_CHECKOUT_RESIZE', height } as DodoSDKMessage, '*');
  }, [status, errorMessage]);

  const triggerErrorShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 400);
  };

  const validateForm = (): boolean => {
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setErrorMessage('Please enter a valid email address.');
      triggerErrorShake();
      return false;
    }

    const cleanCard = cardNumber.replace(/\D/g, '');
    if (cleanCard.length < 15 || (!validateLuhn(cleanCard) && !cleanCard.startsWith('4000'))) {
      setErrorMessage('Please enter a valid credit card number.');
      triggerErrorShake();
      return false;
    }

    if (!validateExpiry(expiry)) {
      setErrorMessage('Please enter a valid future expiry date (MM/YY).');
      triggerErrorShake();
      return false;
    }

    if (cvc.length < cardBrandInfo.cvcLength) {
      setErrorMessage(`Security code (CVC) must be ${cardBrandInfo.cvcLength} digits.`);
      triggerErrorShake();
      return false;
    }

    setErrorMessage(null);
    return true;
  };

  const processCardPayment = (rawCardNumber: string) => {
    if (status === 'PROCESSING') return;

    setStatus('PROCESSING');
    setErrorMessage(null);
    
    // Notify parent SDK that payment processing has started
    window.parent.postMessage({ type: 'DODO_CHECKOUT_PROCESSING' } as DodoSDKMessage, '*');

    const cleanCard = rawCardNumber.replace(/\D/g, '');

    // Simulate Network Latency & Server Authorization
    setTimeout(() => {
      // RULE 1: 4242 4242 4242 4242 -> SUCCEEDS
      if (cleanCard === TEST_CARDS.SUCCESS.replace(/\D/g, '')) {
        completePaymentSuccess();
        return;
      }

      // RULE 2: 4000 0000 0000 0002 -> DECLINES
      if (cleanCard === TEST_CARDS.DECLINE.replace(/\D/g, '')) {
        const errCode = 'CARD_DECLINED';
        const msg = 'Your card was declined. Please check details or try another card.';
        setStatus('ERROR');
        setErrorCode(errCode);
        setErrorMessage(msg);
        triggerErrorShake();
        window.parent.postMessage(
          { type: 'DODO_CHECKOUT_ERROR', code: errCode, message: msg } as DodoSDKMessage,
          '*'
        );
        return;
      }

      // RULE 3: 4000 0000 0000 0341 -> FAILS ONCE, THEN SUCCEEDS ON RETRY
      if (cleanCard === TEST_CARDS.RETRY_SUCCESS.replace(/\D/g, '')) {
        if (retryCardAttempts === 0) {
          // First Attempt -> Failure
          setRetryCardAttempts(1);
          const errCode = 'BANK_TIMEOUT_RETRYABLE';
          const msg = 'Bank connection timed out. Please click Pay again to retry authorization.';
          setStatus('ERROR');
          setErrorCode(errCode);
          setErrorMessage(msg);
          triggerErrorShake();
          window.parent.postMessage(
            { type: 'DODO_CHECKOUT_ERROR', code: errCode, message: msg } as DodoSDKMessage,
            '*'
          );
        } else {
          // Second Attempt -> Success
          completePaymentSuccess();
        }
        return;
      }

      // Fallback for any other valid card number entered
      completePaymentSuccess();
    }, 1200);
  };

  const handlePaymentSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validateForm()) return;
    processCardPayment(cardNumber);
  };

  const completePaymentSuccess = () => {
    const generatedSessionId = 'sess_' + Math.random().toString(36).substring(2, 12);
    setSessionId(generatedSessionId);
    setStatus('SUCCESS');

    // Confetti effect
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10B981', '#059669', '#34D399'],
      });
    } catch (err) {
      // Fallback if canvas confetti fails
    }

    // Post success message to parent window
    window.parent.postMessage(
      { type: 'DODO_CHECKOUT_SUCCESS', sessionId: generatedSessionId } as DodoSDKMessage,
      '*'
    );
  };

  const formatMoney = (cents: number, curr: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: curr,
    }).format(Math.max(0, cents) / 100);
  };

  const finalAmount = Math.max(0, product.amount);

  return (
    <div className={`w-full min-h-screen p-4 text-slate-100 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col justify-between ${isShaking ? 'animate-shake' : ''}`}>
      {/* Header */}
      <div className="pt-12">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
              <Cpu className="w-4 h-4" strokeWidth={2.5} />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">Secure Checkout</span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Lock className="w-2.5 h-2.5 mr-0.5" /> 256-bit SSL
                </span>
              </div>
              <h1 className="text-base font-bold text-white tracking-tight">{product.name}</h1>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400 block">Total Due</span>
            <span className="text-xl font-extrabold text-emerald-400 font-mono tracking-tight">
              {formatMoney(finalAmount, product.currency)}
            </span>
          </div>
        </div>

        {/* Status Screens */}
        {status === 'SUCCESS' ? (
          <div className="py-8 text-center space-y-4 animate-fadeIn">
            <div className="w-16 h-16 bg-emerald-500/10 border-2 border-emerald-500 rounded-full flex items-center justify-center mx-auto text-emerald-400 animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-white">Payment Successful!</h2>
              <p className="text-xs text-slate-400 mt-1">Thank you for your purchase.</p>
            </div>
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60 text-left space-y-1 text-xs font-mono">
              <div className="flex justify-between text-slate-400">
                <span>Session ID:</span>
                <span className="text-emerald-400 font-medium">{sessionId}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Amount Paid:</span>
                <span className="text-slate-200">{formatMoney(finalAmount, product.currency)}</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 italic">Returning you back to merchant store...</p>
          </div>
        ) : status === 'PROCESSING' ? (
          <div className="py-12 text-center space-y-4 animate-fadeIn">
            <div className="w-12 h-12 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto text-emerald-400" />
            <div>
              <h3 className="text-base font-bold text-white">Processing Payment</h3>
              <p className="text-xs text-slate-400 mt-1">Connecting to banking network securely...</p>
            </div>
            <div className="inline-flex items-center space-x-1 text-[11px] text-slate-500 bg-slate-800/40 px-3 py-1.5 rounded-full border border-slate-800">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Idempotency token active. Please do not close window.</span>
            </div>
          </div>
        ) : (
          /* Payment Form */
          <form onSubmit={handlePaymentSubmit} className="space-y-3">
            {/* Error Banner */}
            {errorMessage && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start space-x-2.5 text-red-300 text-xs animate-fadeIn">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-semibold block">{errorCode ? errorCode : 'Validation Error'}</span>
                  <span>{errorMessage}</span>
                </div>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                disabled={status !== 'IDLE' && status !== 'ERROR'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="customer@example.com"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-sans disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            {/* Card Information */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-300">
                  Card Details
                </label>
                <span className="text-[11px] text-slate-400 capitalize font-medium flex items-center">
                  <CreditCard className="w-3 h-3 mr-1 text-emerald-400" />
                  {cardBrandInfo.name}
                </span>
              </div>
              
              <div className="relative">
                <input
                  type="text"
                  required
                  disabled={status !== 'IDLE' && status !== 'ERROR'}
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                  placeholder="4242 4242 4242 4242"
                  maxLength={19}
                  className="w-full pl-3.5 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <div className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold uppercase">
                  {cardBrandInfo.brand === 'visa' && <span className="text-blue-400">VISA</span>}
                  {cardBrandInfo.brand === 'mastercard' && <span className="text-orange-400">MC</span>}
                  {cardBrandInfo.brand === 'amex' && <span className="text-sky-400">AMEX</span>}
                  {cardBrandInfo.brand === 'discover' && <span className="text-amber-400">DISC</span>}
                  {cardBrandInfo.brand === 'unknown' && <CreditCard className="w-4 h-4 text-slate-500" />}
                </div>
              </div>
            </div>

            {/* Expiry & CVC Row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Expires (MM/YY)
                </label>
                <input
                  type="text"
                  required
                  disabled={status !== 'IDLE' && status !== 'ERROR'}
                  value={expiry}
                  onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                  placeholder="MM/YY"
                  maxLength={5}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                  <span>CVC / CVV</span>
                  <HelpCircle className="w-3 h-3 text-slate-500" />
                </label>
                <input
                  type="password"
                  required
                  disabled={status !== 'IDLE' && status !== 'ERROR'}
                  value={cvc}
                  onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="123"
                  maxLength={4}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full mt-2 py-3 px-4 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-bold rounded-xl text-sm transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20 cursor-pointer"
            >
              <span>Pay {formatMoney(finalAmount, product.currency)}</span>
              <ArrowRight className="w-4 h-4 text-slate-950" />
            </button>
          </form>
        )}
      </div>

      {/* Footer */}
      <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
        <div className="flex items-center space-x-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Encrypted payment processing</span>
        </div>
      </div>
    </div>
  );
}
