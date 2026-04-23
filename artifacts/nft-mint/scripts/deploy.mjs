import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import solc from "solc";
import { createPublicClient, createWalletClient, http, parseEther, formatEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { defineChain } from "viem";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "../../..");

const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: ["https://testnet-rpc.monad.xyz"] } },
  blockExplorers: { default: { name: "Monad Explorer", url: "https://testnet.monadexplorer.com" } },
});

const NAME = process.env.NFT_NAME || "Monad Genesis";
const SYMBOL = process.env.NFT_SYMBOL || "MGEN";
const BASE_URI = process.env.NFT_BASE_URI || "ipfs://bafybeibhwfzx6oo5rymsxmkdxpmkfwyvbjrrwcl7cekmbzlupmp5ypkyfi/";
const MAX_SUPPLY = BigInt(process.env.NFT_MAX_SUPPLY || "10000");
const MINT_PRICE = process.env.NFT_MINT_PRICE_ETHER
  ? parseEther(process.env.NFT_MINT_PRICE_ETHER)
  : parseEther("0.01");
const MAX_PER_WALLET = BigInt(process.env.NFT_MAX_PER_WALLET || "20");

const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;
if (!PRIVATE_KEY) {
  console.error("Missing DEPLOYER_PRIVATE_KEY env var.");
  process.exit(1);
}
const pk = PRIVATE_KEY.startsWith("0x") ? PRIVATE_KEY : `0x${PRIVATE_KEY}`;

function findImports(importPath) {
  const candidates = [
    path.join(REPO_ROOT, "node_modules", importPath),
    path.join(REPO_ROOT, "artifacts/nft-mint/node_modules", importPath),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      return { contents: fs.readFileSync(p, "utf8") };
    }
  }
  return { error: `File not found: ${importPath}` };
}

console.log("Compiling MonadNFT.sol...");
const source = fs.readFileSync(path.join(REPO_ROOT, "contracts/MonadNFT.sol"), "utf8");
const input = {
  language: "Solidity",
  sources: { "MonadNFT.sol": { content: source } },
  settings: {
    optimizer: { enabled: true, runs: 200 },
    outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
  },
};
const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));

if (output.errors) {
  const fatal = output.errors.filter((e) => e.severity === "error");
  if (fatal.length) {
    for (const e of fatal) console.error(e.formattedMessage);
    process.exit(1);
  }
  for (const e of output.errors) console.warn(e.formattedMessage);
}

const artifact = output.contracts["MonadNFT.sol"]["MonadNFT"];
const abi = artifact.abi;
const bytecode = `0x${artifact.evm.bytecode.object}`;

const account = privateKeyToAccount(pk);
console.log(`Deployer: ${account.address}`);

const publicClient = createPublicClient({ chain: monadTestnet, transport: http() });
const walletClient = createWalletClient({ account, chain: monadTestnet, transport: http() });

const balance = await publicClient.getBalance({ address: account.address });
console.log(`Balance: ${formatEther(balance)} MON`);
if (balance === 0n) {
  console.error("Wallet has 0 MON. Get testnet MON at https://faucet.monad.xyz then re-run.");
  process.exit(1);
}

console.log("Constructor args:");
console.log(`  name        = ${NAME}`);
console.log(`  symbol      = ${SYMBOL}`);
console.log(`  baseURI     = ${BASE_URI}`);
console.log(`  maxSupply   = ${MAX_SUPPLY}`);
console.log(`  mintPrice   = ${formatEther(MINT_PRICE)} MON`);
console.log(`  maxPerWallet= ${MAX_PER_WALLET}`);

console.log("\nDeploying...");
const hash = await walletClient.deployContract({
  abi,
  bytecode,
  args: [NAME, SYMBOL, BASE_URI, MAX_SUPPLY, MINT_PRICE, MAX_PER_WALLET],
});
console.log(`Tx hash: ${hash}`);
console.log("Waiting for confirmation...");
const receipt = await publicClient.waitForTransactionReceipt({ hash });
if (!receipt.contractAddress) {
  console.error("Deployment failed (no contractAddress in receipt).");
  console.error(receipt);
  process.exit(1);
}
console.log(`\nDeployed at: ${receipt.contractAddress}`);
console.log(`Explorer: https://testnet.monadexplorer.com/address/${receipt.contractAddress}`);

const outFile = path.join(__dirname, "deployed.json");
fs.writeFileSync(
  outFile,
  JSON.stringify(
    { address: receipt.contractAddress, txHash: hash, deployer: account.address, chainId: 10143 },
    null,
    2,
  ),
);
console.log(`Saved ${outFile}`);
