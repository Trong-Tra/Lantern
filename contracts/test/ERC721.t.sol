// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ERC721, IERC721Receiver} from "../src/utils/ERC721.sol";

/// @dev Concrete harness for the abstract base.
contract MockERC721 is ERC721 {
    constructor() ERC721("Mock Token", "MOCK") {}

    function mint(address to, uint256 tokenId) external {
        _mint(to, tokenId);
    }

    function burn(uint256 tokenId) external {
        _burn(tokenId);
    }
}

/// @dev Well-behaved receiver.
contract ReceiverMock is IERC721Receiver {
    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }
}

/// @dev Receiver that rejects the token.
contract RejectingReceiverMock is IERC721Receiver {
    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure returns (bytes4) {
        return 0xdeadbeef;
    }
}

/// @dev Contract with no onERC721Received (reverts with empty reason).
contract NonReceiverMock {
    function poke() external pure returns (uint256) {
        return 1;
    }
}

contract ERC721Test is Test {
    MockERC721 internal token;

    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);

    function setUp() public {
        token = new MockERC721();
        token.mint(alice, 1);
    }

    function test_Metadata() public view {
        assertEq(token.name(), "Mock Token");
        assertEq(token.symbol(), "MOCK");
        assertTrue(token.supportsInterface(0x80ac58cd));
        assertTrue(token.supportsInterface(0x5b5e139f));
        assertTrue(token.supportsInterface(0x01ffc9a7));
    }

    function test_Mint() public {
        vm.expectEmit(address(token));
        emit Transfer(address(0), bob, 2);
        token.mint(bob, 2);

        assertEq(token.ownerOf(2), bob);
        assertEq(token.balanceOf(bob), 1);
        assertEq(token.balanceOf(alice), 1);
    }

    function test_Mint_RevertsDuplicateTokenId() public {
        vm.expectRevert("ERC721: token already minted");
        token.mint(bob, 1);
    }

    function test_Mint_RevertsZeroAddress() public {
        vm.expectRevert("ERC721: address zero");
        token.mint(address(0), 2);
    }

    function test_OwnerOf_RevertsUnknownToken() public {
        vm.expectRevert("ERC721: invalid token id");
        token.ownerOf(999);
    }

    function test_BalanceOf_RevertsZeroAddress() public {
        vm.expectRevert("ERC721: address zero");
        token.balanceOf(address(0));
    }

    function test_Approve_AndTransferByApproved() public {
        vm.expectEmit(address(token));
        emit Approval(alice, bob, 1);

        vm.prank(alice);
        token.approve(bob, 1);
        assertEq(token.getApproved(1), bob);

        vm.prank(bob);
        token.transferFrom(alice, bob, 1);
        assertEq(token.ownerOf(1), bob);
        // Approval cleared on transfer.
        assertEq(token.getApproved(1), address(0));
    }

    function test_Approve_RevertsNotOwner() public {
        vm.prank(bob);
        vm.expectRevert("ERC721: not owner nor operator");
        token.approve(bob, 1);
    }

    function test_Approve_RevertsToCurrentOwner() public {
        vm.prank(alice);
        vm.expectRevert("ERC721: approve to owner");
        token.approve(alice, 1);
    }

    function test_SetApprovalForAll() public {
        vm.expectEmit(address(token));
        emit ApprovalForAll(alice, bob, true);

        vm.prank(alice);
        token.setApprovalForAll(bob, true);
        assertTrue(token.isApprovedForAll(alice, bob));

        vm.prank(bob);
        token.transferFrom(alice, bob, 1);
        assertEq(token.ownerOf(1), bob);
    }

    function test_SetApprovalForAll_RevertsToSelf() public {
        vm.prank(alice);
        vm.expectRevert("ERC721: approve to caller");
        token.setApprovalForAll(alice, true);
    }

    function test_TransferFrom_RevertsNotApproved() public {
        vm.prank(bob);
        vm.expectRevert("ERC721: caller is not owner nor approved");
        token.transferFrom(alice, bob, 1);
    }

    function test_TransferFrom_RevertsWrongFrom() public {
        vm.prank(alice);
        vm.expectRevert("ERC721: from is not owner");
        token.transferFrom(bob, alice, 1);
    }

    function test_TransferFrom_RevertsZeroAddress() public {
        vm.prank(alice);
        vm.expectRevert("ERC721: address zero");
        token.transferFrom(alice, address(0), 1);
    }

    function test_SafeTransferFrom_ToEOA() public {
        vm.prank(alice);
        token.safeTransferFrom(alice, bob, 1);
        assertEq(token.ownerOf(1), bob);
    }

    function test_SafeTransferFrom_ToReceiver() public {
        ReceiverMock receiver = new ReceiverMock();

        vm.prank(alice);
        token.safeTransferFrom(alice, address(receiver), 1);
        assertEq(token.ownerOf(1), address(receiver));
    }

    function test_SafeTransferFrom_RevertsNonReceiver() public {
        NonReceiverMock nonReceiver = new NonReceiverMock();

        vm.prank(alice);
        vm.expectRevert("ERC721: transfer to non ERC721Receiver");
        token.safeTransferFrom(alice, address(nonReceiver), 1);
    }

    function test_SafeTransferFrom_RevertsRejectingReceiver() public {
        RejectingReceiverMock rejector = new RejectingReceiverMock();

        vm.prank(alice);
        vm.expectRevert("ERC721: receiver rejected");
        token.safeTransferFrom(alice, address(rejector), 1);
    }

    function test_TokenURI_DefaultEmptyButRevertsUnknown() public {
        assertEq(token.tokenURI(1), "");
        vm.expectRevert("ERC721: invalid token id");
        token.tokenURI(999);
    }

    function test_Burn() public {
        vm.expectEmit(address(token));
        emit Transfer(alice, address(0), 1);

        token.burn(1);
        assertEq(token.balanceOf(alice), 0);
        vm.expectRevert("ERC721: invalid token id");
        token.ownerOf(1);
    }
}
