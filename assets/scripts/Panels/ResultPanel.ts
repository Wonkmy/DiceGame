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
        // for (let i = 0; i < 3; i++) {
        //     setTimeout(() => {
        //         GameMain.instance.bundle.load("prefab/RewardItem", cc.Prefab,(err,prefab:cc.Prefab)=>{
        //             let newRewardItem: cc.Node = cc.instantiate(prefab);
        //             this.threeChooseOneContainerNode.addChild(newRewardItem);
        //             let r = randomInt(0,MainPanel.instance.allCharmDatas.length);
        //             let cd:CharmData = MainPanel.instance.allCharmDatas[r]
        //             newRewardItem.getComponent(RewardItem).init(cd);
        //         })
        //     }, 100 * i);
        // }
        let usedIds: number[] = [];

        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                GameMain.instance.bundle.load("prefab/RewardItem", cc.Prefab, (err, prefab: cc.Prefab) => {
                    let newRewardItem: cc.Node = cc.instantiate(prefab);
                    this.threeChooseOneContainerNode.addChild(newRewardItem);

                    let cd: CharmData = this.getRandomRewardData(usedIds);

                    if (cd && cd.id) {
                        usedIds.push(cd.id);
                    }

                    newRewardItem.getComponent(RewardItem).init(cd);
                });
            }, 100 * i);
        }
    }

    private getRandomRewardData(usedIds: number[]): CharmData {
        let effect = this.getRandomRewardEffect();

        let list = MainPanel.instance.allCharmDatas.filter((data: CharmData) => {
            return data.effect === effect && usedIds.indexOf(data.id) < 0;
        });

        // 如果当前类型没有可用奖励，就退回到全部未使用奖励
        if (list.length <= 0) {
            list = MainPanel.instance.allCharmDatas.filter((data: CharmData) => {
                return usedIds.indexOf(data.id) < 0;
            });
        }

        // 极端情况下还没有，就允许重复
        if (list.length <= 0) {
            list = MainPanel.instance.allCharmDatas;
        }

        let r = randomInt(0, list.length - 1);
        return list[r];
    }

    private getRandomRewardEffect(): string {
        let r = randomInt(1, 100);
        if (r <= 30) {
            return "heal";
        }
        if (r <= 60) {
            return "mult";
        }

        if (r <= 85) {
            return "point";
        }

        if (r <= 95) {
            return "fire";
        }

        return "fire";
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
