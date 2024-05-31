import * as vscode from "vscode";
import * as cp from "child_process";

import {
	getNonce,
	pathToCurrentDirectory,
	ClosePanelOnCompletionIfNotInitiallyOpened,
} from "./utils";
import { ExecException } from "child_process";

const fd_files = "fd --type f";

const cplatform = process.platform;

// const fd_files__git_root_Win32 = "@echo off && for /f %a in ('git rev-parse --show-toplevel') do cd %a && @echo on";
const git_root_Win32 =
	"for /f %a in ('git rev-parse --show-toplevel') do cd %a";
// const git_root_Unix = "cd $(git rev-parse --show-toplevel)";
const git_root_Unix =
	"cd $(git rev-parse --show-toplevel) && git rev-parse --show-toplevel";

// TODO: should make a pick workspace directory version of the find file command

// TODO: add FZF find file
// should have one from project root (git root)
// workspaces roots
// current directory
// fd --type file --hidden --no-ignore --exclude=".git" | fzf --no-sort --filter="{search strings}"
// fd --type file --hidden --no-ignore | fzf --no-sort --filter="{search strings}"
// fd --type file --hidden | fzf --no-sort --filter="{search strings}"

let EXT_DefaultDirectory: string;
function PullConfigurationAndSet(): void {
	const emffc_config = vscode.workspace.getConfiguration(
		"emacs-minibuffer-find-file-commands",
	);
	EXT_DefaultDirectory = (emffc_config.get("defaultDirectory") as string) ?? "";
}

export function fd_find__activate(context: vscode.ExtensionContext) {
	// PullConfigurationAndSet();

	// @ts-ignore
	const provider = new FDViewProvider(context.extensionUri);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(
			FDViewProvider.viewType,
			provider,
		),
	);

	// find file (FD) current directory
	context.subscriptions.push(
		vscode.commands.registerCommand("clearfeld.findFileFDEditor", async () => {
			provider.createCatCodingView();

			if (!provider._panel) {
				return;
			}

			const [cmd, defaultDir] = await DetermineCMDAndDefaultDir(fd_files);

			PostCPResultsToView(provider._panel?.webview, cmd, defaultDir, false);
		}),
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("clearfeld.findFileFDPanel", async () => {
			/// TODO: FIXME: HACK: investigate this more this seems too hackish to leave as is
			let throw_away = null;
			throw_away = await vscode.commands.executeCommand(
				"setContext",
				"clearfeld.findFileFDPanel",
				true,
			);
			throw_away = await vscode.commands.executeCommand(
				"clearfeld.findFileFDView.focus",
			);
			throw_away = await vscode.commands.executeCommand(
				"clearfeld.findFileFDView.focus",
			);
			///

			if (!provider._view) {
				return;
			}

			const [cmd, defaultDir] = await DetermineCMDAndDefaultDir(fd_files);

			provider._view.show(true);

			PostCPResultsToView(provider._view?.webview, cmd, defaultDir, false);
		}),
	);

	// find file (FD) from git project root
	context.subscriptions.push(
		vscode.commands.registerCommand(
			"clearfeld.findFileFDGitRootEditor",
			async () => {
				provider.createCatCodingView();

				if (!provider._panel) {
					return;
				}

				let fd_command = "";
				if (cplatform === "win32") {
					fd_command = `${git_root_Win32} && ${fd_files}`;
				} else {
					fd_command = `${git_root_Unix} && ${fd_files}`;
				}

				const [cmd, defaultDir] = await DetermineCMDAndDefaultDir(fd_command);

				PostCPResultsToView(provider._panel?.webview, cmd, defaultDir, true);
			},
		),
	);

	context.subscriptions.push(
		vscode.commands.registerCommand(
			"clearfeld.findFileFDGitRootPanel",
			async () => {
				/// TODO: FIXME: HACK: investigate this more this seems too hackish to leave as is
				let throw_away = null;
				throw_away = await vscode.commands.executeCommand(
					"setContext",
					"clearfeld.findFileFDPanel",
					true,
				);
				throw_away = await vscode.commands.executeCommand(
					"clearfeld.findFileFDView.focus",
				);
				throw_away = await vscode.commands.executeCommand(
					"clearfeld.findFileFDView.focus",
				);
				///

				if (!provider._view) {
					return;
				}

				let fd_command = "";
				console.log("CLP", cplatform);
				if (cplatform === "win32") {
					fd_command = `${git_root_Win32} && ${fd_files}`;
				} else {
					fd_command = `${git_root_Unix} && ${fd_files}`;
				}

				const [cmd, defaultDir] = await DetermineCMDAndDefaultDir(fd_command);

				provider._view.show(true);

				PostCPResultsToView(provider._view?.webview, cmd, defaultDir, true);
			},
		),
	);
}

