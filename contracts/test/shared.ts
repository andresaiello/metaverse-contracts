import { ethers } from "hardhat";
import { BigNumber } from "@ethersproject/bignumber";

export const ZERO = "0x0000000000000000000000000000000000000000";

export const getAllEvents = async (tx: any, event: string): Promise<any[]> => {
  const receipt = await tx.wait();
  const tokenInfo: any[] = receipt.events?.filter((x) => {
    return x.event == event;
  });
  return tokenInfo;
};

export const getSingleEvent = async (tx: any, event: string) => {
  const allEvents = await getAllEvents(tx, event);
  return allEvents?.length > 0 ? allEvents[0] : undefined;
};

export enum Action {
  BUY,
  SELL,
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
  sellAmount: number;
  // what I offer/want
  buyAsset: Asset;
  buyAmount: number;
  // to avoid double spend
  time: number;
  salt: number;
}

export const SampleOrder = {
  from: ZERO,
  action: Action.SELL,
  // what I want to buy/sell
  sellAsset: {
    token: ZERO,
    tokenId: 0,
    assetType: AssetType.ERC721,
  },
  sellAmount: 1,
  // what I offer/want
  buyAsset: {
    token: ZERO,
    tokenId: 0,
    assetType: AssetType.ETH,
  },
  buyAmount: 4000,
  // to avoid double spend
  time: Date.now(),
  salt: 65654,
};
