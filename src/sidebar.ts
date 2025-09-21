import * as vscode from "vscode";
import {
  listMySnippets,
  listSnippets,
  PaginatedSnippets,
  snippetsLimit,
} from "./snippets";
import { logger } from "./lib/logger";
import { isAuthenticated, signIn, signOut } from "./auth";
import { SnippetDetailsPanel } from "./snippetDetailsPanel";

export class SnippitSidebarProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "snippit.sidebarView";
  private _view?: vscode.WebviewView;
  private _page = 1;
  private _hasMore = true;
  private _snippets: any[] = [];
  private _mode: "all" | "mine" = "all";

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
        case "toggleMode":
          this._mode = message.mode;
          this.refresh();
          break;
        case "copy":
          await vscode.env.clipboard.writeText(message.code);
          vscode.window.showInformationMessage("Code copied to clipboard");
          break;

        case "openSnippet":
          SnippetDetailsPanel.show(message.snippet, this._context);
          break;

        case "addSnippet":
          const signedIn = await isAuthenticated();
          if (signedIn) {
            vscode.commands.executeCommand("snippit.createSnippet");
          } else {
            await signIn();
            this.refresh();
          }
          break;

        case "refreshSnippets":
          this.refresh();
          break;

        case "signin":
          await signIn();
          this.refresh();
          break;

        case "signout":
          await signOut();
          this.refresh();
          break;

        case "loadMore":
          await this.loadMoreSnippets();
          break;
      }
    });

    this._view.webview.html = this.getSkeletonHtml();
    this.renderSnippets(true);
  }

  public refresh() {
    this._page = 1;
    this._hasMore = true;
    this._snippets = [];
    this.renderSnippets(true);
  }

  private async renderSnippets(isInitial = false) {
    logger("SnippitSidebarProvider: rendering sidebar...");
    if (!this._view) return;

    const signedIn = await isAuthenticated();
    let response;
    if (this._mode === "mine") {
      response = await listMySnippets(this._page);
    } else {
      response = await listSnippets(this._page);
    }

    this._snippets = (response as PaginatedSnippets).snippets;
    this._hasMore = (response as PaginatedSnippets).hasNextPage;

    const encodedSnippets = JSON.stringify(this._snippets);
    const html = this.getHtml(
      encodedSnippets,
      signedIn,
      this._hasMore,
      this._page,
      this._mode
    );
    this._view.webview.html = html;
  }

  private async loadMoreSnippets() {
    if (!this._hasMore || !this._view) return;
    logger({ page: this._page });
    this._page += 1;
    const response = await listSnippets(this._page);

    this._snippets = [
      ...this._snippets,
      ...(response as PaginatedSnippets).snippets,
    ];
    this._hasMore = (response as PaginatedSnippets).hasNextPage;

    this._view.webview.postMessage({
      command: "appendSnippets",
      snippets: (response as PaginatedSnippets).snippets,
      hasMore: this._hasMore,
      page: this._page,
      limit: snippetsLimit,
    });
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

  private getHtml(
    encodedSnippets: string,
    isSignedIn: boolean,
    hasMore: boolean,
    currentPage: number,
    mode: "all" | "mine"
  ): string {
    const authLabel = isSignedIn ? "Sign Out" : "Sign In";
    const authCommand = isSignedIn ? "signout" : "signin";

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css" integrity="sha512-Evv84Mr4kqVGRNSgIGL/F/aIDqQb7xQ2vcrdIwxfjThSH8CSR7PBEakCr51Ck+w+/U6swU2Im1vVX0SVk9ABhg==" crossorigin="anonymous" referrerpolicy="no-referrer" />
      <style>
        body {
          font-family: sans-serif;
          padding: 0.5em;
          background-color: #1e1e1e;
          color: #d4d4d4;
        }
        .sidebar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1em;
          border-bottom: 1px solid #555;
          border-bottom-left-radius: 4px;
          border-bottom-right-radius: 4px;
        }
        .sidebar-header button {
          flex-grow: 1;
          padding: 1em 0.5em;
          margin: 0;
          border-radius: 4px;
          border: none;
          cursor: pointer;
          background: #00000000;
          color: white;
        }
        .sidebar-header button:hover {
          background: #00000040;
        }
        .sidebar-header button.active {
          border: 1px solid #555;
          border-bottom: none;
        }
        .toolbar {
          display: flex;
          gap: 8px;
          margin-bottom: 1em;
          flex-wrap: wrap;
        }
        .space-btw {
          justify-content: space-between;
        }
        .snips-actions {
          display: flex;
          gap: 8px;
        }
        input[type="text"] {
          flex: 1;
          padding: 6px;
          border-radius: 4px;
          border: 1px solid #555;
          background: #2e2e2e;
          color: white;
        }
        .auth-btn {
          background-color: #16a249;
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
        }
        .auth-btn:hover {
          background-color: #169c30;
        }
        .add-btn {
          background-color: #00000000;
          color: white;
          border: 1px solid #444444;
          padding: 6px 8px;
          border-radius: 4px;
          cursor: pointer;
          transition: 0.2 ease-in-out
        }
        .add-btn:hover {
          background-color: #ffffff1a;
          color: black;
          border: 1px solid #ffffff1a;
        }
        .sign-out-btn {
          background-color: #ef4444;
        }
        .sign-out-btn:hover {
          background-color: #dc2626;
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
      <div class="sidebar-header">
        <button class="${
          mode === "mine" ? "active" : ""
        }" id="mySnippets">My Snippets</button>
        <button class="${
          mode === "all" ? "active" : ""
        }" id="allSnippets">All Snippets</button>
      </div>
      <div class="toolbar space-btw">
        <div class="snips-actions">
          <button class="add-btn" id="refreshSnippets">
            <i class="fa fa-refresh" aria-hidden="true"></i>
          </button>
          <button class="add-btn" id="addSnippet">
            <i class="fa fa-plus" aria-hidden="true"></i>
          </button>
        </div>
        <button class="auth-btn ${
          authLabel === "Sign Out" ? "sign-out-btn" : ""
        }" id="authBtn">${authLabel}</button>
      </div>

      <div class="toolbar">
        <input type="text" id="search" placeholder="Search snippets..." />
      </div>

      <div id="snippet-list"></div>

      <script>
        const vscode = acquireVsCodeApi();
        let snippets = ${encodedSnippets};
        let hasMore = ${hasMore};
        let page = ${currentPage};

        const container = document.getElementById("snippet-list");
        const searchInput = document.getElementById("search");
        const authBtn = document.getElementById("authBtn");

        authBtn.addEventListener("click", () => {
          vscode.postMessage({ command: "${authCommand}" });
        });

        document.getElementById("allSnippets").onclick = () => vscode.postMessage({command:"toggleMode", mode:"all"});
        document.getElementById("mySnippets").onclick = () => vscode.postMessage({command:"toggleMode", mode:"mine"});

        document.getElementById("addSnippet").addEventListener("click", () => {
          vscode.postMessage({ command: "addSnippet" });
        });
        document.getElementById("refreshSnippets").addEventListener("click", () => {
          vscode.postMessage({ command: "refreshSnippets" });
        });

        function render(snippetData, limit, page = 1) {
          const html = snippetData.map((snippet, idx) => {
            const index = (page - 1) * limit + idx;
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
                <div class="tags">\${tags.map(tag => \`<span class="tag">\${tag}</span>\`).join("")}</div>
                <div class="description">\${snippet.description || ""}</div>
                <div class="code-preview">\${codePreview}</div>
                <div class="buttons">
                  <button class="copy-btn" data-command="copy" data-index="\${index}">Copy</button>
                  <button class="view-btn" data-command="view" data-index="\${index}">View full code</button>
                </div>
              </div>
            \`;
          }).join("");
          container.innerHTML += html;
          attachEventListeners();
        }

        function attachEventListeners() {
          container.querySelectorAll("button").forEach(btn => {
            const command = btn.getAttribute("data-command");
            const index = btn.getAttribute("data-index");
            if (command && index !== null) {
              btn.addEventListener("click", () => {
                const snippet = snippets[index];
                if (command === "copy") {
                  vscode.postMessage({ command: "copy", code: snippet.code });
                } else if (command === "view") {
                  vscode.postMessage({ command: "openSnippet", snippet });
                }
              });
            }
          });
        }

        let isLoading = false;

        window.addEventListener("scroll", () => {
          if (!isLoading && hasMore && (window.innerHeight + window.scrollY) >= document.body.offsetHeight - 100) {
            isLoading = true;
            vscode.postMessage({ command: "loadMore" });
          }
        });

        window.addEventListener("message", event => {
          const message = event.data;
          if (message.command === "appendSnippets") {
            hasMore = message.hasMore;
            page = message.page;
            limit = message.limit;
            snippets = snippets.concat(message.snippets);
            render(message.snippets, limit, page);
            isLoading = false;
          }
        });

        render(snippets, ${snippetsLimit});
      </script>
    </body>
    </html>
    `;
  }
}
