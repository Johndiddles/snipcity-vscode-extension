import * as vscode from "vscode";
import { logger } from "./lib/logger";

const LOGIN_URL = "http://localhost:3000/signin/vscode?from=vscode";
// const LOGIN_URL = "https://snippit-mu.vercel.app/extension-login?from=vscode";
const TOKEN_KEY = "snipCityToken";

export async function signIn() {
  vscode.env.openExternal(vscode.Uri.parse(LOGIN_URL));
  const token = await vscode.window.showInputBox({
    prompt: "Paste the token from Snippit after logging in",
  });
  if (token) {
    await vscode.workspace
      .getConfiguration()
      .update(TOKEN_KEY, token, vscode.ConfigurationTarget.Global);
    vscode.window.showInformationMessage("SnipCity: Signed in successfully.");
  }
}

export async function getToken(): Promise<string | null> {
  return (
    (await vscode.workspace.getConfiguration().get<string>(TOKEN_KEY)) || null
  );
}

export async function ensureAuthenticated(
  context: vscode.ExtensionContext
): Promise<boolean> {
  const token = await getToken();
  if (!token) {
    vscode.window.showErrorMessage(
      'Not signed in to Snippit. Please run "SnipCity: Sign In".'
    );
    return false;
  }
  return true;
}

export async function storeToken(
  context: vscode.ExtensionContext,
  token: string
) {
  logger({ token });
  await vscode.workspace
    .getConfiguration()
    .update("snipCityToken", token, vscode.ConfigurationTarget.Global);
}

export async function isAuthenticated(): Promise<boolean> {
  const token = await getToken();
  return !!token;
}

export async function signOut() {
  await vscode.workspace
    .getConfiguration()
    .update(TOKEN_KEY, undefined, vscode.ConfigurationTarget.Global);
  vscode.window.showInformationMessage("SnipCity: Signed out.");
}
