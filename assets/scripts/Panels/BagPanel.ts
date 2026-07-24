import { BaseUI } from "../UIManager/BaseUI";
import MainPanel from "./MainPanel";
import GameMain from "../GameMain";
const {ccclass, property} = cc._decorator;
import { UIManager } from "../UIManager/UIManager";
import { FaynUtils } from "../Global/FaynUtils";
import ItemCell from "../UIManager/ItemCell";

@ccclass
export default class BagPanel extends BaseUI {
    protected static className = "BagPanel";

    @property({type:cc.Node})
    inventoryContainer:cc.Node = null!;

    @property({type:cc.Node})
    closeBtn:cc.Node = null!;

    override onShow(): void {
        this.closeBtn.on(cc.Node.EventType.TOUCH_END, () => {
            FaynUtils.PlayMusic("click",false,1);
            UIManager.getInstance().closeUI(BagPanel);
        },this)
        this.node.getChildByName("splash").on(cc.Node.EventType.TOUCH_END, () => {
            FaynUtils.PlayMusic("click",false,1);
            UIManager.getInstance().closeUI(BagPanel);
        }, this)
    }

    setInventoryData(inventortType: string) {
        if (inventortType === "bag") {
            this.node.getChildByName("ItemContainers").getChildByName("title").getComponent(cc.Label).string = "我的骰子";
            let count: number = GameMain.instance.player.myDices.length;
            if (count <= 0) {
                this.node.getChildByName("ItemContainers").getChildByName("empty_tip").getComponent(cc.Label).string = "暂无骰子";
            } else {
                this.node.getChildByName("ItemContainers").getChildByName("empty_tip").active = false;
            }
            if (count <= 1) {
                this.inventoryContainer.width = 720;
            } else {
                this.inventoryContainer.width = count * 90 + (count + 1) * 20;
            }
            for (let i = 0; i < count; i++) {
                GameMain.instance.bundle.load("prefab/itemCell", cc.Prefab, (err, prefab: cc.Prefab) => {
                    let newitemCell: cc.Node = cc.instantiate(prefab);
                    this.inventoryContainer.addChild(newitemCell);
                    newitemCell.getComponent(ItemCell).init(GameMain.instance.player.myDices[i]);
                })
            }
        }
    }
}
