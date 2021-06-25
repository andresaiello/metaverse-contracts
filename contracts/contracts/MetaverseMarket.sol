// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import "./@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./MetaverseWallet.sol";
import "./MetaverseItem.sol";

// import "hardhat/console.sol";

contract MetaverseMarket is Initializable, OwnableUpgradeable {
	event Transfer(
		address indexed from,
		address indexed to,
		uint256 indexed tokenId,
		uint256 marketFee,
		uint256 creatorFee
	);

	event OrderExecuted(
		address indexed from,
		address indexed to,
		address sellToken,
		uint256 sellTokenId,
		uint256 sellAmount,
		address buyToken,
		uint256 buyTokenId,
		uint256 buyAmount
	);

	event BidStored(
		address indexed from,
		address indexed to,
		bytes32 bidId,
		address sellToken,
		uint256 sellTokenId,
		uint256 sellAmount,
		address buyToken,
		uint256 buyTokenId,
		uint256 buyAmount
	);

	using SafeMath for uint256;
	/* An ECDSA signature. */
	struct Sig {
		uint8 v;
		bytes32 r;
		bytes32 s;
	}

	enum Action {
		SELL,
		BUY
	}
	enum AssetType {
		ETH,
		ERC20,
		ERC1155,
		ERC721
	}
	struct Asset {
		address token;
		uint256 tokenId;
		AssetType assetType;
	}

	struct Order {
		// who I am
		address from;
		Action action;
		// what I want to buy/sell
		Asset sellAsset;
		uint256 sellAmount;
		// what I offer/want
		Asset buyAsset;
		uint256 buyAmount;
		// to avoid double spend
		uint256 time;
		uint256 salt;
	}
	struct OrderStatus {
		uint256 time;
		uint256 completed;
	}

	mapping(bytes32 => OrderStatus) ordersStatus;

	struct BidStatus {
		uint256 time;
		uint256 completed;
		address from;
		Asset buyAsset;
		uint256 buyAmount;
	}

	mapping(bytes32 => BidStatus) bids;

	// Metaverse NFT
	address private _metaverseItem;

	// General fee
	uint256 private _fee;
	// Wallets
	// Wallet for fee in store
	address payable private _store;
	// Wallet to store transactional bids
	address payable private _transactional;

	function getCompleted(Order memory order) internal view returns (uint256) {
		OrderStatus memory status = ordersStatus[getCompletedKey(order)];
		// key not found
		if (status.time == 0) {
			return 0;
		}
		// key already expired
		if (status.time > order.time) {
			return type(uint256).max;
		}
		if (status.time == order.time) {
			return ordersStatus[getCompletedKey(order)].completed;
		}
		return 0;
	}

	// @todo: when we have roles make it public for operators
	function setCompleted(Order memory order, uint256 newCompleted) internal {
		ordersStatus[getCompletedKey(order)].completed = newCompleted;
		ordersStatus[getCompletedKey(order)].time = order.time;
	}

	function getCompletedKey(Order memory order)
		internal
		pure
		returns (bytes32)
	{
		return
			keccak256(
				abi.encodePacked(
					order.from,
					order.sellAsset.tokenId,
					order.salt
				)
			);
	}

	function verifyOpenAndModifyOrderState(Order memory order, uint256 amount)
		internal
	{
		uint256 completed = getCompleted(order);
		uint256 newCompleted = completed.add(amount);
		require(
			newCompleted <= order.sellAmount,
			"not enough stock of order for buying"
		);
		setCompleted(order, newCompleted);
	}

	function initialize(
		address metaverseItem,
		uint256 fee,
		address payable store,
		address payable transactional
	) public initializer {
		_metaverseItem = metaverseItem;
		_fee = fee;
		_store = store;
		_transactional = transactional;
	}

	function createItem(string memory tokenURI, uint256 fee)
		public
		returns (uint256)
	{
		MetaverseItem.Fee[] memory fees = new MetaverseItem.Fee[](2);
		fees[0] = MetaverseItem.Fee({ recipient: _store, value: _fee });
		fees[1] = MetaverseItem.Fee({
			recipient: payable(msg.sender),
			value: fee
		});

		uint256 tokenId = MetaverseItem(_metaverseItem).createItem(
			msg.sender,
			tokenURI,
			fees
		);

		emit Transfer(address(0), msg.sender, tokenId, _fee, fee);
		return tokenId;
	}

	function setStore(address payable store) public onlyOwner() {
		_store = store;
	}

	function doNativeTransfer(
		Asset memory asset,
		uint256 amount,
		address payable recipient
	) private {
		if (asset.assetType == AssetType.ETH) {
			recipient.transfer(amount);
		} else if (asset.assetType == AssetType.ERC20) {
			IERC20(asset.token).transfer(recipient, amount);
		}
	}

	function doWalletTransfer(
		Asset memory asset,
		uint256 amount,
		address payable recipient,
		address payable origin
	) private {
		if (asset.assetType == AssetType.ETH) {
			MetaverseWallet(origin).transfer(recipient, amount);
		} else if (asset.assetType == AssetType.ERC20) {
			MetaverseWallet(origin).transfer(recipient, asset.token, amount);
		}
	}

	function doTransfer(
		Asset memory asset,
		uint256 amount,
		address payable recipient,
		address origin
	) private {
		if (origin == _transactional) {
			doWalletTransfer(asset, amount, recipient, payable(origin));
			return;
		}
		doNativeTransfer(asset, amount, recipient);
	}

	function getBidKey(Order memory order) internal pure returns (bytes32) {
		return
			keccak256(
				abi.encodePacked(order.sellAsset.token, order.sellAsset.tokenId)
			);
	}

	function returnLooserBid(Order calldata buyerOrder) internal {
		bytes32 bidId = getBidKey(buyerOrder);
		// key not found
		if (bids[bidId].time == 0) {
			return;
		}
		// to beat a bid needs to be the same token
		require(
			bids[bidId].buyAsset.token == buyerOrder.buyAsset.token,
			"MetaverseMarket: Please bid in the same currency"
		);
		require(
			bids[bidId].buyAmount < buyerOrder.buyAmount,
			"MetaverseMarket: There's a better bid"
		);
		doWalletTransfer(
			bids[bidId].buyAsset,
			bids[bidId].buyAmount,
			payable(bids[bidId].from),
			_transactional
		);
	}

	function placeBid(Order calldata buyerOrder) external payable {
		//@todo: for now bids are only for one item
		require(
			buyerOrder.sellAmount == 1,
			"MetaverseMarket: Need to buy 1 at least"
		);
		require(buyerOrder.from == msg.sender, "MetaverseMarket: Wrong sender");
		// freeze the money to use later
		doNativeTransfer(
			buyerOrder.buyAsset,
			buyerOrder.buyAmount,
			_transactional
		);

		// now we know the bid can be paid, let's check if someone made an offer before
		returnLooserBid(buyerOrder);

		// search the current owner
		address tokenAddr = buyerOrder.sellAsset.token;
		if (tokenAddr == address(0)) {
			tokenAddr = _metaverseItem;
		}

		ERC721 nftFactory = ERC721(tokenAddr);
		address owner = nftFactory.ownerOf(buyerOrder.sellAsset.tokenId);

		// store the bid information
		bytes32 bidId = getBidKey(buyerOrder);
		bids[bidId].time = buyerOrder.time;
		bids[bidId].completed = 0;
		bids[bidId].from = buyerOrder.from;
		bids[bidId].buyAsset = buyerOrder.buyAsset;
		bids[bidId].buyAmount = buyerOrder.buyAmount;

		emit BidStored(
			owner,
			buyerOrder.from,
			bidId,
			buyerOrder.sellAsset.token,
			buyerOrder.sellAsset.tokenId,
			buyerOrder.sellAmount,
			buyerOrder.buyAsset.token,
			buyerOrder.buyAsset.tokenId,
			buyerOrder.buyAmount
		);
	}

	function cancelBidInternal(bytes32 bidId) internal {
		// return the frezed money
		doWalletTransfer(
			bids[bidId].buyAsset,
			bids[bidId].buyAmount,
			payable(bids[bidId].from),
			_transactional
		);

		// cleanup the bid information
		bids[bidId].from = address(0);
		bids[bidId].completed = 0;
		bids[bidId].time = 0;
		bids[bidId].buyAmount = 0;
	}

	function cancelBid(Order calldata buyerOrder) external {
		require(buyerOrder.from == msg.sender, "MetaverseMarket: Wrong sender");
		bytes32 bidId = getBidKey(buyerOrder);
		require(
			bids[bidId].from == msg.sender,
			"MetaverseMarket: Wrong sender"
		);

		cancelBidInternal(bidId);
	}

	function approveBid(
		Order calldata sellerOrder,
		Sig calldata sellerSig,
		Order calldata buyerOrder,
		Sig calldata buyerSig
	) external payable {
		bytes32 bidId = getBidKey(buyerOrder);
		require(bids[bidId].time > 0, "MetaverseMarket: Bid not found");
		require(
			bids[bidId].completed == 0,
			"MetaverseMarket: Bid already used"
		);
		require(
			bids[bidId].from == buyerOrder.from,
			"MetaverseMarket: Wrong buyer"
		);
		require(
			bids[bidId].buyAsset.token == buyerOrder.buyAsset.token &&
				bids[bidId].buyAmount == buyerOrder.buyAmount,
			"MetaverseMarket: Wrong bid"
		);

		buyInternal(
			sellerOrder,
			sellerSig,
			buyerOrder,
			buyerSig,
			_transactional
		);

		// cleanup the bid information
		bids[bidId].from = address(0);
		bids[bidId].completed = 0;
		bids[bidId].time = 0;
		bids[bidId].buyAmount = 0;
	}

	function buy(
		Order calldata sellerOrder,
		Sig calldata sellerSig,
		Order calldata buyerOrder,
		Sig calldata buyerSig
	) external payable {
		buyInternal(sellerOrder, sellerSig, buyerOrder, buyerSig, msg.sender);
		bytes32 bidId = getBidKey(buyerOrder);
		if (bids[bidId].time > 0) {
			cancelBidInternal(bidId);
		}
	}

	function buyInternal(
		Order calldata sellerOrder,
		Sig calldata sellerSig,
		Order calldata buyerOrder,
		Sig calldata buyerSig,
		address wallet
	) internal {
		validateOrder(sellerOrder, sellerSig);
		validateOrder(buyerOrder, buyerSig);
		// @todo: validate sellerOrder.sellAsset is a token and not ERC or ETH
		address tokenAddr = sellerOrder.sellAsset.token;
		if (tokenAddr == address(0)) {
			tokenAddr = _metaverseItem;
		}
		ERC721 nftFactory = ERC721(tokenAddr);

		require(
			sellerOrder.from ==
				nftFactory.ownerOf(sellerOrder.sellAsset.tokenId),
			"ERC721Metaverse: wrong owner"
		);

		// @todo: refactor to check a match (same tokenid, same everything)
		require(
			buyerOrder.buyAmount >= sellerOrder.buyAmount,
			"ERC721Metaverse: wrong value"
		);

		verifyOpenAndModifyOrderState(sellerOrder, buyerOrder.sellAmount);
		// All checks pass, let's send the fees
		uint256 toOwner = buyerOrder.buyAmount;
		uint256 toFee;
		// if is an nft created by us, let's check the fees
		if (sellerOrder.sellAsset.token == _metaverseItem) {
			MetaverseItem nftContract = MetaverseItem(_metaverseItem);
			address payable[] memory recipients = nftContract.getFeeRecipients(
				sellerOrder.sellAsset.tokenId
			);
			uint256[] memory fees = nftContract.getFeeBps(
				sellerOrder.sellAsset.tokenId
			);
			for (uint256 i; i < recipients.length; i++) {
				toFee = buyerOrder.buyAmount.mul(fees[i]).div(1000);
				doTransfer(buyerOrder.buyAsset, toFee, recipients[i], wallet);
				toOwner = toOwner.sub(toFee);
			}
		} else {
			// Else just check our fee
			toFee = buyerOrder.buyAmount.mul(_fee).div(1000);
			doTransfer(buyerOrder.buyAsset, toFee, _store, wallet);
			toOwner = toOwner.sub(toFee);
		}
		// the rest to the current owner
		address payable owner = payable(
			nftFactory.ownerOf(sellerOrder.sellAsset.tokenId)
		);
		doTransfer(buyerOrder.buyAsset, toOwner, owner, wallet);
		// then do the transfer
		nftFactory.transferFrom(
			owner,
			buyerOrder.from,
			sellerOrder.sellAsset.tokenId
		);

		emit OrderExecuted(
			sellerOrder.from,
			buyerOrder.from,
			buyerOrder.sellAsset.token,
			buyerOrder.sellAsset.tokenId,
			buyerOrder.sellAmount,
			buyerOrder.buyAsset.token,
			buyerOrder.buyAsset.tokenId,
			buyerOrder.buyAmount
		);
	}

	function validateOrder(Order calldata order, Sig calldata sig)
		private
		pure
	{
		bytes32 payloadHash = keccak256(
			abi.encode(
				order.from,
				order.action,
				order.sellAsset.token,
				order.sellAsset.tokenId,
				order.sellAmount,
				order.buyAsset.token,
				order.buyAsset.tokenId,
				order.buyAmount,
				order.salt
			)
		);
		bytes32 messageHash = keccak256(
			abi.encodePacked("\x19Ethereum Signed Message:\n32", payloadHash)
		);

		address actualSigner = ecrecover(messageHash, sig.v, sig.r, sig.s);
		require(order.from == actualSigner);
	}
}
