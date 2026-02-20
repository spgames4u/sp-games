/**
 * TaskProgress.js - Task ilerleme takibi
 * Standard tasks, dropped items, broke boxes için progress tracking
 */

// Task tracking global variables
export let remainingStandardTasks = [];
export let standardTaskProgress = {};
export let remainingDroppedItems = [];
export let processedTiles = new Set();

// WoodBox task tracking
export let woodBoxTask = null; // { required: number, destroyed: number, taskIndex: number }
export let woodBox2Task = null; // { required: number, destroyed: number, taskIndex: number }
export let woodBoxProgress = 0;
export let woodBox2Progress = 0;

// Grass task tracking
export let grassTask = null; // { required: number, destroyed: number, taskIndex: number }
export let grass2Task = null; // { required: number, destroyed: number, taskIndex: number }
export let grassProgress = 0;
export let grass2Progress = 0;

/**
 * Initialize tasks based on level type
 * @param {object} levelData - Level configuration
 */
export function initializeTasks(levelData) {
    // Reset
    processedTiles.clear();
    standardTaskProgress = {};
    runtime.globalVars.completedTestTiles = 0;
    woodBoxTask = null;
    woodBox2Task = null;
    woodBoxProgress = 0;
    woodBox2Progress = 0;
    grassTask = null;
    grass2Task = null;
    grassProgress = 0;
    grass2Progress = 0;

    // Clear globalThis arrays (they're already referenced, just clear them)
    globalThis.remainingStandardTasks.length = 0;
    globalThis.remainingDroppedItems.length = 0;

    // Reset WoodBox2 downgrade tracking
    if (globalThis.resetWoodBox2Tracking) {
        globalThis.resetWoodBox2Tracking();
    }

    // Reset Grass2 downgrade tracking
    if (globalThis.resetGrass2Tracking) {
        globalThis.resetGrass2Tracking();
    }

    // Reset GiftBox tracking
    if (globalThis.resetGiftBoxTracking) {
        globalThis.resetGiftBoxTracking();
    }

    // Check for WoodBox tasks in droppedItems
    const woodBoxItems = levelData.droppedItems.filter(item => item === "WoodBox" || item.startsWith("WoodBox-"));
    const woodBox2Items = levelData.droppedItems.filter(item => item === "WoodBox2" || item.startsWith("WoodBox2-"));
    const giftBoxItems = levelData.droppedItems.filter(item => item === "GiftBox" || item.startsWith("GiftBox-"));
    const grassItems = levelData.droppedItems.filter(item => {
        const l = (item || "").toLowerCase();
        return l === "grass" || l.startsWith("grass-");
    });
    const grass2Items = levelData.droppedItems.filter(item => {
        const l = (item || "").toLowerCase();
        return l === "grass2" || l.startsWith("grass2-");
    });
    const treeItems = levelData.droppedItems.filter(item => item.startsWith("Tree"));
    const toyItems = levelData.droppedItems.filter(item => item.startsWith("TOY"));
    const nonWoodBoxItems = levelData.droppedItems.filter(item => {
        const l = (item || "").toLowerCase();
        return !l.startsWith("woodbox") && !l.startsWith("grass") && !l.startsWith("tree") && !l.startsWith("toy") && !l.startsWith("giftbox");
    });

    // Initialize WoodBox task (regular, 1 hit)
    if (woodBoxItems.length > 0) {
        const woodBoxItem = woodBoxItems[0];
        if (woodBoxItem.includes("-")) {
            const required = parseInt(woodBoxItem.split("-")[1]);
            const taskIndex = levelData.droppedItems.indexOf(woodBoxItem);
            woodBoxTask = { required, destroyed: 0, taskIndex };
            console.log(`[WOODBOX TASK] Initialized: ${required} WoodBoxes (1 hit each) - task index: ${taskIndex}`);
        }
    }

    // Initialize WoodBox2 task (strong, 2 hits per box)
    if (woodBox2Items.length > 0) {
        const woodBox2Item = woodBox2Items[0];
        if (woodBox2Item.includes("-")) {
            const count = parseInt(woodBox2Item.split("-")[1]);
            const taskIndex = levelData.droppedItems.indexOf(woodBox2Item);
            // Count completely destroyed boxes only (not individual hits)
            woodBox2Task = { required: count, destroyed: 0, taskIndex };
            console.log(`[WOODBOX2 TASK] Initialized: ${count} WoodBox2s (each needs 2 hits to destroy completely) - task index: ${taskIndex}`);
        }
    }

    // Initialize GiftBox task (falling, 1 hit)
    if (giftBoxItems.length > 0 && globalThis.initializeGiftBoxTask) {
        const giftBoxItem = giftBoxItems[0];
        if (giftBoxItem.includes("-")) {
            const required = parseInt(giftBoxItem.split("-")[1]);
            const taskIndex = levelData.droppedItems.indexOf(giftBoxItem);
            globalThis.initializeGiftBoxTask(required, taskIndex);
        }
    }

    // Initialize Grass task if present (regular, 1 hit)
    if (grassItems.length > 0) {
        const grassItem = grassItems[0]; // Take first grass task
        if (grassItem.includes("-")) {
            const required = parseInt(grassItem.split("-")[1]);
            // Find task index in droppedItems array (case-insensitive fallback)
            let taskIndex = levelData.droppedItems.indexOf(grassItem);
            if (taskIndex === -1) {
                taskIndex = levelData.droppedItems.findIndex(item =>
                    (item || "").toLowerCase() === (grassItem || "").toLowerCase()
                );
            }
            grassTask = { required, destroyed: 0, taskIndex: taskIndex >= 0 ? taskIndex : 0 };
            console.log(`[GRASS TASK] Initialized: ${required} grass tiles to destroy (1 hit each) - task index: ${grassTask.taskIndex}`);
        }
    }
    // FALLBACK: For grass/tree levels, if grassTask is null but droppedItems has grass-like items, init from first match
    const levelTypeLower = (levelData.type || "").toLowerCase();
    if (!grassTask && (levelTypeLower === "grass" || levelTypeLower === "tree") && levelData.droppedItems?.length > 0) {
        for (const item of levelData.droppedItems) {
            const l = (item || "").toLowerCase();
            if ((l === "grass" || l.startsWith("grass-")) && item.includes("-")) {
                const required = parseInt(item.split("-")[1]);
                const taskIndex = levelData.droppedItems.indexOf(item);
                grassTask = { required, destroyed: 0, taskIndex: taskIndex >= 0 ? taskIndex : 0 };
                console.log(`[GRASS TASK] FALLBACK initialized: ${required} grass tiles (from ${item}) - task index: ${grassTask.taskIndex}`);
                break;
            }
        }
    }

    // Initialize Grass2 task if present (strong, 2 hits per grass)
    if (grass2Items.length > 0) {
        const grass2Item = grass2Items[0];
        if (grass2Item.includes("-")) {
            const required = parseInt(grass2Item.split("-")[1]);
            const taskIndex = levelData.droppedItems.indexOf(grass2Item);
            grass2Task = { required, destroyed: 0, taskIndex };
            console.log(`[GRASS2 TASK] Initialized: ${required} Grass2 tiles (2 hits each) - task index: ${taskIndex}`);
        }
    }

    // Initialize TOY task if present (Toys.js handles the actual tracking)
    if (toyItems.length > 0 && globalThis.initializeToys) {
        // Sum up all TOY requirements (may have multiple TOY types: TOY1-1, TOY2-1, TOY3-1)
        let totalToys = 0;
        toyItems.forEach(toyItem => {
            if (toyItem.includes("-")) {
                totalToys += parseInt(toyItem.split("-")[1]);
            }
        });
        globalThis.initializeToys(totalToys);
        console.log(`[TOY TASK] Initialized: ${totalToys} toys to collect (from ${toyItems.length} TOY types)`);
    }

    // Initialize other tasks based on level type
    // IMPORTANT: Modify globalThis arrays directly to preserve references
    if (levelData.type === "standard") {
        globalThis.remainingStandardTasks.length = 0;
        globalThis.remainingStandardTasks.push(...nonWoodBoxItems);
        globalThis.remainingDroppedItems.length = 0;
        console.log("[STANDARD TASK] Tasks initialized:", globalThis.remainingStandardTasks);
    } else if (levelData.type === "dropped") {
        globalThis.remainingStandardTasks.length = 0;
        globalThis.remainingDroppedItems.length = 0;
        globalThis.remainingDroppedItems.push(...nonWoodBoxItems);
        console.log("[DROPPED TASK] Tasks initialized:", globalThis.remainingDroppedItems);
    } else if (levelData.type === "sanddrop") {
        const standardItems = nonWoodBoxItems.filter(item => item.includes("-") && !item.startsWith("TEST"));
        const testItems = nonWoodBoxItems.filter(item => item.startsWith("TEST"));
        globalThis.remainingStandardTasks.length = 0;
        globalThis.remainingStandardTasks.push(...standardItems);
        globalThis.remainingDroppedItems.length = 0;
        globalThis.remainingDroppedItems.push(...testItems);
        console.log("[SANDDROP TASK] Standard tasks:", globalThis.remainingStandardTasks);
        console.log("[SANDDROP TASK] Dropped items:", globalThis.remainingDroppedItems);
    } else if (levelData.type === "broke") {
        globalThis.remainingStandardTasks.length = 0;
        globalThis.remainingDroppedItems.length = 0;
        globalThis.remainingDroppedItems.push(...nonWoodBoxItems);
        console.log("[BROKE TASK] Broke boxes initialized:", globalThis.remainingDroppedItems);
    } else if (levelData.type === "brokeandstandard") {
        const standardItems = nonWoodBoxItems.filter(item => item.includes("-") && !item.startsWith("BROKE"));
        const brokeItems = nonWoodBoxItems.filter(item => item.startsWith("BROKE"));
        globalThis.remainingStandardTasks.length = 0;
        globalThis.remainingStandardTasks.push(...standardItems);
        globalThis.remainingDroppedItems.length = 0;
        globalThis.remainingDroppedItems.push(...brokeItems);
        console.log("[BROKEANDSTANDARD TASK] Standard tasks:", globalThis.remainingStandardTasks);
        console.log("[BROKEANDSTANDARD TASK] Broke boxes:", globalThis.remainingDroppedItems);
    } else if (levelData.type === "grass") {
        // Grass level can have standard tasks (e.g., "0-50" = collect 50 frame 0 tiles)
        const standardItems = nonWoodBoxItems.filter(item => {
            const l = (item || "").toLowerCase();
            return item.includes("-") && !l.startsWith("grass") && !l.startsWith("toy");
        });
        globalThis.remainingStandardTasks.length = 0;
        globalThis.remainingStandardTasks.push(...standardItems);
        globalThis.remainingDroppedItems.length = 0;
        console.log("[GRASS TASK] Grass level initialized, standard tasks:", globalThis.remainingStandardTasks);
    } else if (levelData.type === "tree") {
        globalThis.remainingStandardTasks.length = 0;
        globalThis.remainingDroppedItems.length = 0;
        console.log("[TREE TASK] Tree level initialized");

        // Initialize tree task (Tree.js handles the actual task)
        if (treeItems.length > 0 && globalThis.initializeTreeTask) {
            const treeItem = treeItems[0];
            if (treeItem.includes("-")) {
                const required = parseInt(treeItem.split("-")[1]);
                globalThis.initializeTreeTask(required);
            }
        }

        // Initialize grass task for tree levels (tree has grass underneath)
        if (grassItems.length > 0) {
            let totalRequired = 0;
            grassItems.forEach(item => {
                if (item.includes("-")) {
                    totalRequired += parseInt(item.split("-")[1]);
                }
            });
            const taskIndex = levelData.droppedItems.indexOf(grassItems[0]);
            grassTask = { required: totalRequired, destroyed: 0, taskIndex, items: grassItems };
            console.log(`[TREE TASK] Grass task initialized: ${totalRequired} grass tiles`);
        }
    }
}

