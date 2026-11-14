# RadioJavanLink

نسخهٔ وب لینک آهنگ یا پادکست رادیو جوان را می‌گیرد و آدرس فایل را برای کپی نمایش می‌دهد. انتخاب ۲۵۶ در صورت نبود لینک جداگانه، از مسیر ۱۲۸ یک آدرس تأییدنشده می‌سازد.

## انتشار

1. این پوشه را ریشهٔ یک مخزن GitHub با شاخهٔ `main` قرار بده. برای نسخهٔ وب فایل‌های `web/`، `worker.mjs`، `wrangler.toml` و `.github/` کافی‌اند.
2. در Cloudflare پروژه را با `npx wrangler deploy` منتشر کن. متغیر `PAGES_ORIGIN` را برای Worker روی مبدأ سایت Pages قرار بده، مثلاً `https://USERNAME.github.io`.
3. در تنظیمات مخزن GitHub، متغیر Actions به نام `RESOLVER_URL` را روی آدرس HTTPS ورکر با مسیر `/api/resolve` بگذار. در بخش Pages گزینهٔ GitHub Actions را انتخاب کن و گردش‌کار Deploy web app را اجرا کن.

خود Worker هم صفحهٔ وب را ارائه می‌کند و برای این حالت به تنظیم Pages نیازی ندارد. برای اجرای محلی، از ریشهٔ پروژه `npx wrangler dev` را اجرا کن.
