// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Pausable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Masks is  ERC721URIStorage, ERC721Enumerable, Ownable  {


    //====================================States====================================

    string private baseURI; //Male collection
    string private baseURIFemale; //Female collection


    uint immutable public maxAmount = 10001;
    uint public tokenID = 1;

    uint public price = 0.08 ether;
    uint public wlPrice = 0.07 ether;

    uint public to_owner_1;
    uint public to_owner_2;

    uint public startAt; 

    address public owner_1;
    address public owner_2;

    bool public stopped;
    bool public revealed;

    mapping(address => bool) public whitelist;
    mapping(address => bool) private isRemoved;
    mapping(address => client) public giftlist; //address => clientInfo 
    mapping(address => uint) public limitOfMint; //max 2 nft
    mapping(uint => bool) public tokenFemale;
    //mapping(address => uint[]) public tokensIdToOwner;


    struct client {
        uint amount;
        uint fromId;
        bool inList;
    }
    //====================================Modifiers====================================

    modifier isStopped() {
        require(!stopped, "Contract is stopped");
        _;
    }

    constructor() ERC721("TestTokenBBB ", "GBBA") {
        owner_1 = msg.sender;
        owner_2 = 0x4e6661d8cD3d3657D917561c4be15821BdE6caa1;
    }

    function _burn(uint tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }


    function _beforeTokenTransfer(address from, address to, uint tokenId, uint256 batchSize) internal override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    //====================================Mint Functions====================================


    function mint(uint _amount) external payable isStopped {
        require(_amount > 0, "Can't mint 0");
        require(startAt > 0 && block.timestamp > startAt + 1 days, "Sale is not started");
        require(_amount * price <= msg.value, "Not enough ether");
        require(limitOfMint[msg.sender]+_amount <= 2, "Minted maximum NFT");
        require(tokenID+_amount <= maxAmount, "All NFT is minted");
        limitOfMint[msg.sender] += _amount;
        to_owner_2 = msg.value / 100;
        to_owner_1 = msg.value - to_owner_2;
        if (_amount == 1) {
            _mint(msg.sender, tokenID);
            tokenID++;
        }
        else {
            for (uint i; i<2; i++) {
                _mint(msg.sender, tokenID);
                tokenID++;  
            }
        }
    }


    function whiteListMint(uint _amount) external payable isStopped {
        require(whitelist[msg.sender], "You are not in white list");
        require(_amount > 0, "Can't mint 0");
        require(startAt > 0 && block.timestamp > startAt + 1 days, "Sale is not started");
        require(_amount * wlPrice <= msg.value, "Not enough ether");
        require(limitOfMint[msg.sender]+_amount <= 2, "Minted maximum NFT");
        require(tokenID+_amount <= maxAmount, "All NFT is minted");
        limitOfMint[msg.sender] += _amount;
        to_owner_2 = msg.value / 100;
        to_owner_1 = msg.value - to_owner_2;
        if (_amount == 1) {
            _mint(msg.sender, tokenID);
            tokenID++;
        }
        else {
            for (uint i; i<2; i++) {
                _mint(msg.sender, tokenID);
                tokenID++;
            }
        }

    }



    function receiveGift() external isStopped {
        require(startAt > 0 && block.timestamp > startAt + 1 days, "Sale is not started");
        require(giftlist[msg.sender].inList == true, "You are not in gift list or already claimed");
        giftlist[msg.sender].inList = false;
        uint localTokenId = giftlist[msg.sender].fromId;
        for (uint i; i<giftlist[msg.sender].amount; i++) {
                _mint(msg.sender, localTokenId);
                localTokenId++;
        }
    }   


    function nftGender(uint tokenId) external view returns (bool) {
        require(_exists(tokenId), "ERC721Metadata: query for nonexistent token");
        return tokenFemale[tokenId];
    }

    function tokenURI(uint tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        require(_exists(tokenId), "ERC721Metadata: query for nonexistent token");
        if (!revealed) {
            return "ipfs://QmQifKyi3nBzHowpbgoPcxsVSzEu321FKBojUchuE491uy/Hidden.json";
        }
        if(tokenFemale[tokenId]){
            return string(abi.encodePacked(baseURIFemale, Strings.toString(tokenId), ".json"));
        }else{
           return string(abi.encodePacked(baseURI, Strings.toString(tokenId), ".json"));  
        }
    }

    function changeSex(uint _tokenId) external {
        require(ownerOf(_tokenId) == msg.sender, "Not an owner of tokenId");
        tokenFemale[_tokenId] = !tokenFemale[_tokenId];
    } 
    
    //====================================Admin's functions====================================

    function pause() external onlyOwner {
        require(!stopped, "Already stopped");
        stopped = true;
    }

    function unpause() external onlyOwner {
        require(stopped, "Already is started");
        stopped = false;
    }

    function startSale() external onlyOwner {
        startAt = block.timestamp;
    }

    function changePrice(uint _amount) external onlyOwner {
        price = _amount;
    }

    function changeWLPrice(uint _amount) external onlyOwner {
        wlPrice = _amount;
    }

    function addToWhiteList(address _address) external onlyOwner{
        require(!whitelist[_address], "Already in whitelist");
        whitelist[_address] = true;
    }

    function removeFromWhiteList(address _address) external onlyOwner{
        require(whitelist[_address], "Already not in whitelist");
        whitelist[_address] = false;
    }

    function setBaseURI(string memory _uri) external onlyOwner {
        baseURI = _uri;
    }

    function setFemaleURI(string memory _uri) external onlyOwner {
        baseURIFemale= _uri;
    }

    function addGift(address _address, uint _amount) external onlyOwner {
        require(tokenID+_amount <= maxAmount, "All NFT is minted");
        require(!giftlist[_address].inList, "Already in giftList");
        giftlist[_address].amount = _amount;
        giftlist[_address].fromId = tokenID;
        giftlist[_address].inList = true;
        tokenID += _amount;
    }

    function withdraw_1() external onlyOwner {
        payable(owner_1).transfer(to_owner_1);
    }

    function withdraw_2() external {
    require(msg.sender == owner_2, "Not an owner_2");
        payable(owner_2).transfer(to_owner_2);
    }

    function reveal(string memory _baseURI, string memory _baseURIFemale) external onlyOwner {
        revealed = true;
        baseURI = _baseURI;
        baseURIFemale = _baseURIFemale;
    }

    //====================================Admin's functions====================================
    //                                THIS FUNCTION ONLY FOR TEST

    function setID(uint _id) public {
        tokenID = _id;
    }

}