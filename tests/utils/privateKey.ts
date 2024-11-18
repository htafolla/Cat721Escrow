import { bsv } from 'scrypt-ts'
import * as dotenv from 'dotenv'
import * as fs from 'fs'

export function genPrivKeys(
    network: bsv.Networks.Network,
    envFileName: string = '.env'
): { privateKey1: bsv.PrivateKey; privateKey2: bsv.PrivateKey } {
    const envFilePath = `.env`
    dotenv.config({ path: envFilePath })

    let privateKey1: bsv.PrivateKey, privateKey2: bsv.PrivateKey

    const privKeyStr1 = process.env.PRIVATE_KEY_1
    if (privKeyStr1) {
        privateKey1 = bsv.PrivateKey.fromWIF(privKeyStr1)
        console.log(`Private key 1 already present in ${envFileName} ...`)
    } else {
        privateKey1 = bsv.PrivateKey.fromRandom(network)
        console.log(`Private key 1 generated ...`)
        console.log(`  - Publickey 1:  ${privateKey1.publicKey}`)
        console.log(`  - Address 1:  ${privateKey1.toAddress()}`)
    }

    const privKeyStr2 = process.env.PRIVATE_KEY_2
    if (privKeyStr2) {
        privateKey2 = bsv.PrivateKey.fromWIF(privKeyStr2)
        console.log(`Private key 2 already present in ${envFileName} ...`)
    } else {
        privateKey2 = bsv.PrivateKey.fromRandom(network)
        console.log(`Private key 2 generated ...`)
        console.log(`  - Publickey 2:  ${privateKey2.publicKey}`)
        console.log(`  - Address 2:  ${privateKey2.toAddress()}`)
    }

    // Save both keys to the .env file
    const envContent = `PRIVATE_KEY_1="${privateKey1.toWIF()}"\nPRIVATE_KEY_2="${privateKey2.toWIF()}"\n`
    fs.writeFileSync(envFilePath, envContent)

    console.log(`Private keys saved in "${envFileName}"`)

    // Generate the corresponding public keys
    const publicKey1 = bsv.PublicKey.fromPrivateKey(privateKey1)
    const publicKey2 = bsv.PublicKey.fromPrivateKey(privateKey2)

    // Generate the corresponding public key hashes
    const publicKeyHash1 = bsv.crypto.Hash.sha256ripemd160(
        publicKey1.toBuffer()
    )
    const publicKeyHash2 = bsv.crypto.Hash.sha256ripemd160(
        publicKey2.toBuffer()
    )

    // Generate the corresponding addresses
    const address1 = publicKey1.toAddress()
    const address2 = publicKey2.toAddress()

    return { privateKey1, privateKey2 }
}

// Generate both private keys and save them in .env
export const { privateKey1: myPrivateKey1, privateKey2: myPrivateKey2 } =
    genPrivKeys(bsv.Networks.testnet)

// Generate the corresponding public keys
export const myPublicKey1 = bsv.PublicKey.fromPrivateKey(myPrivateKey1)
export const myPublicKey2 = bsv.PublicKey.fromPrivateKey(myPrivateKey2)

// Generate the corresponding public key hashes
export const myPublicKeyHash1 = bsv.crypto.Hash.sha256ripemd160(
    myPublicKey1.toBuffer()
)
export const myPublicKeyHash2 = bsv.crypto.Hash.sha256ripemd160(
    myPublicKey2.toBuffer()
)

// Generate the corresponding addresses
export const myAddress1 = myPublicKey1.toAddress()
export const myAddress2 = myPublicKey2.toAddress()
