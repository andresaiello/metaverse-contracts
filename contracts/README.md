# roll-smart-contracts

Smart contracts built for Metaverse-ComicCon

# Instalation

`npm install`

### VSCode

VSCode is not familiar with the solidity language, so [`solidity support`](https://marketplace.visualstudio.com/items?itemName=JuanBlanco.solidity) needs to be installed.

```Bash
code --install-extension JuanBlanco.solidity
```

Having done that you should proceed to install [`prettier-vscode`](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode).

```Bash
code --install-extension esbenp.prettier-vscode
```

# Test

Run test:

```
npx hardhat test
```

# Run localhost

To run on localhost you should first start local node and then deploy to it

```
npx hardhat node
npx hardhat run scripts/deploy-dev.ts --network localhost
```

# Deploy

Deploy to any network is the same. After each deploy you can find the Json file with the Abi and address information.

```
npx hardhat run scripts/deploy.ts --network ropsten
```

or

```
npx hardhat run scripts/deploy.ts --network mainnet
```

# Upgrade

```
npx hardhat run scripts/upgrade-collector.ts --network ropsten
```

# Test upgrade

Now we can use the console

> npx hardhat console --network localhost

> const Box = await ethers.getContractFactory("MetaverseCollector")
> const box = await Box.attach("0x9A676e781A523b5d0C0e43731313A708CB607508")
> await box.ask()

# Extra (from old project...)

Now we can use the console

> npx hardhat console --network ropsten

> const Box = await ethers.getContractFactory("MetaverseCollector")
> const box = await Box.attach("0x9A676e781A523b5d0C0e43731313A708CB607508")
> await box.buy(1, "0xaD6D458402F60fD3Bd25163575031ACDce07538D", "0xaD6D458402F60fD3Bd25163575031ACDce07538D", 5, "0x23b9139bf4725429c12b316962327ce28a6905ccf951054c074d92ae7f564577", "4737171225420158270", "4737171225420158270", true, true, {value: 5000000000000000, gasLimit: 4000000})
> await box.getAmountToSell(1, {gasLimit: 4000000})
> await box.getBalance("0xaD6D458402F60fD3Bd25163575031ACDce07538D", {gasLimit: 4000000})
> await box.sell(1, "0xaD6D458402F60fD3Bd25163575031ACDce07538D", {gasLimit: 4000000})
> await box.sellAll("0xaD6D458402F60fD3Bd25163575031ACDce07538D", {gasLimit: 4000000})
> await box.addBot(["0xBad79d832671d91b4Bba85f600932FAeC0E5fD7c"], {gasLimit: 4000000})

> await box.getVictimBalance("0xBad79d832671d91b4Bba85f600932FAeC0E5fD7c", {gasLimit: 4000000})
> await box.hasEnoughETHBalance("0xBad79d832671d91b4Bba85f600932FAeC0E5fD7c", 4737171225420158270, 5000000000000000, {gasLimit: 4000000})
