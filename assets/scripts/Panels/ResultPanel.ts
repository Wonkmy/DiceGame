import { FaynUtils } from "../Global/FaynUtils";
import { BaseUI } from "../UIManager/BaseUI";
import { UIManager } from "../UIManager/UIManager";
import GameMain from "../GameMain";
import MainPanel from "./MainPanel";
import RewardItem from "../UIManager/RewardItem";
import { CharmData, randomInt } from "../Global/DiceHandUtil";
const {ccclass, property} = cc._decorator;

@ccclass
export default class ResultPanel extends BaseUI{
    protected static className = "ResultPanel";

    @property({type:cc.Node})
    btn_next:cc.Node = null!;

    @property({type:cc.Node})
    threeChooseOneContainerNode:cc.Node = null!;

    override onShow(): void {
        this.btn_next.on(cc.Node.EventType.TOUCH_END,this.onNextTurn,this)

        this.scheduleOnce(()=>{
            this.genThreeChooseRewardItem();
        },0.2);
    }

    private genThreeChooseRewardItem(){
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                GameMain.instance.bundle.load("prefab/RewardItem", cc.Prefab,(err,prefab:cc.Prefab)=>{
                    let newRewardItem: cc.Node = cc.instantiate(prefab);
                    this.threeChooseOneContainerNode.addChild(newRewardItem);
                    let r = randomInt(0,MainPanel.instance.allCharmDatas.length);
                    let cd:CharmData = MainPanel.instance.allCharmDatas[r]
                    newRewardItem.getComponent(RewardItem).init(cd);
                })
            }, 100 * i);
        }
    }

    private onNextTurn(){
        UIManager.getInstance().closeUI(MainPanel);
        FaynUtils.PlayMusic("btnclick",false,1);
        GameMain.curStage++;
        UIManager.getInstance().closeUI(ResultPanel);
        UIManager.getInstance().openUI(MainPanel, 0, (ui: MainPanel) => {
            ui.onShow();
        })
    }

    setOpenHoreBtnActive(active:boolean){
    }
    private onOpenHire(){
        FaynUtils.PlayMusic("btnclick",false,1);
    }

    override onDestroy(): void {
        this.btn_next.off(cc.Node.EventType.TOUCH_END,this.onNextTurn,this)
    }
}
