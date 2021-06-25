import { expect } from "chai";
import { ethers } from "hardhat";

const FakeInitialSupply = 10000;

describe("MetaverseToken contract", () => {
  let MetaverseToken, metaverseToken, owner, addr1, addr2, addr3, addrs: any[];

  beforeEach(async () => {
    [owner, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();
    MetaverseToken = await ethers.getContractFactory("MetaverseToken");
    metaverseToken = await MetaverseToken.deploy(FakeInitialSupply);
    await metaverseToken.setCollector(owner.address);
  });

  describe("True", () => {
    it("Should be true", async () => {
      expect(true).to.equal(true);
    });
  });

  describe("Transfer token", () => {
    it("Should transfer", async () => {
      // At the beginning the owner have all the tokens
      const ownerBalance = await metaverseToken.balanceOf(owner.address);
      expect(await metaverseToken.totalSupply()).to.equal(ownerBalance);
      //  Let's transfer 50% to addr1
      await metaverseToken.transfer(addr1.address, FakeInitialSupply / 2);
      expect(await metaverseToken.balanceOf(addr1.address)).to.equal(
        FakeInitialSupply / 2
      );
    });

    it("Balance by snapshot after transfer", async () => {
      // At the beginning the owner have all the tokens
      const ownerBalance = await metaverseToken.balanceOf(owner.address);
      expect(await metaverseToken.totalSupply()).to.equal(ownerBalance);
      //  Let's transfer 50% to addr1
      await metaverseToken.transfer(addr1.address, FakeInitialSupply / 2);
      expect(await metaverseToken.balanceOf(addr1.address)).to.equal(
        FakeInitialSupply / 2
      );

      expect(await metaverseToken.balanceOfAt(addr1.address, 1)).to.equal(
        FakeInitialSupply / 2
      );
    });

    it("Balance by Snapshot after transfer after new snapshot", async () => {
      // At the beginning the owner have all the tokens
      const ownerBalance = await metaverseToken.balanceOf(owner.address);
      expect(await metaverseToken.totalSupply()).to.equal(ownerBalance);
      //  Let's transfer 50% to addr1
      await metaverseToken.transfer(addr1.address, FakeInitialSupply / 2);
      expect(await metaverseToken.balanceOf(addr1.address)).to.equal(
        FakeInitialSupply / 2
      );

      await metaverseToken.takeSnapshot();
      // Let's transfer a little more
      await metaverseToken.transfer(addr1.address, FakeInitialSupply / 4);

      // Snapshot 1 should be the same
      expect(await metaverseToken.balanceOfAt(addr1.address, 1)).to.equal(
        FakeInitialSupply / 2
      );
      // Snapshot 2 should have both
      expect(await metaverseToken.balanceOfAt(addr1.address, 2)).to.equal(
        FakeInitialSupply / 2 + FakeInitialSupply / 4
      );

      // Balance should be both
      expect(await metaverseToken.balanceOf(addr1.address)).to.equal(
        FakeInitialSupply / 2 + FakeInitialSupply / 4
      );
    });

    it("Balance by Snapshot after transfer after new snapshot", async () => {
      // At the beginning the owner have all the tokens
      const ownerBalance = await metaverseToken.balanceOf(owner.address);
      expect(await metaverseToken.totalSupply()).to.equal(ownerBalance);
      //  Let's transfer 50% to addr1
      await metaverseToken.transfer(addr1.address, FakeInitialSupply / 2);
      expect(await metaverseToken.balanceOf(addr1.address)).to.equal(
        FakeInitialSupply / 2
      );

      await metaverseToken.takeSnapshot();
      // Let's transfer a little more
      await metaverseToken.transfer(addr1.address, FakeInitialSupply / 4);
      await metaverseToken.takeSnapshot();
      // Send back 1/4
      await metaverseToken
        .connect(addr1)
        .transfer(owner.address, FakeInitialSupply / 4);

      // Snapshot 1 should be the same
      expect(await metaverseToken.balanceOfAt(addr1.address, 1)).to.equal(
        FakeInitialSupply / 2
      );
      // Snapshot 2 should have both
      expect(await metaverseToken.balanceOfAt(addr1.address, 2)).to.equal(
        FakeInitialSupply / 2 + FakeInitialSupply / 4
      );
      // Snapshot 3 should have the latest value
      expect(await metaverseToken.balanceOfAt(addr1.address, 3)).to.equal(
        FakeInitialSupply / 2
      );

      // Balance should be both
      expect(await metaverseToken.balanceOf(addr1.address)).to.equal(
        FakeInitialSupply / 2
      );
    });
  });
});
