// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title MockSGD
/// @notice Minimal SGD stand-in for the FinTechathon demo corridor: 6-decimal
///         ERC-20 whose owner (the DemoFXPool after deployment) is the only
///         minter. In-house style — no external dependencies.
contract MockSGD {
    string public constant name = "Mock Singapore Dollar";
    string public constant symbol = "mSGD";
    uint8 public constant decimals = 6;

    address public owner;
    mapping(address account => uint256) public balanceOf;
    mapping(address owner_ => mapping(address spender => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 amount);
    event Approval(address indexed owner_, address indexed spender, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert("MockSGD: not owner");
        _;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        if (msg.sender != from) {
            uint256 allowed = allowance[from][msg.sender];
            if (allowed != type(uint256).max) {
                allowance[from][msg.sender] = allowed - amount;
            }
        }
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
        return true;
    }

    /// @notice Mint new tokens. Owner (the DemoFXPool) only.
    function mint(address to, uint256 amount) external onlyOwner {
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }
}