async function DetermineCMDAndDefaultDir(
	fd_command: string,
): Promise<[string, string]> {
	let defaultDir = await pathToCurrentDirectory();
	let cmd = ""; //  = `cd && ${lsd_command}`;

	if (defaultDir !== null) {
		// cmd = `${lsd_command} ${defaultDir}`;
	} else {
		defaultDir = EXT_DefaultDirectory;
	}

	console.log(defaultDir, `\n`, defaultDir.substring(0, 2), "\n" );
	if (cplatform === "win32") {
		cmd = `${defaultDir.substring(0, 2)} && cd ${defaultDir} && ${fd_command}`;
	} else {
		// cmd = `cd ${defaultDir} && ${fd_command}`;
		// cmd = `cd cd $(git rev-parse --show-toplevel) && ${fd_command}`;
		// cmd = `${fd_command}`;	
		cmd = `cd ${defaultDir} && ${fd_command}`;
	}

	console.log("wut", cmd, "\n\n", defaultDir);
	return [cmd, defaultDir];
}

function PostCPResultsToView(
	view: vscode.Webview,
	cmd: string,
	dir: string,
	root: boolean,
): void {
	let system: string;
	if (cplatform === "win32") {
		system = "win32";
	} else {
		system = "unix";
	}

	console.log("testing ", cmd);
	cp.exec(cmd, (err: ExecException | null, stdout: string, stderr: string) => {
		// console.log("stdout: " + stdout);
		// console.log("stderr: " + stderr);
		if (err) {
			// console.log("error: " + err, stdout);

			const result = stdout.split(/\r?\n/);
			view.postMessage({
				command: "refactor",
				data: JSON.stringify(result),
				directory: JSON.stringify(dir),
				system: system,
				root: root,
			});
		} else {
			const result = stdout.split(/\r?\n/);
			view.postMessage({
				command: "refactor",
				data: JSON.stringify(result),
				directory: JSON.stringify(dir),
				system: system,
				root: root,
			});
		}
	});
}

class FDViewProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = "clearfeld.findFileFDView";

	public _view?: vscode.WebviewView;
	public _panel?: vscode.WebviewPanel;

	private readonly webview_options = {
		enableScripts: true,

		localResourceRoots: [
			this._extensionUri,
			vscode.Uri.joinPath(
				this._extensionUri,
				"minibuffer-find-file/dist",
				"minibuffer-find-file/dist/assets",
			),
		],
	};

	constructor(
		private readonly _extensionUri: vscode.Uri,
		private readonly _myUri: vscode.Uri,
	) {}

	public createCatCodingView() {
		// _token: vscode.CancellationToken // context: vscode.WebviewViewResolveContext, // webviewView: vscode.WebviewView,
		// Create and show panel
		this._panel = vscode.window.createWebviewPanel(
			"clearfeld.findFileFDView",
			// "my-fancy-view",// this.viewType,
			"Minibuffer: File Open",
			vscode.ViewColumn.Active,
			this.webview_options,
		);

		// And set its HTML content
		this._panel.webview.html = this._getHtmlForWebview(this._panel.webview);

		this._panel.webview.onDidReceiveMessage(async (data) => {
			switch (data.type) {
				case "OpenFile":
					{
						console.log("data.value - ", data.value);
						vscode.workspace.openTextDocument(data.value).then((document) => {
							vscode.window.showTextDocument(document);
							this._panel?.dispose();
						});
					}
					break;

				// case "Enter": {
				//   cp.exec(
				//     `${lsd_command} ${data.value}`,
				//     (err: any, stdout: any, stderr: any) => {
				//       // console.log("stderr: " + stderr);
				//       if (err) {
				//         console.log("stderr - error: " + err);

				//         const result = stdout.split(/\r?\n/);
				//         this._panel?.webview.postMessage({
				//           command: "directory_change",
				//           data: JSON.stringify(result),
				//         });
				//       } else {
				//         const result = stdout.split(/\r?\n/);
				//         this._panel?.webview.postMessage({
				//           command: "directory_change",
				//           data: JSON.stringify(result),
				//         });
				//       }
				//     }
				//   );

				//   break;
				// }

				case "Quit":
					{
						this._panel?.dispose();
					}
					break;
			}
		});
	}

	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken,
	) {
		this._view = webviewView;

		webviewView.webview.options = this.webview_options;

		webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

		this._view?.onDidDispose((data) => {
			// switch (data.type)
			console.log("view panel disposed - ", data);
		});

		webviewView.webview.onDidReceiveMessage(async (data) => {
			switch (data.type) {
				case "OpenFile":
					{
						console.log("data.value - ", data.value);
						vscode.workspace.openTextDocument(data.value).then((document) => {
							vscode.window.showTextDocument(document);
							this._view = undefined;
							vscode.commands.executeCommand(
								"setContext",
								"clearfeld.findFileFDPanel",
								false,
							);

							ClosePanelOnCompletionIfNotInitiallyOpened();
						});
					}
					break;

				// case "Enter":
				//   { maybe include a way to filter down a specific sub directory? }
				// break;

				case "Quit":
					{
						this._view = undefined;
						vscode.commands.executeCommand(
							"setContext",
							"clearfeld.findFileFDPanel",
							false,
						);

						ClosePanelOnCompletionIfNotInitiallyOpened();
					}
					break;
			}
		});
	}

	public _getHtmlForWebview(webview: vscode.Webview) {
		// Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
		const scriptUri = webview.asWebviewUri(
			vscode.Uri.joinPath(
				this._extensionUri,
				"webviews_builds/fd/dist",
				"fd-find-file.js",
			),
		);

		const styleUri = webview.asWebviewUri(
			vscode.Uri.joinPath(
				this._extensionUri,
				"webviews_builds/fd/dist/assets",
				"style.css",
			),
		);

		// Do the same for the stylesheet.
		const styleResetUri = webview.asWebviewUri(
			vscode.Uri.joinPath(this._extensionUri, "media", "reset.css"),
		);
		const styleVSCodeUri = webview.asWebviewUri(
			vscode.Uri.joinPath(this._extensionUri, "media", "vscode.css"),
		);
		const styleMainUri = webview.asWebviewUri(
			vscode.Uri.joinPath(this._extensionUri, "media", "main.css"),
		);

		// Use a nonce to only allow a specific script to be run.
		const nonce = getNonce();

		return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">

				<!--
					Use a content security policy to only allow loading styles from our extension directory,
					and only allow scripts that have a specific nonce.
					(See the 'webview-sample' extension sample for img-src content security policy examples)
				-->
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">

				<meta name="viewport" content="width=device-width, initial-scale=1.0">

				<link href="${styleResetUri}" rel="stylesheet">
				<link href="${styleVSCodeUri}" rel="stylesheet">
				<link href="${styleMainUri}" rel="stylesheet">
        <link href="${styleUri}" rel="stylesheet">

				<title>Clearfeld - find file commands</title>
			</head>
			<body>
				<div id="root"><div/>
				<div id="shi"><div/>

				<script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>`;
	}
}
