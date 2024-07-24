import { Address, toNano } from '@ton/core';
import { NftCollection } from '../wrappers/NftCollection';
import { compile, NetworkProvider } from '@ton/blueprint';
import { buildCollectionContentCell, setItemContentCell } from './nftContent/onChain';
import * as dotenv from 'dotenv';
dotenv.config();

const randomSeed= Math.floor(Math.random() * 10000);

// Deploys collection and mints one item to the address of the 
export async function run(provider: NetworkProvider) {
    const nftCollection = provider.open(NftCollection.createFromConfig({
        ownerAddress: provider.sender().address!!, 
        nextItemIndex: 0,
        collectionContent: buildCollectionContentCell({
            name: process.env.COLLECTION_NAME!,
            description: process.env.COLLECTION_DESCRIPTION!,
            image: process.env.COLLECTION_IMAGE!
        }),
        nftItemCode: await compile("NftItem"),
        royaltyParams: {
            royaltyFactor: parseInt(process.env.COLLECTION_ROYALTY_PERCENT!), 
            royaltyBase: 100,
            royaltyAddress: provider.sender().address as Address
        }
    }, await compile('NftCollection')));

    console.log(provider.sender().address as Address)
    await nftCollection.sendDeploy(provider.sender(), toNano('0.05'));
    await provider.waitForDeploy(nftCollection.address);

    const mint = await nftCollection.sendMintNft(provider.sender(),{
        value: toNano("0.04"),
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
    console.log(`NFT Item deployed at https://testnet.tonviewer.com/${nftCollection.address}`);
}
