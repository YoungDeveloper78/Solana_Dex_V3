
import { WhirlpoolContext } from "../sdk/src/context";
import { buildWhirlpoolClient } from "../sdk/src/whirlpool-client";
import { swapQuoteByInputToken,swapQuoteByOutputToken } from "../sdk/src/quotes/public/swap-quote";
import * as sdk from "../sdk/src/instructions/swap-ix";
import {WhirlpoolIx} from "../sdk/src/ix";
import {toTx} from "../sdk/src/utils/public/ix-utils";
import {PositionData} from "../sdk/src/types/public/anchor-types";
import {SwapUtils} from "../sdk/src/utils/public/swap-utils";
import {TickUtil} from "../sdk/src/utils/public/tick-utils";
import {PriceMath} from "../sdk/src/utils/public/price-math";

import { Instruction, TransactionBuilder } from "@orca-so/common-sdk";

import {buildDefaultAccountFetcher} from "../sdk/src/network/public/fetcher/fetcher-impl";
import {
  IGNORE_CACHE,
  
} from "../sdk/src//network/public/fetcher";
// import { pu } from "@orca-so/common-sdk";

let txs:TransactionBuilder
import * as anchor from "@coral-xyz/anchor";
import { BN, BN as bn } from "bn.js";
import { AnchorDex, IDL } from "../target/types/anchor_dex"
import { metadata } from "../target/idl/anchor_dex.json"
import { MathUtil,Percentage } from "@orca-so/common-sdk";
import {Decimal} from "Decimal.js";
import { increaseLiquidityQuoteByInputTokenWithParams,increaseLiquidityQuoteByInputToken } from "../sdk/src/quotes/public/increase-liquidity-quote";
import { PDAUtil } from "../sdk/src/utils/public/pda-utils";
import { TokenExtensionUtil,NO_TOKEN_EXTENSION_CONTEXT } from "../sdk/src/utils/public/token-extension-util";
import { PublicKey, Commitment, Keypair,Connection,Transaction, SystemProgram,ComputeBudgetProgram } from "@solana/web3.js"
import { ASSOCIATED_TOKEN_PROGRAM_ID as associatedTokenProgram,getMint,TOKEN_PROGRAM_ID as tokenProgram, createMint, createAccount, mintTo, getAssociatedTokenAddress, createAssociatedTokenAccount,TOKEN_PROGRAM_ID ,} from "@solana/spl-token"
import  compute_swap  from "../scripts/compute_swap";
import { readFileSync } from "fs";
import  get_next_sqrt_price  from "../scripts/get_next_sqrt_price";

import { computeSwap } from "../sdk/src/quotes/swap/swap-manager";
import { TickArraySequence } from "../sdk/src/quotes/swap/tick-array-sequence";


// import  get_next_initialized_tick_index  from "../scripts/get_next_tick";
import calculateValue from "./utils/calculateValue";
import quoter from "./utils/qouter";
import qoute_liquidity from "./utils/qoute_liquidity";
// get_next_initialized_tick_index
const commitment: Commitment = "confirmed"; // processed, confirmed, finalized
const MAX_TICK_INDEX = 443608;
const MIN_TICK_INDEX = -443608;
let tick_upper:number
let tick_lower:number
const TICK_ARRAY_SIZE=88
let a=2000000000000
let b=1000000
let res=Math.sqrt(a*b)
console.log(res);

// PDA
let connection= anchor.AnchorProvider.env().connection;


const TICK_SPACING_1 = 1
const FEE_TIER_100 = 100
const TOKEN_A_PER_TOKEN_B=2000

  anchor.setProvider(anchor.AnchorProvider.env());
  
  // let wallet=new Keypair()
  const wallet=Keypair.fromSecretKey(Buffer.from(JSON.parse(readFileSync("./id.json").toString())))

  
  let programID=new PublicKey(metadata.address)
  const program = new anchor.Program<AnchorDex>(IDL,programID , anchor.getProvider())

  const fetcher =  buildDefaultAccountFetcher(connection);

      const context =  WhirlpoolContext.withProvider(anchor.AnchorProvider.env(),program.programId,fetcher);
