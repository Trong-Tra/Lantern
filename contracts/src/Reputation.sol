// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "./utils/ERC721.sol";
import {Ownable} from "./utils/Ownable.sol";
import {AgentRegistry} from "./AgentRegistry.sol";

/// @notice ERC-5192 minimal soulbound interface.
interface IERC5192 {
    event Locked(uint256 tokenId);

    function locked(uint256 tokenId) external view returns (bool);
}

/// @title Reputation
/// @notice Non-transferable (soulbound) ERC-5192 reputation history for agents.
///         One mint per meaningful action — successes *and* failures (docs/02).
///         Minters: the agent's owner + executors authorized by the contract owner.
contract Reputation is ERC721, Ownable, IERC5192 {
    enum ActionType {
        STAKE,
        UNSTAKE,
        HARVEST,
        SWAP
    }

    enum Result {
        SUCCESS,
        FAIL
    }

    struct Attestation {
        uint256 agentId;
        ActionType actionType;
        Result result;
        uint256 amount;
        string protocol;
        string uri;
    }

    event AttestationMinted(
        uint256 indexed agentId,
        uint256 indexed tokenId,
        ActionType actionType,
        Result result
    );

    /// @notice The canonical agent registry attestations point back to.
    AgentRegistry public immutable registry;

    /// @notice Executors (strategy contracts / operators) allowed to mint for any agent.
    mapping(address executor => bool) public executors;

    mapping(uint256 tokenId => Attestation) private _attestations;
    uint256 private _nextTokenId = 1;

    constructor(AgentRegistry registry_) ERC721("Lantern Agent Reputation", "LREP") {
        registry = registry_;
    }

    /// @notice Allow or revoke an executor. Contract owner only.
    function setExecutor(address executor, bool allowed) external onlyOwner {
        executors[executor] = allowed;
    }

    /// @notice Mint an attestation for an agent. Caller must be the agent's
    ///         owner or an authorized executor. Failures mint too.
    /// @param agentId Registered agent id from AgentRegistry.
    /// @param actionType What the agent did (STAKE/UNSTAKE/HARVEST/SWAP).
    /// @param result SUCCESS or FAIL.
    /// @param amount Amount involved in the action (unit defined by protocol).
    /// @param protocol Protocol the action ran against ("" if not applicable).
    /// @param uri Metadata URI of the attestation.
    /// @return tokenId The minted soulbound token id.
    function mintAttestation(
        uint256 agentId,
        ActionType actionType,
        Result result,
        uint256 amount,
        string calldata protocol,
        string calldata uri
    ) external returns (uint256 tokenId) {
        address agentOwner = registry.ownerOf(agentId); // reverts if unknown agent
        if (msg.sender != agentOwner && !executors[msg.sender]) {
            revert("Reputation: not minter");
        }

        tokenId = _nextTokenId++;
        _attestations[tokenId] = Attestation({
            agentId: agentId,
            actionType: actionType,
            result: result,
            amount: amount,
            protocol: protocol,
            uri: uri
        });

        // Reputation belongs to the agent's owner wallet (soulbound holder).
        _mint(agentOwner, tokenId);

        emit AttestationMinted(agentId, tokenId, actionType, result);
        emit Locked(tokenId);
    }

    /// @notice Stored attestation for a token. Reverts for unknown token.
    function getAttestation(uint256 tokenId) external view returns (Attestation memory) {
        _requireExists(tokenId);
        return _attestations[tokenId];
    }

    /// @inheritdoc IERC5192
    function locked(uint256 tokenId) external view returns (bool) {
        _requireExists(tokenId); // ERC-5192: non-existent tokens follow ERC-721 (revert)
        return true;
    }

    /// @notice Soulbound: every transfer reverts; only mint (and burn) move tokens.
    function transferFrom(address, address, uint256) public pure override {
        revert("Reputation: soulbound");
    }

    /// @inheritdoc ERC721
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireExists(tokenId);
        return _attestations[tokenId].uri;
    }

    function _requireExists(uint256 tokenId) private view {
        ownerOf(tokenId); // reverts "ERC721: invalid token id" for unknown tokens
    }
}
