import type { ExchangeRateProviderAdapter, PaymentProviderAdapter, PaymentProviderCode, TaxProviderAdapter } from "./types.ts";

function unsupported(providerCode: string, operation: string): never {
  throw new Error(`adapter_${providerCode}_${operation}_not_configured`);
}

export function createNoopPaymentProviderAdapter(providerCode: PaymentProviderCode): PaymentProviderAdapter {
  return {
    providerCode,
    async createPaymentIntent() {
      unsupported(providerCode, "create_payment_intent");
    },
    async capturePayment() {
      unsupported(providerCode, "capture_payment");
    },
    async refundPayment() {
      unsupported(providerCode, "refund_payment");
    },
  };
}

export function createPaymentProviderRegistry(overrides?: Partial<Record<PaymentProviderCode, PaymentProviderAdapter>>) {
  const defaults: Record<PaymentProviderCode, PaymentProviderAdapter> = {
    stripe: createNoopPaymentProviderAdapter("stripe"),
    paypal: createNoopPaymentProviderAdapter("paypal"),
    moyasar: createNoopPaymentProviderAdapter("moyasar"),
    hyperpay: createNoopPaymentProviderAdapter("hyperpay"),
    checkout_com: createNoopPaymentProviderAdapter("checkout_com"),
    paytabs: createNoopPaymentProviderAdapter("paytabs"),
    bank_transfer: createNoopPaymentProviderAdapter("bank_transfer"),
    manual: createNoopPaymentProviderAdapter("manual"),
    cash: createNoopPaymentProviderAdapter("cash"),
  };

  return {
    resolve(providerCode: PaymentProviderCode) {
      return overrides?.[providerCode] ?? defaults[providerCode];
    },
  };
}

export function createNoopExchangeRateProviderAdapter(providerCode: string): ExchangeRateProviderAdapter {
  return {
    providerCode,
    async getRate() {
      unsupported(providerCode, "exchange_rate");
    },
  };
}

export function createNoopTaxProviderAdapter(adapterCode: string): TaxProviderAdapter {
  return {
    adapterCode,
    async calculateTax() {
      unsupported(adapterCode, "tax_calculation");
    },
  };
}
