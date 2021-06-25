// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
import "./@openzeppelin/contracts/access/Ownable.sol";
import "./@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MetaverseWallet is Ownable {
	function transfer(address payable addr, uint256 amount) public onlyOwner {
		addr.transfer(amount);
	}

	function transfer(
		address payable addr,
		address token,
		uint256 amount
	) public onlyOwner {
		IERC20(token).transfer(addr, amount);
	}

	// important to receive ETH
	receive() external payable {}
}
