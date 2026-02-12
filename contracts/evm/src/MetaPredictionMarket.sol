// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IERC20} from "forge-std/interfaces/IERC20.sol";
import {IReceiver} from "./interfaces/IReceiver.sol";

contract MetaPredictionMarket is IReceiver {
    // ──────────────────────────────────────────────
    //  Types
    // ──────────────────────────────────────────────

    enum MarketType {
        Binary,
        MultiChoice
    }

    enum MarketStatus {
        Open,
        SettlementRequested,
        Settled
    }

    struct Market {
        string question;
        MarketType marketType;
        string[] options;
        uint256 deadline;
        string resolutionSource;
        MarketStatus status;
        uint8 winningOutcome;
        uint256 totalPool;
        address creator;
    }

    // ──────────────────────────────────────────────
    //  Constants & Immutables
    // ──────────────────────────────────────────────

    uint256 public constant PROTOCOL_FEE_BPS = 200; // 2%
    uint256 public constant MAX_OPTIONS = 6;

    IERC20 public immutable USDC;
    address public immutable CHAINLINK_FORWARDER;
    address public owner;

    // ──────────────────────────────────────────────
    //  Storage
    // ──────────────────────────────────────────────

    uint256 public nextMarketId;
    mapping(uint256 => Market) public markets;
    // marketId => outcome => total staked
    mapping(uint256 => mapping(uint8 => uint256)) public outcomeStakes;
    // marketId => user => outcome => amount staked
    mapping(uint256 => mapping(address => mapping(uint8 => uint256))) public userStakes;
    // marketId => user => claimed
    mapping(uint256 => mapping(address => bool)) public claimed;
    uint256 public protocolFees;

    // ──────────────────────────────────────────────
    //  Events
    // ──────────────────────────────────────────────

    event MarketCreated(uint256 indexed marketId, string question, MarketType marketType, uint256 deadline);
    event PredictionPlaced(uint256 indexed marketId, address indexed user, uint8 outcome, uint256 amount);
    event SettlementRequested(uint256 indexed marketId);
    event MarketSettled(uint256 indexed marketId, uint8 winningOutcome);
    event WinningsClaimed(uint256 indexed marketId, address indexed user, uint256 payout);

    // ──────────────────────────────────────────────
    //  Errors
    // ──────────────────────────────────────────────

    error MarketNotOpen();
    error MarketNotSettlementRequested();
    error MarketNotSettled();
    error DeadlineNotReached();
    error DeadlinePassed();
    error InvalidOutcome();
    error InvalidDeadline();
    error ZeroAmount();
    error AlreadyClaimed();
    error NoWinnings();
    error TooManyOptions();
    error TooFewOptions();
    error UnauthorizedForwarder();
    error TransferFailed();

    // ──────────────────────────────────────────────
    //  Constructor
    // ──────────────────────────────────────────────

    constructor(address _usdc, address _chainlinkForwarder) {
        USDC = IERC20(_usdc);
        CHAINLINK_FORWARDER = _chainlinkForwarder;
        owner = msg.sender;
    }

    // ──────────────────────────────────────────────
    //  Market Creation
    // ──────────────────────────────────────────────

    function createBinaryMarket(
        string calldata question,
        uint256 deadline,
        string calldata resolutionSource
    ) external returns (uint256 marketId) {
        if (deadline <= block.timestamp) revert InvalidDeadline();

        marketId = nextMarketId++;
        Market storage m = markets[marketId];
        m.question = question;
        m.marketType = MarketType.Binary;
        m.options.push("No");
        m.options.push("Yes");
        m.deadline = deadline;
        m.resolutionSource = resolutionSource;
        m.status = MarketStatus.Open;
        m.creator = msg.sender;

        emit MarketCreated(marketId, question, MarketType.Binary, deadline);
    }

    function createMultiChoiceMarket(
        string calldata question,
        string[] calldata options,
        uint256 deadline,
        string calldata resolutionSource
    ) external returns (uint256 marketId) {
        if (deadline <= block.timestamp) revert InvalidDeadline();
        if (options.length < 2) revert TooFewOptions();
        if (options.length > MAX_OPTIONS) revert TooManyOptions();

        marketId = nextMarketId++;
        Market storage m = markets[marketId];
        m.question = question;
        m.marketType = MarketType.MultiChoice;
        for (uint256 i = 0; i < options.length; i++) {
            m.options.push(options[i]);
        }
        m.deadline = deadline;
        m.resolutionSource = resolutionSource;
        m.status = MarketStatus.Open;
        m.creator = msg.sender;

        emit MarketCreated(marketId, question, MarketType.MultiChoice, deadline);
    }

    // ──────────────────────────────────────────────
    //  Predictions
    // ──────────────────────────────────────────────

    function predict(uint256 marketId, uint8 outcome, uint256 amount) external {
        Market storage m = markets[marketId];
        if (m.status != MarketStatus.Open) revert MarketNotOpen();
        if (block.timestamp >= m.deadline) revert DeadlinePassed();
        if (outcome >= m.options.length) revert InvalidOutcome();
        if (amount == 0) revert ZeroAmount();

        bool success = USDC.transferFrom(msg.sender, address(this), amount);
        if (!success) revert TransferFailed();

        outcomeStakes[marketId][outcome] += amount;
        userStakes[marketId][msg.sender][outcome] += amount;
        m.totalPool += amount;

        emit PredictionPlaced(marketId, msg.sender, outcome, amount);
    }

    // ──────────────────────────────────────────────
    //  Settlement
    // ──────────────────────────────────────────────

    function requestSettlement(uint256 marketId) external {
        Market storage m = markets[marketId];
        if (m.status != MarketStatus.Open) revert MarketNotOpen();
        if (block.timestamp < m.deadline) revert DeadlineNotReached();

        m.status = MarketStatus.SettlementRequested;

        emit SettlementRequested(marketId);
    }

    /// @notice CRE callback — only callable by the Chainlink Forwarder
    function onReport(bytes calldata metadata, bytes calldata report) external override {
        if (msg.sender != CHAINLINK_FORWARDER) revert UnauthorizedForwarder();

        (uint256 marketId, uint8 outcome) = abi.decode(report, (uint256, uint8));

        Market storage m = markets[marketId];
        if (m.status != MarketStatus.SettlementRequested) revert MarketNotSettlementRequested();
        if (outcome >= m.options.length) revert InvalidOutcome();

        m.winningOutcome = outcome;
        m.status = MarketStatus.Settled;

        // Collect protocol fee
        uint256 fee = (m.totalPool * PROTOCOL_FEE_BPS) / 10_000;
        protocolFees += fee;

        emit MarketSettled(marketId, outcome);
    }

    // ──────────────────────────────────────────────
    //  Claims
    // ──────────────────────────────────────────────

    function claimWinnings(uint256 marketId) external {
        Market storage m = markets[marketId];
        if (m.status != MarketStatus.Settled) revert MarketNotSettled();
        if (claimed[marketId][msg.sender]) revert AlreadyClaimed();

        uint8 winning = m.winningOutcome;
        uint256 userStake = userStakes[marketId][msg.sender][winning];
        if (userStake == 0) revert NoWinnings();

        claimed[marketId][msg.sender] = true;

        uint256 fee = (m.totalPool * PROTOCOL_FEE_BPS) / 10_000;
        uint256 distributable = m.totalPool - fee;
        uint256 winningPool = outcomeStakes[marketId][winning];
        uint256 payout = (userStake * distributable) / winningPool;

        bool success = USDC.transfer(msg.sender, payout);
        if (!success) revert TransferFailed();

        emit WinningsClaimed(marketId, msg.sender, payout);
    }

    // ──────────────────────────────────────────────
    //  Views
    // ──────────────────────────────────────────────

    function getMarketOptions(uint256 marketId) external view returns (string[] memory) {
        return markets[marketId].options;
    }

    function getOutcomeStake(uint256 marketId, uint8 outcome) external view returns (uint256) {
        return outcomeStakes[marketId][outcome];
    }

    function getUserStake(uint256 marketId, address user, uint8 outcome) external view returns (uint256) {
        return userStakes[marketId][user][outcome];
    }

    // ──────────────────────────────────────────────
    //  Admin
    // ──────────────────────────────────────────────

    function withdrawFees(address to) external {
        require(msg.sender == owner, "Only owner");
        uint256 amount = protocolFees;
        protocolFees = 0;
        bool success = USDC.transfer(to, amount);
        if (!success) revert TransferFailed();
    }
}
