import * as vscode from "vscode";
import { listSnippets } from "./snippets";
import { logger } from "./lib/logger";
import { isAuthenticated, signIn, signOut } from "./auth";

export class SnippitSidebarProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "snippit.sidebarView";
  private _view?: vscode.WebviewView;

  constructor(private readonly _context: vscode.ExtensionContext) {}

  public resolveWebviewView(
    view: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    logger("SnippitSidebarProvider: resolveWebviewView called");

    this._view = view;
    view.webview.options = { enableScripts: true };

    view.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case "copy":
          await vscode.env.clipboard.writeText(message.code);
          vscode.window.showInformationMessage("Code copied to clipboard");
          break;
        case "openSnippet":
          const doc = await vscode.workspace.openTextDocument({
            content: message.code,
            language: message.language || "plaintext",
          });
          await vscode.window.showTextDocument(doc, vscode.ViewColumn.One);
          break;
        case "addSnippet":
          vscode.commands.executeCommand("snippit.createSnippet");
          break;
        case "signin":
          await signIn();
          this.refresh();
          break;

        case "signout":
          await signOut();
          this.refresh();
          break;
      }
    });

    this._view.webview.html = this.getSkeletonHtml();
    this.renderSnippets();
  }

  public refresh() {
    this.renderSnippets();
  }

  private async renderSnippets() {
    logger("SnippitSidebarProvider: rendering sidebar...");
    if (!this._view) return;

    const signedIn = await isAuthenticated();
    logger({ signedIn });
    const snippets = await listSnippets();
    const html = this.getHtml(snippets, signedIn);
    this._view.webview.html = html;
  }

  private getSkeletonHtml(): string {
    return `
      <html>
        <head>
          <style>
            body {
              font-family: sans-serif;
              padding: 0.5em;
              background-color: #1e1e1e;
              color: #d4d4d4;
            }
            .skeleton {
              background-color: #2e2e2e;
              padding: 1em;
              border-radius: 8px;
              margin-bottom: 1em;
              animation: pulse 1.5s infinite ease-in-out;
            }
            .skeleton-title,
            .skeleton-line {
              background: #3e3e3e;
              height: 12px;
              margin-bottom: 8px;
              border-radius: 4px;
            }
            .skeleton-title {
              width: 60%;
            }
            .skeleton-line {
              width: 90%;
            }
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.5; }
            }
          </style>
        </head>
        <body>
          <div class="skeleton"><div class="skeleton-title"></div><div class="skeleton-line"></div></div>
          <div class="skeleton"><div class="skeleton-title"></div><div class="skeleton-line"></div></div>
        </body>
      </html>
    `;
  }

  private getHtml(snippets: any[], isSignedIn: boolean): string {
    logger("SnippitSidebarProvider: generating HTML");

    const encodedSnippets = JSON.stringify(snippets);
    const authLabel = isSignedIn ? "Sign Out" : "Sign In";
    const authCommand = isSignedIn ? "signout" : "signin";

    return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          body {
            font-family: sans-serif;
            padding: 0.5em;
            background-color: #1e1e1e;
            color: #d4d4d4;
          }
          .toolbar {
            display: flex;
            gap: 8px;
            margin-bottom: 1em;
          }
          input[type="text"] {
            flex: 1;
            padding: 6px;
            border-radius: 4px;
            border: 1px solid #555;
            background: #2e2e2e;
            color: white;
          }
          .add-btn, .auth-btn {
            background-color: #16a249;
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
          }
          .add-btn:hover, .auth-btn:hover {
            background-color: #169c30;
          }
          .snippet {
            padding: 0.75em;
            margin-bottom: 1em;
            border: 1px solid #444;
            border-radius: 8px;
            background-color: #2e2e2e;
            position: relative;
          }
          .title {
            font-weight: bold;
            font-size: 1.1em;
            margin-bottom: 0.3em;
          }
          .author, .language {
            font-size: 0.85em;
            color: #888;
          }
          .description {
            margin: 0.5em 0;
          }
          .tags {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            margin: 0.3em 0;
          }
          .tag {
            background-color: #007acc;
            color: white;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 0.75em;
          }
          .code-preview {
            font-family: monospace;
            background: #1b1b1b;
            padding: 0.5em;
            margin-top: 0.5em;
            border-radius: 4px;
            white-space: pre;
            overflow-x: auto;
            max-height: 5em;
            cursor: help;
          }
          .buttons {
            margin-top: 0.5em;
          }
          button {
            border: none;
            padding: 0.4em 0.8em;
            border-radius: 5px;
            font-size: 0.85em;
            cursor: pointer;
            margin-right: 0.5em;
            transition: background 0.3s;
          }
          .copy-btn {
            background-color: #007acc;
            color: white;
          }
          .copy-btn:hover {
            background-color: #005fa3;
          }
          .view-btn {
            background-color: #4caf50;
            color: white;
          }
          .view-btn:hover {
            background-color: #3d8b40;
          }
        </style>
      </head>
      <body>
        <div class="toolbar">
          <input type="text" id="search" placeholder="Search snippets..." />
          <button class="add-btn" id="addSnippet">+ Add</button>
          <button class="auth-btn" id="authBtn">${authLabel}</button>
        </div>

        <div id="snippet-list"></div>

        <script>
          const vscode = acquireVsCodeApi();
          const snippets = ${encodedSnippets};

          const container = document.getElementById("snippet-list");
          const searchInput = document.getElementById("search");
          const authBtn = document.getElementById("authBtn");

          authBtn.addEventListener("click", () => {
            vscode.postMessage({ command: "${authCommand}" });
          });

          document.getElementById("addSnippet").addEventListener("click", () => {
            vscode.postMessage({ command: "addSnippet" });
          });

          function render(filtered) {
            container.innerHTML = filtered.map((snippet, index) => {
              const codePreview = snippet.code
                .split("\\n").slice(0, 5).join("\\n")
                .replace(/</g, "&lt;").replace(/>/g, "&gt;");

              const fullCode = snippet.code.replace(/</g, "&lt;").replace(/>/g, "&gt;");
              const tags = typeof snippet.tags === "string"
                ? snippet.tags.split(",").map(t => t.trim()).filter(Boolean)
                : [];

              return \`
                <div class="snippet" title="\${fullCode}">
                  <div class="title">\${snippet.title}</div>
                  <div class="author">by \${snippet.author?.username || "Unknown"}</div>
                  <div class="language">Language: \${snippet.language || "plaintext"}</div>
                  <div class="tags">
                    \${tags.map(tag => \`<span class="tag">\${tag}</span>\`).join("")}
                  </div>
                  <div class="description">\${snippet.description || ""}</div>
                  <div class="code-preview">\${codePreview}</div>
                  <div class="buttons">
                    <button class="copy-btn" data-command="copy" data-index="\${index}">Copy</button>
                    <button class="view-btn" data-command="view" data-index="\${index}">View</button>
                  </div>
                </div>
              \`;
            }).join("");

            container.querySelectorAll("button").forEach(btn => {
              const command = btn.getAttribute("data-command");
              const index = btn.getAttribute("data-index");
              if (command && index !== null) {
                btn.addEventListener("click", () => {
                  const snippet = filtered[index];
                  if (command === "copy") {
                    vscode.postMessage({ command: "copy", code: snippet.code });
                  } else if (command === "view") {
                    vscode.postMessage({
                      command: "openSnippet",
                      code: snippet.code,
                      language: snippet.language || "plaintext"
                    });
                  }
                });
              }
            });
          }

          searchInput.addEventListener("input", () => {
            const query = searchInput.value.toLowerCase();
            const filtered = snippets.filter(s => {
              return (
                s.title?.toLowerCase().includes(query) ||
                s.language?.toLowerCase().includes(query) ||
                s.description?.toLowerCase().includes(query) ||
                (typeof s.tags === "string" && s.tags.toLowerCase().includes(query))
              );
            });
            render(filtered);
          });

          render(snippets);
        </script>
      </body>
    </html>
  `;
  }
}
