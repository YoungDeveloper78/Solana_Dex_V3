import {Decimal} from "decimal.js";
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


export default calculateValue;
