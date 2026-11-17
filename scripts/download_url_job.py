#!/var/www/videocutterpro/venv/bin/python
"""
VideoCutter Pro - Async Video Downloader & URL Importer Worker
Downloads video/audio from 1800+ platforms (YouTube, TikTok, Facebook, Instagram, Twitter/X, etc.)
via yt-dlp, tracks progress smoothly, and prepares web-ready MP4/M4A media files.
"""

import argparse
import json
import logging
import os
import re
import sys
import time

# Ensure system paths & FFmpeg are in PATH
if 'PATH' not in os.environ or not os.environ['PATH']:
    os.environ['PATH'] = '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'
else:
    if '/usr/bin' not in os.environ['PATH']:
        os.environ['PATH'] += ':/usr/bin:/usr/local/bin'

last_update_time = 0

def sanitize_filename(name):
    # Remove unsafe characters while preserving Arabic & alphanumeric
    name = re.sub(r'[\\/*?:"<>|]', "", name)
    return name.strip()[:100]

def update_status(job_dir, status, progress, step="", error=None, output_file=None, title=None, duration=None, file_size=None, speed=None, eta=None):
    global last_update_time
    now = time.time()
    # Throttle frequent polling writes during active download unless completed/failed
    if status not in ("completed", "failed") and progress not in (5, 10, 95, 100) and (now - last_update_time < 0.8):
        return

    last_update_time = now
    status_file = os.path.join(job_dir, "status.json")
    
    # Read existing data to retain fields
    existing = {}
    if os.path.exists(status_file):
        try:
            with open(status_file, "r", encoding="utf-8") as rf:
                existing = json.load(rf)
        except Exception:
            pass

    data = {
        "status": status,
        "progress": progress,
        "step": step or existing.get("step", ""),
        "error": error,
        "output_file": output_file or existing.get("output_file"),
        "title": title or existing.get("title"),
        "duration": duration if duration is not None else existing.get("duration"),
        "file_size": file_size or existing.get("file_size"),
        "speed": speed or existing.get("speed"),
        "eta": eta or existing.get("eta"),
        "pid": os.getpid(),
        "updated_at": int(now)
    }

    temp_file = status_file + ".tmp"
    with open(temp_file, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False)
    os.replace(temp_file, status_file)

def make_progress_hook(job_dir):
    def hook(d):
        if d.get("status") == "downloading":
            total = d.get("total_bytes") or d.get("total_bytes_estimate") or 0
            downloaded = d.get("downloaded_bytes") or 0
            speed_str = d.get("_speed_str", "").strip()
            eta_str = d.get("_eta_str", "").strip()

            if total > 0:
                pct = int((downloaded / total) * 75) + 15 # 15% to 90%
                step = f"جاري تحميل الفيديو... {pct}% ({speed_str} - متبقي {eta_str})"
            else:
                pct = min(85, 20 + int(downloaded / (1024 * 1024))) # rough estimate
                step = f"جاري تحميل الفيديو... ({speed_str})"

            update_status(
                job_dir,
                status="downloading",
                progress=pct,
                step=step,
                speed=speed_str,
                eta=eta_str,
                file_size=downloaded
            )
        elif d.get("status") == "finished":
            update_status(
                job_dir,
                status="processing",
                progress=92,
                step="اكتمل التحميل، جاري دمج وتنسيق ملف الفيديو للمحرر..."
            )
    return hook

def main():
    parser = argparse.ArgumentParser(description="Async Video URL Downloader")
    parser.add_argument("--job_dir", required=True, help="Directory containing job files and status.json")
    parser.add_argument("--url", required=True, help="Target Video URL")
    parser.add_argument("--quality", default="auto", choices=["auto", "1080p", "720p", "480p", "audio"], help="Target Quality")
    args = parser.parse_args()

    job_dir = os.path.abspath(args.job_dir)
    os.makedirs(job_dir, exist_ok=True)

    update_status(job_dir, "processing", 10, step="جاري فحص رابط الفيديو والاتصال بالمنصة...")

    import yt_dlp

    quality = args.quality
    if quality == "1080p":
        format_selector = "bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=1080]+bestaudio/best[height<=1080][ext=mp4]/best[ext=mp4]/best"
    elif quality == "720p":
        format_selector = "bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=720]+bestaudio/best[height<=720][ext=mp4]/best[ext=mp4]/best"
    elif quality == "480p":
        format_selector = "bestvideo[height<=480][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=480]+bestaudio/best[height<=480][ext=mp4]/best[ext=mp4]/best"
    elif quality == "audio":
        format_selector = "bestaudio[ext=m4a]/bestaudio/best"
    else:
        # Default Auto: best mp4
        format_selector = "bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best[ext=mp4]/best"

    out_template = os.path.join(job_dir, "output.%(ext)s")

    ydl_opts = {
        "format": format_selector,
        "outtmpl": out_template,
        "merge_output_format": "mp4" if quality != "audio" else "m4a",
        "noplaylist": True,
        "quiet": True,
        "no_warnings": True,
        "progress_hooks": [make_progress_hook(job_dir)],
        "remote_components": ["ejs:github"],
        "socket_timeout": 30,
        "retries": 10,
        "fragment_retries": 10,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            update_status(job_dir, "processing", 15, step="جاري استخراج بيانات الفيديو...")
            info = ydl.extract_info(args.url, download=True)
            
            title = info.get("title", "Imported_Video")
            duration = info.get("duration", 0)
            
            # Find generated output file
            expected_ext = "m4a" if quality == "audio" else "mp4"
            final_file = os.path.join(job_dir, f"output.{expected_ext}")
            
            if not os.path.exists(final_file):
                # Search for any generated media file in job_dir
                candidates = [f for f in os.listdir(job_dir) if f.startswith("output.") and not f.endswith(".tmp") and not f.endswith(".json")]
                if candidates:
                    final_file = os.path.join(job_dir, candidates[0])
                else:
                    raise Exception("تعذر العثور على ملف الفيديو بعد انتهاء التحميل.")

            file_size = os.path.getsize(final_file)
            clean_title = sanitize_filename(title) or "imported_video"
            target_named_file = os.path.join(job_dir, f"{clean_title}.{expected_ext}")
            
            if os.path.exists(target_named_file) and target_named_file != final_file:
                os.remove(target_named_file)
            
            if target_named_file != final_file:
                os.rename(final_file, target_named_file)
                final_file = target_named_file

            update_status(
                job_dir,
                status="completed",
                progress=100,
                step="اكتمل استيراد الفيديو بنجاح! جاري إرساله للمحرر...",
                output_file=os.path.basename(final_file),
                title=title,
                duration=duration,
                file_size=file_size
            )
            print(f"Success: {final_file}")

    except Exception as e:
        err_str = str(e)
        friendly_error = "فشل تحميل الفيديو من الرابط."
        if "Private video" in err_str or "login" in err_str.lower():
            friendly_error = "الفيديو خاص أو مقيد ولا يمكن الوصول إليه."
        elif "Video unavailable" in err_str or "not found" in err_str.lower() or "404" in err_str:
            friendly_error = "الفيديو غير متوفر أو تم حذفه من المنصة."
        elif "Unsupported URL" in err_str:
            friendly_error = "رابط الفيديو غير مدعوم أو غير صحيح."
        else:
            friendly_error = f"خطأ أثناء التحميل: {err_str[:120]}"

        print(f"Error: {err_str}")
        update_status(job_dir, "failed", 0, error=friendly_error)
        sys.exit(1)

if __name__ == "__main__":
    main()
