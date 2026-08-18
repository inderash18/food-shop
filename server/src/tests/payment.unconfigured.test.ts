import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PaytmProvider } from '../services/providers/paytm.provider';
import { MerchantUPIProvider } from '../services/providers/merchant-upi.provider';
import { PaymentProviderNotConfiguredError } from '../utils/errors';
import { paymentService } from '../services/payment.service';

describe('Payment Provider Safety & Unconfigured Handling', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env.PAYTM_MID;
    delete process.env.PAYTM_MERCHANT_KEY;
  });

  it('PaytmProvider throws PaymentProviderNotConfiguredError (503) when credentials are missing', async () => {
    const provider = new PaytmProvider();

    await expect(
      provider.createPayment(
        { orderId: 'order_test_1', userId: 'user_1', amount: 150, currency: 'INR' },
        'idemp_1'
      )
    ).rejects.toThrow(PaymentProviderNotConfiguredError);

    await expect(provider.verifyPayment('order_test_1')).rejects.toThrow(
      PaymentProviderNotConfiguredError
    );
  });

  it('MerchantUPIProvider throws PaymentProviderNotConfiguredError when credentials are not configured', async () => {
    const provider = new MerchantUPIProvider();

    await expect(provider.verifyPayment('pay_123')).rejects.toThrow(
      PaymentProviderNotConfiguredError
    );
  });

  it('PaymentGatewayService throws PaymentProviderNotConfiguredError when requesting unknown provider', () => {
    expect(() => paymentService.getProvider('non_existent_provider')).toThrow(
      PaymentProviderNotConfiguredError
    );
  });
});
