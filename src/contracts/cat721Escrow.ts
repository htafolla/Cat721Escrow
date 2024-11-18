import {
    bsv,
    assert,
    ByteString,
    hash160,
    method,
    prop,
    PubKey,
    pubKey2Addr,
    Sig,
    SmartContract,
    toByteString,
    HashedMap,
    Utils,
    SigHash,
    SigHashPreimage,
    int2ByteString,
    hash256,
} from 'scrypt-ts'

// Define the structure for seller information
type SellerInfo = {
    price: bigint
    index: bigint
}

export class Cat721Escrow extends SmartContract {
    @prop()
    cat721Contract: ByteString

    @prop(true)
    sellers: HashedMap<PubKey, SellerInfo>

    @prop()
    buyer: PubKey

    @prop()
    price: bigint

    @prop()
    tokenId: bigint

    constructor(
        cat721Contract: ByteString,
        sellers: HashedMap<PubKey, SellerInfo>,
        buyer: PubKey,
        price: bigint,
        tokenId: bigint
    ) {
        super(...arguments)
        this.cat721Contract = cat721Contract
        this.sellers = sellers
        this.buyer = buyer
        this.price = price
        this.tokenId = tokenId
    }

    @method(SigHash.SINGLE)
    public list(sellerPubKey: PubKey, price: bigint) {
        // Verify the seller's signature
        //assert(this.checkSig(sig, sellerPubKey), `Invalid signature from seller ${sellerPubKey}`);

        // Get the next available index
        const nextIndex = BigInt(this.sellers.size)

        // Add the seller, price, and index to the sellers HashedMap
        const sellerInfo: SellerInfo = { price, index: nextIndex }
        this.sellers.set(sellerPubKey, sellerInfo)

        console.log(
            `Adding seller: ${sellerPubKey}, adding price: ${sellerInfo.price}, adding index: ${sellerInfo.index} `
        )

        // Build the output to lock the asset to the seller's address (using hash160)
        const sellerAddress = pubKey2Addr(sellerPubKey)
        const outputScript = Utils.buildPublicKeyHashScript(
            hash160(sellerAddress)
        )
        Utils.buildOutput(outputScript, 0n)

        assert(true)
    }

    @method()
    public purchase(
        buyerPubKey: PubKey,
        sellerPubKey: PubKey,
        sellerInfo: SellerInfo
    ) {
        // Check if the seller has listed the provided asset at the specified price
        console.log(
            `${sellerPubKey}, ${sellerInfo.index}, ${sellerInfo.price}}`
        )
        assert(
            this.sellers.canGet(sellerPubKey, sellerInfo),
            `Seller ${sellerPubKey} has not listed this Cat721 ID ${sellerInfo.index} at this price ${sellerInfo.price}`
        )

        // Build the output to transfer the specific CAT721 token to the buyer
        const buyerAddress = pubKey2Addr(buyerPubKey)
        const outputScript = Utils.buildPublicKeyHashScript(
            hash160(buyerAddress)
        )
        Utils.buildOutput(outputScript, 0n)

        // Transfer the price to the seller
        const sellerAddress = pubKey2Addr(sellerPubKey)
        Utils.buildOutput(sellerAddress, sellerInfo.price) // Use sellerAddress, not sellerPubKey

        assert(true)
    }

    @method()
    public withdraw(sellerPubKey: PubKey) {
        // Verify the seller's signature
        //assert(this.checkSig(sig, sellerPubKey), `Invalid signature from seller ${sellerPubKey}`);

        // Check if the seller exists in the HashedMap
        assert(
            this.sellers.has(sellerPubKey),
            `Seller ${sellerPubKey} not found`
        )

        // Remove the seller from the sellers HashedMap
        this.sellers.delete(sellerPubKey)

        // Transfer the CAT721 token back to the seller
        const outputScript = Utils.buildPublicKeyHashScript(
            hash160(sellerPubKey)
        )
        Utils.buildOutput(outputScript, 0n)

        // No need to transfer satoshis back to sellers (as the token wasn't deposited with funds)

        assert(true)
    }
}
