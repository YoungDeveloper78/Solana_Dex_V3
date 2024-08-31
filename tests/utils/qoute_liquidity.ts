import {Decimal} from "decimal.js";
import {BN} from "bn.js";
function qoute_liquidity(liquidity:BigInt, current_price: number, lowerPrice: number, upperPrice: number):[bigint, bigint]  {
    let amount_x = BigInt(0);
    let amount_y = BigInt(0);

    
        if (current_price <= lowerPrice) {
            let numerator=new BN(Math.sqrt(upperPrice)).sub(new BN(Math.sqrt(lowerPrice))).mul(new BN(liquidity.toString()))
            
            let denominator = new BN(Math.sqrt(upperPrice)).mul(new BN(Math.sqrt(lowerPrice)))
            amount_x=BigInt(numerator.div(denominator).toString())
            amount_y=BigInt(0)
        } else if (current_price >= upperPrice) {
            let num=new BN(Math.sqrt(upperPrice)).sub(new BN(Math.sqrt(lowerPrice)))
            amount_y=BigInt(num.mul(new BN(liquidity.toString())).toString());
            amount_x=BigInt(0)
        } else if (lowerPrice < current_price && upperPrice > current_price) {
            let amount=(new Decimal(Math.sqrt(upperPrice)).sub(Math.sqrt(current_price)))
            let numerator=amount.mul(new Decimal(liquidity.toString()))
            let denominator=new Decimal(Math.sqrt(current_price)).mul(Math.sqrt(upperPrice))
            console.log(numerator);
            console.log(denominator);
            
            amount_x=BigInt(numerator.div(denominator).floor().toString())
            
            
            amount_y=BigInt(new Decimal(Math.sqrt(current_price)).sub(Math.sqrt(lowerPrice)).mul(new Decimal(liquidity.toString())).floor().toString())
        }

        return  [amount_x,amount_y];
    }


export default qoute_liquidity;
