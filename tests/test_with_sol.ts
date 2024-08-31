
import {SwapUtils ,buildDefaultAccountFetcher } from "@orca-so/whirlpools-sdk";
import * as anchor from "@coral-xyz/anchor";
import { BN as bn } from "bn.js";
import { AnchorDex, IDL } from "../target/types/anchor_dex"
import { metadata } from "../target/idl/anchor_dex.json"
import { MathUtil } from "@orca-so/common-sdk";
import {Decimal} from "decimal.js";
import { PublicKey, Commitment, Keypair, SystemProgram } from "@solana/web3.js"
import { ASSOCIATED_TOKEN_PROGRAM_ID as associatedTokenProgram, TOKEN_PROGRAM_ID as tokenProgram, createMint, createAccount, mintTo, getAssociatedTokenAddress, createAssociatedTokenAccount,TOKEN_PROGRAM_ID } from "@solana/spl-token"
import { readFileSync } from "fs";
import calculateValue from "./utils/calculateValue";

import {
    Connection,
    Transaction,
    LAMPORTS_PER_SOL,
    sendAndConfirmTransaction
} from '@solana/web3.js';
import {
    createAssociatedTokenAccountInstruction,
    createSyncNativeInstruction,
    ASSOCIATED_TOKEN_PROGRAM_ID
} from '@solana/spl-token';


