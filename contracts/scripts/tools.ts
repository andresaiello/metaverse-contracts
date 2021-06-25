//@ts-ignore
import { ethers, network, upgrades, DeployOptions } from "hardhat";
import { Contract } from "@ethersproject/contracts";
const { BigNumber, utils } = ethers;
const fs = require("fs");

export const deployContract = async (
  contractName: string,
  params: any[] = [],
  isUpgradable: boolean = false,
  contractAlias?: string,
  lib?: any
): Promise<ContractDeployInfo> => {
  console.log(`Deploying contract ${contractName}`);

  const Token = await ethers.getContractFactory(contractName, lib);

  const opt: DeployOptions = lib
    ? {
        unsafeAllow: ["external-library-linking"],
      }
    : undefined;

  let token: Contract;
  if (isUpgradable) {
    token = await upgrades.deployProxy(Token, [...params], opt);
  } else {
    token = await Token.deploy(...params);
  }

  console.log(`Contract address: ${token.address}`);

  const data: ContractDeployInfo = {
    contractName,
    contractAlias,
    address: token.address,
    abi: JSON.parse(token.interface.format("json").toString()),
  };
  saveDeployInfo(network.name, data);
  return data;
};

export interface ContractDeployInfo {
  contractName: string;
  contractAlias?: string;
  address: string;
  abi: string;
}

export const getDeployFileName = (network: string, contractName: string) =>
  `deploy/${network}/${contractName}.json`;

export const getCurrentDeploy = (contractName: string) => {
  return getCurrentDeployByNetwork(network.name, contractName);
};

export const getCurrentDeployByNetwork = (
  network: string,
  contractName: string
) => {
  const rawdata = fs.readFileSync(getDeployFileName(network, contractName));
  const deployInfo: ContractDeployInfo = JSON.parse(rawdata);
  return deployInfo;
};

export const saveDeployInfo = (
  network: string,
  contractInfo: ContractDeployInfo
) => {
  fs.writeFileSync(
    getDeployFileName(
      network,
      contractInfo.contractAlias ?? contractInfo.contractName
    ),
    JSON.stringify(contractInfo)
  );
};

export const sendEth = async (wallet: any, eth: string, to: string) => {
  const { provider } = ethers;
  const nonce = await provider.getTransactionCount(wallet.address);
  console.log(`Sending ${eth} to ${to}`);
  const transaction = {
    nonce,
    gasLimit: 41000,
    gasPrice: BigNumber.from("20000000000"),
    to,
    value: utils.parseEther(eth),
    data: "0x",
  };

  const signedTransaction = await wallet.signTransaction(transaction);

  // This can now be sent to the Ethereum network
  await provider.sendTransaction(signedTransaction);
};
