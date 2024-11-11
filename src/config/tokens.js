const { ChainId, Token } = require('@uniswap/sdk-core');

const TOKENS = {
    WETH: {
        MAINNET: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        ARBITRUM: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
        OPTIMISM: '0x4200000000000000000000000000000000000006',
        POLYGON: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619'
    },
    USDC: {
        MAINNET: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        ARBITRUM: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
        OPTIMISM: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607',
        POLYGON: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'
    }
};

// Add helper functions to get token addresses
const getTokenAddress = (token, chain) => {
    if (!TOKENS[token] || !TOKENS[token][chain]) {
        throw new Error(`No address found for ${token} on ${chain}`);
    }
    return TOKENS[token][chain];
};

module.exports = {
    TOKENS,
    getTokenAddress
};
