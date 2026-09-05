// Production telemetry wrapper
export const lovable = {
  init: () => {
    // Initialize production analytics or error tracking SDKs here
  },
  trackEvent: (name: string, data?: Record<string, unknown>) => {
    if (import.meta.env.PROD) {
      // Send to your production analytics endpoint (e.g., Sentry, PostHog, Segment)
      console.debug(`[Telemetry]: ${name}`, data);
    } else {
      console.log(`[Dev Event]: ${name}`, data);
    }
  },
};