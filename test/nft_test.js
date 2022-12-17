const { expect } = require("chai");
const { ethers } = require("hardhat");
const { setBalance } = require("@nomicfoundation/hardhat-network-helpers");


describe("Mask Contract TEST", function () {
    

    let owner
    let acc1
    let acc2
    let contract

    const WLprice1 = ethers.utils.parseEther("0.07")
    const WLprice2 = ethers.utils.parseEther("0.14")
    const WLprice3 = ethers.utils.parseEther("0.21")
    const price1 = ethers.utils.parseEther("0.08")
    const price2 = ethers.utils.parseEther("0.16")
    const price3 = ethers.utils.parseEther("0.24")

    beforeEach(async function(){
        [owner, acc1, acc2, acc3, acc4, acc5 ] = await ethers.getSigners()
        const CONTRACT = await ethers.getContractFactory("Masks", owner)
        contract = await CONTRACT.deploy()
        await contract.deployed()
    })

    async function wait_time(amount) {
        const time = 86400 * amount;  // 1 day
        await ethers.provider.send("evm_increaseTime", [time])
        await ethers.provider.send("evm_mine")
    }

    async function start() {
        await contract.startSale()
        await wait_time(2)
    }

    async function addWL() {
        await contract.addToWhiteList(owner.address)
        await contract.addToWhiteList(acc1.address)
        await contract.addToWhiteList(acc2.address)
    }


    //====================================Regular Mint Functions test====================================
    it("REGULAR MINT Can not 1) mint before start 2) mint zero 3) pay less 4) mint more 2 NFT", async function(){
        await expect(contract.mint(1, { value : 1})).to.be.revertedWith("Sale is not started")
        await start()
        await contract.pause();
        await expect(contract.mint(1, { value : price1})).to.be.revertedWith("Contract is stopped")
        await contract.unpause();
        await expect(contract.mint(0, { value : 0})).to.be.revertedWith("Can't mint 0")
        await expect(contract.mint(1, { value : 1})).to.be.revertedWith("Not enough ether")
        await contract.mint(1, { value : price1});
        await contract.mint(1, { value : price1});
        await expect(contract.mint(1, { value : price1})).to.be.revertedWith("Minted maximum NFT")
        await expect(contract.connect(acc1).mint(3, { value : price3})).to.be.revertedWith("Minted maximum NFT")
        await contract.connect(acc1).mint(2, { value : price2});
        await contract.setID(10000)
        await contract.connect(acc2).mint(1, { value : price1});
        await expect(contract.connect(acc2).mint(1, { value : price1})).to.be.revertedWith("All NFT is minted")
    })

    it("Correctly count and mint NFT", async function(){
        await start()
        await contract.mint(1, { value : price1});
        expect(await ethers.provider.getBalance(contract.address)).to.eq(price1)
        expect(await contract.tokenID()).to.eq(2)
        await contract.mint(1, { value : price1});
        expect(await contract.tokenID()).to.eq(3)
        expect(await contract.ownerOf(1)).to.eq(owner.address)
        expect(await contract.ownerOf(2)).to.eq(owner.address)
        expect(await ethers.provider.getBalance(contract.address)).to.eq(price2)
    })

    it("WHITELIST MINT Can not 1) mint before start 2) mint zero 3) pay less 4) mint more 2 NFT 5) Mint without WL", async function(){
        await expect(contract.whiteListMint(1, { value : WLprice1})).to.be.revertedWith("You are not in white list")
        await addWL()
        await expect(contract.whiteListMint(1, { value : 1})).to.be.revertedWith("Sale is not started")
        await start()
        await contract.pause();
        await expect(contract.whiteListMint(1, { value : WLprice1})).to.be.revertedWith("Contract is stopped")
        await contract.unpause();
        await expect(contract.whiteListMint(0, { value : 0})).to.be.revertedWith("Can't mint 0")
        await expect(contract.whiteListMint(1, { value : 1})).to.be.revertedWith("Not enough ether")
        await contract.whiteListMint(1, { value : WLprice1});
        await contract.whiteListMint(1, { value : WLprice1});
        await expect(contract.whiteListMint(1, { value : WLprice1})).to.be.revertedWith("Minted maximum NFT")
        await expect(contract.connect(acc1).whiteListMint(3, { value : WLprice3})).to.be.revertedWith("Minted maximum NFT")
        await contract.connect(acc1).whiteListMint(2, { value : WLprice2});
        await contract.setID(10000)
        await contract.connect(acc2).whiteListMint(1, { value : WLprice1});
        await expect(contract.connect(acc2).whiteListMint(1, { value : WLprice1})).to.be.revertedWith("All NFT is minted")
    })

    it("Correctly count and mint NFT for WHITELIST", async function(){
        await start()
        await addWL()
        await contract.whiteListMint(1, { value : WLprice1});
        expect(await ethers.provider.getBalance(contract.address)).to.eq(WLprice1)
        expect(await contract.tokenID()).to.eq(2)
        await contract.whiteListMint(1, { value : WLprice1});
        expect(await contract.tokenID()).to.eq(3)
        expect(await contract.ownerOf(1)).to.eq(owner.address)
        expect(await contract.ownerOf(2)).to.eq(owner.address)
        expect(await ethers.provider.getBalance(contract.address)).to.eq(WLprice2)
    })

    //====================================GIFT Mint Functions test====================================

    it("Can not receive gift without permission", async function(){
        await expect(contract.receiveGift()).to.be.revertedWith("Sale is not started")
        await start()
        await expect(contract.receiveGift()).to.be.revertedWith("You are not in gift list or already claimed")
    })

    it("Can receive gift with permission", async function(){
        await start()
        await contract.addGift(acc1.address, 5)
        await expect(contract.addGift(acc1.address, 5)).to.be.revertedWith("Already in giftList")
        await contract.connect(acc1).receiveGift();
        expect(await contract.ownerOf(1)).to.eq(acc1.address)
        expect(await contract.ownerOf(2)).to.eq(acc1.address)
        expect(await contract.ownerOf(3)).to.eq(acc1.address)
        expect(await contract.ownerOf(4)).to.eq(acc1.address)
        expect(await contract.ownerOf(5)).to.eq(acc1.address)
        await expect(contract.connect(acc1).receiveGift()).to.be.revertedWith("You are not in gift list or already claimed")
        await contract.setID(10000)
        await expect(contract.addGift(acc1.address, 5)).to.be.revertedWith("All NFT is minted")
        await contract.addGift(acc1.address, 1)
    })

    it("Owner can change sex of NFT", async function(){
        await start()
        await contract.mint(1, { value : price1});
        expect(await contract.tokenFemale(1)).to.eq(false);
        await contract.changeSex(1)
        expect(await contract.tokenFemale(1)).to.eq(true);
        await expect(contract.connect(acc1).changeSex(1)).to.be.revertedWith("Not an owner of tokenId")
    })

    it("Correct ditribute and withdraw of ETH", async function(){
        await start()
        await contract.mint(1, { value : price1});
        const owner2 = BigInt(price1) / BigInt(100)
        const owner1 = BigInt(price1) - owner2
        expect(await contract.to_owner_2()).to.eq(owner2)
        expect(await contract.to_owner_1()).to.eq(owner1)

        
        const owner2Addr = await ethers.getImpersonatedSigner("0x4e6661d8cD3d3657D917561c4be15821BdE6caa1");

        await setBalance(owner2Addr.address, ethers.utils.parseEther("1"));

        const balanceBefore1 = await ethers.provider.getBalance(owner.address)
        const balanceBefore2 = await ethers.provider.getBalance(owner2Addr.address)
        await contract.withdraw_1();
        await contract.connect(owner2Addr).withdraw_2();
        const balance1 = await ethers.provider.getBalance(owner.address)
        const balance2 = await ethers.provider.getBalance(owner2Addr.address)
        const txBalance1 = BigInt(balance1) - BigInt(balanceBefore1);
        const txBalance2 = BigInt(balance2) - BigInt(balanceBefore2);
        
        expect(txBalance1).to.be.closeTo(owner1, ethers.utils.parseEther("0.000000000001"))
        expect(txBalance2).to.be.closeTo(owner2, ethers.utils.parseEther("0.000000000001"))
    })

    it("Correct ditribute and withdraw of ETH Whitelist", async function(){
        await start()
        await addWL()
        await contract.whiteListMint(1, { value : WLprice1});
        const owner2 = BigInt(WLprice1) / BigInt(100)
        const owner1 = BigInt(WLprice1) - owner2
        expect(await contract.to_owner_2()).to.eq(owner2)
        expect(await contract.to_owner_1()).to.eq(owner1)

        const owner2Addr = await ethers.getImpersonatedSigner("0x4e6661d8cD3d3657D917561c4be15821BdE6caa1");

        await setBalance(owner2Addr.address, ethers.utils.parseEther("1"));

        const balanceBefore1 = await ethers.provider.getBalance(owner.address)
        const balanceBefore2 = await ethers.provider.getBalance(owner2Addr.address)
        await contract.withdraw_1();
        await contract.connect(owner2Addr).withdraw_2();
        const balance1 = await ethers.provider.getBalance(owner.address)
        const balance2 = await ethers.provider.getBalance(owner2Addr.address)
        const txBalance1 = BigInt(balance1) - BigInt(balanceBefore1);
        const txBalance2 = BigInt(balance2) - BigInt(balanceBefore2);
        
        expect(txBalance1).to.be.closeTo(owner1, ethers.utils.parseEther("0.000000000001"))
        expect(txBalance2).to.be.closeTo(owner2, ethers.utils.parseEther("0.000000000001"))
    })


});
