import GameMain from "../GameMain";
import { Chapter, CreateChapter } from "../Global/DiceHandUtil";
import { UIManager } from "../UIManager/UIManager";
import DiceGameSave from "./DiceGameSave";
import ChapterPanel from "../Panels/ChapterPanel";
import HomePanel from "../Panels/HomePanel";
import LoadingPanel from "../Panels/LoadingPanel";
import MainPanel from "../Panels/MainPanel";
import ResultPanel from "../Panels/ResultPanel";

const DEBUG_PANEL_NAME:string = "DebugToolPanel";
const DEBUG_BTN_NAME:string = "DebugToolButton";

export default class DebugTool {
    static attach(parent:cc.Node){
        if(!CC_DEBUG || !parent)return;
        if(parent.getChildByName(DEBUG_BTN_NAME))return;

        let btn:cc.Node = this.createButton("调试", 100, 42, cc.color(35, 35, 35, 230));
        btn.name = DEBUG_BTN_NAME;
        btn.setPosition(280, 575);
        parent.addChild(btn, 9999);
        btn.on(cc.Node.EventType.TOUCH_END, () => {
            this.togglePanel(parent);
        });
    }

    private static togglePanel(parent:cc.Node){
        let oldPanel:cc.Node = parent.getChildByName(DEBUG_PANEL_NAME);
        if(oldPanel){
            oldPanel.destroy();
            return;
        }

        let panel:cc.Node = new cc.Node(DEBUG_PANEL_NAME);
        panel.width = 650;
        panel.height = 380;
        panel.setPosition(0, 270);
        parent.addChild(panel, 9999);

        let bg:cc.Graphics = panel.addComponent(cc.Graphics);
        bg.fillColor = cc.color(20, 20, 25, 235);
        bg.strokeColor = cc.color(150, 120, 230, 255);
        bg.lineWidth = 4;
        bg.roundRect(-325, -190, 650, 380, 10);
        bg.fill();
        bg.stroke();

        this.addTitle(panel);
        this.addDebugButton(panel, "第1关", -240, 95, () => this.jumpToStage(1));
        this.addDebugButton(panel, "第2关", -120, 95, () => this.jumpToStage(2));
        this.addDebugButton(panel, "第3关", 0, 95, () => this.jumpToStage(3));
        this.addDebugButton(panel, "第4关", 120, 95, () => this.jumpToStage(4));
        this.addDebugButton(panel, "第10关", 240, 95, () => this.jumpToStage(10));

        this.addDebugButton(panel, "失败", -240, 25, () => this.openResult("fail"));
        this.addDebugButton(panel, "胜利", -120, 25, () => this.openResult("stageWin"));
        this.addDebugButton(panel, "章节胜利", 20, 25, () => this.openResult("chapterWin"), 140);
        this.addDebugButton(panel, "重置次数", 180, 25, () => this.resetDaily(), 140);

        this.addDebugButton(panel, "新用户", -240, -45, () => this.setNewUser());
        this.addDebugButton(panel, "老用户", -120, -45, () => this.setOldUser());
        this.addDebugButton(panel, "清存档", 0, -45, () => this.clearSave());
        this.addDebugButton(panel, "复活次数", 140, -45, () => this.resetShareHelp(), 140);

        this.addDebugButton(panel, "关闭", 0, -125, () => panel.destroy(), 130, cc.color(90, 60, 120, 255));
    }

    private static addTitle(panel:cc.Node){
        let titleNode:cc.Node = new cc.Node("title");
        panel.addChild(titleNode);
        titleNode.setPosition(0, 155);
        let label:cc.Label = titleNode.addComponent(cc.Label);
        label.string = "本地调试面板";
        label.fontSize = 28;
        label.lineHeight = 34;
        label.node.color = cc.Color.WHITE;
    }

    private static addDebugButton(panel:cc.Node, text:string, x:number, y:number, callBack:Function, width:number = 105, color:cc.Color = cc.color(70, 52, 105, 255)){
        let btn:cc.Node = this.createButton(text, width, 48, color);
        btn.setPosition(x, y);
        panel.addChild(btn);
        btn.on(cc.Node.EventType.TOUCH_END, () => {
            callBack();
        });
    }

