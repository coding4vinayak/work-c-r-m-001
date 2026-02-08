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
    const mockInstance = (CircuitBreaker as jest.Mock)();
    const mockFire = jest.fn().mockResolvedValueOnce({ success: true, data: 'test-data' });
    mockInstance.fire = mockFire;

    const result = await executeWithCircuitBreaker('stripe', { amount: 1000 });

    expect(result).toEqual({ success: true, data: 'test-data' });
  });

  test('should execute email service call with circuit breaker', async () => {
    const mockInstance = (CircuitBreaker as jest.Mock)();
    const mockFire = jest.fn().mockResolvedValueOnce({ success: true, data: 'email-sent' });
    mockInstance.fire = mockFire;

    const result = await executeWithCircuitBreaker('email', { to: 'test@example.com' });

    expect(result).toEqual({ success: true, data: 'email-sent' });
  });

  test('should execute SMS service call with circuit breaker', async () => {
    const mockInstance = (CircuitBreaker as jest.Mock)();
    const mockFire = jest.fn().mockResolvedValueOnce({ success: true, data: 'sms-sent' });
    mockInstance.fire = mockFire;

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
    const mockInstance = (CircuitBreaker as jest.Mock)();
    const mockFire = jest.fn().mockRejectedValueOnce(new Error('Circuit breaker open'));
    mockInstance.fire = mockFire;

    await expect(executeWithCircuitBreaker('stripe', { amount: 1000 }))
      .rejects
      .toThrow('Circuit breaker open');
  });
});