/**
 * SwipeController.js - Modern Swipe & Power-Up System
 * Complete rewrite using the new power-up combo system
 * Supports ALL power-ups including Propeller with proper activation
 */

/**
 * Called when player first touches a tile (before swipe)
 * Stops hint animation immediately and resets timer
 */
export function onTileTouchStart() {
    // Stop hint animation IMMEDIATELY when tile is touched
    if (globalThis.clearHintAnimation) {
        globalThis.clearHintAnimation();
    }

    // Reset hint timer (clears old timer and starts new 3-second countdown)
    if (globalThis.startHintTimer) {
        globalThis.startHintTimer();
    }
}

/**
 * Main swipe detection and processing function
 * Handles: Power-up combos, single power-up activation, normal matches
 */
export function detectSwipeDirection() {
    // ============================================================
    // PHASE 0: BOOSTER MODE CHECK
    // ============================================================

    // If in booster mode, handle tile selection instead of swipe
    if (globalThis.boosterMode) {
        const startRow = runtime.globalVars.startRow;
        const startCol = runtime.globalVars.startCol;
        console.log(`[SWIPE] Booster mode active (${globalThis.boosterMode}), selecting tile (${startRow}, ${startCol})`);
        globalThis.onTileSelectedInBoosterMode(startRow, startCol);
        return;
    }

    // ============================================================
    // PHASE 1: VALIDATION & SAFETY CHECKS
    // ============================================================

    // CHECK WIN CONDITION FIRST - Block swipes if level is already won
    console.log(`[SWIPE] Checking win condition... gridType: ${globalThis.gridType}`);
    let levelWon = false;
    if (globalThis.gridType === globalThis.GRID_TYPES.DROPPED) {
        levelWon = globalThis.checkDroppedWinCondition ? globalThis.checkDroppedWinCondition() : false;
    } else if (globalThis.gridType === globalThis.GRID_TYPES.STANDARD) {
        levelWon = globalThis.checkStandardWinCondition ? globalThis.checkStandardWinCondition() : false;
    } else if (globalThis.gridType === globalThis.GRID_TYPES.SANDDROP) {
        levelWon = globalThis.checkSandDropWinCondition ? globalThis.checkSandDropWinCondition() : false;
    } else if (globalThis.gridType === globalThis.GRID_TYPES.BROKE) {
        levelWon = globalThis.checkBrokeWinCondition ? globalThis.checkBrokeWinCondition() : false;
    } else if (globalThis.gridType === globalThis.GRID_TYPES.BROKEANDSTANDARD) {
        levelWon = globalThis.checkBrokeAndStandardWinCondition ? globalThis.checkBrokeAndStandardWinCondition() : false;
    } else if (globalThis.gridType === globalThis.GRID_TYPES.GRASS) {
        // Safety: If grassTask exists and has remaining work, level cannot be won - allow swipes
        const grassTaskObj = globalThis.getGrassTask ? globalThis.getGrassTask() : null;
        if (grassTaskObj && grassTaskObj.destroyed < grassTaskObj.required) {
            levelWon = false;
        } else {
            levelWon = globalThis.checkGrassWinCondition ? globalThis.checkGrassWinCondition() : false;
        }
    } else if (globalThis.gridType === globalThis.GRID_TYPES.TREE) {
        levelWon = globalThis.checkTreeWinCondition ? globalThis.checkTreeWinCondition() : false;
    }
    console.log(`[SWIPE] Win condition result: ${levelWon}`);

    if (levelWon) {
        console.log("🎉 WIN - All targets completed! No more swipes allowed.");
        return;
    }

    // Check if processing is already in progress
    if (globalThis.isProcessing) {
        console.log("[SWIPE] Processing in progress, waiting...");
        return;
    }

    // Check if any tiles are animating
    const allTiles = runtime.objects.Tile.getAllInstances();
    const hasActiveTween = allTiles.some(tile => {
        if (tile.behaviors.Tween) {
            return tile.behaviors.Tween.isActive || tile.behaviors.Tween.activeCount > 0;
        }
        return false;
    });

    if (hasActiveTween) {
        console.log("[SWIPE] Animations in progress, cannot process new move");
        return;
    }

    // Clear hint animation BEFORE locking (so timer can restart properly later)
    if (globalThis.clearHintAnimation) globalThis.clearHintAnimation();

    // Lock processing
    globalThis.isProcessing = true;
    runtime.globalVars.interactive = 1;

    const grid = globalThis.grid;
    const startRow = runtime.globalVars.startRow;
    const startCol = runtime.globalVars.startCol;
    let endRow = runtime.globalVars.endRow;
    let endCol = runtime.globalVars.endCol;

    // ============================================================
    // PHASE 1.5: TAP vs SWIPE CHECK
    // ============================================================

    // If start and end are the SAME tile, it's a TAP (not a swipe)
    if (startRow === endRow && startCol === endCol) {
        console.log(`[SWIPE] TAP detected on tile (${startRow}, ${startCol}) - ignoring (no tap activation in normal mode)`);
        releaseProcessingLock();
        // Note: Power-up tap activation is disabled. Only swipe combinations work.
        return;
    }

    // Validate grid exists
    if (!grid || grid[startRow]?.[startCol] === undefined) {
        releaseProcessingLock();
        return;
    }

    // ============================================================
    // PHASE 2: DETERMINE SWIPE DIRECTION (4-directional)
    // ============================================================

    const rowDiff = endRow - startRow;
    const colDiff = endCol - startCol;

    if (Math.abs(rowDiff) > Math.abs(colDiff)) {
        // Vertical swipe
        endRow = rowDiff > 0 ? startRow + 1 : startRow - 1;
        endCol = startCol;
    } else {
        // Horizontal swipe
        endRow = startRow;
        endCol = colDiff > 0 ? startCol + 1 : startCol - 1;
    }

    // ============================================================
    // PHASE 3: VALIDATE TARGET POSITION
    // ============================================================

    // Check bounds and null cells
    if (grid[endRow]?.[endCol] === undefined ||
        grid[endRow]?.[endCol] === null ||
        grid[startRow]?.[startCol] === null ||
        (Math.abs(endRow - startRow) !== 1 && Math.abs(endCol - startCol) !== 1)) {
        releaseProcessingLock();
        return;
    }

    // Check if either tile is a broke box (immovable)
    const isBrokeBoxMove =
        (typeof grid[startRow][startCol] === "string" && grid[startRow][startCol].startsWith("BROKE")) ||
        (typeof grid[endRow][endCol] === "string" && grid[endRow][endCol].startsWith("BROKE"));

    if (isBrokeBoxMove) {
        console.log("[SWIPE] Cannot move broke boxes - they are walls");
        releaseProcessingLock();
        return;
    }

    // Check if either tile is a WoodBox (immovable)
    const isWoodBoxMove =
        grid[startRow][startCol] === "WoodBox" ||
        grid[endRow][endCol] === "WoodBox";

    if (isWoodBoxMove) {
        console.log("[SWIPE] Cannot move WoodBox - they are obstacles");
        releaseProcessingLock();
        return;
    }

    // ============================================================
    // PHASE 4: GET TILE OBJECTS
    // ============================================================

    const tile1 = allTiles.find(t => t.instVars.Row === startRow && t.instVars.Col === startCol);
    const tile2 = allTiles.find(t => t.instVars.Row === endRow && t.instVars.Col === endCol);

    if (!tile1 || !tile2) {
        console.log("[SWIPE] Tiles not found");
        releaseProcessingLock();
        return;
    }

    // ============================================================
    // PHASE 5: ANIMATE SWAP WITH JUMP EFFECT
    // ============================================================

    const tile1X = tile1.x, tile1Y = tile1.y;
    const tile2X = tile2.x, tile2Y = tile2.y;
    const tile1OriginalWidth = tile1.width;
    const tile1OriginalHeight = tile1.height;
    const tile2OriginalWidth = tile2.width;
    const tile2OriginalHeight = tile2.height;

    // Move tile1 to top for jump effect
    tile1.moveToTop();

    // Tile1 (swiped) gets jump animation
    tile1.behaviors.Tween.startTween("width", tile1OriginalWidth * 1.25, 0.04, "default");
    tile1.behaviors.Tween.startTween("height", tile1OriginalHeight * 1.25, 0.04, "default");

    setTimeout(() => {
        tile1.behaviors.Tween.startTween("x", tile2X, 0.12, "default");
        tile1.behaviors.Tween.startTween("y", tile2Y, 0.12, "default");

        // Scale down as it lands
        setTimeout(() => {
            tile1.behaviors.Tween.startTween("width", tile1OriginalWidth, 0.08, "default");
            tile1.behaviors.Tween.startTween("height", tile1OriginalHeight, 0.08, "default");
        }, 50);
    }, 40);

    // Tile2 moves normally
    tile2.behaviors.Tween.startTween("x", tile1X, 0.12, "default");
    tile2.behaviors.Tween.startTween("y", tile1Y, 0.12, "default");

    // ============================================================
    // PHASE 6: PERFORM SWAP IN GRID
    // ============================================================

    setTimeout(() => {
        const gridBeforeSwap = JSON.parse(JSON.stringify(grid));

        // Swap in grid
        const tempVal = grid[startRow][startCol];
        grid[startRow][startCol] = grid[endRow][endCol];
        grid[endRow][endCol] = tempVal;

        // Update tile instance variables
        tile1.instVars.Row = endRow;
        tile1.instVars.Col = endCol;
        tile2.instVars.Row = startRow;
        tile2.instVars.Col = startCol;

        // ============================================================
        // PHASE 7: DETECT POWER-UP COMBO OR MATCH
        // ============================================================

        setTimeout(() => {
            // Detect power-up combo using NEW system
            const comboResult = globalThis.detectPowerUpCombo(grid, startRow, startCol, endRow, endCol);

            console.log(`[SWIPE] Combo detected: ${comboResult.type}`);

            // ============================================================
            // CASE A: POWER-UP COMBO (Including single activations)
            // ============================================================

            if (comboResult.type !== "None") {
                // Valid move - decrease move counter
                if (globalThis.decreaseMove) globalThis.decreaseMove();

                // Execute power-up combo
                executeComboAndCleanup(comboResult.type, comboResult.data);
                return;
            }

            // ============================================================
            // CASE B: NORMAL MATCH (3+ tiles)
            // ============================================================

            const matchResult = globalThis.findMatches(grid);
            const matchedUIDs = matchResult.uids || [];

            if (matchedUIDs.length > 0) {
                // Valid match - decrease move counter
                if (globalThis.decreaseMove) globalThis.decreaseMove();

                console.log(`[SWIPE] Normal match found: ${matchResult.type} (${matchedUIDs.length} tiles)`);

                // Remove matched tiles and continue
                globalThis.removeMatchedTiles(matchedUIDs);
                return;
            }

            // ============================================================
            // CASE C: INVALID MOVE - REVERT SWAP
            // ============================================================

            console.log("[SWIPE] No valid match or combo - reverting swap");

            // Restore grid
            grid.length = 0;
            Array.prototype.push.apply(grid, gridBeforeSwap);

            // Animate revert with bounce
            tile1.behaviors.Tween.startTween("x", tile1X, 0.15, "easeoutback");
            tile1.behaviors.Tween.startTween("y", tile1Y, 0.15, "easeoutback");
            tile2.behaviors.Tween.startTween("x", tile2X, 0.15, "easeoutback");
            tile2.behaviors.Tween.startTween("y", tile2Y, 0.15, "easeoutback");

            // Restore tile positions
            tile1.instVars.Row = startRow;
            tile1.instVars.Col = startCol;
            tile2.instVars.Row = endRow;
            tile2.instVars.Col = endCol;

            // Release lock after animation
            setTimeout(() => {
                releaseProcessingLock();
            }, 150);

        }, 20); // Small delay after swap animation

    }, 140); // Wait for swap animation to complete
}

