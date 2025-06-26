import axios from "axios";
import * as vscode from "vscode";

interface SnippetPayload {
  title: string;
  description: string;
  code: string;
  language: string;
  isPublic: boolean;
}

interface Snippet {
  _id: string;
  title: string;
  code: string;
}

export async function createSnippet(data: SnippetPayload) {
  const token = vscode.workspace.getConfiguration().get<string>("snippitToken");
  const response = await axios.post(
    "https://snippit-mu.vercel.app/api/snippets",
    data,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
}

export async function listSnippets(page = 1): Promise<Snippet[]> {
  const token = vscode.workspace.getConfiguration().get<string>("snippitToken");
  const response = await axios.get(
    `https://snippit-mu.vercel.app/api/snippets?page=${page}&limit=20`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data.snippets;
}
