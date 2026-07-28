export const chapterNodeConfig = [
    [{ type: "battle", monsterIds: 0 }],
    [{ type: "battle", monsterIds: 1 }],
    [{ type: "shop" }, { type: "event" }],
    [{ type: "elite", monsterIds: 3 }],
    [{ type: "rest" }, { type: "treasure" }],
    [{ type: "boss", monsterIds: 5 }],
];
export class CharmData{
    id:number = 0;
    name:string = "";
    type:string = "";
    desc:string = "";
    effect:string = "";
    num:number = 0;
    icon:string = "";
    useCount:number = 0;
}
export enum DiceType{
    /**
     * 普通骰子
     */
    normal,
    /**
     * 火焰骰子
     */
    fire,
    /**
     * 金币骰子
     */
    gold,
    /**
     * 治疗骰子
     */
    heal,
    /**
     * 护盾骰子
     */
    shield,
    /**
     * 重掷骰子
     */
    reroll,
    /**
     * 倍率骰子
     */
    mult,
    /**
     * 毒骰子
     */
    poison,
}
export enum DiceHandType {
    None = 0,
    Single = 1,
    Pair = 2,
    Three = 3,
    Four = 4,
    Straight = 5,
};

export class BehaviorData{
    type:string = "";
    des:string = "";
    bValue:number = 0;
}
export class CalculateData {
    totalPoints: number;
    totalMultiple: number;
    constructor(totalPoints: number, totalMultiple: number) {
        this.totalPoints = totalPoints;
        this.totalMultiple = totalMultiple;
    }
}

export enum Monster {
    slime = 0,
    bat = 1,
    skeleton = 2,
};

export class MonsterData {
    id: number = 0;
    name:string = "";
    stage:number = 0;// 出现的关卡数
    hp: number = 0;
    shiled: number = 0;
    attack: number = 0;
    gold:number = 0;
    behaviorData?:BehaviorData;
    asset: string = "";
}

export class DiceNodePoint {
    dicePoint: number = 0;
    diceNode: cc.Node = null!;
    diceType:DiceType = DiceType.normal;
}

export interface DiceHandResult {
    type: DiceHandType;
    usedDicePoint: number[];
    unusedDicePoint: number[];
}

export function GetTypeNameByType(_type: DiceHandType) {
    switch (_type) {
        case DiceHandType.None:
            return "无牌";
        case DiceHandType.Single:
            return "高牌";
        case DiceHandType.Pair:
            return "对子";
        case DiceHandType.Three:
            return "三条";
        case DiceHandType.Four:
            return "四条";
        case DiceHandType.Straight:
            return "顺子";
    }
}

export function GetCalculateMultiple(_type: DiceHandType): CalculateData {
    switch (_type) {
        case DiceHandType.Single:
            return new CalculateData(5, 1);
        case DiceHandType.Pair:
            return new CalculateData(8, 1);
        case DiceHandType.Three:
            return new CalculateData(14, 1);
        case DiceHandType.Four:
            return new CalculateData(22, 2);
        case DiceHandType.Straight:
            return new CalculateData(18, 2);
        default:
            return new CalculateData(5,1);
    }
}

/**
 * 判断当前选中的骰子组合，并返回参与组合与未参与组合的骰子。
 * 判定优先级：顺子 > 四条 > 三条 > 对子 > 单骰。
 */
export function getDiceHandResult(selectedDicePoint: number[] = []): DiceHandResult {
    const dicePoints = selectedDicePoint.slice(0, 5);

    if (dicePoints.length <= 0) {
        return {
            type: DiceHandType.None,
            usedDicePoint: [],
            unusedDicePoint: [],
        };
    }

    const straight = findStraight(dicePoints);
    if (straight.length > 0) {
        return buildResult(DiceHandType.Straight, straight, dicePoints);
    }

    const four = findSamePoint(dicePoints, 4);
    if (four.length > 0) {
        return buildResult(DiceHandType.Four, four, dicePoints);
    }

    const three = findSamePoint(dicePoints, 3);
    if (three.length > 0) {
        return buildResult(DiceHandType.Three, three, dicePoints);
    }

    const pair = findSamePoint(dicePoints, 2);
    if (pair.length > 0) {
        return buildResult(DiceHandType.Pair, pair, dicePoints);
    }

    return buildResult(DiceHandType.Single, [dicePoints[0]], dicePoints);
}