/**
 * Execute power-up combo and handle cleanup
 */
async function executeComboAndCleanup(comboType, comboData) {
    console.log(`[COMBO] Executing: ${comboType}`);

    try {
        // Execute combo using new system
        const uidsToDestroy = await globalThis.executePowerUpCombo(comboType, comboData);

        if (uidsToDestroy && uidsToDestroy.length > 0) {
            console.log(`[COMBO] Destroying ${uidsToDestroy.length} tiles`);

            // Update task progress for destroyed tiles
            updateTaskProgress(uidsToDestroy);

            // Determine delay based on combo type
            let delay = 300; // Default 300ms for most combos
            if (comboType === "TNT-Rocket") {
                delay = 300; // TNT-Rocket is instant like normal rocket
            } else if (comboType === "TNT-Propeller") {
                delay = 0; // Propeller carries TNT and explodes instantly
            } else if (comboType === "TNT-TNT") {
                delay = 1000; // TNT-TNT has big explosion, needs 1 second
            } else if (comboType.includes("TNT")) {
                delay = 1000; // Other TNT combos have 1 second wait
            } else if (comboType.includes("Propeller")) {
                delay = 0; // Propeller handles its own async timing
            }

            // IMPORTANT: Wait for power-up animations/effects to complete
            // Event sheet functions need time to animate before we destroy tiles
            setTimeout(() => {
                // Process WoodBoxes BEFORE destroying tiles (after animation delay)
                if (globalThis.pendingWoodBoxPositions && globalThis.pendingWoodBoxPositions.size > 0) {
                    console.log(`[COMBO] Processing ${globalThis.pendingWoodBoxPositions.size} WoodBoxes after animation delay`);
                    const destroyedWoodBoxUIDs = globalThis.destroyWoodBoxes(globalThis.pendingWoodBoxPositions);
                    // Add destroyed WoodBox UIDs to the list
                    destroyedWoodBoxUIDs.forEach(uid => uidsToDestroy.push(uid));
                    globalThis.pendingWoodBoxPositions = null;
                }

                // Process GiftBoxes BEFORE destroying tiles (after animation delay)
                if (globalThis.pendingGiftBoxPositions && globalThis.pendingGiftBoxPositions.size > 0) {
                    console.log(`[COMBO] Processing ${globalThis.pendingGiftBoxPositions.size} GiftBoxes after animation delay`);
                    globalThis.destroyGiftBoxes(globalThis.pendingGiftBoxPositions);
                    globalThis.pendingGiftBoxPositions = null;
                }

                // Remove tiles WITHOUT creating boosters (power-up activation)
                globalThis.removeMatchedTiles(uidsToDestroy, false);
            }, delay);
        } else {
            // No tiles to destroy, just release lock
            releaseProcessingLock();
        }
    } catch (error) {
        console.error("[COMBO] Error executing combo:", error);
        releaseProcessingLock();
    }
}

