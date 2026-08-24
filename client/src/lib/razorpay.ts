export const RAZORPAY_KEY_ID =
  import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_TTYAXG7VWTlIRe';

/**
 * Loads the Razorpay checkout script if not already present.
 */
export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.error('Failed to load Razorpay Checkout SDK');
      resolve(false);
    };
    document.body.appendChild(script);
  });
}

export interface OpenRazorpayOptions {
  orderId: string;
  amount: number; // in paise
  currency?: string;
  name?: string;
  description?: string;
  key?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  onSuccess: (response: RazorpayPaymentSuccessResponse) => void | Promise<void>;
  onDismiss?: () => void;
  onError?: (error: any) => void;
}

/**
 * Opens the Razorpay Standard Checkout modal.
 */
export async function openRazorpayCheckout(options: OpenRazorpayOptions): Promise<void> {
  const isLoaded = await loadRazorpayScript();
  if (!isLoaded || !window.Razorpay) {
    throw new Error('Razorpay SDK failed to load. Please check your internet connection.');
  }

  const razorpayKey = options.key || RAZORPAY_KEY_ID;

  const rzpOptions: RazorpayOptions = {
    key: razorpayKey,
    amount: options.amount,
    currency: options.currency || 'INR',
    name: options.name || 'Campus Food Shop',
    description: options.description || `Pre-Order #${options.orderId.slice(-8)}`,
    order_id: options.orderId,
    handler: (response: RazorpayPaymentSuccessResponse) => {
      options.onSuccess(response);
    },
    prefill: options.prefill,
    notes: options.notes,
    theme: {
      color: '#92400E', // Amber brand color matching design
    },
    modal: {
      ondismiss: () => {
        if (options.onDismiss) {
          options.onDismiss();
        }
      },
    },
  };

  const rzp = new window.Razorpay(rzpOptions);

  rzp.on('payment.failed', (response: any) => {
    console.error('Razorpay Payment Failed:', response);
    if (options.onError) {
      options.onError(response?.error || response);
    }
  });

  rzp.open();
}
