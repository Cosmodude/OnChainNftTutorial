import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Address, Cell, toNano } from '@ton/core';
import { NftCollection } from '../wrappers/NftCollection';
import { buildCollectionContentCell, setItemContentCell } from '../scripts/nftContent/onChain';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';
import { flattenTransaction } from '@ton/test-utils';
import * as dotenv from 'dotenv';
dotenv.config();

describe('NftCollection', () => {
    let collectionCode: Cell;
    let item: Cell;
    let collectionContent: Cell;
    let nftItemContent: Cell;

    beforeAll(async () => {
        collectionCode = await compile('NftCollection');
        item = await compile('NftItem');
    });

    let blockchain: Blockchain;
    let nftCollection: SandboxContract<NftCollection>;
    let collectionOwner: SandboxContract<TreasuryContract>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        collectionOwner = await blockchain.treasury("ownerWallet");
        collectionContent = buildCollectionContentCell({
            name: process.env.COLLECTION_NAME!,
            description: process.env.COLLECTION_DESCRIPTION!,
            image: process.env.COLLECTION_IMAGE!
        });
        nftItemContent = setItemContentCell({
            name: "OnChain",
            description: "Holds onchain metadata",
            image: "https://raw.githubusercontent.com/Cosmodude/Nexton/main/Nexton_Logo.jpg",
        });

        nftCollection = blockchain.openContract(NftCollection.createFromConfig({
            ownerAddress: collectionOwner.address,
            nextItemIndex: 0,
            collectionContent: collectionContent,
            nftItemCode: item,
            royaltyParams:  {
                royaltyFactor: parseInt(process.env.COLLECTION_ROYALTY_PERCENT!), //Math.floor(Math.random() * 500), 
                royaltyBase: 100, //1000,
                royaltyAddress: collectionOwner.getSender().address as Address
            }
        },collectionCode));

        const deployer = await blockchain.treasury('deployer');

        const deployResult = await nftCollection.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: nftCollection.address,
            deploy: true,
            success: true,
        });
    });

    it('should get collection data after collection has been deployed', async () => {
        const collection_data = await nftCollection.getCollectionData();
        // check next_item_index
        expect(collection_data).toHaveProperty("nextItemId", BigInt(0));
        // check collection content 
        expect(collection_data.collectionContent).toEqualCell(collectionContent);
        // check owner address 
        expect(collection_data.ownerAddress.toString()).toBe(collectionOwner.address.toString());
    });

    it('should get roylty params after collection has been deployed', async () => {
        const royalty_params = await nftCollection.getRoyaltyParams();
        expect(royalty_params.royaltyFactor).toBe(BigInt(parseInt(process.env.COLLECTION_ROYALTY_PERCENT!)));
        expect(royalty_params.royaltyBase).toBe(BigInt(100));
        expect(royalty_params.royaltyAddress.toString()).toBe(collectionOwner.address.toString());
    });

    it ('should mint NFT item if requested by collection owner', async () => {
        
        const nftOwner = await blockchain.treasury('NewNFTOwner');
        const mintResult = await nftCollection.sendMintNft(collectionOwner.getSender(), {
            value: toNano("0.02"),
            queryId: Math.floor(Math.random() * 10000),
            amount: toNano("0.014"),
            itemIndex: 0,
            itemOwnerAddress: nftOwner.getSender().address!!,
            itemContent: nftItemContent
        });
        // const arr = mintResult.transactions.map(tx => flattenTransaction(tx));
        // console.log(arr);
        // check that tx to the collection address is successful
        expect(mintResult.transactions).toHaveTransaction({
            to: nftCollection.address,
            op: 1,
            value: toNano("0.02"),
            success: true
        })
        // check that getItemAddressByIndex() returns nft item address
        const nftItemAddr = await nftCollection.getItemAddressByIndex({ type: 'int', value: BigInt(0) }); 
        // check that tx to the nft item address is successful
        expect(mintResult.transactions).toHaveTransaction({
            from: nftCollection.address,
            to: nftItemAddr,
            value: toNano("0.014"),
            success: true
        })
        // check that next item index has been incremented 
        const collection_data = await nftCollection.getCollectionData();
        expect(collection_data.nextItemId).toBe(BigInt(1));
    });

    it ('should return 401 error if mint item was requested by non-owner', async () => {
        const nonOwnerWallet = await blockchain.treasury("non-owner");
        const nftOwner = await blockchain.treasury('NewNFTOwner');

        const result = await nftCollection.sendMintNft(nonOwnerWallet.getSender(), {
            value: toNano("0.02"),
            queryId: Math.floor(Math.random() * 10000),
            amount: toNano("0.014"),
            itemIndex: 0,
            itemOwnerAddress: nftOwner.getSender().address!!,
            itemContent: nftItemContent
        });
        // check that tx failed with 401 exit code
        expect(result.transactions).toHaveTransaction({
            to: nftCollection.address,
            value: toNano("0.02"),
            exitCode: 401,
            op: 1,
            success: false
        });
    })

});
