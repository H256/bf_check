@echo off
echo FETCHTING TRADES FROM BINANCE FUTURES
echo *************************************
node index
echo *************************************
echo CONCATENATING AND CONVERTING
echo *************************************
node converter
echo *************************************