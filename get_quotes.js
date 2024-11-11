const { ChainId, Token } = require('@uniswap/sdk-core')
const { Pool, Route } = require('@uniswap/v3-sdk')
const { ethers } = require('ethers')
const { computePoolAddress } = require('@uniswap/v3-sdk')

// Providers
const mainnetProvider = new ethers.JsonRpcProvider('https://eth-mainnet.g.alchemy.com/v2/1vrOjbMXRF6L4M_AgL-7W3jCvuVXKlRt');
const arbitrumProvider = new ethers.JsonRpcProvider('https://arb-mainnet.g.alchemy.com/v2/1vrOjbMXRF6L4M_AgL-7W3jCvuVXKlRt');
const optimismProvider = new ethers.JsonRpcProvider('https://opt-mainnet.g.alchemy.com/v2/1vrOjbMXRF6L4M_AgL-7W3jCvuVXKlRt');
const polygonProvider = new ethers.JsonRpcProvider('https://polygon-mainnet.g.alchemy.com/v2/1vrOjbMXRF6L4M_AgL-7W3jCvuVXKlRt');

// Token addresses
const TOKENS = {
    MAINNET: {
        USDC: new Token(ChainId.MAINNET, '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 6),
        WETH: new Token(ChainId.MAINNET, '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', 18)
    },
    ARBITRUM: {
        USDC: new Token(ChainId.ARBITRUM_ONE, '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', 6),
        WETH: new Token(ChainId.ARBITRUM_ONE, '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', 18)
    },
    OPTIMISM: {
        USDC: new Token(ChainId.OPTIMISM, '0x7F5c764cBc14f9669B88837ca1490cCa17c31607', 6),
        WETH: new Token(ChainId.OPTIMISM, '0x4200000000000000000000000000000000000006', 18)
    },
    POLYGON: {
        USDC: new Token(ChainId.POLYGON, '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', 6),
        WETH: new Token(ChainId.POLYGON, '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', 18)
    }
};

const FACTORY_ADDRESS = '0x1F98431c8aD98523631AE4a59f267346ea31F984';
const POOL_ABI = [
    'function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)',
    'function liquidity() external view returns (uint128)'
];

async function getPrice(chainId, provider, baseToken, quoteToken) {
    try {
        const [token0, token1] = baseToken.sortsBefore(quoteToken) 
            ? [baseToken, quoteToken] 
            : [quoteToken, baseToken];

        const poolAddress = computePoolAddress({
            factoryAddress: FACTORY_ADDRESS,
            tokenA: token0,
            tokenB: token1,
            fee: 3000
        });

        const poolContract = new ethers.Contract(poolAddress, POOL_ABI, provider);
        const [slot0, liquidity] = await Promise.all([
            poolContract.slot0(),
            poolContract.liquidity()
        ]);

        const poolObject = new Pool(
            baseToken,
            quoteToken,
            3000,
            slot0.sqrtPriceX96.toString(),
            liquidity.toString(),
            Number(slot0.tick)
        );

        return new Route([poolObject], baseToken, quoteToken).midPrice.toSignificant(6);
    } catch (error) {
        throw new Error(`Error fetching price for chain ${chainId}: ${error.message}`);
    }
}

function compareChainPrices(prices) {
    const entries = Object.entries(prices);
    for (let i = 0; i < entries.length; i++) {
        for (let j = i + 1; j < entries.length; j++) {
            const [chain1, price1] = entries[i];
            const [chain2, price2] = entries[j];
            const priceDiff = ((price1 - price2) / price1) * 100;
            console.log(`${chain1} vs ${chain2} price difference: ${priceDiff.toFixed(2)}%`);
        }
    }
}

async function main() {
    try {
        const prices = {};
        const chains = [
            { name: 'Mainnet', chainId: ChainId.MAINNET, provider: mainnetProvider, tokens: TOKENS.MAINNET },
            { name: 'Arbitrum', chainId: ChainId.ARBITRUM_ONE, provider: arbitrumProvider, tokens: TOKENS.ARBITRUM },
            { name: 'Optimism', chainId: ChainId.OPTIMISM, provider: optimismProvider, tokens: TOKENS.OPTIMISM },
            { name: 'Polygon', chainId: ChainId.POLYGON, provider: polygonProvider, tokens: TOKENS.POLYGON }
        ];

        for (const chain of chains) {
            try {
                prices[chain.name] = await getPrice(chain.chainId, chain.provider, chain.tokens.WETH, chain.tokens.USDC);
                console.log(`${chain.name} price fetched successfully`);
            } catch (error) {
                console.error(`Failed to fetch ${chain.name} price:`, error.message);
            }
        }

        if (Object.keys(prices).length < 2) {
            throw new Error(`Not enough valid prices to compare. Only got ${Object.keys(prices).length} valid price(s)`);
        }

        Object.entries(prices).forEach(([chain, price]) => {
            console.log(`ETH/USDC Price on ${chain}: ${price}`);
        });

        compareChainPrices(prices);
    } catch (error) {
        console.error('Failed to fetch prices:', error);
        process.exit(1);
    }
}

main().catch(console.error);