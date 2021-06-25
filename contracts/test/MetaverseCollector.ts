import { ethers, upgrades } from "hardhat";
import { solidity } from "ethereum-waffle";
import { BigNumber } from "@ethersproject/bignumber";
import { Order, getOrderSig, EmptyOrder } from "../src/shared";

const chai = require("chai");
const { expect } = chai;
chai.use(solidity);

const FakeFee = 50;
const FakeInitialSupply = 10000;

describe("MetaverseCollector contract", () => {
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
    MetaverseToken,
    metaverseToken,
    MetaverseStore,
    metaverseStore,
    MetaverseTreasure,
    metaverseTreasure,
    MetaverseCollector,
    metaverseCollector,
    owner,
    addr1,
    addr2,
    addr3,
    addr4,
    addr5,
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
    const tx = await metaverseMarket
      .connect(creator)
      .createItem(tokenURI, royalty);

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
    [owner, addr1, addr2, addr3, addr4, addr5, ...addrs] =
      await ethers.getSigners();
    MetaverseToken = await ethers.getContractFactory("MetaverseToken");
    metaverseToken = await MetaverseToken.deploy(FakeInitialSupply);

    MetaverseStore = await ethers.getContractFactory("MetaverseWallet");
    metaverseStore = await MetaverseStore.deploy();

    MetaverseTreasure = await ethers.getContractFactory("MetaverseWallet");
    metaverseTreasure = await MetaverseTreasure.deploy();

    MetaverseCollector = await ethers.getContractFactory("MetaverseCollector");
    metaverseCollector = await MetaverseCollector.deploy();
    await metaverseCollector.initialize(
      metaverseToken.address,
      metaverseStore.address,
      metaverseTreasure.address
    );

    MetaverseItem = await ethers.getContractFactory("MetaverseItem");
    metaverseItem = await MetaverseItem.deploy(metaverseToken.address, 1);

    const MetaverseWallet = await ethers.getContractFactory("MetaverseWallet");
    const metaverseTransactional = await MetaverseWallet.deploy();

    MetaverseMarket = await ethers.getContractFactory("MetaverseMarket");
    metaverseMarket = await MetaverseMarket.deploy();
    await metaverseMarket.initialize(
      metaverseItem.address,
      FakeFee,
      metaverseStore.address,
      metaverseTransactional.address
    );
    await metaverseTransactional.transferOwnership(metaverseMarket.address);

    await metaverseItem
      .connect(addr1)
      .setApprovalForAll(metaverseMarket.address, true);
    await metaverseItem
      .connect(addr2)
      .setApprovalForAll(metaverseMarket.address, true);

    await metaverseStore.transferOwnership(metaverseCollector.address);
    await metaverseTreasure.transferOwnership(metaverseCollector.address);
    await metaverseToken.setCollector(metaverseCollector.address);
  });

  describe("True", () => {
    it("Should be true", async () => {
      expect(true).to.equal(true);
    });
  });

  describe("Distribute profits", () => {
    it("Distribute profits after buying twice", async () => {
      const tokenId = await createNFT(addr1);

      await performBuy(addr2, sellerOrder);

      await performBuy(addr3, sellerOrder);

      // At the beginning the owner have all the tokens
      const ownerBalance = await metaverseToken.balanceOf(owner.address);
      expect(await metaverseToken.totalSupply()).to.equal(ownerBalance);
      //  Let's transfer 50% to addr4
      await metaverseToken.transfer(addr4.address, FakeInitialSupply / 2);
      expect(await metaverseToken.balanceOf(addr4.address)).to.equal(
        FakeInitialSupply / 2
      );

      // Contract has 400 ETH because each buy gives 200
      expect(await ethers.provider.getBalance(metaverseStore.address)).to.equal(
        400
      );

      const initBalance = await ethers.provider.getBalance(addr4.address);

      await metaverseCollector.distributeProfits();
      await metaverseCollector.connect(addr4).withdrawal(1);

      // After distribution addr should have 50% of the profit
      const currBalance = await ethers.provider.getBalance(addr4.address);
      expect(currBalance.sub(initBalance)).to.be.equal(200);
    });

    it("Distribute profits with two holders", async () => {
      const tokenId = await createNFT(addr1);

      await performBuy(addr2, sellerOrder);

      await performBuy(addr3, sellerOrder);

      // At the beginning the owner have all the tokens
      const ownerBalance = await metaverseToken.balanceOf(owner.address);
      expect(await metaverseToken.totalSupply()).to.equal(ownerBalance);
      //  Let's transfer 50% to addr4
      await metaverseToken.transfer(addr4.address, FakeInitialSupply / 2);
      expect(await metaverseToken.balanceOf(addr4.address)).to.equal(
        FakeInitialSupply / 2
      );
      //  and 25% to addr5
      await metaverseToken.transfer(addr5.address, FakeInitialSupply / 4);
      expect(await metaverseToken.balanceOf(addr5.address)).to.equal(
        FakeInitialSupply / 4
      );

      // Contract has 400 ETH because each buy gives 200
      expect(
        await await ethers.provider.getBalance(metaverseStore.address)
      ).to.equal(400);

      const initBalance1 = await ethers.provider.getBalance(addr4.address);
      const initBalance2 = await ethers.provider.getBalance(addr5.address);

      await metaverseCollector.distributeProfits();
      await metaverseCollector.connect(addr4).withdrawal(1);
      await metaverseCollector.connect(addr5).withdrawal(1);

      // After distribution addr4 should have 50% of the profit
      const currBalance1 = await ethers.provider.getBalance(addr4.address);
      expect(currBalance1.sub(initBalance1)).to.be.equal(200);
      // After distribution addr5 should have 25% of the profit
      const currBalance2 = await ethers.provider.getBalance(addr5.address);
      expect(currBalance2.sub(initBalance2)).to.be.equal(100);
    });

    it("Estimated withdrawal", async () => {
      const tokenId = await createNFT(addr1);

      await performBuy(addr2, sellerOrder);

      await performBuy(addr3, sellerOrder);

      // At the beginning the owner have all the tokens
      const ownerBalance = await metaverseToken.balanceOf(owner.address);
      expect(await metaverseToken.totalSupply()).to.equal(ownerBalance);
      //  Let's transfer 50% to addr4
      await metaverseToken.transfer(addr4.address, FakeInitialSupply / 2);
      expect(await metaverseToken.balanceOf(addr4.address)).to.equal(
        FakeInitialSupply / 2
      );
      //  and 25% to addr5
      await metaverseToken.transfer(addr5.address, FakeInitialSupply / 4);
      expect(await metaverseToken.balanceOf(addr5.address)).to.equal(
        FakeInitialSupply / 4
      );

      // Contract has 400 ETH because each buy gives 200
      expect(
        await await ethers.provider.getBalance(metaverseStore.address)
      ).to.equal(400);

      await metaverseCollector.distributeProfits();
      const [addr4EstimatedWithdrawal] = await metaverseCollector.getBalanceAt(
        addr4.address,
        1
      );
      const [addr5EstimatedWithdrawal] = await metaverseCollector.getBalanceAt(
        addr5.address,
        1
      );

      // After distribution addr4 should have 50% of the profit
      expect(addr4EstimatedWithdrawal).to.be.equal(200);
      // After distribution addr5 should have 25% of the profit
      expect(addr5EstimatedWithdrawal).to.be.equal(100);
    });
  });

  describe("Ban/Unban logic", () => {
    it("Ban and unban nft", async () => {
      const tokenId = await createNFT(addr1);

      await performBuy(addr2, sellerOrder);

      // At the beginning the owner have all the tokens
      const ownerBalance = await metaverseToken.balanceOf(owner.address);
      expect(await metaverseToken.totalSupply()).to.equal(ownerBalance);
      //  Let's transfer 50% to addr4
      await metaverseToken.transfer(addr4.address, FakeInitialSupply / 2);
      expect(await metaverseToken.balanceOf(addr4.address)).to.equal(
        FakeInitialSupply / 2
      );
      //  and 25% to addr5
      await metaverseToken.transfer(addr5.address, FakeInitialSupply / 4);
      expect(await metaverseToken.balanceOf(addr5.address)).to.equal(
        FakeInitialSupply / 4
      );

      await metaverseItem.connect(addr5).updateBanStatus(tokenId, false);
      await metaverseItem.connect(addr4).updateBanStatus(tokenId, true);
    });

    it("Ban a nft without gov tokens", async () => {
      const tokenId = await createNFT(addr1);

      await performBuy(addr2, sellerOrder);

      // At the beginning the owner have all the tokens
      const ownerBalance = await metaverseToken.balanceOf(owner.address);
      expect(await metaverseToken.totalSupply()).to.equal(ownerBalance);

      await expect(
        metaverseItem.connect(addr5).updateBanStatus(tokenId, false)
      ).to.be.revertedWith("ERC721Metaverse: need gov token to this actions");
    });

    it("Ban a nft without enogth gov tokens", async () => {
      const tokenId = await createNFT(addr1);

      await performBuy(addr2, sellerOrder);

      // At the beginning the owner have all the tokens
      const ownerBalance = await metaverseToken.balanceOf(owner.address);
      expect(await metaverseToken.totalSupply()).to.equal(ownerBalance);
      //  Let's transfer 50% to addr4
      await metaverseToken.transfer(addr4.address, FakeInitialSupply / 2);
      expect(await metaverseToken.balanceOf(addr4.address)).to.equal(
        FakeInitialSupply / 2
      );
      //  and 25% to addr5
      await metaverseToken.transfer(addr5.address, FakeInitialSupply / 4);
      expect(await metaverseToken.balanceOf(addr5.address)).to.equal(
        FakeInitialSupply / 4
      );

      await metaverseItem.connect(addr4).updateBanStatus(tokenId, false);
      await expect(
        metaverseItem.connect(addr5).updateBanStatus(tokenId, false)
      ).to.be.revertedWith(
        "ERC721Metaverse: need more gov token to this actions"
      );
    });

    it("Check exist on ban token", async () => {
      const tokenId = await createNFT(addr1);

      await performBuy(addr2, sellerOrder);

      // At the beginning the owner have all the tokens
      const ownerBalance = await metaverseToken.balanceOf(owner.address);
      expect(await metaverseToken.totalSupply()).to.equal(ownerBalance);
      //  Let's transfer 50% to addr4
      await metaverseToken.transfer(addr4.address, FakeInitialSupply / 2);
      expect(await metaverseToken.balanceOf(addr4.address)).to.equal(
        FakeInitialSupply / 2
      );

      await metaverseItem.connect(addr4).updateBanStatus(tokenId, true);

      await expect(metaverseItem.ownerOf(tokenId)).to.be.revertedWith(
        "ERC721Metaverse: non existent token"
      );

      await metaverseItem.connect(addr4).updateBanStatus(tokenId, false);

      expect(await metaverseItem.ownerOf(tokenId)).to.be.equal(addr2.address);
    });

    it("Transfer a banned nft", async () => {
      const tokenId = await createNFT(addr1);

      await performBuy(addr2, sellerOrder);

      // At the beginning the owner have all the tokens
      const ownerBalance = await metaverseToken.balanceOf(owner.address);
      expect(await metaverseToken.totalSupply()).to.equal(ownerBalance);
      //  Let's transfer 50% to addr4
      await metaverseToken.transfer(addr4.address, FakeInitialSupply / 2);
      expect(await metaverseToken.balanceOf(addr4.address)).to.equal(
        FakeInitialSupply / 2
      );

      // Ban the token and try to transfer
      await metaverseItem.connect(addr4).updateBanStatus(tokenId, true);

      await expect(
        metaverseItem
          .connect(addr2)
          .transferFrom(addr2.address, addr3.address, tokenId)
      ).to.be.revertedWith("ERC721: operator query for nonexistent token");

      // Unban and should work
      await metaverseItem.connect(addr4).updateBanStatus(tokenId, false);
      await metaverseItem
        .connect(addr2)
        .transferFrom(addr2.address, addr3.address, tokenId);
      expect(await metaverseItem.ownerOf(tokenId)).to.be.equal(addr3.address);
    });
  });
});
