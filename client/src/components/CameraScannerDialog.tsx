import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { NotFoundException, type Result, type Exception } from "@zxing/library";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, CameraOff, RefreshCcw } from "lucide-react";

interface CameraDetectedPayload {
  code: string;
  resume: () => Promise<void>;
}

interface CameraScannerDialogProps {
  open: boolean;
  onClose: () => void;
  onDetected: (payload: CameraDetectedPayload) => void;
}

type ScannerControls = { stop: () => void } | null;

function pickPreferredDevice(devices: MediaDeviceInfo[]): string | undefined {
  if (!devices.length) return undefined;
  const lower = devices.map((device) => ({
    device,
    label: device.label?.toLowerCase() ?? "",
  }));

  const backFacing = lower.find(({ label }) => label.includes("back") || label.includes("rear"));
  if (backFacing) {
    return backFacing.device.deviceId;
  }

  return devices[0]?.deviceId;
}

export type { CameraDetectedPayload };

export function CameraScannerDialog({ open, onClose, onDetected }: CameraScannerDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<ScannerControls>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedDeviceIdRef = useRef<string | undefined>(undefined);

  const isSupported = useMemo(() => {
    return typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
  }, []);

  const stopScanner = useCallback(() => {
    controlsRef.current?.stop?.();
    controlsRef.current = null;
    readerRef.current?.reset?.();
    readerRef.current = null;
    if (videoRef.current && videoRef.current.srcObject instanceof MediaStream) {
      videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
  }, []);

  const startScanner = useCallback(
    async (deviceId?: string, options?: { skipDeviceId?: boolean }) => {
      if (!isSupported || !videoRef.current) return;

      setIsStarting(true);
      setError(null);
      stopScanner();

      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;

      const skipDeviceId = options?.skipDeviceId ?? false;

      try {
        const availableDevices = await BrowserMultiFormatReader.listVideoInputDevices().catch(() => []);

        const preferredDevice = skipDeviceId ? undefined : deviceId ?? pickPreferredDevice(availableDevices);
        selectedDeviceIdRef.current = preferredDevice;

        const controls = await reader.decodeFromVideoDevice(
          skipDeviceId ? null : preferredDevice ?? null,
          videoRef.current,
          (result: Result | null, err: Exception | null) => {
            if (result) {
              const text = result.getText();
              if (text) {
                stopScanner();
                const resume = async () => {
                  await startScanner(selectedDeviceIdRef.current, { skipDeviceId: false });
                };
                onDetected({ code: text, resume });
              }
            }

            if (err && !(err instanceof NotFoundException)) {
              console.error("Scanner error", err);
              setError("Não foi possível ler o código. Ajuste o enquadramento e tente novamente.");
            }
          }
        );

        controlsRef.current = controls as ScannerControls;
      } catch (err: any) {
        console.error("Camera access error", err);
        if (!skipDeviceId && err?.name === "NotReadableError") {
          console.warn("Retrying camera start without explicit deviceId");
          await startScanner(undefined, { skipDeviceId: true });
          return;
        }

        if (err?.name === "NotAllowedError" || err?.message?.includes("denied")) {
          setError("Acesso à câmera negado. Conceda permissão para escanear.");
        } else if (err?.name === "NotFoundError") {
          setError("Nenhuma câmera disponível foi encontrada neste dispositivo.");
        } else if (err?.name === "NotReadableError") {
          setError("Não foi possível iniciar a câmera. Verifique se ela não está sendo usada por outro aplicativo.");
        } else {
          setError("Não foi possível iniciar a câmera. Verifique se ela está disponível.");
        }
      } finally {
        setIsStarting(false);
      }
    },
    [isSupported, onClose, onDetected, stopScanner]
  );

  useEffect(() => {
    if (!open) {
      stopScanner();
      return;
    }

    startScanner();

    return () => {
      stopScanner();
    };
  }, [open, startScanner, stopScanner]);

  const handleRetry = () => {
    startScanner(selectedDeviceIdRef.current, { skipDeviceId: false });
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => (!isOpen ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Escanear com câmera</DialogTitle>
          <DialogDescription>
            Aponte a câmera para o código de barras ou QR code. Mantenha o enquadramento firme até a leitura ser concluída.
          </DialogDescription>
        </DialogHeader>

        {!isSupported ? (
          <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
            <CameraOff className="h-12 w-12 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Este navegador não oferece acesso à câmera. Abra em um dispositivo com suporte ou use outra forma de lançamento.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative overflow-hidden rounded-xl border bg-black">
              <video
                ref={videoRef}
                className="h-full w-full object-cover"
                playsInline
                muted
                autoPlay
              />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-44 w-44 rounded-xl border-2 border-white/80 shadow-[0_0_25px_rgba(0,0,0,0.7)]" />
              </div>
              <div className="absolute left-0 right-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 text-center text-xs text-white">
                Aproximar o código até ficar nítido acelera a leitura.
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-between">
          <Button variant="outline" onClick={() => { stopScanner(); onClose(); }}>
            Fechar
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={handleRetry}
              disabled={isStarting || !isSupported}
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Tentar novamente
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CameraScannerDialog;
