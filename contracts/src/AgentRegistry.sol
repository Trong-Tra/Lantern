// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title AgentRegistry
/// @notice Minimal ERC-8004-style trustless agent registry (interface per docs/02).
///         Canonical source of agent identity: agentId -> owner + agentURI.
///         No stored registration time — indexers use the block timestamp of
///         {AgentRegistered}.
contract AgentRegistry {
    uint256 private _nextAgentId = 1;

    mapping(uint256 agentId => address) private _owners;
    mapping(uint256 agentId => string) private _uris;

    event AgentRegistered(uint256 indexed agentId, address indexed owner, string uri);
    event AgentUpdated(uint256 indexed agentId, string uri);

    /// @notice Register a new agent owned by the caller.
    /// @param uri Metadata URI of the agent (ERC-8004 agent URI).
    /// @return agentId The freshly allocated agent id (starts at 1).
    function registerAgent(string calldata uri) external returns (uint256 agentId) {
        agentId = _nextAgentId++;
        _owners[agentId] = msg.sender;
        _uris[agentId] = uri;
        emit AgentRegistered(agentId, msg.sender, uri);
    }

    /// @notice Owner (operator binding) of an agent. Reverts if unknown.
    function ownerOf(uint256 agentId) public view returns (address) {
        address agentOwner = _owners[agentId];
        if (agentOwner == address(0)) revert("AgentRegistry: unknown agent");
        return agentOwner;
    }

    /// @notice Metadata URI of an agent. Reverts if unknown.
    function agentURI(uint256 agentId) external view returns (string memory) {
        ownerOf(agentId); // existence check
        return _uris[agentId];
    }

    /// @notice Update the agent URI. Only the agent's owner may call.
    function setAgentUri(uint256 agentId, string calldata uri) external {
        if (msg.sender != ownerOf(agentId)) revert("AgentRegistry: not agent owner");
        _uris[agentId] = uri;
        emit AgentUpdated(agentId, uri);
    }
}
