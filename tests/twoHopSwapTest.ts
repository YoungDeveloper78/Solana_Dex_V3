
import {SwapUtils ,buildDefaultAccountFetcher ,increaseLiquidityQuoteByInputTokenUsingPriceSlippage,swapQuoteByInputToken,swapQuoteByOutputToken} from "@orca-so/whirlpools-sdk";
import * as anchor from "@coral-xyz/anchor";
import { BN as bn } from "bn.js";
import { AnchorDex, IDL } from "../target/types/anchor_dex"
import { metadata } from "../target/idl/anchor_dex.json"
import { MathUtil } from "@orca-so/common-sdk";
import {Decimal} from "decimal.js";
import { PublicKey, Commitment, Keypair, SystemProgram } from "@solana/web3.js"
import { ASSOCIATED_TOKEN_PROGRAM_ID as associatedTokenProgram, TOKEN_PROGRAM_ID as tokenProgram, createMint, createAccount, mintTo, getAssociatedTokenAddress, createAssociatedTokenAccount,TOKEN_PROGRAM_ID, getAccount } from "@solana/spl-token"

import calculateValue from "./utils/calculateValue";

const commitment: Commitment = "confirmed"; // processed, confirmed, finalized
const MAX_TICK_INDEX = 443608;
const TICK_ARRAY_SIZE = 88;
const MIN_TICK_INDEX = -443608;
const PDA_TICK_ARRAY_SEED = "tick_array";
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
const TOKEN_A_PER_TOKEN_B=2000
const TOKEN_B_PER_TOKEN_A=1_000_000





  
  anchor.setProvider(anchor.AnchorProvider.env());
  
  let wallet=new Keypair()
  
  // const wallet=Keypair.fromSecretKey(Buffer.from(JSON.parse(readFileSync("./id.json").toString())))

  
  
  const program = new anchor.Program<AnchorDex>(IDL,metadata.address , anchor.getProvider())

  
  let config=new Keypair()
  
    const tickSpacingBuffer = new Uint8Array(2);
    tickSpacingBuffer.set([TICK_SPACING_1])
    const feeAccountPDA = PublicKey.findProgramAddressSync([Buffer.from("fee_tier"),config.publicKey.toBuffer(),Buffer.from(tickSpacingBuffer)],program.programId)[0];

  // Mints
  let mint_x: PublicKey;
  let mint_y: PublicKey;
  let mint_z: PublicKey;
  let tick_lower: PublicKey;
  let tick_upper: PublicKey;
  let tick_middle: PublicKey;
  let position: PublicKey;
  let positionTokenAccount:PublicKey;
  let position_1:PublicKey;
  let positionTokenAccount_1:PublicKey;
  let pool : PublicKey;
  let pool_bump : number;
  let pool_1 : PublicKey;
  let pool_bump_1 : number;
  let tick_upper_0:PublicKey
  let tick_lower_0:PublicKey
    
  let initializer_x_ata: PublicKey;
  let initializer_y_ata: PublicKey;
  let initializer_y2_ata: PublicKey;
  let initializer_z_ata: PublicKey;
  
  let vault_x_ata: PublicKey;
  let vault_y_ata: PublicKey;
  let vault_y_1_ata:PublicKey;
  let vault_z_ata: PublicKey;
  let vault_0_ata: PublicKey;
  let vault_1_ata: PublicKey;

  let mint_0;
  let mint_1;
  let first_ata;
  let second_ata;
  
  
    
  it("Airdrop", async () => {
    await Promise.all([wallet, wallet].map(async (k) => {
      return await anchor.getProvider().connection.requestAirdrop(k.publicKey, 100 * anchor.web3.LAMPORTS_PER_SOL)
    })).then(confirmTxs);
  });

  it("Create mints, tokens and ATAs", async () => {
    let [ u1, u2 ,u3] = await Promise.all([wallet, wallet,wallet].map(async(a) => { return await newMintToAta(anchor.getProvider().connection, a) }))
    if (u1.mint.toBuffer()<u2.mint.toBuffer()&&u1.mint.toBuffer()<u3.mint.toBuffer()){
      
            mint_x = u1.mint;
            initializer_x_ata = u1.ata;
            if (u2.mint.toBuffer()<u3.mint.toBuffer()) {
            mint_y = u2.mint;
            initializer_y_ata = u2.ata;
            mint_z = u3.mint;
            initializer_z_ata = u3.ata;

            }
            else {
            mint_y = u3.mint;
            initializer_y_ata = u3.ata;
            mint_z = u2.mint;
            initializer_z_ata = u2.ata;
            
        }
        
        
    }
    else if (u2.mint.toBuffer()<u1.mint.toBuffer()&&u2.mint.toBuffer()<u3.mint.toBuffer()){
        
        mint_x = u2.mint;
        initializer_x_ata = u2.ata;
        if (u1.mint.toBuffer()<u3.mint.toBuffer()) {
            mint_y = u1.mint;
            initializer_y_ata = u1.ata;
            mint_z = u3.mint;
            initializer_z_ata = u3.ata;
        }
        else {
        mint_y = u3.mint;
        initializer_y_ata = u3.ata;
        mint_z = u1.mint;
        initializer_z_ata = u1.ata;
        }
        

    }
    else{
        
        mint_x = u3.mint;
        initializer_x_ata = u3.ata;
        if (u1.mint.toBuffer()<u2.mint.toBuffer()) {
            mint_y = u1.mint;
            initializer_y_ata = u1.ata;
            mint_z = u2.mint;
            initializer_z_ata = u2.ata;
            

        }
        else {
        mint_y = u2.mint;
        initializer_y_ata = u2.ata;
        mint_z = u1.mint;
        initializer_z_ata = u1.ata;
            

        }
        

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
        systemProgram: SystemProgram.programId
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
  
        let rate=tickCalculation(2500,TICK_SPACING_1)
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
    
    let rate=tickCalculation(1500,TICK_SPACING_1)
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
    let LowerRate=1500
    let tickLower=tickCalculation(LowerRate,TICK_SPACING_1)
    let UpperRate=2500
    
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

      
      let value=new bn(calculateValue(2,0,2000,1500,2500)).mul(new bn(10).pow(new bn(6)));
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

    let rate=tickCalculation(2000,TICK_SPACING_1)
    let tickMiddle=(Math.round((rate)/88)*88)
    await init_tick(tickMiddle-88-88-88,pool)
    await init_tick(tickMiddle-88-88,pool)
    await init_tick(tickMiddle-88,pool)
    await init_tick(tickMiddle,pool)
    await init_tick(tickMiddle+88,pool)
    await init_tick(tickMiddle+88+88,pool)
    await init_tick(tickMiddle+88+88+88,pool)
    await init_tick(tickMiddle+88+88+88+88,pool)
    let a_to_b=true
      let current_tick=await (await program.account.pool.fetch(pool)).tickCurrentIndex
      
      let ticks=(await SwapUtils.getTickArrays(current_tick,TICK_SPACING_1,a_to_b,new PublicKey(metadata.address),pool,fetcher)).map(tick=>{
        return tick.address
      })
      console.log(ticks);
      
    try {
    const actualPrice = new Decimal(Math.sqrt(TOKEN_A_PER_TOKEN_B-200));
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
//   //TODO

  it("Initialize new pool", async () => {
    let s1=new Keypair()
    vault_y_1_ata=s1.publicKey;
    let s2=new Keypair()
    vault_z_ata=s2.publicKey;
    const desiredMarketPrice = new Decimal(Math.sqrt(TOKEN_A_PER_TOKEN_B));
    const initSqrtPrice = MathUtil.toX64(desiredMarketPrice); 
    
    [pool_1,pool_bump_1] = PublicKey.findProgramAddressSync([Buffer.from("pool"), config.publicKey.toBuffer(),mint_y.toBuffer(),mint_z.toBuffer(),tickSpacingBuffer], program.programId);
    try {

      const tx = await program.methods.initializePool({poolBump:pool_bump_1},TICK_SPACING_1,initSqrtPrice
      
      )
      .accounts({
        poolsConfig:config.publicKey,
        tokenMintA:mint_y,
        tokenMintB:mint_z,
        funder:wallet.publicKey,
        pool:pool_1,
        tokenVaultA:vault_y_1_ata,
        tokenVaultB:vault_z_ata,
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
  

      
      const [tickArray,bump] = PublicKey.findProgramAddressSync([Buffer.from("tick_array"),pool_1.toBuffer(),Buffer.from(MAX_TICK_INDEX.toString())],program.programId);
      
      tick_upper_0=tickArray
    
      
      try {

        const tx = await program.methods.initializeTickArray(MAX_TICK_INDEX

        )
        .accounts({
          funder:wallet.publicKey,
          tickArray:tickArray,
          pool:pool_1,
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
    
      const [tickArray,bump] = PublicKey.findProgramAddressSync([Buffer.from("tick_array"),pool_1.toBuffer(),Buffer.from(MIN_TICK_INDEX.toString())],program.programId);
      
      tick_lower_0=tickArray
    
      
      try {

        const tx = await program.methods.initializeTickArray(MIN_TICK_INDEX

        )
        .accounts({
          funder:wallet.publicKey,
          tickArray:tickArray,
          pool:pool_1,
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
    position_1=positionPda
    let positionToken:PublicKey = await getAssociatedTokenAddress(mint.publicKey, wallet.publicKey, true, tokenProgram);
    positionTokenAccount_1=positionToken

    
    
    try {

      const tx = await program.methods.openPosition({positionBump:bump},MIN_TICK_INDEX,MAX_TICK_INDEX

      )
      .accounts({
        funder:wallet.publicKey,
        owner:wallet.publicKey,
        positionMint:mint.publicKey,
        position:position_1,
        positionTokenAccount:positionTokenAccount_1,
        pool:pool_1,
        
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
  it("add liquidity for first time", async () => {

    try {
      let amountOf_X=new Decimal(1)
      let lp_decimal=new Decimal(1000000)
      
      const desiredMarketPrice = new Decimal(Math.sqrt(TOKEN_A_PER_TOKEN_B)).mul(amountOf_X).mul(lp_decimal).floor();
      const tx = await program.methods.increaseLiquidity(new bn(desiredMarketPrice.toString()),new bn("1000000000000000"),new bn("1000000000000000")

      )
      .accounts({
        pool:pool_1,
        positionAuthority:wallet.publicKey,
        position:position_1,
        positionTokenAccount:positionTokenAccount_1,
        tokenOwnerAccountA:initializer_y_ata,
        tokenOwnerAccountB:initializer_z_ata,
        tokenVaultA:vault_y_1_ata,
        tokenVaultB:vault_z_ata,
        tickArrayLower:tick_lower_0,
        tickArrayUpper:tick_upper_0
        
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
  it("swap multi hop", async () => {
    
    
    const fetcher =  buildDefaultAccountFetcher(connection);

    let rate=tickCalculation(2000,TICK_SPACING_1)
    let tickMiddle=(Math.round((rate)/88)*88)
    await init_tick(tickMiddle-88-88-88,pool_1)
    await init_tick(tickMiddle-88-88,pool_1)
    await init_tick(tickMiddle-88,pool_1)
    await init_tick(tickMiddle,pool_1)
    await init_tick(tickMiddle+88,pool_1)
    await init_tick(tickMiddle+88+88,pool_1)
    await init_tick(tickMiddle+88+88+88,pool_1)
    await init_tick(tickMiddle+88+88+88+88,pool_1)
    let a_to_b_0=true
    let a_to_b_1=true
      let current_tick_0=await (await program.account.pool.fetch(pool)).tickCurrentIndex
      let current_tick_1=await (await program.account.pool.fetch(pool_1)).tickCurrentIndex
      
      let ticks_0=(await SwapUtils.getTickArrays(current_tick_0,TICK_SPACING_1,a_to_b_0,new PublicKey(metadata.address),pool,fetcher)).map(tick=>{
        return tick.address
      })
      
      let ticks_1=(await SwapUtils.getTickArrays(current_tick_1,TICK_SPACING_1,a_to_b_1,new PublicKey(metadata.address),pool_1,fetcher)).map(tick=>{
        return tick.address
      })
      
    try {
    const actualPrice = new Decimal(Math.sqrt(TOKEN_A_PER_TOKEN_B-200));
    const initSqrtPrice = MathUtil.toX64(actualPrice); 
    
    
    
    const tx = await program.methods.twoHopSwap(new bn("100000"),new bn("10000000000"),false,a_to_b_0,a_to_b_1,new bn(initSqrtPrice),new bn(initSqrtPrice)
    
      )
      .accounts({
        poolOne:pool,
        poolTwo:pool_1,
        tokenAuthority:wallet.publicKey,
        tokenOwnerAccountOneA:initializer_x_ata,
        tokenVaultOneA:vault_x_ata,
        tokenOwnerAccountOneB:initializer_y_ata,
        tokenVaultOneB:vault_y_ata,
        tokenOwnerAccountTwoA:initializer_y_ata,
        tokenVaultTwoA:vault_y_1_ata,
        tokenOwnerAccountTwoB:initializer_z_ata,
        tokenVaultTwoB:vault_z_ata,
        tickArrayOne0:ticks_0[0],
        tickArrayOne1:ticks_0[1],
        tickArrayOne2:ticks_0[2],
        tickArrayTwo0:ticks_1[0],
        tickArrayTwo1:ticks_1[1],
        tickArrayTwo2:ticks_1[2],
      })
      .signers([
        wallet,
        
      ]).rpc();
    } catch(e) {
      console.error(e);
    }
  
  });
//     it("logs", async () => {
//     let vault_x_ata_balance=await connection.getTokenAccountBalance(vault_x_ata);
//     let vault_y_ata_balance=await connection.getTokenAccountBalance(vault_y_ata);
    
    
//     console.log(vault_x_ata_balance);
//     console.log(vault_y_ata_balance);
    
    

//   })
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
//     it("logs", async () => {
//     let tick_upper=await (await program.account.position.fetch(position)).tickUpperIndex
//     const [tickArray,bump] = PublicKey.findProgramAddressSync([Buffer.from("tick_array"),pool.toBuffer(),Buffer.from(tick_upper.toString())],program.programId);

//     // console.log(x);
    
    

//   })


   async function init_tick( startTick: number,pool:PublicKey) {
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
  
  const ata = await createAccount(connection, minter, mint, minter.publicKey)

  const signature = await mintTo(connection, minter, mint, ata, minter, 21e12)
  await confirmTx(signature)
  return {
    mint,
    ata
  }
}
const tickCalculation =  (amount_based_b:any,tick_spacing:number)=> { 
    const base = 1.0001;
    const x = Math.log(amount_based_b) / Math.log(base);
    let tick=Math.round(x/tick_spacing) * tick_spacing
    return tick;

}

