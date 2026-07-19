import type { OpsLogSinkAdapter, OpsMetricsAdapter, TraceExporterAdapter } from "./types.ts";

function unsupported(providerCode: string): never {
  throw new Error(`observability_provider_${providerCode}_not_configured`);
}

export function createNoopLogSinkAdapter(providerCode: string): OpsLogSinkAdapter {
  return {
    providerCode,
    async publish() {
      unsupported(providerCode);
    },
  };
}

export function createNoopMetricsAdapter(providerCode: string): OpsMetricsAdapter {
  return {
    providerCode,
    async emit() {
      unsupported(providerCode);
    },
  };
}

export function createNoopTraceExporterAdapter(providerCode: string): TraceExporterAdapter {
  return {
    providerCode,
    async exportSpan() {
      unsupported(providerCode);
    },
  };
}

export function createObservabilityAdapterRegistry(overrides?: {
  logs?: Record<string, OpsLogSinkAdapter>;
  metrics?: Record<string, OpsMetricsAdapter>;
  traces?: Record<string, TraceExporterAdapter>;
}) {
  const logDefaults: Record<string, OpsLogSinkAdapter> = {
    otel_collector: createNoopLogSinkAdapter("otel_collector"),
    loki: createNoopLogSinkAdapter("loki"),
  };

  const metricDefaults: Record<string, OpsMetricsAdapter> = {
    prometheus: createNoopMetricsAdapter("prometheus"),
    cloudwatch: createNoopMetricsAdapter("cloudwatch"),
  };

  const traceDefaults: Record<string, TraceExporterAdapter> = {
    otel_collector: createNoopTraceExporterAdapter("otel_collector"),
    jaeger: createNoopTraceExporterAdapter("jaeger"),
  };

  return {
    resolveLogSink(providerCode: string) {
      return overrides?.logs?.[providerCode] ?? logDefaults[providerCode] ?? createNoopLogSinkAdapter(providerCode);
    },
    resolveMetrics(providerCode: string) {
      return overrides?.metrics?.[providerCode] ?? metricDefaults[providerCode] ?? createNoopMetricsAdapter(providerCode);
    },
    resolveTraceExporter(providerCode: string) {
      return overrides?.traces?.[providerCode] ?? traceDefaults[providerCode] ?? createNoopTraceExporterAdapter(providerCode);
    },
  };
}
