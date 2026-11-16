# توثيق إعداد ورفع مشروع VideoCutterPro على السيرفر الخاص VPS

تم نقل ورفع هذا المشروع بالكامل من استضافة هوستنجر (Hostinger) إلى السيرفر الخاص (VPS) ذي العنوان `62.72.19.112` بنجاح ليعمل جنباً إلى جنب مع المواقع الأخرى دون التأثير عليها.

---

## 🌐 تفاصيل النطاق والخادم (Domain & VPS Info)
* **النطاق الفرعي (Subdomain)**: [https://videocutterpro.albalahy4u.cloud](https://videocutterpro.albalahy4u.cloud)
* **عنوان السيرفر (IP)**: `62.72.19.112`
* **المسار على السيرفر**: `/var/www/videocutterpro`
* **إصدار PHP المستخدم**: `PHP 8.3 FPM` (عبر المقبس: `/var/run/php/php8.3-fpm.sock`)

---

## 🗄️ إعدادات قاعدة البيانات (Database Setup)
تم إنشاء قاعدة بيانات ومستخدم معزولين لضمان الأمان الكامل:
* **اسم قاعدة البيانات**: `videocutterpro_db`
* **المستخدم (User)**: `videocutterpro_usr`
* **كلمة المرور**: `VCP_Pass_94@@`

---

## 📄 ملف إعداد Nginx (Nginx Configuration)
المسار على السيرفر: `/etc/nginx/sites-available/videocutterpro.albalahy4u.cloud`
تم إعداده وتفعيله بالرابط الرمزي (Symlink) في `sites-enabled` وإصدار شهادة الحماية SSL عبر **Certbot** تلقائياً.

محتوى ملف الإعداد النهائي:
```nginx
server {
    server_name videocutterpro.albalahy4u.cloud;
    root /var/www/videocutterpro/public;

    index index.php index.html;

    charset utf-8;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location = /favicon.ico { access_log off; log_not_found off; }
    location = /robots.txt  { access_log off; log_not_found off; }

    error_page 404 /index.php;

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.3-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
        fastcgi_hide_header X-Powered-By;
        fastcgi_read_timeout 300;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }

    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/videocutterpro.albalahy4u.cloud/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/videocutterpro.albalahy4u.cloud/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot
}

server {
    if ($host = videocutterpro.albalahy4u.cloud) {
        return 301 https://$host$request_uri;
    } # managed by Certbot

    listen 80;
    server_name videocutterpro.albalahy4u.cloud;
    return 404; # managed by Certbot
}
```

---

## 🛠️ تفاصيل وخطوات عملية النقل والرفع
1. **بناء ملفات الواجهة (Vite React Build)**:
   * تم تشغيل `npm run build` لبناء وتجهيز ملفات React محلياً ودمجها بداخل مجلد Laravel العام (`public/build`).
2. **ضغط ورفع الكود**:
   * تم ضغط مجلد `laravel-app` باستثناء مجلدات الحزم المؤقتة الكبيرة (`node_modules`, `vendor`, `.git`).
   * رفع الملف إلى `/var/www/videocutterpro` وفك الضغط هناك.
3. **تعديل البيئة (.env)**:
   * تم إنشاء وإعداد ملف البيئة `.env` بالبيانات الصحيحة للإنتاج (Production) والربط مع قاعدة البيانات الجديدة ومفاتيح تسجيل الدخول من Google وGemini API.
4. **تثبيت حزم الـ PHP والتهجير**:
   * تشغيل `composer install --no-dev --optimize-autoloader`.
   * تشغيل `php artisan migrate --force` لإنشاء جداول البيانات.
   * تشغيل `php artisan db:seed --class=PostSeeder --force` لإدخال مقالات المدونة.
   * ربط مجلد التخزين `php artisan storage:link`.
5. **الصلاحيات والحماية**:
   * تغيير المالك ليكون `www-data:www-data` لجميع ملفات المشروع.
   * إعطاء صلاحيات الكتابة `775` للمجلدات الحيوية: `storage` و `bootstrap/cache`.

---

## ⚠️ تم حل مشكلة (Troubleshooting)
* **مشكلة خطأ 500 (Access denied for user 'u123456789_user')**:
  * **السبب**: وجود ملف قديم باسم `.env.production` تم نقله ضمن ملف الـ ZIP، وكان خادم الويب يقرأه بدلاً من `.env` وكان يحتوي على بيانات مستخدم الاستضافة القديمة (Hostinger).
  * **الحل**: تم تغيير اسم الملف القديم إلى `.env.production.bak` لتعطيله، ثم تفريغ وإعادة بناء كاش الإعدادات في لارافيل (`php artisan config:clear && php artisan config:cache`) وإعادة تشغيل خدمة `php8.3-fpm` لتحديث كاش الذاكرة الخاص بـ OPcache، مما جعل الموقع يعمل بنجاح تام 200 OK.
