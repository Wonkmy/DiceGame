import ChapterNode from "../GameCodes/ChapterNode";
import GameMain from "../GameMain";
import { Chapter, GameChapter } from "../Global/DiceHandUtil";
import { BaseUI } from "../UIManager/BaseUI";
import { UIManager } from "../UIManager/UIManager";
import MainPanel from "./MainPanel";
import { Advertise } from "../GameCodes/Advertise";
import HomePanel from "./HomePanel";

const {ccclass, property} = cc._decorator;

@ccclass
export default class ChapterPanel extends BaseUI {
    protected static className = "ChapterPanel";

    @property({type:cc.Node})
    chapterNodeContainer:cc.Node = null!;

    @property({type:cc.Node, displayName:"兜底返回主页按钮", tooltip:"点击后强制关闭所有界面并回到主页；不拖拽则不启用"})
    btn_forceBackHome:cc.Node = null!;

    private forceBackHomeBtnMovedToCanvas:boolean = false;

    onLoad(){
        if(this.btn_forceBackHome){
            this.btn_forceBackHome.off(cc.Node.EventType.TOUCH_END, this.onForceBackHome, this);
            this.btn_forceBackHome.on(cc.Node.EventType.TOUCH_END, this.onForceBackHome, this);
        }
    }

    override onShow(): void {
        Advertise.showGeziOnlyForFlowPanel();
        this.refreshForceBackHomeBtnLayer();
    }

    setChapterNode(gameCapter:GameChapter){
        let nodeDatas: Chapter[] = gameCapter.chapter[GameMain.curStageIndex];
        if(this.chapterNodeContainer){
            this.chapterNodeContainer.destroyAllChildren();
        }
        if(!nodeDatas || nodeDatas.length <= 0){
            console.error("当前关卡节点配置为空:", GameMain.curChapterIndex, GameMain.curStageIndex);
            GameMain.instance.showTip("当前关卡配置为空");
            return;
        }
        this.node.getChildByName("chapter_title").getComponent(cc.Label).string = this.getChapterShowName(gameCapter);
        this.node.getChildByName("stage_title").getComponent(cc.Label).string = `关卡${(GameMain.curStageIndex + 1)}`
        // 这里设置具体的章节名，章节内容等
        for (let i = 0; i < nodeDatas.length; i++) {
            let nodeData:Chapter = nodeDatas[i];
            GameMain.instance.bundle.load("prefab/chapterNode", cc.Prefab, (err, prefab: cc.Prefab) => {
                if(err || !prefab){
                    console.error("章节节点预制体加载失败:", err);
                    GameMain.instance.showTip("关卡节点加载失败，请稍后重试");
                    return;
                }

                let newChapterNode: cc.Node = cc.instantiate(prefab);
                this.chapterNodeContainer.addChild(newChapterNode);
                if(nodeData.type == "battle"){
                    const mdata = MainPanel.instance.allMonsterDatas[nodeData.eventData.monsterIds]
                    if(!mdata){
                        console.error("章节怪物配置不存在:", nodeData.eventData.monsterIds);
                        this.setChapterNodeText(newChapterNode, "关卡配置异常");
                        return;
                    }

                    this.setChapterNodeText(newChapterNode, `击杀${mdata.name}\n点击挑战`);
                    GameMain.instance.bundle.load("arts/monsters/"+ mdata.asset, cc.SpriteFrame, (err, sp: cc.SpriteFrame) =>{
                        newChapterNode.getChildByName("view").getComponent(cc.Sprite).spriteFrame = sp;
                    })
                }else{
                    this.setChapterNodeText(newChapterNode, `${this.getEventShowName(nodeData.type)}\n点击领取`);
                }
                newChapterNode.getComponent(ChapterNode).init(nodeData);
            })
        }
    }

    /**
     * 获取章节预告页显示名。
     * 新用户首次自动进入和失败重试保留“新手章节”，后续从主页再次进入第1章显示为“骰火营地”。
     */
    private getChapterShowName(gameCapter:GameChapter):string{
        if(GameMain.curChapterIndex === 0 && !GameMain.isNewUserChapterNameFlow){
            return "骰火营地";
        }

        return String(gameCapter.chapterName);
    }

    /**
     * 获取事件节点显示名。
     * 旧的 shop 类型不再显示“商店”，避免玩家误以为会进入商店界面。
     */
    private getEventShowName(type:string):string{
        if(type === "shop")return "铸骰台";
        if(type === "rest")return "休息点";
        if(type === "treasure")return "宝箱";
        return "补给";
    }

    /**
     * 设置章节节点文案。
     * 复用预制体已有 content 文本，加上点击引导，不额外要求拖拽新组件。
     */
    private setChapterNodeText(chapterNode:cc.Node, text:string){
        let label:cc.Label = chapterNode.getChildByName("content").getComponent(cc.Label);
        label.string = text;
        label.fontSize = 34;
        label.lineHeight = 38;
    }

    /**
     * 兜底返回主页：用于玩家遇到无法点击/界面卡住时手动脱离当前流程。
     */
    private onForceBackHome(){
        GameMain.instance.reportTodayChallengeResult();
        GameMain.instance.resetRunData();
        Advertise.showBackHomeChapingByRate();
        UIManager.getInstance().closeALLUI();
        GameMain.instance.scheduleOnce(() => {
            UIManager.getInstance().openUI(HomePanel, 0, (ui: HomePanel) => {
                ui.onShow();
            });
        }, 0.2);
    }

    /**
     * 兜底按钮每次打开章节界面都提到 Canvas 最高层，避免被其他弹窗遮挡后无法点击。
     */
    private refreshForceBackHomeBtnLayer(){
        if(!this.btn_forceBackHome || !cc.isValid(this.btn_forceBackHome))return;

        let canvas:cc.Node = cc.find("Canvas");
        if(canvas && cc.isValid(canvas) && this.btn_forceBackHome.parent !== canvas){
            // 挪到 Canvas 下时保持当前屏幕位置，避免改变用户在编辑器里摆好的按钮位置。
            let oldParent:cc.Node = this.btn_forceBackHome.parent;
            if(oldParent && cc.isValid(oldParent)){
                let worldPos:cc.Vec2 = oldParent.convertToWorldSpaceAR(this.btn_forceBackHome.position);
                this.btn_forceBackHome.removeFromParent(false);
                canvas.addChild(this.btn_forceBackHome, 99999);
                this.btn_forceBackHome.setPosition(canvas.convertToNodeSpaceAR(worldPos));
                this.forceBackHomeBtnMovedToCanvas = true;
            }
        }

        this.btn_forceBackHome.active = true;
        this.btn_forceBackHome.zIndex = 99999;
        this.btn_forceBackHome.setSiblingIndex(99999);
    }

    onDestroy(): void {
        if(this.btn_forceBackHome){
            this.btn_forceBackHome.off(cc.Node.EventType.TOUCH_END, this.onForceBackHome, this);
            // 挪到 Canvas 后不会跟随 ChapterPanel 自动销毁，这里主动清掉避免残留按钮。
            if(this.forceBackHomeBtnMovedToCanvas && cc.isValid(this.btn_forceBackHome)){
                this.btn_forceBackHome.destroy();
            }
        }
    }
}
