import { X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type Props = {
  open: boolean;
  txHash: string | null;
  onClose: () => void;
};

export default function MintSuccessDialog({ open, txHash, onClose }: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="sm:max-w-md p-0 overflow-hidden"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">Mint successful</DialogTitle>
        <DialogDescription className="sr-only">
          Your NFT has been minted on Monad Testnet.
        </DialogDescription>

        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 z-10 h-8 w-8 inline-flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="bg-gradient-to-br from-primary/30 via-accent/20 to-background">
          <img
            src="/deadpool-thumbs-up.png"
            alt="Mint successful"
            className="w-full h-auto block"
          />
        </div>

        <div className="p-5 space-y-2 border-t border-border">
          <div className="text-center">
            <div className="text-lg font-bold">Mint successful</div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground mt-1">
              Transaction hash
            </div>
          </div>
          {txHash ? (
            <a
              href={`https://testnet.monadscan.com/tx/${txHash}`}
              target="_blank"
              rel="noreferrer"
              className="block font-mono text-xs text-center break-all bg-muted/40 rounded-md px-3 py-2 hover:bg-muted/60 transition-colors"
            >
              {txHash}
            </a>
          ) : (
            <div className="text-center text-sm text-muted-foreground">—</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
