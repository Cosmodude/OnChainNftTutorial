import { Address, toNano } from 'ton-core';
import { NftCollection } from '../wrappers/NftCollection';
import { compile, NetworkProvider } from '@ton-community/blueprint';
import { buildCollectionContentCell, setItemContentCell } from './nftContent/onChain';

const randomSeed= Math.floor(Math.random() * 10000);

// Deploys collection and mints one item to the address of the 
export async function run(provider: NetworkProvider) {
    const nftCollection = provider.open(NftCollection.createFromConfig({
        ownerAddress: provider.sender().address!!, 
        nextItemIndex: 0,
        collectionContent: buildCollectionContentCell({
            name: "OnChain collection",
            description: "Collection of items with onChain metadata",
            image: "https://raw.githubusercontent.com/Cosmodude/Nexton/main/Nexton_Logo.jpg"
        }),
        nftItemCode: await compile("NftItem"),
        royaltyParams: {
            royaltyFactor: Math.floor(Math.random() * 500), 
            royaltyBase: 1000,
            royaltyAddress: provider.sender().address as Address
        }
    }, await compile('NftCollection')));

    console.log(provider.sender().address as Address)
    await nftCollection.sendDeploy(provider.sender(), toNano('0.05'));
    console.log()
    await provider.waitForDeploy(nftCollection.address);

    const mint = await nftCollection.sendMintNft(provider.sender(),{
        value: toNano("0.04"),
        queryId: randomSeed,
        amount: 14000000n,
        itemIndex: 0,
        itemOwnerAddress: provider.sender().address!!,
        itemContent: setItemContentCell({
            name: "OnChain",
            description: "Holds onchain metadata",
            image: "",
        })
    })
    console.log(`NFT Item deployed at https://testnet.tonviewer.com/${nftCollection.address}`);
}
