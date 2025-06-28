import * as vscode from "vscode";
import { createSnippet } from "./snippets";
import { ensureAuthenticated } from "./auth";
import { logger } from "./lib/logger";
import { LANGUAGES } from "./mockdata/languages";

export class CreateSnippetFormPanel {
  public static currentPanel: CreateSnippetFormPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];

  public static createOrShow(extensionContext: vscode.ExtensionContext) {
    const column = vscode.window.activeTextEditor
      ? vscode.ViewColumn.Beside
      : undefined;

    if (CreateSnippetFormPanel.currentPanel) {
      CreateSnippetFormPanel.currentPanel._panel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      "createSnippet",
      "Create Snippet",
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    CreateSnippetFormPanel.currentPanel = new CreateSnippetFormPanel(
      panel,
      extensionContext.extensionUri,
      extensionContext
    );
  }

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    private extensionContext: vscode.ExtensionContext
  ) {
    this._panel = panel;
    this._extensionUri = extensionUri;

    this._panel.webview.html = this.getHtmlForWebview();

    this._panel.webview.onDidReceiveMessage(
      this.handleMessage.bind(this),
      undefined,
      this._disposables
    );

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
  }

  private async handleMessage(message: any) {
    switch (message.command) {
      case "submit":
        if (!(await ensureAuthenticated(this.extensionContext))) {
          vscode.window.showErrorMessage("Authentication required.");
          return;
        }

        try {
          await createSnippet(message.data);

          vscode.window.showInformationMessage(
            `Snippet "${message.data.title}" created!`
          );
          vscode.commands.executeCommand("snippit.refreshSidebar");
          this.dispose();
        } catch (err: any) {
          vscode.window.showErrorMessage(
            "Failed to create snippet: " + err.message
          );
        }
        break;
    }
  }

  public dispose() {
    CreateSnippetFormPanel.currentPanel = undefined;
    this._panel.dispose();

    this._disposables.forEach((d) => d.dispose());
    this._disposables = [];
  }

  private getHtmlForWebview(): string {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Create Snippet</title>
      <style>
        body {
          font-family: sans-serif;
          padding: 2em;
          background: #1e1e1e;
          color: white;
          max-width: 800px;
          margin: auto;
        }
        *, *::before, *::after {
          box-sizing: border-box;
        }
        h2 {
          margin-bottom: 1em;
        }
        form {
          display: flex;
          flex-direction: column;
          gap: 1.2em;
        }
        .grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2em;
        }
        .grid > div {
          width: 100%;
        }
        label {
          font-weight: bold;
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.3em;
        }
        input, textarea, select {
          width: 100%;
          padding: 0.6em;
          background: #2e2e2e;
          color: white;
          border: 1px solid #555;
          border-radius: 4px;
        }
        textarea {
          resize: vertical;
        }
        .code-label {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .paste-btn {
          margin-left: 1em;
          font-size: 0.9em;
          padding: 0.3em 0.8em;
          background-color: #444;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        .paste-btn:hover {
          background-color: #666;
        }
        button[type="submit"] {
          align-self: flex-end;
          background-color: #16a249;
          color: white;
          padding: 0.6em 1.2em;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        button[type="submit"]:hover {
          background-color: #169c30;
        }
        @media (max-width: 600px) {
          .grid {
            grid-template-columns: 1fr;
            gap: 1em;
          }
        }
      </style>
    </head>
    <body>
      <h2>Create New Snippet</h2>
      <form id="snippetForm">
        <div class="grid">
          <div>
            <label>Title</label>
            <input type="text" name="title" required />
          </div>
          <div>
            <label>Language</label>
            <select name="language">
            ${LANGUAGES.map(
              (language) => `<option value="${language}">${language}</option>`
            ).join("")}
            </select>
          </div>
        </div>

        <div>
          <label>Description</label>
          <textarea name="description" rows="3"></textarea>
        </div>

        <div>
          <div class="code-label">
            <label for="codeField">Code</label>
            <button type="button" class="paste-btn" id="pasteBtn">📋 Paste from clipboard</button>
          </div>
          <textarea name="code" rows="10" id="codeField"></textarea>
        </div>

        <div>
          <label>Tags (comma-separated)</label>
          <input type="text" name="tags" />
        </div>

        <div>
          <label>Visibility</label>
          <select name="isPublic">
            <option value="true">Public</option>
            <option value="false">Private</option>
          </select>
        </div>

        <button type="submit">Submit Snippet</button>
      </form>

      <script>
        const vscode = acquireVsCodeApi();
        const form = document.getElementById("snippetForm");
        const pasteBtn = document.getElementById("pasteBtn");
        const codeField = document.getElementById("codeField");

        form.addEventListener("submit", (e) => {
          e.preventDefault();
          const formData = new FormData(form);
          const data = {
            title: formData.get("title"),
            description: formData.get("description"),
            code: formData.get("code"),
            language: formData.get("language"),
            isPublic: formData.get("isPublic") === "true",
            tags: formData.get("tags")
          };

          vscode.postMessage({ command: "submit", data });
        });

        pasteBtn.addEventListener("click", async () => {
          const text = await navigator.clipboard.readText();
          codeField.value = text;
        });
      </script>
    </body>
    </html>
  `;
  }
}
