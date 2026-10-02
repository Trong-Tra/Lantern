// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "./utils/ERC721.sol";
import {AgentRegistry} from "./AgentRegistry.sol";

/// @title AgentPassport
/// @notice Transferable ERC-721 visual passport, 1:1 with an AgentRegistry id.
///         Minted only by the registered agent's owner (docs/02).
contract AgentPassport is ERC721 {
    /// @notice The canonical agent registry this passport links to.
    AgentRegistry public immutable registry;

    uint256 private _nextTokenId = 1;

    mapping(uint256 agentId => uint256) private _tokenOfAgent;
    mapping(uint256 tokenId => uint256) private _agentOfToken;
    mapping(uint256 tokenId => string) private _tokenUris;

    constructor(AgentRegistry registry_) ERC721("Lantern Agent Passport", "LAP") {
        registry = registry_;
    }

    /// @notice Mint the passport for an agent. Caller must own the agent.
    /// @param agentId Registered agent id from AgentRegistry.
    /// @param uri Per-token metadata URI.
    /// @return tokenId The minted passport token id.
    function mint(uint256 agentId, string calldata uri) external returns (uint256 tokenId) {
        if (msg.sender != registry.ownerOf(agentId)) revert("AgentPassport: not agent owner");
        if (_tokenOfAgent[agentId] != 0) revert("AgentPassport: agent already has passport");

        tokenId = _nextTokenId++;
        _tokenOfAgent[agentId] = tokenId;
        _agentOfToken[tokenId] = agentId;
        _tokenUris[tokenId] = uri;
        _mint(msg.sender, tokenId);
    }

    /// @notice Update the metadata URI. Only the passport holder may call.
    function setTokenUri(uint256 tokenId, string calldata uri) external {
        if (msg.sender != ownerOf(tokenId)) revert("AgentPassport: not token owner");
        _tokenUris[tokenId] = uri;
    }

    /// @notice Agent id linked to a passport token. Reverts for unknown token.
    function agentOf(uint256 tokenId) external view returns (uint256) {
        uint256 agentId = _agentOfToken[tokenId];
        if (agentId == 0) revert("AgentPassport: invalid token id");
        return agentId;
    }

    /// @notice Passport token id for an agent. Reverts if not minted yet.
    function passportOf(uint256 agentId) external view returns (uint256) {
        uint256 tokenId = _tokenOfAgent[agentId];
        if (tokenId == 0) revert("AgentPassport: agent has no passport");
        return tokenId;
    }

    /// @inheritdoc ERC721
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        ownerOf(tokenId); // existence check
        return _tokenUris[tokenId];
    }
}
