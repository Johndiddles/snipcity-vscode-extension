import * as vscode from "vscode";

export class SnippetDetailsPanel {
  public static show(snippet: any) {
    const panel = vscode.window.createWebviewPanel(
      "snippetDetails",
      snippet.title || "Snippet Details",
      vscode.ViewColumn.One,
      { enableScripts: true }
    );

    panel.webview.html = SnippetDetailsPanel.getHtml(snippet);

    panel.webview.onDidReceiveMessage((message) => {
      if (message.command === "copy") {
        vscode.env.clipboard.writeText(snippet.code);
        vscode.window.showInformationMessage("Code copied to clipboard");
      }
    });
  }

  private static getHtml(snippet: any): string {
    const escapedCode = snippet.code
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    const tags: string[] =
      typeof snippet.tags === "string"
        ? snippet.tags
            .split(",")
            .map((t: string) => t.trim())
            .filter(Boolean)
        : [];

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <style>
            body {
              font-family: sans-serif;
              padding: 2em;
              background: #1e1e1e;
              color: #ccc;
            }
            .title {
              font-size: 1.5em;
              margin-bottom: 0.5em;
            }
            .meta {
              color: #888;
              font-size: 0.9em;
              margin-bottom: 1em;
            }
            .description {
              margin-bottom: 1em;
            }
            .tags {
              display: flex;
              flex-wrap: wrap;
              gap: 6px;
              margin-bottom: 1em;
            }
            .tag {
              background: #007acc;
              color: white;
              padding: 3px 8px;
              border-radius: 4px;
              font-size: 0.8em;
            }
            pre {
              background: #2e2e2e;
              padding: 1em;
              border-radius: 6px;
              overflow-x: auto;
              color: #f8f8f2;
            }
            .actions {
              margin-top: 1em;
            }
            button {
              background: #007acc;
              color: white;
              border: none;
              padding: 0.5em 1em;
              border-radius: 4px;
              cursor: pointer;
              font-size: 0.9em;
            }
            .votes {
              margin-top: 0.5em;
              color: #aaa;
            }
          </style>
        </head>
        <body>
          <div class="title">${snippet.title}</div>
          <div class="meta">by ${
            snippet.author?.username || "Unknown"
          } | Language: ${snippet.language}</div>
          <div class="description">${snippet.description || ""}</div>
          <div class="tags">
            ${tags.map((tag) => `<div class="tag">${tag}</div>`).join("")}
          </div>
          <pre><code>${escapedCode}</code></pre>
          <div class="actions">
            <button onclick="copyCode()">📋 Copy Code</button>
          </div>
          <div class="votes">👍 ${snippet.upvotes || 0} | 👎 ${
      snippet.downvotes || 0
    }</div>
          <script>
            const vscode = acquireVsCodeApi();
            function copyCode() {
              vscode.postMessage({ command: "copy" });
            }
          </script>
        </body>
      </html>
    `;
  }
}
