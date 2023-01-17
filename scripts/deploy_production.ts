import hre, { ethers, upgrades } from "hardhat";
import { deployYToken, deployXToken, deployNFT, deployTreasury } from "../utils/deployContracts";
import * as fs from 'fs';

async function main() { 

  let signer = "0x0000000000000000000000000000000000000000"

  let yToken = await deployYToken()
  console.log("yToken ", yToken.address);
  await upgrades.admin.transferProxyAdminOwnership(await yToken.GNOSIS());
  fs.renameSync(".openzeppelin/unknown-56.json", ".openzeppelin/unknown-56_yToken.json")

  let xToken = await deployXToken()
  console.log("xToken ", xToken.address);
  await upgrades.admin.transferProxyAdminOwnership(await xToken.GNOSIS());
  fs.renameSync(".openzeppelin/unknown-56.json", ".openzeppelin/unknown-56_xToken.json")

  let xnft = await deployNFT("XY NFT Avatars", "XYA");
  console.log("xnft ", xnft.address);
  await upgrades.admin.transferProxyAdminOwnership(await xnft.GNOSIS());
  fs.renameSync(".openzeppelin/unknown-56.json", ".openzeppelin/unknown-56_xnft.json")
  
  let ynft = await deployNFT("XY NFT Vials", "XYV");
  console.log("ynft ", ynft.address);
  await upgrades.admin.transferProxyAdminOwnership(await ynft.GNOSIS());
  fs.renameSync(".openzeppelin/unknown-56.json", ".openzeppelin/unknown-56_ynft.json")


  await verify(yToken.address, [])
  await verify(xToken.address, [])
  await verify(xnft.address, [])
  await verify(ynft.address, [])
}


async function verify(address: string, args: any) {
    return hre.run("verify:verify", {address: address, constructorArguments: args,});
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
