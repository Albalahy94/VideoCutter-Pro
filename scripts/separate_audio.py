import argparse
import json
import logging
import os
import sys

# Ensure PATH exists and includes standard system binaries and ffmpeg for pydub/audio_separator
if 'PATH' not in os.environ or not os.environ['PATH']:
    os.environ['PATH'] = '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'
else:
    if '/usr/bin' not in os.environ['PATH']:
        os.environ['PATH'] += ':/usr/bin:/usr/local/bin'

def main():
    parser = argparse.ArgumentParser(description="AI Audio Vocal/Music/Drums Separator")
    parser.add_argument("--input", required=True, help="Input audio file")
    parser.add_argument("--output_dir", required=True, help="Directory to save separated stems")
    parser.add_argument("--model", default="auto", help="Model name (default: auto -> htdemucs_ft.yaml for vocals, UVR-MDX-NET-Inst_HQ_3.onnx for instrumental)")
    parser.add_argument("--stem", default="vocals", choices=["vocals", "instrumental", "both"], help="Stem to keep")
    args = parser.parse_args()

    if not os.path.exists(args.input):
        print(json.dumps({"error": f"Input file not found: {args.input}"}))
        sys.exit(1)

    os.makedirs(args.output_dir, exist_ok=True)
    model_dir = os.environ.get("AI_MODELS_DIR", "/var/www/videocutterpro/models")
    os.makedirs(model_dir, exist_ok=True)

    # Determine optimal model: Demucs v4 for vocals to completely eliminate duff, drums, and music
    selected_model = args.model
    if selected_model == "auto" or not selected_model:
        if args.stem == "vocals":
            selected_model = "htdemucs_ft.yaml"
        else:
            selected_model = "UVR-MDX-NET-Inst_HQ_3.onnx"

    try:
        from audio_separator.separator import Separator
    except ImportError as e:
        print(json.dumps({"error": f"Failed to import audio_separator: {str(e)}"}))
        sys.exit(1)

    try:
        kwargs = {
            "log_level": logging.WARNING,
            "output_dir": args.output_dir,
            "model_file_dir": model_dir,
            "output_format": "WAV",
        }
        if selected_model == "htdemucs_ft.yaml" and args.stem == "vocals":
            kwargs["output_single_stem"] = "Vocals"

        separator = Separator(**kwargs)
        separator.load_model(model_filename=selected_model)
        output_files = separator.separate(args.input)

        vocals_file = None
        instrumental_file = None

        for f in output_files:
            full_path = os.path.join(args.output_dir, f) if not os.path.isabs(f) else f
            lower_name = os.path.basename(full_path).lower()
            if "vocals" in lower_name:
                vocals_file = full_path
            elif "instrumental" in lower_name or "instr" in lower_name:
                instrumental_file = full_path

        # Fallback if single stem was used
        if args.stem == "vocals" and not vocals_file and output_files:
            vocals_file = os.path.join(args.output_dir, output_files[0])

        result = {
            "success": True,
            "vocals": vocals_file,
            "instrumental": instrumental_file,
            "model_used": selected_model,
            "all_outputs": [os.path.join(args.output_dir, f) if not os.path.isabs(f) else f for f in output_files]
        }
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": f"Separation error: {str(e)}"}))
        sys.exit(1)

if __name__ == "__main__":
    main()
