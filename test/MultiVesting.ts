import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { setDefaultResultOrder } from "dns";
import { BigNumber, Signer } from "ethers";
import { ethers } from "hardhat";
import { exit } from "process";
import { XToken, Staking, MultiVesting } from "../typechain";
import { deployXToken, deployMultiVesting, deployVesting } from "../utils/deployContracts"
import { currentTimestamp, increaseTime } from "../utils/helpers"

describe("MultiVesting", function () {
  let xToken: XToken
  let vesting: MultiVesting
  let owner: SignerWithAddress
  let receiver: SignerWithAddress
  let receiver2: SignerWithAddress
  let receiver3: SignerWithAddress
  let receiver4: SignerWithAddress
  let  gnosisXToken: SignerWithAddress
  let gnosisMV: SignerWithAddress

  before(async()=>{
    [owner, receiver, receiver2, receiver3, receiver4] = await ethers.getSigners()

    xToken = await deployXToken()
    vesting = await deployMultiVesting(xToken.address, true, true)

    gnosisMV = await ethers.getImpersonatedSigner(await vesting.GNOSIS())
    await owner.sendTransaction({to: gnosisMV.address,value: ethers.utils.parseEther("0.3")})
     gnosisXToken = await ethers.getImpersonatedSigner(await xToken.GNOSIS())
    await owner.sendTransaction({to:  gnosisXToken.address,value: ethers.utils.parseEther("0.3")})
    
    await vesting.connect(gnosisMV).setSeller(await owner.getAddress())
    await expect(vesting.vest(await owner.getAddress(), await currentTimestamp()-1, 1000, 1000, 100)).to.be.revertedWith("Not enough tokens")
    await xToken.connect( gnosisXToken).mint(vesting.address, 1000)
    await vesting.vest(await owner.getAddress(), await currentTimestamp()-1, 1000, 1000, 100)
  })

  const randomSigners = (amount: number): Signer[] => {
    const signers: Signer[] = []
    for (let i = 0; i < amount; i++) {
      signers.push(ethers.Wallet.createRandom())
    }
    return signers
  }

  it("Cliff works", async() => {
    await increaseTime(50)
    expect((await vesting.releasable(await owner.getAddress(), await currentTimestamp()))[0]).to.be.equal(0)
    expect((await vesting.releasable(await owner.getAddress(), await currentTimestamp()))[1]).to.be.equal(52)
    await increaseTime(50)
    expect((await vesting.releasable(await owner.getAddress(), await currentTimestamp()))[0]).to.be.equal(102)
    expect((await vesting.releasable(await owner.getAddress(), await currentTimestamp()))[1]).to.be.equal(102)
  })

  it("Releasable And VestedAmount works works", async() => {
    
    expect((await vesting.vestedAmountBeneficiary(await owner.getAddress(), await currentTimestamp()))[0]).to.be.equal(102)
    expect((await vesting.vestedAmountBeneficiary(await owner.getAddress(), await currentTimestamp()))[1]).to.be.equal(1000)

    await vesting.release(await owner.getAddress())
    expect((await vesting.releasable(await owner.getAddress(), await currentTimestamp()))[0]).to.be.equal(0)
    expect((await vesting.releasable(await owner.getAddress(), await currentTimestamp()))[1]).to.be.equal(103)

    expect((await vesting.vestedAmountBeneficiary(await owner.getAddress(), await currentTimestamp()))[0]).to.be.equal(103)
    expect((await vesting.vestedAmountBeneficiary(await owner.getAddress(), await currentTimestamp()))[1]).to.be.equal(1000)
    expect(await xToken.balanceOf(await owner.getAddress())).to.be.equal(103)

    await increaseTime(899)
    expect((await vesting.releasable(await owner.getAddress(), await currentTimestamp()))[0]).to.be.equal(897)
    expect((await vesting.releasable(await owner.getAddress(), await currentTimestamp()))[1]).to.be.equal(1000)
    
    await increaseTime(1000)
    expect((await vesting.releasable(await owner.getAddress(), await currentTimestamp()))[0]).to.be.equal(897)
    expect((await vesting.releasable(await owner.getAddress(), await currentTimestamp()))[1]).to.be.equal(1000)    

    await vesting.release(await owner.getAddress())
    expect((await vesting.releasable(await owner.getAddress(), await currentTimestamp()))[0]).to.be.equal(0)
    expect((await vesting.releasable(await owner.getAddress(), await currentTimestamp()))[1]).to.be.equal(1000)    
    expect((await vesting.vestedAmountBeneficiary(await owner.getAddress(), await currentTimestamp()))[0]).to.be.equal(1000)
    expect((await vesting.vestedAmountBeneficiary(await owner.getAddress(), await currentTimestamp()))[1]).to.be.equal(1000)
    expect((await vesting.vestedAmountBeneficiary(await receiver.getAddress(), await currentTimestamp()))[0]).to.be.equal(0)
    expect((await vesting.vestedAmountBeneficiary(await receiver.getAddress(), await currentTimestamp()))[1]).to.be.equal(0)
  })

  it("Blocking works", async()=>{
    let amount = 1000

    await xToken.connect( gnosisXToken).mint(vesting.address, amount)
    await vesting.vest(await vesting.address, await currentTimestamp()-1, 1000, 1000, 100)

    let fakeToken = await deployXToken()
    await fakeToken.connect( gnosisXToken).mint(vesting.address, 1000)
    expect(await fakeToken.balanceOf(gnosisMV.address)).to.be.equal(0)
    expect(await fakeToken.balanceOf(vesting.address)).to.be.equal(1000)
    expect(await vesting.sumVesting()).to.be.not.equal(0)
    await vesting.connect(gnosisMV).emergencyVest(fakeToken.address)
    expect(await vesting.sumVesting()).to.be.not.equal(0)
    expect(await fakeToken.balanceOf(gnosisMV.address)).to.be.equal(1000)
    expect(await fakeToken.balanceOf(vesting.address)).to.be.equal(0)

    expect(await xToken.balanceOf(vesting.address)).to.be.equal(amount)
    expect(await vesting.connect(gnosisMV).emergencyVest(xToken.address)).to.be.ok
    expect(await xToken.balanceOf(vesting.address)).to.be.equal(0)

    await vesting.connect(gnosisMV).disableEarlyWithdraw()
    await expect(vesting.connect(gnosisMV).emergencyVest(xToken.address)).to.be.revertedWith("Option not allowed")
  })

  it("change beneficiary works", async() => {
    console.log(await xToken.balanceOf(vesting.address), await vesting.sumVesting());
    await xToken.connect( gnosisXToken).mint(vesting.address, 2000)
    console.log(await xToken.balanceOf(vesting.address), await vesting.sumVesting());
    await expect(vesting.connect(receiver2).updateBeneficiary(receiver2.address, receiver4.address)).to.be.revertedWith("Not a beneficiary")
    await vesting.connect(owner).updateBeneficiary(owner.address, receiver4.address)
    await vesting.vest(await receiver2.getAddress(), await currentTimestamp(), 1, 1000, 1)
    await expect(vesting.connect(receiver2).updateBeneficiary(receiver2.address, owner.address)).to.be.revertedWith("Already a beneficiary")
    expect((await vesting.releasable(await receiver2.getAddress(), await currentTimestamp()))[1]).to.be.equal(1000)    
        
    await vesting.connect(receiver2).updateBeneficiary(receiver2.address, receiver3.address)
    await vesting.connect(receiver2).updateBeneficiary(receiver2.address, receiver3.address) 

    await expect(vesting.connect(receiver3).finishUpdateBeneficiary(receiver2.address)).to.be.revertedWith("Required time hasn't passed")
    await expect(vesting.connect(receiver3).finishUpdateBeneficiary(receiver3.address)).to.be.revertedWith("Not a beneficiary")
    await increaseTime(100)

    await expect(vesting.connect(receiver3).finishUpdateBeneficiary(receiver3.address)).to.be.revertedWith("Not a beneficiary")
    await vesting.connect(receiver3).finishUpdateBeneficiary(receiver2.address)

    await expect(vesting.connect(receiver2).updateBeneficiary(receiver3.address, receiver2.address)).to.be.revertedWith("Not allowed to change")
    await vesting.connect(receiver3).updateBeneficiary(receiver3.address, receiver2.address)
    await expect(vesting.connect(receiver2).updateBeneficiary(receiver3.address, receiver2.address)).to.be.revertedWith("Not allowed to change")
    await increaseTime(201)
    await expect(vesting.connect(receiver2).finishUpdateBeneficiary(receiver3.address)).to.be.revertedWith("Time passed, request new update")

    expect((await vesting.releasable(await receiver2.getAddress(), await currentTimestamp()))[1]).to.be.equal(0)    
    expect((await vesting.releasable(await receiver3.getAddress(), await currentTimestamp()))[1]).to.be.equal(1000)
    await increaseTime(1000)
    await expect(vesting.connect(owner).updateBeneficiary(owner.address, receiver3.address)).to.be.revertedWith("Update pending")
    await expect(vesting.connect(owner).finishUpdateBeneficiary(owner.address)).to.be.revertedWith("Time passed, request new update")

  })

  it("vesting update and create", async()=>{
    console.log("can't update non-existing");
    await expect(vesting.vest(await receiver4.getAddress(), await currentTimestamp(), 1000, 0, 50)).to.be.revertedWith("User is not beneficiary")

    console.log("create vesting");
    await xToken.connect( gnosisXToken).mint(vesting.address, 1000)
    await vesting.vest(await receiver4.getAddress(), await currentTimestamp(), 1000, 1000, 100)
    
    console.log("can't update vesting when balance and _amount > 0");
    await xToken.connect( gnosisXToken).mint(vesting.address, 1000)
    await expect(vesting.vest(await receiver4.getAddress(), await currentTimestamp(), 1000, 1000, 50)).to.be.revertedWith("User is already a beneficiary")

    console.log("can't update vest when cliff more than older and _amount = 0");
    await expect(vesting.vest(await receiver4.getAddress(), await currentTimestamp(), 1000, 0, 150)).to.be.revertedWith("New cliff must be no later than older one")

    console.log("can update vest when cliff less than older and amount = 0");
    await vesting.vest(await receiver4.getAddress(), await currentTimestamp(), 1000, 0, 50)
  })

  it("Gas test", async () => {
    await xToken.connect( gnosisXToken).mint(vesting.address, 1000*500)
    let signers = randomSigners(500)
    console.log(signers.length);
    
    for (let i of signers)
      await vesting.vest(await i.getAddress(), await currentTimestamp()-1, 1000, 1000, 100)
  })
})