import { ethers } from "ethers";

export const ZERO = "0x0000000000000000000000000000000000000000";

export enum Action {
  SELL = 0,
  BUY,
}
export enum AssetType {
  ETH,
  ERC20,
  ERC1155,
  ERC721,
}
export interface Asset {
  token: string;
  tokenId: number;
  assetType: AssetType;
}

export interface Order {
  from: string;
  action: Action;
  // what I want to buy/sell
  sellAsset: Asset;
  sellAmount: string;
  // what I offer/want
  buyAsset: Asset;
  buyAmount: string;
  // to avoid double spend
  time: number;
  salt: number;
}

export const EmptyOrder: Order = {
  from: ZERO,
  action: Action.SELL,
  // what I want to buy/sell
  sellAsset: {
    token: ZERO,
    tokenId: 0,
    assetType: AssetType.ERC721,
  },
  sellAmount: "0",
  // what I offer/want
  buyAsset: {
    token: ZERO,
    tokenId: 0,
    assetType: AssetType.ETH,
  },
  buyAmount: "0",
  // to avoid double spend
  time: Date.now(),
  salt: 0,
};

export const getOrderSig = async (order: Order, signer: any) => {
  let payload = ethers.utils.defaultAbiCoder.encode(
    [
      "address",
      "uint256",
      "address",
      "uint256",
      "uint256",
      "address",
      "uint256",
      "uint256",
      "uint256",
    ],
    [
      order.from,
      order.action,
      order.sellAsset.token,
      order.sellAsset.tokenId,
      order.sellAmount,
      order.buyAsset.token,
      order.buyAsset.tokenId,
      order.buyAmount,
      order.salt,
    ]
  );

  let payloadHash = ethers.utils.keccak256(payload);

  // This adds the message prefix
  let signature = await signer.signMessage(ethers.utils.arrayify(payloadHash));
  return ethers.utils.splitSignature(signature);
};
