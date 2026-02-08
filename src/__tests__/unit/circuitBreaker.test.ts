import CircuitBreaker from 'opossum';
import { 
  executeWithCircuitBreaker, 
  getCircuitBreakerStatus,
  stripeCircuitBreaker,
  emailCircuitBreaker,
  smsCircuitBreaker
} from '../../utils/circuitBreaker';

// Mock the circuit breakers to avoid actual external calls
jest.mock('opossum', () => {
  const mockFire = jest.fn();
  const mockStatus = { stats: {} };
  
  return jest.fn().mockImplementation(() => ({
    fire: mockFire,
    status: mockStatus,
    stats: {}
  }));
});

describe('Circuit Breaker Utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should execute Stripe service call with circuit breaker', async () => {
    const mockFire = (CircuitBreaker as jest.MockedClass<typeof CircuitBreaker>).mock.results[0].value.fire;
    mockFire.mockResolvedValueOnce({ success: true, data: 'test-data' });

    const result = await executeWithCircuitBreaker('stripe', { amount: 1000 });
    
    expect(result).toEqual({ success: true, data: 'test-data' });
  });

  test('should execute email service call with circuit breaker', async () => {
    const mockFire = (CircuitBreaker as jest.MockedClass<typeof CircuitBreaker>).mock.results[1].value.fire;
    mockFire.mockResolvedValueOnce({ success: true, data: 'email-sent' });

    const result = await executeWithCircuitBreaker('email', { to: 'test@example.com' });
    
    expect(result).toEqual({ success: true, data: 'email-sent' });
  });

  test('should execute SMS service call with circuit breaker', async () => {
    const mockFire = (CircuitBreaker as jest.MockedClass<typeof CircuitBreaker>).mock.results[2].value.fire;
    mockFire.mockResolvedValueOnce({ success: true, data: 'sms-sent' });

    const result = await executeWithCircuitBreaker('sms', { to: '+1234567890' });
    
    expect(result).toEqual({ success: true, data: 'sms-sent' });
  });

  test('should throw error for unknown service', async () => {
    await expect(executeWithCircuitBreaker('unknown' as any, {})).rejects.toThrow('Unknown service: unknown');
  });

  test('should return circuit breaker status', () => {
    const status = getCircuitBreakerStatus();
    
    expect(status).toHaveProperty('stripe');
    expect(status).toHaveProperty('email');
    expect(status).toHaveProperty('sms');
  });

  test('should handle circuit breaker failure', async () => {
    const mockFire = (CircuitBreaker as jest.MockedClass<typeof CircuitBreaker>).mock.results[0].value.fire;
    mockFire.mockRejectedValueOnce(new Error('Circuit breaker open'));

    await expect(executeWithCircuitBreaker('stripe', { amount: 1000 }))
      .rejects
      .toThrow('Circuit breaker open');
  });
});