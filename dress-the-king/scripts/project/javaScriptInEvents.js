// ============================================
// IMPORTS FOR EVENTS
// ============================================
// This file imports all gameplay modules and exposes them to event sheets via globalThis
// Purpose: Set this file's Purpose to "Imports for events" in Construct 3 Project Bar

// MODULE IMPORTS (no folder paths - Construct 3 flattens all files)
// ============================================
import * as GameConfig from "./GameConfig.js";
import * as LevelLoader from "./LevelLoader.js";
import * as BrokeBoxManager from "./BrokeBoxManager.js";
import * as SwipeHandler from "./SwipeHandler.js";
import * as SwipeController from "./SwipeController.js";
import * as MatchDetector from "./MatchDetector.js";
import * as GravitySystem from "./GravitySystem.js";
import * as SpawnSystem from "./SpawnSystem.js";
import * as ChainReaction from "./ChainReaction.js";
import * as ChainReactionController from "./ChainReactionController.js";
import * as MoveSystem from "./MoveSystem.js";
import * as TaskProgress from "./TaskProgress.js";
import * as WinConditions from "./WinConditions.js";
import * as UIManager from "./UIManager.js";
import * as LevelRenderer from "./LevelRenderer.js";
import * as BoosterCombos from "./BoosterCombos.js";
import * as TNT from "./TNT.js";
import * as Rocket from "./Rocket.js";
import * as LightBall from "./LightBall.js";
import * as GridManager from "./GridManager.js";
import * as DevHelpers from "./DevHelpers.js";
import * as Grass from "./Grass.js";
import * as TouchHelper from "./TouchHelper.js";
import * as Tree from "./Tree.js";
import * as Toys from "./Toys.js";
import * as GiftBox from "./GiftBox.js";

// ============================================
// EXPOSE TO GLOBAL SCOPE
// ============================================
// Event sheets access these via globalThis
globalThis.GameConfig = GameConfig;
globalThis.LevelLoader = LevelLoader;
globalThis.BrokeBoxManager = BrokeBoxManager;
globalThis.SwipeHandler = SwipeHandler;
globalThis.SwipeController = SwipeController;
globalThis.MatchDetector = MatchDetector;
globalThis.GravitySystem = GravitySystem;
globalThis.SpawnSystem = SpawnSystem;
globalThis.ChainReaction = ChainReaction;
globalThis.ChainReactionController = ChainReactionController;
globalThis.MoveSystem = MoveSystem;
globalThis.TaskProgress = TaskProgress;
globalThis.WinConditions = WinConditions;
globalThis.UIManager = UIManager;
globalThis.LevelRenderer = LevelRenderer;
globalThis.BoosterCombos = BoosterCombos;
globalThis.GridManager = GridManager;
globalThis.TNT = TNT;
globalThis.Rocket = Rocket;
globalThis.LightBall = LightBall;
globalThis.Grass = Grass;
globalThis.TouchHelper = TouchHelper;
globalThis.Tree = Tree;
globalThis.Toys = Toys;

// Expose all commonly used functions and variables
// WinConditions
globalThis.resetGameState = WinConditions.resetGameState;
globalThis.resetLevelProgress = WinConditions.resetLevelProgress;
globalThis.checkWinFailConditions = WinConditions.checkWinFailConditions;
globalThis.checkDroppedWinCondition = WinConditions.checkDroppedWinCondition;
globalThis.checkStandardWinCondition = WinConditions.checkStandardWinCondition;
globalThis.checkBrokeWinCondition = WinConditions.checkBrokeWinCondition;
globalThis.checkBrokeAndStandardWinCondition = WinConditions.checkBrokeAndStandardWinCondition;
globalThis.checkSandDropWinCondition = WinConditions.checkSandDropWinCondition;
globalThis.checkGrassWinCondition = WinConditions.checkGrassWinCondition;
globalThis.checkTreeWinCondition = WinConditions.checkTreeWinCondition;
globalThis.gameEnded = WinConditions.gameEnded;
globalThis.isLevelCompleted = WinConditions.isLevelCompleted;
globalThis.failCheckInProgress = WinConditions.failCheckInProgress;

// GravitySystem
globalThis.getTilePosition = GravitySystem.getTilePosition;
globalThis.calculateScaleFactor = GravitySystem.calculateScaleFactor;
globalThis.applyGravity = GravitySystem.applyGravity;

// SpawnSystem
globalThis.spawnNewTiles = SpawnSystem.spawnNewTiles;
globalThis.spawnSpecificTile = SpawnSystem.spawnSpecificTile;

// ChainReaction
globalThis.removeMatchedTiles = ChainReaction.removeMatchedTiles;
globalThis.chainReactionLoop = ChainReactionController.chainReactionLoop;

// TaskProgress
globalThis.initializeTasks = TaskProgress.initializeTasks;
globalThis.updateStandardTaskProgress = TaskProgress.updateStandardTaskProgress;
globalThis.updateDroppedItemProgress = TaskProgress.updateDroppedItemProgress;
globalThis.updateWoodBoxProgress = TaskProgress.updateWoodBoxProgress;
globalThis.updateWoodBox2Progress = TaskProgress.updateWoodBox2Progress;
globalThis.updateGrassProgress = TaskProgress.updateGrassProgress;
globalThis.updateGrass2Progress = TaskProgress.updateGrass2Progress;
globalThis.areStandardTasksCompleted = TaskProgress.areStandardTasksCompleted;
globalThis.areDroppedItemsCompleted = TaskProgress.areDroppedItemsCompleted;
globalThis.isWoodBoxTaskCompleted = TaskProgress.isWoodBoxTaskCompleted;
globalThis.isWoodBox2TaskCompleted = TaskProgress.isWoodBox2TaskCompleted;
globalThis.isGrassTaskCompleted = TaskProgress.isGrassTaskCompleted;
globalThis.isGrass2TaskCompleted = TaskProgress.isGrass2TaskCompleted;
globalThis.getWoodBoxProgress = TaskProgress.getWoodBoxProgress;
globalThis.getGrassProgress = TaskProgress.getGrassProgress;
globalThis.getGrassTask = TaskProgress.getGrassTask;
globalThis.processedTiles = TaskProgress.processedTiles;
globalThis.remainingStandardTasks = TaskProgress.remainingStandardTasks;
globalThis.standardTaskProgress = TaskProgress.standardTaskProgress;
globalThis.remainingDroppedItems = TaskProgress.remainingDroppedItems;
globalThis.woodBoxTask = TaskProgress.woodBoxTask;
globalThis.woodBoxProgress = TaskProgress.woodBoxProgress;
globalThis.grassTask = TaskProgress.grassTask;
globalThis.grassProgress = TaskProgress.grassProgress;

