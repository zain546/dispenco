import posthog from 'posthog-js';

const posthogToken =
  process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN ||
  'phc_qenrfcuio3o7MmMGwVXTfN9HSVx54swU2KUsZfwrahiv';
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

if (typeof window !== 'undefined' && posthogToken) {
  const initPostHog = () => {
    posthog.init(posthogToken, {
      api_host: posthogHost,
      defaults: '2026-08-30',
      disable_session_recording: true,
    });
  };

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(initPostHog, { timeout: 2500 });
  } else {
    setTimeout(initPostHog, 1500);
  }
}
