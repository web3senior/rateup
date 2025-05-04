// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.29;

import "@lukso/lsp-smart-contracts/contracts/LSP7DigitalAsset/presets/LSP7Mintable.sol";
import "@lukso/lsp-smart-contracts/contracts/LSP7DigitalAsset/extensions/LSP7Burnable.sol";

/// @title LSP7
/// @author Aratta Labs(PumpRoom)
/// @notice LSP7
/// @dev You will find the deployed contract addresses on the repo
/// @custom:emoji 🤖
/// @custom:security-contact atenyun@gmail.com
contract LSP7 is LSP7Mintable, LSP7Burnable {
    uint256 public tokenSupplyCap;
    error SupplyLimitExceeded(uint256 totalSupply, uint256 tokenSupplyCap);

    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _tokenSupplyCap
    ) LSP7Mintable(_name, _symbol, msg.sender, 0, false) {
        tokenSupplyCap =_tokenSupplyCap * 10**decimals();
        mint(msg.sender, _tokenSupplyCap * 10**decimals(), true, "");
    }

    function _mint(
        address to,
        uint256 amount,
        bool force,
        bytes memory data
    ) internal virtual override {
        if (totalSupply() + amount > tokenSupplyCap) revert SupplyLimitExceeded(totalSupply(), tokenSupplyCap);
        super._mint(to, amount, force, data);
    }
}
