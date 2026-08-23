import ChapterNode from "../GameCodes/ChapterNode";
import GameMain from "../GameMain";
import { Chapter, GameChapter } from "../Global/DiceHandUtil";
import { BaseUI } from "../UIManager/BaseUI";
import { UIManager } from "../UIManager/UIManager";
import MainPanel from "./MainPanel";

const {ccclass, property} = cc._decorator;

@ccclass
export default class ChapterPanel extends BaseUI {
    protected static className = "ChapterPanel";

    @property({type:cc.Node})
    chapterNodeContainer:cc.Node = null!;

    override onShow(): void {

    }

    setChapterNode(gameCapter:GameChapter){
        let nodeDatas: Chapter[] = gameCapter.chapter[GameMain.curStageIndex];
        this.node.getChildByName("chapter_title").getComponent(cc.Label).string = String(gameCapter.chapterName)
        this.node.getChildByName("stage_title").getComponent(cc.Label).string = `关卡${(GameMain.curStageIndex + 1)}`
        // 这里设置具体的章节名，章节内容等
        for (let i = 0; i < nodeDatas.length; i++) {
            let nodeData:Chapter = nodeDatas[i];
            GameMain.instance.bundle.load("prefab/chapterNode", cc.Prefab, (err, prefab: cc.Prefab) => {
                let newChapterNode: cc.Node = cc.instantiate(prefab);
                this.chapterNodeContainer.addChild(newChapterNode);
                if(nodeData.type == "battle"){
                    const mdata = MainPanel.instance.allMonsterDatas[nodeData.eventData.monsterIds]
                    newChapterNode.getChildByName("content").getComponent(cc.Label).string = `击杀${mdata.name}`;
                    GameMain.instance.bundle.load("arts/monsters/"+ mdata.asset, cc.SpriteFrame, (err, sp: cc.SpriteFrame) =>{
                        newChapterNode.getChildByName("view").getComponent(cc.Sprite).spriteFrame = sp;
                    })
                }else{
                    newChapterNode.getChildByName("content").getComponent(cc.Label).string = nodeData.type+"\n"+nodeData.eventData.eType;
                }
                newChapterNode.getComponent(ChapterNode).init(nodeData);
            })
        }
    }
}
