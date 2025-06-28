import * as vscode from "vscode";
import { getToken, signIn, storeToken, storeUserDetails } from "./auth";
import { SnippitSidebarProvider } from "./sidebar";
import { logger } from "./lib/logger";
import { CreateSnippetFormPanel } from "./CreateSnippetFormPanel";

export function activate(context: vscode.ExtensionContext) {
  const viewProvider = new SnippitSidebarProvider(context);
  context.subscriptions.push(
    vscode.window.registerUriHandler({
      async handleUri(uri: vscode.Uri) {
        const params = new URLSearchParams(uri.query);
        const token = params.get("token");
        const email = params.get("email");
        const id = params.get("id");

        if (token && email && id) {
          storeUserDetails({ token, email, id })
            .then(() => {
              vscode.window.showInformationMessage(
                "Signed in to Snippit successfully."
              );
            })
            .then(() => {
              viewProvider.refresh();
            });
        } else if (token) {
          storeToken(context, token)
            .then(() => {
              vscode.window.showInformationMessage(
                "Signed in to Snippit successfully."
              );
            })
            .then(() => {
              viewProvider.refresh();
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
    vscode.commands.registerCommand("snippit.refreshSidebar", () => {
      viewProvider.refresh();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("snippit.copySnippet", async (snippet) => {
      const token = await getToken();
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
