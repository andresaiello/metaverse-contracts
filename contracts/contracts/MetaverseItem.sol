// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "./@openzeppelin/contracts/access/Ownable.sol";
import "./@openzeppelin/contracts/utils/Counters.sol";
import "./@openzeppelin/contracts/utils/math/SafeMath.sol";

// import "hardhat/console.sol";

contract MetaverseItem is ERC721, Ownable {
	struct Fee {
		address payable recipient;
		uint256 value;
	}

	struct TokenMeta {
		string URI;
		address creator;
		bool ban;
		uint256 banLevel;
	}

	using SafeMath for uint256;
	using Counters for Counters.Counter;
	Counters.Counter private _tokenIds;
	// Base URI
	string private _baseURIextended;

	// Token meta
	mapping(uint256 => TokenMeta) private _tokenMeta;
	// id => fees
	mapping(uint256 => Fee[]) public _tokenFees;
	// Metaverse token
	address private _governance;

	uint256 _network;
	uint256 _magicNumber = 73;

	constructor(address governance, uint256 network)
		ERC721("MetaverseItem", "ITM")
	{
		_baseURIextended = "https://ipfs.io/ipfs/";
		_governance = governance;
		_network = network;
	}

	function setGovernanceToken(address gov) public onlyOwner() {
		_governance = gov;
	}

	function createItem(
		address to,
		string memory _tokenURI,
		Fee[] memory fees
	) public returns (uint256) {
		_tokenIds.increment();
		uint256 newItemId = _tokenIds.current().mul(_magicNumber).add(_network);
		_mint(to, newItemId);
		_setTokenMeta(newItemId, _tokenURI, fees, to);
		return newItemId;
	}

	function setBaseURI(string memory baseURI) external onlyOwner() {
		_baseURIextended = baseURI;
	}

	function tokenURI(uint256 tokenId)
		public
		view
		override
		returns (string memory)
	{
		require(_exists(tokenId));
		return
			string(abi.encodePacked(_baseURIextended, _tokenMeta[tokenId].URI));
	}

	function _setTokenMeta(
		uint256 tokenId,
		string memory _tokenURI,
		Fee[] memory fees,
		address creator
	) internal virtual {
		require(_exists(tokenId), "ERC721Metaverse: non existent token");

		_tokenMeta[tokenId] = TokenMeta({
			URI: _tokenURI,
			creator: creator,
			ban: false,
			banLevel: 0
		});

		for (uint256 i; i < fees.length; i++) {
			_tokenFees[tokenId].push(fees[i]);
		}
	}

	function ownerOf(uint256 tokenId) public view override returns (address) {
		require(_exists(tokenId), "ERC721Metaverse: non existent token");
		return super.ownerOf(tokenId);
	}

	// For all the logic if a token is banned is like doesn't exists
	function _exists(uint256 tokenId) internal view override returns (bool) {
		return !_tokenMeta[tokenId].ban && super._exists(tokenId);
	}

	//@todo maybe this logic should move to collector and set that only collector can use this method
	function updateBanStatus(uint256 tokenId, bool ban) public {
		require(super._exists(tokenId), "ERC721Metaverse: non existent token");
		uint256 senderBalance = ERC20(_governance).balanceOf(msg.sender);
		require(
			senderBalance > 0,
			"ERC721Metaverse: need gov token to this actions"
		);
		require(
			senderBalance >= _tokenMeta[tokenId].banLevel,
			"ERC721Metaverse: need more gov token to this actions"
		);
		_tokenMeta[tokenId].ban = ban;
		_tokenMeta[tokenId].banLevel = senderBalance;
	}

	function getFeeRecipients(uint256 id)
		public
		view
		returns (address payable[] memory)
	{
		Fee[] memory _fees = _tokenFees[id];
		address payable[] memory result = new address payable[](_fees.length);
		for (uint256 i = 0; i < _fees.length; i++) {
			result[i] = _fees[i].recipient;
		}
		return result;
	}

	function getFeeBps(uint256 id) public view returns (uint256[] memory) {
		Fee[] memory _fees = _tokenFees[id];
		uint256[] memory result = new uint256[](_fees.length);
		for (uint256 i = 0; i < _fees.length; i++) {
			result[i] = _fees[i].value;
		}
		return result;
	}
}
