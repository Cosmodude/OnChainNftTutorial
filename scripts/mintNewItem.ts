import { Address, toNano } from '@ton/core';
import { NftCollection } from '../wrappers/NftCollection';
import { NetworkProvider } from '@ton/blueprint';
import { setItemContentCell } from './nftContent/onChain';

const randomSeed= Math.floor(Math.random() * 10000);

export async function run(provider: NetworkProvider, args: string[]) {
    const ui = provider.ui();

    const address = Address.parse(args.length > 0 ? args[0] : await ui.input('Collection address'));

    const nftCollection = provider.open(NftCollection.createFromAddress(address));

    const mint = await nftCollection.sendMintNft(provider.sender(),{
        value: toNano("0.02"),
        queryId: randomSeed,
        amount: toNano("0.014"),
        itemIndex: 0,
        itemOwnerAddress: provider.sender().address!!,
        itemContent: setItemContentCell({
            name: "OnChain",
            description: "Holds onchain metadata",
            image: "https://raw.githubusercontent.com/Cosmodude/Nexton/main/Nexton_Logo.jpg",
        })
    })

    ui.write(`NFT Item deployed at https://testnet.tonscan.org/address/${nftCollection.address}`);

}
    