import { ethers, upgrades } from "hardhat";

export async function deployYToken() {
    const Contract = await ethers.getContractFactory("YToken");
    const contract = await upgrades.deployProxy(Contract, [], {initializer: "initialize"})
    await contract.deployed()
    return contract
}

export async function deployXToken() {
    const Contract = await ethers.getContractFactory("XToken");
    const contract = await upgrades.deployProxy(Contract, [], {initializer: "initialize"})
    await contract.deployed()
    return contract
}

export async function deployTreasury(xnft: any, ynft: any, signer: any, yToken: any, xToken: any, usdt: any) {
    const Contract = await ethers.getContractFactory("Treasury");
    const contract = await upgrades.deployProxy(Contract, [xnft, ynft, signer, yToken, xToken, usdt], {initializer: "initialize"})
    await contract.deployed()
    return contract
}

export async function deployNFT(name: any, version: any) {
    const Contract = await ethers.getContractFactory("NFT");
    const contract = await upgrades.deployProxy(Contract, [name, version], {initializer: "initialize"})
    await contract.deployed();
    return contract
}

export async function deployStaking(token: any) {
    const Contract = await ethers.getContractFactory("Staking");
    const contract = await upgrades.deployProxy(Contract, [token], {initializer: "initialize"})
    await contract.deployed();
    return contract
}

export async function deployVesting(beneficiaryAddress: any, startTimestamp: any, durationSeconds: any, cliff: any, token: any) {
    const Contract = await ethers.getContractFactory("Vesting");
    const contract = await Contract.deploy(beneficiaryAddress, startTimestamp, durationSeconds, cliff, token);
    await contract.deployed();
    return contract
}

export async function deployMultiVesting(token: any, _changeBeneficiaryAllowed: boolean, _earlyWithdrawAllowed: boolean,
                                        updateMin: number = 100, updateMax: number = 200) {
    const Contract = await ethers.getContractFactory("MultiVesting");
    const contract = await Contract.deploy(token, _changeBeneficiaryAllowed, _earlyWithdrawAllowed, updateMin, updateMax)
    await contract.deployed();
    return contract
}

export async function deployNFTSale(xnft: any, signer: any, pricePerToken: any, redeemSupply: number, purchaseSupply: number) {
    const Contract = await ethers.getContractFactory("NFTSale");
    const contract = await Contract.deploy(xnft, signer, pricePerToken, redeemSupply, purchaseSupply);
    await contract.deployed();
    return contract
}