// MoveSystem
globalThis.initializeMoveSystem = MoveSystem.initializeMoveSystem;
globalThis.decreaseMove = MoveSystem.decreaseMove;
globalThis.getRemainingMoves = MoveSystem.getRemainingMoves;
globalThis.hasNoMovesLeft = MoveSystem.hasNoMovesLeft;
globalThis.remainingMoves = MoveSystem.remainingMoves;

// UIManager
globalThis.updateMoveUI = UIManager.updateMoveUI;
globalThis.updateTaskProgressUI = UIManager.updateTaskProgressUI;
globalThis.updateBrokeBoxHealthUI = UIManager.updateBrokeBoxHealthUI;
globalThis.createTaskRewardUI = UIManager.createTaskRewardUI;

// BrokeBoxManager
globalThis.initializeBrokeBoxes = BrokeBoxManager.initializeBrokeBoxes;
globalThis.checkBrokeBoxDamage = BrokeBoxManager.checkBrokeBoxDamage;
globalThis.getBrokeBoxes = BrokeBoxManager.getBrokeBoxes;
globalThis.areAllBrokeBoxesDestroyed = BrokeBoxManager.areAllBrokeBoxesDestroyed;
globalThis.brokeBoxes = BrokeBoxManager.brokeBoxes;

// LevelLoader
globalThis.loadLevelData = LevelLoader.loadLevelData;
globalThis.getLevelData = LevelLoader.getLevelData;
globalThis.setCurrentLevel = LevelLoader.setCurrentLevel;
globalThis.getCurrentLevelData = LevelLoader.getCurrentLevelData;
globalThis.getTotalLevels = LevelLoader.getTotalLevels;
globalThis.levelsData = LevelLoader.levelsData;
globalThis.currentLevelData = LevelLoader.currentLevelData;

// GridManager
globalThis.createGrid = GridManager.createGrid;
globalThis.getGrid = GridManager.getGrid;
globalThis.setGrid = GridManager.setGrid;
globalThis.clearGrid = GridManager.clearGrid;

// LevelRenderer
globalThis.renderGrid = LevelRenderer.renderGrid;

// MatchDetector
globalThis.findMatches = MatchDetector.findMatches;
globalThis.isBooster = MatchDetector.isBooster;
globalThis.isDroppedTile = MatchDetector.isDroppedTile;
globalThis.isBrokeBox = MatchDetector.isBrokeBox;
globalThis.isGiftBox = MatchDetector.isGiftBox;
globalThis.getTileUIDsFromPositions = MatchDetector.getTileUIDsFromPositions;
globalThis.isTileInMatch = MatchDetector.isTileInMatch;

// SwipeSystem
globalThis.detectSwipeDirection = SwipeController.detectSwipeDirection;
globalThis.getTileAtCoordinates = SwipeHandler.getTileAtCoordinates;
globalThis.calculateSwipeDirection = SwipeHandler.calculateSwipeDirection;
globalThis.isValidSwap = SwipeHandler.isValidSwap;
globalThis.hasActiveTileAnimations = SwipeHandler.hasActiveTileAnimations;

// BoosterCombos
globalThis.detectBoosterCombo = BoosterCombos.detectBoosterCombo;
globalThis.executeBoosterCombo = BoosterCombos.executeBoosterCombo;

// TNT
globalThis.activateTNT = TNT.activateTNT;
globalThis.activateTNTTNT = TNT.activateTNTTNT;
globalThis.isTNT = TNT.isTNT;
globalThis.createTNT = TNT.createTNT;

// Rocket
globalThis.activateRocket = Rocket.activateRocket;
globalThis.activateRocketRocket = Rocket.activateRocketRocket;
globalThis.isRocket = Rocket.isRocket;
globalThis.createRocket = Rocket.createRocket;

// Expose constants
globalThis.GRID_TYPES = GameConfig.GRID_TYPES;
globalThis.GAME_CONSTANTS = GameConfig.GAME_CONSTANTS;
globalThis.BOOSTER_TYPES = GameConfig.BOOSTER_TYPES;
globalThis.SPECIAL_TILES = GameConfig.SPECIAL_TILES;

// Development Helpers
globalThis.clearAllWoodBoxes = DevHelpers.clearAllWoodBoxes;

// Grass Special Tile Functions
globalThis.placeGrassSprites = Grass.placeGrassSprites;
globalThis.destroyGrassForTiles = Grass.destroyGrassForTiles;
globalThis.destroyGrassAt = Grass.destroyGrassAt;
globalThis.countRemainingGrass = Grass.countRemainingGrass;
globalThis.hasGrassAt = Grass.hasGrassAt;

// Tree Special Tile Functions
globalThis.placeTrees = Tree.placeTrees;
globalThis.renderTrees = Tree.renderTrees;
globalThis.growTreesFromMatches = Tree.growTreesFromMatches;
globalThis.growTree = Tree.growTree;
globalThis.initializeTreeTask = Tree.initializeTreeTask;
globalThis.updateTreeProgress = Tree.updateTreeProgress;
globalThis.isTreeTaskCompleted = Tree.isTreeTaskCompleted;
globalThis.countFullyGrownTrees = Tree.countFullyGrownTrees;
globalThis.updateTreePositions = Tree.updateTreePositions;
globalThis.resetTrees = Tree.resetTrees;
globalThis.treePositions = Tree.treePositions;