/**
 * Update standard task progress
 * Called when tiles are matched
 * @param {Array<number>} matchedUIDs - UIDs of matched tiles
 */
export function updateStandardTaskProgress(matchedUIDs) {
    console.log(`[TASK PROGRESS] updateStandardTaskProgress called with ${matchedUIDs.length} UIDs`);
    console.log(`[TASK PROGRESS] globalThis.remainingStandardTasks:`, globalThis.remainingStandardTasks);

    if (!globalThis.remainingStandardTasks || globalThis.remainingStandardTasks.length === 0) {
        console.log(`[TASK PROGRESS] No standard tasks - returning`);
        return;
    }

    const matchedTiles = runtime.objects.Tile.getAllInstances()
        .filter(tile => matchedUIDs.includes(tile.uid));

    console.log(`[TASK PROGRESS] Found ${matchedTiles.length} matched tiles`);

    // Count tiles by frame
    const matchCounts = {};
    matchedTiles.forEach(tile => {
        const frame = tile.animationFrame;
        if (typeof tile.instVars.TileType === 'number' ||
            (!isNaN(parseInt(tile.instVars.TileType)) && !isNaN(frame))) {
            matchCounts[frame] = (matchCounts[frame] || 0) + 1;
        }
    });

    // Update progress and UI for each matched frame
    Object.entries(matchCounts).forEach(([frame, count]) => {
        frame = parseInt(frame);

        // Check if this frame is in any task
        let frameNeededInTask = false;
        globalThis.remainingStandardTasks.forEach((task, index) => {
            if (task.includes("-")) {
                const [taskFrame, required] = task.split("-").map(Number);
                if (taskFrame === frame) {
                    frameNeededInTask = true;
                }
            }
        });

        // Only update if frame is in a task
        if (frameNeededInTask) {
            standardTaskProgress[frame] = (standardTaskProgress[frame] || 0) + count;
            console.log(`[TASK PROGRESS] Frame ${frame} matched ${count} times, total: ${standardTaskProgress[frame]}`);

            // Update UI for all tasks using this frame
            globalThis.remainingStandardTasks.forEach((task, index) => {
                if (task.includes("-")) {
                    const [taskFrame, required] = task.split("-").map(Number);
                    if (taskFrame === frame) {
                        const progress = standardTaskProgress[frame];
                        const remaining = Math.max(0, required - progress);
                        if (globalThis.updateTaskProgressUI) {
                            globalThis.updateTaskProgressUI(index, remaining);
                            console.log(`[TASK PROGRESS] UI updated: task ${index}, remaining: ${remaining}`);
                        }
                    }
                }
            });
        }
    });
}

