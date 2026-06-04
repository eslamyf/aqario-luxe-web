import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';

// Silence browser extension connection errors leaking into the console
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const message = reason?.message || String(reason || '');
  if (
    message.includes('Could not establish connection') ||
    message.includes('Receiving end does not exist')
  ) {
    event.preventDefault();
    event.stopPropagation();
  }
});

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));
