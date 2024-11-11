function getNetworkName(chainId) {
    switch (chainId) {
        case 1:
            return 'MAINNET';
        case 42161:
            return 'ARBITRUM';
        case 10:
            return 'OPTIMISM';
        case 137:
            return 'POLYGON';
        default:
            throw new Error(`Unknown chain ID: ${chainId}`);
    }
}

module.exports = {
    getNetworkName
}; 