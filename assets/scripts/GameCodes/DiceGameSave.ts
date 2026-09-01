export default class DiceGameSave {
    static currentMaxDamage: number = 0;
    static currentKillCount: number = 0;

    static readonly MAX_DAILY_CHALLENGE_COUNT:number = 5;
    static readonly MAX_DAILY_SHARE_HELP_COUNT:number = 1;
    private static readonly BEST_DAMAGE_KEY = "dice_best_damage";
    private static readonly BEST_STAGE_KEY = "dice_best_stage";
    private static readonly TOTAL_KILL_KEY = "dice_total_kill";
    private static readonly DAILY_DATE_KEY = "dice_daily_date";
    private static readonly DAILY_USED_KEY = "dice_daily_used";
    private static readonly TODAY_BEST_STAGE_KEY = "dice_today_best_stage";
    private static readonly REGION_NAME_KEY = "dice_region_name";
    private static readonly NEW_USER_AUTO_PLAY_KEY = "dice_new_user_auto_play";
    private static readonly DAILY_SHARE_HELP_USED_KEY = "dice_daily_share_help_used";

    static resetCurrentGame() {
        this.currentMaxDamage = 0;
        this.currentKillCount = 0;
    }

    static recordDamage(damage: number) {
        if (damage > this.currentMaxDamage) {
            this.currentMaxDamage = damage;
        }

        if (damage > this.getBestDamage()) {
            cc.sys.localStorage.setItem(this.BEST_DAMAGE_KEY, String(damage));
        }
    }

    static recordKill() {
        this.currentKillCount++;
        let totalKill = this.getTotalKill() + 1;
        cc.sys.localStorage.setItem(this.TOTAL_KILL_KEY, String(totalKill));
    }

    static recordStage(stage: number) {
        if (stage > this.getBestStage()) {
            cc.sys.localStorage.setItem(this.BEST_STAGE_KEY, String(stage));
        }

        if (stage > this.getTodayBestStage()) {
            cc.sys.localStorage.setItem(this.TODAY_BEST_STAGE_KEY, String(stage));
        }
    }

    static getBestDamage(): number {
        return Number(cc.sys.localStorage.getItem(this.BEST_DAMAGE_KEY)) || 0;
    }

    static getBestStage(): number {
        return Number(cc.sys.localStorage.getItem(this.BEST_STAGE_KEY)) || 0;
    }

    static getTotalKill(): number {
        return Number(cc.sys.localStorage.getItem(this.TOTAL_KILL_KEY)) || 0;
    }

    static consumeDailyChallengeChance():boolean{
        this.checkDailyData();
        let usedCount:number = Number(cc.sys.localStorage.getItem(this.DAILY_USED_KEY)) || 0;
        if(usedCount >= this.MAX_DAILY_CHALLENGE_COUNT){
            return false;
        }

        cc.sys.localStorage.setItem(this.DAILY_USED_KEY, String(usedCount + 1));
        return true;
    }

    static consumeDailyShareHelpChance():boolean{
        this.checkDailyData();
        let usedCount:number = Number(cc.sys.localStorage.getItem(this.DAILY_SHARE_HELP_USED_KEY)) || 0;
        if(usedCount >= this.MAX_DAILY_SHARE_HELP_COUNT){
            return false;
        }

        cc.sys.localStorage.setItem(this.DAILY_SHARE_HELP_USED_KEY, String(usedCount + 1));
        return true;
    }

    static getRemainDailyShareHelpCount():number{
        this.checkDailyData();
        let usedCount:number = Number(cc.sys.localStorage.getItem(this.DAILY_SHARE_HELP_USED_KEY)) || 0;
        return Math.max(this.MAX_DAILY_SHARE_HELP_COUNT - usedCount, 0);
    }

    static canNewUserAutoPlay():boolean{
        return cc.sys.localStorage.getItem(this.NEW_USER_AUTO_PLAY_KEY) !== "1";
    }

    static markNewUserAutoPlayed(){
        cc.sys.localStorage.setItem(this.NEW_USER_AUTO_PLAY_KEY, "1");
    }

    static getRemainDailyChallengeCount():number{
        this.checkDailyData();
        let usedCount:number = Number(cc.sys.localStorage.getItem(this.DAILY_USED_KEY)) || 0;
        return Math.max(this.MAX_DAILY_CHALLENGE_COUNT - usedCount, 0);
    }

    static getTodayBestStage():number{
        this.checkDailyData();
        return Number(cc.sys.localStorage.getItem(this.TODAY_BEST_STAGE_KEY)) || 0;
    }

    static getRegionName():string{
        let regionName:string = cc.sys.localStorage.getItem(this.REGION_NAME_KEY);
        if(!regionName || regionName.length <= 0){
            regionName = "未知地区";
            cc.sys.localStorage.setItem(this.REGION_NAME_KEY, regionName);
        }

        return regionName;
    }

    static setRegionName(regionName:string){
        if(!regionName || regionName.length <= 0)return;
        cc.sys.localStorage.setItem(this.REGION_NAME_KEY, regionName);
    }

    static debugClearAllSave(){
        if(!CC_DEBUG)return;

        // 调试用：清掉本游戏本地存档，方便重新测试新用户和每日次数流程。
        cc.sys.localStorage.removeItem(this.BEST_DAMAGE_KEY);
        cc.sys.localStorage.removeItem(this.BEST_STAGE_KEY);
        cc.sys.localStorage.removeItem(this.TOTAL_KILL_KEY);
        cc.sys.localStorage.removeItem(this.DAILY_DATE_KEY);
        cc.sys.localStorage.removeItem(this.DAILY_USED_KEY);
        cc.sys.localStorage.removeItem(this.TODAY_BEST_STAGE_KEY);
        cc.sys.localStorage.removeItem(this.REGION_NAME_KEY);
        cc.sys.localStorage.removeItem(this.NEW_USER_AUTO_PLAY_KEY);
        cc.sys.localStorage.removeItem(this.DAILY_SHARE_HELP_USED_KEY);
        this.resetCurrentGame();
    }

    static debugResetDailyData(){
        if(!CC_DEBUG)return;

        // 调试用：重置今日挑战次数、今日最好成绩和分享复活次数。
        cc.sys.localStorage.setItem(this.DAILY_DATE_KEY, this.getTodayKey());
        cc.sys.localStorage.setItem(this.DAILY_USED_KEY, "0");
        cc.sys.localStorage.setItem(this.TODAY_BEST_STAGE_KEY, "0");
        cc.sys.localStorage.setItem(this.DAILY_SHARE_HELP_USED_KEY, "0");
    }

    static debugSetNewUser(){
        if(!CC_DEBUG)return;
        cc.sys.localStorage.removeItem(this.NEW_USER_AUTO_PLAY_KEY);
    }

    static debugSetOldUser(){
        if(!CC_DEBUG)return;
        cc.sys.localStorage.setItem(this.NEW_USER_AUTO_PLAY_KEY, "1");
    }

    static debugResetShareHelp(){
        if(!CC_DEBUG)return;
        this.checkDailyData();
        cc.sys.localStorage.setItem(this.DAILY_SHARE_HELP_USED_KEY, "0");
    }

    private static checkDailyData(){
        let today:string = this.getTodayKey();
        let saveDate:string = cc.sys.localStorage.getItem(this.DAILY_DATE_KEY);
        if(saveDate === today)return;

        // 每天重置挑战次数和今日最好成绩
        cc.sys.localStorage.setItem(this.DAILY_DATE_KEY, today);
        cc.sys.localStorage.setItem(this.DAILY_USED_KEY, "0");
        cc.sys.localStorage.setItem(this.TODAY_BEST_STAGE_KEY, "0");
        cc.sys.localStorage.setItem(this.DAILY_SHARE_HELP_USED_KEY, "0");
    }

    private static getTodayKey():string{
        let d:Date = new Date();
        let month:string = String(d.getMonth() + 1);
        let day:string = String(d.getDate());
        if(month.length < 2)month = "0" + month;
        if(day.length < 2)day = "0" + day;
        return `${d.getFullYear()}-${month}-${day}`;
    }
}
