<?php

namespace Database\Seeders;

use App\Models\Post;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class PostSeeder extends Seeder
{
    public function run(): void
    {
        Post::truncate();

        $posts = [
            [
                'title' => 'مرحباً بك في VideoCutter Pro: أسرع أداة لتقطيع الفيديوهات بالذكاء الاصطناعي',
                'title_en' => 'Welcome to VideoCutter Pro: The Fastest AI Video Cutting Tool',
                'summary' => 'تعرف على كيف يمكن لـ VideoCutter Pro توفير ساعات من وقتك في المونتاج باستخدام تقنية التقطيع التلقائي.',
                'summary_en' => 'Learn how VideoCutter Pro can save you hours of editing time using auto-cut technology.',
                'content' => '<h2>الثورة في عالم تحرير الفيديو</h2><p>في عالم المحتوى السريع، الوقت هو أغلى ما نملك. لهذا قمنا ببناء <strong>VideoCutter Pro</strong> ليكن رفيقك في توفير الجهد والوقت.</p><h3>المميزات الرئيسية:</h3><ul><li><strong>التقطيع بالذكاء الاصطناعي:</strong> نقوم بتحليل الفيديو واكتشاف اللحظات الصامتة أو الانتقالات المهمة لتقطيعها تلقائياً.</li><li><strong>دعم جميع الصيغ:</strong> لا تقلق بشأن نوع الملف، نحن ندعم MP4, WebM, MOV وغيرها.</li><li><strong>سرعة خرافية:</strong> نستخدم تقنيات حديثة للمعالجة مباشرة في متصفحك دون الحاجة لرفع الملفات الكبيرة للسيرفر.</li></ul>',
                'content_en' => '<h2>The Revolution in Video Editing</h2><p>In a fast-paced content world, time is our most valuable asset. That\'s why we built <strong>VideoCutter Pro</strong> to be your companion in saving effort and time.</p><h3>Key Features:</h3><ul><li><strong>AI Cutting:</strong> We analyze the video and detect silent moments or important transitions to cut them automatically.</li><li><strong>Support for All Formats:</strong> Don\'t worry about file types, we support MP4, WebM, MOV, and more.</li><li><strong>Blazing Speed:</strong> We use modern technologies for processing directly in your browser without needing to upload large files to the server.</li></ul>',
                'is_published' => true,
                'published_at' => now(),
            ],
            [
                'title' => 'تحسين جودة الفيديو باستخدام المؤثرات والفلاتر الاحترافية',
                'title_en' => 'Enhance Video Quality with Professional Effects and Filters',
                'summary' => 'اكتشف كيف يمكنك تعديل الألوان، السطوع، وإضافة فلاتر فنية لمقاطعك بضغطة زر واحدة.',
                'summary_en' => 'Discover how you can adjust colors, brightness, and add artistic filters to your clips with a single click.',
                'content' => '<h2>أضف لمسة سحرية لفيديوهاتك</h2><p>لا يتوقف دورنا عند التقطيع فقط، بل نمنحك التحكم الكامل في مظهر الفيديو:</p><ul><li><strong>التحكم في الألوان:</strong> ضبط السطوع (Brightness)، التباين (Contrast)، والتشبع (Saturation).</li><li><strong>فلاتر جاهزة:</strong> أضف طابعاً كلاسيكياً (Sepia) أو أبيض وأسود بضغطة زر.</li><li><strong>معالجة فورية:</strong> شاهد التأثيرات مباشرة أثناء التعديل قبل التصدير.</li></ul>',
                'content_en' => '<h2>Add a Magical Touch to Your Videos</h2><p>Our role doesn\'t stop at cutting; we give you full control over the look of your video:</p><ul><li><strong>Color Control:</strong> Adjust Brightness, Contrast, and Saturation.</li><li><strong>Ready-made Filters:</strong> Add a classic look (Sepia) or Black & White with one click.</li><li><strong>Instant Preview:</strong> See effects live while editing before exporting.</li></ul>',
                'is_published' => true,
                'published_at' => now()->subDay(),
            ],
            [
                'title' => 'التقطيع التلقائي الذكي: وداعاً للفراغات الصامتة المزعجة',
                'title_en' => 'Smart Auto-Cut: Goodbye to Annoying Silent Gaps',
                'summary' => 'كيف تستخدم خوارزمياتنا المتقدمة لحذف لحظات الصمت والتردد من فيديوهاتك التعليمية أو محتواك لليوتيوب.',
                'summary_en' => 'How to use our advanced algorithms to remove moments of silence and hesitation from your educational videos or YouTube content.',
                'content' => '<h2>حول ساعة من التصوير إلى 10 دقائق من الإبداع</h2><p>ميزة <strong>Smart Auto-Cut</strong> تقوم بتحليل الموجات الصوتية وحذف أي جزء لا يحتوي على كلام أو حركة مهمة:</p><ol><li>ارفع الفيديو الخاص بك.</li><li>اضغط على زر <strong>التقطيع التلقائي</strong>.</li><li>راجع المقاطع المقترحة ووافق عليها بضغطة واحدة.</li></ol>',
                'content_en' => '<h2>Turn an Hour of Filming into 10 Minutes of Creativity</h2><p>The <strong>Smart Auto-Cut</strong> feature analyzes sound waves and deletes any part that doesn\'t contain speech or important movement:</p><ol><li>Upload your video.</li><li>Click the <strong>Auto-Cut</strong> button.</li><li>Review the suggested segments and approve them with one click.</li></ol>',
                'is_published' => true,
                'published_at' => now()->subDays(2),
            ],
            [
                'title' => 'التحكم الدقيق في التايم لاين: لقطات مثالية بالثانية',
                'title_en' => 'Precise Timeline Control: Perfect Shots by the Second',
                'summary' => 'دليلك لاستخدام أدوات التكبير (Zoom) والتنقل السريع في الجدول الزمني للوصول لأدق تفاصيل الفيديو.',
                'summary_en' => 'Your guide to using Zoom tools and fast navigation in the timeline to reach the finest video details.',
                'content' => '<h2>الدقة هي سر الاحتراف</h2><p>الجدول الزمني (Timeline) في VideoCutter Pro مصمم ليعطيك تحكماً فائقاً:</p><ul><li><strong>التكبير والتصغير:</strong> استخدم عجلة الماوس لرؤية أجزاء من الثانية.</li><li><strong>مقابض السحب الذكية:</strong> ضبط بداية ونهاية كل مقطع بدقة متناهية.</li><li><strong>مؤشر التشغيل المتوهج:</strong> لمعرفة مكانك بالضبط في كل لحظة.</li></ul>',
                'content_en' => '<h2>Precision is the Secret of Professionalism</h2><p>The Timeline in VideoCutter Pro is designed to give you ultimate control:</p><ul><li><strong>Zoom In and Out:</strong> Use the mouse wheel to see fractions of a second.</li><li><strong>Smart Drag Handles:</strong> Adjust the start and end of each segment with extreme precision.</li><li><strong>Glowing Playhead:</strong> To know exactly where you are at every moment.</li></ul>',
                'is_published' => true,
                'published_at' => now()->subDays(3),
            ],
            [
                'title' => 'إعدادات التصدير المتقدمة: الجودة والسرعة في مكان واحد',
                'title_en' => 'Advanced Export Settings: Quality and Speed in One Place',
                'summary' => 'تعلم كيف تختار الجودة المناسبة (1080p, 4K) والصيغة الأفضل لوسائل التواصل الاجتماعي.',
                'summary_en' => 'Learn how to choose the right quality (1080p, 4K) and the best format for social media.',
                'content' => '<h2>فيديو احترافي لكل منصة</h2><p>عند الانتهاء من التعديل، تمنحك لوحة التصدير خيارات متعددة:</p><ul><li><strong>دقة عالية:</strong> تصدير بجودة تصل إلى 4K.</li><li><strong>تحويل الصيغ:</strong> إمكانية تغيير صيغة الفيديو أثناء التصدير.</li><li><strong>الضغط الذكي:</strong> تقليل حجم الملف مع الحفاظ على وضوح الصورة.</li></ul>',
                'content_en' => '<h2>Professional Video for Every Platform</h2><p>When you finish editing, the export panel gives you multiple options:</p><ul><li><strong>High Resolution:</strong> Export in quality up to 4K.</li><li><strong>Format Conversion:</strong> Ability to change video format during export.</li><li><strong>Smart Compression:</strong> Reduce file size while maintaining image clarity.</li></ul>',
                'is_published' => true,
                'published_at' => now()->subDays(4),
            ],
            [
                'title' => 'تكامل Google Drive: انقل فيديوهاتك من السحاب إلى المونتاج فوراً',
                'title_en' => 'Google Drive Integration: Cloud to Editing Instantly',
                'summary' => 'لا حاجة لتحميل الملفات لجهازك ثم رفعها مرة أخرى، ابدأ العمل مباشرة من ملفاتك السحابية.',
                'summary_en' => 'No need to download files to your device then upload them again; start working directly from your cloud files.',
                'content' => '<h2>سرعة العمل لا تضاهى</h2><p>بفضل التكامل مع Google Drive API، يمكنك:</p><ul><li>تصفح ملفاتك السحابية داخل المنصة.</li><li>استيراد ملفات ضخمة في ثوانٍ.</li><li>توفير مساحة جهازك الشخصي.</li></ul>',
                'content_en' => '<h2>Unmatched Workflow Speed</h2><p>Thanks to integration with Google Drive API, you can:</p><ul><li>Browse your cloud files inside the platform.</li><li>Import huge files in seconds.</li><li>Save space on your personal device.</li></ul>',
                'is_published' => true,
                'published_at' => now()->subDays(5),
            ]
        ];

        foreach ($posts as $post) {
            Post::create([
                'title' => $post['title'],
                'title_en' => $post['title_en'],
                'slug' => Str::slug($post['title_en'], '-'),
                'summary' => $post['summary'],
                'summary_en' => $post['summary_en'],
                'content' => $post['content'],
                'content_en' => $post['content_en'],
                'is_published' => true,
                'published_at' => $post['published_at'],
                'view_count' => rand(100, 5000),
            ]);
        }
    }
}
