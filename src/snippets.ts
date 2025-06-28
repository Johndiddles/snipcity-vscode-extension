import axios from "axios";
import * as vscode from "vscode";
import { API_URL } from "./extension";

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
  const response = await axios.post(`${API_URL}/snippets`, data, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
}

export async function updateSnippet(id: string, data: SnippetPayload) {
  const token = vscode.workspace
    .getConfiguration()
    .get<string>("snipCityToken");

  const response = await axios.patch(`${API_URL}/snippets/${id}`, data, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
}

export async function listSnippets(page = 1): Promise<Snippet[]> {
  const token = vscode.workspace
    .getConfiguration()
    .get<string>("snipCityToken");
  const response = await axios.get(
    `${API_URL}/snippets?page=${page}&limit=20`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data.snippets;
}

export async function getSnippetById(snippetId: string): Promise<Snippet[]> {
  const token = vscode.workspace
    .getConfiguration()
    .get<string>("snipCityToken");
  const response = await axios.get(`${API_URL}/snippets/${snippetId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data.snippet;
}
