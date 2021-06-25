import { ethers, network, upgrades } from "hardhat";
import { ContractDeployInfo, getCurrentDeploy, saveDeployInfo } from "./tools";

const main = async () => {
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying with the account: ${deployer.address}`);

  const currentDeploy = getCurrentDeploy("MetaverseCollector");

  const Token = await ethers.getContractFactory("MetaverseCollector");
  const token = await upgrades.upgradeProxy(currentDeploy.address, Token);

  const data: ContractDeployInfo = {
    contractName: currentDeploy.contractName,
    address: token.address,
    abi: JSON.parse(token.interface.format("json").toString()),
  };
  saveDeployInfo(network.name, data);

  console.log(`Token address: ${token.address}`);
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
