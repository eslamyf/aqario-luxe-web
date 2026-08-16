import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Pipe({
  name: 'notifTranslate',
  pure: false,
  standalone: true,
})
export class NotifTranslatePipe implements PipeTransform {
  private translate = inject(TranslateService);

  transform(value: any, isMessage: boolean = false): string {
    if (!value) return '';

    const lang = this.translate.currentLang || this.translate.defaultLang || 'ar';
    const text = String(value).trim();

    // 1. Try ngx-translate key lookup first
    if (text.includes('.')) {
      const translated = this.translate.instant(text);
      if (translated && translated !== text) {
        return translated;
      }
    }

    // 2. If lang is Arabic, translate English titles/messages to Arabic
    if (lang === 'ar') {
      return this.toArabic(text, isMessage);
    }

    // 3. If lang is English, translate Arabic titles/messages to English
    if (lang === 'en') {
      return this.toEnglish(text, isMessage);
    }

    return text;
  }

  private toArabic(text: string, isMessage: boolean): string {
    // Title mappings
    if (text.includes('New KYC Submission')) return 'طلب تحقق من الهوية جديد';
    if (text.includes('New Property Inquiry')) return 'استفسار جديد';
    if (text.includes('Reply to Your Inquiry') || text.includes('Inquiry Reply')) return 'رد على استفسارك';
    if (text.includes('New Booking Request') || text.includes('New Booking')) return 'طلب حجز جديد';
    if (text.includes('Booking Approved')) return 'تم قبول حجزك';
    if (text.includes('Booking Rejected')) return 'تم رفض طلب حجزك';
    if (text.includes('New Viewing Request') || text.includes('New Viewing')) return 'طلب معاينة جديد';
    if (text.includes('Viewing Request Approved')) return 'تمت الموافقة على طلب المعاينة';
    if (text.includes('Viewing Request Rejected')) return 'تم رفض طلب المعاينة';
    if (text.includes('New Review')) return 'تقييم جديد على عقارك';
    if (text.includes('Report Reviewed')) return 'تم مراجعة بلاغك';

    // Message pattern mappings
    let result = text;
    result = result.replace(/User "(.*?)" has submitted their KYC verification documents\./gi, 'قام المستخدم "$1" بتقديم مستندات التحقق من الهوية الخاصة به.');
    result = result.replace(/User '(.*?)' has submitted their KYC verification documents\./gi, 'قام المستخدم "$1" بتقديم مستندات التحقق من الهوية الخاصة به.');
    result = result.replace(/User (.*?) has submitted their KYC verification documents\./gi, 'قام المستخدم "$1" بتقديم مستندات التحقق من الهوية الخاصة به.');

    result = result.replace(/(.*?) sent an inquiry about your property "(.*?)"/gi, '$1 أرسل استفساراً حول عقارك "$2"');
    result = result.replace(/You received a reply to your inquiry/gi, 'لقد تلقيت رداً على استفسارك');
    result = result.replace(/(.*?) requested to book your property "(.*?)"/gi, '$1 طلب حجز عقارك "$2"');
    result = result.replace(/Your booking for "(.*?)" has been approved/gi, 'تم قبول حجزك للعقار "$1"');
    result = result.replace(/Unfortunately, your booking request was rejected/gi, 'للأسف تم رفض طلب حجزك، يمكنك البحث عن عقار آخر');

    return result;
  }

  private toEnglish(text: string, isMessage: boolean): string {
    // Title mappings
    if (text.includes('طلب تحقق من الهوية جديد')) return 'New KYC Submission';
    if (text.includes('استفسار جديد') || text.includes('استفسار عقاري جديد')) return 'New Property Inquiry';
    if (text.includes('رد على استفسارك') || text.includes('رد جديد على الاستفسار')) return 'Reply to Your Inquiry';
    if (text.includes('طلب حجز جديد')) return 'New Booking Request';
    if (text.includes('تم قبول حجزك') || text.includes('تم قبول الحجز')) return 'Booking Approved';
    if (text.includes('تم رفض طلب حجزك') || text.includes('تم رفض الحجز')) return 'Booking Rejected';
    if (text.includes('طلب معاينة جديد')) return 'New Viewing Request';
    if (text.includes('تمت الموافقة على طلب المعاينة')) return 'Viewing Request Approved';
    if (text.includes('تم رفض طلب المعاينة')) return 'Viewing Request Rejected';
    if (text.includes('تقييم جديد')) return 'New Review';
    if (text.includes('تم مراجعة بلاغك')) return 'Report Reviewed';

    // Message pattern mappings
    let result = text;
    result = result.replace(/قام المستخدم "(.*?)" بتقديم مستندات التحقق من الهوية الخاصة به\./gi, 'User "$1" has submitted their KYC verification documents.');
    result = result.replace(/(.*?) أرسل استفساراً حول عقارك "(.*?)"/gi, '$1 sent an inquiry about your property "$2"');
    result = result.replace(/لقد تلقيت رداً على استفسارك/gi, 'You received a reply to your inquiry');
    result = result.replace(/(.*?) طلب حجز عقارك "(.*?)"/gi, '$1 requested to book your property "$2"');
    result = result.replace(/تم قبول حجزك للعقار "(.*?)"/gi, 'Your booking for "$1" has been approved');

    return result;
  }
}