/**
 * Update task progress for destroyed tiles
 * Handles standard tasks (color collection)
 */
function updateTaskProgress(uids) {
    if (globalThis.gridType !== globalThis.GRID_TYPES.STANDARD &&
        globalThis.gridType !== globalThis.GRID_TYPES.SANDDROP &&
        globalThis.gridType !== globalThis.GRID_TYPES.BROKEANDSTANDARD) {
        return;
    }

    if (!globalThis.remainingStandardTasks || globalThis.remainingStandardTasks.length === 0) {
        return;
    }

    const allTiles = runtime.objects.Tile.getAllInstances();

    uids.forEach(uid => {
        const tile = allTiles.find(t => t.uid === uid);
        if (!tile) return;

        const frame = tile.animationFrame;
        const tileType = tile.instVars.TileType;

        // Only count normal tiles (numbers 1-5)
        if (typeof tileType !== 'number' || isNaN(frame)) return;

        // Update each relevant task
        globalThis.remainingStandardTasks.forEach((task, index) => {
            if (!task.includes("-")) return;

            const [taskFrame, required] = task.split("-").map(Number);
            if (taskFrame !== frame) return;

            // Increment progress
            globalThis.standardTaskProgress[frame] = (globalThis.standardTaskProgress[frame] || 0) + 1;

            // Update UI
            const progress = globalThis.standardTaskProgress[frame];
            const remaining = Math.max(0, required - progress);
            const allSpriteTexts = runtime.objects.spriteText.getAllInstances();

            for (let i = 0; i < allSpriteTexts.length; i++) {
                const text = allSpriteTexts[i];
                if (text.instVars.w === `standard_task_${index}`) {
                    text.text = `${remaining}`;
                    break;
                }
            }
        });
    });
}