    private static createButton(text:string, width:number, height:number, color:cc.Color):cc.Node{
        let btn:cc.Node = new cc.Node(text);
        btn.width = width;
        btn.height = height;

        let bg:cc.Graphics = btn.addComponent(cc.Graphics);
        bg.fillColor = color;
        bg.strokeColor = cc.color(180, 145, 255, 255);
        bg.lineWidth = 3;
        bg.roundRect(-width / 2, -height / 2, width, height, 8);
        bg.fill();
        bg.stroke();

        let labelNode:cc.Node = new cc.Node("label");
        btn.addChild(labelNode);
        let label:cc.Label = labelNode.addComponent(cc.Label);
        label.string = text;
        label.fontSize = 22;
        label.lineHeight = 28;
        label.node.color = cc.Color.WHITE;
        return btn;
    }

    private static jumpToStage(stageScore:number){
        if(!CC_DEBUG)return;

        // 调试跳关：按总关卡数反推章节和小关，不改变正式的章节配置。
        let score:number = Math.max(1, stageScore);
        GameMain.curChapterIndex = Math.floor((score - 1) / 10);
        GameMain.curStageIndex = (score - 1) % 10;
        GameMain.gameFinished = false;
        GameMain.gameResultType = "stageWin";
        GameMain.extraPoint = 0;
        GameMain.extraMultiple = 0;
        GameMain.charmDatas = [];
        DiceGameSave.resetCurrentGame();

        UIManager.getInstance().closeUI(ResultPanel);
        UIManager.getInstance().closeUI(HomePanel);
        UIManager.getInstance().closeUI(LoadingPanel);
        UIManager.getInstance().closeUI(MainPanel);

        UIManager.getInstance().openUI(MainPanel, 0, (ui:MainPanel) => {
            ui.onShow();
            ui.scheduleOnce(() => {
                this.enterCurNode(ui);
            }, 0.25);
        });
    }

    private static enterCurNode(mainPanel:MainPanel){
        if(!CC_DEBUG)return;

        let chapterList = CreateChapter.getChapter(GameMain.curChapterIndex).chapter;
        if(GameMain.curStageIndex >= chapterList.length){
            GameMain.curStageIndex = chapterList.length - 1;
        }

        let nodeData:Chapter = chapterList[GameMain.curStageIndex][0];
        UIManager.getInstance().closeUI(ChapterPanel);

        if(nodeData.type === "battle" || nodeData.type === "elite" || nodeData.type === "boss"){
            mainPanel.openBattle(nodeData);
        }else if(nodeData.type === "shop"){
            mainPanel.openShop(nodeData);
        }else if(nodeData.type === "rest"){
            mainPanel.openRest(nodeData);
        }else if(nodeData.type === "treasure"){
            mainPanel.openTreasure(nodeData);
        }
    }

    private static openResult(resultType:string){
        if(!CC_DEBUG)return;

        GameMain.gameFinished = true;
        GameMain.gameResultType = resultType;
        UIManager.getInstance().closeUI(ChapterPanel);

        if(MainPanel.instance){
            MainPanel.instance.openResultPanel();
        }else{
            UIManager.getInstance().openUI(ResultPanel, 0, (ui:ResultPanel) => {
                ui.onShow();
            });
        }
    }

    private static resetDaily(){
        DiceGameSave.debugResetDailyData();
        this.refreshHomePanel();
        GameMain.instance.showTip("调试：今日次数已重置");
    }

    private static resetShareHelp(){
        DiceGameSave.debugResetShareHelp();
        this.refreshHomePanel();
        GameMain.instance.showTip("调试：分享复活已重置");
    }

    private static clearSave(){
        DiceGameSave.debugClearAllSave();
        this.refreshHomePanel();
        GameMain.instance.showTip("调试：本地存档已清除");
    }

    private static setNewUser(){
        DiceGameSave.debugSetNewUser();
        GameMain.instance.showTip("调试：已设为新用户");
    }

    private static setOldUser(){
        DiceGameSave.debugSetOldUser();
        GameMain.instance.showTip("调试：已设为老用户");
    }

    private static refreshHomePanel(){
        if(HomePanel.instance){
            // 调试按钮修改本地存档后，立即刷新主界面的次数和按钮文案。
            HomePanel.instance.refreshStartView();
        }
    }
}
