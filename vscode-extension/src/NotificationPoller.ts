import * as vscode from "vscode";
import { MicroHubsApi } from "./api";

export class NotificationPoller {
  private statusBarItem: vscode.StatusBarItem;
  private interval: ReturnType<typeof setInterval> | null = null;
  private unreadCount = 0;

  constructor(private api: MicroHubsApi) {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
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

  private async poll() {
    if (!this.api.getToken()) {
      this.unreadCount = 0;
      this.updateBadge();
      return;
    }

    try {
      const notifs = await this.api.getNotifications();
      this.unreadCount = notifs.filter((n) => !n.read).length;
      this.updateBadge();
    } catch {
      // silently fail
    }
  }

  private updateBadge() {
    if (this.unreadCount > 0) {
      this.statusBarItem.text = `$(bell) ${this.unreadCount}`;
      this.statusBarItem.show();
    } else {
      this.statusBarItem.text = `$(bell)`;
      this.statusBarItem.show();
    }
  }
}
