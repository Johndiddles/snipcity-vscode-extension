import * as vscode from "vscode";
import { logger } from "./lib/logger";

const LOGIN_URL = "http://localhost:3000/signin/vscode?from=vscode";
// const LOGIN_URL = "https://snippit-mu.vercel.app/extension-login?from=vscode";
const TOKEN_KEY = "snipCityToken";
const EMAIL_KEY = "snipCityEmail";
const USER_ID_KEY = "snipCityUserId";

export async function signIn() {
  vscode.env.openExternal(vscode.Uri.parse(LOGIN_URL));
}

export async function getToken(): Promise<string | null> {
  return (
    (await vscode.workspace.getConfiguration().get<string>(TOKEN_KEY)) || null
  );
}

export async function getUserDetails(): Promise<{
  email: string | null;
  id: string | null;
}> {
  const email =
    (await vscode.workspace.getConfiguration().get<string>(EMAIL_KEY)) || null;
  const userId =
    (await vscode.workspace.getConfiguration().get<string>(USER_ID_KEY)) ||
    null;
  return {
    email,
    id: userId,
  };
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
    .update(TOKEN_KEY, token, vscode.ConfigurationTarget.Global);
}

export async function storeUserDetails({
  token,
  email,
  id,
}: {
  token: string;
  email: string;
  id: string;
}) {
  logger({ token });
  await vscode.workspace
    .getConfiguration()
    .update(TOKEN_KEY, token, vscode.ConfigurationTarget.Global);
  await vscode.workspace
    .getConfiguration()
    .update(EMAIL_KEY, email, vscode.ConfigurationTarget.Global);
  await vscode.workspace
    .getConfiguration()
    .update(USER_ID_KEY, id, vscode.ConfigurationTarget.Global);
}

export async function isAuthenticated(): Promise<boolean> {
  const token = await getToken();
  return !!token;
}

export async function signOut() {
  await vscode.workspace
    .getConfiguration()
    .update(TOKEN_KEY, undefined, vscode.ConfigurationTarget.Global);
  await vscode.workspace
    .getConfiguration()
    .update(USER_ID_KEY, undefined, vscode.ConfigurationTarget.Global);
  await vscode.workspace
    .getConfiguration()
    .update(EMAIL_KEY, undefined, vscode.ConfigurationTarget.Global);
  vscode.window.showInformationMessage("SnipCity: Signed out.");
}
