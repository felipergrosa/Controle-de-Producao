import { useCallback, useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats, Html5QrcodeScannerState } from "html5-qrcode";

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

export type { CameraDetectedPayload };

export function CameraScannerDialog({ open, onClose, onDetected }: CameraScannerDialogProps) {
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const readerElementId = "html5-qrcode-reader-element";

  const stopScanner = useCallback(async () => {
    try {
      if (scannerRef.current) {
        if (scannerRef.current.getState() === Html5QrcodeScannerState.SCANNING || scannerRef.current.getState() === Html5QrcodeScannerState.PAUSED) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
        scannerRef.current = null;
      }
    } catch (err) {
      console.error("Failed to stop scanner", err);
    }
  }, []);

  const startScanner = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setIsSupported(false);
      return;
    }

    setIsStarting(true);
    setError(null);
    await stopScanner();

    try {
      scannerRef.current = new Html5Qrcode(readerElementId);
      await scannerRef.current.start(
        { facingMode: "environment" }, // Prioriza a câmera traseira
        {
          fps: 15, // Mais rápido
          qrbox: { width: 280, height: 280 }, // Caixa de leitura um pouco maior
          formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.ITF
          ],
        },
        (decodedText) => {
          if (decodedText) {
            stopScanner().then(() => {
              const resume = async () => {
                await startScanner();
              };
              onDetected({ code: decodedText, resume });
            });
          }
        },
        (errorMessage) => {
          // Os erros de leitura quadro a quadro são ignorados pois são comuns
        }
      );
    } catch (err: any) {
      console.error("Camera access error", err);
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
  }, [stopScanner, onDetected]);

  useEffect(() => {
    if (!open) {
      stopScanner();
      return;
    }

    // Atraso curto para dar tempo de renderizar a div antes do scanner iniciar
    const timer = setTimeout(() => {
      startScanner();
    }, 100);

    return () => {
      clearTimeout(timer);
      stopScanner();
    };
  }, [open, startScanner, stopScanner]);

  const handleRetry = () => {
    startScanner();
  };

  const handleClose = () => {
    stopScanner();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => (!isOpen ? handleClose() : undefined)}>
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
              Este navegador não oferece suporte à câmera. Abra em um dispositivo com suporte ou digite o código manualmente.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative overflow-hidden rounded-xl border bg-black min-h-[300px]">
              <div id={readerElementId} className="w-full h-full [&>video]:object-cover" />
              {isStarting && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-white z-10">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/20 border-t-white" />
                  <span className="mt-4 text-sm font-medium">Iniciando câmera...</span>
                </div>
              )}
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
          <Button variant="outline" onClick={handleClose}>
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
