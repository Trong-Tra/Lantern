// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {MockToken} from "../src/MockToken.sol";

contract MockTokenTest is Test {
    MockToken internal token;

    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    function setUp() public {
        token = new MockToken("Mock USD Coin", "mUSDC");
        token.mint(alice, 1_000e18);
    }

    function test_Metadata() public view {
        assertEq(token.name(), "Mock USD Coin");
        assertEq(token.symbol(), "mUSDC");
        assertEq(token.decimals(), 18);
    }

    function test_Mint() public {
        vm.expectEmit(address(token));
        emit Transfer(address(0), bob, 50e18);
        token.mint(bob, 50e18);
        assertEq(token.balanceOf(bob), 50e18);
        assertEq(token.totalSupply(), 1_050e18);
    }

    function test_RevertWhen_MintToZero() public {
        vm.expectRevert("MockToken: mint to zero");
        token.mint(address(0), 1);
    }

    function test_Transfer() public {
        vm.prank(alice);
        token.transfer(bob, 100e18);
        assertEq(token.balanceOf(alice), 900e18);
        assertEq(token.balanceOf(bob), 100e18);
    }

    function test_RevertWhen_TransferInsufficientBalance() public {
        vm.prank(bob);
        vm.expectRevert("MockToken: insufficient balance");
        token.transfer(alice, 1);
    }

    function test_TransferFrom() public {
        vm.prank(alice);
        token.approve(bob, 200e18);

        vm.prank(bob);
        token.transferFrom(alice, bob, 120e18);

        assertEq(token.balanceOf(alice), 880e18);
        assertEq(token.balanceOf(bob), 120e18);
        assertEq(token.allowance(alice, bob), 80e18);
    }

    function test_RevertWhen_TransferFromExceedsAllowance() public {
        vm.prank(alice);
        token.approve(bob, 10e18);

        vm.prank(bob);
        vm.expectRevert("MockToken: insufficient allowance");
        token.transferFrom(alice, bob, 11e18);
    }

    function test_TransferFrom_MaxAllowanceNotDecremented() public {
        vm.prank(alice);
        token.approve(bob, type(uint256).max);

        vm.prank(bob);
        token.transferFrom(alice, bob, 100e18);

        assertEq(token.allowance(alice, bob), type(uint256).max);
    }
}
