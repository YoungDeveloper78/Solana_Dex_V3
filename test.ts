
import {Decimal} from "Decimal.js";
function qoute_liquidity(liquidity:BigInt, current_price: number, lowerPrice: number, upperPrice: number):[Decimal, Decimal]  {
    let amount_x = new Decimal(0);
    let amount_y = new Decimal(0);

    
        if (current_price <= lowerPrice) {
            let numerator=new Decimal(Math.sqrt(upperPrice)).sub(new Decimal(Math.sqrt(lowerPrice))).mul(new Decimal(liquidity.toString()))
            
            let denominator = new Decimal(Math.sqrt(upperPrice)).mul(new Decimal(Math.sqrt(lowerPrice)))
            amount_x=numerator.div(denominator)
            
        } else if (current_price >= upperPrice) {
            let num=new Decimal(Math.sqrt(upperPrice)).sub(new Decimal(Math.sqrt(lowerPrice)))
            amount_y=num.mul(new Decimal(liquidity.toString()));
            
        } else if (lowerPrice < current_price && upperPrice > current_price) {
            let amount=(new Decimal(Math.sqrt(upperPrice)).sub(Math.sqrt(current_price)))
            let numerator=amount.mul(new Decimal(liquidity.toString()))
            let denominator=new Decimal(Math.sqrt(current_price)).mul(Math.sqrt(upperPrice))
            console.log(numerator);
            console.log(denominator);
            
            amount_x=numerator.div(denominator).floor()
            
            
            amount_y=new Decimal(Math.sqrt(current_price)).sub(Math.sqrt(lowerPrice)).mul(new Decimal(liquidity.toString())).floor()
        }

        return  [amount_x,amount_y];
    }

function calculateValue(amount_x: number, amount_y: number, current_price: number, lowerPrice: number, upperPrice: number,a_to_b:boolean): number {
    let result = 0;
    if (a_to_b) {
        
    
        if (current_price <= lowerPrice) {
            let numerator = Math.sqrt(lowerPrice) * Math.sqrt(upperPrice);
            let denominator = Math.sqrt(upperPrice) - Math.sqrt(lowerPrice);
            result = (numerator / denominator) * amount_x;
        } else if (current_price >= upperPrice) {
            amount_x=0
            let numerator = amount_y;
            let denominator = Math.sqrt(upperPrice) - Math.sqrt(lowerPrice);
            result = numerator / denominator;
        } else if (lowerPrice < current_price && upperPrice > current_price) {
            let numerator = Math.sqrt(current_price) * Math.sqrt(upperPrice) * amount_x;
            let denominator = Math.sqrt(upperPrice) - Math.sqrt(current_price);
            result = numerator / denominator;
        }

        return result = parseFloat(result.toFixed(6));
    }
    else{

        if (current_price <= lowerPrice) {
            let numerator = Math.sqrt(lowerPrice) * Math.sqrt(upperPrice);
            let denominator = Math.sqrt(upperPrice) - Math.sqrt(lowerPrice);
            result = (numerator / denominator) * amount_x;
        } else if (current_price >= upperPrice) {
            let numerator = new Decimal(amount_y)
            let denominator=new Decimal(Math.sqrt(current_price)).sub(new Decimal(Math.sqrt(lowerPrice)))
            result = numerator.div(denominator).toNumber();
        } else if (lowerPrice < current_price && upperPrice > current_price) {
            let numerator = new Decimal(amount_y)
            let denominator=new Decimal(Math.sqrt(current_price)).sub(new Decimal(Math.sqrt(lowerPrice)))
            result=numerator.div(denominator).toNumber()
            
        }

        return result = parseFloat(result.toFixed(6));
    }
}


let s=Math.floor(calculateValue(0,100000,0.004718905307259082, 0.004386039872823592,0.004503367368166559,false))
let s2=qoute_liquidity(BigInt(s), 0.004386039872823592, 0.004386039872823592,0.004503367368166559)
console.log(s2);
