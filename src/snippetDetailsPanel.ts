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
      } else if (message.command === "viewOnWeb") {
        const url = `https://snippit-mu.vercel.app/snippets/${snippet._id}`;
        vscode.env.openExternal(vscode.Uri.parse(url));
      }
    });
  }

  private static getHtml(snippet: any): string {
    const languageMap: Record<string, string> = {
      js: "javascript",
      ts: "typescript",
      py: "python",
      rb: "ruby",
      html: "markup",
      css: "css",
      cpp: "cpp",
      c: "c",
      java: "java",
      go: "go",
      rs: "rust",
      sh: "bash",
      json: "json",
      yml: "yaml",
    };

    const rawLang = snippet.language?.toLowerCase() || "plaintext";
    const prismLang = languageMap[rawLang] || rawLang;

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
          <link href="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/themes/prism-tomorrow.min.css" rel="stylesheet" />
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
              border-radius: 6px;
              overflow-x: auto;
              margin-bottom: 1em;
              font-size: 0.9em;
            }
            .actions {
              display: flex;
              gap: 10px;
              flex-wrap: wrap;
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
            button:hover {
              background-color: #005fa3;
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
          } | Language: ${snippet.language || "plaintext"}</div>
          <div class="description">${snippet.description || ""}</div>
          <div class="tags">
            ${tags.map((tag) => `<div class="tag">${tag}</div>`).join("")}
          </div>
          <pre><code class="language-${prismLang}">${escapedCode}</code></pre>
          <div class="actions">
            <button onclick="copyCode()">📋 Copy Code</button>
            <button onclick="viewOnWeb()">🌐 View on Web</button>
          </div>
          <div class="votes">👍 ${snippet.upvotes || 0} | 👎 ${
      snippet.downvotes || 0
    }</div>

          <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/prism.min.js"></script>
          <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-${prismLang}.min.js"></script>
          <script>
            const vscode = acquireVsCodeApi();
            function copyCode() {
              vscode.postMessage({ command: "copy" });
            }
            function viewOnWeb() {
              vscode.postMessage({ command: "viewOnWeb" });
            }
          </script>
        </body>
      </html>
    `;
  }
}
