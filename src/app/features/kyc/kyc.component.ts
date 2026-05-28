import {
  Component, inject, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, ChangeDetectorRef, HostListener
} from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { isValidPhoneNumber, CountryCode } from 'libphonenumber-js';
import {
  ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl
} from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subscription, finalize, firstValueFrom } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  KycService, KYCStatusResponse, KYCSubmission, KYCOwnershipDoc, FullKYCResponse
} from '../../core/services/kyc.service';
import { NotificationService } from '../../shared/services/notification.service';
import { AuthService } from '../../core/auth/auth.service';

interface OwnershipUploadEntry {
  name: string;
  status: 'uploading' | 'success' | 'error';
  error?: string;
  file?: File;
}

type CameraState = 'idle' | 'loading' | 'active' | 'error' | 'captured';

@Component({
  selector: 'app-kyc',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, TitleCasePipe, TranslateModule],
  templateUrl: './kyc.component.html',
  styleUrls: ['./kyc.component.scss']
})
export class KycComponent implements OnInit, OnDestroy, AfterViewInit {
  private fb = inject(FormBuilder);
  private kycService = inject(KycService);
  private notificationService = inject(NotificationService);
  private authService = inject(AuthService);
  private translate = inject(TranslateService);
  private cdr = inject(ChangeDetectorRef);
  private elementRef = inject(ElementRef);

  isViewInitialized = false;

  // Searchable Dropdown state
  showDropdown = false;
  searchQuery = '';
  isArabic = false;
  filteredCountries: { code: string; en: string; ar: string; dialCode: string }[] = [];

  // Dial Code Selector state
  selectedDialCode = '+20';
  currentDialCountryCode = 'EG';
  showDialDropdown = false;
  filteredDialCountries: { code: string; en: string; ar: string; dialCode: string }[] = [];
  dialSearchQuery = '';