const commitment: Commitment = "confirmed"; // processed, confirmed, finalized
const MAX_TICK_INDEX = 443608;
const TICK_ARRAY_SIZE = 88;
const MIN_TICK_INDEX = -443608;
const PDA_TICK_ARRAY_SEED = "tick_array";
const wallet=Keypair.fromSecretKey(Buffer.from(JSON.parse(readFileSync("./id.json").toString())))
describe("anchor-amm-2023", () => {
// PDA
let connection= anchor.AnchorProvider.env().connection;


const TICK_SPACING_1 = 1
const FEE_TIER_100 = 100
const TICK_SPACING_10 = 10
const FEE_TIER_500 = 500
const TICK_SPACING_60 = 60
const FEE_TIER_3000 = 3000
const TICK_SPACING_200 = 200
const FEE_TIER_10000 = 10000
const TOKEN_A_PER_TOKEN_B=200
const TOKEN_B_PER_TOKEN_A=1_000_000





  
  anchor.setProvider(anchor.AnchorProvider.env());
  
  // let wallet=new Keypair()
  

  
  
  const program = new anchor.Program<AnchorDex>(IDL,metadata.address , anchor.getProvider())

  
  let config=new Keypair()
  
    const tickSpacingBuffer = new Uint8Array(2);
    tickSpacingBuffer.set([TICK_SPACING_1])
    const feeAccountPDA = PublicKey.findProgramAddressSync([Buffer.from("fee_tier"),config.publicKey.toBuffer(),Buffer.from(tickSpacingBuffer)],program.programId)[0];

  // Mints
  let mint_x: PublicKey;
  let mint_y: PublicKey;
  let tick_lower: PublicKey;
  let tick_upper: PublicKey;
  let tick_middle: PublicKey;
  let position: PublicKey;
  let positionTokenAccount:PublicKey;
  let pool : PublicKey;
  let pool_bump : number;
    
  let initializer_x_ata: PublicKey;
  let initializer_y_ata: PublicKey;
  
  let vault_x_ata: PublicKey;
  let vault_y_ata: PublicKey;
  
  
    
  // it("Airdrop", async () => {
  //   await Promise.all([wallet, wallet].map(async (k) => {
  //     return await anchor.getProvider().connection.requestAirdrop(k.publicKey, 100 * anchor.web3.LAMPORTS_PER_SOL)
  //   })).then(confirmTxs);
  // });

  it("Create mints, tokens and ATAs", async () => {
    let u1=await newMintToAta(anchor.getProvider().connection, wallet) ;
    let sol=new PublicKey("So11111111111111111111111111111111111111112");
    const wSOLAccount = await getAssociatedTokenAddress(
        sol, 
        wallet.publicKey
    );

    if (u1.mint.toBuffer()<sol.toBuffer()){
      mint_x = u1.mint;
      initializer_x_ata = u1.ata;
      mint_y = sol;
      initializer_y_ata = wSOLAccount;
    }else{
      mint_x = sol;
      initializer_x_ata = wSOLAccount;
      mint_y = u1.mint;
      initializer_y_ata = u1.ata;
    }
    
    
    [pool,pool_bump] = PublicKey.findProgramAddressSync([Buffer.from("pool"), config.publicKey.toBuffer(),mint_x.toBuffer(),mint_y.toBuffer(),tickSpacingBuffer], program.programId);
    
  })

  
  
  it("Initialize config", async () => {

    try {
      const tx = await program.methods.initializeConfig(wallet.publicKey,wallet.publicKey,wallet.publicKey,100

      )
      .accounts({
        config:config.publicKey,
        
        funder:wallet.publicKey,
        systemProgram: SystemProgram.programId
      })
      .signers([
        wallet,config
      ]).rpc();
      await confirmTx(tx);
      // console.log("Your transaction signature", tx);
    } catch(e) {
      console.error(e);
    }
  });
  
  it("Initialize fee", async () => {
    try {
      const tx = await program.methods.initializeFeeTier(TICK_SPACING_1,FEE_TIER_100)
      .accounts({
        config:config.publicKey,
        feeTier:feeAccountPDA,
        feeAuthority:wallet.publicKey,
        funder:wallet.publicKey,
        systemProgram: SystemProgram.programId,
        
      })
      .signers([
        wallet
      ]).rpc({skipPreflight:false});
      await confirmTx(tx);
      // console.log("Your transaction signature", tx);
    } catch(e) {
      console.error(e);
    }
  });
  
  
  it("Initialize pool", async () => {
    let s1=new Keypair()
    vault_x_ata=s1.publicKey;
    let s2=new Keypair()
    vault_y_ata=s2.publicKey;
    const desiredMarketPrice = new Decimal(Math.sqrt(TOKEN_A_PER_TOKEN_B));
    const initSqrtPrice = MathUtil.toX64(desiredMarketPrice); 
    
    try {

      const tx = await program.methods.initializePool({poolBump:pool_bump},TICK_SPACING_1,initSqrtPrice
      
      )
      .accounts({
        poolsConfig:config.publicKey,
        tokenMintA:mint_x,
        tokenMintB:mint_y,
        funder:wallet.publicKey,
        pool:pool,
        tokenVaultA:vault_x_ata,
        tokenVaultB:vault_y_ata,
        feeTier:feeAccountPDA,
        
        
      })
      .signers([
        wallet,
        s1,s2
      ]).rpc();
      await confirmTx(tx);
      console.log("Your transaction signature", tx);
    } catch(e) {
      console.error(e);
    }
  });
  
  it("init tick upper account", async () => {
    
    let tickUpper=MAX_TICK_INDEX
    const [tickArray,bump] = PublicKey.findProgramAddressSync([Buffer.from("tick_array"),pool.toBuffer(),Buffer.from(tickUpper.toString())],program.programId);
    tick_upper=tickArray
  
    
    try {

      const tx = await program.methods.initializeTickArray(tickUpper
      )
      .accounts({
        funder:wallet.publicKey,
        tickArray:tickArray,
        pool:pool,
      })
      .signers([
        wallet,
        
      ]).rpc();
      await confirmTx(tx);
      console.log("Your transaction signature", tx);
    } catch(e) {
      console.error(e);
    }
  });
  it("init tick lower account", async () => {
  
    let tickLower=MIN_TICK_INDEX
  
    const [tickArray,bump] = PublicKey.findProgramAddressSync([Buffer.from("tick_array"),pool.toBuffer(),Buffer.from(tickLower.toString())],program.programId);
    tick_lower=tickArray
    try {
      const tx = await program.methods.initializeTickArray(tickLower)
      .accounts({
        funder:wallet.publicKey,
        tickArray:tickArray,
        pool:pool,
      })
      .signers([
        wallet,
        
      ]).rpc();
      await confirmTx(tx);
      console.log("Your transaction signature", tx);
    } catch(e) {
      console.error(e);
    }
  });

  it("open position", async () => {
    let mint=new Keypair()
    const [positionPda,bump] = PublicKey.findProgramAddressSync([Buffer.from("position"),mint.publicKey.toBuffer()],program.programId);
    position=positionPda
    let positionToken:PublicKey = await getAssociatedTokenAddress(mint.publicKey, wallet.publicKey, true, tokenProgram);
    positionTokenAccount=positionToken
    let tickLower=MIN_TICK_INDEX
    let tickUpper=MAX_TICK_INDEX
    try {

      const tx = await program.methods.openPosition({positionBump:bump},tickLower,tickUpper

      )
      .accounts({
        funder:wallet.publicKey,
        owner:wallet.publicKey,
        positionMint:mint.publicKey,
        position:positionPda,
        positionTokenAccount:positionTokenAccount,
        pool:pool,
        
      })
      .signers([
        wallet,
        mint
      ]).rpc();
      await confirmTx(tx);
      console.log("Your transaction signature", tx);
    } catch(e) {
      console.error(e);
    }
  });
  it("to wrapped sol", async () => {
    await wrapSOL()
  });
  it("add liquidity for first time", async () => {

    try {
      let amountOf_X=new Decimal(1)
      let lp_decimal=new Decimal(1000000)
      
      const desiredMarketPrice = new Decimal(Math.sqrt(TOKEN_A_PER_TOKEN_B)).mul(amountOf_X).mul(lp_decimal).floor();
      const tx = await program.methods.increaseLiquidity(new bn(desiredMarketPrice.toString()),new bn("1000000000000000"),new bn("1000000000000000")

      )
      .accounts({
        pool:pool,
        positionAuthority:wallet.publicKey,
        position:position,
        positionTokenAccount:positionTokenAccount,
        tokenOwnerAccountA:initializer_x_ata,
        tokenOwnerAccountB:initializer_y_ata,
        tokenVaultA:vault_x_ata,
        tokenVaultB:vault_y_ata,
        tickArrayLower:tick_lower,
        tickArrayUpper:tick_upper
        
      })
      .signers([
        wallet,
        
      ]).rpc();
      await confirmTx(tx);
      console.log("Your transaction signature", tx);
    } catch(e) {
      console.error(e);
    }
  });
  it("logs", async () => {
    let vault_x_ata_balance=await connection.getTokenAccountBalance(vault_x_ata);
    let vault_y_ata_balance=await connection.getTokenAccountBalance(vault_y_ata);
    
    
    console.log(vault_x_ata_balance);
    console.log(vault_y_ata_balance);
    
    

  })
  

  it("init tick upper account", async () => {
  
        let rate=tickCalculation(250,TICK_SPACING_1)
        let tickUpper=Math.round(rate/88)*88
      
      const [tickArray,bump] = PublicKey.findProgramAddressSync([Buffer.from("tick_array"),pool.toBuffer(),Buffer.from(tickUpper.toString())],program.programId);
      
      tick_upper=tickArray
    
      
      try {

        const tx = await program.methods.initializeTickArray(tickUpper

        )
        .accounts({
          funder:wallet.publicKey,
          tickArray:tickArray,
          pool:pool,
        })
        .signers([
          wallet,
          
        ]).rpc();
        await confirmTx(tx);
        console.log("Your transaction signature", tx);
      } catch(e) {
        console.error(e);
      }
  });
  it("init tick lower account", async () => {
    
    let rate=tickCalculation(150,TICK_SPACING_1)
    let tickLower=Math.round(rate/88)*88
    
    const [tickArray,bump] = PublicKey.findProgramAddressSync([Buffer.from("tick_array"),pool.toBuffer(),Buffer.from(tickLower.toString())],program.programId);
    
    tick_lower=tickArray
  
    
    try {

      const tx = await program.methods.initializeTickArray(tickLower

      )
      .accounts({
        funder:wallet.publicKey,
        tickArray:tickArray,
        pool:pool,
      })
      .signers([
        wallet,
        
      ]).rpc();
      await confirmTx(tx);
      console.log("Your transaction signature", tx);
    } catch(e) {
      console.error(e);
    }
  });

  it("open position", async () => {
    let mint=new Keypair()
    const [positionPda,bump] = PublicKey.findProgramAddressSync([Buffer.from("position"),mint.publicKey.toBuffer()],program.programId);
    position=positionPda
    let positionToken:PublicKey = await getAssociatedTokenAddress(mint.publicKey, wallet.publicKey, true, tokenProgram);
    positionTokenAccount=positionToken
    let LowerRate=150
    let tickLower=tickCalculation(LowerRate,TICK_SPACING_1)
    let UpperRate=250
    
    let tickUpper=tickCalculation(UpperRate,TICK_SPACING_1)
    console.log("tickUpper",tickUpper);
    
    try {

      const tx = await program.methods.openPosition({positionBump:bump},tickLower,tickUpper

      )
      .accounts({
        funder:wallet.publicKey,
        owner:wallet.publicKey,
        positionMint:mint.publicKey,
        position:positionPda,
        positionTokenAccount:positionTokenAccount,
        pool:pool,
        
      })
      .signers([
        wallet,
        mint
      ]).rpc();
      await confirmTx(tx);
      console.log("Your transaction signature", tx);
    } catch(e) {
      console.error(e);
    }
  });
  it("add liquidity", async () => {

    try {

      
      let value=new bn(calculateValue(2,0,200,150,250)).mul(new bn(10).pow(new bn(6)));
      const tx = await program.methods.increaseLiquidity(value,new bn("1000000000000000"),new bn("1000000000000000")

      )
      .accounts({
        pool:pool,
        positionAuthority:wallet.publicKey,
        position:position,
        positionTokenAccount:positionTokenAccount,
        tokenOwnerAccountA:initializer_x_ata,
        tokenOwnerAccountB:initializer_y_ata,
        tokenVaultA:vault_x_ata,
        tokenVaultB:vault_y_ata,
        tickArrayLower:tick_lower,
        tickArrayUpper:tick_upper
        
      })
      .signers([
        wallet,
        
      ]).rpc();
      await confirmTx(tx);
      console.log("Your transaction signature", tx);
    } catch(e) {
      console.error(e);
    }
  });
  
  it("logs", async () => {
    let vault_x_ata_balance=await connection.getTokenAccountBalance(vault_x_ata);
    let vault_y_ata_balance=await connection.getTokenAccountBalance(vault_y_ata);
    
    
    console.log(vault_x_ata_balance);
    console.log(vault_y_ata_balance);
    
    

  })

  it("swap exact token for token", async () => {
    
    const fetcher =  buildDefaultAccountFetcher(connection);

    let rate=tickCalculation(200,TICK_SPACING_1)
    let tickMiddle=(Math.round((rate)/88)*88)
    await init_tick(tickMiddle-88-88-88)
    await init_tick(tickMiddle-88-88)
    await init_tick(tickMiddle-88)
    await init_tick(tickMiddle)
    await init_tick(tickMiddle+88)
    await init_tick(tickMiddle+88+88)
    await init_tick(tickMiddle+88+88+88)
    await init_tick(tickMiddle+88+88+88+88)
    let a_to_b=true
      let current_tick=await (await program.account.pool.fetch(pool)).tickCurrentIndex
      
      let ticks=(await SwapUtils.getTickArrays(current_tick,TICK_SPACING_1,a_to_b,new PublicKey(metadata.address),pool,fetcher)).map(tick=>{
        return tick.address
      })
      console.log(ticks);
      
    try {
    const actualPrice = new Decimal(Math.sqrt(TOKEN_A_PER_TOKEN_B));
    const initSqrtPrice = MathUtil.toX64(actualPrice); 
      const tx = await program.methods.swap(new bn("100000"),new bn("10000000000"),new bn(initSqrtPrice),false,a_to_b

      )
      .accounts({
        pool:pool,
        tokenAuthority:wallet.publicKey,
        
        
        tokenOwnerAccountA:initializer_x_ata,
        tokenOwnerAccountB:initializer_y_ata,
        tokenVaultA:vault_x_ata,
        tokenVaultB:vault_y_ata,
        tickArray0:ticks[0],
        tickArray1:ticks[1],
        tickArray2:ticks[2],
        
      })
      .signers([
        wallet,
        
      ]).rpc();
      await confirmTx(tx);
      console.log("Your transaction signature", tx);
    } catch(e) {
      console.error(e);
    }
  
  });
    it("logs", async () => {
    let vault_x_ata_balance=await connection.getTokenAccountBalance(vault_x_ata);
    let vault_y_ata_balance=await connection.getTokenAccountBalance(vault_y_ata);
    
    
    console.log(vault_x_ata_balance);
    console.log(vault_y_ata_balance);
    
    

  })
  // it("remove liquidity", async () => {

  //   try {
  //     let value=new bn(calculateValue(0.5,0,2000,1500,2500)).mul(new bn(10).pow(new bn(6)));
  //     const tx = await program.methods.decreaseLiquidity(value,new bn(0),new bn(0)

  //     )
  //     .accounts({
  //       pool:pool,
  //       positionAuthority:wallet.publicKey,
  //       position:position,
  //       positionTokenAccount:positionTokenAccount,
  //       tokenOwnerAccountA:initializer_x_ata,
  //       tokenOwnerAccountB:initializer_y_ata,
  //       tokenVaultA:vault_x_ata,
  //       tokenVaultB:vault_y_ata,
  //       tickArrayLower:tick_lower,
  //       tickArrayUpper:tick_upper
        
  //     })
  //     .signers([
  //       wallet,
        
  //     ]).rpc();
  //     await confirmTx(tx);
  //     console.log("Your transaction signature", tx);
  //   } catch(e) {
  //     console.error(e);
  //   }
    
  // });
    it("logs", async () => {
    let tick_upper=await (await program.account.position.fetch(position)).tickUpperIndex
    const [tickArray,bump] = PublicKey.findProgramAddressSync([Buffer.from("tick_array"),pool.toBuffer(),Buffer.from(tick_upper.toString())],program.programId);

    // console.log(x);
    
    

  })


   async function init_tick( startTick: number) {
    const [tickArray,bump] = PublicKey.findProgramAddressSync([Buffer.from("tick_array"),pool.toBuffer(),Buffer.from(startTick.toString())],program.programId);
    try {

      const tx = await program.methods.initializeTickArray(startTick

      )
      .accounts({
        funder:wallet.publicKey,
        tickArray:tickArray,
        pool:pool,
      })
      .signers([
        wallet,
        
      ]).rpc();
      await confirmTx(tx);
      return tickArray
    } catch(e) {
      console.error(e);
    }
  }

});

