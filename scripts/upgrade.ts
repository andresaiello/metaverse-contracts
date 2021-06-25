import { ethers, network, upgrades } from "hardhat";
import { ContractDeployInfo, getDeployFileName } from "./tools";
const fs = require("fs");

const upgradeContract = async (
  contractName: string,
  currentDeploy: ContractDeployInfo
): Promise<ContractDeployInfo> => {
  const [deployer] = await ethers.getSigners();
  console.log(
    `Upgrading contract ${contractName} with the account: ${deployer.address}`
  );

  const balance = await deployer.getBalance();
  console.log(`Account balance: ${balance.toString()}`);

  const Token = await ethers.getContractFactory(contractName);
  const token = await upgrades.upgradeProxy(currentDeploy.address, Token);
  console.log(`Token address: ${token.address}`);

  const data: ContractDeployInfo = {
    contractName: currentDeploy.contractName,
    address: token.address,
    abi: JSON.parse(token.interface.format("json").toString()),
  };
  fs.writeFileSync(
    getDeployFileName(network.name, contractName),
    JSON.stringify(data)
  );

  return data;
};

const getCurrentDeploy = (contractName: string) => {
  const rawdata = fs.readFileSync(
    getDeployFileName(network.name, contractName)
  );
  const deployInfo: ContractDeployInfo = JSON.parse(rawdata);
  return deployInfo;
};

const main = async () => {
  const baseContractName = "SampleUpgradable";
  const currentDeploy = getCurrentDeploy(baseContractName);
  await upgradeContract("SampleUpgradableV2", currentDeploy);
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