  readonly countries = [
    { code: 'AF', en: 'Afghanistan', ar: 'أفغانستان', dialCode: '+93' },
    { code: 'AL', en: 'Albania', ar: 'ألبانيا', dialCode: '+355' },
    { code: 'DZ', en: 'Algeria', ar: 'الجزائر', dialCode: '+213' },
    { code: 'AD', en: 'Andorra', ar: 'أندورا', dialCode: '+376' },
    { code: 'AO', en: 'Angola', ar: 'أنغولا', dialCode: '+244' },
    { code: 'AG', en: 'Antigua and Barbuda', ar: 'أنتيغوا وبربودا', dialCode: '+1' },
    { code: 'AR', en: 'Argentina', ar: 'الأرجنتين', dialCode: '+54' },
    { code: 'AM', en: 'Armenia', ar: 'أرمينيا', dialCode: '+374' },
    { code: 'AU', en: 'Australia', ar: 'أستراليا', dialCode: '+61' },
    { code: 'AT', en: 'Austria', ar: 'النمسا', dialCode: '+43' },
    { code: 'AZ', en: 'Azerbaijan', ar: 'أذربيجان', dialCode: '+994' },
    { code: 'BS', en: 'Bahamas', ar: 'جزر البهاما', dialCode: '+1' },
    { code: 'BH', en: 'Bahrain', ar: 'البحرين', dialCode: '+973' },
    { code: 'BD', en: 'Bangladesh', ar: 'بنجلاديش', dialCode: '+880' },
    { code: 'BB', en: 'Barbados', ar: 'باربادوس', dialCode: '+1' },
    { code: 'BY', en: 'Belarus', ar: 'بيلاروسيا', dialCode: '+375' },
    { code: 'BE', en: 'Belgium', ar: 'بلجيكا', dialCode: '+32' },
    { code: 'BZ', en: 'Belize', ar: 'بليز', dialCode: '+501' },
    { code: 'BJ', en: 'Benin', ar: 'بنين', dialCode: '+229' },
    { code: 'BM', en: 'Bermuda', ar: 'برمودا', dialCode: '+1' },
    { code: 'BT', en: 'Bhutan', ar: 'بوتان', dialCode: '+975' },
    { code: 'BO', en: 'Bolivia', ar: 'بوليفيا', dialCode: '+591' },
    { code: 'BA', en: 'Bosnia and Herzegovina', ar: 'البوسنة والهرسك', dialCode: '+387' },
    { code: 'BW', en: 'Botswana', ar: 'بوتسوانا', dialCode: '+267' },
    { code: 'BR', en: 'Brazil', ar: 'البرازيل', dialCode: '+55' },
    { code: 'BN', en: 'Brunei', ar: 'بروناي', dialCode: '+673' },
    { code: 'BG', en: 'Bulgaria', ar: 'بلغاريا', dialCode: '+359' },
    { code: 'BF', en: 'Burkina Faso', ar: 'بوركينا فاسو', dialCode: '+226' },
    { code: 'BI', en: 'Burundi', ar: 'بوروندي', dialCode: '+257' },
    { code: 'KH', en: 'Cambodia', ar: 'كمبوديا', dialCode: '+855' },
    { code: 'CM', en: 'Cameroon', ar: 'الكاميرون', dialCode: '+237' },
    { code: 'CA', en: 'Canada', ar: 'كندا', dialCode: '+1' },
    { code: 'CV', en: 'Cape Verde', ar: 'الرأس الأخضر', dialCode: '+238' },
    { code: 'KY', en: 'Cayman Islands', ar: 'جزر كايمان', dialCode: '+1' },
    { code: 'CF', en: 'Central African Republic', ar: 'جمهورية أفريقيا الوسطى', dialCode: '+236' },
    { code: 'TD', en: 'Chad', ar: 'تشاد', dialCode: '+235' },
    { code: 'CL', en: 'Chile', ar: 'تشيلي', dialCode: '+56' },
    { code: 'CN', en: 'China', ar: 'الصين', dialCode: '+86' },
    { code: 'CO', en: 'Colombia', ar: 'كولومبيا', dialCode: '+57' },
    { code: 'KM', en: 'Comoros', ar: 'جزر القمر', dialCode: '+269' },
    { code: 'CG', en: 'Congo', ar: 'الكونغو', dialCode: '+242' },
    { code: 'CD', en: 'Congo (DRC)', ar: 'الكونغو الديمقراطية', dialCode: '+243' },
    { code: 'CR', en: 'Costa Rica', ar: 'كوستاريكا', dialCode: '+506' },
    { code: 'CI', en: 'Côte d\'Ivoire', ar: 'ساحل العاج', dialCode: '+225' },
    { code: 'HR', en: 'Croatia', ar: 'كرواتيا', dialCode: '+385' },
    { code: 'CU', en: 'Cuba', ar: 'كوبا', dialCode: '+53' },
    { code: 'CY', en: 'Cyprus', ar: 'قبرص', dialCode: '+357' },
    { code: 'CZ', en: 'Czech Republic', ar: 'جمهورية التشيك', dialCode: '+420' },
    { code: 'DK', en: 'Denmark', ar: 'الدنمارك', dialCode: '+45' },
    { code: 'DJ', en: 'Djibouti', ar: 'جيبوتي', dialCode: '+253' },
    { code: 'DM', en: 'Dominica', ar: 'دومينيكا', dialCode: '+1' },
    { code: 'DO', en: 'Dominican Republic', ar: 'جمهورية الدومينيكان', dialCode: '+1' },
    { code: 'EC', en: 'Ecuador', ar: 'الإكوادور', dialCode: '+593' },
    { code: 'EG', en: 'Egypt', ar: 'مصر', dialCode: '+20' },
    { code: 'SV', en: 'El Salvador', ar: 'السلفادور', dialCode: '+503' },
    { code: 'GQ', en: 'Equatorial Guinea', ar: 'غينيا الاستوائية', dialCode: '+240' },
    { code: 'ER', en: 'Eritrea', ar: 'إريتريا', dialCode: '+291' },
    { code: 'EE', en: 'Estonia', ar: 'إستونيا', dialCode: '+372' },
    { code: 'SZ', en: 'Eswatini', ar: 'إسواتيني', dialCode: '+268' },
    { code: 'ET', en: 'Ethiopia', ar: 'إثيوبيا', dialCode: '+251' },
    { code: 'FJ', en: 'Fiji', ar: 'فيجي', dialCode: '+679' },
    { code: 'FI', en: 'Finland', ar: 'فنلندا', dialCode: '+358' },
    { code: 'FR', en: 'France', ar: 'فرنسا', dialCode: '+33' },
    { code: 'GA', en: 'Gabon', ar: 'الغابون', dialCode: '+241' },
    { code: 'GM', en: 'Gambia', ar: 'غامبيا', dialCode: '+220' },
    { code: 'GE', en: 'Georgia', ar: 'جورجيا', dialCode: '+995' },
    { code: 'DE', en: 'Germany', ar: 'ألمانيا', dialCode: '+49' },
    { code: 'GH', en: 'Ghana', ar: 'غانا', dialCode: '+233' },
    { code: 'GR', en: 'Greece', ar: 'اليونان', dialCode: '+30' },
    { code: 'GD', en: 'Grenada', ar: 'غرينادا', dialCode: '+1' },
    { code: 'GT', en: 'Guatemala', ar: 'غواتيمالا', dialCode: '+502' },
    { code: 'GN', en: 'Guinea', ar: 'غينيا', dialCode: '+224' },
    { code: 'GW', en: 'Guinea-Bissau', ar: 'غينيا بيساو', dialCode: '+245' },
    { code: 'GY', en: 'Guyana', ar: 'غيانا', dialCode: '+592' },
    { code: 'HT', en: 'Haiti', ar: 'هايتي', dialCode: '+509' },
    { code: 'HN', en: 'Honduras', ar: 'هندوراس', dialCode: '+504' },
    { code: 'HK', en: 'Hong Kong', ar: 'هونغ كونغ', dialCode: '+852' },
    { code: 'HU', en: 'Hungary', ar: 'المجر', dialCode: '+36' },
    { code: 'IS', en: 'Iceland', ar: 'آيسلندا', dialCode: '+354' },
    { code: 'IN', en: 'India', ar: 'الهند', dialCode: '+91' },
    { code: 'ID', en: 'Indonesia', ar: 'إندونيسيا', dialCode: '+62' },
    { code: 'IR', en: 'Iran', ar: 'إيران', dialCode: '+98' },
    { code: 'IQ', en: 'Iraq', ar: 'العراق', dialCode: '+964' },
    { code: 'IE', en: 'Ireland', ar: 'أيرلندا', dialCode: '+353' },
    { code: 'IL', en: 'Israel', ar: 'إسرائيل', dialCode: '+972' },
    { code: 'IT', en: 'Italy', ar: 'إيطاليا', dialCode: '+39' },
    { code: 'JM', en: 'Jamaica', ar: 'جامايكا', dialCode: '+1' },
    { code: 'JP', en: 'Japan', ar: 'اليابان', dialCode: '+81' },
    { code: 'JO', en: 'Jordan', ar: 'الأردن', dialCode: '+962' },
    { code: 'KZ', en: 'Kazakhstan', ar: 'كازاخستان', dialCode: '+7' },
    { code: 'KE', en: 'Kenya', ar: 'كينيا', dialCode: '+254' },
    { code: 'KP', en: 'North Korea', ar: 'كوريا الشمالية', dialCode: '+850' },
    { code: 'KR', en: 'South Korea', ar: 'كوريا الجنوبية', dialCode: '+82' },
    { code: 'KW', en: 'Kuwait', ar: 'الكويت', dialCode: '+965' },
    { code: 'KG', en: 'Kyrgyzstan', ar: 'قيرغيزستان', dialCode: '+996' },
    { code: 'LA', en: 'Laos', ar: 'لاوس', dialCode: '+856' },
    { code: 'LV', en: 'Latvia', ar: 'لاتفيا', dialCode: '+371' },
    { code: 'LB', en: 'Lebanon', ar: 'لبنان', dialCode: '+961' },
    { code: 'LR', en: 'Liberia', ar: 'ليبيريا', dialCode: '+231' },
    { code: 'LY', en: 'Libya', ar: 'ليبيا', dialCode: '+218' },
    { code: 'LT', en: 'Lithuania', ar: 'ليتوانيا', dialCode: '+370' },
    { code: 'LU', en: 'Luxembourg', ar: 'لوكسمبورغ', dialCode: '+352' },
    { code: 'MG', en: 'Madagascar', ar: 'مدغشقر', dialCode: '+261' },
    { code: 'MW', en: 'Malawi', ar: 'ملاوي', dialCode: '+265' },
    { code: 'MY', en: 'Malaysia', ar: 'ماليزيا', dialCode: '+60' },
    { code: 'MV', en: 'Maldives', ar: 'جزر المالديف', dialCode: '+960' },
    { code: 'ML', en: 'Mali', ar: 'مالي', dialCode: '+223' },
    { code: 'MT', en: 'Malta', ar: 'مالطا', dialCode: '+356' },
    { code: 'MR', en: 'Mauritania', ar: 'موريتانيا', dialCode: '+222' },
    { code: 'MU', en: 'Mauritius', ar: 'موريشيوس', dialCode: '+230' },
    { code: 'MX', en: 'Mexico', ar: 'المكسيك', dialCode: '+52' },
    { code: 'MD', en: 'Moldova', ar: 'مولدوفا', dialCode: '+373' },
    { code: 'MC', en: 'Monaco', ar: 'موناكو', dialCode: '+377' },
    { code: 'MN', en: 'Mongolia', ar: 'منغوليا', dialCode: '+976' },
    { code: 'ME', en: 'Montenegro', ar: 'الجبل الأسود', dialCode: '+382' },
    { code: 'MA', en: 'Morocco', ar: 'المغرب', dialCode: '+212' },
    { code: 'MZ', en: 'Mozambique', ar: 'موزمبيق', dialCode: '+258' },
    { code: 'MM', en: 'Myanmar', ar: 'ميانمار', dialCode: '+95' },
    { code: 'NA', en: 'Namibia', ar: 'ناميبيا', dialCode: '+264' },
    { code: 'NP', en: 'Nepal', ar: 'نيبال', dialCode: '+977' },
    { code: 'NL', en: 'Netherlands', ar: 'هولندا', dialCode: '+31' },
    { code: 'NZ', en: 'New Zealand', ar: 'نيوزيلندا', dialCode: '+64' },
    { code: 'NI', en: 'Nicaragua', ar: 'نيكاراغوا', dialCode: '+505' },
    { code: 'NE', en: 'Niger', ar: 'النيجر', dialCode: '+227' },
    { code: 'NG', en: 'Nigeria', ar: 'نيجيريا', dialCode: '+234' },
    { code: 'NO', en: 'Norway', ar: 'النرويج', dialCode: '+47' },
    { code: 'OM', en: 'Oman', ar: 'عمان', dialCode: '+968' },
    { code: 'PK', en: 'Pakistan', ar: 'باكستان', dialCode: '+92' },
    { code: 'PS', en: 'Palestine', ar: 'فلسطين', dialCode: '+970' },
    { code: 'PA', en: 'Panama', ar: 'بنما', dialCode: '+507' },
    { code: 'PG', en: 'Papua New Guinea', ar: 'بابوا غينيا الجديدة', dialCode: '+675' },
    { code: 'PY', en: 'Paraguay', ar: 'باراغواي', dialCode: '+595' },
    { code: 'PE', en: 'Peru', ar: 'بيرو', dialCode: '+51' },
    { code: 'PH', en: 'Philippines', ar: 'الفلبين', dialCode: '+63' },
    { code: 'PL', en: 'Poland', ar: 'بولندا', dialCode: '+48' },
    { code: 'PT', en: 'Portugal', ar: 'البرتغال', dialCode: '+351' },
    { code: 'QA', en: 'Qatar', ar: 'قطر', dialCode: '+974' },
    { code: 'RO', en: 'Romania', ar: 'رومانيا', dialCode: '+40' },
    { code: 'RU', en: 'Russia', ar: 'روسيا', dialCode: '+7' },
    { code: 'RW', en: 'Rwanda', ar: 'رواندا', dialCode: '+250' },
    { code: 'KN', en: 'Saint Kitts and Nevis', ar: 'سانت كيتس ونيفيس', dialCode: '+1' },
    { code: 'LC', en: 'Saint Lucia', ar: 'سانت لوسيا', dialCode: '+1' },
    { code: 'VC', en: 'Saint Vincent and the Grenadines', ar: 'سانت فينسنت وجرينادين', dialCode: '+1' },
    { code: 'WS', en: 'Samoa', ar: 'ساموا', dialCode: '+685' },
    { code: 'SM', en: 'San Marino', ar: 'سان مارينو', dialCode: '+378' },
    { code: 'ST', en: 'São Tomé and Príncipe', ar: 'ساو تومي وبرينسيب', dialCode: '+239' },
    { code: 'SA', en: 'Saudi Arabia', ar: 'المملكة العربية السعودية', dialCode: '+966' },
    { code: 'SN', en: 'Senegal', ar: 'السنغال', dialCode: '+221' },
    { code: 'RS', en: 'Serbia', ar: 'صربيا', dialCode: '+381' },
    { code: 'SC', en: 'Seychelles', ar: 'سيشل', dialCode: '+248' },
    { code: 'SL', en: 'Sierra Leone', ar: 'سيراليون', dialCode: '+232' },
    { code: 'SG', en: 'Singapore', ar: 'سنغافورة', dialCode: '+65' },
    { code: 'SK', en: 'Slovakia', ar: 'سلوفاكيا', dialCode: '+421' },
    { code: 'SI', en: 'Slovenia', ar: 'سلوفينيا', dialCode: '+386' },
    { code: 'SO', en: 'Somalia', ar: 'الصومال', dialCode: '+252' },
    { code: 'ZA', en: 'South Africa', ar: 'جنوب أفريقيا', dialCode: '+27' },
    { code: 'SS', en: 'South Sudan', ar: 'جنوب السودان', dialCode: '+211' },
    { code: 'ES', en: 'Spain', ar: 'إسبانيا', dialCode: '+34' },
    { code: 'LK', en: 'Sri Lanka', ar: 'سريلانكا', dialCode: '+94' },
    { code: 'SD', en: 'Sudan', ar: 'السودان', dialCode: '+249' },
    { code: 'SR', en: 'Suriname', ar: 'سورينام', dialCode: '+597' },
    { code: 'SE', en: 'Sweden', ar: 'السويد', dialCode: '+46' },
    { code: 'CH', en: 'Switzerland', ar: 'سويسرا', dialCode: '+41' },
    { code: 'SY', en: 'Syria', ar: 'سوريا', dialCode: '+963' },
    { code: 'TW', en: 'Taiwan', ar: 'تايوان', dialCode: '+886' },
    { code: 'TJ', en: 'Tajikistan', ar: 'طاجيكستان', dialCode: '+992' },
    { code: 'TZ', en: 'Tanzania', ar: 'تنزانيا', dialCode: '+255' },
    { code: 'TH', en: 'Thailand', ar: 'تايلاند', dialCode: '+66' },
    { code: 'TG', en: 'Togo', ar: 'توغو', dialCode: '+228' },
    { code: 'TT', en: 'Trinidad and Tobago', ar: 'ترينيداد وتوباغو', dialCode: '+1' },
    { code: 'TN', en: 'Tunisia', ar: 'تونس', dialCode: '+216' },
    { code: 'TR', en: 'Turkey', ar: 'تركيا', dialCode: '+90' },
    { code: 'TM', en: 'Turkmenistan', ar: 'تركمانستان', dialCode: '+993' },
    { code: 'UG', en: 'Uganda', ar: 'أوغندا', dialCode: '+256' },
    { code: 'UA', en: 'Ukraine', ar: 'أوكرانيا', dialCode: '+380' },
    { code: 'AE', en: 'United Arab Emirates', ar: 'الإمارات العربية المتحدة', dialCode: '+971' },
    { code: 'GB', en: 'United Kingdom', ar: 'المملكة المتحدة', dialCode: '+44' },
    { code: 'US', en: 'United States', ar: 'الولايات المتحدة', dialCode: '+1' },
    { code: 'UY', en: 'Uruguay', ar: 'أوروغواي', dialCode: '+598' },
    { code: 'UZ', en: 'Uzbekistan', ar: 'أوزبكستان', dialCode: '+998' },
    { code: 'VE', en: 'Venezuela', ar: 'فنزويلا', dialCode: '+58' },
    { code: 'VN', en: 'Vietnam', ar: 'فيتنام', dialCode: '+84' },
    { code: 'YE', en: 'Yemen', ar: 'اليمن', dialCode: '+967' },
    { code: 'ZM', en: 'Zambia', ar: 'زامبيا', dialCode: '+260' },
    { code: 'ZW', en: 'Zimbabwe', ar: 'زيمبابوي', dialCode: '+263' }
  ];

