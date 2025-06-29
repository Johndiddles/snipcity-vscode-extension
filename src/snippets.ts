import axios from "axios";
import * as vscode from "vscode";
import { API_URL } from "./extension";
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

interface PaginatedSnippets {
  currentPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  itemsPerPage: number;
  snippets: Snippet[];
  totalItems: number;
  totalPages: number;
}

export async function listSnippets(
  page: number = 1,
  limit: number = 20
): Promise<PaginatedSnippets> {
  const token = vscode.workspace
    .getConfiguration()
    .get<string>("snipCityToken");
  const response = await axios.get(
    `${API_URL}/snippets?page=${page}&limit=${limit}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  logger({ response: response.data });
  return response.data;
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
