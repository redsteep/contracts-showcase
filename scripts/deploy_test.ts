import hre, { ethers, upgrades } from "hardhat";
import { deployYToken, deployXToken, deployNFT, deployTreasury } from "../utils/deployContracts";

async function main() { 

  let signer = "0x0000000000000000000000000000000000000000"

  let yToken = await deployYToken()
  console.log("yToken ", yToken.address);
  
  let xToken = await deployXToken()
  console.log("xToken ", xToken.address);
  
  let xnft = await deployNFT("XY NFT XNFT", "XNFT");
  console.log("xnft ", xnft.address);
  
  let ynft = await deployNFT("XY NFT YNFT", "YNFT");
  console.log("ynft ", ynft.address);

  let currency = "0x0000000000000000000000000000000000000000" //goerli

  let treasury = await deployTreasury(xnft.address, ynft.address, signer, yToken.address, xToken.address, currency)
  console.log(treasury.address);
 
  await verify(yToken.address, [])
  await verify(xToken.address, [])
  await verify(xnft.address, [])
  await verify(ynft.address, [])
  await verify(treasury.address, [])
}

async function verify(address: string, args: any) {
    return hre.run("verify:verify", {address: address, constructorArguments: args,});
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
