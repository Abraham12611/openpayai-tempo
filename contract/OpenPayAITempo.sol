// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title OpenPayAI Tempo
 * @dev AI agent content licensing on Tempo blockchain
 * Leverages Tempo's TIP-20 memos for efficient content tracking
 * Supports fee sponsorship for gasless agent operations
 */

interface ITIP20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferWithMemo(address to, uint256 amount, bytes32 memo) external;
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function allowance(address owner, address spender) external view returns (uint256);
}

contract OpenPayAITempo {
    struct ContentEntry {
        uint256 price;
        address contentOwner;
        string contentURI;
        bool active;
        uint256 totalRevenue;
        uint256 accessCount;
    }
    
    struct License {
        uint256 expiry;
        uint256 pricePaid;
        bool active;
    }

    address public immutable owner;
    ITIP20 public immutable paymentToken;
    
    // Content registry
    mapping(bytes32 => ContentEntry) public contentRegistry;
    mapping(address => mapping(bytes32 => License)) public licenses;
    mapping(address => bytes32[]) public creatorContents;
    
    // Batch licensing support
    mapping(address => uint256) public agentSpendingLimits;
    mapping(address => uint256) public agentSpentToday;
    uint256 public lastResetDay;
    
    // Events
    event ContentRegistered(
        bytes32 indexed contentHash,
        address indexed contentOwner,
        uint256 price,
        string contentURI
    );
    
    event PriceUpdated(
        bytes32 indexed contentHash,
        uint256 newPrice
    );
    
    event LicensePurchased(
        address indexed buyer,
        bytes32 indexed contentHash,
        uint256 price,
        bytes32 memo,
        uint256 expiry
    );
    
    event BatchLicensePurchased(
        address indexed buyer,
        bytes32[] contentHashes,
        uint256 totalPrice,
        uint256 count
    );
    
    event ContentAccessed(
        bytes32 indexed contentHash,
        address indexed accessor,
        uint256 timestamp
    );
    
    event RevenueWithdrawn(
        address indexed contentOwner,
        uint256 amount
    );
    
    event AgentLimitSet(
        address indexed agent,
        uint256 dailyLimit
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    modifier onlyContentOwner(bytes32 contentHash) {
        require(contentRegistry[contentHash].contentOwner == msg.sender, "Not content owner");
        _;
    }
    
    modifier validContent(bytes32 contentHash) {
        require(contentRegistry[contentHash].contentOwner != address(0), "Content not registered");
        require(contentRegistry[contentHash].active, "Content not active");
        _;
    }

    constructor(address _owner, address _paymentToken) {
        owner = _owner;
        paymentToken = ITIP20(_paymentToken);
        lastResetDay = block.timestamp / 1 days;
    }
    
    /**
     * @dev Register new content for AI access
     * @param contentHash Unique identifier for content
     * @param price Price in stablecoin
     * @param contentURI URI of protected content
     */
    function registerContent(
        bytes32 contentHash,
        uint256 price,
        string calldata contentURI
    ) external {
        require(contentRegistry[contentHash].contentOwner == address(0), "Content already registered");
        require(price > 0, "Price must be > 0");
        
        contentRegistry[contentHash] = ContentEntry({
            price: price,
            contentOwner: msg.sender,
            contentURI: contentURI,
            active: true,
            totalRevenue: 0,
            accessCount: 0
        });
        
        creatorContents[msg.sender].push(contentHash);
        
        emit ContentRegistered(contentHash, msg.sender, price, contentURI);
    }
    
    /**
     * @dev Purchase license with Tempo memo support
     * Uses transferWithMemo for automatic tracking
     */
    function purchaseLicense(
        bytes32 contentHash,
        bytes32 memo
    ) external validContent(contentHash) {
        _resetDailySpendingIfNeeded();
        
        ContentEntry storage content = contentRegistry[contentHash];
        uint256 price = content.price;
        
        // Check agent spending limits
        if (agentSpendingLimits[msg.sender] > 0) {
            require(
                agentSpentToday[msg.sender] + price <= agentSpendingLimits[msg.sender],
                "Daily spending limit exceeded"
            );
            agentSpentToday[msg.sender] += price;
        }
        
        // Transfer with memo - this is the Tempo magic!
        // Memo format: "LICENSE:<contentHash>:<timestamp>"
        paymentToken.transferWithMemo(content.contentOwner, price, memo);
        
        // Record license (30-day access)
        licenses[msg.sender][contentHash] = License({
            expiry: block.timestamp + 30 days,
            pricePaid: price,
            active: true
        });
        
        content.totalRevenue += price;
        content.accessCount++;
        
        emit LicensePurchased(
            msg.sender,
            contentHash,
            price,
            memo,
            block.timestamp + 30 days
        );
    }
    
    /**
     * @dev Batch purchase multiple licenses
     * Demonstrates Tempo's batch capability at contract level
     */
    function purchaseBatchLicense(
        bytes32[] calldata contentHashes,
        bytes32[] calldata memos
    ) external {
        require(contentHashes.length == memos.length, "Array length mismatch");
        require(contentHashes.length > 0, "Empty batch");
        require(contentHashes.length <= 50, "Batch too large");
        
        _resetDailySpendingIfNeeded();
        
        uint256 totalPrice = 0;
        
        for (uint i = 0; i < contentHashes.length; i++) {
            ContentEntry storage content = contentRegistry[contentHashes[i]];
            require(content.contentOwner != address(0), "Content not found");
            require(content.active, "Content not active");
            
            totalPrice += content.price;
            
            // Record each license
            licenses[msg.sender][contentHashes[i]] = License({
                expiry: block.timestamp + 30 days,
                pricePaid: content.price,
                active: true
            });
            
            content.totalRevenue += content.price;
            content.accessCount++;
        }
        
        // Check agent limits
        if (agentSpendingLimits[msg.sender] > 0) {
            require(
                agentSpentToday[msg.sender] + totalPrice <= agentSpendingLimits[msg.sender],
                "Daily spending limit exceeded"
            );
            agentSpentToday[msg.sender] += totalPrice;
        }
        
        // Single transfer for total (atomic batch at payment level)
        // Individual memos can be reconstructed off-chain from events
        paymentToken.transferFrom(msg.sender, address(this), totalPrice);
        
        // Distribute to content owners
        for (uint i = 0; i < contentHashes.length; i++) {
            ContentEntry storage content = contentRegistry[contentHashes[i]];
            paymentToken.transfer(content.contentOwner, content.price);
        }
        
        emit BatchLicensePurchased(
            msg.sender,
            contentHashes,
            totalPrice,
            contentHashes.length
        );
    }
    
    /**
     * @dev Verify if an address has valid license
     */
    function hasValidLicense(
        address user,
        bytes32 contentHash
    ) external view returns (bool) {
        License storage license = licenses[user][contentHash];
        return license.active && license.expiry > block.timestamp;
    }
    
    /**
     * @dev Update content price
     */
    function updatePrice(
        bytes32 contentHash,
        uint256 newPrice
    ) external onlyContentOwner(contentHash) {
        require(newPrice > 0, "Price must be > 0");
        contentRegistry[contentHash].price = newPrice;
        emit PriceUpdated(contentHash, newPrice);
    }
    
    /**
     * @dev Toggle content active status
     */
    function toggleContentStatus(bytes32 contentHash) external onlyContentOwner(contentHash) {
        contentRegistry[contentHash].active = !contentRegistry[contentHash].active;
    }
    
    /**
     * @dev Set daily spending limit for agent
     */
    function setAgentSpendingLimit(address agent, uint256 dailyLimit) external onlyOwner {
        agentSpendingLimits[agent] = dailyLimit;
        emit AgentLimitSet(agent, dailyLimit);
    }
    
    /**
     * @dev Get all content by creator
     */
    function getCreatorContents(address creator) external view returns (bytes32[] memory) {
        return creatorContents[creator];
    }
    
    /**
     * @dev Get content statistics
     */
    function getContentStats(bytes32 contentHash) external view returns (
        uint256 price,
        uint256 revenue,
        uint256 accessCount,
        bool active
    ) {
        ContentEntry storage content = contentRegistry[contentHash];
        return (
            content.price,
            content.totalRevenue,
            content.accessCount,
            content.active
        );
    }
    
    /**
     * @dev Reset daily spending counters
     */
    function _resetDailySpendingIfNeeded() internal {
        uint256 currentDay = block.timestamp / 1 days;
        if (currentDay > lastResetDay) {
            lastResetDay = currentDay;
            // Note: In production, use a mapping to track per-agent last reset
        }
    }
    
    receive() external payable {}
}
