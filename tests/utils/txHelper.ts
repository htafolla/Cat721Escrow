import { DummyProvider, DefaultProvider, TestWallet, bsv } from 'scrypt-ts'
import { myPrivateKey1, myPrivateKey2 } from './privateKey' // Import both keys

import * as dotenv from 'dotenv'

// Load the .env file
dotenv.config()

const wallets: Record<string, TestWallet> = {
    testnet: new TestWallet(
        [myPrivateKey1, myPrivateKey2], // Use both private keys
        new DefaultProvider({
            network: bsv.Networks.testnet,
        })
    ),
    local: new TestWallet([myPrivateKey1, myPrivateKey2], new DummyProvider()), // Use both private keys
}

export function getDefaultSigner(
    privateKey?: bsv.PrivateKey | bsv.PrivateKey[]
): TestWallet {
    const network = process.env.NETWORK || 'local'

    const wallet = wallets[network]

    if (privateKey) {
        wallet.addPrivateKey(privateKey)
    }

    return wallet
}

export const sleep = async (seconds: number) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({})
        }, seconds * 1000)
    })
}

export function randomPrivateKey() {
    const privateKey = bsv.PrivateKey.fromRandom(bsv.Networks.testnet)
    const publicKey = bsv.PublicKey.fromPrivateKey(privateKey)
    const publicKeyHash = bsv.crypto.Hash.sha256ripemd160(publicKey.toBuffer())
    const address = publicKey.toAddress()
    return [privateKey, publicKey, publicKeyHash, address] as const
}
