import * as vscode from "vscode";
import * as Path from "path";

export async function pathToCurrentDirectory(): Promise<string | null> {
	const currentEditor = vscode.window.activeTextEditor;
	if (currentEditor) {
		return Path.dirname(currentEditor.document.uri.fsPath);
	}

	return null;
}

export function getNonce() {
	let text = "";
	const possible =
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	for (let i = 0; i < 32; ++i) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}

export function ClosePanelOnCompletionIfNotInitiallyOpened(): void {
	// TODO: figure out how to check if panel was open prior to invoking the find file command
	// conditionally close the panel if it wasnt open before otherwise move back to whatever view in the panel was last active
	vscode.commands.executeCommand("workbench.action.togglePanel");
}
