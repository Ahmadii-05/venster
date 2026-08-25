import * as vscode from "vscode";
import * as path from "path";

/**
 * The code context the Venster React UI needs when creating a capsule.
 * Only what React actually needs is exposed — nothing more.
 */
export interface EditorContext {
  /** Workspace-relative file path (e.g. src/main/java/.../UserService.java) */
  filePath: string | null;
  startLine: number | null; // 1-indexed
  endLine: number | null; // 1-indexed, inclusive
  selectedCode: string | null;
  language: string | null;
  /** Workspace/repo folder name, usable as a repository hint */
  workspaceName: string | null;
}

const EMPTY: EditorContext = {
  filePath: null,
  startLine: null,
  endLine: null,
  selectedCode: null,
  language: null,
  workspaceName: null,
};

export function getCurrentEditorContext(): EditorContext {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return EMPTY;
  }

  const uri = editor.document.uri;
  // Skip untitled / non-file documents — there is no meaningful path.
  if (uri.scheme !== "file") {
    return { ...EMPTY, selectedCode: null };
  }

  const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
  let filePath: string;
  if (workspaceFolder) {
    filePath = path
      .relative(workspaceFolder.uri.fsPath, uri.fsPath)
      .split(path.sep)
      .join("/");
  } else {
    filePath = path.basename(uri.fsPath);
  }

  const selection = editor.selection;
  const hasSelection = !selection.isEmpty;

  return {
    filePath,
    startLine: selection.start.line + 1,
    endLine: selection.end.line + 1,
    selectedCode: hasSelection ? editor.document.getText(selection) : null,
    language: editor.document.languageId,
    workspaceName: workspaceFolder?.name ?? null,
  };
}
