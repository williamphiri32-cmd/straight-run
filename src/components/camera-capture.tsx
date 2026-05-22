import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, RotateCcw, Check } from "lucide-react";
import { toast } from "sonner";

export function CameraCapture({
  label,
  value,
  onCapture,
  facingMode = "environment",
}: {
  label: string;
  value: File | null;
  onCapture: (file: File | null) => void;
  facingMode?: "environment" | "user";
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [active, setActive] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!value) setPreview(null);
    else {
      const url = URL.createObjectURL(value);
      setPreview(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [value]);

  const stop = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setActive(false);
  };

  useEffect(() => () => stop(), []);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio: false,
      });
      streamRef.current = stream;
      setActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 0);
    } catch (err: any) {
      toast.error(err?.message ?? "Camera not available");
    }
  };

  const snap = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `${label.replace(/\s+/g, "-")}-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        onCapture(file);
        stop();
      },
      "image/jpeg",
      0.9
    );
  };

  return (
    <div className="space-y-2">
      {active ? (
        <div className="space-y-2">
          <video ref={videoRef} playsInline muted className="w-full rounded-md border bg-black aspect-video object-cover" />
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={snap} className="gap-1.5"><Check className="h-4 w-4" />Capture</Button>
            <Button type="button" size="sm" variant="ghost" onClick={stop}>Cancel</Button>
          </div>
        </div>
      ) : preview ? (
        <div className="space-y-2">
          <img src={preview} alt={label} className="w-full rounded-md border aspect-video object-cover" />
          <Button type="button" size="sm" variant="outline" onClick={start} className="gap-1.5">
            <RotateCcw className="h-4 w-4" />Retake
          </Button>
        </div>
      ) : (
        <Button type="button" size="sm" variant="outline" onClick={start} className="gap-1.5 w-full">
          <Camera className="h-4 w-4" />Open camera
        </Button>
      )}
    </div>
  );
}
