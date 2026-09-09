import LoadingPanel from "./Panels/LoadingPanel";
import { FaynUtils } from "./Global/FaynUtils";
import TipPanel from "./Panels/TipPanel";
import { UIManager } from "./UIManager/UIManager";
import { CharmData } from "./Global/DiceHandUtil";
import Player from "./GameCodes/Player";
import DiceGameSave from "./GameCodes/DiceGameSave";
import ShareManager from "./GameCodes/ShareManager";
import { Advertise } from "./GameCodes/Advertise";
import RecommendManager from "./GameCodes/RecommendManager";
import SubscribeSystemMessageManager from "./GameCodes/SubscribeSystemMessageManager";

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
    static isNewUserChapterNameFlow:boolean = false;// 新用户首次自动进入后的本轮流程，章节名保持“新手章节”
    static curWinStreak:number = 0;// 本次挑战内连续胜利次数，失败/重开/回主页后清空
    static readonly TIP_UI_Z_ORDER:number = 99;// 通用提示层级，保证 TipPanel 不会被后续弹窗盖住


    // 如果有道具或者三选一的功能是改变点数和倍率的，直接使用这两个
    static extraPoint:number = 0;
    static extraMultiple:number = 0;
    static extraDamageRate:number = 0;// 下次攻击最终伤害百分比加成，来自轻量事件节点
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
        RecommendManager.preload();
        SubscribeSystemMessageManager.tryReportHelpInteractiveFromLaunch();

        cc.assetManager.loadBundle("diceRougeArt",null!,(err,_bundle)=>{
                this.bundle = _bundle
                this.gameLoader();
            })
        // if(CC_DEBUG){
        //     cc.assetManager.loadBundle("diceRougeArt",null!,(err,_bundle)=>{
        //         this.bundle = _bundle
        //         this.gameLoader();
        //     })
        // }else{
        //     const ossUrl = "https://wonkmycloudfile.oss-cn-beijing.aliyuncs.com/diceRougeArt";
        //     cc.assetManager.loadBundle(ossUrl + "?t=" + Date.now(), null!, (err, bundle) => {
        //         if (err) {
        //             console.error("OSS加载失败:", err);
        //             // 如果这里报错，说明 OSS 路径或跨域还有问题
        //             return;
        //         }
        //         console.log("成功从 OSS 加载 Bundle！");
        //         this.bundle = bundle;
        //         this.gameLoader();
        //     });
        // }
    }


    gameLoader(){
        UIManager.getInstance().openUI(LoadingPanel,0,(ui:LoadingPanel)=>{
            ui.onShow();
        })
    }

    showTip(content:string){
        UIManager.getInstance().openUI(TipPanel,GameMain.TIP_UI_Z_ORDER,(ui:TipPanel)=>{
            ui.onShow();
            ui.showTip(content,null);
        })
    }

    playMarketBgmOnce(){
        if(this.marketBgmStarted)return;
        this.marketBgmStarted = true;
        // BGM只在进入游戏后播放一次，循环铺底，音量低于点击和反馈音效。
        FaynUtils.PlayMusic("bgmloop",true,0.35);
    }

    resetRunData(){
        GameMain.curChapterIndex = 0;
        GameMain.curStageIndex = 0;
        GameMain.gameFinished = false;
        GameMain.gameResultType = "stageWin";
        this.finishNewUserFirstFlow();
        GameMain.curWinStreak = 0;
        GameMain.extraPoint = 0;
        GameMain.extraMultiple = 0;
        GameMain.extraDamageRate = 0;
        // 当前版本先弱化构筑，重开一局时清掉临时Charm。
        GameMain.charmDatas = [];
        DiceGameSave.resetCurrentGame();
    }

    restartCurChapterRun(){
        // 失败后本局重开：保留当前章节，只回到本章第1关，避免玩家通关第1章后又被打回最开始。
        GameMain.curStageIndex = 0;
        GameMain.gameFinished = false;
        GameMain.gameResultType = "stageWin";
        this.finishNewUserFirstFlow();
        GameMain.curWinStreak = 0;
        GameMain.extraPoint = 0;
        GameMain.extraMultiple = 0;
        GameMain.extraDamageRate = 0;
        GameMain.charmDatas = [];
        DiceGameSave.resetCurrentGame();
    }

    /**
     * 结束新用户首局特殊流程。
     * 只清运行期标记，不清本地存档里的新老用户记录，避免老玩家被重新判成新玩家。
     */
    finishNewUserFirstFlow(){
        GameMain.isNewUserFirstPlay = false;
        GameMain.isNewUserChapterNameFlow = false;
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
        if (!this.canUseWechatCloudStorage()) {
            return;
        }

        this.safeSetUserCloudStorage([
            { key: "rk_damage", value: `${damage}` }
        ], "最高一剑", damage);
    }

    reportBestStage(stage:number){
        if (!this.canUseWechatCloudStorage()) {
            return;
        }

        this.safeSetUserCloudStorage([
            // rkstage 是微信后台申请的排行榜唯一 ID，旧的 rk_stage 不再使用。
            { key: "rkstage", value: `${stage}` }
        ], "最高关卡", stage);
    }

    reportTodayChallengeResult(){
        // 结算和返回主页时补记一次，避免失败或中途返回导致今日榜成绩漏上报。
        DiceGameSave.recordStage(this.getChallengeStageScore());
        // 好友榜当前只使用微信后台审核的 rkstage；旧的 rk_stage 上报先停用，避免榜单 key 混用。
        // this.reportBestStage(DiceGameSave.getBestStage());
        this.reportChallengeRank(DiceGameSave.getTodayBestStage());
    }

    reportChallengeRank(stage:number){
        if (!this.canUseWechatCloudStorage()) {
            return;
        }

        let regionName:string = DiceGameSave.getRegionName();
        this.safeSetUserCloudStorage([
            // rkstage 是微信小游戏后台申请的排行榜唯一 ID，用今日最好关卡作为榜单成绩。
            { key: "rkstage", value: `${stage}` },
            { key: "rk_region", value: regionName },
            { key: "rk_region_stage", value: `${regionName}_${stage}` }
        ], "今日挑战成绩", stage);
    }

    /**
     * 判断当前环境是否支持微信开放数据上报。
     * 不支持时直接跳过，避免浏览器、本地调试或接口缺失导致结算流程报错。
     */
    private canUseWechatCloudStorage():boolean{
        return cc.sys.platform === cc.sys.WECHAT_GAME && typeof wx !== "undefined" && !!wx.setUserCloudStorage;
    }

    /**
     * 安全上报微信开放数据。
     * 上报失败只记录日志，不阻断战斗结算、排行榜入口和返回主页流程。
     */
    private safeSetUserCloudStorage(kvDataList:any[], logName:string, score:number){
        try{
            wx.setUserCloudStorage({
                KVDataList: kvDataList,
                success: () => {
                    console.log(logName + "上报成功：" + score);
                },
                fail: (err: any) => {
                    console.error(logName + "上报失败：", err);
                }
            });
        }catch(e){
            console.error(logName + "上报异常：", e);
        }
    }
}
