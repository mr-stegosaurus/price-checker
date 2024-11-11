const { Token, CurrencyAmount, TradeType, Percent } = require('@uniswap/sdk-core');
const { Pool, Route, Trade, TickMath } = require('@uniswap/v3-sdk');
const { ethers } = require('ethers');
const { getTokenAddress } = require('../../config/tokens');
const { getNetworkName } = require('../../utils/networks');

const POOL_ADDRESSES = {
    MAINNET: '0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8', // USDC/ETH 0.3%
    ARBITRUM: '0xC31E54c7a869B9FcBEcc14363CF510d1c41fa443', // USDC/ETH 0.3%
    OPTIMISM: '0x85149247691df622eaF1a8Bd0CaFd40BC45154a9', // USDC/ETH 0.3%
    POLYGON: '0x45dDa9cb7c25131DF268515131f647d726f50608'  // USDC/ETH 0.3%
};

const FEE_AMOUNTS = {
    LOWEST: 100,
    LOW: 500,
    MEDIUM: 3000,
    HIGH: 10000
};

// Define the ABI directly
const IUniswapV3PoolABI = [
    {
        "inputs": [],
        "name": "token0",
        "outputs": [{"internalType": "address", "name": "", "type": "address"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "token1",
        "outputs": [{"internalType": "address", "name": "", "type": "address"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "fee",
        "outputs": [{"internalType": "uint24", "name": "", "type": "uint24"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "liquidity",
        "outputs": [{"internalType": "uint128", "name": "", "type": "uint128"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "slot0",
        "outputs": [
            {"internalType": "uint160", "name": "sqrtPriceX96", "type": "uint160"},
            {"internalType": "int24", "name": "tick", "type": "int24"},
            {"internalType": "uint16", "name": "observationIndex", "type": "uint16"},
            {"internalType": "uint16", "name": "observationCardinality", "type": "uint16"},
            {"internalType": "uint16", "name": "observationCardinalityNext", "type": "uint16"},
            {"internalType": "uint8", "name": "feeProtocol", "type": "uint8"},
            {"internalType": "bool", "name": "unlocked", "type": "bool"}
        ],
        "stateMutability": "view",
        "type": "function"
    }
];

async function getPoolImmutables(poolContract) {
    const [token0, token1, fee] = await Promise.all([
        poolContract.token0(),
        poolContract.token1(),
        poolContract.fee()
    ]);

    // Convert fee to number and ensure it's one of the valid fee tiers
    const feeNumber = Number(fee);
    const validFee = Object.values(FEE_AMOUNTS).includes(feeNumber) ? feeNumber : FEE_AMOUNTS.MEDIUM;

    return {
        token0,
        token1,
        fee: validFee
    };
}

async function getPoolState(poolContract) {
    try {
        const [liquidity, slot] = await Promise.all([
            poolContract.liquidity(),
            poolContract.slot0()
        ]);

        // Validate tick is within bounds
        const tick = Number(slot[1]);
        if (tick < TickMath.MIN_TICK || tick > TickMath.MAX_TICK) {
            console.warn(`Invalid tick value: ${tick}. Using nearest valid tick.`);
            tick = Math.max(TickMath.MIN_TICK, Math.min(tick, TickMath.MAX_TICK));
        }

        return {
            liquidity,
            sqrtPriceX96: slot[0],
            tick,
            observationIndex: slot[2],
            observationCardinality: slot[3],
            observationCardinalityNext: slot[4],
            feeProtocol: slot[5],
            unlocked: slot[6]
        };
    } catch (error) {
        console.error('Error getting pool state:', error);
        throw error;
    }
}

async function getPrice(chainId, provider) {
    try {
        const networkName = getNetworkName(chainId);
        const poolAddress = POOL_ADDRESSES[networkName];
        
        if (!poolAddress) {
            throw new Error(`No pool address for network ${networkName}`);
        }

        const poolContract = new ethers.Contract(
            poolAddress,
            IUniswapV3PoolABI,
            provider
        );

        const [immutables, state] = await Promise.all([
            getPoolImmutables(poolContract),
            getPoolState(poolContract)
        ]);

        console.log('Debug - Pool Data:', {
            network: networkName,
            token0: immutables.token0,
            token1: immutables.token1,
            fee: immutables.fee,
            sqrtPriceX96: state.sqrtPriceX96.toString(),
            tick: state.tick,
            liquidity: state.liquidity.toString()
        });

        // Create tokens with correct ordering and decimals based on addresses
        let token0, token1;
        
        // USDC is always 6 decimals, WETH is always 18 decimals
        if (immutables.token0.toLowerCase() === getTokenAddress('USDC', networkName).toLowerCase()) {
            token0 = new Token(chainId, immutables.token0, 6, 'USDC', 'USD Coin');
            token1 = new Token(chainId, immutables.token1, 18, 'WETH', 'Wrapped Ether');
        } else {
            token0 = new Token(chainId, immutables.token0, 18, 'WETH', 'Wrapped Ether');
            token1 = new Token(chainId, immutables.token1, 6, 'USDC', 'USD Coin');
        }

        const pool = new Pool(
            token0,
            token1,
            immutables.fee,
            state.sqrtPriceX96.toString(),
            state.liquidity.toString(),
            state.tick
        );

        // Get price based on token ordering
        let price;
        if (token0.symbol === 'USDC') {
            price = parseFloat(pool.token1Price.toSignificant(6));
        } else {
            price = parseFloat(pool.token0Price.toSignificant(6));
        }

        // Invert price if needed
        if (price < 1) {
            price = 1 / price;
        }

        return {
            price,
            liquidity: state.liquidity.toString(),
            source: 'Uniswap'
        };

    } catch (error) {
        console.error(`Uniswap V3 price fetch error:`, error.message);
        return null;
    }
}

module.exports = {
    getPrice
}; 