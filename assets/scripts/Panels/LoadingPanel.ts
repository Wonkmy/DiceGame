import GameMain from "../GameMain";
import { BaseUI } from "../UIManager/BaseUI";
import { UIManager } from "../UIManager/UIManager";
import DiceGameSave from "../GameCodes/DiceGameSave";
import HomePanel from "./HomePanel";
import MainPanel from "./MainPanel";

const {ccclass, property} = cc._decorator;

@ccclass
export default class LoadingPanel extends BaseUI {
    protected static className = "LoadingPanel";

    @property({type:cc.Sprite, displayName:"加载进度条", tooltip:"LoadingPanel 使用的进度条 Sprite，加载时会修改 fillRange"})
    slider_bg:cc.Sprite = null!;

    private loadingTimer:any = null;

    override onShow(): void {
        if(this.slider_bg){
            this.slider_bg.fillRange = 0;
        }

        this.startProgress();
    }

    private startProgress(){
        if(!this.slider_bg){
            // LoadingPanel 必须在 Creator 里拖拽进度条 Sprite；未绑定时直接进入后续流程，避免卡死。
            this.enterNextPanel();
            return;
        }

        this.loadingTimer = setInterval(()=>{
            this.slider_bg.fillRange += 0.1;
            if(this.slider_bg.fillRange >= 1){
                clearInterval(this.loadingTimer);
                this.loadingTimer = null;
                this.enterNextPanel();
            }
        },100);
    }

    private enterNextPanel(){
        UIManager.getInstance().closeUI(LoadingPanel);

        if(DiceGameSave.canNewUserAutoPlay()){
            // 新用户首局直接进游戏，不消耗挑战次数
            GameMain.isNewUserFirstPlay = true;
            DiceGameSave.markNewUserAutoPlayed();
            UIManager.getInstance().openUI(MainPanel,0,(ui:MainPanel)=>{
                ui.onShow();
                GameMain.instance.resetRunData();
                GameMain.instance.player.getDices();
                GameMain.instance.playMarketBgmOnce();
            })
            return;
        }

        UIManager.getInstance().openUI(HomePanel,0,(ui:HomePanel)=>{
            ui.onShow();
        })
    }

    override onDestroy(): void {
        if(this.loadingTimer){
            clearInterval(this.loadingTimer);
            this.loadingTimer = null;
        }
    }
}