  // ── ViewChild refs for WebRTC ─────────────────────────────────────────────
  @ViewChild('videoEl') videoEl!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasEl') canvasEl!: ElementRef<HTMLCanvasElement>;

  // ── Form ──────────────────────────────────────────────────────────────────
  kycForm!: FormGroup;
  status: KYCStatusResponse | null = null;

  // ── Loading states ────────────────────────────────────────────────────────
  isInitialLoading = true;
  isLoading = false;
  isUploading = false;
  showRevertWarning = false;

  // ── User banner ───────────────────────────────────────────────────────────
  userPhoto: string | null = null;
  userName: string = '';

  // ── ID document images ────────────────────────────────────────────────────
  frontPreview: string | null = null;
  backPreview: string | null = null;
  selectedFrontFile: File | null = null;
  selectedBackFile: File | null = null;

  // ── Ownership documents ───────────────────────────────────────────────────
  ownershipDocs: KYCOwnershipDoc[] = [];
  isDeletingOwnership: boolean[] = [];
  fileUploadQueue: OwnershipUploadEntry[] = [];
  isUploadingOwnership = false;

  // ── WebRTC Liveness ───────────────────────────────────────────────────────
  cameraState: CameraState = 'idle';
  livePhotoPreview: string | null = null;   // Data-URL after capture
  livePhotoUrl: string | null = null;   // Cloudinary URL after upload
  cameraErrorMsg = '';
  private mediaStream: MediaStream | null = null;
  private isSelfieDeletedInSession = false;

