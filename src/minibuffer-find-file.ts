import * as vscode from "vscode";
import * as cp from "child_process";

import {
	getNonce,
	pathToCurrentDirectory,
	ClosePanelOnCompletionIfNotInitiallyOpened,
} from "./utils";
import { ExecException } from "child_process";

const cplatform = process.platform;

const lsd_command =
	"lsd --icon=never -al --group-directories-first --color=never --blocks=permission,size,date,name";

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

export function minibuffer_find_file__activate(
	context: vscode.ExtensionContext,
) {
	PullConfigurationAndSet();

	// @ts-ignore
	const provider = new ColorsViewProvider(context.extensionUri);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(
			ColorsViewProvider.viewType,
			provider,
		),
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("emacs.findFileEditor", async () => {
			provider.createCatCodingView();

			if (!provider._panel) {
				return;
			}

			const [cmd, defaultDir] = await DetermineCMDAndDefaultDir();

			PostCPResultsToView(provider._panel?.webview, cmd, defaultDir);
		}),
	);

	// Our new command
	context.subscriptions.push(
		vscode.commands.registerCommand("emacs.findFilePanel", async () => {
			/// TODO: FIXME: HACK: investigate this more this seems too hackish to leave as is
			let throw_away = null;
			throw_away = await vscode.commands.executeCommand(
				"setContext",
				"emacs.findFilePanel",
				true,
			);
			throw_away = await vscode.commands.executeCommand(
				"emacs.findFileView.focus",
			);
			throw_away = await vscode.commands.executeCommand(
				"emacs.findFileView.focus",
			);
			///

			if (!provider._view) {
				return;
			}

			const [cmd, defaultDir] = await DetermineCMDAndDefaultDir();

			provider._view.show(true);

			PostCPResultsToView(provider._view?.webview, cmd, defaultDir);
		}),
	);
}

async function DetermineCMDAndDefaultDir(): Promise<[string, string]> {
	let defaultDir = await pathToCurrentDirectory();

	let cmd = "";
	if (cplatform === "win32") {
		cmd = `cd && ${lsd_command}`;
	} else {
		cmd = `pwd && ${lsd_command}`;
	}

	if (defaultDir !== null) {
		cmd = `${lsd_command} "${defaultDir}"`;
	} else {
		defaultDir = EXT_DefaultDirectory; // "\"" + EXT_DefaultDirectory + "\"";
		// cmd =
		// 	EXT_DefaultDirectory.charAt(0) +
		// 	EXT_DefaultDirectory.charAt(1) +
		// 	" && cd " +
		// 	EXT_DefaultDirectory +
		// 	" && " +
		// 	cmd;

		cmd = `${EXT_DefaultDirectory.charAt(0)}${EXT_DefaultDirectory.charAt(1)} && cd ${EXT_DefaultDirectory} && ${cmd}`;
	}

	// console.warn(cmd, EXT_DefaultDirectory, defaultDir);

	return [cmd, defaultDir];
}

function PostCPResultsToView(
	view: vscode.Webview,
	cmd: string,
	dir: string,
): void {
	console.warn("REFACTOR - ", cmd);

	cp.exec(cmd, (err: ExecException | null, stdout: string, stderr: string) => {
		// console.log("stdout: " + stdout);
		// console.log("stderr: " + stderr);
		if (err) {
			// console.log("error: " + err, stdout);

			// TODO: for win32 if error 5 appears should a modal message be shown to let the user know
			// certain files couldn't be accessed and displayed?

			const result = stdout.split(/\r?\n/);
			let res: string | string[] = result; // JSON.stringify(result);
			if (res[0].charAt(1) === ":") {
				res.shift();
			}
			res = JSON.stringify(res);

			view.postMessage({
				command: "refactor",
				data: res,
				directory: JSON.stringify(dir),
			});
			// }
		} else {
			const result = stdout.split(/\r?\n/);
			let res: string | string[] = result;
			if (res[0].charAt(1) === ":") {
				res.shift();
			}
			res = JSON.stringify(res);

			view.postMessage({
				command: "refactor",
				data: res,
				directory: JSON.stringify(dir),
			});
		}
	});
}

class ColorsViewProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = "emacs.findFileView";

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
			"emacs.findFileView",
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

				case "CreateFile":
					{
						const buf = new Uint8Array();
						const duri = vscode.Uri.file(`${data.directory}\\${data.value}`);
						const throw_away = await vscode.workspace.fs.writeFile(duri, buf);
						// @ts-ignore
						const openPath = vscode.Uri.parse(duri);
						vscode.workspace.openTextDocument(openPath).then((document) => {
							vscode.window.showTextDocument(document);
							this._panel?.dispose();
						});
					}
					break;

				case "Enter": {
					let dir_val = data.value;
					if (dir_val.length <= 3) {
						//
					} else {
						dir_val = `"${dir_val}"`;
					}

					console.log(`${lsd_command} ${dir_val}`);
					cp.exec(
						`${lsd_command} ${dir_val}`,
						(err: ExecException | null, stdout: string, stderr: string) => {
							// console.log("stderr: " + stderr);
							if (err) {
								console.log("stderr - error: ", err);

								const result = stdout.split(/\r?\n/);
								this._panel?.webview.postMessage({
									command: "directory_change",
									data: JSON.stringify(result),
								});
							} else {
								console.log("stdout - ", stdout);
								// get current theme properties color
								// respect theme color choice
								// const color = new vscode.ThemeColor('badge.background');

								const result = stdout.split(/\r?\n/);
								this._panel?.webview.postMessage({
									command: "directory_change",
									data: JSON.stringify(result),
								});
							}
						},
					);

					break;
				}

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
								"emacs.findFilePanel",
								false,
							);

							ClosePanelOnCompletionIfNotInitiallyOpened();
						});
					}
					break;

				case "CreateFile":
					{
						const buf = new Uint8Array();
						const duri = vscode.Uri.file(`${data.directory}\\${data.value}`);
						const throw_away = await vscode.workspace.fs.writeFile(duri, buf);
						// @ts-ignore
						const openPath = vscode.Uri.parse(duri);
						vscode.workspace.openTextDocument(openPath).then((document) => {
							vscode.window.showTextDocument(document);
							this._view = undefined;
							vscode.commands.executeCommand(
								"setContext",
								"emacs.findFilePanel",
								false,
							);

							ClosePanelOnCompletionIfNotInitiallyOpened();
						});
					}
					break;

				case "Enter":
					{
						let dir_val = data.value;
						if (dir_val.length <= 3) {
							//
						} else {
							dir_val = `"${dir_val}"`;
						}

						console.log(`${lsd_command} ${dir_val}`);
						{
							cp.exec(
								`${lsd_command} ${dir_val}`,
								(err: ExecException | null, stdout: string, stderr: string) => {
									// console.log("stderr: " + stderr);
									if (err) {
										// console.log("stderr - error: " + err, stdout);
										const result = stdout.split(/\r?\n/);
										this._view?.webview.postMessage({
											command: "directory_change",
											data: JSON.stringify(result),
										});
									} else {
										// console.log("stdout - " + stdout);
										// get current theme properties color
										// respect theme color choice
										// const color = new vscode.ThemeColor('badge.background');

										const result = stdout.split(/\r?\n/);
										this._view?.webview.postMessage({
											command: "directory_change",
											data: JSON.stringify(result),
										});
									}
								},
							);
						}
					}
					break;

				case "Quit":
					{
						this._view = undefined;
						vscode.commands.executeCommand(
							"setContext",
							"emacs.findFilePanel",
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
				"minibuffer-find-file/dist",
				"minibuffer-find-file.js",
			),
		);

		const styleUri = webview.asWebviewUri(
			vscode.Uri.joinPath(
				this._extensionUri,
				"minibuffer-find-file/dist/assets",
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
