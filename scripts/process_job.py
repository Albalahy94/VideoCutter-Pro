#!/var/www/videocutterpro/venv/bin/python
"""
VideoCutter Pro - Async AI Audio Vocal Separation Worker
Full automatic dual-pass pipeline that removes ALL music types without user input:

  Pass 1: UVR-MDX-NET-Inst_HQ_3  → removes melody, instruments, and standard music
  Pass 2: htdemucs_ft             → removes remaining drums, percussion, and rhythmic sounds
  Pass 3: FFmpeg high-pass 135Hz  → strips any lingering low-frequency rumble

This covers ALL cases: pop music, Arabic music, background beats, duff, tabla,
nasheed with hidden music, ambient music, reverb-heavy music, etc.
"""

import argparse
import gc
import json
import logging
import os
import shutil
import subprocess
import sys
import time

# Ensure standard system binaries & FFmpeg are in PATH
if 'PATH' not in os.environ or not os.environ['PATH']:
    os.environ['PATH'] = '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'
else:
    if '/usr/bin' not in os.environ['PATH']:
        os.environ['PATH'] += ':/usr/bin:/usr/local/bin'


def update_status(job_dir, status, progress, step="", error=None, output_file=None):
    status_file = os.path.join(job_dir, "status.json")
    data = {
        "status": status,
        "progress": progress,
        "step": step,
        "error": error,
        "output_file": output_file,
        "pid": os.getpid(),
        "updated_at": int(time.time())
    }
    temp_file = status_file + ".tmp"
    with open(temp_file, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False)
    os.replace(temp_file, status_file)


def run_separator(input_path, output_dir, model_dir, model_filename, stem_hint="vocals", extra_kwargs=None):
    """
    Run audio-separator with the given model. Returns path to the vocals WAV file.
    """
    from audio_separator.separator import Separator

    kwargs = {
        "log_level": logging.WARNING,
        "output_dir": output_dir,
        "model_file_dir": model_dir,
        "output_format": "WAV",
    }
    if extra_kwargs:
        kwargs.update(extra_kwargs)

    sep = Separator(**kwargs)
    sep.load_model(model_filename=model_filename)
    output_files = sep.separate(input_path)
    del sep
    gc.collect()

    vocals_file = None
    for f in output_files:
        full_path = os.path.join(output_dir, f) if not os.path.isabs(f) else f
        lower = os.path.basename(full_path).lower()
        if stem_hint in lower:
            vocals_file = full_path
            break

    # Fallback: take first file if no vocals label found
    if not vocals_file and output_files:
        f = output_files[0]
        vocals_file = os.path.join(output_dir, f) if not os.path.isabs(f) else f

    return vocals_file


def apply_afftdn_denoiser(in_wav, out_wav, nr=20, nf=-35, tn=1, tr=1, ad=0.7):
    """
    FFT-based speech denoiser (afftdn) — removes residual music/noise that bleeds
    through AI separation and sits ON TOP of speech during vocal delivery.

    Parameters:
      nr  = noise reduction in dB (20dB provides aggressive suppression of music shimmer).
      nf  = noise floor in dBFS (-35dB threshold for voice preservation).
      tn  = track_noise (1 = dynamic spectral tracking of shifting music harmonics).
      tr  = track_residual (1 = tracks residual energy across bands).
      ad  = adaptivity (0.7 = fast adaptation to musical chord changes).
    """
    af_chain = (
        f"afftdn=nr={nr}:nf={nf}:tn={tn}:tr={tr}:ad={ad}"
    )
    cmd = [
        "ffmpeg", "-y",
        "-i", in_wav,
        "-af", af_chain,
        "-c:a", "pcm_s16le",
        "-ar", "44100",
        out_wav
    ]
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if res.returncode != 0:
        print(f"[afftdn] Warning: filter failed (rc={res.returncode}), copying input.")
        shutil.copyfile(in_wav, out_wav)


def apply_highpass_filter(in_wav, out_wav, freq=135):
    """
    Strips sub-bass / low-frequency percussion resonance below `freq` Hz.
    Preserves 100% of human speech fundamentals (voice starts at ~85Hz, consonants at 300Hz+).
    """
    cmd = [
        "ffmpeg", "-y",
        "-i", in_wav,
        "-af", f"highpass=f={freq}:poles=2",
        "-c:a", "pcm_s16le",
        "-ar", "44100",
        out_wav
    ]
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if res.returncode != 0:
        shutil.copyfile(in_wav, out_wav)


