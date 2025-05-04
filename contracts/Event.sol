// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

event EndorsementGiven(address indexed target,address indexed endorser, string indexed option, string message, uint256 fee,uint256 timestamp);
event EndorsementOptionAdded(string option);
event FeeUpdated(uint256 fee);