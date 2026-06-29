# Earnora Next.js

هذا الإصدار هو تحويل للمشروع الأصلي من `Vite + React + Express` إلى مشروع `Next.js` كامل مع:

- واجهة صفحات عبر `Next.js`
- واجهة `API` داخل نفس المشروع عبر `pages/api`
- دعم `Tailwind CSS`
- نفس منطق المصادقة وطبقة قاعدة البيانات تقريبًا

## التشغيل محليًا

```bash
npm install
cp .env.example .env.local
npm run dev
```

افتح `http://localhost:3000`

## المتغيرات المطلوبة

- `DATABASE_URL`
- `SESSION_SECRET`
- `TELEGRAM_BOT_TOKEN` لتوثيق جلسات Telegram Mini App
- `TELEGRAM_BOT_USERNAME` لإنشاء روابط الإحالة العميقة إلى البوت
- `WEB_ADMIN_USERNAME` لتسجيل دخول لوحة الإدارة من المتصفح
- `WEB_ADMIN_PASSWORD` أو `WEB_ADMIN_PASSWORD_HASH` لكلمة مرور لوحة الإدارة

## ملاحظات

- تم تجهيز المشروع ليعمل كتطبيق Next.js موحّد.
- ملف قاعدة البيانات الأصلي محفوظ في `schema.sql`.
- طبقة الخادم الأصلية موجودة داخل `server/` وتم ربطها بواجهة `pages/api/[[...path]].ts`.
- تمت ترحيل المصادقة لتعمل عبر Telegram Mini App فقط:
  - إنشاء الحساب تلقائياً من `initData`
  - الاعتماد على `telegram_id` كمعرّف فريد
  - التحقق الخلفي من `initData` قبل إصدار الجلسة
  - دعم `startapp` لرموز الإحالة
- تمت توسعة إعدادات المنصة لدعم:
  - بيانات Telegram bot و Mini App
  - تكامل `BitLabs` و`AdGem` مع webhooks آمنة ومنع التكرار والتسجيل الكامل للتحويلات
  - جدران العروض والاستبيانات داخل Telegram Mini App مع ربط تلقائي بالمحفظة
  - Telegram Stars و TON ضمن خيارات الدفع/السحب
  - تفعيل حد السحب الأدنى والتحقق من حالة السحب من إعدادات الإدارة
- يمكن الآن فتح لوحة الإدارة من المتصفح عبر `http://localhost:3000/admin-login` بعد ضبط بيانات `WEB_ADMIN_USERNAME` و `WEB_ADMIN_PASSWORD`
