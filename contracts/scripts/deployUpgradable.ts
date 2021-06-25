import { ethers, network, upgrades } from "hardhat";
import { Contract } from "@ethersproject/contracts";
import { ContractDeployInfo, getDeployFileName } from "./tools";
const fs = require("fs");

const deployContract = async (
  contractName: string,
  isUpgradable: boolean,
  ...params: any[]
): Promise<ContractDeployInfo> => {
  const [deployer] = await ethers.getSigners();
  console.log(
    `Deploying contract ${contractName} with the account: ${deployer.address}`
  );

  const balance = await deployer.getBalance();
  console.log(`Account balance: ${balance.toString()}`);

  const Token = await ethers.getContractFactory(contractName);

  let token: Contract;
  if (isUpgradable) {
    token = await upgrades.deployProxy(Token, [...params]);
  } else {
    token = await Token.deploy(...params);
  }

  console.log(`Token address: ${token.address}`);

  const data: ContractDeployInfo = {
    contractName,
    address: token.address,
    abi: JSON.parse(token.interface.format("json").toString()),
  };
  fs.writeFileSync(
    getDeployFileName(network.name, contractName),
    JSON.stringify(data)
  );
  return data;
};

const main = async () => {
  await deployContract("SampleUpgradable", true, "this is v1");
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
