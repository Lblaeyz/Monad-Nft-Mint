import { useEffect, useState } from "react";
import { usePublicClient, useAccount } from "wagmi";
import { monadTestnet } from "wagmi/chains";
import { NFT_ABI, NFT_CONTRACT_ADDRESS } from "@/lib/wagmi";

type NftItem = {
  tokenId: bigint;
  image: string | null;
  name: string | null;
  loading: boolean;
};

const ZERO = "0x0000000000000000000000000000000000000000";

function ipfsToHttp(uri: string): string {
  if (uri.startsWith("ipfs://")) {
    return `https://ipfs.io/ipfs/${uri.slice(7)}`;
  }
  return uri;
}

export default function MyMintsGallery() {
  const { address, isConnected, chainId } = useAccount();
  const publicClient = usePublicClient({ chainId: monadTestnet.id });
  const [items, setItems] = useState<NftItem[]>([]);
  const [status, setStatus] = useState<
    "idle" | "loading" | "ready" | "error" | "empty"
  >("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const isContractConfigured =
    NFT_CONTRACT_ADDRESS.toLowerCase() !== ZERO;

  useEffect(() => {
    if (!isContractConfigured || !isConnected || !address || !publicClient) {
      setItems([]);
      setStatus("idle");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setStatus("loading");
        setErrorMsg(null);

        const logs = await publicClient.getLogs({
          address: NFT_CONTRACT_ADDRESS,
          event: {
            type: "event",
            name: "Minted",
            inputs: [
              { indexed: true, name: "to", type: "address" },
              { indexed: true, name: "tokenId", type: "uint256" },
            ],
          },
          args: { to: address },
          fromBlock: 0n,
          toBlock: "latest",
        });

        const tokenIds = Array.from(
          new Set(logs.map((l) => (l.args as any).tokenId as bigint)),
        ).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

        if (cancelled) return;

        if (tokenIds.length === 0) {
          setItems([]);
          setStatus("empty");
          return;
        }

        const initial: NftItem[] = tokenIds.map((tokenId) => ({
          tokenId,
          image: null,
          name: null,
          loading: true,
        }));
        setItems(initial);
        setStatus("ready");

        await Promise.all(
          tokenIds.map(async (tokenId, idx) => {
            try {
              const owner = (await publicClient.readContract({
                address: NFT_CONTRACT_ADDRESS,
                abi: NFT_ABI,
                functionName: "ownerOf",
                args: [tokenId],
              })) as `0x${string}`;
              if (owner.toLowerCase() !== address.toLowerCase()) {
                if (!cancelled) {
                  setItems((prev) =>
                    prev.filter((p) => p.tokenId !== tokenId),
                  );
                }
                return;
              }

              let image: string | null = null;
              let name: string | null = null;
              try {
                const uri = (await publicClient.readContract({
                  address: NFT_CONTRACT_ADDRESS,
                  abi: NFT_ABI,
                  functionName: "tokenURI",
                  args: [tokenId],
                })) as string;
                const httpUri = ipfsToHttp(uri);
                if (httpUri.startsWith("data:application/json")) {
                  const json = JSON.parse(
                    atob(httpUri.split(",")[1] ?? ""),
                  );
                  image = json.image ? ipfsToHttp(json.image) : null;
                  name = json.name ?? null;
                } else if (httpUri.startsWith("http")) {
                  const res = await fetch(httpUri);
                  if (res.ok) {
                    const json = await res.json();
                    image = json.image ? ipfsToHttp(json.image) : null;
                    name = json.name ?? null;
                  }
                }
              } catch {
                // metadata may not exist yet — fall back to placeholder
              }

              if (cancelled) return;
              setItems((prev) =>
                prev.map((p, i) =>
                  i === idx
                    ? { ...p, image, name, loading: false }
                    : p,
                ),
              );
            } catch {
              if (cancelled) return;
              setItems((prev) =>
                prev.map((p, i) =>
                  i === idx ? { ...p, loading: false } : p,
                ),
              );
            }
          }),
        );
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        setErrorMsg((err as Error).message.slice(0, 200));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [address, isConnected, publicClient, isContractConfigured, chainId]);

  if (!isContractConfigured) return null;
  if (!isConnected) return null;

  return (
    <section className="max-w-6xl mx-auto px-6 pb-16">
      <div className="flex items-end justify-between mb-5">
        <h2 className="text-2xl font-bold tracking-tight">My Mints</h2>
        <span className="text-xs uppercase tracking-widest text-muted-foreground">
          {status === "ready" ? `${items.length} owned` : ""}
        </span>
      </div>

      {status === "loading" && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="aspect-square rounded-xl bg-card border border-card-border animate-pulse"
            />
          ))}
        </div>
      )}

      {status === "empty" && (
        <div className="rounded-xl border border-dashed border-border bg-card/40 p-10 text-center text-muted-foreground">
          You haven't minted any NFTs from this collection yet.
        </div>
      )}

      {status === "error" && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-5 text-sm text-destructive">
          Couldn't load your mints: {errorMsg}
        </div>
      )}

      {status === "ready" && items.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((item) => (
            <div
              key={item.tokenId.toString()}
              className="rounded-xl overflow-hidden border border-card-border bg-card hover:border-primary/60 transition-colors"
            >
              <div className="aspect-square bg-gradient-to-br from-primary/30 via-accent/20 to-secondary/30 relative">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.name ?? `Token #${item.tokenId}`}
                    className="w-full h-full object-cover"
                  />
                ) : item.loading ? (
                  <div className="w-full h-full animate-pulse" />
                ) : (
                  <img
                    src="/nft-preview.svg"
                    alt={`Token #${item.tokenId}`}
                    className="w-full h-full object-cover opacity-70"
                  />
                )}
              </div>
              <div className="p-3 flex items-center justify-between">
                <span className="text-sm font-semibold truncate">
                  {item.name ?? "Monad Genesis"}
                </span>
                <span className="text-xs font-mono text-muted-foreground">
                  #{item.tokenId.toString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
