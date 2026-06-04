// ─────────────────────────────────────────────────────────────
// LUXE ESTATES — Environment Config
// Dev:  http://localhost:3000/api/v1
// Prod: update apiUrl before deploying to production
// ─────────────────────────────────────────────────────────────

const getApiUrl = (): string => {
  const host = window.location.hostname;
  if (host.includes('loca.lt') || (host !== 'localhost' && host !== '127.0.0.1')) {
    return 'https://aqario-luxe-eslam.loca.lt/api/v1';
  }
  return 'http://localhost:5002/api/v1';
};

export const environment = {
  production: false,
  get apiUrl(): string {
    return getApiUrl();
  },
  googleClientId: '668341342866-ufmo1js3tbrv5nkeakgtn81kjsp9r3if.apps.googleusercontent.com'
};
