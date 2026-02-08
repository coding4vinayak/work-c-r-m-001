import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

// Configure the OpenTelemetry SDK
const traceExporter = new OTLPTraceExporter({
  // Use environment variable for collector endpoint, default to localhost
  url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
});

const sdk = new NodeSDK({
  traceExporter,
  instrumentations: [getNodeAutoInstrumentations()],
});

// Initialize the SDK
const startTracing = async () => {
  try {
    await sdk.start();
    console.log('OpenTelemetry SDK started');
  } catch (error) {
    console.error('Error starting OpenTelemetry SDK', error);
  }
};

startTracing();

// Graceful shutdown
process.on('SIGTERM', async () => {
  try {
    await sdk.shutdown();
    console.log('OpenTelemetry SDK shut down successfully');
  } catch (error) {
    console.error('Error shutting down OpenTelemetry SDK', error);
  } finally {
    process.exit(0);
  }
});

export default sdk;