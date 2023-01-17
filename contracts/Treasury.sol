// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts-upgradeable/utils/cryptography/draft-EIP712Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/ECDSAUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/utils/ERC721HolderUpgradeable.sol";

import "./interfaces/CustomNFT.sol";

/// @title Treasury
/// @title Smart contract used to transfer tokens from inner to outter wallet
contract Treasury is
    EIP712Upgradeable,
    ERC721HolderUpgradeable,
    OwnableUpgradeable
{
    event Withdraw(
        address indexed user,
        uint256 amount,
        uint256 indexed option
    );
    event WithdrawNFT(address indexed user, uint256 id, uint256 indexed option);
    event SignerSet(address signer);
    event TokenLimitSet(uint256 index, uint256 newLimit);
    event NftLimitSet(uint256 index, uint256 newLimit);
    event TokenAdd(address addr, uint256 limit);
    event NFTAdd(address addr, uint256 limit);
    event TokenDisable(uint256 index);
    event NFTDisable(uint256 index);
    event TokenWithdraw(address token, uint256 amount);

    string public constant NAME = "TREASURY";
    string public constant EIP712_VERSION = "1";

    bytes32 public constant NFT_PASS_TYPEHASH =
        keccak256(
            "WithdrawNFTSignature(uint256 nonce,uint256 id,address address_to,uint256 ttl,uint256 option)"
        );
    bytes32 public constant PASS_TYPEHASH =
        keccak256(
            "WithdrawSignature(uint256 nonce,uint256 amount,address address_to,uint256 ttl,uint256 option)"
        );

    mapping(uint256 => bool) private usedSignature;

    //who              //when             //option   //amount
    mapping(address => mapping(uint256 => mapping(uint256 => uint256)))
        public tokensTransfersPerDay;
    mapping(address => mapping(uint256 => mapping(uint256 => uint256)))
        public nftTransfersPerDay;
    uint256[] public maxNftTransfersPerDay;
    uint256[] public maxTokenTransferPerDay;

    address public signer;
    address public constant GNOSIS = 0x0000000000000000000000000000000000000007;
    IERC20Upgradeable[] public tokens;
    CustomNFT[] public nfts;
    uint256[50] __gap;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        CustomNFT _vials,
        CustomNFT _avatars,
        address _signer,
        IERC20Upgradeable _yToken,
        IERC20Upgradeable _xToken,
        IERC20Upgradeable _zToken
    ) external initializer {
        __Ownable_init();

        require(address(_vials) != address(0), "Can't set zero address");
        require(address(_avatars) != address(0), "Can't set zero address");
        require(address(_yToken) != address(0), "Can't set zero address");
        require(address(_xToken) != address(0), "Can't set zero address");
        require(address(_zToken) != address(0), "Can't set zero address");

        __EIP712_init(NAME, EIP712_VERSION);

        nfts.push(_vials);
        nfts.push(_avatars);
        maxNftTransfersPerDay.push(5);
        maxNftTransfersPerDay.push(5);

        tokens.push(_yToken);
        tokens.push(_xToken);
        tokens.push(_zToken);
        maxTokenTransferPerDay.push(100 * 10 ** 18);
        maxTokenTransferPerDay.push(500 * 10 ** 18);
        maxTokenTransferPerDay.push(1000 * 10 ** 18);

        signer = _signer;

        transferOwnership(GNOSIS);
    }

    /// @notice Used to verify erc20 withdrawal signature
    function verifySignature(
        uint256 _nonce,
        uint256 _amount,
        address _to,
        uint256 _ttl,
        uint256 _option,
        bytes memory _signature
    ) public view virtual returns (address) {
        bytes32 _digest = _hashTypedDataV4(
            keccak256(
                abi.encode(PASS_TYPEHASH, _nonce, _amount, _to, _ttl, _option)
            )
        );
        return ECDSAUpgradeable.recover(_digest, _signature);
    }

    /// @notice Used to verify NFT withdrawal signature
    function verifySignatureNFT(
        uint256 _nonce,
        uint256 _id,
        address _to,
        uint256 _ttl,
        uint256 _option,
        bytes memory _signature
    ) public view virtual returns (address) {
        bytes32 _digest = _hashTypedDataV4(
            keccak256(
                abi.encode(NFT_PASS_TYPEHASH, _nonce, _id, _to, _ttl, _option)
            )
        );
        return ECDSAUpgradeable.recover(_digest, _signature);
    }

    /// @notice Withdraw erc20 using signature
    function withdraw(
        uint256 _nonce,
        uint256 _amount,
        address _to,
        uint256 _ttl,
        uint256 _option,
        bytes memory _signature
    ) external virtual {
        require(address(tokens[_option]) != address(0), "Option disabled");
        uint256 currentDay = getCurrentDay();
        require(
            tokensTransfersPerDay[_to][currentDay][_option] + _amount <=
                maxTokenTransferPerDay[_option],
            "Amount greater than allowed"
        );
        tokensTransfersPerDay[_to][currentDay][_option] += _amount;

        require(_ttl >= block.timestamp, "Signature is no longer active");
        require(
            verifySignature(_nonce, _amount, _to, _ttl, _option, _signature) ==
                signer,
            "Bad Signature"
        );
        require(!usedSignature[_nonce], "Signature already used");

        usedSignature[_nonce] = true;
        SafeERC20Upgradeable.safeTransfer(tokens[_option], _to, _amount);

        emit Withdraw(_to, _amount, _option);
    }

    /// @notice Withdraw NFT using signature
    function withdrawNFT(
        uint256 _nonce,
        uint256 _id,
        address _to,
        uint256 _ttl,
        uint256 _option,
        bytes memory _signature
    ) external virtual {
        require(address(nfts[_option]) != address(0), "Option disabled");
        uint256 currentDay = getCurrentDay();
        require(
            nftTransfersPerDay[_to][currentDay][_option] <
                maxNftTransfersPerDay[_option],
            "Too many transfers"
        );
        nftTransfersPerDay[_to][currentDay][_option]++;

        require(_ttl >= block.timestamp, "Signature is no longer active");
        require(
            verifySignatureNFT(_nonce, _id, _to, _ttl, _option, _signature) ==
                signer,
            "Bad Signature"
        );
        require(!usedSignature[_nonce], "Signature already used");

        usedSignature[_nonce] = true;
        nfts[_option].receiveNFT(_to, _id);

        emit WithdrawNFT(_to, _id, _option);
    }

    /// @notice Function returns current day in format:
    /// 1 - monday
    /// 2 - tuesday
    /// etc..
    function getCurrentDay() public view returns (uint256) {
        return (block.timestamp / 86400) + 4;
    }

    /// @notice Set signer used to verify signatures
    function setSigner(address _signer) external onlyOwner {
        signer = _signer;

        emit SignerSet(_signer);
    }

    /// @notice Set limit for erc20 withdrawals(sum)
    function setTokenLimit(
        uint256 _index,
        uint256 _newLimit
    ) external onlyOwner {
        maxTokenTransferPerDay[_index] = _newLimit;

        emit TokenLimitSet(_index, _newLimit);
    }

    /// @notice Set limit for NFT withdrawals
    function setNftLimit(uint256 _index, uint256 _newLimit) external onlyOwner {
        maxNftTransfersPerDay[_index] = _newLimit;

        emit NftLimitSet(_index, _newLimit);
    }

    /// @notice Add support for new erc20 token
    function addToken(
        IERC20Upgradeable _addr,
        uint256 _limit
    ) external onlyOwner {
        require(address(_addr) != address(0), "Zero address not acceptable");
        tokens.push(_addr);
        maxTokenTransferPerDay.push(_limit);

        emit TokenAdd(address(_addr), _limit);
    }

    /// @notice Add support for new NFT
    function addNFT(CustomNFT _addr, uint256 _limit) external onlyOwner {
        require(address(_addr) != address(0), "Zero address not acceptable");
        nfts.push(_addr);
        maxNftTransfersPerDay.push(_limit);

        emit NFTAdd(address(_addr), _limit);
    }

    /// @notice Disable erc20 token by index
    function disableToken(uint256 _index) external onlyOwner {
        tokens[_index] = IERC20Upgradeable(address(0));

        emit TokenDisable(_index);
    }

    /// @notice Disable nft by index
    function disableNFT(uint256 _index) external onlyOwner {
        nfts[_index] = CustomNFT(address(0));

        emit NFTDisable(_index);
    }

    /// @notice Withdraw tokens for owner
    function withdrawToken(
        IERC20Upgradeable _token,
        uint256 _amount
    ) external virtual onlyOwner {
        SafeERC20Upgradeable.safeTransfer(_token, msg.sender, _amount);

        emit TokenWithdraw(address(_token), _amount);
    }
}
