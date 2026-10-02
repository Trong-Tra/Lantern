// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Ownable
/// @notice Minimal single-owner access control (no external dependencies).
abstract contract Ownable {
    address public owner;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    constructor() {
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert("Ownable: not owner");
        _;
    }

    function transferOwnership(address newOwner) public virtual onlyOwner {
        if (newOwner == address(0)) revert("Ownable: address zero");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}
