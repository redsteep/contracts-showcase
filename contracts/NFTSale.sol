// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "./interfaces/CustomNFT.sol";

/// @title NFTSale
/// @title Smart contract used to sell and gift NFT with signatures
contract NFTSale is EIP712, Ownable {
    event PriceSet(uint256 price);
    event UserWithdraw(uint256 amount);
    event RedemptionPause(address owner);
    event PurchasePause(address owner);
    event RedeemSupplySet(uint256 newRedeemSupply);
    event PurchaseSupplySet(uint256 newPurchaseSupply);
    event SignerSet(address newSigner);

    string public constant NAME = "NFTSale";
    string public constant EIP712_VERSION = "1";

    bytes32 public constant PASS_TYPEHASH =
        keccak256(
            "RedeemSignature(uint256 id,address address_to,uint256 ttl_timestamp)"
        );
    bytes32 public constant PASS_TYPEHASH2 =
        keccak256(
            "PurchaseSignature(uint256 id,address address_to,uint256 ttl_timestamp)"
        );

    address public signer;
    address public constant GNOSIS = 0x0000000000000000000000000000000000000003;
    CustomNFT public immutable nftContract;

    mapping(address => bool) public usedRedeemSignature;
    mapping(address => bool) public usedPurchaseSignature;

    uint256 public redeemed;
    uint256 public purchased;

    bool public redeemPaused;
    bool public purchasePaused;

    uint256 public pricePerToken;
    uint256 public redeemSupply;
    uint256 public purchaseSupply;

    constructor(
        CustomNFT _nftContract,
        address _signer,
        uint256 _pricePerToken,
        uint256 _redeemSupply,
        uint256 _purchaseSupply
    ) EIP712(NAME, EIP712_VERSION) {
        require(address(_nftContract) != address(0), "Can't set zero address");
        nftContract = _nftContract;
        signer = _signer;

        pricePerToken = _pricePerToken;
        redeemSupply = _redeemSupply;
        purchaseSupply = _purchaseSupply;

        transferOwnership(GNOSIS);
    }

    /// @notice Set redeem supply, only for owner
    function setRedeemSupply(uint256 _newRedeemSupply) external onlyOwner {
        redeemSupply = _newRedeemSupply;

        emit RedeemSupplySet(_newRedeemSupply);
    }

    /// @notice Set purchase supply, only for owner
    function setPurchaseSupply(uint256 _newPurchaseSupply) external onlyOwner {
        purchaseSupply = _newPurchaseSupply;

        emit PurchaseSupplySet(_newPurchaseSupply);
    }

    /// @notice verify signature for redeem
    function verifySignatureRedeem(
        uint256 _id,
        address _to,
        uint256 _ttl,
        bytes memory _signature
    ) public view returns (address) {
        bytes32 _digest = _hashTypedDataV4(
            keccak256(abi.encode(PASS_TYPEHASH, _id, _to, _ttl))
        );
        return ECDSA.recover(_digest, _signature);
    }

    /// @notice verify signature for purchase
    function verifySignaturePurchase(
        uint256 _id,
        address _to,
        uint256 _ttl,
        bytes memory _signature
    ) public view returns (address) {
        bytes32 _digest = _hashTypedDataV4(
            keccak256(abi.encode(PASS_TYPEHASH2, _id, _to, _ttl))
        );
        return ECDSA.recover(_digest, _signature);
    }

    /// @notice Redeem token with signature
    function redeem(
        uint256 _tokenId,
        uint256 ttlTimestamp,
        bytes memory _signature
    ) external {
        require(!redeemPaused, "Redeeming paused");
        require(redeemed < redeemSupply, "Out of stock");
        require(!usedRedeemSignature[msg.sender], "Can buy only once");
        require(
            verifySignatureRedeem(
                _tokenId,
                msg.sender,
                ttlTimestamp,
                _signature
            ) == signer,
            "Bad signature"
        );
        require(ttlTimestamp >= block.timestamp, "TTL already finished");

        usedRedeemSignature[msg.sender] = true;

        redeemed++;
        nftContract.receiveNFT(msg.sender, _tokenId);
    }

    /// @notice Purchase token with signature
    function purchase(
        uint256 _tokenId,
        uint256 ttlTimestamp,
        bytes memory _signature
    ) external payable {
        require(!purchasePaused, "Purchase paused");
        require(purchased < purchaseSupply, "Out of stock");
        require(!usedPurchaseSignature[msg.sender], "Can buy only once");
        require(msg.value == pricePerToken, "Price not correct");
        require(
            verifySignaturePurchase(
                _tokenId,
                msg.sender,
                ttlTimestamp,
                _signature
            ) == signer,
            "Bad signature"
        );
        require(ttlTimestamp >= block.timestamp, "TTL already finished");

        usedPurchaseSignature[msg.sender] = true;

        purchased++;
        nftContract.receiveNFT(msg.sender, _tokenId);
    }

    /// @notice Set price for nft, only for owner
    function setPrice(uint256 _price) external onlyOwner {
        pricePerToken = _price;

        emit PriceSet(_price);
    }

    /// @notice Withdraw tokens, only for owner
    function withdraw() external onlyOwner {
        uint256 amount = address(this).balance;
        payable(msg.sender).transfer(amount);

        emit UserWithdraw(amount);
    }

    /// @notice Pause/Unpause redeems
    function pauseRedeem() external onlyOwner {
        redeemPaused = !redeemPaused;

        emit RedemptionPause(msg.sender);
    }

    /// @notice Pause/Unpause purchases
    function pausePurchase() external onlyOwner {
        purchasePaused = !purchasePaused;

        emit PurchasePause(msg.sender);
    }

    /// @notice Set signer used to verify signatures
    function setSigner(address _newSigner) external onlyOwner {
        require(_newSigner != address(0), "Can't set zero address");

        signer = _newSigner;

        emit SignerSet(_newSigner);
    }
}
