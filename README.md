# Binance Futures API Trade Data Fetcher

This script incrementally downloads all trades from the current day back to a given starting date.
To use:
- clone this repo
- `npm install`
- create a folder named `output`
- `cp .env.example .env` and fill in the fields
- if you want to start fresh, delete lastLoad.txt
- run `node index.js` - it should fetch trade data for all possible pairs on BF.
