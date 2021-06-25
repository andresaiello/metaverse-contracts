// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
import "./@openzeppelin/contracts/proxy/utils/Initializable.sol";
// @todo: remove just for test because we can't debug with this
// import "./@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./MetaverseWallet.sol";
import "./MetaverseToken.sol";

// import "hardhat/console.sol";

contract MetaverseCollector is Initializable {
	using SafeMath for uint256;

	address private token;
	address payable private store;
	address payable private treasure;
	uint256 currentSnapshot;
	mapping(uint256 => uint256) private treasureBalanceAt;
	mapping(uint256 => mapping(address => bool)) private withdrawals;
	uint256 private lastSnapshotTime;
	uint256 private minSnapshotTime;

	function initialize(
		address _token,
		address payable _store,
		address payable _treasure
	) public initializer {
		token = _token;
		store = _store;
		treasure = _treasure;
		currentSnapshot = MetaverseToken(_token).getCurrentSnapshotId();
		lastSnapshotTime = block.timestamp;
		minSnapshotTime = 0;
	}

	function withdrawal(uint256 snapshot) public {
		require(
			snapshot > 0 && snapshot < currentSnapshot,
			"COLLECTOR: you have to wait"
		);
		MetaverseToken tokenRef = MetaverseToken(token);
		uint256 tokenBalance = tokenRef.balanceOfAt(msg.sender, snapshot);
		uint256 treasureBalance = treasureBalanceAt[snapshot];

		uint256 totalSupply = tokenRef.totalSupply();

		bool alreadyWithdrawn = withdrawals[snapshot][msg.sender];

		if (tokenBalance > 0 && !alreadyWithdrawn) {
			uint256 amount = treasureBalance.mul(tokenBalance).div(totalSupply);
			MetaverseWallet(treasure).transfer(payable(msg.sender), amount);
			withdrawals[snapshot][msg.sender] = true;
		}
	}

	function getBalanceAt(address recipient, uint256 snapshot)
		public
		view
		returns (uint256, bool)
	{
		if (snapshot > currentSnapshot || snapshot < 1) {
			return (0, true);
		}

		MetaverseToken tokenRef = MetaverseToken(token);
		uint256 tokenBalance = tokenRef.balanceOfAt(recipient, snapshot);
		if (tokenBalance == 0) {
			return (0, true);
		}

		uint256 totalSupply = tokenRef.totalSupply();
		uint256 treasureBalance = treasureBalanceAt[snapshot];
		if (snapshot == currentSnapshot) {
			treasureBalance = address(store).balance;
		}

		bool alreadyWithdrawn = withdrawals[snapshot][msg.sender];
		return (
			treasureBalance.mul(tokenBalance).div(totalSupply),
			alreadyWithdrawn
		);
	}

	// @todo: this should be onlyOwner but for test ownership is disabled
	function setMinSnapshotTime(uint256 _minSnapshotTime) public {
		minSnapshotTime = _minSnapshotTime;
	}

	function distributeProfits() public {
		require(
			lastSnapshotTime.add(minSnapshotTime) <= block.timestamp,
			"COLLECTOR: you have to wait"
		);
		MetaverseToken tokenRef = MetaverseToken(token);
		treasureBalanceAt[currentSnapshot] = address(store).balance;
		MetaverseWallet(store).transfer(treasure, address(store).balance);
		currentSnapshot++;
		tokenRef.takeSnapshot();
	}

	function getCurrentSnapshot() public view returns (uint256) {
		return currentSnapshot;
	}
}