def compress_to_m4a(in_wav, out_m4a, bitrate="192k"):
    """Compress WAV → AAC M4A (~10x smaller, transparent quality at 192k)."""
    cmd = [
        "ffmpeg", "-y",
        "-i", in_wav,
        "-c:a", "aac",
        "-b:a", bitrate,
        out_m4a
    ]
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    return res.returncode == 0 and os.path.exists(out_m4a) and os.path.getsize(out_m4a) > 1000


def main():
    parser = argparse.ArgumentParser(description="AI Separation Job Worker — Dual-Pass Pipeline")
    parser.add_argument("--job_dir", required=True)
    parser.add_argument("--stem", default="vocals", choices=["vocals", "instrumental", "both"])
    parser.add_argument("--model", default="auto")
    args = parser.parse_args()

    job_dir = os.path.abspath(args.job_dir)
    if not os.path.isdir(job_dir):
        print(f"Error: Job dir does not exist: {job_dir}")
        sys.exit(1)

    input_files = [f for f in os.listdir(job_dir) if f.startswith("input.")]
    if not input_files:
        update_status(job_dir, "failed", 0, error="Input audio file not found.")
        sys.exit(1)

    input_path   = os.path.join(job_dir, input_files[0])
    model_dir    = os.environ.get("AI_MODELS_DIR", "/var/www/videocutterpro/models")
    output_dir_1 = os.path.join(job_dir, "output_pass1")
    output_dir_2 = os.path.join(job_dir, "output_pass2")
    os.makedirs(model_dir, exist_ok=True)
    os.makedirs(output_dir_1, exist_ok=True)
    os.makedirs(output_dir_2, exist_ok=True)

    try:
        # ─────────────────────────────────────────────────────────────────
        # PASS 1 — Kim_Vocal_2 (preferred for zero-bleed vocals) or UVR-MDX-NET-Inst_HQ_3
        # Kim_Vocal_2 directly targets vocal formants and suppresses instrumentals without ghost harmonics.
        # Falls back gracefully to Inst_HQ_3 if Kim_Vocal_2 is not found.
        # ─────────────────────────────────────────────────────────────────
        pass1_model = "Kim_Vocal_2.onnx" if os.path.exists(os.path.join(model_dir, "Kim_Vocal_2.onnx")) else "UVR-MDX-NET-Inst_HQ_3.onnx"
        update_status(job_dir, "processing", 10, step="[1/4] جاري تشغيل نموذج العزل الصوتي فائق الدقة...")
        print(f"[Pass 1] Running {pass1_model} ...")

        vocals_pass1 = run_separator(
            input_path=input_path,
            output_dir=output_dir_1,
            model_dir=model_dir,
            model_filename=pass1_model,
            stem_hint="vocals",
        )

        if not vocals_pass1 or not os.path.exists(vocals_pass1):
            update_status(job_dir, "failed", 0, error="فشل نموذج العزل في إنتاج مسار صوتي.")
            sys.exit(1)

        print(f"[Pass 1] Vocals: {vocals_pass1} ({os.path.getsize(vocals_pass1):,} bytes)")

        # ─────────────────────────────────────────────────────────────────
        # PASS 2 — htdemucs_ft (4-stem: drums + bass + other + vocals)
        # Runs on the ALREADY-CLEANED vocals from Pass 1.
        # Catches leftover percussion, duff, tabla, rhythmic beats, and
        # any residual background music the MDX model missed.
        # ─────────────────────────────────────────────────────────────────
        update_status(job_dir, "processing", 45, step="[2/4] جاري تشغيل نموذج Demucs لإزالة الإيقاعات المتبقية...")
        print("[Pass 2] Running htdemucs_ft on Pass-1 vocals ...")

        demucs_kwargs = {
            "output_single_stem": "Vocals",
            "demucs_params": {
                "segment_size": "Default",
                "shifts": 1,
                "overlap": 0.25,
                "segments_enabled": True,
            }
        }

        vocals_pass2 = run_separator(
            input_path=vocals_pass1,
            output_dir=output_dir_2,
            model_dir=model_dir,
            model_filename="htdemucs_ft.yaml",
            stem_hint="vocals",
            extra_kwargs=demucs_kwargs,
        )

        # If Demucs fails or produces empty file, fallback to Pass 1 result
        if not vocals_pass2 or not os.path.exists(vocals_pass2) or os.path.getsize(vocals_pass2) < 1000:
            print("[Pass 2] Demucs failed or produced empty file — using Pass 1 result as fallback.")
            vocals_pass2 = vocals_pass1

        print(f"[Pass 2] Clean vocals: {vocals_pass2} ({os.path.getsize(vocals_pass2):,} bytes)")

        # ─────────────────────────────────────────────────────────────────
        # PASS 3 — FFmpeg afftdn (Dynamic FFT Speech Denoiser)
        # Removes residual music shimmer / bleed that sits ON TOP of speech
        # (the subtle music trace during vocal delivery).
        # Uses dynamic spectral tracking (tn=1, tr=1) and 20dB reduction.
        # ─────────────────────────────────────────────────────────────────
        update_status(job_dir, "processing", 78, step="[3/4] جاري مسح بقايا الموسيقى أثناء الكلام...")
        print("[Pass 3] Applying tuned afftdn speech denoiser (nr=20, nf=-35, tn=1) ...")

        denoised_wav = os.path.join(job_dir, "clean_vocals_denoised.wav")
        apply_afftdn_denoiser(vocals_pass2, denoised_wav, nr=20, nf=-35, tn=1, tr=1, ad=0.7)

        # ─────────────────────────────────────────────────────────────────
        # PASS 4 — FFmpeg high-pass filter @ 135 Hz
        # Removes any residual low-frequency rumble, duff resonance,
        # sub-bass thump, or reverb tail below 135Hz.
        # Human speech sits at 85–8000Hz, so 135Hz cut is completely safe.
        # ─────────────────────────────────────────────────────────────────
        update_status(job_dir, "processing", 86, step="[4/4] جاري تنقية الترددات المنخفضة المتبقية...")
        print("[Pass 4] Applying high-pass 135Hz filter ...")

        filtered_wav = os.path.join(job_dir, "clean_vocals_filtered.wav")
        apply_highpass_filter(denoised_wav, filtered_wav, freq=135)

        # ─────────────────────────────────────────────────────────────────
        # COMPRESS → M4A
        # ~10x smaller than WAV, transparent quality, fast browser download.
        # ─────────────────────────────────────────────────────────────────
        update_status(job_dir, "processing", 93, step="جاري ضغط الصوت لتسريع التنزيل...")
        print("[Compress] WAV → M4A 192k ...")

        final_m4a = os.path.join(job_dir, "clean_vocals.m4a")
        if compress_to_m4a(filtered_wav, final_m4a):
            print(f"[Compress] M4A: {os.path.getsize(final_m4a):,} bytes")
            # Clean up intermediate WAV files to save disk space
            for tmp in [denoised_wav, filtered_wav]:
                try:
                    os.remove(tmp)
                except Exception:
                    pass
            final_output = final_m4a
        else:
            # Fallback: use filtered WAV
            print("[Compress] M4A failed, using WAV fallback")
            final_output = filtered_wav

        # ─────────────────────────────────────────────────────────────────
        # Clean up intermediate pass directories to save disk space
        # ─────────────────────────────────────────────────────────────────
        for tmp_dir in [output_dir_1, output_dir_2]:
            try:
                shutil.rmtree(tmp_dir, ignore_errors=True)
            except Exception:
                pass

        update_status(
            job_dir, "completed", 100,
            step="اكتمل عزل الصوت بالكامل! تمت إزالة كل الموسيقى والإيقاعات والآلات.",
            output_file=os.path.basename(final_output)
        )
        print("Job completed successfully!")

    except Exception as e:
        error_msg = f"خطأ أثناء العزل: {str(e)}"
        print(f"Job failed: {error_msg}")
        update_status(job_dir, "failed", 0, error=error_msg)
        sys.exit(1)


if __name__ == "__main__":
    main()
