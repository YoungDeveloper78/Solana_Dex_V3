import BN from "bn.js";
import {Decimal} from "decimal.js";
function swapQuoteByInputToken(amount :BN,liquidity:BN,sqrtPrice:BN):Decimal{
    let Amount=new Decimal(amount.toString())
    let amountX64=Amount.mul(new Decimal(2).pow(64))
    let res=new Decimal(amountX64).div(new Decimal(liquidity.toString())).round()
    
    let Ptarget=new Decimal(sqrtPrice.toString()).add(res);
    Ptarget=new Decimal(1).div(Ptarget)
    
    
    let SqrtPrice=new Decimal(1).div(new Decimal(sqrtPrice.toString()))
    let rawResult=Ptarget.sub(SqrtPrice)
    let Result=rawResult.mul(new Decimal(2).pow(64));
    Result=Result.mul(new Decimal(liquidity.toString()))
    return  Result;
}

function swapQuoteByOutputToken(amount :BN,liquidity:BN,sqrtPrice:BN):Decimal{
    let x64=new Decimal(2).pow(64)
    let liq64=new Decimal(liquidity.toString()).mul(x64)
    let res0=new Decimal(amount.toString()).div(liq64)
    let oneDsqrtPrice=new Decimal(1).div(new Decimal(sqrtPrice.toString()).toString())

    let final=res0.add(oneDsqrtPrice)
    let Ptarget=final.pow(-1);
    let rawAmount=Ptarget.sub(new Decimal(sqrtPrice.toString()))
    let rawResult=rawAmount.mul(new Decimal(liquidity.toString()))
    let finalResult=rawResult.div(x64)
    return finalResult

    

}
export default {swapQuoteByInputToken,swapQuoteByOutputToken};
