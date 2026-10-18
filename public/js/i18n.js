/* TanyaTech — English / Arabic text for the storefront.
   To change a sentence, edit it here. To add a language, add another block below. */

const I18N = {
  en: {
    'meta.title': 'TanyaTech — Custom 3D Printing',
    'brand.tag': '3D PRINT LAB',
    'nav.products': 'Products ▾',
    'nav.productsPlain': 'Products',
    'nav.services': 'Services',
    'nav.about': 'About Us',
    'nav.theme': 'Toggle theme',
    'nav.menu': 'Menu',
    'nav.cart': 'Cart',
    'nav.lang': 'العربية',
    'nav.langTitle': 'التبديل إلى العربية',

    'hero.kicker': 'FDM & RESIN · AMMAN, JORDAN',
    'hero.title': 'We print your ideas, <span class="grad-text">layer by layer.</span>',
    'hero.lede': 'Browse ready-made prints or send us your own design — TanyaTech turns files, sketches, and rough ideas into real objects, printed on demand.',
    'hero.browse': 'Browse products',
    'hero.custom': 'Request a custom print',

    'prod.title': 'Products',
    'prod.sub': 'Ready to print and ship — pick a category, choose a color, add to cart.',
    'prod.allCats': 'All categories',
    'prod.allProducts': 'All products',
    'prod.empty': 'No products in this category yet.',
    'prod.add': 'Add to cart',
    'prod.added': '{name} added to cart',

    'svc.kicker': 'CUSTOM ORDERS',
    'svc.title': 'Have your own design in mind?',
    'svc.sub': "Tell us what you need and attach a photo, sketch, or reference file if you have one. We'll get back to you on WhatsApp with a quote and timeline.",
    'svc.p1': "Describe the object, size, and material you're imagining.",
    'svc.p2': 'Attach a reference picture — a photo, a drawing, or a screenshot of a design.',
    'svc.p3': 'We reply on WhatsApp with pricing and an estimated print time.',
    'svc.formTitle': 'Request a custom print',
    'svc.phone': 'Phone number',
    'svc.phonePh': '07xx xxx xxx',
    'svc.desc': 'Describe what you want printed',
    'svc.descPh': 'e.g. a 12cm vase, spiral pattern, matte black',
    'svc.ref': 'Reference picture (optional)',
    'svc.upload': 'Click to attach an image',
    'svc.send': 'Send request',
    'svc.hint': 'Submitting opens WhatsApp so you can send it to us directly.',
    'svc.sent': 'Request sent — opening WhatsApp',

    'about.kicker': 'ABOUT TANYATECH',
    'about.title': 'A small print lab, built for makers and businesses in Jordan.',
    'about.sub': 'TanyaTech is a local 3D printing studio. We stock a rotating catalog of ready-made prints and take on custom jobs — figurines, prototypes, replacement parts, and one-off ideas — printed to order and handed off over WhatsApp, no accounts or checkouts required.',
    'about.tol': 'print tolerance',
    'about.turn': 'typical turnaround',
    'about.resin': 'resin on request',
    'about.min': 'order minimum',
    'about.touch': 'Get in touch',
    'about.wa': 'WhatsApp: contact us via the buttons on this site',
    'about.loc': 'Amman, Jordan',
    'about.hours': 'Sun–Thu, 10:00–18:00',

    'footer.rights': 'TanyaTech — printed on demand.',
    'footer.admin': 'Admin access',

    'cart.title': 'Your cart',
    'cart.empty': 'Your cart is empty. Browse products to add something.',
    'cart.remove': 'Remove',
    'cart.promoPh': 'Promo code',
    'cart.apply': 'Apply',
    'cart.removePromo': 'Remove',
    'cart.subtotal': 'Subtotal',
    'cart.promoLabel': 'Promo {code}',
    'cart.total': 'Total',
    'cart.checkout': 'Checkout',
    'cart.minNote': 'Minimum order is {min} — add {more} more.',

    'promo.enter': 'Enter a promo code',
    'promo.applied': 'Code {code} applied — you save {amount}',
    'promo.fail': 'Could not apply code',

    'co.detailsTitle': 'Your details',
    'co.detailsHint': 'So we can confirm your order and reach you if needed.',
    'co.phone': 'Phone number',
    'co.continue': 'Continue to payment',
    'co.payTitle': 'Pay with CliQ',
    'co.payHint': 'Transfer the total amount using CliQ, then continue to attach your receipt.',
    'co.alias': 'CliQ alias:',
    'co.amount': 'Amount to send:',
    'co.ref': 'Reference:',
    'co.refVal': 'Your phone number',
    'co.back': 'Back',
    'co.paid': "I've paid — continue",
    'co.confirmTitle': 'Confirm payment',
    'co.confirmHint': 'Attach a screenshot of your CliQ transfer as proof of payment.',
    'co.attach': 'Click to attach payment screenshot',
    'co.place': 'Place order',
    'co.sentTitle': 'Order sent',
    'co.sentBody': 'Your order {id} is saved. WhatsApp is opening so you can send it to us directly — feel free to attach your screenshot again there.',
    'co.done': 'Done',
    'co.fail': 'Could not place order',

    'err.network': 'Network error — please try again',
    'err.sendFail': 'Could not send request',

    // messages that come back from the server, shown in the chosen language
    'srv.Phone number is required': 'Phone number is required',
    'srv.Description is required': 'Description is required',
    'srv.Cart is empty': 'Cart is empty',
    'srv.Your cart is empty': 'Your cart is empty',
    'srv.Invalid items': 'Invalid items',
    'srv.Payment screenshot is required': 'Payment screenshot is required',
    'srv.Cart items are no longer available': 'Cart items are no longer available',
    'srv.This promo code is not valid': 'This promo code is not valid',
    'srv.This promo code has expired': 'This promo code has expired',
    'srv.This promo code has reached its usage limit': 'This promo code has reached its usage limit',
    'srv.minOrder': 'Minimum order is {min}',
    'srv.promoMin': 'This code needs an order of at least {min}',

    'cur': 'JD'
  },

  ar: {
    'meta.title': 'تانيا تك — طباعة ثلاثية الأبعاد حسب الطلب',
    'brand.tag': 'مختبر الطباعة ثلاثية الأبعاد',
    'nav.products': 'المنتجات ▾',
    'nav.productsPlain': 'المنتجات',
    'nav.services': 'خدماتنا',
    'nav.about': 'من نحن',
    'nav.theme': 'تبديل المظهر',
    'nav.menu': 'القائمة',
    'nav.cart': 'السلة',
    'nav.lang': 'English',
    'nav.langTitle': 'Switch to English',

    'hero.kicker': 'FDM وراتنج · عمّان، الأردن',
    'hero.title': 'نطبع أفكارك، <span class="grad-text">طبقة تلو الأخرى.</span>',
    'hero.lede': 'تصفّح مطبوعات جاهزة أو أرسل لنا تصميمك الخاص — تانيا تك تحوّل الملفات والرسومات والأفكار الأولية إلى مجسّمات حقيقية تُطبع عند الطلب.',
    'hero.browse': 'تصفّح المنتجات',
    'hero.custom': 'اطلب طباعة مخصّصة',

    'prod.title': 'المنتجات',
    'prod.sub': 'جاهزة للطباعة والشحن — اختر الفئة واللون ثم أضف إلى السلة.',
    'prod.allCats': 'كل الفئات',
    'prod.allProducts': 'كل المنتجات',
    'prod.empty': 'لا توجد منتجات في هذه الفئة حتى الآن.',
    'prod.add': 'أضف إلى السلة',
    'prod.added': 'تمت إضافة {name} إلى السلة',

    'svc.kicker': 'طلبات مخصّصة',
    'svc.title': 'هل لديك تصميم خاص في بالك؟',
    'svc.sub': 'أخبرنا بما تحتاجه وأرفق صورة أو رسمة أو ملف مرجعي إن وُجد. سنرد عليك عبر واتساب بسعر وموعد التسليم.',
    'svc.p1': 'صِف المجسّم الذي تتخيله وحجمه والخامة المطلوبة.',
    'svc.p2': 'أرفق صورة مرجعية — صورة أو رسمة أو لقطة شاشة لتصميم.',
    'svc.p3': 'نرد عليك عبر واتساب بالسعر والوقت التقديري للطباعة.',
    'svc.formTitle': 'اطلب طباعة مخصّصة',
    'svc.phone': 'رقم الهاتف',
    'svc.phonePh': '07xx xxx xxx',
    'svc.desc': 'صِف ما تريد طباعته',
    'svc.descPh': 'مثال: مزهرية ارتفاع 12 سم بنقش حلزوني، أسود مطفي',
    'svc.ref': 'صورة مرجعية (اختياري)',
    'svc.upload': 'اضغط لإرفاق صورة',
    'svc.send': 'إرسال الطلب',
    'svc.hint': 'عند الإرسال سيُفتح واتساب لتتمكن من إرساله إلينا مباشرة.',
    'svc.sent': 'تم إرسال الطلب — جارٍ فتح واتساب',

    'about.kicker': 'عن تانيا تك',
    'about.title': 'مختبر طباعة صغير، مصمّم للمبدعين والشركات في الأردن.',
    'about.sub': 'تانيا تك استوديو محلي للطباعة ثلاثية الأبعاد. نوفّر مجموعة متجددة من المطبوعات الجاهزة ونتولّى الطلبات المخصّصة — مجسّمات ونماذج أولية وقطع بديلة وأفكار فريدة — تُطبع حسب الطلب وتُسلَّم عبر واتساب، دون حسابات أو خطوات معقدة.',
    'about.tol': 'هامش دقة الطباعة',
    'about.turn': 'مدة التنفيذ المعتادة',
    'about.resin': 'الراتنج عند الطلب',
    'about.min': 'الحد الأدنى للطلب',
    'about.touch': 'تواصل معنا',
    'about.wa': 'واتساب: تواصل معنا عبر الأزرار في هذا الموقع',
    'about.loc': 'عمّان، الأردن',
    'about.hours': 'الأحد–الخميس، 10:00–18:00',

    'footer.rights': 'تانيا تك — تُطبع عند الطلب.',
    'footer.admin': 'دخول المشرف',

    'cart.title': 'سلتك',
    'cart.empty': 'سلتك فارغة. تصفّح المنتجات وأضف ما يعجبك.',
    'cart.remove': 'إزالة',
    'cart.promoPh': 'رمز الخصم',
    'cart.apply': 'تطبيق',
    'cart.removePromo': 'إزالة',
    'cart.subtotal': 'المجموع الفرعي',
    'cart.promoLabel': 'رمز الخصم {code}',
    'cart.total': 'الإجمالي',
    'cart.checkout': 'إتمام الطلب',
    'cart.minNote': 'الحد الأدنى للطلب {min} — أضف {more} للوصول إليه.',

    'promo.enter': 'أدخل رمز الخصم',
    'promo.applied': 'تم تطبيق الرمز {code} — وفّرت {amount}',
    'promo.fail': 'تعذّر تطبيق الرمز',

    'co.detailsTitle': 'بياناتك',
    'co.detailsHint': 'لنتمكن من تأكيد طلبك والتواصل معك عند الحاجة.',
    'co.phone': 'رقم الهاتف',
    'co.continue': 'المتابعة إلى الدفع',
    'co.payTitle': 'الدفع عبر كليك (CliQ)',
    'co.payHint': 'حوّل المبلغ الإجمالي عبر كليك، ثم تابع لإرفاق الإيصال.',
    'co.alias': 'اسم كليك:',
    'co.amount': 'المبلغ المطلوب تحويله:',
    'co.ref': 'المرجع:',
    'co.refVal': 'رقم هاتفك',
    'co.back': 'رجوع',
    'co.paid': 'تم الدفع — متابعة',
    'co.confirmTitle': 'تأكيد الدفع',
    'co.confirmHint': 'أرفق لقطة شاشة لتحويل كليك كإثبات للدفع.',
    'co.attach': 'اضغط لإرفاق لقطة شاشة الدفع',
    'co.place': 'إرسال الطلب',
    'co.sentTitle': 'تم إرسال الطلب',
    'co.sentBody': 'تم حفظ طلبك {id}. سيُفتح واتساب لتتمكن من إرساله إلينا مباشرة — يمكنك إرفاق لقطة الشاشة مرة أخرى هناك.',
    'co.done': 'تم',
    'co.fail': 'تعذّر إرسال الطلب',

    'err.network': 'خطأ في الاتصال — يرجى المحاولة مرة أخرى',
    'err.sendFail': 'تعذّر إرسال الطلب',

    'srv.Phone number is required': 'رقم الهاتف مطلوب',
    'srv.Description is required': 'الوصف مطلوب',
    'srv.Cart is empty': 'السلة فارغة',
    'srv.Your cart is empty': 'سلتك فارغة',
    'srv.Invalid items': 'عناصر غير صالحة',
    'srv.Payment screenshot is required': 'لقطة شاشة الدفع مطلوبة',
    'srv.Cart items are no longer available': 'بعض عناصر السلة لم تعد متوفرة',
    'srv.This promo code is not valid': 'رمز الخصم غير صالح',
    'srv.This promo code has expired': 'انتهت صلاحية رمز الخصم',
    'srv.This promo code has reached its usage limit': 'وصل رمز الخصم إلى الحد الأقصى للاستخدام',
    'srv.minOrder': 'الحد الأدنى للطلب {min}',
    'srv.promoMin': 'هذا الرمز يتطلب طلباً لا يقل عن {min}',

    'cur': 'د.أ'
  }
};

