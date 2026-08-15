// ─────────────────────────────────────────────────────────────
// LUXE ESTATES — Environment Config
// Dev:  http://localhost:3000/api/v1
// Prod: update apiUrl before deploying to production
// ─────────────────────────────────────────────────────────────

const getApiUrl = (): string => {
  const host = window.location.hostname;
  if (host.includes('loca.lt')) {
    return 'https://aqario-luxe-eslam.loca.lt/api/v1';
  }
  return 'https://aqario-luxe-apii.vercel.app/api/v1';
};

export const environment = {
  production: false,
  enableSockets: false,
  get apiUrl(): string {
    return getApiUrl();
  },
  googleClientId: '668341342866-ufmo1js3tbrv5nkeakgtn81kjsp9r3if.apps.googleusercontent.com'
};
