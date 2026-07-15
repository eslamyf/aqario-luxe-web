// ─────────────────────────────────────────────────────────────
// LUXE ESTATES — Environment Production Config (LIVE)
// ─────────────────────────────────────────────────────────────

const getApiUrl = (): string => {
  const host = window.location.hostname;
  
  // لو شغال على تيونيل محلي (Localtunnel) سيبه يقرا السيرفر القديم للتجارب
  if (host.includes('loca.lt')) {
    return 'https://aqario-luxe-eslam.loca.lt/api/v1';
  }
  
  // 🔥 تعديل حاسم: أضفنا /v1 في الآخر عشان الطلبات تروح للمسار الصحيح في السيرفر علطول
  return 'https://aqario-luxe-apii.vercel.app/api/v1';
};

export const environment = {
  production: true,
  get apiUrl(): string {
    return getApiUrl();
  },
  googleClientId: '668341342866-ufmo1js3tbrv5nkeakgtn81kjsp9r3if.apps.googleusercontent.com'
};