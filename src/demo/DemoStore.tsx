import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  ShieldCheck,
  Terminal,
  Copy,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Sparkles,
  Code2,
  Cpu,
  Laptop,
} from 'lucide-react';
import { DodoCheckout } from '../sdk/dodo-checkout-sdk';
import { LoggedEvent, CheckoutTheme } from '../types/checkout';
import { TEST_CARDS } from '../utils/cardUtils';

interface ProductItem {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  currency: string;
  badge?: string;
  icon: string;
}

const PRODUCTS: ProductItem[] = [
  {
    id: 'prod_esp32_s3_devkit',
    name: 'ESP32-S3 IoT Development Board',
    description: 'Wi-Fi and Bluetooth LE microcontroller board for connected devices, automation, and rapid prototyping.',
    priceCents: 1899,
    currency: 'USD',
    badge: 'Best Seller',
    icon: '⚡',
  },
  {
    id: 'prod_bme688_sensor',
    name: 'BME688 Environmental Sensor',
    description: 'Compact air-quality, temperature, humidity, and pressure sensor for indoor monitoring and IoT projects.',
    priceCents: 1299,
    currency: 'USD',
    badge: 'New Arrival',
    icon: '◌',
  },
  {
    id: 'prod_rp_pico_2',
    name: 'Raspberry Pi Pico 2 Microcontroller',
    description: 'Compact dual-core microcontroller for robotics, embedded control, and low-power hardware projects.',
    priceCents: 799,
    currency: 'USD',
    icon: '◆',
  },
];

