"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationPoller = void 0;
const vscode = __importStar(require("vscode"));
class NotificationPoller {
    api;
    statusBarItem;
    interval = null;
    unreadCount = 0;
    constructor(api) {
        this.api = api;
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        this.statusBarItem.command = "microhubs.viewCapsules";
        this.statusBarItem.tooltip = "Micro-Hubs: unread notifications";
        this.updateBadge();
    }
    start(intervalMs = 30000) {
        this.stop();
        this.poll(); // immediate first poll
        this.interval = setInterval(() => this.poll(), intervalMs);
    }
    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }
    dispose() {
        this.stop();
        this.statusBarItem.dispose();
    }
    async poll() {
        if (!this.api.getToken()) {
            this.unreadCount = 0;
            this.updateBadge();
            return;
        }
        try {
            const notifs = await this.api.getNotifications();
            this.unreadCount = notifs.filter((n) => !n.read).length;
            this.updateBadge();
        }
        catch {
            // silently fail
        }
    }
    updateBadge() {
        if (this.unreadCount > 0) {
            this.statusBarItem.text = `$(bell) ${this.unreadCount}`;
            this.statusBarItem.show();
        }
        else {
            this.statusBarItem.text = `$(bell)`;
            this.statusBarItem.show();
        }
    }
}
exports.NotificationPoller = NotificationPoller;
//# sourceMappingURL=NotificationPoller.js.map