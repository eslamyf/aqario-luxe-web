// ─────────────────────────────────────────────────────────────
// LUXE ESTATES — Environment Production Config (LIVE)
// ─────────────────────────────────────────────────────────────

const getApiUrl = (): string => {
  const host = window.location.hostname;
  
  // لو شغال على تيونيل محلي (Localtunnel) سيبه يقرا السيرفر القديم للتجارب
  if (host.includes('loca.lt')) {
    return 'https://aqario-luxe-eslam.loca.lt/api/v1';
  }
  
  // في حالة الـ Production الفعلي، هيقرا مباشرة من سيرفر Railway اللايف الجديد
  return 'https://real-estate-backend-production-3fce.up.railway.app/api';
};

export const environment = {
  production: true,
  get apiUrl(): string {
    return getApiUrl();
  },
  googleClientId: '668341342866-ufmo1js3tbrv5nkeakgtn81kjsp9r3if.apps.googleusercontent.com'
};