describe("anchor-amm-2023", () => {

  let config=new Keypair()
  
    const tickSpacingBuffer = new Uint8Array(2);
    tickSpacingBuffer.set([TICK_SPACING_1])
    const feeAccountPDA = PublicKey.findProgramAddressSync([Buffer.from("fee_tier"),config.publicKey.toBuffer(),Buffer.from(tickSpacingBuffer)],program.programId)[0];

  // Mints
  let mint_x: PublicKey;
  let mint_y: PublicKey;
  let tick_lower: number;
  let tick_upper: number;
  let tick_middle: PublicKey;
  let position: PublicKey;
  let positionTokenAccount:PublicKey;
  let pool : PublicKey;
  let pool_bump : number;
    
  let initializer_x_ata: PublicKey;
  let initializer_y_ata: PublicKey;
  
  let vault_x_ata: PublicKey;
  let vault_y_ata: PublicKey;
  
  
    
  it("Airdrop", async () => {
    await Promise.all([wallet, wallet].map(async (k) => {
      return await anchor.getProvider().connection.requestAirdrop(k.publicKey, 10000 * anchor.web3.LAMPORTS_PER_SOL)
    })).then(confirmTxs);
  });

  it("Create mints, tokens and ATAs", async () => {
    let u1= await newMintToAta(anchor.getProvider().connection, wallet,6)
    let u2= await newMintToAta(anchor.getProvider().connection, wallet,6)
    // let [ u1, u2 ,u3 ] = await Promise.all([wallet, wallet].map(async(a) => { return await newMintToAta(anchor.getProvider().connection, a) }))
    if (u2.mint.toBuffer()[0]>u1.mint.toBuffer()[0]){
      mint_x = u1.mint;
      initializer_x_ata = u1.ata;
      mint_y = u2.mint;
      initializer_y_ata = u2.ata;
    }else{
      mint_x = u2.mint;
      initializer_x_ata = u2.ata;
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

    vault_x_ata = PublicKey.findProgramAddressSync([Buffer.from("pool_vault"), pool.toBuffer(),mint_x.toBuffer()], program.programId)[0];
    vault_y_ata= PublicKey.findProgramAddressSync([Buffer.from("pool_vault"), pool.toBuffer(),mint_y.toBuffer()], program.programId)[0];
    let x_decimal=(await getMint(connection,mint_x)).decimals;
    let y_decimal=(await getMint(connection,mint_y)).decimals;
    let decimal_x=10**(x_decimal)
    let decimal_y=10**(y_decimal)
    let exact_price=TOKEN_A_PER_TOKEN_B*10**(y_decimal-x_decimal)
    let price=new Decimal(exact_price)
    const desiredMarketPrice = new Decimal(Math.sqrt(price.toNumber()));
    const initSqrtPrice = MathUtil.toX64(desiredMarketPrice); 

    console.log(initSqrtPrice.toString());
    console.log(pool);
    
    
    try {
      
      let instruction= WhirlpoolIx.initializePoolIx(program, {
          initSqrtPrice,
          tickSpacing: TICK_SPACING_1,
          tokenMintA:mint_x,
          tokenMintB:mint_y,
          tokenVaultA:vault_x_ata,
          tokenVaultB:vault_y_ata,
          pool:{publicKey:pool,bump:pool_bump},
          poolsConfig:config.publicKey,
          feeTierKey: feeAccountPDA,
          funder: wallet.publicKey,
        })
        txs=toTx(context,instruction)
        
      
                
            
            
        


     
     
    } catch(e) {
      console.error(e);
    }
  });
  it("Initialize pool tokens", async () => {
    let mint_y_data=await getMint(connection,mint_y)
    
    
    
    
    try {

      const ix = await program.methods.initializeTokensPool({poolBump:pool_bump},TICK_SPACING_1
      
      )
      .accounts({
        poolsConfig:config.publicKey,
        tokenMintA:mint_x,
        tokenMintB:mint_y,
        funder:wallet.publicKey,
        pool:pool,
        tokenVaultA:vault_x_ata,
        tokenVaultB:vault_y_ata,
        
      })
      .signers([
        wallet,
        
      ]).instruction();
      
      txs.addInstruction({
        instructions: [ix],
        cleanupInstructions: [],
        signers: [],
      })

      // await txs.buildAndExecute()
      
    } catch(e) {
      console.error(e);
    }
  });

  
  it("init ticks", async () => {
  
    let tickLower=MIN_TICK_INDEX
    let tickUpper=MAX_TICK_INDEX
  
    const [tickArrayLower,] = PublicKey.findProgramAddressSync([Buffer.from("tick_array"),pool.toBuffer(),Buffer.from(tickLower.toString())],program.programId);
    const [tickArrayUpper,] = PublicKey.findProgramAddressSync([Buffer.from("tick_array"),pool.toBuffer(),Buffer.from(tickUpper.toString())],program.programId);
    // tick_lower=tickArray
    try {
      const ix = await program.methods.initializeTickArray(MIN_TICK_INDEX)
      .accounts({
        funder:wallet.publicKey,
        tickArray:tickArrayLower,
        pool:pool,
      })
      .signers([
        wallet,
        
      ]).instruction();
      const ix2 = await program.methods.initializeTickArray(MAX_TICK_INDEX)
      .accounts({
        funder:wallet.publicKey,
        tickArray:tickArrayUpper,
        pool:pool,
      })
      .signers([
        wallet,
        
      ]).instruction();


   
      txs.addInstruction({
        instructions: [ix,ix2],
        cleanupInstructions: [],
        signers: [],
      })
      let tx=await txs.buildAndExecute()
      console.log(tx);
      
      
      
      
    } catch(e) {
      console.error(e);
    }
  });

  it("initTickArrayRange", async () => {
    const poolData=await program.account.pool.fetch(pool)
    console.log(poolData.tickCurrentIndex);
    const currentTickIndex=poolData.tickCurrentIndex-poolData.tickCurrentIndex%TICK_ARRAY_SIZE
    let tick_above_index=currentTickIndex + TICK_ARRAY_SIZE * TICK_SPACING_1*10
    let tick_bellow_index=currentTickIndex + (TICK_ARRAY_SIZE * TICK_SPACING_1*10)*(-1)
    tick_upper=tick_above_index
    tick_lower=tick_bellow_index
    const [tickArrayAbobe,] = PublicKey.findProgramAddressSync([Buffer.from("tick_array"),pool.toBuffer(),Buffer.from(tick_above_index.toString())],program.programId);
    const [tickArrayBellow,] = PublicKey.findProgramAddressSync([Buffer.from("tick_array"),pool.toBuffer(),Buffer.from(tick_bellow_index.toString())],program.programId);
    try {
      await program.account.tickArray.fetch(tickArrayAbobe) 
      await program.account.tickArray.fetch(tickArrayBellow) 
      }
      
    catch{

      await initTickArrayRange(pool,currentTickIndex,11,TICK_SPACING_1,false)
      await initTickArrayRange(pool,currentTickIndex,11,TICK_SPACING_1,true)
    }
    
  });
  

  // it("open position", async () => {
  //   // const poolData=await program.account.pool.fetch(pool)

  //   let mint=new Keypair()
  //   const [positionPda,bump] = PublicKey.findProgramAddressSync([Buffer.from("position"),mint.publicKey.toBuffer()],program.programId);
  //   position=positionPda
  //   let positionToken:PublicKey = await getAssociatedTokenAddress(mint.publicKey, wallet.publicKey, true, tokenProgram);
  //   positionTokenAccount=positionToken
  //   let x_decimal=(await getMint(connection,mint_x)).decimals;
  //   let y_decimal=(await getMint(connection,mint_y)).decimals;
  //   const currentTickIndex=PriceMath.sqrtPriceX64ToTickIndex(PriceMath.priceToSqrtPriceX64(new Decimal(TOKEN_A_PER_TOKEN_B),x_decimal,y_decimal))
  //   console.log("currentTickIndex",currentTickIndex);
    
  //   let tickLower=tick_lower ;
  //   let tickUpper=tick_upper;
  //   try {

  //     const tx = await program.methods.openPosition({positionBump:bump},tickLower,tickUpper

  //     )
  //     .accounts({
  //       funder:wallet.publicKey,
  //       owner:wallet.publicKey,
  //       positionMint:mint.publicKey,
  //       position:positionPda,
  //       positionTokenAccount:positionTokenAccount,
  //       pool:pool,
        
  //     })
  //     .signers([
  //       wallet,
  //       mint
  //     ]).rpc();
  //     await confirmTx(tx);
  //     console.log("Your transaction signature", tx);
  //   } catch(e) {
  //     console.error(e);
  //   }
  // });

it("open position", async () => {
    const client = buildWhirlpoolClient(context);
    const pool_account = await client.getPool(pool);
    const poolData = pool_account.getData();
    const poolTokenAInfo = pool_account.getTokenAInfo();
    const poolTokenBInfo = pool_account.getTokenBInfo();

    // Derive the tick-indices based on a human-readable price
    const tokenADecimal = poolTokenAInfo.decimals;
    const tokenBDecimal = poolTokenBInfo.decimals;
    const tickLower = MIN_TICK_INDEX
    const tickUpper = MAX_TICK_INDEX
    
    const quote = increaseLiquidityQuoteByInputToken(
      poolTokenAInfo.mint,
      new Decimal(50),
      tickLower,
      tickUpper,
      Percentage.fromFraction(1, 100),
      pool_account,
      NO_TOKEN_EXTENSION_CONTEXT
    );
    
    const {tokenMaxA, tokenMaxB} = quote

    // // Construct the open position & increase_liquidity ix and execute the transaction.
    const { positionMint, tx } = await pool_account.openPosition(
      tickLower,
      tickUpper,
      quote
    );
      const [positionPda,bump] = PublicKey.findProgramAddressSync([Buffer.from("position"),positionMint.toBuffer()],program.programId);
      position=positionPda
    const txId = await tx.buildAndExecute();

    console.log(txId);
    
  });

  it("add liquidity",async ()=>{
    
    
    try {
    const poolData=await program.account.pool.fetch(pool)

      let fetcher= buildDefaultAccountFetcher(connection)
      const context =  WhirlpoolContext.withProvider(anchor.AnchorProvider.env(),program.programId,fetcher);
      
      const client = buildWhirlpoolClient(context);
      console.log("position",position);
      
      const user_position=await client.getPosition(position)
      let positionData=user_position.getData()
      console.log(user_position);

    
      
      const quote = increaseLiquidityQuoteByInputTokenWithParams({
        inputTokenAmount: new BN(1000),
        inputTokenMint: mint_y,
        sqrtPrice: poolData.sqrtPrice,
        tokenMintA:mint_x,
        tokenMintB:mint_y,
        tickLowerIndex: (await positionData).tickLowerIndex,
        tickUpperIndex: (await positionData).tickUpperIndex,
        tickCurrentIndex: poolData.tickCurrentIndex,
        slippageTolerance: Percentage.fromFraction(5, 100),
        tokenExtensionCtx: NO_TOKEN_EXTENSION_CONTEXT, // TokenExtension is not related to this test
      }); 
      const tx=await (await user_position.increaseLiquidity(quote,true,wallet.publicKey,wallet.publicKey)).buildAndExecute()
      console.log(tx);
      


    } catch(e) {
      console.error(e);
    }

  })
  
//   // await user_position.collectFees()
  it("swap exact token for token", async () => {
    
    const fetcher =  buildDefaultAccountFetcher(connection);
  
    let a_to_b=true    
        const context =  WhirlpoolContext.withProvider(anchor.AnchorProvider.env(),program.programId,fetcher);
      const whirlpoolClient = buildWhirlpoolClient(context);
      const whirlpool = await whirlpoolClient.getPool(pool);
      // use getData or refreshData, depending on whether you think your data is stale.
      const whirlpoolData = await whirlpool.getData(); 

      const inputTokenQuote = await swapQuoteByInputToken(
        whirlpool,
        whirlpoolData.tokenMintB,
        new BN(190),
        Percentage.fromFraction(1, 1000), // 0.1%
        context.program.programId,
        fetcher
      );

// Send out the transaction
const txId = await (await whirlpool.swap(inputTokenQuote)).buildAndExecute();
console.log(txId)
  });

  it("swap  token for exact token", async () => {
    
    const fetcher =  buildDefaultAccountFetcher(connection);
  
    
        const context =  WhirlpoolContext.withProvider(anchor.AnchorProvider.env(),program.programId,fetcher);
      const whirlpoolClient = buildWhirlpoolClient(context);
      const whirlpool = await whirlpoolClient.getPool(pool);
      // use getData or refreshData, depending on whether you think your data is stale.
      const whirlpoolData = await whirlpool.getData(); 

      const inputTokenQuote = await swapQuoteByOutputToken(
        whirlpool,
        whirlpoolData.tokenMintB,
        new BN(190),
        Percentage.fromFraction(1, 1000), // 0.1%
        context.program.programId,
        fetcher
      );

      // Send out the transaction
      const txId = await (await whirlpool.swap(inputTokenQuote)).buildAndExecute();
      console.log(txId)
  });
  it("get fees",async ()=>{
    
    
    try {
    

      let fetcher=await buildDefaultAccountFetcher(connection)
      const context =  WhirlpoolContext.withProvider(anchor.AnchorProvider.env(),program.programId,fetcher);
      
      const client = buildWhirlpoolClient(context);
      
      const user_position =await client.getPosition(position)
      
  
    
      
      
      let x=await (
    await user_position.collectFees(true,undefined,wallet.publicKey,wallet.publicKey)
  
  ).buildAndExecute();
  console.log(x);
  

    } catch(e) {
      console.error(e);
    }

  })
  it("update protocol fee",async ()=>{
    
    
    try {
    

      let tx=await program.methods.setDefaultProtocolFeeRate(2500).accounts({
        poolsConfig:config.publicKey,
        feeAuthority:wallet.publicKey
      }).signers([wallet]).rpc()
      console.log(tx);
      
    } catch(e) {
      console.error(e);
    }

  })

//   it("add liquidity", async () => {
    
//     try {
//     const poolData=await program.account.pool.fetch(pool)

//       let fetcher=await buildDefaultAccountFetcher(connection)
//       const context =  WhirlpoolContext.withProvider(anchor.AnchorProvider.env(),program.programId,fetcher);
      
//       const client = buildWhirlpoolClient(context);
      
//       const user_position =await client.getPosition(position)
      
      
//     const positionData=await program.account.position.fetch(position)
//     let s=await getAssociatedTokenAddress(positionData.positionMint,wallet.publicKey)

//     console.log("positionTokenAccount",positionTokenAccount.toString());
//     console.log("s",s.toString());

    
      
//       const quote = increaseLiquidityQuoteByInputTokenWithParams({
//         inputTokenAmount: new BN(1000),
//         inputTokenMint: mint_y,
//         sqrtPrice: poolData.sqrtPrice,
//         tokenMintA:mint_x,
//         tokenMintB:mint_y,
//         tickLowerIndex: (await positionData).tickLowerIndex,
//         tickUpperIndex: (await positionData).tickUpperIndex,
//         tickCurrentIndex: poolData.tickCurrentIndex,
//         slippageTolerance: Percentage.fromFraction(5, 100),
//         tokenExtensionCtx: NO_TOKEN_EXTENSION_CONTEXT, // TokenExtension is not related to this test
//       }); 
//       await (
//     await user_position.increaseLiquidity(quote, true)
//   ).buildAndExecute();

// //       console.log(quote);
// //       await (
// //   await position.increaseLiquidity(increase_quote, ctx.wallet.publicKey, ctx.wallet.publicKey)
// // ).buildAndExecute();
      
      
//       // let value1=new bn(calculateValue(input,0,curent_price,lower_price,upper_price,true)).mul(new bn(10).pow(new bn(x_decimal)));
      
// // function getLiquidityFromInputToken(params: IncreaseLiquidityQuoteParam) {
      
//     //   let [amount_x,amount_y]=qoute_liquidity(BigInt(value1.toString()),curent_price,lower_price,upper_price)
//     //   let max_x=new BN(new Decimal(amount_x.toString()).mul(1.05).floor().toString())
//     //   let max_y=new BN(new Decimal(amount_y.toString()).mul(1.05).floor().toString())
      
      
      
//     //   const tx = await program.methods.increaseLiquidity(value1,max_x,max_y
      
//     //   )
//     //   .accounts({
//     //     pool:pool,
//     //     positionAuthority:wallet.publicKey,
//     //     position:position,
//     //     positionTokenAccount:positionTokenAccount,
//     //     tokenOwnerAccountA:initializer_x_ata,
//     //     tokenOwnerAccountB:initializer_y_ata,
//     //     tokenVaultA:vault_x_ata,
//     //     tokenVaultB:vault_y_ata,
//     //     tickArrayLower:tick_lower,
//     //     tickArrayUpper:tick_upper
        
//     //   })
//     //   .signers([
//     //     wallet,
        
//     //   ]).rpc();
//     //   await confirmTx(tx);
//     //   console.log("Your transaction signature", tx);
//     } catch(e) {
//       console.error(e);
//     }
//   });
  
// //   // it("logs", async () => {
// //   //   const poolData=await program.account.pool.fetch(pool)
// //   //     console.log("poolData.liquidity",poolData.liquidity.toString());
// //   //   let vault_x_ata_balance=await connection.getTokenAccountBalance(vault_x_ata);
// //   //   let vault_y_ata_balance=await connection.getTokenAccountBalance(vault_y_ata);
    
    
// //   //   console.log(vault_x_ata_balance);
// //   //   console.log(vault_y_ata_balance);
    
    

// //   // })
// //   // it("initTickArrayRange", async () => {
// //   //   const provider = anchor.AnchorProvider.env()
// //   //   const ctx = WhirlpoolContext.withProvider(provider,programID);
// //   //   const fetcher=ctx.fetcher
// //   //   const whirlpoolClient = buildWhirlpoolClient(ctx);
// //   //   // console.log(pool);
    
// //   //   const whirlpool = await whirlpoolClient.getPool(pool);
// //   //   // use getData or refreshData, depending on whether you think your data is stale.
// //   //   const whirlpoolData =  whirlpool.getData(); 
// //   //   // console.log(whirlpoolData);
    
// //   //   const inputTokenQuote = await swapQuoteByInputToken(
// //   //     whirlpool,
// //   //     whirlpoolData.tokenMintB,
// //   //     new BN(190),
// //   //     Percentage.fromFraction(1, 1000), // 0.1%
// //   //     ctx.program.programId,
// //   //     fetcher
// //   //   );
// //   //   console.log(inputTokenQuote);
    
// //   // });
  

//     //  let ticks=(await SwapUtils.getTickArrays(current_tick,TICK_SPACING_1,a_to_b,programID,pool,fetcher)).map(tick=>{
//     //     return tick.address
//     //   })
//     //   console.log(amount_max);
      

//     // try {
//     // const actualPrice = new Decimal(Math.sqrt(TOKEN_A_PER_TOKEN_B+200));
//     // const initSqrtPrice = MathUtil.toX64(actualPrice); 
    
    
//     //   const tx = await program.methods.swap(amount,new BN(amount_max.toString()),new bn(initSqrtPrice),true,a_to_b
//     //   )
//     //   .accounts({
//     //     pool:pool,
//     //     tokenAuthority:wallet.publicKey,
        
        
//     //     tokenOwnerAccountA:initializer_x_ata,
//     //     tokenOwnerAccountB:initializer_y_ata,
//     //     tokenVaultA:vault_x_ata,
//     //     tokenVaultB:vault_y_ata,
//     //     tickArray0:ticks[0],
//     //     tickArray1:ticks[1],
//     //     tickArray2:ticks[2],
        
//     //   })
//     //   .signers([
//     //     wallet,
        
//     //   ]).rpc();
      
//     //   await confirmTx(tx);
//     //   console.log("Your transaction signature", tx);

//     // } catch(e) {
//     //   console.error(e);
//     // }
  
//   // });

// //       it("logs", async () => {
// //     let vault_x_ata_balance=await connection.getTokenAccountBalance(vault_x_ata);
// //     let vault_y_ata_balance=await connection.getTokenAccountBalance(vault_y_ata);
    
    
// //     console.log(vault_x_ata_balance);
// //     console.log(vault_y_ata_balance);
    
    

// //   })
// //   it("quoter", async () => {
// //         const fetcher =  buildDefaultAccountFetcher(connection);
// //         const actualPrice = new Decimal(Math.sqrt(TOKEN_A_PER_TOKEN_B+200));
// //         const initSqrtPrice = MathUtil.toX64(actualPrice); 
        
// //         let a_to_b=true
// //         const pool_data=await program.account.pool.fetch(pool)
// //         let tickArrays= await SwapUtils.getTickArrays(
// //                 pool_data.tickCurrentIndex,
// //                 pool_data.tickSpacing,
// //                 a_to_b,
// //                 program.programId,
// //                 pool,
// //                 fetcher,
// //               ) ;
// //           let amount=new bn("1000000")
// //           const tickSequence = new TickArraySequence(tickArrays, pool_data.tickSpacing, a_to_b);
//           // let qoute=await computeSwap(pool_data,tickSequence,amount,initSqrtPrice,false,a_to_b)
// //           console.log("quote with fee = ", qoute.amountA.toString());
// //           console.log("quote with fee = ", qoute.amountB.toString());
// //           console.log(Math.pow(MathUtil.fromX64(pool_data.sqrtPrice).toNumber(),2));
// //           console.log(pool_data.tickCurrentIndex);
          
          

// //   })
// //   it("remove liquidity", async () => {

// //     try {
// //       const positionData=await program.account.position.fetch(position)
// //       let percentage=20
// //       let liquidity=positionData.liquidity.div(new BN(percentage))

// //       // let input=2
      
// //       // let curent_price=Math.pow(MathUtil.fromX64(poolData.sqrtPrice).toNumber(),2);
// //       // let value1=new bn(calculateValue(input,0,curent_price,1500,2500,true)).mul(new bn(10).pow(new bn(6)));
      
      
// //       const poolData=await program.account.pool.fetch(pool)
      
// //       const lowerPrice =  Math.pow(1.0001,positionData.tickLowerIndex);
// //       const upperPrice =Math.pow(1.0001,positionData.tickUpperIndex);
    
      
// //       let curent_price=Math.pow(MathUtil.fromX64(poolData.sqrtPrice).toNumber(),2);
// //       let [amount_x,amount_y]=qoute_liquidity(BigInt(liquidity.toString()),curent_price,lowerPrice,upperPrice)
// //       let min_x=new BN(new Decimal(amount_x.toString()).mul(0.95).floor().toString())
// //       let min_y=new BN(new Decimal(amount_y.toString()).mul(0.95).floor().toString())
      
// //       const tx = await program.methods.decreaseLiquidity(liquidity,min_x,min_y

// //       )
// //       .accounts({
// //         pool:pool,
// //         positionAuthority:wallet.publicKey,
// //         position:position,
// //         positionTokenAccount:positionTokenAccount,
// //         tokenOwnerAccountA:initializer_x_ata,
// //         tokenOwnerAccountB:initializer_y_ata,
// //         tokenVaultA:vault_x_ata,
// //         tokenVaultB:vault_y_ata,
// //         tickArrayLower:tick_lower,
// //         tickArrayUpper:tick_upper
        
// //       })
// //       .signers([
// //         wallet,
        
// //       ]).rpc();
// //       await confirmTx(tx);
// //       console.log("Your transaction signature", tx);
// //     } catch(e) {
// //       console.error(e);
// //     }
    
// //   });
// //     it("logs", async () => {
// //       const liquidity=(await program.account.pool.fetch(pool)).liquidity
// //       const vault_x=(await program.account.pool.fetch(pool)).tokenVaultA
// //       const vault_y=(await program.account.pool.fetch(pool)).tokenVaultB
// //       const sqrtPrice=(await program.account.pool.fetch(pool)).sqrtPrice
      

// //         const balance_x = (await connection.getTokenAccountBalance(vault_x)).value.amount;
// //         const balance_y = (await connection.getTokenAccountBalance(vault_y)).value.amount;
        
// //         console.log(liquidity.toString());
// //         console.log(balance_x.toString());
// //         console.log(balance_y.toString());
// //         let res=new BN(balance_x).mul(new BN(balance_y))
// //         console.log(Decimal.sqrt(res.toString()));
// //         console.log(MathUtil.fromX64(sqrtPrice));
        
    

// //   })


});


// //? Helpers
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

const newMintToAta = async (connection:Connection, minter: Keypair,decimal:number): Promise<{ mint: PublicKey, ata: PublicKey }> => { 
  const mint = await createMint(connection, minter, minter.publicKey, null, decimal)
  // await getAccount(connection, mint, commitment)
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


export async function initTickArrayRange(
  pool: PublicKey,
  startTickIndex: number,
  arrayCount: number,
  tickSpacing: number,
  aToB: boolean
): Promise<PDA[]> {
  const ticksInArray = tickSpacing * TICK_ARRAY_SIZE;
  
  const direction = aToB ? -1 : 1;
  const result: PDA[] = [];

  for (let i = 0; i < arrayCount; i++) {
    const pda = await init_tick(
      startTickIndex + direction * ticksInArray * i,
      pool
    );
  console.log(startTickIndex + direction * ticksInArray * i);

    if (pda) {
    
      result.push(pda);
    }
  }

  return result;
}


export type PDA = {
    publicKey: PublicKey;
    bump: number;
};


   async function init_tick( startTick: number|undefined,pool:PublicKey) :Promise<PDA | undefined>{
    if (startTick!=undefined) {
        
    
    const [tickArray,bump] = PublicKey.findProgramAddressSync([Buffer.from("tick_array"),pool.toBuffer(),Buffer.from(startTick.toString())],program.programId);
    try{
      try {
        await program.account.tickArray.fetch(tickArray) 
          return undefined
        }
        catch{
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
          return {publicKey:tickArray,bump:bump} as PDA
        }
      } catch(e) {
        console.error(e);
      }
    }
  
}

function tick_length(tick_spacing:number) {
  return MAX_TICK_INDEX*tick_spacing/88

  
}

// it("initTickArrayRange", async () => {
  //   const poolData=await program.account.pool.fetch(pool)
  //   console.log(poolData.tickCurrentIndex);
  //   const currentTickIndex=poolData.tickCurrentIndex-poolData.tickCurrentIndex%TICK_ARRAY_SIZE
  //   let tick_above_index=currentTickIndex + TICK_ARRAY_SIZE * TICK_SPACING_1*10
  //   let tick_bellow_index=currentTickIndex + (TICK_ARRAY_SIZE * TICK_SPACING_1*10)*(-1)
  //   tick_upper=tick_above_index
  //   tick_lower=tick_bellow_index
  //   const [tickArrayAbobe,] = PublicKey.findProgramAddressSync([Buffer.from("tick_array"),pool.toBuffer(),Buffer.from(tick_above_index.toString())],program.programId);
  //   const [tickArrayBellow,] = PublicKey.findProgramAddressSync([Buffer.from("tick_array"),pool.toBuffer(),Buffer.from(tick_bellow_index.toString())],program.programId);
  //   try {
  //     await program.account.tickArray.fetch(tickArrayAbobe) 
  //     await program.account.tickArray.fetch(tickArrayBellow) 
  //     }
      
  //   catch{

  //     await initTickArrayRange(pool,currentTickIndex,11,TICK_SPACING_1,false)
  //     await initTickArrayRange(pool,currentTickIndex,11,TICK_SPACING_1,true)
  //   }
    
  // });
  