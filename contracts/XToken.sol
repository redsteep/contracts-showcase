// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20VotesUpgradeable.sol";

contract XToken is ERC20VotesUpgradeable, OwnableUpgradeable {
    uint256 public constant MAX_AMOUNT = 10 ** 9 * 10 ** 18;
    address public constant GNOSIS = 0x0000000000000000000000000000000000000005;
    uint256[50] __gap;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() external initializer {
        __ERC20_init("XY", "XToken");
        __ERC20Permit_init("XY");
        __ERC20Votes_init();

        __Ownable_init();

        transferOwnership(GNOSIS);
    }

    function mint(address _to, uint256 _amount) external onlyOwner {
        require(
            totalSupply() + _amount <= MAX_AMOUNT,
            "Can't mint more than max amount"
        );
        _mint(_to, _amount);
    }

    function burn(uint256 _amount) external onlyOwner {
        _burn(msg.sender, _amount);
    }
}
