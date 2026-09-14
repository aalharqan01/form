# Coach website Arabic review — issue #43

This pass covers the coach workspace: clients and requests, client overview,
programs and reusable templates, weekly check-ins, messages and progress photos,
nutrition and step targets, profile and packages. Shared exercise selection,
video controls, and progress charts are included because coaches open them from
these screens. The trainee marketplace and standalone web tracker remain
separate follow-up surfaces.

## Corrections for product review

| Surface | Previous display or mismatch | Proposed Arabic |
| --- | --- | --- |
| Navigation | العملاء والطلبات; English client list | المتدربون والطلبات; جميع المتدربين |
| Workout templates | قوالب التمارين; English editor | قوالب الحصص; إنشاء قالب; اسم القالب |
| Program | English session/day/exercise labels | حصة for a session; تمرين for one exercise; يوم التدريب |
| Weekly follow-up | English check-in counts and review form | متابعة أسبوعية; ملاحظاتك للمتدرب; إرسال الملاحظات وإتمام المراجعة |
| Client overview | Intake; Considerations | بيانات المتدرب الأولية; ملاحظات يجب مراعاتها |
| Nutrition | Edit targets; Calories / Protein / Carbs / Fat | تعديل الأهداف; السعرات الحرارية / البروتين / الكربوهيدرات / الدهون |
| Profile | Profile & packages; Included services | الملف الشخصي والباقات; الخدمات المشمولة |
| Messages | English composer, reply timing, upload errors | Arabic composer, complete reply-time phrases, and local upload validation |
| Photos | Front / Side / Back, assembled English captions | أمامي / جانبي / خلفي; translated captions, comparison controls, and confirmation |
| Counts | English singular/plural suffixes attached to numbers | Complete phrases such as التمارين: {count} and المقاعد المشغولة: {used} من {total} |

Display mappings translate statuses, weekdays, muscle groups, and equipment
without changing their stored values. Exercise names, coach-written programs,
package descriptions, notes, and messages remain as entered. New draft names use
localized placeholders rather than inserting English content into Arabic forms.

The sidebar, content spacing, text alignment, message corners, and directional
navigation follow RTL. Numeric tables and chart coordinates retain LTR direction.
The existing Arabic typeface and FORM styling are preserved.

## Validation and boundaries

The bilingual browser regression visits both desktop (1440 px) and phone
(390 px) layouts. It checks Arabic navigation and forms, RTL geometry, page
width, language persistence, and saving an Arabic template containing an
English library exercise. Switching back to English must retain the saved
Arabic name and the original exercise identifiers. Screenshots are generated
for both languages. Tests use only reserved loopback fixtures and restore them.

Per the 13 September product decision in `I18N.md`, date/number formatting and
server-returned API errors are unchanged. No backend, authentication, database
schema, or deployment settings are changed. Arabic copy still needs the product
owner's wording review before issue #43 is closed.

## Captured review screens

| Width | English | Arabic |
| --- | --- | --- |
| Desktop, 1440 px | [Clients](reviews/coach-arabic/english-clients-1440.png) | [Clients](reviews/coach-arabic/arabic-clients-1440.png) |
| Phone, 390 px | [Clients](reviews/coach-arabic/english-clients-390.png) | [Clients](reviews/coach-arabic/arabic-clients-390.png) |

[Arabic program editor on a phone](reviews/coach-arabic/arabic-program-390.png).
