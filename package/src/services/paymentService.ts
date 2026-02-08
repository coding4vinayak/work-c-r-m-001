import Stripe from 'stripe';
import { executeWithCircuitBreaker } from '../utils/circuitBreaker';

// Initialize Stripe with the secret key from environment variables
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

// Interface for payment options
interface PaymentIntentOptions {
  amount: number;        // Amount in cents
  currency: string;      // Currency code (e.g., 'usd')
  customerId?: string;   // Customer ID if already exists
  customerEmail?: string; // Customer email for new customers
  description?: string;  // Description of the payment
  metadata?: Record<string, string>; // Additional metadata
}

// Function to create a payment intent with circuit breaker protection
export const createPaymentIntent = async (options: PaymentIntentOptions) => {
  try {
    // Prepare payment data for circuit breaker
    const paymentData = {
      amount: options.amount,
      currency: options.currency,
      customer: options.customerId,
      receipt_email: options.customerEmail,
      description: options.description,
      metadata: options.metadata
    };

    // Execute payment creation with circuit breaker protection
    await executeWithCircuitBreaker('stripe', paymentData);

    // If circuit breaker allows, proceed with actual Stripe API call
    const paymentIntent = await stripe.paymentIntents.create({
      amount: options.amount,
      currency: options.currency,
      customer: options.customerId,
      receipt_email: options.customerEmail,
      description: options.description,
      metadata: options.metadata || {},
    });

    return {
      success: true,
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      status: paymentIntent.status
    };
  } catch (error) {
    console.error('Payment intent creation failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

// Interface for customer options
interface CustomerOptions {
  email: string;
  name?: string;
  phone?: string;
  description?: string;
  metadata?: Record<string, string>;
}

// Function to create a customer with circuit breaker protection
export const createCustomer = async (options: CustomerOptions) => {
  try {
    // Prepare customer data for circuit breaker
    const customerData = {
      email: options.email,
      name: options.name,
      phone: options.phone,
      description: options.description,
      metadata: options.metadata
    };

    // Execute customer creation with circuit breaker protection
    await executeWithCircuitBreaker('stripe', customerData);

    // If circuit breaker allows, proceed with actual Stripe API call
    const customer = await stripe.customers.create({
      email: options.email,
      name: options.name,
      phone: options.phone,
      description: options.description,
      metadata: options.metadata || {},
    });

    return {
      success: true,
      customerId: customer.id,
      email: customer.email
    };
  } catch (error) {
    console.error('Customer creation failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

// Interface for invoice options
interface InvoiceOptions {
  customerId: string;
  amount: number;
  currency: string;
  description?: string;
  autoAdvance?: boolean;
}

// Function to create an invoice with circuit breaker protection
export const createInvoice = async (options: InvoiceOptions) => {
  try {
    // Prepare invoice data for circuit breaker
    const invoiceData = {
      customer: options.customerId,
      amount: options.amount,
      currency: options.currency,
      description: options.description,
      autoAdvance: options.autoAdvance
    };

    // Execute invoice creation with circuit breaker protection
    await executeWithCircuitBreaker('stripe', invoiceData);

    // If circuit breaker allows, proceed with actual Stripe API call
    const invoice = await stripe.invoices.create({
      customer: options.customerId,
      auto_advance: options.autoAdvance ?? false,
      description: options.description,
    });

    // Add invoice item
    await stripe.invoiceItems.create({
      invoice: invoice.id,
      customer: options.customerId,
      amount: options.amount,
      currency: options.currency,
      description: options.description,
    });

    // Finalize the invoice
    const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);

    return {
      success: true,
      invoiceId: finalizedInvoice.id,
      status: finalizedInvoice.status
    };
  } catch (error) {
    console.error('Invoice creation failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

// Function to retrieve payment intent with circuit breaker protection
export const retrievePaymentIntent = async (paymentIntentId: string) => {
  try {
    // Prepare retrieval data for circuit breaker
    const retrievalData = {
      paymentIntentId
    };

    // Execute retrieval with circuit breaker protection
    await executeWithCircuitBreaker('stripe', retrievalData);

    // If circuit breaker allows, proceed with actual Stripe API call
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    return {
      success: true,
      paymentIntent
    };
  } catch (error) {
    console.error('Payment intent retrieval failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

// Function to refund a payment with circuit breaker protection
export const refundPayment = async (chargeId: string, amount?: number) => {
  try {
    // Prepare refund data for circuit breaker
    const refundData = {
      chargeId,
      amount
    };

    // Execute refund with circuit breaker protection
    await executeWithCircuitBreaker('stripe', refundData);

    // If circuit breaker allows, proceed with actual Stripe API call
    const refund = await stripe.refunds.create({
      charge: chargeId,
      amount
    });

    return {
      success: true,
      refundId: refund.id,
      status: refund.status
    };
  } catch (error) {
    console.error('Payment refund failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};