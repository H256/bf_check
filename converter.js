const json2xls = require('json2xls')
const fs = require('fs')
const moment = require('moment')

// build a large array
let outArr = []
let files = fs.readdirSync('./output')
files = files.filter(item => item.indexOf('.json') > 0 && item.indexOf('concatenated') === -1)

console.log("Concatenating data to big JSON file...")
for (let i = 0; i < files.length; i++) {
  let fName = files[i]
  let fContent = fs.readFileSync('./output/' + fName)
  fContent = JSON.parse(fContent.toString())

  outArr = outArr.concat(fContent)
}

console.log('Writing output to JSON and Excel...')
if (outArr.length) {
  fs.writeFileSync('./output/_concatenated.json', JSON.stringify(outArr))
  let xls = json2xls(outArr)
  fs.writeFileSync('./output/_concatenated.xlsx', xls, 'binary')
}

console.log("Converting to Binance Format for Cointracking...")
if (outArr.length) {
  let ctArr = [];
  for (let i = 0; i < outArr.length; i++) {
    let {time, commission, commissionAsset, symbol, side, price, qty, quoteQty, realizedPnl} = outArr[i];
    let tmpObj = {
      "Date(UTC)": moment.utc(time).format('YYYY-MM-DD hh:mm:ss'),
      "Symbol": symbol,
      "Side": side,
      "Price": price,
      "Quantity": qty,
      "Amount": quoteQty,
      "Fee": commission,
      "Fee Coin": commissionAsset,
      "Realized Profit": realizedPnl,
      "Quote Asset": "USDT"
    }
    ctArr.push(tmpObj)
  }
  let xls = json2xls(ctArr)
  fs.writeFileSync('./output/_cointracking.xlsx', xls, 'binary')
}

console.log(files.length, "files parsed, total amount of entries:", outArr.length)