const LANG_KEY = 'tanyatech_lang';
let currentLang = 'en';

function detectLang() {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved === 'ar' || saved === 'en') return saved;
  } catch (e) { /* storage blocked: fall through */ }
  return /^ar/i.test(navigator.language || '') ? 'ar' : 'en';
}

// t('key', { name: 'x' }) -> text in the current language (falls back to English, then the key)
function t(key, vars) {
  let s = (I18N[currentLang] && I18N[currentLang][key]) || I18N.en[key] || key;
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
  return s;
}

// Translates a message that came from the server. Unknown messages are shown as they are.
function tServer(msg, fallbackKey) {
  if (!msg) return fallbackKey ? t(fallbackKey) : '';
  const direct = I18N.en['srv.' + msg];
  if (direct !== undefined) return t('srv.' + msg);
  let m = /^Minimum order is ([\d.]+) JD$/.exec(msg);
  if (m) return t('srv.minOrder', { min: fmtMoney(parseFloat(m[1])) });
  m = /^This code needs an order of at least ([\d.]+) JD$/.exec(msg);
  if (m) return t('srv.promoMin', { min: fmtMoney(parseFloat(m[1])) });
  return msg;
}

// 12.5 -> "12.50 JD" / "12.50 د.أ"
// `sign` (e.g. '-') is kept attached to the number even inside right-to-left text.
function fmtMoney(n, sign) {
  const num = (Math.round(n * 100) / 100).toFixed(2);
  return sign ? '\u2066' + sign + num + '\u2069 ' + t('cur') : num + ' ' + t('cur');
}

function applyI18n() {
  const root = document.documentElement;
  root.lang = currentLang;
  root.dir = currentLang === 'ar' ? 'rtl' : 'ltr';
  document.title = t('meta.title');
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-html]').forEach(el => { el.innerHTML = t(el.dataset.i18nHtml); });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => { el.placeholder = t(el.dataset.i18nPlaceholder); });
  document.querySelectorAll('[data-i18n-title]').forEach(el => { el.title = t(el.dataset.i18nTitle); });
  document.querySelectorAll('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
}

function setLang(lang) {
  currentLang = lang === 'ar' ? 'ar' : 'en';
  try { localStorage.setItem(LANG_KEY, currentLang); } catch (e) { /* ignore */ }
  applyI18n();
  if (typeof onLangChange === 'function') onLangChange();
}
function toggleLang() { setLang(currentLang === 'ar' ? 'en' : 'ar'); }

currentLang = detectLang();
