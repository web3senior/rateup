// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./Event.sol";
import "./Error.sol";

/// @title RateUp
/// @author Aratta Labs
/// @notice A contract where users can endorse and rate the skills, qualities, and contributions of others, building a transparent and community-driven reputation system.
/// @dev Deployed contract addresses are available in the project repository.
/// @custom:emoji ♦️
/// @custom:security-contact atenyun@gmail.com
contract RateUp is Ownable, Pausable {
    string public constant VERSION = "1.0.0";
    string failedMessage = "Failed to send Ether!";
    uint256 public fee;

    struct EndorsementStruct {
        address endorser;
        string option;
        string message;
        uint8 score; // 1-5
        uint256 timestamp;
    }

    mapping(address => EndorsementStruct[]) public endorsements;
    mapping(address => mapping(address => mapping(string => bool))) public hasEndorsed; // target => endorser => option => hasEndorsed
    string[] public endorsementOptions;

    constructor() {
        fee = 0;
    }

    function updateFee(uint256 _fee) public onlyOwner {
        fee = _fee;
        emit FeeUpdated(_fee);
    }

    function getEndorsements(address target) public view returns (EndorsementStruct[] memory) {
        return endorsements[target];
    }

    function giveEndorsement(
        address target,
        string memory option,
        string memory message,
        uint8 score
    ) public payable {
        require(target != address(0), "Invalid target address");
        require(target != _msgSender(), "Cannot endorse yourself");
        require(score > 0 && score <= 5, "Score must be between 1 and 5");

        bool optionValid = false;
        for (uint256 i = 0; i < endorsementOptions.length; i++) {
            if (keccak256(bytes(endorsementOptions[i])) == keccak256(bytes(option))) {
                optionValid = true;
                break;
            }
        }

        require(optionValid, "Invalid endorsement option");
        require(!hasEndorsed[target][_msgSender()][option], "You have already endorsed this target for this option.");

        // Chk fee
        if (fee > 0) {
            if (msg.value < fee) revert InsufficientBalance(msg.value);
            (bool success, ) = owner().call{value: msg.value}("");
            require(success, failedMessage);
        }

        EndorsementStruct memory newEndorsement = EndorsementStruct(_msgSender(), option, message, score, block.timestamp);

        endorsements[target].push(newEndorsement);
        hasEndorsed[target][_msgSender()][option] = true; // Mark as endorsed

        emit EndorsementGiven(target, _msgSender(), option, message, fee, block.timestamp);
    }

    function addEndorsementOption(string memory option) public onlyOwner {
        require(bytes(option).length > 0, "Option cannot be empty");
        for (uint256 i = 0; i < endorsementOptions.length; i++) {
            require(keccak256(bytes(endorsementOptions[i])) != keccak256(bytes(option)), "Option already exists");
        }
        endorsementOptions.push(option);
        emit EndorsementOptionAdded(option);
    }

    function updateEndorsementOption(uint256 index, string memory option) public onlyOwner {
        require(bytes(option).length > 0, "Option cannot be empty");
        for (uint256 i = 0; i < endorsementOptions.length; i++) {
            require(keccak256(bytes(endorsementOptions[i])) != keccak256(bytes(option)), "Option already exists");
        }
        endorsementOptions[index] = option;
        emit EndorsementOptionAdded(option);
    }

    function getEndorsementOptions() public view returns (string[] memory) {
        return endorsementOptions;
    }

    function withdraw() public onlyOwner {
        uint256 amount = address(this).balance;
        (bool success, ) = owner().call{value: amount}("");
        require(success, "Failed");
    }

    function transferBalance(address payable _to, uint256 _amount) public onlyOwner {
        (bool success, ) = _to.call{value: _amount}("");
        require(success, "Failed");
    }

    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }
}
