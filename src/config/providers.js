const { ethers } = require('ethers');

const PROVIDERS = {
    MAINNET: new ethers.JsonRpcProvider('https://eth-mainnet.g.alchemy.com/v2/1vrOjbMXRF6L4M_AgL-7W3jCvuVXKlRt'),
    ARBITRUM: new ethers.JsonRpcProvider('https://arb-mainnet.g.alchemy.com/v2/1vrOjbMXRF6L4M_AgL-7W3jCvuVXKlRt'),
    OPTIMISM: new ethers.JsonRpcProvider('https://opt-mainnet.g.alchemy.com/v2/1vrOjbMXRF6L4M_AgL-7W3jCvuVXKlRt'),
    POLYGON: new ethers.JsonRpcProvider('https://polygon-mainnet.g.alchemy.com/v2/1vrOjbMXRF6L4M_AgL-7W3jCvuVXKlRt')
};

module.exports = { PROVIDERS };
