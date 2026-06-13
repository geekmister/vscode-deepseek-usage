export class RefreshScheduler {
    private timer: NodeJS.Timeout | null = null;
    private refreshCallback: () => Promise<void>;
    private _intervalMinutes: number;

    get intervalMinutes(): number {
        return this._intervalMinutes;
    }

    constructor(callback: () => Promise<void>, intervalMinutes: number) {
        this.refreshCallback = callback;
        this._intervalMinutes = intervalMinutes;
    }

    start(): void {
        if (this.timer) {
            clearInterval(this.timer);
        }
        this.timer = setInterval(() => {
            this.refreshCallback().catch(console.error);
        }, this._intervalMinutes * 60 * 1000);
    }

    stop(): void {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    updateInterval(minutes: number): void {
        this._intervalMinutes = minutes;
        this.start();
    }

    // 遇到限流时临时延长刷新间隔（自适应退避）
    handleRateLimit(): void {
        const extended = Math.min(this._intervalMinutes * 2, 120);
        this._intervalMinutes = extended;
        this.start();
    }
}
