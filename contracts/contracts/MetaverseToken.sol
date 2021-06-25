// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./@openzeppelin/contracts/token/ERC20/extensions/ERC20Snapshot.sol";
import "./@openzeppelin/contracts/access/Ownable.sol";
import "./MetaverseCollector.sol";

// import "hardhat/console.sol";

contract MetaverseToken is ERC20Snapshot, Ownable {
	uint256 _initialSupply;
	address _collector;
	uint256 _currentSnapshotId;

	constructor(uint256 initialSupply) ERC20("MetaverseToken", "MCC") {
		_initialSupply = initialSupply;
		_mint(msg.sender, initialSupply);
		_currentSnapshotId = 1;
	}

	function setCollector(address collector) public onlyOwner {
		_collector = collector;
	}

	function getCurrentSnapshotId() public view returns (uint256) {
		return _currentSnapshotId;
	}

	function takeSnapshot() public {
		require(msg.sender == _collector, "ERC721Metaverse: only collector");
		_currentSnapshotId = _snapshot() + 1;
	}

	function balanceOfAt(address account, uint256 snapshotId)
		public
		view
		override
		returns (uint256)
	{
		if (snapshotId == _currentSnapshotId) {
			return balanceOf(account);
		} else {
			return super.balanceOfAt(account, snapshotId);
		}
	}
}