  private pollSubscription?: Subscription;

  // ─────────────────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.initForm();
    this.loadConsolidatedData();
    const user = this.authService.currentUser;
    if (user) {
      this.userPhoto = user.photo || null;
      this.userName = user.name || '';
    }
    this.isArabic = this.translate.currentLang === 'ar';
    this.translate.onLangChange.subscribe(event => {
      this.isArabic = event.lang === 'ar';
      this.updateFilteredCountries();
      this.updateFilteredDialCountries();
    });
    this.updateFilteredCountries();
    this.updateFilteredDialCountries();
  }

  ngAfterViewInit(): void {
    this.isViewInitialized = true;
  }

  ngOnDestroy(): void {
    this.pollSubscription?.unsubscribe();
    this.stopCamera();
  }

  // ── Searchable Dropdown Helpers ───────────────────────────────────────────
  toggleDropdown(event: MouseEvent): void {
    event.stopPropagation();
    this.showDropdown = !this.showDropdown;
    if (this.showDropdown) {
      this.updateFilteredCountries();
    }
  }

  onNationalityFocus(): void {
    this.showDropdown = true;
    this.updateFilteredCountries();
  }

  filterCountries(event: any): void {
    const query = event.target.value?.toLowerCase() || '';
    this.searchQuery = query;
    this.updateFilteredCountries();
    this.showDropdown = true;
  }

  updateFilteredCountries(): void {
    if (!this.searchQuery) {
      this.filteredCountries = [...this.countries];
    } else {
      this.filteredCountries = this.countries.filter(c =>
        c.en.toLowerCase().includes(this.searchQuery) ||
        c.ar.toLowerCase().includes(this.searchQuery)
      );
    }
  }

  selectCountry(country: { code: string; en: string; ar: string; dialCode: string }): void {
    const value = this.isArabic ? country.ar : country.en;
    this.kycForm.patchValue({ nationality: value });
    this.searchQuery = '';
    this.showDropdown = false;

    // Smart sync phone dial code to match selected nationality
    const match = this.countries.find(c => c.code === country.code);
    if (match) {
      this.selectedDialCode = match.dialCode;
      this.currentDialCountryCode = match.code;
      this.kycForm.get('phoneNumber')?.updateValueAndValidity();
    }
  }

  toggleDialDropdown(event: MouseEvent): void {
    event.stopPropagation();
    this.showDialDropdown = !this.showDialDropdown;
    if (this.showDialDropdown) {
      this.dialSearchQuery = '';
      this.updateFilteredDialCountries();
    }
  }

  filterDialCountries(event: any): void {
    const query = event.target.value?.toLowerCase() || '';
    this.dialSearchQuery = query;
    this.updateFilteredDialCountries();
  }

  updateFilteredDialCountries(): void {
    if (!this.dialSearchQuery) {
      this.filteredDialCountries = [...this.countries];
    } else {
      this.filteredDialCountries = this.countries.filter(c =>
        c.en.toLowerCase().includes(this.dialSearchQuery) ||
        c.ar.toLowerCase().includes(this.dialSearchQuery) ||
        c.dialCode.includes(this.dialSearchQuery)
      );
    }
  }

  selectDialCode(country: { code: string; en: string; ar: string; dialCode: string }): void {
    this.selectedDialCode = country.dialCode;
    this.currentDialCountryCode = country.code;
    this.showDialDropdown = false;
    this.kycForm.get('phoneNumber')?.updateValueAndValidity();
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.showDropdown = false;
      this.showDialDropdown = false;
      return;
    }
    const target = event.target as HTMLElement;
    if (!target.closest('.nationality-wrapper')) {
      this.showDropdown = false;
    }
    if (!target.closest('.phone-dial-wrapper')) {
      this.showDialDropdown = false;
    }
  }

  getFlagEmoji(countryCode: string): string {
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  }

  combinedPhoneValidator() {
    return (control: AbstractControl) => {
      const val = control.value;
      if (!val) return null;
      const cleanNumber = val.replace(/^0+/, '');
      const combined = `${this.selectedDialCode}${cleanNumber}`;
      try {
        const country = this.currentDialCountryCode as CountryCode;
        const isValid = isValidPhoneNumber(combined, country);
        return isValid ? null : { invalidCombinedPhone: true };
      } catch (e) {
        return { invalidCombinedPhone: true };
      }
    };
  }

  // ── Form init ─────────────────────────────────────────────────────────────
  private initForm(): void {
    this.kycForm = this.fb.group({
      documentType: ['national_id', Validators.required],
      frontImage: [null],
      backImage: [null],
      ownershipDocs: [[]],
      nationality: ['', [Validators.required, Validators.minLength(2)]],
      phoneNumber: ['', [Validators.required, this.combinedPhoneValidator()]],
    });

    // Smart sync dial code programmatically when nationality changes
    this.kycForm.get('nationality')?.valueChanges.subscribe((val: string) => {
      if (!val) return;
      const query = val.trim().toLowerCase();
      const match = this.countries.find(c =>
        c.en.toLowerCase() === query ||
        c.ar.toLowerCase() === query
      );
      if (match) {
        this.selectedDialCode = match.dialCode;
        this.currentDialCountryCode = match.code;
        this.kycForm.get('phoneNumber')?.updateValueAndValidity();
      }
    });

    // Smart phone input parsing: detect typed/pasted dial code prefix
    this.kycForm.get('phoneNumber')?.valueChanges.subscribe((val: string) => {
      if (!val) return;
      const trimmed = val.trim();
      if (trimmed.startsWith('+')) {
        const sorted = [...this.countries].sort((a, b) => b.dialCode.length - a.dialCode.length);
        for (const c of sorted) {
          if (trimmed.startsWith(c.dialCode)) {
            this.selectedDialCode = c.dialCode;
            this.currentDialCountryCode = c.code;
            const remaining = trimmed.substring(c.dialCode.length).trim();
            this.kycForm.get('phoneNumber')?.setValue(remaining, { emitEvent: false });
            break;
          }
        }
      } else if (trimmed.startsWith('00')) {
        const standardized = '+' + trimmed.substring(2);
        const sorted = [...this.countries].sort((a, b) => b.dialCode.length - a.dialCode.length);
        for (const c of sorted) {
          if (standardized.startsWith(c.dialCode)) {
            this.selectedDialCode = c.dialCode;
            this.currentDialCountryCode = c.code;
            const remaining = standardized.substring(c.dialCode.length).trim();
            this.kycForm.get('phoneNumber')?.setValue(remaining, { emitEvent: false });
            break;
          }
        }
      }
    });

    this.kycForm.get('documentType')?.valueChanges.subscribe(() => {
      this.frontPreview = null;
      this.backPreview = null;
      this.selectedFrontFile = null;
      this.selectedBackFile = null;
      this.kycForm.patchValue({ frontImage: null, backImage: null });
      this.kycForm.get('frontImage')?.markAsUntouched();
      this.kycForm.get('backImage')?.markAsUntouched();
      this.kycForm.get('backImage')?.updateValueAndValidity();
    });
  }

  get f(): { [key: string]: AbstractControl } { return this.kycForm.controls; }

  // ── Data loading & polling ────────────────────────────────────────────────
  private loadConsolidatedData(): void {
    this.isInitialLoading = true;
    this.kycService.getMyKYCData().pipe(
      finalize(() => this.isInitialLoading = false)
    ).subscribe({
      next: (res: FullKYCResponse) => {
        this.applyKYCData(res);
        this.startConsolidatedPolling();
      },
      error: () => {
        this.isInitialLoading = false;
        this.status = { success: true, status: 'not_submitted' };
      }
    });
  }

  private startConsolidatedPolling(): void {
    this.pollSubscription = this.kycService.pollFullData().subscribe({
      next: (res: FullKYCResponse) => this.applyKYCData(res)
    });
  }

  private applyKYCData(res: FullKYCResponse): void {
    const kycInfo = res.data.kycInfo;
    this.status = {
      success: true,
      status: kycInfo.status,
      reason: kycInfo.rejectionReason,
      ownershipDocuments: kycInfo.ownershipDocuments
    };

    if (kycInfo.nationality && !this.kycForm.get('nationality')?.touched) {
      this.kycForm.patchValue({ nationality: kycInfo.nationality });
    }
    if (kycInfo.phoneNumber && !this.kycForm.get('phoneNumber')?.touched) {
      const phone = kycInfo.phoneNumber.trim();
      let matchedDial = '';
      let nationalPhone = phone;

      // Match longest dial codes first to avoid partial matching (e.g. +1 242 matched as +1)
      const sortedCountries = [...this.countries].sort((a, b) => b.dialCode.length - a.dialCode.length);
      for (const country of sortedCountries) {
        if (phone.startsWith(country.dialCode)) {
          matchedDial = country.dialCode;
          nationalPhone = phone.substring(country.dialCode.length).trim();
          break;
        }
      }

      if (matchedDial) {
        this.selectedDialCode = matchedDial;
        const match = this.countries.find(c => c.dialCode === matchedDial);
        if (match) this.currentDialCountryCode = match.code;
      }
      
      this.kycForm.patchValue({ phoneNumber: nationalPhone });
    }

    if (kycInfo.documents && kycInfo.documents.length > 0) {
      const idDoc = kycInfo.documents[0];
      if (!this.kycForm.get('documentType')?.touched) {
        this.kycForm.patchValue({ documentType: idDoc.type });
      }
      if (idDoc.frontImage && !this.selectedFrontFile) {
        this.frontPreview = idDoc.frontImage;
        this.kycForm.patchValue({ frontImage: true });
      }
      if (idDoc.backImage && !this.selectedBackFile) {
        this.backPreview = idDoc.backImage;
        this.kycForm.patchValue({ backImage: true });
      }
    }

    if (!this.isUploadingOwnership && !this.isDeletingOwnership.some(v => v)) {
      this.ownershipDocs = kycInfo.ownershipDocuments || [];
      this.isDeletingOwnership = new Array(this.ownershipDocs.length).fill(false);
    }

    if (kycInfo.status === 'approved') {
      this.pollSubscription?.unsubscribe();
    }

    if (kycInfo.livePhoto && !this.livePhotoUrl && this.cameraState === 'idle' && !this.isSelfieDeletedInSession) {
      this.livePhotoUrl = kycInfo.livePhoto;
      this.livePhotoPreview = kycInfo.livePhoto;
      this.cameraState = 'captured';
    }
  }

  // ── ID image handlers ─────────────────────────────────────────────────────
  onFileSelected(event: any, side: 'front' | 'back'): void {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    if (file.size > 5 * 1024 * 1024) {
      this.notificationService.show(this.translate.instant('USER_KYC.ERR_FILE_TOO_LARGE'), 'error');
      return;
    }
    if (!file.type.startsWith('image/')) {
      this.notificationService.show(this.translate.instant('USER_KYC.ERR_NOT_IMAGE'), 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (side === 'front') {
        this.frontPreview = reader.result as string;
        this.selectedFrontFile = file;
        this.kycForm.patchValue({ frontImage: true });
      } else {
        this.backPreview = reader.result as string;
        this.selectedBackFile = file;
        this.kycForm.patchValue({ backImage: true });
      }
    };
    reader.readAsDataURL(file);
  }

  removeImage(side: 'front' | 'back'): void {
    const isPersistent = side === 'front'
      ? !!this.frontPreview && !this.selectedFrontFile
      : !!this.backPreview && !this.selectedBackFile;

    if (side === 'front') {
      this.frontPreview = null; this.selectedFrontFile = null;
      this.kycForm.patchValue({ frontImage: null });
      this.kycForm.get('frontImage')?.markAsUntouched();
    } else {
      this.backPreview = null; this.selectedBackFile = null;
      this.kycForm.patchValue({ backImage: null });
      this.kycForm.get('backImage')?.markAsUntouched();
    }

    if (isPersistent) {
      this.kycService.deleteIdentityDocument().subscribe({
        error: (err: any) => this.notificationService.show(
          err.error?.message || this.translate.instant('USER_KYC.ERR_REMOVE_FAILED'), 'error')
      });
    }
  }

  // ── Ownership documents ───────────────────────────────────────────────────
  onOwnershipFileSelected(event: any): void {
    const files = event.target.files as FileList;
    if (!files || files.length === 0) return;
    Array.from(files).forEach(file => {
      if (file.size > 5 * 1024 * 1024) {
        this.notificationService.show(this.translate.instant('USER_KYC.ERR_FILE_TOO_LARGE'), 'error');
        return;
      }
      const queueEntry: OwnershipUploadEntry = { name: file.name, status: 'uploading', file };
      this.fileUploadQueue.push(queueEntry);
      this.isUploadingOwnership = true;

      this.kycService.uploadOwnershipFile(file).subscribe({
        next: (res: any) => {
          const doc = res.data.document;
          this.ownershipDocs.push(doc);
          this.isDeletingOwnership.push(false);
          queueEntry.status = 'success';
          this.isUploadingOwnership = this.fileUploadQueue.some(e => e.status === 'uploading');
          this.notificationService.show(`"${doc.fileName}" ${this.translate.instant('USER_KYC.NOTIF_DOC_SAVED')}`, 'success');
        },
        error: (err: any) => {
          queueEntry.status = 'error';
          queueEntry.error = err.error?.message || this.translate.instant('USER_KYC.ERR_UPLOAD_FAILED');
          this.isUploadingOwnership = this.fileUploadQueue.some(e => e.status === 'uploading');
          this.notificationService.show(queueEntry.error!, 'error');
        }
      });
    });
    event.target.value = '';
  }

  retryUpload(queueIndex: number): void {
    const entry = this.fileUploadQueue[queueIndex];
    if (!entry?.file || entry.status !== 'error') return;
    entry.status = 'uploading'; entry.error = undefined;
    this.isUploadingOwnership = true;

    this.kycService.uploadOwnershipFile(entry.file).subscribe({
      next: (res) => {
        const doc = res.data.document;
        this.ownershipDocs.push(doc); this.isDeletingOwnership.push(false);
        entry.status = 'success';
        this.isUploadingOwnership = this.fileUploadQueue.some(e => e.status === 'uploading');
        this.notificationService.show(`"${doc.fileName}" ${this.translate.instant('USER_KYC.NOTIF_DOC_SAVED')}`, 'success');
      },
      error: (err: any) => {
        entry.status = 'error';
        entry.error = err.error?.message || this.translate.instant('USER_KYC.ERR_UPLOAD_FAILED');
        this.isUploadingOwnership = this.fileUploadQueue.some(e => e.status === 'uploading');
      }
    });
  }

  deleteOwnershipFile(localIndex: number): void {
    const doc = this.ownershipDocs[localIndex];
    if (!doc?._id) return;
    this.isDeletingOwnership[localIndex] = true;
    this.kycService.deleteOwnershipFile(doc._id).subscribe({
      next: () => {
        this.ownershipDocs.splice(localIndex, 1);
        this.isDeletingOwnership.splice(localIndex, 1);
        this.notificationService.show(this.translate.instant('USER_KYC.NOTIF_DOC_REMOVED'), 'success');
      },
      error: (err: any) => {
        this.isDeletingOwnership[localIndex] = false;
        this.notificationService.show(err.error?.message || this.translate.instant('USER_KYC.ERR_REMOVE_FAILED'), 'error');
      }
    });
  }

  getFileIcon(fileType?: string): string {
    switch (fileType) {
      case 'pdf': return 'fa-file-pdf';
      case 'doc': return 'fa-file-word';
      default: return 'fa-file-image';
    }
  }

  getFileIconColor(fileType?: string): string {
    switch (fileType) {
      case 'pdf': return '#e74c3c';
      case 'doc': return '#2980b9';
      default: return '#C9A96E';
    }
  }

  // ── WebRTC Liveness ───────────────────────────────────────────────────────
  /** State getters for clean template conditionals */
  get isCameraIdle(): boolean { return this.cameraState === 'idle'; }
  get isCameraLoading(): boolean { return this.cameraState === 'loading'; }
  get isCameraActive(): boolean { return this.cameraState === 'active'; }
  get hasCameraError(): boolean { return this.cameraState === 'error'; }
  get isCaptured(): boolean { return this.cameraState === 'captured'; }
  get isUploadingSelfie(): boolean { return this.cameraState === 'captured' && !this.livePhotoUrl; }

  async startCamera(): Promise<void> {
    if (!this.isViewInitialized) return;
    if (this.cameraState === 'active' || this.cameraState === 'loading') return;
    this.stopCamera();
    this.cameraState = 'loading';
    this.cameraErrorMsg = '';
    this.cdr.detectChanges();

    try {
      try {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false
        });
      } catch (firstErr: any) {
        if (firstErr?.name === 'NotAllowedError' || firstErr?.name === 'PermissionDeniedError') {
          throw firstErr;
        }
        console.warn('FacingMode camera constraints failed, attempting fallback to basic video...', firstErr);
        this.mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false
        });
      }

      this.cameraState = 'active';
      this.cdr.detectChanges();

      // Wait one tick for the <video> to be rendered
      setTimeout(() => {
        if (this.videoEl?.nativeElement) {
          this.videoEl.nativeElement.srcObject = this.mediaStream;
          this.videoEl.nativeElement.play().catch(playErr => {
            console.error('Failed to play video stream:', playErr);
          });
        }
      }, 80);
    } catch (err: any) {
      this.cameraState = 'error';
      this.cameraErrorMsg = err?.name === 'NotAllowedError'
        ? this.translate.instant('USER_KYC.CAMERA_PERMISSION_DENIED')
        : this.translate.instant('USER_KYC.CAMERA_UNAVAILABLE');
      this.cdr.detectChanges();
    }
  }

  async retryCamera(): Promise<void> {
    this.stopCamera();
    this.cameraState = 'idle';
    this.cdr.detectChanges();
    await this.startCamera();
  }

  capturePhoto(): void {
    if (!this.videoEl?.nativeElement || !this.canvasEl?.nativeElement) return;
    const video = this.videoEl.nativeElement;
    const canvas = this.canvasEl.nativeElement;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    this.livePhotoPreview = canvas.toDataURL('image/jpeg', 0.92);

    this.stopCamera();
    this.cameraState = 'captured'; // uploading state (livePhotoUrl still null)

    canvas.toBlob(blob => {
      if (!blob) return;
      const selfieFile = new File([blob], `selfie-${Date.now()}.jpg`, { type: 'image/jpeg' });
      this.kycService.uploadImage(selfieFile).subscribe({
        next: (res) => {
          this.livePhotoUrl = res.url;
          this.isSelfieDeletedInSession = false;
          this.cdr.detectChanges();
        },
        error: (err: any) => {
          this.livePhotoPreview = null;
          this.livePhotoUrl = null;
          this.cameraState = 'idle';
          this.notificationService.show(
            err.error?.message || this.translate.instant('USER_KYC.ERR_SELFIE_FAILED'), 'error'
          );
        }
      });
    }, 'image/jpeg', 0.92);
  }

  retakePhoto(): void {
    this.stopCamera();
    this.livePhotoPreview = null;
    this.livePhotoUrl = null;
    this.cameraState = 'idle';
    this.isSelfieDeletedInSession = false;
    this.cdr.detectChanges();
    this.startCamera();
  }

  deleteSelfie(): void {
    this.stopCamera();
    this.livePhotoPreview = null;
    this.livePhotoUrl = null;
    this.cameraState = 'idle';
    this.isSelfieDeletedInSession = true;
    this.cdr.detectChanges();
  }

  stopCamera(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    if (this.videoEl?.nativeElement) {
      this.videoEl.nativeElement.srcObject = null;
    }
    // Only reset to idle if we're not moving to 'captured'
    if (this.cameraState === 'active' || this.cameraState === 'loading') {
      this.cameraState = 'idle';
    }
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  async onSubmit(): Promise<void> {
    if (this.kycForm.invalid) {
      this.kycForm.markAllAsTouched();
      return;
    }
    const hasFrontImage = this.selectedFrontFile || this.frontPreview;
    const hasOwnershipDocs = this.ownershipDocs?.length > 0;
    if (!hasFrontImage && !hasOwnershipDocs) {
      this.showRevertWarning = true;
      return;
    }
    await this.processSubmission();
  }

  cancelRevert(): void { this.showRevertWarning = false; }

  async confirmRevert(): Promise<void> {
    this.showRevertWarning = false;
    await this.processSubmission();
  }

  private async processSubmission(): Promise<void> {
    this.isUploading = true;
    try {
      let frontImageUrl = '';
      if (this.selectedFrontFile) {
        const r = await firstValueFrom(this.kycService.uploadImage(this.selectedFrontFile));
        if (!r?.success) throw new Error('Front image upload failed');
        frontImageUrl = r.url;
      } else if (this.frontPreview) {
        frontImageUrl = this.frontPreview;
      }

      let backImageUrl: string | undefined;
      if (this.selectedBackFile) {
        const r = await firstValueFrom(this.kycService.uploadImage(this.selectedBackFile));
        if (!r?.success) throw new Error('Back image upload failed');
        backImageUrl = r.url;
      } else if (this.backPreview) {
        backImageUrl = this.backPreview;
      }

      this.isUploading = false;
      this.isLoading = true;

      let finalPhoneNumber = this.kycForm.value.phoneNumber?.trim() || '';
      if (finalPhoneNumber && !finalPhoneNumber.startsWith('+')) {
        const cleanNumber = finalPhoneNumber.replace(/^0+/, '');
        finalPhoneNumber = `${this.selectedDialCode}${cleanNumber}`;
      }

      const submission: KYCSubmission = {
        documentType: this.kycForm.value.documentType,
        frontImage: frontImageUrl || '',
        backImage: backImageUrl,
        nationality: this.kycForm.value.nationality?.trim() || undefined,
        phoneNumber: finalPhoneNumber || undefined,
        livePhoto: this.livePhotoUrl || undefined,
      };

      this.kycService.submitKYC(submission).pipe(
        finalize(() => this.isLoading = false)
      ).subscribe({
        next: () => {
          this.notificationService.show(
            this.translate.instant('USER_KYC.NOTIF_SUBMITTED'), 'success'
          );
          this.selectedFrontFile = null;
          this.selectedBackFile = null;
          this.loadConsolidatedData();
          this.startConsolidatedPolling();
        },
        error: (err: any) => {
          this.notificationService.show(
            err.error?.message || this.translate.instant('USER_KYC.ERR_SUBMIT_FAILED'), 'error'
          );
        }
      });
    } catch (error: any) {
      this.isUploading = false;
      this.notificationService.show(error.message || this.translate.instant('USER_KYC.ERR_SUBMIT_FAILED'), 'error');
    }
  }
}