export default function DemoStore() {
  const [selectedProduct, setSelectedProduct] = useState<ProductItem>(PRODUCTS[0]);
  const [events, setEvents] = useState<LoggedEvent[]>([]);
  const [copiedCard, setCopiedCard] = useState<string | null>(null);

  // Callback Metrics
  const [stats, setStats] = useState({
    successes: 0,
    errors: 0,
    closes: 0,
  });

  const consoleEndRef = React.useRef<HTMLDivElement | null>(null);

  // Subscribe to SDK event logger
  useEffect(() => {
    const unsubscribe = DodoCheckout.onEvent((event) => {
      setEvents((prev) => [...prev.slice(-49), event]); // append chronologically
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // Auto-scroll to bottom of console when new events arrive
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [events]);

  const handleOpenCheckout = (prod: ProductItem) => {
    DodoCheckout.open({
      productId: prod.id,
      productName: prod.name,
      productDescription: 'Secure embedded checkout for fast, trusted purchases.',
      amount: prod.priceCents,
      currency: prod.currency,
      customerEmail: 'alex.developer@example.com',
      onSuccess: ({ sessionId }) => {
        setStats((s) => ({ ...s, successes: s.successes + 1 }));
      },
      onError: ({ code, message }) => {
        setStats((s) => ({ ...s, errors: s.errors + 1 }));
      },
      onClose: ({ reason }) => {
        setStats((s) => ({ ...s, closes: s.closes + 1 }));
      },
    });
  };

  const copyTestCard = (card: string, label: string) => {
    navigator.clipboard.writeText(card);
    setCopiedCard(label);
    setTimeout(() => setCopiedCard(null), 1500);
  };

  const clearLogs = () => setEvents([]);

  const formatMoney = (cents: number, curr: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: curr,
    }).format(cents / 100);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-extrabold text-lg shadow-md shadow-emerald-500/20">
              <Cpu className="w-5 h-5" strokeWidth={2.5} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg tracking-tight text-white">CircuitCore Electronics</span>
              </div>
              <p className="text-xs text-slate-400">Embedded Hardware for Modern Prototyping</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Quick Metrics Badge */}
            <div className="hidden md:flex items-center space-x-3 bg-slate-950 px-3.5 py-1.5 rounded-xl border border-slate-800 text-xs font-mono">
              <span className="text-slate-400">Callbacks:</span>
              <span className="text-emerald-400 font-bold">✓ {stats.successes}</span>
              <span className="text-red-400 font-bold">✗ {stats.errors}</span>
              <span className="text-amber-400 font-bold">⨉ {stats.closes}</span>
            </div>

            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition-colors"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Source Code</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 w-full">
        {/* Left Column: Product Showcase & Test Card Controls (7 cols) */}
        <section className="lg:col-span-7 space-y-6">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/20 p-6 rounded-2xl relative overflow-hidden">
            <div className="absolute right-0 top-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -z-0 pointer-events-none" />
            <div className="relative z-10 space-y-2">
              <span className="inline-flex items-center text-xs font-bold text-emerald-400 uppercase tracking-widest">
                <Sparkles className="w-3.5 h-3.5 mr-1" /> Embedded Hardware Catalog
              </span>
              <h2 className="text-2xl font-extrabold text-white tracking-tight">
                Microcontrollers, Sensors & Development Boards
              </h2>
              <p className="text-sm text-slate-400 max-w-xl">
                Browse essential electronics for prototyping and connected-device projects with secure checkout and real-time order events.
              </p>
            </div>
          </div>

          {/* Test Card Cheat Sheet & Controls */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-200 flex items-center">
                <Laptop className="w-4 h-4 text-emerald-400 mr-2" />
                Test Payment Cards
              </h3>
              <span className="text-[11px] text-slate-400">Click card to copy</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Card 1 */}
              <button
                type="button"
                onClick={() => copyTestCard(TEST_CARDS.SUCCESS, 'Success')}
                className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/40 rounded-xl text-left transition-all group relative cursor-pointer"
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-emerald-400 flex items-center">
                    <CheckCircle className="w-3 h-3 mr-1" /> Success Card
                  </span>
                  {copiedCard === 'Success' ? (
                    <span className="text-[10px] text-emerald-400 font-bold">Copied!</span>
                  ) : (
                    <Copy className="w-3 h-3 text-slate-600 group-hover:text-slate-300" />
                  )}
                </div>
                <div className="font-mono text-xs text-slate-300 tracking-wider">
                  {TEST_CARDS.SUCCESS}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">Simulates successful payment</div>
              </button>

              {/* Card 2 */}
              <button
                type="button"
                onClick={() => copyTestCard(TEST_CARDS.DECLINE, 'Decline')}
                className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-red-500/40 rounded-xl text-left transition-all group relative cursor-pointer"
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-red-400 flex items-center">
                    <XCircle className="w-3 h-3 mr-1" /> Decline Card
                  </span>
                  {copiedCard === 'Decline' ? (
                    <span className="text-[10px] text-emerald-400 font-bold">Copied!</span>
                  ) : (
                    <Copy className="w-3 h-3 text-slate-600 group-hover:text-slate-300" />
                  )}
                </div>
                <div className="font-mono text-xs text-slate-300 tracking-wider">
                  {TEST_CARDS.DECLINE}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">Simulates card decline error</div>
              </button>

              {/* Card 3 */}
              <button
                type="button"
                onClick={() => copyTestCard(TEST_CARDS.RETRY_SUCCESS, 'Retry')}
                className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/40 rounded-xl text-left transition-all group relative cursor-pointer"
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-amber-400 flex items-center">
                    <AlertCircle className="w-3 h-3 mr-1" /> Stateful Retry Card
                  </span>
                  {copiedCard === 'Retry' ? (
                    <span className="text-[10px] text-emerald-400 font-bold">Copied!</span>
                  ) : (
                    <Copy className="w-3 h-3 text-slate-600 group-hover:text-slate-300" />
                  )}
                </div>
                <div className="font-mono text-xs text-slate-300 tracking-wider">
                  {TEST_CARDS.RETRY_SUCCESS}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">Fails once, succeeds on retry</div>
              </button>
            </div>
          </div>

          {/* Product Cards */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
              Featured Hardware (Select an item to buy)
            </h3>

            <div className="grid grid-cols-1 gap-4">
              {PRODUCTS.map((product) => (
                <div
                  key={product.id}
                  className={`p-5 rounded-2xl border transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    selectedProduct.id === product.id
                      ? 'bg-slate-900 border-emerald-500/60 shadow-lg shadow-emerald-500/5'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                  onClick={() => setSelectedProduct(product)}
                >
                  <div className="flex items-start space-x-4">
                    <div className="text-3xl p-3 bg-slate-950 rounded-xl border border-slate-800">
                      {product.icon}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-bold text-white text-base">{product.name}</h4>
                        {product.badge && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            {product.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 max-w-md">{product.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end space-x-4 pt-3 sm:pt-0 border-t sm:border-0 border-slate-800">
                    <div className="text-right">
                      <span className="text-lg font-extrabold text-white font-mono block">
                        {formatMoney(product.priceCents, product.currency)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenCheckout(product);
                      }}
                      className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-md shadow-emerald-500/20 flex items-center space-x-1.5 cursor-pointer shrink-0"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      <span>Buy Now</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Right Column: Live Event Inspector Console (5 cols) */}
        <section className="lg:col-span-5 flex flex-col">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col shadow-2xl h-[640px] max-h-[640px] overflow-hidden">
            {/* Inspector Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <div className="flex items-center space-x-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Checkout Event Log</h3>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={clearLogs}
                  title="Clear Event Logs"
                  className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-xs flex items-center space-x-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              </div>
            </div>

            {/* Event Console Stream */}
            <div className="flex-1 overflow-y-auto space-y-2.5 font-mono text-xs pr-1">
              {events.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500 space-y-2">
                  <Code2 className="w-8 h-8 text-slate-700" />
                  <p className="text-xs">No SDK events captured yet.</p>
                  <p className="text-[11px] text-slate-600">
                    Click "Buy Now" to inspect the checkout communication events.
                  </p>
                </div>
              ) : (
                events.map((evt) => (
                  <div
                    key={evt.id}
                    className={`p-3 rounded-xl border transition-all ${
                      evt.status === 'success'
                        ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                        : evt.status === 'error'
                        ? 'bg-red-950/20 border-red-500/30 text-red-300'
                        : evt.status === 'warning'
                        ? 'bg-amber-950/20 border-amber-500/30 text-amber-300'
                        : 'bg-slate-950 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded uppercase ${
                          evt.direction === 'FROM_IFRAME'
                              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          {evt.direction}
                        </span>
                        <span className="font-bold text-white text-xs">{evt.type}</span>
                      </div>
                      <span className="text-[10px] text-slate-500">{evt.timestamp}</span>
                    </div>

                    <pre className="text-[11px] bg-slate-950/80 p-2 rounded-lg overflow-x-auto text-slate-400 border border-slate-800/60">
                      {JSON.stringify(evt.data, null, 2)}
                    </pre>
                  </div>
                ))
              )}
              <div ref={consoleEndRef} />
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-4 bg-slate-950 text-center text-xs text-slate-500">
        CircuitCore Electronics • Embedded Hardware • Secure Checkout
      </footer>
    </div>
  );
}