//? Helpers
const confirmTx = async (signature: string) => {
  const latestBlockhash = await anchor.getProvider().connection.getLatestBlockhash();
  await anchor.getProvider().connection.confirmTransaction(
    {
      signature,
      ...latestBlockhash,
    },
    commitment
  )
}

const confirmTxs = async (signatures: string[]) => {
  await Promise.all(signatures.map(confirmTx))
}

const newMintToAta = async (connection, minter: Keypair): Promise<{ mint: PublicKey, ata: PublicKey }> => { 
  const mint = await createMint(connection, minter, minter.publicKey, null, 6)
  // await getAccount(connection, mint, commitment)
  const ata = await createAccount(connection, minter, mint, minter.publicKey)
  const signature = await mintTo(connection, minter, mint, ata, minter, 21e12)
  await confirmTx(signature)
  return {
    mint,
    ata
  }
}
const tickCalculation =  (amount_based_the_other_token:number,tick_spacing:number)=> { 
    const base = 1.0001;
    const x = Math.log(amount_based_the_other_token) / Math.log(base);
    let tick=Math.round(x/tick_spacing) * tick_spacing
    return tick;

}

async function wrapSOL() {
    // Connect to the Solana devnet
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

    // Generate a new keypair for the user (in real applications, use a wallet like Phantom)
    let user=wallet
    
    // Airdrop SOL to the user's wallet for testing
    

    // Define the wSOL mint address
    const wSOLMintAddress = new PublicKey("So11111111111111111111111111111111111111112");

    // Get the associated token account address for the user
    const wSOLAccount = await getAssociatedTokenAddress(
        wSOLMintAddress, 
        user.publicKey
    );

    // Create the associated token account instruction if it doesn't exist
    const createAssociatedTokenAccountIx = createAssociatedTokenAccountInstruction(
        user.publicKey, // Payer
        wSOLAccount, // Associated token account
        user.publicKey, // Owner of the associated token account
        wSOLMintAddress, // Token mint
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
    );

    // Transfer SOL to the associated token account
    const transferInstruction = SystemProgram.transfer({
        fromPubkey: user.publicKey,
        toPubkey: wSOLAccount,
        lamports: 0.1 * LAMPORTS_PER_SOL
    });

    // Sync the native token account balance
    const syncNativeInstruction = createSyncNativeInstruction(
        wSOLAccount,
        TOKEN_PROGRAM_ID
    );

    // Create and send the transaction
    const transaction = new Transaction()
        // .add(createAssociatedTokenAccountIx)// if doesnt exit uncomment this part
        .add(transferInstruction)
        .add(syncNativeInstruction);

    let tx=await sendAndConfirmTransaction(connection, transaction, [user]);
    console.log(tx);
    

    console.log('wSOL account created and funded:', wSOLAccount.toBase58());
}