// Toys Collectible Functions
globalThis.isToy = Toys.isToy;
globalThis.initializeToys = Toys.initializeToys;
globalThis.findAllToys = Toys.findAllToys;
globalThis.checkAndCollectToys = Toys.checkAndCollectToys;
globalThis.getToysProgress = Toys.getToysProgress;
globalThis.areToysCollected = Toys.areToysCollected;

// GiftBox
globalThis.initializeGiftBoxTask = GiftBox.initializeGiftBoxTask;
globalThis.getAdjacentGiftBoxes = GiftBox.getAdjacentGiftBoxes;
globalThis.destroyGiftBoxes = GiftBox.destroyGiftBoxes;
globalThis.updateGiftBoxProgress = GiftBox.updateGiftBoxProgress;
globalThis.isGiftBoxTaskCompleted = GiftBox.isGiftBoxTaskCompleted;
globalThis.getGiftBoxProgress = GiftBox.getGiftBoxProgress;
globalThis.getGiftBoxTask = GiftBox.getGiftBoxTask;
globalThis.resetGiftBoxTracking = GiftBox.resetGiftBoxTracking;

// Touch System (pure JavaScript - no event sheet needed!)
globalThis.initTouchSystem = TouchHelper.initTouchSystem;
globalThis.cleanupTouchSystem = TouchHelper.cleanupTouchSystem;

console.log("[IMPORTS] ✅ All gameplay modules loaded and exposed to globalThis");
console.log("[IMPORTS] ✅ Event sheets can now call: GridManager.createGrid(), etc.");

// Initialize development helpers
if (DevHelpers.initDevHelpers) {
    DevHelpers.initDevHelpers();
}

// Initialize touch system (pure JavaScript - no event sheet needed!)
// This runs automatically after modules are loaded
if (typeof window !== 'undefined') {
    // Wait a bit for runtime to be fully ready
    setTimeout(() => {
        if (globalThis.initTouchSystem) {
            globalThis.initTouchSystem();
        }
    }, 500);
}


