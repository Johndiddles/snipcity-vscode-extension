import * as vscode from "vscode";
import { ensureAuthenticated, getToken, signIn, storeToken } from "./auth";
import { createSnippet, listSnippets } from "./snippets";
import { SnippitSidebarProvider } from "./sidebar";
import { logger } from "./lib/logger";
import { CreateSnippetFormPanel } from "./CreateSnippetFormPannel";

export function activate(context: vscode.ExtensionContext) {
  const viewProvider = new SnippitSidebarProvider(context);
  context.subscriptions.push(
    vscode.window.registerUriHandler({
      handleUri(uri: vscode.Uri) {
        logger({ uriFromBrowser: uri });
        const params = new URLSearchParams(uri.query);
        const token = params.get("token");
        if (token) {
          storeToken(context, token).then(() => {
            vscode.window.showInformationMessage(
              "Signed in to Snippit successfully."
            );
          });
        }
      },
    })
  );

  logger("Activating Snippit extension...");
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      "snippit.sidebarView",
      viewProvider
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("snippit.signIn", async () => {
      await signIn();
      viewProvider.refresh();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("snippit.forceOpenSidebar", async () => {
      await vscode.commands.executeCommand("workbench.view.extension.snippit");
      vscode.window.showInformationMessage("Tried to force open the sidebar");
    })
  );

  // context.subscriptions.push(
  //   vscode.commands.registerCommand("snippit.createSnippet", async () => {
  //     if (!(await ensureAuthenticated(context))) {
  //       return;
  //     }
  //     const editor = vscode.window.activeTextEditor;
  //     const selected = editor?.document.getText(editor.selection) || "";
  //     const title = await vscode.window.showInputBox({
  //       prompt: "Snippet title",
  //     });
  //     if (!title) {
  //       return;
  //     }
  //     const description = await vscode.window.showInputBox({
  //       prompt: "Description (optional)",
  //     });
  //     const language = editor?.document.languageId || "plaintext";
  //     const isPublic = await vscode.window
  //       .showQuickPick(["Public", "Private"], {
  //         placeHolder: "Visibility",
  //       })
  //       .then((x) => x === "Public");

  //     try {
  //       await createSnippet({
  //         title,
  //         description: description || "",
  //         code: selected,
  //         language,
  //         isPublic,
  //       });
  //       vscode.window.showInformationMessage(`Snippet "${title}" created!`);
  //       viewProvider.refresh();
  //     } catch (err: any) {
  //       vscode.window.showErrorMessage(
  //         "Failed to create snippet: " + err.message
  //       );
  //     }
  //   })
  // );

  context.subscriptions.push(
    vscode.commands.registerCommand("snippit.createSnippet", () => {
      CreateSnippetFormPanel.createOrShow(context);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("snippit.viewSnippets", async () => {
      viewProvider.refresh();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("snippit.copySnippet", async (snippet) => {
      const token = await getToken(context);
      if (!token) {
        return;
      }
      await vscode.env.clipboard.writeText(snippet.code);
      vscode.window.showInformationMessage(
        `Copied snippet "${snippet.title}" to clipboard.`
      );
    })
  );
}

export function deactivate() {}