/**
 * Update dropped item progress (TEST tiles)
 * @param {string} itemType - Type of dropped item (e.g., "TEST", "TEST2")
 */
export function updateDroppedItemProgress(itemType) {
    console.log(`[DROPPED PROGRESS] Item collected: ${itemType}`);

    // Find and remove this item from remaining
    const index = globalThis.remainingDroppedItems.indexOf(itemType);
    if (index !== -1) {
        globalThis.remainingDroppedItems.splice(index, 1);
        console.log(`[DROPPED PROGRESS] Remaining items:`, globalThis.remainingDroppedItems);
    }
}

/**
 * Check if all standard tasks are completed
 */
export function areStandardTasksCompleted() {
    if (!globalThis.remainingStandardTasks || globalThis.remainingStandardTasks.length === 0) return true;

    return globalThis.remainingStandardTasks.every(task => {
        if (task.includes("-")) {
            const [frame, required] = task.split("-").map(Number);
            const progress = standardTaskProgress[frame] || 0;
            return progress >= required;
        }
        return false;
    });
}

/**
 * Check if all dropped items are completed
 */
export function areDroppedItemsCompleted() {
    return !globalThis.remainingDroppedItems || globalThis.remainingDroppedItems.length === 0;
}

/**
 * Update WoodBox progress (regular WoodBox, 1 hit)
 * Called when WoodBoxes are destroyed
 * @param {number} count - Number of WoodBoxes destroyed
 */
