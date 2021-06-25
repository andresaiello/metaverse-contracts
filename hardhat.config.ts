import * as dotenv from "dotenv";
dotenv.config({ path: __dirname + "/.env" });
// hardhat.config.js
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-ethers";
import "@openzeppelin/hardhat-upgrades";
import "hardhat-preprocessor";
import { removeConsoleLog } from "hardhat-preprocessor";

const INFURA_KEY = `${process.env.INFURA_KEY || "SOME_KEY"}`;
const PRIVATE_KEY = `${
  process.env.PRIVATE_KEY ||
  "0000000000000000000000000000000000000000000000000000000000000000"
}`;

/**
 * @type import('hardhat/config').HardhatUserConfig
 */

export default {
  preprocess: {
    eachLine: removeConsoleLog(
      (hre) =>
        hre.network.name !== "hardhat" && hre.network.name !== "localhost"
    ),
  },
  solidity: "0.8.2",
  networks: {
    hardhat: {
      gasPrice: 0,
    },
    // https://docs.hecochain.com/#/en-us/testnet
    hecotestnet: {
      url: `https://http-testnet.hecochain.com`,
      accounts: [`0x${PRIVATE_KEY}`],
      gas: 121000000000000,
      gasPrice: 10000000000,
      networkId: 256,
    },
    hecomainnet: {
      url: `https://http-mainnet.hecochain.com`,
      accounts: [`0x${PRIVATE_KEY}`],
      gas: 29,
      gasPrice: 1,
      networkId: 128,
    },
    // https://academy.binance.com/es/articles/connecting-metamask-to-binance-smart-chain
    // https://docs.binance.org/smart-chain/developer/deploy/hardhat.html
    bsctestnet: {
      url: `https://data-seed-prebsc-1-s1.binance.org:8545/`,
      accounts: [`0x${PRIVATE_KEY}`],
      // gas: 121000000000000,
      gasPrice: 20000000000,
      networkId: 97,
    },
    bscmainnet: {
      url: `https://bsc-dataseed.binance.org`,
      accounts: [`0x${PRIVATE_KEY}`],
      // gas: 8000000,
      gasPrice: 20000000000,
      networkId: 56,
    },
    ropsten: {
      url: `https://ropsten.infura.io/v3/${INFURA_KEY}`,
      accounts: [`0x${PRIVATE_KEY}`],
      gas: 8000000,
      gasPrice: 2000000000,
    },
    mainnet: {
      url: `https://mainnet.infura.io/v3/${INFURA_KEY}`,
      accounts: [`0x${PRIVATE_KEY}`],
      gas: 800000000000,
      gasPrice: 80000000000,
    },

    // hardhat: {
    //   mnemonic:
    //     "myth like bonus scare over problem client lizard pioneer submit female collect",
    //   accounts: [
    //     {
    //       privateKey:
    //         "0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d",
    //       balance: "100000000000000000000",
    //     },
    //     {
    //       privateKey:
    //         "0x6cbed15c793ce57650b9877cf6fa156fbef513c4e6134f022a85b1ffdd59b2a1",
    //       balance: "100000000000000000000",
    //     },
    //     {
    //       privateKey:
    //         "0x6370fd033278c143179d81c5526140625662b8daa446c22ee2d73db3707e620c",
    //       balance: "100000000000000000000",
    //     },
    //     {
    //       privateKey:
    //         "0x646f1ce2fdad0e6deeeb5c7e8e5543bdde65e86029e2fd9fc169899c440a7913",
    //       balance: "100000000000000000000",
    //     },
    //     {
    //       privateKey:
    //         "0xadd53f9a7e588d003326d1cbf9e4a43c061aadd9bc938c843a79e7b4fd2ad743",
    //       balance: "100000000000000000000",
    //     },
    //     {
    //       privateKey:
    //         "0x395df67f0c2d2d9fe1ad08d1bc8b6627011959b79c53d7dd6a3536a33ab8a4fd",
    //       balance: "100000000000000000000",
    //     },
    //   ],
    // },
  },
};
