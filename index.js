require('dotenv').config()
const crypto = require('crypto')
const axios = require("axios")
const querystring = require('querystring')
const moment = require('moment')
const fs = require('fs').promises
const fs2 = require('fs')

/**
 * Sign an api request with HMAC - SHA256 for Binance Futures
 * @param queryString
 * @returns {string}
 */
const signRequest = (queryString) => {
  return crypto
    .createHmac('sha256', process.env.API_SECRET)
    .update(queryString)
    .digest('hex')
}

// setup axios defaults
axios.defaults.baseURL = 'https://fapi.binance.com'
axios.defaults.headers.common['X-MBX-APIKEY'] = process.env.API_KEY

// rate limiter
let limit = 2400
let buffer = 25
let weight = 5
let weighted = limit / weight
let delay = 60000 / weighted + (weighted * (buffer / 100))

// warnings for coins with more then 1000 entries per day
const warnings = []

// setup starting date
let checkDate = moment(process.env.START_AT || '2020-01-01').startOf('day')
let currentDate = moment()

/**
 * Get Binance Futures exchange info
 * We use this to get all symbols for looking them up through the api
 * @returns {Promise<any>}
 */
const getExchangeInfo = async () => {
  let {data} = await axios.get('fapi/v1/exchangeInfo')
  return data
}

/**
 * Fetch Trading history day by day from today to a certain start date for all symbols
 * @returns {Promise<void>}
 */
const getData = async () => {
  // setup symbols to fetch (by API)
  let eInfo = await getExchangeInfo()
  let symbols = eInfo.symbols.map(item => item.symbol)

  // check for a lastLoad file and parse it
  if (await fileExists('lastLoad.txt')) {
    let f = await fs.readFile('lastLoad.txt')
    checkDate = moment.unix(parseInt(f.toString())).startOf('day')
  }

  // loop from now downwards to last load or initial check date
  while (checkDate < currentDate) {
    let startTime = currentDate.startOf('day').valueOf()
    let endTime = currentDate.endOf('day').valueOf()
    let emptyCalls = []

    // log some stuff
    console.log('*'.repeat(40))
    console.log('Checking for records on ', currentDate.format('YYYY-MM-DD'))
    console.log('*'.repeat(40))

    // get each symbol
    for (let i = 0; i < symbols.length; i++) {
      let symbol = symbols[i]

      let fileName = `${symbol}_${currentDate.format('YYYY-MM-DD')}.json`
      let exists = await fileExists('./output/' + fileName)

      // always load today!
      if (currentDate.diff(moment(), 'days') !== 0) {
        if (exists) {
          console.log(`${fileName} already is there. Skipping query.`)
          continue;
        }
      }

      let query = {
        symbol,
        startTime,
        endTime,
        limit: 1000,
        timestamp: moment().valueOf()
      }

      let qs = querystring.stringify(query)
      query.signature = signRequest(qs)

      let {data} = await axios.get('fapi/v1/userTrades', {params: query})

      if (data && data.length > 0) {
        console.log(`Got data for ${symbol} with ${data.length} trades.`)
        if (data.length === 1000) {
          warnings.push(`LIMIT found! (1000 Records) - ${symbol}, ${currentDate.format('YYYY-MM-DD')}`)
        }
        // create a file for each day and symbol
        await fs.writeFile('./output/' + fileName, JSON.stringify(data, null, 2))
      } else {
        emptyCalls.push(symbol)
      }
      await waitMillis(delay)
    }
    console.log('*'.repeat(40))
    console.log('No records found for these symbols:', emptyCalls.join(', '))
    console.log('*'.repeat(40))
    // count down one day
    currentDate.add(-1, 'days')
  }

  // output warnings if there were some
  if (warnings.length) {
    await fs.writeFile('./warnings.txt', warnings.join('\n'))
  }
  // output last load date to speedup future loads (incremental)
  await fs.writeFile('./lastLoad.txt', moment().add(-1, 'days').startOf('day').unix())
}

/**
 * Wait a certain amount of milliseconds in an Async manner (awaitable)
 * @param millis
 * @returns {Promise<any>}
 */
const waitMillis = async (millis) => {
  return new Promise((resolve) => {
    setTimeout(resolve, millis)
  })
}

/**
 * check for file existence
 * @param file
 * @returns {Promise<unknown>}
 */
const fileExists = (file) => {
  // TODO: REFACTOR to use Promises provided by NodeJS 14
  return new Promise((resolve) => {
    fs2.access(file, fs2.constants.F_OK, (err) => {
      err ? resolve(false) : resolve(true)
    });
  })
}

// Start the magic!
getData()
  .then(() => console.log("DONE!"))
  .catch((err) => console.error(err))
