import { ethers, network } from "hardhat";
import { solidity } from "ethereum-waffle";
import { BigNumber } from "@ethersproject/bignumber";
import { Order, getOrderSig, EmptyOrder, ZERO } from "../src/shared";
const chai = require("chai");
const { expect } = chai;
chai.use(solidity);

const FakeFee = 50;
const FakeAddress = "0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7";

describe("MetaverseItem contract", () => {
  let sellerOrder: Order = {
    ...EmptyOrder,
    sellAmount: "1",
    buyAmount: "4000",
    salt: 65654,
  };
  let sellerSig: any;

  let MetaverseItem,
    metaverseItem,
    MetaverseMarket,
    metaverseMarket,
    owner,
    addr1,
    addr2,
    addr3,
    addrs: any[];

  const tokenURI = "/bla/bla";
  const royalty = 100;

  const performBuy = async (buyer: any, order: Order) => {
    const buyerOrder = { ...order };
    buyerOrder.from = buyer.address;
    const buyerSig = await getOrderSig(buyerOrder, buyer);

    await metaverseMarket
      .connect(buyer)
      .buy(sellerOrder, sellerSig, buyerOrder, buyerSig, {
        value: order.buyAmount,
      });
    // Update sell order
    sellerOrder.from = buyer.address;
    sellerSig = await getOrderSig(sellerOrder, buyer);
  };

  const createNFT = async (creator) => {
    await metaverseMarket.connect(creator).createItem(tokenURI, royalty);

    const eventFilter = metaverseItem.filters.Transfer();
    const tokenInfo = await metaverseItem.queryFilter(eventFilter);

    expect(tokenInfo).not.to.be.undefined;
    const result = tokenInfo[0].args;
    expect(result.from).to.be.properAddress;
    expect(result.to).to.be.properAddress;

    // Update order and signature
    const tokenIdBN: BigNumber = result.tokenId;
    sellerOrder.from = creator.address;
    sellerOrder.sellAsset.token = metaverseItem.address;
    sellerOrder.sellAsset.tokenId = tokenIdBN.toNumber();

    sellerSig = await getOrderSig(sellerOrder, creator);
    return tokenIdBN;
  };

  beforeEach(async () => {
    [owner, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();
    MetaverseItem = await ethers.getContractFactory("MetaverseItem");
    metaverseItem = await MetaverseItem.deploy(FakeAddress, 1);

    const MetaverseWallet = await ethers.getContractFactory("MetaverseWallet");
    const metaverseTransactional = await MetaverseWallet.deploy();

    MetaverseMarket = await ethers.getContractFactory("MetaverseMarket");
    metaverseMarket = await MetaverseMarket.deploy();
    await metaverseMarket.initialize(
      metaverseItem.address,
      FakeFee,
      FakeAddress,
      metaverseTransactional.address
    );

    await metaverseTransactional.transferOwnership(metaverseMarket.address);

    await metaverseItem
      .connect(addr1)
      .setApprovalForAll(metaverseMarket.address, true);
    await metaverseItem
      .connect(addr2)
      .setApprovalForAll(metaverseMarket.address, true);
  });

  describe("True", () => {
    it("Should be true", async () => {
      expect(true).to.equal(true);
    });
  });

  describe("Create NFT", () => {
    it("Should create a NFT", async () => {
      const tokenURI = "/bla/bla";
      const royalty = 100;

      const createToken = metaverseMarket
        .connect(addr1)
        .createItem(tokenURI, royalty);

      await expect(createToken)
        .to.emit(metaverseItem, "Transfer")
        .withArgs(ZERO, addr1.address, []);
    });
  });

  describe("Buy logic", () => {
    it("Balance after buy", async () => {
      const tokenId = await createNFT(addr1);

      const balance11 = await ethers.provider.getBalance(FakeAddress);
      const balance12 = await ethers.provider.getBalance(addr1.address);

      await performBuy(addr2, sellerOrder);

      const balance21 = await ethers.provider.getBalance(FakeAddress);
      const balance22 = await ethers.provider.getBalance(addr1.address);

      // Collector fee 5%
      expect(balance21.sub(balance11)).to.be.equal(200);
      // Creator 10% but as is also the owner get all
      expect(balance22.sub(balance12)).to.be.equal(3800);

      // New owner is set ok
      expect(await metaverseItem.ownerOf(tokenId)).to.be.equal(addr2.address);
    });

    it("Balance after buying twice", async () => {
      const tokenId = await createNFT(addr1);
      await performBuy(addr2, sellerOrder);

      const initBalance1 = await ethers.provider.getBalance(FakeAddress);
      const initBalance2 = await ethers.provider.getBalance(addr1.address);
      const initBalance3 = await ethers.provider.getBalance(addr2.address);

      await performBuy(addr3, sellerOrder);

      const currBalance1 = await ethers.provider.getBalance(FakeAddress);
      const currBalance2 = await ethers.provider.getBalance(addr1.address);
      const currBalance3 = await ethers.provider.getBalance(addr2.address);
      // Collector fee 5%
      expect(currBalance1.sub(initBalance1)).to.be.equal(200);
      // Creator 10%
      expect(currBalance2.sub(initBalance2)).to.be.equal(400);
      // Previus owner 85%
      expect(currBalance3.sub(initBalance3)).to.be.equal(3400);
      // New owner is set ok
      expect(await metaverseItem.ownerOf(tokenId)).to.be.equal(addr3.address);
    });
  });

  describe("Bid logic", () => {
    it("Place a bid", async () => {
      const tokenId = await createNFT(addr1);

      const balance11 = await ethers.provider.getBalance(FakeAddress);
      const balance12 = await ethers.provider.getBalance(addr1.address);

      // place a bid
      // Generate buy order
      const buyerOrder = { ...sellerOrder };
      buyerOrder.from = addr2.address;
      const buyerSig = await getOrderSig(buyerOrder, addr2);

      await metaverseMarket.connect(addr2).placeBid(buyerOrder, {
        value: buyerOrder.buyAmount,
      });
      // Generate sell order
      sellerOrder.from = addr1.address;
      sellerSig = await getOrderSig(sellerOrder, addr1);

      await metaverseMarket
        .connect(addr1)
        .approveBid(sellerOrder, sellerSig, buyerOrder, buyerSig);

      const balance21 = await ethers.provider.getBalance(FakeAddress);
      const balance22 = await ethers.provider.getBalance(addr1.address);

      // Collector fee 5%
      expect(balance21.sub(balance11)).to.be.equal(200);
      // Creator 10% but as is also the owner get all
      expect(balance22.sub(balance12)).to.be.equal(3800);

      // New owner is set ok
      expect(await metaverseItem.ownerOf(tokenId)).to.be.equal(addr2.address);
    });

    it("Place a bid not enogth money", async () => {
      const tokenId = await createNFT(addr1);
      // place a bid
      // Generate buy order
      const buyerOrder = { ...sellerOrder };
      buyerOrder.from = addr2.address;

      const value = BigNumber.from(buyerOrder.buyAmount)
        .sub(BigNumber.from("1"))
        .toString();

      await expect(
        metaverseMarket.connect(addr2).placeBid(buyerOrder, {
          value,
        })
      ).to.be.reverted;
    });

    it("Try to buy a cancelled order", async () => {
      const tokenId = await createNFT(addr1);

      const balance12 = await ethers.provider.getBalance(addr2.address);

      // place a bid
      // Generate buy order
      const buyerOrder = { ...sellerOrder };
      buyerOrder.from = addr2.address;
      const buyerSig = await getOrderSig(buyerOrder, addr2);

      await metaverseMarket.connect(addr2).placeBid(buyerOrder, {
        value: buyerOrder.buyAmount,
      });

      // cancel the order
      await metaverseMarket.connect(addr2).cancelBid(buyerOrder);

      // Generate sell order
      sellerOrder.from = addr1.address;
      sellerSig = await getOrderSig(sellerOrder, addr1);

      await expect(
        metaverseMarket
          .connect(addr1)
          .approveBid(sellerOrder, sellerSig, buyerOrder, buyerSig)
      ).to.be.revertedWith("MetaverseMarket: Bid not found");

      // all money was refound
      const balance22 = await ethers.provider.getBalance(addr2.address);
      expect(balance12).to.be.equal(balance22);
    });

    it("Try to buy an order from someone else", async () => {
      const tokenId = await createNFT(addr1);

      const balance12 = await ethers.provider.getBalance(addr2.address);

      // place a bid
      // Generate buy order
      const buyerOrder = { ...sellerOrder };
      buyerOrder.from = addr2.address;

      await metaverseMarket.connect(addr2).placeBid(buyerOrder, {
        value: buyerOrder.buyAmount,
      });

      // Generate sell order and update buy order
      buyerOrder.from = addr3.address;
      const buyerSig = await getOrderSig(buyerOrder, addr3);

      sellerOrder.from = addr1.address;
      sellerSig = await getOrderSig(sellerOrder, addr1);

      await expect(
        metaverseMarket
          .connect(addr1)
          .approveBid(sellerOrder, sellerSig, buyerOrder, buyerSig)
      ).to.be.revertedWith("MetaverseMarket: Wrong buyer");
    });

    it("Replace a bid", async () => {
      const tokenId = await createNFT(addr1);

      const balance11 = await ethers.provider.getBalance(FakeAddress);
      const balance12 = await ethers.provider.getBalance(addr1.address);
      const balance13 = await ethers.provider.getBalance(addr2.address);

      // place a bid
      // Generate buy order
      const buyerOrder = { ...sellerOrder };
      buyerOrder.from = addr2.address;
      buyerOrder.buyAmount = BigNumber.from(buyerOrder.buyAmount)
        .sub(BigNumber.from("1"))
        .toString();
      await metaverseMarket.connect(addr2).placeBid(buyerOrder, {
        value: buyerOrder.buyAmount,
      });

      // replace the bid
      buyerOrder.from = addr3.address;
      buyerOrder.buyAmount = BigNumber.from(buyerOrder.buyAmount)
        .add(BigNumber.from("1"))
        .toString();
      const buyerSig = await getOrderSig(buyerOrder, addr3);

      await metaverseMarket.connect(addr3).placeBid(buyerOrder, {
        value: buyerOrder.buyAmount,
      });
      // Generate sell order
      sellerOrder.from = addr1.address;
      sellerSig = await getOrderSig(sellerOrder, addr1);

      await metaverseMarket
        .connect(addr1)
        .approveBid(sellerOrder, sellerSig, buyerOrder, buyerSig);

      const balance21 = await ethers.provider.getBalance(FakeAddress);
      const balance22 = await ethers.provider.getBalance(addr1.address);
      const balance23 = await ethers.provider.getBalance(addr2.address);

      // Collector fee 5%
      expect(balance21.sub(balance11)).to.be.equal(200);
      // Creator 10% but as is also the owner get all
      expect(balance22.sub(balance12)).to.be.equal(3800);

      // addr2 bid was replace so he was refound
      expect(balance23.sub(balance13)).to.be.equal(0);

      // New owner is set ok
      expect(await metaverseItem.ownerOf(tokenId)).to.be.equal(addr3.address);
    });

    it("Try to place a bid after another was cancelled", async () => {
      const tokenId = await createNFT(addr1);

      const balance12 = await ethers.provider.getBalance(addr2.address);

      // place a bid
      // Generate buy order
      const buyerOrder = { ...sellerOrder };
      buyerOrder.from = addr2.address;

      await metaverseMarket.connect(addr2).placeBid(buyerOrder, {
        value: buyerOrder.buyAmount,
      });

      // cancel the order
      await metaverseMarket.connect(addr2).cancelBid(buyerOrder);

      buyerOrder.from = addr3.address;
      buyerOrder.buyAmount = BigNumber.from(buyerOrder.buyAmount)
        .sub(BigNumber.from("1"))
        .toString();

      const buyerSig = await getOrderSig(buyerOrder, addr3);

      await metaverseMarket.connect(addr3).placeBid(buyerOrder, {
        value: buyerOrder.buyAmount,
      });

      // Generate sell order
      sellerOrder.from = addr1.address;
      sellerOrder.buyAmount = buyerOrder.buyAmount;
      sellerSig = await getOrderSig(sellerOrder, addr1);

      await metaverseMarket
        .connect(addr1)
        .approveBid(sellerOrder, sellerSig, buyerOrder, buyerSig);

      // all money was refound
      const balance22 = await ethers.provider.getBalance(addr2.address);
      expect(balance12).to.be.equal(balance22);

      // New owner is set ok
      expect(await metaverseItem.ownerOf(tokenId)).to.be.equal(addr3.address);
    });
  });
});
