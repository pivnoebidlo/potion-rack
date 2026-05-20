export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3
}

class Logger {
    private level: LogLevel = LogLevel.INFO;

    setLevel(level: LogLevel): void {
        this.level = level;
    }

    debug(...args: any[]): void {
        if (this.level <= LogLevel.DEBUG) {
            const message = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
            console.log('[DEBUG]', ...args);
            this.sendToMain('debug', message);
        }
    }

    info(...args: any[]): void {
        if (this.level <= LogLevel.INFO) {
            const message = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
            console.log('[INFO]', ...args);
            this.sendToMain('info', message);
        }
    }

    warn(...args: any[]): void {
        if (this.level <= LogLevel.WARN) {
            const message = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
            console.warn('[WARN]', ...args);
            this.sendToMain('warn', message);
        }
    }

    error(...args: any[]): void {
        if (this.level <= LogLevel.ERROR) {
            const message = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
            console.error('[ERROR]', ...args);
            this.sendToMain('error', message);
        }
    }

    private sendToMain(level: string, message: string): void {
        try {
            if (window.electronAPI?.log) {
                window.electronAPI.log(level, message);
            }
        } catch (err) {
            // Silent fail
        }
    }
}

export const logger = new Logger();