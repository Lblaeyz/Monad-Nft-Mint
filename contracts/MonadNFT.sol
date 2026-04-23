// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Deploy with Foundry/Remix on Monad Testnet (chainId 10143).
// Built on top of OpenZeppelin ERC721 (heavily audited).
//
// Foundry quickstart:
//   forge init monad-nft && cd monad-nft
//   forge install OpenZeppelin/openzeppelin-contracts
//   cp ../MonadNFT.sol src/
//   forge build
//   forge create src/MonadNFT.sol:MonadNFT \
//     --rpc-url https://testnet-rpc.monad.xyz \
//     --private-key $PRIVATE_KEY \
//     --constructor-args "Monad Genesis" "MGEN" "ipfs://YOUR_BASE_URI/" 5000 10000000000000000

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MonadNFT is ERC721, Ownable {
    uint256 public nextTokenId;
    uint256 public maxSupply;
    uint256 public mintPrice;
    uint256 public maxPerWallet;
    string private _baseTokenURI;

    event Minted(address indexed to, uint256 indexed tokenId);

    constructor(
        string memory name_,
        string memory symbol_,
        string memory baseURI_,
        uint256 maxSupply_,
        uint256 mintPrice_,
        uint256 maxPerWallet_
    ) ERC721(name_, symbol_) Ownable(msg.sender) {
        _baseTokenURI = baseURI_;
        maxSupply = maxSupply_;
        mintPrice = mintPrice_;
        maxPerWallet = maxPerWallet_;
    }

    function mint() external payable {
        require(nextTokenId < maxSupply, "Sold out");
        require(msg.value >= mintPrice, "Insufficient MON");
        require(balanceOf(msg.sender) < maxPerWallet, "Wallet limit reached");
        uint256 tokenId = nextTokenId;
        nextTokenId += 1;
        _safeMint(msg.sender, tokenId);
        emit Minted(msg.sender, tokenId);
    }

    function setMaxPerWallet(uint256 newMax) external onlyOwner {
        maxPerWallet = newMax;
    }

    function totalMinted() external view returns (uint256) {
        return nextTokenId;
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    function setBaseURI(string calldata baseURI_) external onlyOwner {
        _baseTokenURI = baseURI_;
    }

    function setMintPrice(uint256 newPrice) external onlyOwner {
        mintPrice = newPrice;
    }

    function withdraw() external onlyOwner {
        (bool ok, ) = payable(owner()).call{value: address(this).balance}("");
        require(ok, "Withdraw failed");
    }
}
