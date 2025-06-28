import * as vscode from "vscode";
import { updateSnippet } from "./snippets";
import { ensureAuthenticated } from "./auth";
import { logger } from "./lib/logger";
import { LANGUAGES } from "./mockdata/languages";

export class EditSnippetFormPanel {
  public static currentPanel: EditSnippetFormPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private readonly _extensionContext: vscode.ExtensionContext;
  private _disposables: vscode.Disposable[] = [];
  private onSubmitSuccess?: () => void;

  public static createOrShow(
    snippet: any,
    extensionContext: vscode.ExtensionContext,
    onSubmitSuccess?: () => void
  ) {
    const column = vscode.window.activeTextEditor
      ? vscode.ViewColumn.Beside
      : undefined;

    if (EditSnippetFormPanel.currentPanel) {
      EditSnippetFormPanel.currentPanel._panel.reveal(column);
      EditSnippetFormPanel.currentPanel._updateSnippet = snippet; // refresh snippet object
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      "editSnippet",
      `Edit: ${snippet.title}`,
      column || vscode.ViewColumn.One,
      { enableScripts: true, retainContextWhenHidden: true }
    );

    EditSnippetFormPanel.currentPanel = new EditSnippetFormPanel(
      panel,
      extensionContext,
      snippet,
      onSubmitSuccess
    );
  }

  private _updateSnippet: any;

  private constructor(
    panel: vscode.WebviewPanel,
    extensionContext: vscode.ExtensionContext,
    snippet: any,
    onSubmitSuccess?: () => void
  ) {
    this._panel = panel;
    this._updateSnippet = snippet;
    this._extensionUri = extensionContext.extensionUri;
    this._extensionContext = extensionContext;
    this.onSubmitSuccess = onSubmitSuccess;

    this._panel.webview.html = this.getHtmlForWebview(snippet);

    this._panel.webview.onDidReceiveMessage(
      this.handleMessage.bind(this),
      undefined,
      this._disposables
    );
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
  }

  private async handleMessage(message: any) {
    if (message.command !== "submit") return;
    if (!(await ensureAuthenticated(this._extensionContext))) {
      return vscode.window.showErrorMessage("Authentication required.");
    }

    const data = { ...message.data, id: this._updateSnippet._id };

    try {
      await updateSnippet(this._updateSnippet._id, data);
      vscode.window.showInformationMessage(`Snippet "${data.title}" updated!`);
      vscode.commands.executeCommand("snippit.refreshSidebar");
      this.onSubmitSuccess?.();
      this.dispose();
    } catch (err: any) {
      vscode.window.showErrorMessage(
        `Failed to update snippet: ${err.message}`
      );
    }
  }

  public dispose() {
    EditSnippetFormPanel.currentPanel = undefined;
    this._panel.dispose();
    this._disposables.forEach((d) => d.dispose());
    this._disposables = [];
  }

  private getHtmlForWebview(snippet: any): string {
    const tags = typeof snippet.tags === "string" ? snippet.tags : "";
    const isPublic = snippet.isPublic ? "true" : "false";

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <style>
          body { font-family:sans-serif; background:#1e1e1e; color:white; padding:2em; max-width:800px; margin:auto; }
          *,*::before,*::after{ box-sizing:border-box; }
          h2 { margin-bottom:1em; }
          form { display:flex; flex-direction:column; gap:1.2em; }
          .grid { display:grid; grid-template-columns:1fr 1fr; gap:2em; }
          .grid>div{width:100%;}
          label{ font-weight:bold; margin-bottom:0.3em; display:block; }
          input,textarea,select{ width:100%; padding:0.6em; background:#2e2e2e; color:white; border:1px solid #555; border-radius:4px; }
          textarea{ resize:vertical; }
          .code-label{ display:flex; align-items:center; justify-content:space-between; }
          .paste-btn{ margin-left:1em; font-size:0.9em; padding:0.3em 0.8em; background:#444; color:white; border:none; border-radius:4px; cursor:pointer; }
          .paste-btn:hover{ background:#666; }
          button[type="submit"]{ align-self:flex-end; background:#16a249; color:white; padding:0.6em 1.2em; border:none; border-radius:4px; cursor:pointer; }
          button[type="submit"]:hover{ background:#169c30; }
        </style>
      </head>
      <body>
        <h2>Edit Snippet</h2>
        <form id="editForm">
          <div class="grid">
            <div><label>Title</label><input name="title" type="text" value="${
              snippet.title
            }" required></div>
            <div><label>Language</label><select name="language">
            ${LANGUAGES.map(
              (language) =>
                `<option ${
                  snippet.language === language ? "selected" : ""
                } value="${language}">${language}</option>`
            ).join("")}              
            </select></div>
          </div>
          <div><label>Description</label><textarea name="description" rows="3">${
            snippet.description || ""
          }</textarea></div>
          <div>
            <div class="code-label">
              <label for="code">Code</label>
              <button type="button" class="paste-btn" id="paste">📋 Paste</button>
            </div>
            <textarea name="code" id="code" rows="10">${snippet.code.replace(
              /</g,
              "&lt;"
            )}</textarea>
          </div>
          <div><label>Tags (comma-separated)</label><input name="tags" type="text" value="${tags}"></div>
          <div><label>Visibility</label><select name="isPublic">
            <option ${
              isPublic === "true" ? "selected" : ""
            } value="true">Public</option>
            <option ${
              isPublic === "false" ? "selected" : ""
            } value="false">Private</option>
          </select></div>
          <button type="submit">Update Snippet</button>
        </form>
        <script>
          const vscode = acquireVsCodeApi();
          document.getElementById("paste").addEventListener("click", async () => {
            const text = await navigator.clipboard.readText();
            document.getElementById("code").value = text;
          });
          document.getElementById("editForm").addEventListener("submit", e => {
            e.preventDefault();
            const fd = new FormData(e.target);
            const data = {
              title: fd.get("title"),
              description: fd.get("description"),
              code: fd.get("code"),
              language: fd.get("language"),
              tags: fd.get("tags"),
              isPublic: fd.get("isPublic")==="true"
            };
            vscode.postMessage({ command:"submit", data });
          });
        </script>
      </body>
      </html>
    `;
  }
}
