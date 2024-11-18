import { expect, use } from 'chai'
import {
    bsv,
    PubKey,
    toByteString,
    HashedMap,
    Sig,
    SigHash,
    SignatureResponse,
    MethodCallOptions,
    pubKey2Addr,
    Utils,
    hash160,
} from 'scrypt-ts'
import { Cat721Escrow } from '../src/contracts/Cat721Escrow'
import { getDefaultSigner, randomPrivateKey } from './utils/txHelper'
import chaiAsPromised from 'chai-as-promised'
import * as dotenv from 'dotenv'

use(chaiAsPromised)
dotenv.config()

// Define the structure for seller information
type SellerInfo = {
    price: bigint
    index: bigint
}

describe('Test SmartContract `Cat721Escrow`', () => {
    const network: bsv.Networks.Network = bsv.Networks.testnet

    let escrow: Cat721Escrow,
        seller: PubKey,
        buyer: PubKey,
        tokenId: bigint,
        price: bigint,
        sellerInfo: SellerInfo

    let sellerPrivateKey: bsv.PrivateKey, buyerPrivateKey: bsv.PrivateKey
    let cat721Utxo: bsv.Transaction.Output
    let defaultSigner: any

    before(async () => {
        // Get private keys from .env file (if they exist)
        sellerPrivateKey = bsv.PrivateKey.fromWIF(
            process.env.PRIVATE_KEY_1 || ''
        )
        buyerPrivateKey = bsv.PrivateKey.fromWIF(
            process.env.PRIVATE_KEY_2 || ''
        )

        // If private keys are not found in .env, generate them
        if (!sellerPrivateKey) {
            sellerPrivateKey = bsv.PrivateKey.fromRandom(network)
            console.log(
                `Generated new private key for player 1: ${sellerPrivateKey.toWIF()}`
            )
        }
        if (!buyerPrivateKey) {
            buyerPrivateKey = bsv.PrivateKey.fromRandom(network)
            console.log(
                `Generated new private key for player 2: ${buyerPrivateKey.toWIF()}`
            )
        }

        defaultSigner = getDefaultSigner(sellerPrivateKey)

        seller = PubKey(sellerPrivateKey.publicKey.toByteString())
        buyer = PubKey(buyerPrivateKey.publicKey.toByteString())
        tokenId = 1n
        price = 1000n

        console.log(`Seller pub key: ${seller}`)
        console.log(`Buyer pub key: ${buyer}`)

        // Directly create the output that represents the Cat721 token
        const cat721Script = bsv.Script.buildPublicKeyHashOut(
            bsv.Address.fromPublicKey(sellerPrivateKey.publicKey)
        )
        cat721Utxo = new bsv.Transaction.Output({
            satoshis: 10000,
            script: cat721Script,
        })

        // Get the address from the script
        const cat721Contract = cat721Script.toAddress().toByteString()

        // Initialize sellers HashedMap with initial values
        const sellers = new HashedMap<PubKey, SellerInfo>()
        //sellers.set(seller, { price: 1000n, index: 0n }); // Add an initial seller with price and index

        // Initialize escrow contract
        await Cat721Escrow.loadArtifact()
        escrow = new Cat721Escrow(
            cat721Contract,
            sellers,
            buyer,
            price,
            tokenId
        )
        await escrow.connect(defaultSigner)
    })

    it('should pass all methods', async () => {
        await escrow.deploy(1)

        // --- list ---
        let nextEscrow = escrow.next()

        console.log(`Adding seller: ${seller}, adding price: ${price} `)
        // **Update the `sellers` HashedMap in `nextEscrow`**
        let nextIndex = BigInt(nextEscrow.sellers.size) // Use nextEscrow.sellers.size
        const sellerInfo: SellerInfo = { price, index: nextIndex }
        nextEscrow.sellers.set(seller, sellerInfo) // Set the sellerInfo in nextEscrow

        // --- Create a dummy Cat721 asset UTXO ---
        const cat721Script = bsv.Script.buildPublicKeyHashOut(
            bsv.Address.fromPublicKey(sellerPrivateKey.publicKey)
        )
        cat721Utxo = new bsv.Transaction.Output({
            satoshis: 10000,
            script: cat721Script,
        })

        const { tx: listTxResult, nexts: nexts1 } = await escrow.methods.list(
            seller,
            price,
            {
                next: {
                    instance: nextEscrow,
                    balance: escrow.balance,
                },
            }
        )

        // Update cat721Utxo with the new output from the list transaction
        cat721Utxo = listTxResult.outputs[0]

        escrow = nexts1[0].instance

        // Now you can access the updated state in `escrow.sellers`
        console.log(
            'sellers HashedMap after list:',
            Array.from(escrow.sellers.entries())
        )
        expect(listTxResult).to.be.not.null

        // Add the second seller
        nextEscrow = escrow.next()
        const seller2 = bsv.PrivateKey.fromRandom(network)
        const seller2PubKey = PubKey(seller2.publicKey.toByteString())
        console.log(`Adding seller: ${seller2PubKey}, adding price: ${price} `)
        nextIndex = BigInt(nextEscrow.sellers.size)
        const sellerInfo1 = { price, index: nextIndex }
        nextEscrow.sellers.set(seller2PubKey, sellerInfo1)

        const { tx: listTxResult2, nexts: nexts2 } = await escrow.methods.list(
            seller2PubKey,
            price,
            {
                next: {
                    instance: nextEscrow,
                    balance: escrow.balance,
                },
            }
        )

        escrow = nexts2[0].instance
        console.log(
            'sellers HashedMap after list:',
            Array.from(escrow.sellers.entries())
        )

        // --- purchase ---
        nextEscrow = escrow.next()

        // --- Update the state of the nextEscrow instance ---
        // Remove the seller from the sellers HashedMap in nextEscrow
        //nextEscrow.sellers.delete(seller);

        // Add an output to nextEscrow that transfers the asset to the buyer
        const buyerAddress = pubKey2Addr(buyer)
        const expectedOutputScript = Utils.buildPublicKeyHashScript(
            hash160(buyerAddress)
        ) // Using buildPublicKeyHashScript
        Utils.buildOutput(expectedOutputScript, 0n)

        // Add an output to nextEscrow that transfers the price to the seller
        const sellerAddress = pubKey2Addr(seller) // Get the seller's address
        Utils.buildOutput(sellerAddress, sellerInfo.price) // Use Utils.buildOutput()
        const { tx: purchaseTxResult, nexts: nexts3 } =
            await escrow.methods.purchase(buyer, seller, sellerInfo, {
                next: {
                    instance: nextEscrow,
                    balance: escrow.balance,
                },
            })

        // Update cat721Utxo with the new output from the purchase transaction
        cat721Utxo = purchaseTxResult.outputs[0]

        //console.log(`UTX0 Output: ${cat721Utxo}`);

        escrow = nexts2[0].instance
        expect(purchaseTxResult.verify()).to.be.true

        // --- withdraw ---
        nextEscrow = escrow.next()

        const { tx: withdrawTxResult, nexts: nexts4 } =
            await escrow.methods.withdraw(seller, {
                next: {
                    instance: nextEscrow,
                    balance: escrow.balance,
                },
            })

        // Update cat721Utxo (if needed - depends on your withdraw logic)
        cat721Utxo = withdrawTxResult.outputs[0]

        escrow = nexts3[0].instance
        expect(withdrawTxResult.verify()).to.be.true
    })
})
