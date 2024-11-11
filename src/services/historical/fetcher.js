const { ethers } = require('ethers');
const { Pool } = require('@uniswap/v3-sdk');
const { POOL_ABI } = require('../../config/constants');

class HistoricalDataFetcher {
    async getPriceAtBlock(provider, poolContract, baseToken, quoteToken, blockNumber) {
        try {
            const [slot0, liquidity] = await Promise.all([
                poolContract.slot0({ blockTag: blockNumber }),
                poolContract.liquidity({ blockTag: blockNumber })
            ]);

            const pool = new Pool(
                baseToken,
                quoteToken,
                3000,
                slot0.sqrtPriceX96.toString(),
                liquidity.toString(),
                Number(slot0.tick)
            );

            return {
                timestamp: (await provider.getBlock(blockNumber)).timestamp,
                price: parseFloat(pool.token0Price.toSignificant(6)),
                liquidity: liquidity.toString(),
                blockNumber
            };
        } catch (error) {
            console.error(`Error fetching price at block ${blockNumber}:`, error);
            return null;
        }
    }

    async getHistoricalPrices(provider, poolAddress, baseToken, quoteToken, blocks = 100) {
        const currentBlock = await provider.getBlockNumber();
        const poolContract = new ethers.Contract(poolAddress, POOL_ABI, provider);
        const promises = [];

        for (let i = 0; i < blocks; i++) {
            const blockNumber = currentBlock - (i * 10); // Every 10 blocks for example
            promises.push(this.getPriceAtBlock(provider, poolContract, baseToken, quoteToken, blockNumber));
        }

        const results = await Promise.all(promises);
        return results.filter(result => result !== null);
    }
}

module.exports = new HistoricalDataFetcher();