export function updateWoodBoxProgress(count) {
    if (!woodBoxTask) return;

    woodBoxTask.destroyed += count;
    woodBoxProgress = woodBoxTask.destroyed;

    const remaining = Math.max(0, woodBoxTask.required - woodBoxTask.destroyed);
    console.log(`[WOODBOX PROGRESS] Destroyed ${count}, total: ${woodBoxTask.destroyed}/${woodBoxTask.required}, remaining: ${remaining}`);

    // Update UI - use dynamic task index from task object
    if (woodBoxTask.taskIndex !== undefined && globalThis.updateTaskProgressUI) {
        globalThis.updateTaskProgressUI(woodBoxTask.taskIndex, remaining);
    }
}

/**
 * Update WoodBox2 progress (strong WoodBox, 2 hits per box)
 * Called when WoodBox2s are COMPLETELY destroyed (not just downgraded)
 * @param {number} destroyedCount - Number of WoodBox2s completely destroyed
 */
export function updateWoodBox2Progress(destroyedCount) {
    if (!woodBox2Task) return;

    // Directly count completely destroyed boxes
    woodBox2Task.destroyed += destroyedCount;
    woodBox2Progress = woodBox2Task.destroyed;

    const remaining = Math.max(0, woodBox2Task.required - woodBox2Task.destroyed);
    console.log(`[WOODBOX2 PROGRESS] ${destroyedCount} boxes completely destroyed, total: ${woodBox2Task.destroyed}/${woodBox2Task.required}, remaining: ${remaining}`);

    // Update UI with box count
    if (woodBox2Task.taskIndex !== undefined && globalThis.updateTaskProgressUI) {
        globalThis.updateTaskProgressUI(woodBox2Task.taskIndex, remaining);
    }
}

/**
 * Check if WoodBox task is completed
 */
