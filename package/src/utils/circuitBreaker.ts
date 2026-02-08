import CircuitBreaker from 'opossum';

// Configuration options for the circuit breaker
const options = {
  timeout: 3000, // If our function takes longer than 3 seconds, trigger a failure
  errorThresholdPercentage: 50, // When 50% of requests fail, trip the circuit
  resetTimeout: 30000, // After 30 seconds, try again.
};

// Create circuit breakers for different external services
export const stripeCircuitBreaker = new CircuitBreaker((data: any) => {
  // This would be replaced with actual Stripe API call
  console.log('Making Stripe API call with data:', data);
  return Promise.resolve({ success: true, data });
}, options);

export const emailCircuitBreaker = new CircuitBreaker((data: any) => {
  // This would be replaced with actual email service call
  console.log('Sending email with data:', data);
  return Promise.resolve({ success: true, data });
}, options);

export const smsCircuitBreaker = new CircuitBreaker((data: any) => {
  // This would be replaced with actual SMS service call
  console.log('Sending SMS with data:', data);
  return Promise.resolve({ success: true, data });
}, options);

// Wrapper function to execute external service calls with circuit breaker protection
export const executeWithCircuitBreaker = async (
  service: 'stripe' | 'email' | 'sms',
  data: any
) => {
  try {
    let result;
    
    switch (service) {
      case 'stripe':
        result = await stripeCircuitBreaker.fire(data);
        break;
      case 'email':
        result = await emailCircuitBreaker.fire(data);
        break;
      case 'sms':
        result = await smsCircuitBreaker.fire(data);
        break;
      default:
        throw new Error(`Unknown service: ${service}`);
    }
    
    return result;
  } catch (error) {
    console.error(`Circuit breaker triggered for ${service}:`, error);
    throw error;
  }
};

// Get circuit breaker status for monitoring
export const getCircuitBreakerStatus = () => {
  return {
    stripe: {
      name: 'Stripe API',
      status: stripeCircuitBreaker.status,
      stats: stripeCircuitBreaker.stats
    },
    email: {
      name: 'Email Service',
      status: emailCircuitBreaker.status,
      stats: emailCircuitBreaker.stats
    },
    sms: {
      name: 'SMS Service',
      status: smsCircuitBreaker.status,
      stats: smsCircuitBreaker.stats
    }
  };
};