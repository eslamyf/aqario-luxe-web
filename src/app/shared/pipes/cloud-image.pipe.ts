import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'cloudImage',
  standalone: true,
})
export class CloudImagePipe implements PipeTransform {
  transform(url: string | undefined | null, width: number = 600, quality: number = 80): string {
    if (!url || typeof url !== 'string') {
      return '';
    }

    // Cloudinary URL optimization
    if (url.includes('res.cloudinary.com') && url.includes('/upload/')) {
      // Avoid duplicate transformations
      if (url.includes('/upload/f_auto') || url.includes('/upload/w_')) {
        return url;
      }
      const transformParams = `f_auto,q_auto,w_${width},c_limit`;
      return url.replace('/upload/', `/upload/${transformParams}/`);
    }

    // Unsplash URL optimization
    if (url.includes('images.unsplash.com')) {
      try {
        const parsedUrl = new URL(url);
        parsedUrl.searchParams.set('w', String(width));
        parsedUrl.searchParams.set('q', String(quality));
        parsedUrl.searchParams.set('auto', 'format');
        return parsedUrl.toString();
      } catch {
        return url;
      }
    }

    return url;
  }
}
