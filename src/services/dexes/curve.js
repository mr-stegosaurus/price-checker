const { ethers } = require('ethers');
const { getNetworkName } = require('../../utils/networks');

const CURVE_POOL_ABI = [
    {
        "stateMutability": "view",
        "type": "function",
        "name": "get_dy",
        "inputs": [
            {"name": "i", "type": "uint256"},
            {"name": "j", "type": "uint256"},
            {"name": "dx", "type": "uint256"}
        ],
        "outputs": [{"name": "", "type": "uint256"}]
    },
    {
        "stateMutability": "view",
        "type": "function",
        "name": "coins",
        "inputs": [{"name": "arg0", "type": "uint256"}],
        "outputs": [{"name": "", "type": "address"}]
    },
    {
        "stateMutability": "view",
        "type": "function",
        "name": "price_scale",
        "inputs": [{"name": "k", "type": "uint256"}],
        "outputs": [{"name": "", "type": "uint256"}]
    },
    {
        "stateMutability": "view",
        "type": "function",
        "name": "price_oracle",
        "inputs": [{"name": "k", "type": "uint256"}],
        "outputs": [{"name": "", "type": "uint256"}]
    },
    {
        "stateMutability": "view",
        "type": "function",
        "name": "last_prices",
        "inputs": [{"name": "k", "type": "uint256"}],
        "outputs": [{"name": "", "type": "uint256"}]
    }
];

const CURVE_POOLS = {
    MAINNET: {
        'ETH/USDC': {
            address: '0x7f86bf177dd4f3494b841a37e810a34dd56c829b',
            ethIndex: 2,
            usdcIndex: 0,
            usdcDecimals: 6
        }
    },
    ARBITRUM: {
        'ETH/crvUSD': {
            address: '0x82670f35306253222f8a165869b28c64739ac62e',
            ethIndex: 2,
            usdcIndex: 0,
            usdcDecimals: 18
        }
    },
    OPTIMISM: {
        'ETH/crvUSD': {
            address: '0x4456d13fc6736e8e8330394c0c622103e06ea419',
            ethIndex: 2,
            usdcIndex: 0,
            usdcDecimals: 18
        }
    }
};

async function getPrice(chainId, provider) {
    try {
        const networkName = getNetworkName(chainId);
        
        // Skip if it's Polygon or if pool info doesn't exist
        if (networkName === 'POLYGON') return null;
        
        const poolInfo = CURVE_POOLS[networkName]?.['ETH/USDC'] || CURVE_POOLS[networkName]?.['ETH/crvUSD'];
        if (!poolInfo) return null;

        const poolContract = new ethers.Contract(poolInfo.address, CURVE_POOL_ABI, provider);
        
        // Use a smaller amount for the price check
        const sellAmount = ethers.parseEther("0.1"); // 0.1 ETH
        
        // Get price for selling ETH
        const sellPrice = await poolContract.get_dy(
            poolInfo.ethIndex,
            poolInfo.usdcIndex,
            sellAmount
        );

        // Get price for buying ETH
        const buyAmount = ethers.parseUnits("300", poolInfo.usdcDecimals); // 300 USD
        const buyPrice = await poolContract.get_dy(
            poolInfo.usdcIndex,
            poolInfo.ethIndex,
            buyAmount
        );

        // Calculate sell price (ETH -> USDC)
        const sellPriceFormatted = Number(ethers.formatUnits(sellPrice, poolInfo.usdcDecimals)) * 10;
        
        // Calculate buy price (USDC -> ETH)
        const ethReceived = Number(ethers.formatUnits(buyPrice, 18));
        const buyPriceFormatted = Number(ethers.formatUnits(buyAmount, poolInfo.usdcDecimals)) / ethReceived;

        return {
            price: sellPriceFormatted,  // Reference price
            buyPrice: buyPriceFormatted,
            sellPrice: sellPriceFormatted
        };
    } catch (error) {
        console.error('Error fetching Curve price:', error);
        return {
            price: 0,
            buyPrice: 0,
            sellPrice: 0
        };
    }
}

module.exports = {
    getPrice
}; 