// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Minimal Chainlink Automation interface (avoids an external dependency).
interface AutomationCompatibleInterface {
    function checkUpkeep(bytes calldata checkData)
        external
        returns (bool upkeepNeeded, bytes memory performData);

    function performUpkeep(bytes calldata performData) external;
}

/**
 * @title DeadMansSwitch
 * @notice A registry of "silence" vaults. Each owner locks ETH plus the IPFS CID
 *         of an AES-256-GCM encrypted payload. If the owner stops sending a
 *         heartbeat for longer than their chosen interval, the vault is released:
 *         the locked ETH is transferred to the beneficiary and the CID becomes
 *         officially claimable. Chainlink Automation calls checkUpkeep /
 *         performUpkeep so releases happen without any trusted server.
 */
contract DeadMansSwitch is AutomationCompatibleInterface {
    struct Vault {
        address owner;
        address beneficiary;
        uint256 amount;
        uint64 lastPing;
        uint64 timeout; // seconds of silence before release
        string cid; // ipfs CID of the ciphertext
        bool released;
        bool cancelled;
        bool exists;
    }

    mapping(address => Vault) private _vaults;
    address[] private _owners;

    uint64 public constant MIN_TIMEOUT = 60; // 1 minute
    uint64 public constant MAX_TIMEOUT = 365 days;

    event VaultRegistered(
        address indexed owner,
        address indexed beneficiary,
        uint256 amount,
        uint64 timeout,
        string cid
    );
    event Heartbeat(address indexed owner, uint64 at);
    event Deposited(address indexed owner, uint256 amount);
    event Released(address indexed owner, address indexed beneficiary, uint256 amount);
    event Cancelled(address indexed owner, uint256 refunded);

    error VaultExists();
    error NoVault();
    error NotOwner();
    error Inactive();
    error BadTimeout();
    error BadBeneficiary();
    error NotDue();
    error TransferFailed();

    modifier onlyActiveOwner() {
        Vault storage v = _vaults[msg.sender];
        if (!v.exists) revert NoVault();
        if (v.owner != msg.sender) revert NotOwner();
        if (v.released || v.cancelled) revert Inactive();
        _;
    }

    /// @notice Create the caller's vault and lock the sent ETH.
    function register(address beneficiary, uint64 timeout, string calldata cid)
        external
        payable
    {
        Vault storage existing = _vaults[msg.sender];
        if (existing.exists && !existing.released && !existing.cancelled) revert VaultExists();
        if (beneficiary == address(0) || beneficiary == msg.sender) revert BadBeneficiary();
        if (timeout < MIN_TIMEOUT || timeout > MAX_TIMEOUT) revert BadTimeout();

        if (!existing.exists) _owners.push(msg.sender);

        _vaults[msg.sender] = Vault({
            owner: msg.sender,
            beneficiary: beneficiary,
            amount: msg.value,
            lastPing: uint64(block.timestamp),
            timeout: timeout,
            cid: cid,
            released: false,
            cancelled: false,
            exists: true
        });

        emit VaultRegistered(msg.sender, beneficiary, msg.value, timeout, cid);
    }

    /// @notice Owner liveness signal. Resets the countdown.
    function ping() external onlyActiveOwner {
        _vaults[msg.sender].lastPing = uint64(block.timestamp);
        emit Heartbeat(msg.sender, uint64(block.timestamp));
    }

    /// @notice Add more ETH to an active vault.
    function deposit() external payable onlyActiveOwner {
        _vaults[msg.sender].amount += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    /// @notice Owner disarms the switch and withdraws everything.
    function cancelAndWithdraw() external onlyActiveOwner {
        Vault storage v = _vaults[msg.sender];
        uint256 amount = v.amount;
        v.amount = 0;
        v.cancelled = true;
        emit Cancelled(msg.sender, amount);
        if (amount > 0) {
            (bool ok, ) = payable(msg.sender).call{value: amount}("");
            if (!ok) revert TransferFailed();
        }
    }

    /// @notice Release a vault whose owner has gone silent. Callable by anyone.
    function releaseFunds(address owner) public {
        Vault storage v = _vaults[owner];
        if (!v.exists) revert NoVault();
        if (v.released || v.cancelled) revert Inactive();
        if (block.timestamp < uint256(v.lastPing) + uint256(v.timeout)) revert NotDue();

        uint256 amount = v.amount;
        v.amount = 0;
        v.released = true;
        emit Released(owner, v.beneficiary, amount);
        if (amount > 0) {
            (bool ok, ) = payable(v.beneficiary).call{value: amount}("");
            if (!ok) revert TransferFailed();
        }
    }

    // ------------------------------------------------------------------
    // Chainlink Automation
    // ------------------------------------------------------------------

    function checkUpkeep(bytes calldata)
        external
        view
        override
        returns (bool upkeepNeeded, bytes memory performData)
    {
        uint256 len = _owners.length;
        for (uint256 i = 0; i < len; i++) {
            address owner = _owners[i];
            Vault storage v = _vaults[owner];
            if (
                v.exists &&
                !v.released &&
                !v.cancelled &&
                block.timestamp >= uint256(v.lastPing) + uint256(v.timeout)
            ) {
                return (true, abi.encode(owner));
            }
        }
        return (false, bytes(""));
    }

    function performUpkeep(bytes calldata performData) external override {
        address owner = abi.decode(performData, (address));
        releaseFunds(owner);
    }

    // ------------------------------------------------------------------
    // Views
    // ------------------------------------------------------------------

    function getVault(address owner)
        external
        view
        returns (
            address beneficiary,
            uint256 amount,
            uint64 lastPing,
            uint64 timeout,
            string memory cid,
            bool released,
            bool cancelled,
            bool exists
        )
    {
        Vault storage v = _vaults[owner];
        return (v.beneficiary, v.amount, v.lastPing, v.timeout, v.cid, v.released, v.cancelled, v.exists);
    }

    function ownersCount() external view returns (uint256) {
        return _owners.length;
    }

    function ownerAt(uint256 index) external view returns (address) {
        return _owners[index];
    }

    function isDue(address owner) external view returns (bool) {
        Vault storage v = _vaults[owner];
        return
            v.exists &&
            !v.released &&
            !v.cancelled &&
            block.timestamp >= uint256(v.lastPing) + uint256(v.timeout);
    }
}