// 兼容之前只需要类型值的调用。
export function getDiceHandType(selectedDicePoint: number[] = []): DiceHandType {
    return getDiceHandResult(selectedDicePoint).type;
}

function findSamePoint(dicePoints: number[], needCount: number): number[] {
    const pointCount: Record<number, number> = {};

    for (const point of dicePoints) {
        pointCount[point] = (pointCount[point] || 0) + 1;
    }

    for (let point = 6; point >= 1; point--) {
        if ((pointCount[point] || 0) >= needCount) {
            return new Array(needCount).fill(point);
        }
    }

    return [];
}

function findStraight(dicePoints: number[]): number[] {
    const uniquePoints = Array.from(new Set(dicePoints)).sort((a, b) => a - b);

    if (uniquePoints.length < 3) {
        return [];
    }

    let bestStraight: number[] = [];
    let currentStraight: number[] = [uniquePoints[0]];

    for (let i = 1; i < uniquePoints.length; i++) {
        if (uniquePoints[i] === uniquePoints[i - 1] + 1) {
            currentStraight.push(uniquePoints[i]);
        } else {
            if (currentStraight.length > bestStraight.length) {
                bestStraight = currentStraight;
            }

            currentStraight = [uniquePoints[i]];
        }
    }

    if (currentStraight.length > bestStraight.length) {
        bestStraight = currentStraight;
    }

    return bestStraight.length >= 3 ? bestStraight : [];
}

function buildResult(type: DiceHandType, usedDicePoint: number[], allDicePoint: number[]): DiceHandResult {
    const unusedDicePoint = [...allDicePoint];

    // 按值移除已参与组合的骰子，剩下的就是未参与牌型的骰子。
    for (const point of usedDicePoint) {
        const index = unusedDicePoint.indexOf(point);

        if (index >= 0) {
            unusedDicePoint.splice(index, 1);
        }
    }

    return {
        type,
        usedDicePoint,
        unusedDicePoint,
    };
}



// 指定范围内随机生成候选点，且每个点遵循不重叠位置
export interface DicePositionRange {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
}

/**
 * 生成不重叠的骰子位置。
 * 会先生成一批候选点，再洗牌筛选，保证每次位置顺序和结果尽量不同。
 */
export function getNoOverlapDicePositions(
    count: number,
    range: DicePositionRange,
    minDistance: number = 80,
    candidateCount: number = 300,
    occupiedPositions: cc.Vec2[] = [],
): cc.Vec2[] {
    const candidates: cc.Vec2[] = [];

    for (let i = 0; i < candidateCount; i++) {
        candidates.push(new cc.Vec2(
            randomInt(range.minX, range.maxX),
            randomInt(range.minY, range.maxY),
        ));
    }

    return pickNoOverlapPositions(candidates, count, minDistance, occupiedPositions);
}

/**
 * 从传入的位置数组中洗牌并挑出不重叠的位置。
 * 适合你已经有一批可用位置点，只想随机取 n 个的情况。
 */
export function pickNoOverlapPositions(
    positions: cc.Vec2[],
    count: number,
    minDistance: number = 80,
    occupiedPositions: cc.Vec2[] = [],
): cc.Vec2[] {
    const shuffledPositions = shufflePositions(positions);
    const result: cc.Vec2[] = [];

    for (const pos of shuffledPositions) {
        if (result.length >= count) {
            break;
        }

        // 检查是否与所有已占用位置（包括本次新生成的和场上已有的）重叠
        const allOccupied = [...result, ...occupiedPositions];
        if (isPositionAvailable(pos, allOccupied, minDistance)) {
            result.push(pos);
        }
    }

    return result;
}
function isPositionAvailable(
    pos: cc.Vec2,
    occupiedPositions: cc.Vec2[],
    minDistance: number
): boolean {
    for (const occupied of occupiedPositions) {
        const dx = Math.abs(pos.x - occupied.x);
        const dy = Math.abs(pos.y - occupied.y);
        // 只有当横向和纵向距离都小于 minDistance 时才认为重叠
        if (dx < minDistance && dy < minDistance) {
            return false;
        }
    }
    return true;
}


function shufflePositions(positions: cc.Vec2[]): cc.Vec2[] {
    const result = positions.slice();

    for (let i = result.length - 1; i > 0; i--) {
        const randomIndex = randomInt(0, i);
        const temp = result[i];
        result[i] = result[randomIndex];
        result[randomIndex] = temp;
    }

    return result;
}

export function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min)) + min;
}
