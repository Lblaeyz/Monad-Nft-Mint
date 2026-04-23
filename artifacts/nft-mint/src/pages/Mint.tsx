import { useEffect, useMemo, useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  useAccount,
  useReadContract,
  useReadContracts,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { formatEther, parseAbiItem } from "viem";
import { monadTestnet } from "wagmi/chains";
import { NFT_ABI, NFT_CONTRACT_ADDRESS } from "@/lib/wagmi";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import MintSuccessDialog from "@/components/MintSuccessDialog";

const ZERO = "0x0000000000000000000000000000000000000000";
const isContractConfigured = NFT_CONTRACT_ADDRESS.toLowerCase() !== ZERO;

export default function Mint() {
  const { address, isConnected, chainId } = useAccount();
  const { toast } = useToast();
  const [imgError, setImgError] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successHash, setSuccessHash] = useState<string | null>(null);

  const wrongNetwork = isConnected && chainId !== monadTestnet.id;

  const { data: contractInfo, refetch: refetchInfo } = useReadContracts({
    contracts: [
      { address: NFT_CONTRACT_ADDRESS, abi: NFT_ABI, functionName: "name" },
      { address: NFT_CONTRACT_ADDRESS, abi: NFT_ABI, functionName: "symbol" },
      { address: NFT_CONTRACT_ADDRESS, abi: NFT_ABI, functionName: "mintPrice" },
      { address: NFT_CONTRACT_ADDRESS, abi: NFT_ABI, functionName: "maxSupply" },
      { address: NFT_CONTRACT_ADDRESS, abi: NFT_ABI, functionName: "totalMinted" },
      { address: NFT_CONTRACT_ADDRESS, abi: NFT_ABI, functionName: "maxPerWallet" },
    ],
    query: { enabled: isContractConfigured },
  });

  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: NFT_CONTRACT_ADDRESS,
    abi: NFT_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: isContractConfigured && !!address },
  });

  const name = contractInfo?.[0]?.result as string | undefined;
  const symbol = contractInfo?.[1]?.result as string | undefined;
  const mintPrice = contractInfo?.[2]?.result as bigint | undefined;
  const maxSupply = contractInfo?.[3]?.result as bigint | undefined;
  const totalMinted = contractInfo?.[4]?.result as bigint | undefined;
  const maxPerWallet = contractInfo?.[5]?.result as bigint | undefined;

  const walletBalance = (balance as bigint | undefined) ?? 0n;
  const walletRemaining =
    typeof maxPerWallet === "bigint"
      ? maxPerWallet > walletBalance
        ? maxPerWallet - walletBalance
        : 0n
      : null;
  const walletLimitReached =
    typeof maxPerWallet === "bigint" && walletBalance >= maxPerWallet;

  const soldOut =
    typeof maxSupply === "bigint" &&
    typeof totalMinted === "bigint" &&
    totalMinted >= maxSupply;

  const remaining = useMemo(() => {
    if (typeof maxSupply !== "bigint" || typeof totalMinted !== "bigint")
      return null;
    return maxSupply - totalMinted;
  }, [maxSupply, totalMinted]);

  const progressPct = useMemo(() => {
    if (typeof maxSupply !== "bigint" || typeof totalMinted !== "bigint")
      return 0;
    if (maxSupply === 0n) return 0;
    return Number((totalMinted * 10000n) / maxSupply) / 100;
  }, [maxSupply, totalMinted]);

  const {
    writeContract,
    data: txHash,
    isPending: isWriting,
    reset,
    error: writeError,
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess,
    error: confirmError,
  } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (isSuccess && txHash) {
      setSuccessHash(txHash);
      setSuccessOpen(true);
      refetchInfo();
      refetchBalance();
      reset();
    }
  }, [isSuccess, txHash, refetchInfo, refetchBalance, reset]);

  useEffect(() => {
    const err = writeError || confirmError;
    if (err) {
      toast({
        title: "Mint failed",
        description: (err as Error).message.slice(0, 200),
        variant: "destructive",
      });
    }
  }, [writeError, confirmError, toast]);

  const handleMint = () => {
    if (!isContractConfigured) return;
    writeContract({
      address: NFT_CONTRACT_ADDRESS,
      abi: NFT_ABI,
      functionName: "mint",
      value: mintPrice ?? 0n,
      chainId: monadTestnet.id,
    });
  };

  const isBusy = isWriting || isConfirming;

  return (
    <>
    <div className="min-h-screen w-full bg-background text-foreground">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-md bg-primary grid place-items-center text-primary-foreground font-bold">
              M
            </div>
            <div>
              <div className="text-sm uppercase tracking-widest text-muted-foreground">
                Monad Testnet
              </div>
              <div className="text-base font-semibold leading-tight">
                {name ?? "Monad NFT"} {symbol ? `· ${symbol}` : ""}
              </div>
            </div>
          </div>
          <ConnectButton showBalance={false} chainStatus="icon" />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12 grid lg:grid-cols-2 gap-10 items-start">
        <section className="relative">
          <div className="aspect-square rounded-2xl overflow-hidden bg-card border border-card-border shadow-2xl relative">
            {!imgError ? (
              <img
                src="/nft-preview.svg"
                alt="NFT preview"
                className="w-full h-full object-cover"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary via-accent to-secondary" />
            )}
            <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-black/70 to-transparent">
              <div className="flex items-center justify-between text-white">
                <span className="text-xs uppercase tracking-widest opacity-80">
                  Genesis Drop
                </span>
                <span className="text-xs font-mono">
                  {typeof totalMinted === "bigint"
                    ? totalMinted.toString()
                    : "—"}
                  {" / "}
                  {typeof maxSupply === "bigint" ? maxSupply.toString() : "—"}
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              Mint on Monad.
            </h1>
            <p className="mt-3 text-muted-foreground text-lg">
              The fastest EVM L1. 10,000 TPS, sub-second finality. Mint your
              piece of the genesis collection — paid in MON.
            </p>
          </div>

          <div className="rounded-xl border border-card-border bg-card p-6 space-y-5">
            <div className="grid grid-cols-3 gap-4 text-center">
              <Stat
                label="Price"
                value={
                  typeof mintPrice === "bigint"
                    ? `${formatEther(mintPrice)} MON`
                    : "—"
                }
              />
              <Stat
                label="Minted"
                value={
                  typeof totalMinted === "bigint"
                    ? totalMinted.toString()
                    : "—"
                }
              />
              <Stat
                label="Remaining"
                value={remaining !== null ? remaining.toString() : "—"}
              />
            </div>

            <div className="space-y-2">
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-700"
                  style={{ width: `${Math.min(progressPct, 100)}%` }}
                />
              </div>
              <div className="text-xs text-muted-foreground flex justify-between">
                <span>{progressPct.toFixed(1)}% minted</span>
                <span>
                  {typeof balance === "bigint"
                    ? `You own ${balance.toString()}`
                    : ""}
                </span>
              </div>
            </div>

            {isConnected && typeof maxPerWallet === "bigint" && (
              <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Per-wallet limit
                </span>
                <span className="font-mono font-semibold">
                  {walletBalance.toString()} / {maxPerWallet.toString()} minted
                  <span
                    className={`ml-2 ${walletLimitReached ? "text-destructive" : "text-primary"}`}
                  >
                    ({walletRemaining?.toString() ?? "—"} left)
                  </span>
                </span>
              </div>
            )}

            {!isContractConfigured ? (
              <ConfigNotice />
            ) : !isConnected ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Connect your wallet to mint.
                </p>
                <ConnectButton.Custom>
                  {({ openConnectModal }) => (
                    <Button
                      size="lg"
                      className="w-full"
                      onClick={openConnectModal}
                    >
                      Connect Wallet
                    </Button>
                  )}
                </ConnectButton.Custom>
              </div>
            ) : wrongNetwork ? (
              <ConnectButton.Custom>
                {({ openChainModal }) => (
                  <Button
                    size="lg"
                    variant="destructive"
                    className="w-full"
                    onClick={openChainModal}
                  >
                    Switch to Monad Testnet
                  </Button>
                )}
              </ConnectButton.Custom>
            ) : soldOut ? (
              <Button size="lg" className="w-full" disabled>
                Sold Out
              </Button>
            ) : walletLimitReached ? (
              <Button size="lg" className="w-full" disabled>
                Wallet limit reached ({maxPerWallet?.toString()})
              </Button>
            ) : (
              <Button
                size="lg"
                className="w-full"
                onClick={handleMint}
                disabled={isBusy}
              >
                {isWriting
                  ? "Confirm in wallet…"
                  : isConfirming
                    ? "Minting…"
                    : `Mint for ${typeof mintPrice === "bigint" ? formatEther(mintPrice) : "?"} MON`}
              </Button>
            )}

            {txHash && (
              <a
                href={`https://testnet.monadscan.com/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
                className="block text-center text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline truncate"
              >
                View transaction: {txHash}
              </a>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3 text-xs text-muted-foreground">
            <Pill>ERC-721</Pill>
            <Pill>OpenZeppelin</Pill>
            <Pill>Monad Testnet · 10143</Pill>
          </div>

          <p className="text-xs text-muted-foreground">
            Need test MON? Visit the{" "}
            <a
              className="underline hover:text-foreground"
              href="https://testnet.monad.xyz"
              target="_blank"
              rel="noreferrer"
            >
              Monad testnet faucet
            </a>
            .
          </p>
        </section>
      </main>

      <footer className="border-t border-border mt-10">
        <div className="max-w-6xl mx-auto px-6 py-6 text-xs text-muted-foreground flex flex-col md:flex-row items-center justify-between gap-2">
          <span>Built on Monad. Smart contract: ERC-721 (OpenZeppelin).</span>
          <span className="font-mono truncate max-w-full">
            {NFT_CONTRACT_ADDRESS}
          </span>
        </div>
      </footer>
    </div>

    <MintSuccessDialog
      open={successOpen}
      txHash={successHash}
      onClose={() => setSuccessOpen(false)}
    />
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold font-mono">{value}</div>
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-full border border-border bg-muted/40 px-3 py-1.5 text-center">
      {children}
    </div>
  );
}

function ConfigNotice() {
  return (
    <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm space-y-2">
      <div className="font-semibold text-destructive">
        Contract address not configured
      </div>
      <p className="text-muted-foreground">
        Deploy <code className="font-mono">contracts/MonadNFT.sol</code> to
        Monad Testnet (chainId 10143), then set{" "}
        <code className="font-mono">VITE_NFT_CONTRACT_ADDRESS</code> in your
        environment to enable minting.
      </p>
    </div>
  );
}

// Suppress unused-import warning for parseAbiItem (kept for future extension).
void parseAbiItem;
