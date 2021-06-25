import { ethers, network } from "hardhat";
import { getCurrentDeploy, deployContract, sendEth } from "./tools";

const metaverseFee = 50;
const virtualNetworkIdMap = {
  ["mainnet"]: 1, // MAINNET
  ["ropsten"]: 3, // ROPSTEN
  ["rinkeby"]: 4, // RINKEBY
  ["bscmainnet"]: 5, // BSC
  ["bsctestnet"]: 6, // BSCTEST
};

export const deployContracts = async () => {
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying with the account: ${deployer.address}`);

  const totalSupply = "32000000000000000000000";
  // const token = await deployContract("MetaverseToken", [totalSupply]);
  // const token = getCurrentDeploy("MetaverseToken");

  const store = await deployContract(
    "MetaverseWallet",
    [],
    false,
    "WalletStore"
  );

  const treasure = await deployContract(
    "MetaverseWallet",
    [],
    false,
    "WalletTreasure"
  );

  const transactional = await deployContract(
    "MetaverseWallet",
    [],
    false,
    "WalletTransactional"
  );

  // const networkVirtualId = virtualNetworkIdMap[network.name];
  // await deployContract(
  //   "MetaverseItem",
  //   [token.address, networkVirtualId],
  //   false
  // );

  await deployContract("MetaverseCollector", [], false);

  await deployContract("MetaverseMarket", [], false);

  console.log("all contracts succesfully deployed");
};

export const postDeploy = async () => {
  const item = getCurrentDeploy("MetaverseItem");
  const store = getCurrentDeploy("WalletStore");
  const treasure = getCurrentDeploy("WalletTreasure");
  const transactional = getCurrentDeploy("WalletTransactional");
  const token = getCurrentDeploy("MetaverseToken");
  const collector = getCurrentDeploy("MetaverseCollector");
  const market = getCurrentDeploy("MetaverseMarket");

  // Init -> this is no needed if was deployed as upgradable
  const MetaverseMarket = await ethers.getContractFactory(market.contractName);
  const metaverseMarket = await MetaverseMarket.attach(market.address);
  await metaverseMarket.initialize(
    item.address,
    metaverseFee,
    store.address,
    transactional.address
  );

  const MetaverseCollector = await ethers.getContractFactory(
    collector.contractName
  );
  const metaverseCollector = await MetaverseCollector.attach(collector.address);
  await metaverseCollector.initialize(
    token.address,
    store.address,
    treasure.address
  );

  // ===============

  // Transfer ownership
  const MetaverseStore = await ethers.getContractFactory(store.contractName);
  const metaverseStore = await MetaverseStore.attach(store.address);
  await metaverseStore.transferOwnership(collector.address);

  const MetaverseTreasure = await ethers.getContractFactory(
    treasure.contractName
  );
  const metaverseTreasure = await MetaverseTreasure.attach(treasure.address);
  await metaverseTreasure.transferOwnership(collector.address);

  const MetaverseTransactional = await ethers.getContractFactory(
    transactional.contractName
  );
  const metaverseTransactional = await MetaverseTransactional.attach(
    transactional.address
  );
  await metaverseTransactional.transferOwnership(market.address);
  // Set collector to token
  const MetaverseToken = await ethers.getContractFactory(token.contractName);
  const metaverseToken = await MetaverseToken.attach(token.address);
  await metaverseToken.setCollector(collector.address);
  console.log("post deploy routine done");
};

export const fundContracts = async (
  amount: string,
  contracts: string[],
  deployerPrivateKey: string
) => {
  const p = contracts.map((e) => {
    const addressTo = e;
    let wallet = new ethers.Wallet(deployerPrivateKey);
    return sendEth(wallet, amount, addressTo);
  });

  await Promise.all(p);
};
