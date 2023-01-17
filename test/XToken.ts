import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { XToken } from "../typechain";
import { deployXToken } from "../utils/deployContracts"

describe("XToken", function () {
  let xToken: XToken
  let owner = SignerWithAddress
  let gnosis = SignerWithAddress
  let receiver = SignerWithAddress
  let badguy = SignerWithAddress

  before(async()=>{
    [owner, receiver, badguy] = await ethers.getSigners()
    
    xToken = await deployXToken()

    gnosis = await ethers.getImpersonatedSigner(await xToken.GNOSIS())
    
    await owner.sendTransaction({to: gnosis.address,value: ethers.utils.parseEther("1")})
  })

  it("XToken Mint and Burn work", async() => {
    await expect(xToken.connect(badguy).mint(receiver.address, 1000)).to.be.revertedWith("Ownable: caller is not the owner")
    await expect(xToken.connect(owner).mint(receiver.address, 1000)).to.be.revertedWith("Ownable: caller is not the owner")
    await expect(xToken.connect(gnosis).mint(receiver.address, "100000000000000000000000000000")).to.be.revertedWith("Can't mint more than max amount")
    expect(await xToken.connect(gnosis).mint(receiver.address, 1000)).to.be.ok
    expect(await xToken.totalSupply()).to.be.equal(1000)

    await xToken.connect(receiver).transfer(gnosis.address, 1000)
    expect(await xToken.connect(gnosis).burn(1000)).to.be.ok
    expect(await xToken.totalSupply()).to.be.equal(0)
  })

})