import HomePanel from "./Panels/HomePanel";
import MainPanelRuntime from "./Panels/MainPanelRuntime";
import { FaynUtils } from "./Global/FaynUtils";
import TipPanel from "./Panels/TipPanel";
import { UIManager } from "./UIManager/UIManager";
import { CharmData, DiceType } from "./Global/DiceHandUtil";
import Player from "./GameCodes/Player";

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

    static curStage:number = 0;
    static gameFinished:boolean = false;


    // 如果有道具或者三选一的功能是改变点数和倍率的，直接使用这两个
    static extraPoint:number = 0;
    static extraMultiple:number = 0;
    static charmDatas:CharmData[]=[]

    protected onLoad(): void {
        cc.director.getCollisionManager().enabled=true;
        cc.director.getPhysicsManager().enabled = true;
        GameMain.instance = this;
        GameMain.curStage = 0;
        if(CC_DEBUG){
            cc.assetManager.loadBundle("diceRougeArt",null!,(err,_bundle)=>{
                this.bundle = _bundle
                this.gameLoader();
            })
        }else{
            // cc.assetManager.loadBundle("https://wonkmycloudfile.oss-cn-beijing.aliyuncs.com/jiuhuoArt",null!,(err,_bundle)=>{
            //     this.bundle = _bundle
            //     this.gameLoader();
            // })
            const ossUrl = "https://wonkmycloudfile.oss-cn-beijing.aliyuncs.com/jiuhuoArt";
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
        UIManager.getInstance().openUI(HomePanel,0,(ui:HomePanel)=>{
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
}
