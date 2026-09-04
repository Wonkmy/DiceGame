import LoadingPanel from "./Panels/LoadingPanel";
import { FaynUtils } from "./Global/FaynUtils";
import TipPanel from "./Panels/TipPanel";
import { UIManager } from "./UIManager/UIManager";
import { CharmData } from "./Global/DiceHandUtil";
import Player from "./GameCodes/Player";
import DiceGameSave from "./GameCodes/DiceGameSave";
import ShareManager from "./GameCodes/ShareManager";
import { Advertise } from "./GameCodes/Advertise";

declare const wx: any;
const {ccclass, property} = cc._decorator;

@ccclass
export default class GameMain extends cc.Component {
    public static instance:GameMain = null!;

    protected static className = "GameMain";

    @property({type: cc.JsonAsset})
    gameConfig: cc.JsonAsset = null!;

    @property({type:Player})
    player:Player = null!;

    bundle:cc.AssetManager.Bundle = null!;
    private marketBgmStarted:boolean = false;

    static curChapterIndex:number = 0;
    static curStageIndex:number = 0;
    static gameFinished:boolean = false;
    static gameResultType:string = "stageWin";// stageWin:小关胜利 fail:失败 chapterWin:章节通关
    static isNewUserFirstPlay:boolean = false;// 本次启动是否为新用户自动进入的首局
    static curWinStreak:number = 0;// 本次挑战内连续胜利次数，失败/重开/回主页后清空


    // 如果有道具或者三选一的功能是改变点数和倍率的，直接使用这两个
    static extraPoint:number = 0;
    static extraMultiple:number = 0;
    static charmDatas:CharmData[]=[]

    protected onLoad(): void {
        cc.director.getCollisionManager().enabled=true;
        cc.director.getPhysicsManager().enabled = true;
        GameMain.instance = this;
        GameMain.curChapterIndex = 0;
        GameMain.curStageIndex = 0;
        GameMain.gameFinished = false;
        GameMain.curWinStreak = 0;
        ShareManager.initShareMenu();
        Advertise.init();
        if(CC_DEBUG){
            cc.assetManager.loadBundle("diceRougeArt",null!,(err,_bundle)=>{
                this.bundle = _bundle
                this.gameLoader();
            })
        }else{
            // cc.assetManager.loadBundle("https://wonkmycloudfile.oss-cn-beijing.aliyuncs.com/diceRougeArt",null!,(err,_bundle)=>{
            //     this.bundle = _bundle
            //     this.gameLoader();
            // })
            const ossUrl = "https://wonkmycloudfile.oss-cn-beijing.aliyuncs.com/diceRougeArt";
            cc.assetManager.loadBundle(ossUrl + "?t=" + Date.now(), null!, (err, bundle) => {
                if (err) {
                    console.error("OSS加载失败:", err);
                    // 如果这里报错，说明 OSS 路径或跨域还有问题
                    return;
                }
                console.log("成功从 OSS 加载 Bundle！");
                this.bundle = bundle;
                this.gameLoader();
            });
        }
    }


    gameLoader(){
        UIManager.getInstance().openUI(LoadingPanel,0,(ui:LoadingPanel)=>{
            ui.onShow();
        })
    }

    showTip(content:string){
        UIManager.getInstance().openUI(TipPanel,0,(ui:TipPanel)=>{
            ui.onShow();
            ui.showTip(content,null);
        })
    }

    playMarketBgmOnce(){
        if(this.marketBgmStarted)return;
        this.marketBgmStarted = true;
        // BGM只在进入游戏后播放一次，循环铺底，音量低于点击和反馈音效。
        FaynUtils.PlayMusic("marketbgm",true,0.35);
    }

    resetRunData(){
        GameMain.curChapterIndex = 0;
        GameMain.curStageIndex = 0;
        GameMain.gameFinished = false;
        GameMain.gameResultType = "stageWin";
        GameMain.curWinStreak = 0;
        GameMain.extraPoint = 0;
        GameMain.extraMultiple = 0;
        // 当前版本先弱化构筑，重开一局时清掉临时Charm。
        GameMain.charmDatas = [];
        DiceGameSave.resetCurrentGame();
    }

    restartCurChapterRun(){
        // 失败后本局重开：保留当前章节，只回到本章第1关，避免玩家通关第1章后又被打回最开始。
        GameMain.curStageIndex = 0;
        GameMain.gameFinished = false;
        GameMain.gameResultType = "stageWin";
        GameMain.curWinStreak = 0;
        GameMain.extraPoint = 0;
        GameMain.extraMultiple = 0;
        GameMain.charmDatas = [];
        DiceGameSave.resetCurrentGame();
    }

    getChallengeStageScore():number{
        // 总成绩按章节累加，2章各10关，方便排行榜展示“今天冲到第几关”
        return GameMain.curChapterIndex * 10 + GameMain.curStageIndex + 1;
    }

    addWinStreak(){
        // 只记录本次挑战内的连续胜利，不持久化，重开或回主页后自然清空。
        GameMain.curWinStreak++;
    }

    reportBestDamage(damage:number){
        if (cc.sys.platform != cc.sys.WECHAT_GAME || typeof wx === "undefined") {
            return;
        }

        wx.setUserCloudStorage({
            KVDataList: [
                { key: "rk_damage", value: `${damage}` }
            ],
            success: () => {
                console.log("最高一剑上报成功：" + damage);
            },
            fail: (err: any) => {
                console.error("最高一剑上报失败：", err);
            }
        });
    }

    reportBestStage(stage:number){
        if (cc.sys.platform != cc.sys.WECHAT_GAME || typeof wx === "undefined") {
            return;
        }

        wx.setUserCloudStorage({
            KVDataList: [
                { key: "rk_stage", value: `${stage}` }
            ],
            success: () => {
                console.log("最高关卡上报成功：" + stage);
            },
            fail: (err: any) => {
                console.error("最高关卡上报失败：", err);
            }
        });
    }

    reportTodayChallengeResult(){
        // 结算和返回主页时补记一次，避免失败或中途返回导致今日榜成绩漏上报。
        DiceGameSave.recordStage(this.getChallengeStageScore());
        this.reportBestStage(DiceGameSave.getBestStage());
        this.reportChallengeRank(DiceGameSave.getTodayBestStage());
    }

    reportChallengeRank(stage:number){
        if (cc.sys.platform != cc.sys.WECHAT_GAME || typeof wx === "undefined") {
            return;
        }

        let regionName:string = DiceGameSave.getRegionName();
        wx.setUserCloudStorage({
            KVDataList: [
                { key: "rk_today_stage", value: `${stage}` },
                { key: "rk_region", value: regionName },
                { key: "rk_region_stage", value: `${regionName}_${stage}` }
            ],
            success: () => {
                console.log("今日挑战成绩上报成功：" + stage);
            },
            fail: (err: any) => {
                console.error("今日挑战成绩上报失败：", err);
            }
        });
    }
}