export function isWoodBoxTaskCompleted() {
    if (!woodBoxTask) {
        console.log("[WOODBOX CHECK] No WoodBox task = completed (TRUE)");
        return true; // No WoodBox task = completed
    }
    const completed = woodBoxTask.destroyed >= woodBoxTask.required;
    console.log(`[WOODBOX CHECK] Task: ${woodBoxTask.destroyed}/${woodBoxTask.required} = ${completed}`);
    return completed;
}

/**
 * Check if WoodBox2 task is completed
 */
export function isWoodBox2TaskCompleted() {
    if (!woodBox2Task) {
        console.log("[WOODBOX2 CHECK] No WoodBox2 task = completed (TRUE)");
        return true; // No WoodBox2 task = completed
    }
    const completed = woodBox2Task.destroyed >= woodBox2Task.required;
    console.log(`[WOODBOX2 CHECK] Task: ${woodBox2Task.destroyed}/${woodBox2Task.required} = ${completed}`);
    return completed;
}

/**
 * Get current WoodBox progress for UI
 */
export function getWoodBoxProgress() {
    if (!woodBoxTask) return { current: 0, required: 0 };
    return {
        current: woodBoxTask.destroyed,
        required: woodBoxTask.required
    };
}

/**
 * Get WoodBox task object (for debugging)
 */
export function getWoodBoxTask() {
    return woodBoxTask;
}

/**
 * Update Grass progress
 * Called when grass tiles are destroyed
 * @param {number} count - Number of grass tiles destroyed
 */
export function updateGrassProgress(count) {
    if (!grassTask) return;

    grassTask.destroyed += count;
    grassProgress = grassTask.destroyed;

    const remaining = Math.max(0, grassTask.required - grassTask.destroyed);
    console.log(`[GRASS PROGRESS] Destroyed ${count}, total: ${grassTask.destroyed}/${grassTask.required}, remaining: ${remaining}`);

    // Update UI - use dynamic task index from task object
    if (grassTask.taskIndex !== undefined && globalThis.updateTaskProgressUI) {
        globalThis.updateTaskProgressUI(grassTask.taskIndex, remaining);
    }
}

/**
 * Update Grass2 progress
 * Called when Grass2 (double grass) is completely destroyed (both layers gone)
 * @param {number} destroyedCount - Number of Grass2 completely destroyed
 */
export function updateGrass2Progress(destroyedCount) {
    if (!grass2Task) return;

    // Directly count completely destroyed grass2
    grass2Task.destroyed += destroyedCount;
    grass2Progress = grass2Task.destroyed;

    const remaining = Math.max(0, grass2Task.required - grass2Task.destroyed);
    console.log(`[GRASS2 PROGRESS] ${destroyedCount} Grass2 completely destroyed, total: ${grass2Task.destroyed}/${grass2Task.required}, remaining: ${remaining}`);

    // Update UI
    if (grass2Task.taskIndex !== undefined && globalThis.updateTaskProgressUI) {
        globalThis.updateTaskProgressUI(grass2Task.taskIndex, remaining);
    }
}

/**
 * Check if Grass task is completed
 */
export function isGrassTaskCompleted() {
    if (!grassTask) {
        console.log("[GRASS CHECK] No Grass task = completed (TRUE)");
        return true; // No Grass task = completed
    }
    const completed = grassTask.destroyed >= grassTask.required;
    console.log(`[GRASS CHECK] Task: ${grassTask.destroyed}/${grassTask.required} = ${completed}`);
    return completed;
}

/**
 * Get current Grass progress for UI
 */
export function getGrassProgress() {
    if (!grassTask) return { current: 0, required: 0 };
    return {
        current: grassTask.destroyed,
        required: grassTask.required
    };
}

/**
 * Get Grass task object (for debugging)
 */
export function getGrassTask() {
    return grassTask;
}

/**
 * Check if Grass2 task is completed
 */
export function isGrass2TaskCompleted() {
    if (!grass2Task) {
        console.log("[GRASS2 CHECK] No Grass2 task = completed (TRUE)");
        return true; // No Grass2 task = completed
    }
    const completed = grass2Task.destroyed >= grass2Task.required;
    console.log(`[GRASS2 CHECK] Task: ${grass2Task.destroyed}/${grass2Task.required} = ${completed}`);
    return completed;
}

/**
 * Get current Grass2 progress for UI
 */
export function getGrass2Progress() {
    if (!grass2Task) return { current: 0, required: 0 };
    return {
        current: grass2Task.destroyed,
        required: grass2Task.required
    };
}

/**
 * Get Grass2 task object (for debugging)
 */
export function getGrass2Task() {
    return grass2Task;
}