const scriptsInEvents = {

	async Setup_Event77_Act1(runtime, localVars)
	{
		localStorage.clear();
		console.log("Clear.");
		
	},

	async Setup_Event88_Act1(runtime, localVars)
	{
		resetChestTimer();
	},

	async Setup_Event95_Act12(runtime, localVars)
	{
		updateVariable("add", "gold", localVars.valuee);
		
		addToA("gold", 100);
	},

	async Setup_Event99_Act7(runtime, localVars)
	{
		playRewardAnimations();
	},

	async Setup_Event104_Act1(runtime, localVars)
	{
		updateStarRewards();
		checkAndSetNextArea();
	},

	async Setup_Event107_Act1(runtime, localVars)
	{
		handleStarRewards();
	},

	async Setup_Event112_Act1(runtime, localVars)
	{
		handleStarRewardClick();
	},

	async Setup_Event113_Act6(runtime, localVars)
	{
		updateStarRewards();
	},

	async Setup_Event113_Act8(runtime, localVars)
	{
		playRewardAnimations();
	},

	async Setup_Event116_Act1(runtime, localVars)
	{
		// Check if localStorage is empty
		if (localStorage.length === 0) {
		    console.log("LocalStorage is empty. Initializing default values...");
		
		    // Call updateVariable functions for initial setup
		    updateVariable("set", "gold", 100);
		    updateVariable("set", "wheelticket", 1);
			updateVariable("set", "diamond", 1);
		}
		
	},

	async Setup_Event116_Act3(runtime, localVars)
	{
		updateVariable("add", "gold", 0);
		updateVariable("add", "wheelticket", 0);
		updateVariable("add", "diamond", 0);
	},

	async Setup_Event118_Act1(runtime, localVars)
	{
		updateVariable(localVars.addorsub, localVars.v, localVars.value);
	},

	async Setup_Event145_Act3(runtime, localVars)
	{
		addToA("gold", 50)
	},

	async Setup_Event146_Act3(runtime, localVars)
	{
		addToA("gold", 50)
	},

	async Setup_Event149_Act8(runtime, localVars)
	{
		playRewardAnimations();
	},

	async Setup_Event149_Act9(runtime, localVars)
	{
const savedCollections = localStorage.getItem(`${gamePrefix}collections`);

if (savedCollections) {
    const collectionsArray = JSON.parse(savedCollections);

    const claimableCollections = collectionsArray.filter(collection => {
        const totalCards = collection.cards.length;
        const collectedCards = collection.cards.filter(card => card.collected === 1).length;
        return collectedCards === totalCards && collection.completed === 0;
    });

    const howCollectionText = runtime.objects.spriteText.getAllInstances().find(obj => obj.instVars.w === "howcollection");
    const redCircle = runtime.objects.redcircle.getAllInstances().find(obj => obj.instVars.w === "howcollection");

    if (claimableCollections.length > 0) {
        if (howCollectionText) {
            howCollectionText.text = claimableCollections.length.toString();
        }
        if (redCircle) {
            redCircle.isVisible = true;
        }
    } else {
        if (howCollectionText) {
            howCollectionText.text = "0";
        }
        if (redCircle) {
            redCircle.isVisible = false;
        }
    }
} else {
    fetch("collection.json")
        .then(response => response.json())
        .then(data => {
            const collectionsArray = data.collections;

            const claimableCollections = collectionsArray.filter(collection => {
                const totalCards = collection.cards.length;
                const collectedCards = collection.cards.filter(card => card.collected === 1).length;
                return collectedCards === totalCards && collection.completed === 0;
            });

            const howCollectionText = runtime.objects.spriteText.getAllInstances().find(obj => obj.instVars.w === "howcollection");
            const redCircle = runtime.objects.redcircle.getAllInstances().find(obj => obj.instVars.w === "howcollection");

            if (claimableCollections.length > 0) {
                if (howCollectionText) {
                    howCollectionText.text = claimableCollections.length.toString();
                }
                if (redCircle) {
                    redCircle.isVisible = true;
                }
            } else {
                if (howCollectionText) {
                    howCollectionText.text = "0";
                }
                if (redCircle) {
                    redCircle.isVisible = false;
                }
            }
        })
        .catch(error => {});
}

	},

	async Setup_Event154_Act1(runtime, localVars)
	{
const savedCollections = localStorage.getItem(`${gamePrefix}collections`);

if (savedCollections) {
    const collectionsArray = JSON.parse(savedCollections);

    const claimableCollections = collectionsArray.filter(collection => {
        const totalCards = collection.cards.length;
        const collectedCards = collection.cards.filter(card => card.collected === 1).length;
        return collectedCards === totalCards && collection.completed === 0;
    });

    const howCollectionText = runtime.objects.spriteText.getAllInstances().find(obj => obj.instVars.w === "howcollection");
    const redCircle = runtime.objects.redcircle.getAllInstances().find(obj => obj.instVars.w === "howcollection");

    if (claimableCollections.length > 0) {
        if (howCollectionText) {
            howCollectionText.text = claimableCollections.length.toString();
        }
        if (redCircle) {
            redCircle.isVisible = true;
        }
    } else {
        if (howCollectionText) {
            howCollectionText.text = "0";
        }
        if (redCircle) {
            redCircle.isVisible = false;
        }
    }
} else {
    fetch("collection.json")
        .then(response => response.json())
        .then(data => {
            const collectionsArray = data.collections;

            const claimableCollections = collectionsArray.filter(collection => {
                const totalCards = collection.cards.length;
                const collectedCards = collection.cards.filter(card => card.collected === 1).length;
                return collectedCards === totalCards && collection.completed === 0;
            });

            const howCollectionText = runtime.objects.spriteText.getAllInstances().find(obj => obj.instVars.w === "howcollection");
            const redCircle = runtime.objects.redcircle.getAllInstances().find(obj => obj.instVars.w === "howcollection");

            if (claimableCollections.length > 0) {
                if (howCollectionText) {
                    howCollectionText.text = claimableCollections.length.toString();
                }
                if (redCircle) {
                    redCircle.isVisible = true;
                }
            } else {
                if (howCollectionText) {
                    howCollectionText.text = "0";
                }
                if (redCircle) {
                    redCircle.isVisible = false;
                }
            }
        })
        .catch(error => {});
}

	},

	async Setup_Event156_Act1(runtime, localVars)
	{
		checkPuzzleTimer();
		
		const redCircle = runtime.objects.redcircle.getAllInstances().find(obj => obj.instVars.w === "howpuzzle");
		const howPuzzleText = runtime.objects.spriteText.getAllInstances().find(obj => obj.instVars.w === "howpuzzle");
		
		if (runtime.globalVars.puzzleactive === 1) {
		    if (redCircle) {
		        redCircle.isVisible = true;
		    }
		    if (howPuzzleText) {
		        howPuzzleText.text = "1";
		    }
		} else {
		    if (redCircle) {
		        redCircle.isVisible = false;
		    }
		    if (howPuzzleText) {
		        howPuzzleText.text = "";
		    }
		}
		
	},

	async Setup_Event167_Act2(runtime, localVars)
	{
		prevPage();
	},

	async Setup_Event168_Act2(runtime, localVars)
	{
		nextPage();
	},

	async Setup_Event198_Act3(runtime, localVars)
	{
		equipItem();
	},

	async Setup_Event199_Act3(runtime, localVars)
	{
		equipItem();
	},

	async Setup_Event200_Act3(runtime, localVars)
	{
		equipItem();
	},

	async Setup_Event201_Act3(runtime, localVars)
	{
		equipItem();
	},

	async Setup_Event202_Act3(runtime, localVars)
	{
		equipItem();
	},

	async Setup_Event203_Act3(runtime, localVars)
	{
		equipItem();
	},

	async Setup_Event204_Act3(runtime, localVars)
	{
		equipItem();
	},

	async Setup_Event206_Act1(runtime, localVars)
	{
		createWardrobeList("CLOTH");
	},

	async Setup_Event207_Act1(runtime, localVars)
	{
		createWardrobeList("CROWN");
	},

	async Setup_Event208_Act1(runtime, localVars)
	{
		createWardrobeList("SCEPTER");
	},

	async Setup_Event209_Act1(runtime, localVars)
	{
		createWardrobeList("HAIR");
	},

	async Setup_Event210_Act1(runtime, localVars)
	{
		createWardrobeList("PET");
	},

	async Setup_Event211_Act1(runtime, localVars)
	{
		createWardrobeList("RING");
	},

	async Setup_Event212_Act1(runtime, localVars)
	{
		createWardrobeList("BEARD");
	},

	async Setup_Event213_Act1(runtime, localVars)
	{

	},

	async Setup_Event214_Act11(runtime, localVars)
	{
		createWardrobeList("CROWN");
		loadEquippedItemsForList();
	},

	async Setup_Event215_Act14(runtime, localVars)
	{
		loadEquippedItems();
	},

	async Setup_Event216_Act1(runtime, localVars)
	{
		loadEquippedItems();
	},

	async Start_Event1_Act14(runtime, localVars)
	{
		updateCurrentLevelText();
	},

	async Start_Event1_Act17(runtime, localVars)
	{
		initializeDressUpSystem();
	},

	async Start_Event1_Act19(runtime, localVars)
	{
		listDressUpItems();
	},

	async Start_Event10_Act1(runtime, localVars)
	{
		const clickedObject = runtime.objects.areaopen3.getFirstPickedInstance();
		
		if (clickedObject) {
		    const areaName = clickedObject.instVars.name;
		    const partName = clickedObject.instVars.part;
		    const price = clickedObject.instVars.price;
		
		    if (areaName && partName) {
		        const diamondCount = datainfo("diamond"); // Get current diamond count
		
		        if (diamondCount >= price) {
		            setPartActive(areaName, partName);
		            updateVariable("sub", "diamond", price); // Subtract price from diamond
		        } else {
		            runtime.callFunction("message","Not enough @!",0,0,0);
		        }
		    } else {
		        console.error("The clicked object is missing 'name' or 'part' instance variables.");
		    }
		} else {
		    console.error("No areaopen3 object is selected.");
		}
		
	},

	async Start_Event10_Act9(runtime, localVars)
	{
		checkActiveAreaCompletion();
	},

	async Start_Event14_Act2(runtime, localVars)
	{
		activateAllPartsSequentially();
	},

	async Start_Event16_Act1(runtime, localVars)
	{
		const picked = runtime.objects.Letters.getPickedInstances()[0];
		if (picked) {
		  guessLetter(picked.instVars.uuid);
		}
		
	},

	async Start_Event17_Act1(runtime, localVars)
	{
		end();
		
	},

	async Start_Event17_Act3(runtime, localVars)
	{
		checkPlayableWordsOrRearrange();
	},

	async Start_Event37_Act1(runtime, localVars)
	{

	},

	async Start_Event37_Act10(runtime, localVars)
	{

	},

	async Start_Event41_Act7(runtime, localVars)
	{
const endLevelText = runtime.objects.spriteText.getAllInstances().find(spriteText => spriteText.instVars.w === "endlevel");
if (endLevelText) {
    const currentLevel = parseInt(localStorage.getItem(`${gamePrefix}currentLevel`), 10) || 1;
    endLevelText.text = `Level ${currentLevel}`;
}

	},

	async Start_Event46_Act2(runtime, localVars)
	{
		playRewardAnimations();
	},

	async Start_Event47_Act1(runtime, localVars)
	{
if (runtime.layout.name === "Lobby") {
    const areas = loadAreas();
    const activeArea = getActiveArea();

    areas.forEach(area => {
        const layer = runtime.layout.getLayer(area.name);
        if (layer) {
            layer.isVisible = area.name === activeArea;
        }
    });

    runtime.objects.parts.instances().forEach(instance => {
        const partName = instance.instVars.n;
        const areaName = instance.instVars.w;

        if (!partName || !areaName) {
            instance.isVisible = false;
            return;
        }

        if (areaName === activeArea) {
            const area = areas.find(a => a.name === activeArea);
            if (area && area.parts && typeof area.parts === "object" && Object.prototype.hasOwnProperty.call(area.parts, partName)) {
                const partData = area.parts[partName];
                const partStatus = typeof partData === "object" && partData !== null ? partData.status || 0 : partData;
                instance.isVisible = partStatus === 1;
            } else {
                instance.isVisible = false;
            }
        } else {
            instance.isVisible = false;
        }
    });

    const area = areas.find(a => a.name === activeArea);
    if (area && area.parts && typeof area.parts === "object") {
        const totalParts = Object.keys(area.parts).length;
        const openParts = Object.values(area.parts).filter(value =>
            typeof value === "object" && value !== null ? value.status === 1 : value === 1
        ).length;

        const areatextInstance = runtime.objects.areatext.getFirstInstance();
        if (areatextInstance) {
            areatextInstance.text = `${openParts}/${totalParts}`;
        }

        const activeAreaIndex = areas.indexOf(area);
        if (activeAreaIndex !== -1) {
            const displayAreaIndex = activeAreaIndex + 1;

            const allSpriteTexts = runtime.objects.spriteText.getAllInstances();
            const areaButtonText = allSpriteTexts.find(spr => spr.instVars.w === "startareabutton");

            if (areaButtonText) {
                areaButtonText.text = `Area  ${displayAreaIndex}`;
            }
        }

        // === Güncelleme: "howarea" ve "howpart" diamond kontrolüne göre ===
        const playerDiamonds = datainfo("diamond"); // Diamond değerini al
        let affordableParts = Object.values(area.parts)
            .filter(part =>
                typeof part === "object" && part !== null && part.status === 0 && playerDiamonds >= part.goldCost
            )
            .slice(0, 3); // En fazla 3 uygun parça al

        const howareaText = runtime.objects.spriteText.getAllInstances().find(spr => spr.instVars.w === "howarea");
        if (howareaText) {
            howareaText.text = `${affordableParts.length}`;
        }

       const howpartCircle = runtime.objects.redcircle.getAllInstances().find(obj => obj.instVars.w === "howpart");
const howPartText = runtime.objects.spriteText.getAllInstances().find(obj => obj.instVars.w === "howpart");

if (affordableParts.length > 0) {
    if (howpartCircle) {
        howpartCircle.isVisible = true;
    }
    if (howPartText) {
        howPartText.text = affordableParts.length.toString();
    }
} else {
    if (howpartCircle) {
        howpartCircle.isVisible = false;
    }
    if (howPartText) {
        howPartText.text = "";
    }
}
    }
}

	},

	async Start_Event48_Act1(runtime, localVars)
	{
		failGame();
	},

	async Start_Event49_Act1(runtime, localVars)
	{

	},

	async Start_Event50_Act1(runtime, localVars)
	{
		lootItem();
	},

	async Start_Event51_Act1(runtime, localVars)
	{

	},

	async Start_Event52_Act1(runtime, localVars)
	{
		updateVariable("set","diamond",1)
	},

	async Start_Event53_Act1(runtime, localVars)
	{

	},

	async Start_Event54_Act1(runtime, localVars)
	{

	},

	async Start_Event55_Act1(runtime, localVars)
	{

	},

	async Collection_Event5_Act1(runtime, localVars)
	{
let collectionsArray = [];
const collectionYSpacing = 380;
const collectionXSpacing = 350;
const collectionYOffset = 340;

const ninePatchChours = runtime.objects["9patchchours"].getFirstInstance();
if (ninePatchChours) {
    ninePatchChours.instVars.listTotHeight = 0;
}

const allCollectionImgs = runtime.objects.collectionimg.getAllInstances();
allCollectionImgs.forEach(instance => instance.destroy());

const savedCollections = localStorage.getItem(`${gamePrefix}collections`);

if (savedCollections) {
    collectionsArray = JSON.parse(savedCollections);
    renderCollections(collectionsArray);
    updateGrandProgressBar(collectionsArray);
} else {
    fetch("collection.json")
        .then(response => response.json())
        .then(data => {
            collectionsArray = data.collections;
            localStorage.setItem(`${gamePrefix}collections`, JSON.stringify(collectionsArray));
            renderCollections(collectionsArray);
            updateGrandProgressBar(collectionsArray);
        })
        .catch(error => {});
}

function renderCollections(collectionsArray) {
    const collectionBg = runtime.objects.collectionpagebg.getFirstInstance();
    if (!collectionBg) return;

    const startX = runtime.layout.width / 2;
    const startY = collectionBg.y + collectionYOffset;

    let row = 0;
    let col = 0;

    collectionsArray.forEach((collection, index) => {
        const collectionImg = runtime.objects.collectionimg.createInstance("list", 0, 0, 1);

        const x = startX + (col - 1) * collectionXSpacing;
        const y = startY + row * collectionYSpacing;

        collectionImg.x = x;
        collectionImg.y = y;
        collectionImg.setAnimation(collection.name);

        const allCollectionTexts = runtime.objects.collectiontext.getAllInstances();
        if (allCollectionTexts.length > 0) {
            const lastCreatedText = allCollectionTexts[allCollectionTexts.length - 1];
            lastCreatedText.text = collection.name;
        }

        const allCollectionCollectButtons = runtime.objects.collectioncollect.getAllInstances();
        if (allCollectionCollectButtons.length > 0) {
            const lastCreatedCollectButton = allCollectionCollectButtons[allCollectionCollectButtons.length - 1];
            lastCreatedCollectButton.instVars.name = collection.name;
        }

        const allProgressBgs = runtime.objects.collectionprogressbg.getAllInstances();

        if (collection.cards.filter(card => card.collected === 1).length === collection.cards.length) {
            if (collection.completed === 0) {
                if (allProgressBgs.length > 0) {
                    allProgressBgs[allProgressBgs.length - 1].destroy();
                }
                if (allCollectionCollectButtons.length > 0) {
                    const lastCreatedCollectButton = allCollectionCollectButtons[allCollectionCollectButtons.length - 1];
                    lastCreatedCollectButton.isVisible = true;
                    lastCreatedCollectButton.instVars.w = collection.name;
                }
            } else if (collection.completed === 1) {
                if (allProgressBgs.length > 0) {
                    allProgressBgs[allProgressBgs.length - 1].destroy();
                }
                if (allCollectionCollectButtons.length > 0) {
                    allCollectionCollectButtons[allCollectionCollectButtons.length - 1].destroy();
                }
            }
        }

        const allProgressTexts = runtime.objects.spriteText.getAllInstances();
        if (allProgressTexts.length > 0) {
            const filteredProgressTexts = allProgressTexts.filter(instance => instance.instVars.w === "collectioncount");
            if (filteredProgressTexts.length > 0) {
                const lastProgressText = filteredProgressTexts[filteredProgressTexts.length - 1];
                const collectedCards = collection.cards.filter(card => card.collected === 1).length;
                const totalCards = collection.cards.length;
                lastProgressText.text = `${collectedCards}/${totalCards}`;
            }
        }

        const allProgressBars = runtime.objects.collectionprogressbar.getAllInstances();
        if (allProgressBars.length > 0) {
            const collectedCards = collection.cards.filter(card => card.collected === 1).length;
            const totalCards = collection.cards.length;
            const progressPercentage = collectedCards / totalCards;
            const originalWidth = allProgressBars[allProgressBars.length - 1].width;
            allProgressBars[allProgressBars.length - 1].width = originalWidth * progressPercentage;
        }

        const allProgressText2s = runtime.objects.spriteText.getAllInstances().filter(instance => instance.instVars.w === "progresstxt2");
        if (allProgressText2s.length > 0) {
            const rewardValue = collection.reward.replace(/\D/g, "");
            allProgressText2s[allProgressText2s.length - 1].text = rewardValue;
        }

        const allCollectionRewImgs = runtime.objects.collectionrewimg.getAllInstances();
        if (allCollectionRewImgs.length > 0) {
            allCollectionRewImgs[allCollectionRewImgs.length - 1].setAnimation(collection.rewardAnimation);
        }

        if (ninePatchChours) {
            ninePatchChours.instVars.listTotHeight += collectionImg.height / 1.5;
        }

        col++;
        if (col >= 3) {
            col = 0;
            row++;
        }
    });
}

function updateGrandProgressBar(collectionsArray) {
    const grandProgressBar = runtime.objects.collectiongrandprogress.getFirstInstance();
    if (grandProgressBar) {
        const totalCollected = collectionsArray.reduce((acc, collection) => {
            return acc + collection.cards.filter(card => card.collected === 1).length;
        }, 0);

        const totalCards = collectionsArray.reduce((acc, collection) => {
            return acc + collection.cards.length;
        }, 0);

        const progressPercentage = totalCollected / totalCards;
        const originalWidth = grandProgressBar.width;
        grandProgressBar.width = originalWidth * progressPercentage;

        const progressText = runtime.objects.spriteText.getAllInstances().find(instance => instance.instVars.w === "progresscollection");
        if (progressText) {
            const rewardClaimed = localStorage.getItem(`${gamePrefix}allCollectionsRewardClaimed`);
            if (rewardClaimed === "true") {
                progressText.text = "Completed";
            } else {
                progressText.text = `${totalCollected}/${totalCards}`;
            }
        }
    }
}



	},

	async Collection_Event7_Act2(runtime, localVars)
	{
		claimReward(runtime.globalVars.ccname);
	},

	async Collection_Event8_Act2(runtime, localVars)
	{
const clickedCollectionImg = runtime.objects.collectionimg.getPickedInstances()[0];

if (clickedCollectionImg) {
    const animationName = clickedCollectionImg.animationName;

    if (!animationName) return;

    const savedCollections = localStorage.getItem(`${gamePrefix}collections`);
    if (savedCollections) {
        const collectionsArray = JSON.parse(savedCollections);
        const collection = collectionsArray.find(c => c.name === animationName);

        if (collection) {
            const rewardAmount = parseInt(collection.reward.replace(/[^\d]/g, ""), 10);
            const rewardType = collection.reward.replace(/[0-9]/g, "");

            const collectionBg = runtime.objects.collectionbg.createInstance("dark", runtime.layout.width / 2, runtime.layout.height / 2, 1);
            const originalWidth = collectionBg.width;
            const originalHeight = collectionBg.height;

            collectionBg.width = 0;
            collectionBg.height = 0;

            collectionBg.behaviors.Tween.startTween("width", originalWidth, 0.1, "linear");
            collectionBg.behaviors.Tween.startTween("height", originalHeight, 0.1, "linear");

            // Update "collectiontitle2" with w = "collectiontitle2"
            const collectionTitleText = runtime.objects.spriteText.getAllInstances().find(instance => instance.instVars.w === "collectiontitle2");
            if (collectionTitleText) {
                collectionTitleText.text = animationName;
            }

            // Update "progresstxt3" with w = "progresstxt3"
            const progressTxt = runtime.objects.spriteText.getAllInstances().find(instance => instance.instVars.w === "progresstxt3");
            if (progressTxt) {
                progressTxt.text = rewardAmount.toString();
            }

            // Update "collectiontext3" with w = "collectiontext3"
            const collectionText = runtime.objects.spriteText.getAllInstances().find(instance => instance.instVars.w === "collectiontext3");
            if (collectionText) {
                const collectedCards = collection.cards.filter(card => card.collected === 1).length;
                const totalCards = collection.cards.length;
                collectionText.text = `${collectedCards}/${totalCards}`;
            }

            setTimeout(() => {
                const collectionProgressBar2 = runtime.objects.collectionprogressbar2.getAllInstances().pop();
                if (collectionProgressBar2) {
                    const collectedCards = collection.cards.filter(card => card.collected === 1).length;
                    const totalCards = collection.cards.length;

                    if (totalCards > 0) {
                        const originalWidth = 300;
                        const progressPercentage = collectedCards / totalCards;
                        collectionProgressBar2.width = originalWidth * progressPercentage;
                    } else {
                        collectionProgressBar2.width = 0;
                    }
                }
            }, 100);

            const collectionRewImg2 = runtime.objects.collectionrewimg2.getFirstInstance();
            if (collectionRewImg2) {
                collectionRewImg2.setAnimation(rewardType);
            }

            const collectionProgressBg2 = runtime.objects.collectionprogressbg2.getFirstInstance();
            const startYBase = collectionProgressBg2 ? collectionProgressBg2.y + collectionProgressBg2.height : runtime.layout.height / 2;

            const cardSpacingX = 200;
            const cardSpacingY = 230;

            setTimeout(() => {
                const startX = runtime.layout.width / 2;
                const startY = startYBase - 70;
                let row = 0;
                let col = 0;

                collection.cards.forEach((card, index) => {
                    const x = startX + (col - 1) * cardSpacingX;
                    const y = startY + row * cardSpacingY;

                    const cardSprite = runtime.objects.collectioncards.createInstance("dark", x, y, 1);
                    if (cardSprite) {
                        cardSprite.setAnimation(animationName);
                        cardSprite.animationFrame = index;
                        cardSprite.instVars.collected = card.collected === 1 ? 1 : 0;
                    }

                    const allCollectionCardNames = runtime.objects.collectioncardname.getAllInstances();
                    if (allCollectionCardNames.length > 0) {
                        const lastCreatedCardName = allCollectionCardNames[allCollectionCardNames.length - 1];
                        lastCreatedCardName.text = card.name;
                    }

                    col++;
                    if (col >= 3) {
                        col = 0;
                        row++;
                    }
                });
            }, 100);
        }
    }
}

	},

	async Collection_Event16_Act2(runtime, localVars)
	{
const savedCollections = localStorage.getItem(`${gamePrefix}collections`);

if (!savedCollections) return;

const collectionsArray = JSON.parse(savedCollections);

const allComplete = collectionsArray.every(collection =>
    collection.cards.every(card => card.collected === 1)
);

const rewardClaimed = localStorage.getItem(`${gamePrefix}allCollectionsRewardClaimed`);

if (allComplete && !rewardClaimed) {
    updateVariable("add", "gold", 5000);
    runtime.callFunction("RewardScreen", "gold", "5000");
    localStorage.setItem(`${gamePrefix}allCollectionsRewardClaimed`, "true");
}

	},

	async Collection_Event18_Act1(runtime, localVars)
	{
const rewardClaimed = localStorage.getItem(`${gamePrefix}allCollectionsRewardClaimed`);

if (rewardClaimed === "true") {
    const randomQuestP5 = runtime.objects.randomquestp5.getFirstInstance();
    if (randomQuestP5) {
        randomQuestP5.destroy();
    }
}

	},

	async Luckyspin_Event3_Act1(runtime, localVars)
	{
// Get the WheelRotate instance
const wheelRotate = runtime.objects.WheelRotate.getFirstPickedInstance();
let rotateBehavior = wheelRotate.behaviors.Rotate; // Get the Rotate behavior

// Initial and minimum speeds
let initialSpeed = 4; // Initial speed
let minSpeed = 1; // Minimum speed
let deceleration = 0.005; // Deceleration rate
rotateBehavior.speed = initialSpeed; // Set the initial speed

let isSpinning = true; // Track if the wheel is spinning
let hasLogged = false; // Track when the minimum speed is reached
let hasStopped = false; // Track if the wheel has stopped

// Rewards and angles
const rewards = [
  { angle: 0, name: "gold250", title: "250 Gold", animation: "gold", chance: 18 },
  { angle: 45, name: "gold50", title: "Gold", animation: "gold", chance: 15 },
  { angle: 90, name: "gold50", title: "50 Gold", animation: "gold", chance: 25 },
  { angle: 135, name: "gold500", title: "Gold 500", animation: "gold", chance: 12 },
  { angle: 180, name: "gold750", title: "Gold 750", animation: "gold", chance: 6 },
  { angle: 225, name: "gold1000", title: "Gold 1000", animation: "heart", chance: 2 },
  { angle: 270, name: "gold1000", title: "Gold 1000", animation: "gold", chance: 1 },
  { angle: 315, name: "gold50", title: "Gold", animation: "gold", chance: 21 },
];

// Function to select a random reward based on chance
function selectRandomReward() {
    const randomValue = Math.random() * 100; // Select a random value between 0-100
    let cumulativeChance = 0;

    for (let reward of rewards) {
        cumulativeChance += reward.chance;
        if (randomValue <= cumulativeChance) {
            return reward;
        }
    }
    return rewards[0]; // Return the first reward as a default
}

// Select a random reward and determine the target angle
let selectedReward = selectRandomReward();
let targetAngle = selectedReward.angle;
console.log(`Selected reward: ${selectedReward.name}, Chance: ${selectedReward.chance}%`);




// Function to add rewards
async function addRewards() {
    if (selectedReward.name.includes("gold")) {
        const goldAmount = parseInt(selectedReward.name.replace("gold", ""), 10);
        await addGold(goldAmount);
    }else if (selectedReward.name.includes("diamond")) {
        const diamond = parseInt(selectedReward.name.replace("diamond", ""), 10);
        updateVariable("add", "diamond", diamond);
    }else if (selectedReward.name.includes("heart")) {
        const heart = parseInt(selectedReward.name.replace("heart", ""), 10);
        updateVariable("add", "heart", heart);
    }


}

// Helper function to add gold
async function addGold(amount) {
    updateVariable("add", "gold", amount);
}



// Function to display reward at the center of the wheel
function displayReward() {
    const rewardText = selectedReward.name;

    const wheelReward = runtime.objects.WheelReward.createInstance("Background", wheelRotate.x, wheelRotate.y, 1);
    wheelReward.width = wheelRotate.width + 15;
    wheelReward.height = wheelRotate.height + 15;

    wheelRotate.addChild(wheelReward);

    const rewardTextInstance = runtime.objects.rewardtext.getFirstInstance();
    rewardTextInstance.text = selectedReward.title;

    const rewardImageInstance = runtime.objects.RewardImages.getFirstInstance();
    rewardImageInstance.setAnimation(selectedReward.animation);

    runtime.callFunction("particleCeleb", 1);
    console.log(`Displayed reward: ${rewardText}`);
}

// Tick event to track the wheel and stop at the target angle
runtime.addEventListener("tick", async () => {
    if (isSpinning) {
        let currentAngle = runtime.globalVars.rotateWheelAngle;

        if (rotateBehavior.speed > minSpeed) {
            rotateBehavior.speed -= deceleration;
        } else if (!hasLogged) {
            rotateBehavior.speed = minSpeed;
            hasLogged = true;
            console.log("Minimum speed reached!");
        }

        let angleDifference = Math.abs((currentAngle - targetAngle + 360) % 360);
        if (angleDifference > 180) {
            angleDifference = 360 - angleDifference;
        }

        if (hasLogged && !hasStopped && angleDifference < 1) {
            rotateBehavior.speed = 0;
            isSpinning = false;
            hasStopped = true;
        
            console.log(`Wheel stopped at ${targetAngle} degrees. Reward won: ${selectedReward.name}`);
        
            await addRewards();
            await updateVariable("sub", "wheelticket", 1);
        
            setTimeout(async () => {
                displayReward();
              
            }, 700);
        }
        
    }
});

	},

	async Areas_Event1_Act2(runtime, localVars)
	{
		createAreaSprites();
	},

	async Puzzle_Event1_Act1(runtime, localVars)
	{
		setInterval(checkPuzzleTimer, 1000);
	},

	async Puzzle_Event1_Act2(runtime, localVars)
	{
		updatePuzzleState();
	},

	async Puzzle_Event19_Act2(runtime, localVars)
	{
		completeNextPuzzle();
	},

	async EventSheet1_Event1_Act2(runtime, localVars)
	{
		GridManager.createGrid(7, 7, 5);
	},

	async EventSheet1_Event61_Act1(runtime, localVars)
	{

	},

	async EventSheet1_Event63_Act2(runtime, localVars)
	{
		  const booster = runtime.objects.BOOSTER.getFirstPickedInstance();
		  if (booster) {
		      globalThis.activateBooster(booster.instVars.boosterName);
		  }
		
		
	},

	async EventSheet1_Event64_Act1(runtime, localVars)
	{

	},

	async EventSheet1_Event65_Act1(runtime, localVars)
	{
		 const tile = runtime.objects.Tile.getFirstPickedInstance();
		  if (tile) {
		      globalThis.activatePowerUpByTap(tile.instVars.Row, tile.instVars.Col);
		  }
	},

	async EventSheet1_Event74_Act1(runtime, localVars)
	{
		onTileTouchStart()
	},

	async EventSheet1_Event81_Act12(runtime, localVars)
	{
		loadEquippedItemsForList();
	},

	async EventSheet1_Event86_Act3(runtime, localVars)
	{
		lootItem();
		updateVariable("add","gold",150);
	},

	async EventSheet1_Event86_Act4(runtime, localVars)
	{
 const endLevelText = runtime.objects.spriteText
      .getAllInstances().find(spriteText => spriteText.instVars.w === "endlevel");
  if (endLevelText) {
      const currentLevel = parseInt(localStorage.getItem(`${gamePrefix}currentLevel`), 10) ||
  1;
      endLevelText.text = `Level ${currentLevel}`;
  }
	},

	async EventSheet1_Event87_Act3(runtime, localVars)
	{
		updateVariable("add","gold",150);
	},

	async EventSheet1_Event87_Act4(runtime, localVars)
	{
 const endLevelText = runtime.objects.spriteText
      .getAllInstances().find(spriteText => spriteText.instVars.w === "endlevel");
  if (endLevelText) {
      const currentLevel = parseInt(localStorage.getItem(`${gamePrefix}currentLevel`), 10) ||
  1;
      endLevelText.text = `Level ${currentLevel}`;
  }
	}
};

globalThis.C3.JavaScriptInEvents = scriptsInEvents;
