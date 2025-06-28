import axios from "axios";
import * as vscode from "vscode";
import { logger } from "./lib/logger";

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
  const token = vscode.workspace
    .getConfiguration()
    .get<string>("snipCityToken");
  const response = await axios.post(
    "http://localhost:3000/api/vscode/snippets",
    data,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  logger({ response: response.data });
  return response.data;
}

export async function updateSnippet(id: string, data: SnippetPayload) {
  const token = vscode.workspace
    .getConfiguration()
    .get<string>("snipCityToken");
  const response = await axios.patch(
    `http://localhost:3000/api/vscode/snippets/${id}`,
    data,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  logger({ response: response.data });
  return response.data;
}

export async function listSnippets(page = 1): Promise<Snippet[]> {
  const token = vscode.workspace
    .getConfiguration()
    .get<string>("snipCityToken");
  const response = await axios.get(
    `http://localhost:3000/api/vscode/snippets?page=${page}&limit=20`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data.snippets;
}
