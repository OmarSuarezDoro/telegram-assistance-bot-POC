"""
Transcribes audio files into text using faster-whisper.
@author noexdev
@version 1.0.0
"""
import os
import sys
from typing import Tuple

from faster_whisper import WhisperModel


if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")


def normalize_text(text: str) -> str:
    """
    Collapses redundant whitespace in transcribed text.

    @param text - Raw transcription text.
    @returns The normalized text.
    """
    return " ".join(text.strip().split())


def has_cuda() -> bool:
    """
    Checks whether CUDA devices are visible to faster-whisper dependencies.

    @returns True when at least one CUDA device is available.
    """
    try:
        import ctranslate2

        return ctranslate2.get_cuda_device_count() > 0
    except Exception:
        return False


def resolve_runtime_config() -> Tuple[str, str, str]:
    """
    Resolves model and execution settings from environment variables.

    @returns The model name, target device and compute type.
    """
    model_name = os.getenv("WHISPER_MODEL", "base")
    preferred_device = os.getenv("WHISPER_DEVICE", "cpu").lower()

    if preferred_device == "auto":
        device = "cuda" if has_cuda() else "cpu"
    elif preferred_device == "cuda" and has_cuda():
        device = "cuda"
    else:
        device = "cpu"

    compute_type = (
        os.getenv("WHISPER_CUDA_COMPUTE_TYPE", "float16")
        if device == "cuda"
        else os.getenv("WHISPER_CPU_COMPUTE_TYPE", "int8")
    )

    return model_name, device, compute_type


def transcribe(audio_path: str) -> str:
    """
    Transcribes one audio file and falls back to CPU if GPU execution fails.

    @param audio_path - Local path to the audio file.
    @returns The normalized transcription text.
    """
    model_name, device, compute_type = resolve_runtime_config()

    try:
        return transcribe_with_model(audio_path, model_name, device, compute_type)
    except Exception:
        if device != "cuda":
            raise

        return transcribe_with_model(
            audio_path,
            model_name,
            "cpu",
            os.getenv("WHISPER_CPU_COMPUTE_TYPE", "int8"),
        )


def transcribe_with_model(audio_path: str, model_name: str, device: str, compute_type: str) -> str:
    """
    Runs one transcription attempt with the provided model settings.

    @param audio_path - Local path to the audio file.
    @param model_name - Whisper model name.
    @param device - Execution device.
    @param compute_type - Compute type for the selected device.
    @returns The normalized transcription text.
    """
    model = WhisperModel(model_name, device=device, compute_type=compute_type)
    segments, _info = model.transcribe(
        audio_path,
        language="es",
        beam_size=5,
        vad_filter=True,
    )

    text = " ".join(segment.text for segment in segments)
    return normalize_text(text)


def main() -> None:
    """
    Reads the input path from argv, runs transcription and prints the result.

    @returns Nothing.
    """
    if len(sys.argv) < 2:
        print("", flush=True)
        return

    audio_path = sys.argv[1]
    print(transcribe(audio_path), flush=True)


if __name__ == "__main__":
    main()
