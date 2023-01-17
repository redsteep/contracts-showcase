import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { YToken } from "../typechain";
import { deployYToken } from "../utils/deployContracts"

describe("XToken", function () {
  let yToken: YToken
  let owner: SignerWithAddress
  let gnosis: SignerWithAddress
  let receiver: SignerWithAddress
  let badguy: SignerWithAddress

  before(async()=>{
    [owner, receiver, badguy] = await ethers.getSigners()
    
    yToken = await deployYToken()

    gnosis = await ethers.getImpersonatedSigner(await yToken.GNOSIS())
    await owner.sendTransaction({to: gnosis.address,value: ethers.utils.parseEther("1")})
  })

  it("YToken Mint and Burn work", async() => {
    await expect(yToken.connect(badguy).mint(receiver.address, 1000)).to.be.revertedWith("Ownable: caller is not the owner")
    await expect(yToken.connect(owner).mint(receiver.address, 1000)).to.be.revertedWith("Ownable: caller is not the owner")
    expect(await yToken.connect(gnosis).mint(receiver.address, 1000)).to.be.ok
    expect(await yToken.totalSupply()).to.be.equal(1000)

    await yToken.connect(receiver).transfer(gnosis.address, 1000)
    expect(await yToken.connect(gnosis).burn(1000)).to.be.ok
    expect(await yToken.totalSupply()).to.be.equal(0)
  })
})