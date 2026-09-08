import GameMain from "../GameMain";
import { BaseUI, UIClass } from "./BaseUI";

export class UIManager
{
    private static instance: UIManager;
    private uiList: BaseUI[] = [];
    private uiRoot: cc.Node = null!;

    public static getInstance(): UIManager
    {
        if(this.instance == null)
        {
            this.instance = new UIManager();
        }
        return this.instance;
    }

    constructor()
    {
        this.uiRoot = cc.find("Canvas");
    }

    public openUI<T extends BaseUI>(uiClass: UIClass<T>, zOrder?: number, callback?: Function, onProgress?: Function, ...args: any[])
    {
        let oldUI:BaseUI = this.getUI(uiClass);
        if(oldUI)
        {
            // 已经打开的面板也要执行回调，避免 TipPanel、RankPanel 等重复打开时内容不刷新。
            if(callback)
            {
                callback(oldUI, args);
            }
            return;
        }

        GameMain.instance.bundle.load(uiClass.getUrl(),(completedCount: number, totalCount: number, item: any)=>{
            if(onProgress)
            {
                onProgress(completedCount, totalCount, item);
            }
        }, (error, prefab:cc.Prefab)=>
        {
            if(error)
            {
                cc.log(error);
                return;
            }
            let loadedOldUI:BaseUI = this.getUI(uiClass);
            if(loadedOldUI)
            {
                // 异步加载期间如果同类面板已被打开，直接回调已有面板，不再实例化第二个。
                if(callback)
                {
                    callback(loadedOldUI, args);
                }
                return;
            }
            let uiNode: cc.Node = cc.instantiate(prefab);
            uiNode.parent = this.uiRoot;
            //zOrder && uiNode.setLocalZOrder(zOrder);
            if (zOrder) { uiNode.zIndex = zOrder; }
            let ui = uiNode.getComponent(uiClass) as BaseUI;
            ui.tag = uiClass;
            this.uiList.push(ui);
            if(callback)
            {
                callback(ui, args);
            }
        });
    }

    public closeUI<T extends BaseUI>(uiClass: UIClass<T>)
    {
        for(let i = 0; i < this.uiList.length; ++i)
        {
            if(this.uiList[i].tag === uiClass)
            {
                this.uiList[i].node.destroy();
                this.uiList.splice(i, 1);
                return;
            }
        }
    }
    public closeALLUI()
    {
        // 倒序关闭，避免边遍历边删除导致跳过某个面板。
        for(let i = this.uiList.length - 1; i >= 0; --i)
        {
            this.uiList[i].node.destroy();
            this.uiList.splice(i, 1);
        }
    }

    public showUI<T extends BaseUI>(uiClass: UIClass<T>, callback?: Function)
    {
        let ui = this.getUI(uiClass);
        if(ui)
        {
            ui.node.active = true;
            ui.onShow();
            callback&&callback(ui);
        }
        else
        {
            this.openUI(uiClass, 0, ()=>{
                let ui = this.getUI(uiClass);
                ui.onShow();
                callback&&callback(ui);
            });
        }
    }

    public hideUI<T extends BaseUI>(uiClass: UIClass<T>)
    {
        let ui = this.getUI(uiClass);
        if(ui)
        {
            ui.node.active = false;
        }
    }

    public getUI<T extends BaseUI>(uiClass: UIClass<T>): BaseUI
    {
        for(let i = 0; i < this.uiList.length; ++i)
        {
            if(this.uiList[i].tag === uiClass)
            {
                return this.uiList[i];
            }
        }
        return null!;
    }
}