/**
 * Release processing lock and restart hint timer
 */
function releaseProcessingLock() {
    globalThis.isProcessing = false;
    runtime.globalVars.interactive = 0;

    // Restart hint timer after swipe completes
    if (globalThis.startHintTimer) {
        globalThis.startHintTimer();
    }
}

/**
 * TAP ACTIVATION for power-ups
 * Called when user taps a power-up without swiping
 * ALSO handles booster mode tile selection
 *
 * @param {number} row - Row of tapped tile
 * @param {number} col - Column of tapped tile
 */
export async function activatePowerUpByTap(row, col) {
    // ============================================================
    // BOOSTER MODE CHECK (Priority)
    // ============================================================
    if (globalThis.boosterMode) {
        console.log(`[TAP] Booster mode active (${globalThis.boosterMode}), selecting tile (${row}, ${col})`);
        globalThis.onTileSelectedInBoosterMode(row, col);
        return;
    }

    // ============================================================
    // POWER-UP TAP ACTIVATION DISABLED
    // ============================================================
    console.log(`[TAP] Power-up tap activation disabled. Use swipe to activate power-ups.`);
    return;

    // OLD CODE (disabled):
    // if (globalThis.isProcessing) {
    //     console.log("[TAP] Processing in progress");
    //     return;
    // }

    // const grid = globalThis.grid;
    // if (!grid || !grid[row] || grid[row][col] === null) {
    //     return;
    // }

    // const tileType = grid[row][col];

    // // Check if it's a power-up
    // if (tileType !== "TNT" && tileType !== "RocketRow" && tileType !== "RocketCol" &&
    //     tileType !== "Propeller" && tileType !== "LightBall") {
    //     console.log("[TAP] Not a power-up, ignoring tap");
    //     return;
    // }

    // ALL CODE BELOW IS DISABLED (commented out)
    /*
    console.log(`[TAP] Activating ${tileType} at (${row}, ${col})`);
    globalThis.isProcessing = true;
    runtime.globalVars.interactive = 1;
    if (globalThis.decreaseMove) globalThis.decreaseMove();
    const allTiles = runtime.objects.Tile.getAllInstances();
    const tile = allTiles.find(t => t.instVars.Row === row && t.instVars.Col === col);
    if (!tile) {
        console.warn("[TAP] Tile object not found");
        releaseProcessingLock();
        return;
    }
    const tileUID = tile.uid;
    try {
        let uidsToDestroy = [];
        switch (tileType) {
            case "TNT":
                if (globalThis.activateTNT) {
                    uidsToDestroy = globalThis.activateTNT(row, col, tileUID);
                }
                break;
            case "RocketRow":
            case "RocketCol":
                if (globalThis.activateRocket) {
                    uidsToDestroy = globalThis.activateRocket(row, col, tileType, tileUID);
                }
                break;
            case "Propeller":
                if (globalThis.activatePropeller) {
                    uidsToDestroy = await globalThis.activatePropeller(row, col, tileUID);
                }
                break;
            case "LightBall":
                if (globalThis.activateLightBall) {
                    uidsToDestroy = globalThis.activateLightBall(row, col, tileUID);
                }
                break;
        }
        if (uidsToDestroy && uidsToDestroy.length > 0) {
            console.log(`[TAP] Destroying ${uidsToDestroy.length} tiles`);
            updateTaskProgress(uidsToDestroy);
            let delay = 300;
            if (tileType === "TNT") {
                delay = 1000;
            } else if (tileType === "Propeller") {
                delay = 0;
            }
            setTimeout(() => {
                globalThis.removeMatchedTiles(uidsToDestroy, false);
            }, delay);
        } else {
            releaseProcessingLock();
        }
    } catch (error) {
        console.error("[TAP] Error activating power-up:", error);
        releaseProcessingLock();
    }
    */
}
